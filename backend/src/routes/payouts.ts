import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import { buildCacheKey, getCache, setCache, invalidateCache } from "../lib/cache";
import { emitEvent } from "../lib/event-bus";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payouts/summary
//
// Returns aggregated payout KPIs from the real Payout table.
// Matches frontend PayoutSummary Zod schema.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/payouts/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const cacheKey = buildCacheKey(tenantId, "payouts:summary");
    const cached = await getCache(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    const [paidAgg, pendingAgg, processingAgg, failedAgg, paidCount, pendingCount, processingCount, failedCount] =
      await Promise.all([
        prisma.payout.aggregate({ where: { tenantId, status: "paid" }, _sum: { amountMinor: true } }),
        prisma.payout.aggregate({ where: { tenantId, status: "pending" }, _sum: { amountMinor: true } }),
        prisma.payout.aggregate({ where: { tenantId, status: "processing" }, _sum: { amountMinor: true } }),
        prisma.payout.aggregate({ where: { tenantId, status: "failed" }, _sum: { amountMinor: true } }),
        prisma.payout.count({ where: { tenantId, status: "paid" } }),
        prisma.payout.count({ where: { tenantId, status: "pending" } }),
        prisma.payout.count({ where: { tenantId, status: "processing" } }),
        prisma.payout.count({ where: { tenantId, status: "failed" } }),
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

    await setCache(cacheKey, result, 60);
    res.status(200).json(result);
  } catch (err) {
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

router.get("/api/payouts", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
    const status = req.query.status as string | undefined;
    const affiliateId = req.query.affiliateId as string | undefined;

    const where: Record<string, unknown> = { tenantId };
    if (status && ["pending", "processing", "paid", "failed"].includes(status)) {
      where.status = status;
    }
    if (affiliateId) {
      where.affiliateId = affiliateId;
    }

    const [records, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payout.count({ where }),
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
  } catch (err) {
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

router.post("/api/payouts/create", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { affiliateId, saleId, markAsPaid } = req.body;

    if (!affiliateId || typeof affiliateId !== "string") {
      res.status(400).json({ error: "affiliateId required" });
      return;
    }

    // ── Validate idempotency key format ─────────────────────────────────
    const rawKey = req.headers["idempotency-key"];
    let idempotencyKey: string | null = null;
    if (rawKey !== undefined) {
      if (typeof rawKey !== "string" || !IDEMPOTENCY_KEY_REGEX.test(rawKey.trim())) {
        res.status(400).json({ error: "Invalid Idempotency-Key (16-128 chars, alphanumeric + - _)" });
        return;
      }
      idempotencyKey = rawKey.trim();
    }

    // ── Atomic: idempotency check + payout creation in ONE transaction ──
    // DB-enforced via PayoutIdempotencyKey unique constraint.
    // No race condition possible — even concurrent requests with the same key
    // will see exactly one succeed at the unique-constraint level.
    let alreadyExisted = false;
    const result = await prisma.$transaction(async (tx) => {
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
      // otherwise all unpaid entries for the affiliate.
      const entryWhere: Record<string, unknown> = {
        tenantId,
        affiliateId,
        type: "earned",
        payoutId: null,
      };
      if (typeof saleId === "string" && saleId) {
        entryWhere.saleId = saleId;
      }
      const unpaidEntries = await tx.commissionLedgerEntry.findMany({
        where: entryWhere,
        select: { id: true, amountMinor: true },
      });

      if (unpaidEntries.length === 0) return null;

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

      // Record idempotency key (DB unique constraint catches concurrent races)
      if (idempotencyKey) {
        await tx.payoutIdempotencyKey.create({
          data: { tenantId, key: idempotencyKey, payoutId: payout.id },
        });
      }

      return payout;
    });

    if (!result) {
      res.status(400).json({ error: "No unpaid commissions to pay out" });
      return;
    }

    // Emit event AFTER transaction commits (with await — never lose events)
    if (!alreadyExisted) {
      await emitEvent("payout.created", { tenantId, amountMinor: result.amountMinor });
      await invalidateCache(tenantId, "payouts:summary", "dashboard:summary");
    }

    res.status(alreadyExisted ? 200 : 201).json({
      id: result.id,
      status: result.status,
      amountMinor: result.amountMinor,
    });
  } catch (err: unknown) {
    // Handle race: two concurrent requests with same idempotency key
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      res.status(409).json({ error: "Concurrent request with same idempotency key" });
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

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "failed"],
  processing: ["paid", "failed"],
  failed: ["pending"], // allow retry
};

router.patch("/api/payouts/:id/status", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const id = String(req.params.id);
    const { status, externalReference } = req.body;

    if (!status || typeof status !== "string") {
      res.status(400).json({ error: "status required" });
      return;
    }

    const payout = await prisma.payout.findFirst({
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

    const updated = await prisma.payout.update({
      where: { id },
      data: {
        status: status as "pending" | "processing" | "paid" | "failed",
        externalReference: externalReference ?? payout.externalReference,
        processedAt: status === "paid" ? new Date() : payout.processedAt,
      },
    });

    await emitEvent("payout.status_changed", {
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
  } catch (err) {
    console.error("[payouts] Status update failed:", err);
    res.status(500).json({ error: "Failed to update payout status" });
  }
});

export { router as payoutsRouter };
