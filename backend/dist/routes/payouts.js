"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payoutsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const cache_1 = require("../lib/cache");
const event_bus_1 = require("../lib/event-bus");
const commission_types_1 = require("../lib/commission-types");
const router = (0, express_1.Router)();
exports.payoutsRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payouts/summary
//
// Returns aggregated payout KPIs from the real Payout table.
// Matches frontend PayoutSummary Zod schema.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/payouts/summary", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const cacheKey = (0, cache_1.buildCacheKey)(tenantId, "payouts:summary");
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            res.status(200).json(cached);
            return;
        }
        const [paidAgg, pendingAgg, processingAgg, failedAgg, paidCount, pendingCount, processingCount, failedCount] = await Promise.all([
            prisma_1.prisma.payout.aggregate({ where: { tenantId, status: "paid" }, _sum: { amountMinor: true } }),
            prisma_1.prisma.payout.aggregate({ where: { tenantId, status: "pending" }, _sum: { amountMinor: true } }),
            prisma_1.prisma.payout.aggregate({ where: { tenantId, status: "processing" }, _sum: { amountMinor: true } }),
            prisma_1.prisma.payout.aggregate({ where: { tenantId, status: "failed" }, _sum: { amountMinor: true } }),
            prisma_1.prisma.payout.count({ where: { tenantId, status: "paid" } }),
            prisma_1.prisma.payout.count({ where: { tenantId, status: "pending" } }),
            prisma_1.prisma.payout.count({ where: { tenantId, status: "processing" } }),
            prisma_1.prisma.payout.count({ where: { tenantId, status: "failed" } }),
        ]);
        const result = {
            totalPaid: paidAgg._sum.amountMinor ?? 0,
            totalPending: pendingAgg._sum.amountMinor ?? 0,
            totalProcessing: processingAgg._sum.amountMinor ?? 0,
            totalFailed: failedAgg._sum.amountMinor ?? 0,
            currency: "USD",
            paidCount,
            pendingCount,
            processingCount,
            failedCount,
        };
        await (0, cache_1.setCache)(cacheKey, result, 60);
        res.status(200).json(result);
    }
    catch (err) {
        console.error("[payouts] Summary query failed:", err);
        res.status(500).json({ error: "Failed to load payout summary" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payouts
//
// Returns paginated payout list from real Payout table.
// Matches frontend PayoutsListResponse Zod schema.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/payouts", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
        const status = req.query.status;
        const affiliateId = req.query.affiliateId;
        const where = { tenantId };
        if (status && ["pending", "processing", "paid", "failed"].includes(status)) {
            where.status = status;
        }
        if (affiliateId) {
            where.affiliateId = affiliateId;
        }
        const [records, total] = await Promise.all([
            prisma_1.prisma.payout.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma_1.prisma.payout.count({ where }),
        ]);
        const payouts = records.map((p) => ({
            id: p.id,
            affiliateId: p.affiliateId,
            affiliateName: p.affiliateId, // MVP: no affiliate_accounts table yet
            amount: p.amountMinor,
            currency: p.currency,
            status: p.status,
            externalReference: p.externalReference,
            createdAt: p.createdAt.toISOString(),
            processedAt: p.processedAt?.toISOString() ?? null,
        }));
        res.status(200).json({
            payouts,
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        });
    }
    catch (err) {
        console.error("[payouts] List query failed:", err);
        res.status(500).json({ error: "Failed to load payouts list" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payouts/create
//
// Creates a payout record from earned commissions for an affiliate.
// Sums all unpaid "earned" commissions and creates a single payout.
// ─────────────────────────────────────────────────────────────────────────────
// Idempotency key validation: must be 16-128 chars, alphanumeric + dash/underscore
const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_-]{16,128}$/;
router.post("/api/payouts/create", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const { affiliateId, saleId, markAsPaid } = req.body;
        if (!affiliateId || typeof affiliateId !== "string") {
            res.status(400).json({ error: "affiliateId required" });
            return;
        }
        // ── Validate idempotency key format ─────────────────────────────────
        const rawKey = req.headers["idempotency-key"];
        let idempotencyKey = null;
        if (rawKey !== undefined) {
            if (typeof rawKey !== "string" || !IDEMPOTENCY_KEY_REGEX.test(rawKey.trim())) {
                res.status(400).json({ error: "Invalid Idempotency-Key (16-128 chars, alphanumeric + - _)" });
                return;
            }
            idempotencyKey = rawKey.trim();
        }
        // Auto-generate a server-side idempotency key when the client doesn't
        // supply one. Minute-bucketed per (tenant, affiliate, saleId): a
        // double-click or retry within the same minute hits the DB unique
        // constraint and replays the original payout. Prevents duplicate
        // payouts from UI double-fires or network retries.
        if (!idempotencyKey) {
            const minuteBucket = Math.floor(Date.now() / 60_000);
            const scope = saleId && typeof saleId === "string" ? `sale-${saleId}` : "bulk";
            idempotencyKey = `auto-${affiliateId}-${scope}-${minuteBucket}`;
        }
        // ── Atomic: idempotency check + payout creation in ONE transaction ──
        // DB-enforced via PayoutIdempotencyKey unique constraint.
        // No race condition possible — even concurrent requests with the same key
        // will see exactly one succeed at the unique-constraint level.
        let alreadyExisted = false;
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Concurrency guard: transaction-scoped advisory lock on the affiliate
            // ledger. If two admins click "Pay" at the same instant, only one
            // transaction enters this section at a time — the other waits and
            // then sees the idempotency record the first one wrote (or a fully
            // settled state) and no-ops.
            //   pg_advisory_xact_lock takes a bigint; hashtextextended returns
            //   64 bits. Fits cleanly and releases automatically on commit/rollback.
            await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, `payout:${tenantId}:${affiliateId}`);
            // Idempotency check inside transaction
            if (idempotencyKey) {
                const existing = await tx.payoutIdempotencyKey.findUnique({
                    where: { tenantId_key: { tenantId, key: idempotencyKey } },
                });
                if (existing) {
                    alreadyExisted = true;
                    const payout = await tx.payout.findUnique({ where: { id: existing.payoutId } });
                    return payout;
                }
            }
            // Find unpaid earned commissions — scoped to a single sale if saleId provided,
            // otherwise all unpaid entries for the affiliate. Includes both original
            // earnings and retroactive tier adjustments so catch-up deltas get paid.
            const entryWhere = {
                tenantId,
                affiliateId,
                type: { in: commission_types_1.COMMISSION_CREDIT_TYPES },
                payoutId: null,
            };
            if (typeof saleId === "string" && saleId) {
                entryWhere.saleId = saleId;
            }
            const unpaidEntries = await tx.commissionLedgerEntry.findMany({
                where: entryWhere,
                select: { id: true, amountMinor: true, saleId: true },
            });
            // Invariant: one sale → one payout. Refuse to bundle unpaid entries that
            // span multiple sales. Caller must retry with an explicit saleId per sale.
            // Prior incident: bundling produced a payout whose "mark paid" fanned
            // across sibling sales and corrupted status transitions.
            if (unpaidEntries.length > 0) {
                const distinctSaleIds = new Set(unpaidEntries.map((e) => e.saleId));
                if (distinctSaleIds.size > 1) {
                    const err = new Error(`Refusing bundled payout: unpaid entries span ${distinctSaleIds.size} sales ` +
                        `(${Array.from(distinctSaleIds).join(", ")}). ` +
                        `Call POST /payouts/create once per saleId.`);
                    err.code = "BUNDLED_PAYOUT_REFUSED";
                    throw err;
                }
            }
            // --- Path B: promote any pending payouts that already cover ledger
            //     entries for this affiliate (and sale, if scoped). Runs in ADDITION
            //     to Path A below so "Pay all approved" truly pays everything — both
            //     fresh unpaid entries AND existing pending payouts from Approve. ---
            let promotedTotal = 0;
            let promotedSaleIds = [];
            let firstPromotedPayoutId = null;
            if (markAsPaid) {
                // Strict scope: tenant + affiliate + pending.
                // When a saleId is supplied, require that *every* linked ledger entry
                // belongs to that sale — otherwise a batch payout covering sibling
                // sales would accidentally flip them all to paid.
                const pendingPayoutsWhere = {
                    tenantId,
                    affiliateId,
                    status: "pending",
                };
                if (typeof saleId === "string" && saleId) {
                    pendingPayoutsWhere.commissionEntries = {
                        some: { saleId, tenantId },
                        every: { saleId, tenantId },
                    };
                }
                const pendingPayouts = await tx.payout.findMany({
                    where: pendingPayoutsWhere,
                    select: { id: true, amountMinor: true, commissionEntries: { select: { saleId: true } } },
                });
                // Invariant (Path B): refuse to promote any pending payout that covers
                // >1 sale. Historical bundled payouts — if any ever land in the DB —
                // must be unbundled manually, not silently flipped to paid here.
                const bundled = pendingPayouts.filter((p) => new Set(p.commissionEntries.map((e) => e.saleId)).size > 1);
                if (bundled.length > 0) {
                    const err = new Error(`Refusing to promote bundled pending payout(s): ${bundled.map((p) => p.id).join(", ")}. ` +
                        `Unbundle via prisma/repair-bundled-payouts.ts before retrying.`);
                    err.code = "BUNDLED_PAYOUT_REFUSED";
                    throw err;
                }
                if (pendingPayouts.length > 0) {
                    const now = new Date();
                    await tx.payout.updateMany({
                        where: { id: { in: pendingPayouts.map((p) => p.id) } },
                        data: { status: "paid", processedAt: now },
                    });
                    const affectedSaleIds = Array.from(new Set(pendingPayouts.flatMap((p) => p.commissionEntries.map((e) => e.saleId))));
                    if (affectedSaleIds.length > 0) {
                        await tx.sale.updateMany({
                            where: { id: { in: affectedSaleIds }, tenantId },
                            data: { status: "paid" },
                        });
                    }
                    promotedTotal = pendingPayouts.reduce((sum, p) => sum + p.amountMinor, 0);
                    promotedSaleIds = affectedSaleIds;
                    firstPromotedPayoutId = pendingPayouts[0].id;
                }
            }
            // If there's nothing unpaid AND nothing pending promoted, we're done —
            // the caller will get a 400 and know there's no money to move.
            if (unpaidEntries.length === 0) {
                if (firstPromotedPayoutId === null)
                    return null;
                if (idempotencyKey) {
                    await tx.payoutIdempotencyKey.create({
                        data: { tenantId, key: idempotencyKey, payoutId: firstPromotedPayoutId },
                    });
                }
                return { id: firstPromotedPayoutId, status: "paid", amountMinor: promotedTotal };
            }
            // Otherwise fall through to Path A: claim the unpaid entries into a new
            // payout. The response will reflect combined totals below.
            const amount = unpaidEntries.reduce((sum, e) => sum + e.amountMinor, 0);
            const payout = await tx.payout.create({
                data: {
                    tenantId,
                    affiliateId,
                    amountMinor: amount,
                    currency: "USD",
                    status: markAsPaid ? "paid" : "pending",
                    processedAt: markAsPaid ? new Date() : undefined,
                },
            });
            // Lock all claimed entries by setting payoutId
            await tx.commissionLedgerEntry.updateMany({
                where: { id: { in: unpaidEntries.map((e) => e.id) } },
                data: { payoutId: payout.id },
            });
            // Flip sale.status to match the new payout's state so the commissions
            // UI reads the source-of-truth column instead of deriving it.
            //   markAsPaid: true  → sale.status = paid
            //   markAsPaid: false → sale.status = approved
            const affectedSaleIds = Array.from(new Set(unpaidEntries.map((e) => e.saleId).filter((id) => typeof id === "string")));
            if (affectedSaleIds.length > 0) {
                await tx.sale.updateMany({
                    where: { id: { in: affectedSaleIds }, tenantId },
                    data: { status: markAsPaid ? "paid" : "approved" },
                });
            }
            // Record idempotency key (DB unique constraint catches concurrent races)
            if (idempotencyKey) {
                await tx.payoutIdempotencyKey.create({
                    data: { tenantId, key: idempotencyKey, payoutId: payout.id },
                });
            }
            // Combine Path B (promoted) + Path A (newly paid) totals on the response
            // so the caller sees the full settlement amount in one number.
            return {
                id: payout.id,
                status: payout.status,
                amountMinor: payout.amountMinor + promotedTotal,
            };
        });
        if (!result) {
            res.status(400).json({ error: "No unpaid commissions to pay out" });
            return;
        }
        // Post-commit side-effects: emit event + bust cache. These must NOT fail
        // the request — the payout is already committed to the DB, the user gets
        // confused seeing a 500 when their money actually moved. Log and swallow.
        if (!alreadyExisted) {
            try {
                await (0, event_bus_1.emitEvent)("payout.created", { tenantId, amountMinor: result.amountMinor });
            }
            catch (e) {
                console.warn("[payouts] emit event failed (non-fatal):", e);
            }
            try {
                await (0, cache_1.invalidateCache)(tenantId, "payouts:summary", "dashboard:summary");
            }
            catch (e) {
                console.warn("[payouts] cache invalidate failed (non-fatal):", e);
            }
        }
        res.status(alreadyExisted ? 200 : 201).json({
            id: result.id,
            status: result.status,
            amountMinor: result.amountMinor,
        });
    }
    catch (err) {
        const code = typeof err === "object" && err !== null && "code" in err
            ? err.code
            : null;
        // Handle race: two concurrent requests with same idempotency key
        if (code === "P2002") {
            res.status(409).json({ error: "Concurrent request with same idempotency key" });
            return;
        }
        // Guardrail: bundled payout refused (invariant: 1 sale → 1 payout).
        if (code === "BUNDLED_PAYOUT_REFUSED") {
            res.status(422).json({
                error: err.message,
                code: "BUNDLED_PAYOUT_REFUSED",
            });
            return;
        }
        console.error("[payouts] Create failed:", err);
        res.status(500).json({ error: "Failed to create payout" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payouts/:id/status
//
// Transition payout status: pending → processing → paid / failed
// ─────────────────────────────────────────────────────────────────────────────
const VALID_TRANSITIONS = {
    pending: ["processing", "paid", "failed"],
    processing: ["paid", "failed"],
    failed: ["pending"], // allow retry
};
router.patch("/api/payouts/:id/status", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const id = String(req.params.id);
        const { status, externalReference } = req.body;
        if (!status || typeof status !== "string") {
            res.status(400).json({ error: "status required" });
            return;
        }
        const payout = await prisma_1.prisma.payout.findFirst({
            where: { id, tenantId },
        });
        if (!payout) {
            res.status(404).json({ error: "Payout not found" });
            return;
        }
        const allowed = VALID_TRANSITIONS[payout.status] ?? [];
        if (!allowed.includes(status)) {
            res.status(400).json({
                error: `Cannot transition from "${payout.status}" to "${status}"`,
            });
            return;
        }
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const up = await tx.payout.update({
                where: { id },
                data: {
                    status: status,
                    externalReference: externalReference ?? payout.externalReference,
                    processedAt: status === "paid" ? new Date() : payout.processedAt,
                },
            });
            // Sale.status mirrors the payout when it reaches a terminal state.
            if (status === "paid") {
                const entries = await tx.commissionLedgerEntry.findMany({
                    where: { payoutId: id },
                    select: { saleId: true },
                });
                const saleIds = Array.from(new Set(entries.map((e) => e.saleId)));
                if (saleIds.length > 0) {
                    await tx.sale.updateMany({
                        where: { id: { in: saleIds }, tenantId },
                        data: { status: "paid" },
                    });
                }
            }
            return up;
        });
        await (0, event_bus_1.emitEvent)("payout.status_changed", {
            tenantId,
            fromStatus: payout.status,
            toStatus: status,
            amountMinor: payout.amountMinor,
        });
        res.status(200).json({
            id: updated.id,
            status: updated.status,
            processedAt: updated.processedAt?.toISOString() ?? null,
        });
    }
    catch (err) {
        console.error("[payouts] Status update failed:", err);
        res.status(500).json({ error: "Failed to update payout status" });
    }
});
//# sourceMappingURL=payouts.js.map