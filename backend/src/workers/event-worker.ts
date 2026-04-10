import { Worker, type Job } from "bullmq";
import { redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { invalidateCache } from "../lib/cache";
import { deadLetterQueue } from "../lib/queue";
import type { DomainEvents, EventName } from "../lib/event-bus";
import { sendAffiliateWelcomeEmail } from "../lib/email";

// ─────────────────────────────────────────────────────────────────────────────
// Durable Event Worker
//
// Processes events from BullMQ "events" queue. Each handler:
//   1. Checks ProcessedEvent for idempotency (skip if already done)
//   2. Runs aggregate update + ProcessedEvent insert in ONE transaction
//   3. On P2002 (duplicate eventId) → silently succeeds
//
// Failed jobs retry with exponential backoff (configured in queue.ts).
// Jobs that exhaust all retries are moved to "events-dead" queue.
// ─────────────────────────────────────────────────────────────────────────────

type AnyEvent = DomainEvents[EventName];

async function idempotent(
  eventType: string,
  payload: { eventId: string; tenantId: string },
  work: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<void>,
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.processedEvent.create({
        data: { eventId: payload.eventId, type: eventType, tenantId: payload.tenantId },
      });
      await work(tx);
    });
  } catch (err: unknown) {
    if (isPrismaUniqueConstraintError(err)) return; // already processed
    throw err;
  }
}

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleOrderCreated(data: DomainEvents["order.created"]): Promise<void> {
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

  await invalidateCache(tenantId, "dashboard:summary", "sales:summary", "attribution:summary");
}

async function handleCommissionEarned(data: DomainEvents["commission.earned"]): Promise<void> {
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

  await invalidateCache(tenantId, "dashboard:summary", "sales:summary");
}

async function handlePayoutCreated(data: DomainEvents["payout.created"]): Promise<void> {
  await idempotent("payout.created", data, async () => {
    // No aggregate update on create — payout is still "pending"
  });
  await invalidateCache(data.tenantId, "payouts:summary", "dashboard:summary");
}

async function handlePayoutStatusChanged(data: DomainEvents["payout.status_changed"]): Promise<void> {
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

  await invalidateCache(tenantId, "payouts:summary", "dashboard:summary");
}

async function handleAffiliateJoined(data: DomainEvents["affiliate.joined"]): Promise<void> {
  const { tenantId } = data;

  await idempotent("affiliate.joined", data, async (tx) => {
    await tx.dashboardStats.upsert({
      where: { tenantId },
      create: { tenantId, totalAffiliates: 1 },
      update: { totalAffiliates: { increment: 1 } },
    });
  });

  await invalidateCache(tenantId, "dashboard:summary");
}

async function handleMilestoneProgressed(data: DomainEvents["milestone.progressed"]): Promise<void> {
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

  await invalidateCache(tenantId, "milestones:tiers", "milestones:progress", "dashboard:summary");
}

async function handleApplicationApproved(data: DomainEvents["application.approved"]): Promise<void> {
  const { tenantId, affiliateId, email, firstName, referralCode } = data;

  await idempotent("application.approved", data, async (tx) => {
    await tx.notification.create({
      data: {
        tenantId,
        recipientId: affiliateId,
        type: "application.approved",
        title: "Welcome aboard 🎉",
        body: `Hi ${firstName}, your affiliate application has been approved. Your referral code is ${referralCode}. Start sharing your link to earn commissions.`,
      },
    });
  });

  await sendAffiliateWelcomeEmail({
    to: email,
    firstName,
    referralCode,
  });

  await invalidateCache(tenantId, "applications:list");
}

// ─── Router ──────────────────────────────────────────────────────────────────

const HANDLERS: Record<string, (data: AnyEvent) => Promise<void>> = {
  "order.created": handleOrderCreated as (data: AnyEvent) => Promise<void>,
  "commission.earned": handleCommissionEarned as (data: AnyEvent) => Promise<void>,
  "payout.created": handlePayoutCreated as (data: AnyEvent) => Promise<void>,
  "payout.status_changed": handlePayoutStatusChanged as (data: AnyEvent) => Promise<void>,
  "affiliate.joined": handleAffiliateJoined as (data: AnyEvent) => Promise<void>,
  "milestone.progressed": handleMilestoneProgressed as (data: AnyEvent) => Promise<void>,
  "application.approved": handleApplicationApproved as (data: AnyEvent) => Promise<void>,
};

// ─── Worker Process ──────────────────────────────────────────────────────────

export function startEventWorker(): Worker {
  const worker = new Worker(
    "events",
    async (job: Job) => {
      const handler = HANDLERS[job.name];

      if (!handler) {
        console.error(`[event-worker] Unknown event type: ${job.name}`);
        return;
      }

      await handler(job.data as AnyEvent);
    },
    {
      connection: redis,
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[event-worker] Completed: ${job.name} (${job.id})`);
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;

    console.error(`[event-worker] Failed: ${job.name} (${job.id}), attempt ${job.attemptsMade}/${job.opts.attempts}:`, err.message);

    // Move to dead letter queue after exhausting all retries
    if (job.attemptsMade >= (job.opts.attempts ?? 5)) {
      await deadLetterQueue.add(job.name, job.data, {
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
