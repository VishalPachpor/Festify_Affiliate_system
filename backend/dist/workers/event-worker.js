"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEventWorker = startEventWorker;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const prisma_1 = require("../lib/prisma");
const cache_1 = require("../lib/cache");
const queue_1 = require("../lib/queue");
const email_1 = require("../lib/email");
async function idempotent(eventType, payload, work) {
    try {
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.processedEvent.create({
                data: { eventId: payload.eventId, type: eventType, tenantId: payload.tenantId },
            });
            await work(tx);
        });
    }
    catch (err) {
        if (isPrismaUniqueConstraintError(err))
            return; // already processed
        throw err;
    }
}
function isPrismaUniqueConstraintError(err) {
    return (typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "P2002");
}
// ─── Handlers ────────────────────────────────────────────────────────────────
async function handleOrderCreated(data) {
    const { tenantId, amountMinor, attributed } = data;
    await idempotent("order.created", data, async (tx) => {
        await tx.dashboardStats.upsert({
            where: { tenantId },
            create: { tenantId, totalRevenue: amountMinor, totalSales: 1, attributedSales: attributed ? 1 : 0 },
            update: {
                totalRevenue: { increment: amountMinor },
                totalSales: { increment: 1 },
                ...(attributed ? { attributedSales: { increment: 1 } } : {}),
            },
        });
        await tx.salesStats.upsert({
            where: { tenantId },
            create: { tenantId, totalSales: 1, totalRevenue: amountMinor, confirmedCount: attributed ? 1 : 0, pendingCount: attributed ? 0 : 1 },
            update: {
                totalSales: { increment: 1 },
                totalRevenue: { increment: amountMinor },
                ...(attributed ? { confirmedCount: { increment: 1 } } : { pendingCount: { increment: 1 } }),
            },
        });
        await tx.attributionStats.upsert({
            where: { tenantId },
            create: { tenantId, attributedSales: attributed ? 1 : 0, unattributedSales: attributed ? 0 : 1 },
            update: attributed ? { attributedSales: { increment: 1 } } : { unattributedSales: { increment: 1 } },
        });
    });
    await (0, cache_1.invalidateCache)(tenantId, "dashboard:summary", "sales:summary", "attribution:summary");
}
async function handleCommissionEarned(data) {
    const { tenantId, amountMinor } = data;
    await idempotent("commission.earned", data, async (tx) => {
        await tx.dashboardStats.upsert({
            where: { tenantId },
            create: { tenantId, totalCommission: amountMinor },
            update: { totalCommission: { increment: amountMinor } },
        });
        await tx.salesStats.upsert({
            where: { tenantId },
            create: { tenantId, totalCommission: amountMinor },
            update: { totalCommission: { increment: amountMinor } },
        });
    });
    await (0, cache_1.invalidateCache)(tenantId, "dashboard:summary", "sales:summary");
}
async function handlePayoutCreated(data) {
    await idempotent("payout.created", data, async () => {
        // No aggregate update on create — payout is still "pending"
    });
    await (0, cache_1.invalidateCache)(data.tenantId, "payouts:summary", "dashboard:summary");
}
async function handlePayoutStatusChanged(data) {
    const { tenantId, toStatus, amountMinor } = data;
    await idempotent("payout.status_changed", data, async (tx) => {
        if (toStatus === "paid") {
            await tx.dashboardStats.upsert({
                where: { tenantId },
                create: { tenantId, totalPaidOut: amountMinor },
                update: { totalPaidOut: { increment: amountMinor } },
            });
        }
    });
    await (0, cache_1.invalidateCache)(tenantId, "payouts:summary", "dashboard:summary");
}
async function handleAffiliateJoined(data) {
    const { tenantId } = data;
    await idempotent("affiliate.joined", data, async (tx) => {
        await tx.dashboardStats.upsert({
            where: { tenantId },
            create: { tenantId, totalAffiliates: 1 },
            update: { totalAffiliates: { increment: 1 } },
        });
    });
    await (0, cache_1.invalidateCache)(tenantId, "dashboard:summary");
}
async function handleMilestoneProgressed(data) {
    const { tenantId, affiliateId, milestoneId, currentMinor, unlocked } = data;
    await idempotent("milestone.progressed", data, async (tx) => {
        // Upsert progress row. Set unlockedAt only on the transition (when it was null).
        const existing = await tx.affiliateMilestoneProgress.findUnique({
            where: { tenantId_affiliateId_milestoneId: { tenantId, affiliateId, milestoneId } },
        });
        await tx.affiliateMilestoneProgress.upsert({
            where: { tenantId_affiliateId_milestoneId: { tenantId, affiliateId, milestoneId } },
            create: {
                tenantId,
                affiliateId,
                milestoneId,
                currentMinor,
                unlockedAt: unlocked ? new Date() : null,
            },
            update: {
                currentMinor,
                unlockedAt: unlocked && !existing?.unlockedAt ? new Date() : existing?.unlockedAt,
            },
        });
        // Drop a notification when the tier transitions from locked → unlocked.
        if (unlocked && !existing?.unlockedAt) {
            const milestone = await tx.milestone.findUnique({ where: { id: milestoneId } });
            if (milestone) {
                await tx.notification.create({
                    data: {
                        tenantId,
                        recipientId: affiliateId,
                        type: "milestone.unlocked",
                        title: `${milestone.name} milestone unlocked`,
                        body: `You've earned enough commission to unlock the ${milestone.name} tier: ${milestone.description}`,
                    },
                });
                console.log(`[notify] ${affiliateId} unlocked milestone ${milestone.key}`);
            }
        }
    });
    await (0, cache_1.invalidateCache)(tenantId, "milestones:tiers", "milestones:progress", "dashboard:summary");
}
async function handleApplicationApproved(data) {
    const { tenantId, affiliateId, email, firstName, referralCode } = data;
    const shouldSendEmail = await prisma_1.prisma.$transaction(async (tx) => {
        let shouldCreateNotification = true;
        try {
            await tx.processedEvent.create({
                data: { eventId: data.eventId, type: "application.approved", tenantId },
            });
        }
        catch (err) {
            if (isPrismaUniqueConstraintError(err)) {
                shouldCreateNotification = false;
            }
            else {
                throw err;
            }
        }
        const application = await tx.application.findUnique({
            where: { id: data.applicationId },
            select: { welcomeEmailSentAt: true },
        });
        if (!application)
            return false;
        if (shouldCreateNotification) {
            await tx.notification.create({
                data: {
                    tenantId,
                    recipientId: affiliateId,
                    type: "application.approved",
                    title: "Welcome aboard",
                    body: `Hi ${firstName}, your affiliate MOU is signed and your account is active. Your referral code is ${referralCode}. Start sharing your link to earn commissions.`,
                },
            });
        }
        return !application.welcomeEmailSentAt;
    });
    if (shouldSendEmail) {
        await (0, email_1.sendAffiliateWelcomeEmail)({
            to: email,
            firstName,
            referralCode,
        });
        await prisma_1.prisma.application.updateMany({
            where: {
                id: data.applicationId,
                welcomeEmailSentAt: null,
            },
            data: { welcomeEmailSentAt: new Date() },
        });
    }
    await (0, cache_1.invalidateCache)(tenantId, "applications:list");
}
// ─── Router ──────────────────────────────────────────────────────────────────
const HANDLERS = {
    "order.created": handleOrderCreated,
    "commission.earned": handleCommissionEarned,
    "payout.created": handlePayoutCreated,
    "payout.status_changed": handlePayoutStatusChanged,
    "affiliate.joined": handleAffiliateJoined,
    "milestone.progressed": handleMilestoneProgressed,
    "application.approved": handleApplicationApproved,
};
// ─── Worker Process ──────────────────────────────────────────────────────────
function startEventWorker() {
    const worker = new bullmq_1.Worker("events", async (job) => {
        const handler = HANDLERS[job.name];
        if (!handler) {
            console.error(`[event-worker] Unknown event type: ${job.name}`);
            return;
        }
        await handler(job.data);
    }, {
        connection: redis_1.redis,
        concurrency: 5,
    });
    worker.on("completed", (job) => {
        console.log(`[event-worker] Completed: ${job.name} (${job.id})`);
    });
    worker.on("failed", async (job, err) => {
        if (!job)
            return;
        console.error(`[event-worker] Failed: ${job.name} (${job.id}), attempt ${job.attemptsMade}/${job.opts.attempts}:`, err.message);
        // Move to dead letter queue after exhausting all retries
        if (job.attemptsMade >= (job.opts.attempts ?? 5)) {
            await queue_1.deadLetterQueue.add(job.name, job.data, {
                jobId: `dead-${job.id}`,
            });
            console.error(`[event-worker] Moved to dead letter: ${job.name} (${job.id})`);
        }
    });
    console.log("[event-worker] Started, processing 'events' queue");
    return worker;
}
// Run directly if executed as standalone process
if (require.main === module) {
    startEventWorker();
}
//# sourceMappingURL=event-worker.js.map