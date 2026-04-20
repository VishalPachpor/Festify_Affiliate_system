import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import { buildCacheKey, getCache, setCache } from "../lib/cache";
import { createdAtFilter } from "../lib/time-filters";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sales/summary
//
// Returns aggregated sales KPIs for the tenant.
// Matches frontend SalesSummary Zod schema.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/sales/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const dateFilter = createdAtFilter(req);
    const cacheKey = buildCacheKey(tenantId, "sales:summary", req.query as Record<string, unknown>);
    const cached = await getCache(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    const where = { tenantId, ...dateFilter };

    const [
      totalCount,
      revenueSummary,
      commissionSummary,
      confirmedCount,
      pendingCount,
      rejectedCount,
    ] = await Promise.all([
      prisma.sale.count({ where }),

      prisma.sale.aggregate({
        where,
        _sum: { amountMinor: true },
      }),

      prisma.commissionLedgerEntry.aggregate({
        where: { tenantId, type: "earned", ...dateFilter },
        _sum: { amountMinor: true },
      }),

      // Sale statuses: for MVP, attributed = "confirmed", unattributed = "pending"
      prisma.attributionClaim.count({ where: { tenantId } }),
      prisma.sale.count({
        where: {
          tenantId,
          attributionClaim: { is: null },
        },
      }),
      // No rejection flow yet — return 0
      Promise.resolve(0),
    ]);

    const result = {
      totalSales: totalCount,
      totalRevenue: revenueSummary._sum.amountMinor ?? 0,
      totalCommissions: commissionSummary._sum.amountMinor ?? 0,
      currency: "USD",
      confirmedCount,
      pendingCount,
      rejectedCount,
    };

    await setCache(cacheKey, result, 60);
    res.status(200).json(result);
  } catch (err) {
    console.error("[sales] Summary query failed:", err);
    res.status(500).json({ error: "Failed to load sales summary" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sales
//
// Returns paginated, filterable sales list for the tenant.
// Matches frontend SalesListResponse Zod schema.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/sales", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const affiliateId = typeof req.query.affiliateId === "string" && req.query.affiliateId.trim().length > 0
      ? req.query.affiliateId.trim()
      : undefined;
    const dateFilter = createdAtFilter(req);

    // Build where clause
    const where: Record<string, unknown> = { tenantId, ...dateFilter };

    // Filter by the first-class sale.status enum (pending / approved / paid).
    // `confirmed` is kept as an alias for backward compat with older clients.
    if (status === "pending" || status === "approved" || status === "paid") {
      where.status = status;
    } else if (status === "confirmed") {
      where.status = "approved";
    }

    // Scope to a single affiliate (used by the drawer's "View Sales History"
    // link and the Commissions page's per-affiliate deep-link).
    if (affiliateId) {
      where.attributionClaim = { is: { affiliateId } };
    }

    // Search by referralCode or externalOrderId
    if (search) {
      where.OR = [
        { externalOrderId: { contains: search, mode: "insensitive" } },
        { referralCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          attributionClaim: { select: { affiliateId: true } },
          commissionLedgerEntries: {
            where: { type: "earned" },
            select: {
              amountMinor: true,
              payoutId: true,
              // Need both: processedAt tells us when a paid payout settled,
              // createdAt is used as the "scheduled" date for approved (pending)
              // payouts that haven't been paid yet.
              payout: {
                select: {
                  status: true,
                  processedAt: true,
                  createdAt: true,
                  commissionEntries: {
                    select: { saleId: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ]);

    // ── Resolve affiliate names in one batched round-trip ─────────────────
    // affiliateId is an opaque id on AttributionClaim. Real display name lives
    // on User.fullName (once they sign up) or falls back to Application.firstName
    // (during the pre-signup admin-approved phase).
    const affiliateIds = Array.from(
      new Set(
        sales
          .map((s) => s.attributionClaim?.affiliateId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const [users, applications] = await Promise.all([
      affiliateIds.length > 0
        ? prisma.user.findMany({
            where: { tenantId, affiliateId: { in: affiliateIds } },
            select: { affiliateId: true, fullName: true },
          })
        : Promise.resolve([] as { affiliateId: string | null; fullName: string | null }[]),
      affiliateIds.length > 0
        ? prisma.application.findMany({
            where: { tenantId, affiliateId: { in: affiliateIds }, status: "approved" },
            select: { affiliateId: true, firstName: true },
          })
        : Promise.resolve([] as { affiliateId: string | null; firstName: string | null }[]),
    ]);

    const nameByAffiliateId = new Map<string, string>();
    for (const u of users) {
      if (u.affiliateId && u.fullName) nameByAffiliateId.set(u.affiliateId, u.fullName);
    }
    for (const a of applications) {
      if (a.affiliateId && a.firstName && !nameByAffiliateId.has(a.affiliateId)) {
        nameByAffiliateId.set(a.affiliateId, a.firstName);
      }
    }

    // Map to frontend Sale shape. sale.status is the source of truth; we don't
    // derive status here. For payoutDate we prefer processedAt (paid) and fall
    // back to the payout.createdAt (scheduled) so approved rows get a date.
    const mapped = sales.map((sale) => {
      const entries = sale.commissionLedgerEntries;
      const commission = entries.reduce((sum, entry) => sum + entry.amountMinor, 0);

      const dates = entries
        .map((e) => e.payout?.processedAt ?? e.payout?.createdAt ?? null)
        .filter((d): d is Date => d !== null && d !== undefined);
      const payoutDate =
        dates.length > 0
          ? new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString()
          : null;

      const payoutStatuses = entries
        .map((e) => e.payout?.status ?? null)
        .filter((status): status is "pending" | "processing" | "paid" | "failed" => status !== null);
      const payoutIds = Array.from(
        new Set(entries.map((e) => e.payoutId).filter((id): id is string => typeof id === "string" && id.length > 0)),
      );
      const payoutSaleCount = entries.reduce((max, entry) => {
        const linkedSaleCount = new Set(entry.payout?.commissionEntries.map((linked) => linked.saleId) ?? []).size;
        return Math.max(max, linkedSaleCount);
      }, 0);
      const payoutStatus =
        payoutStatuses.includes("paid") ? "paid" :
        payoutStatuses.includes("processing") ? "processing" :
        payoutStatuses.includes("pending") ? "pending" :
        payoutStatuses.includes("failed") ? "failed" :
        null;

      const affiliateId = sale.attributionClaim?.affiliateId ?? "";
      const affiliateName =
        (affiliateId && nameByAffiliateId.get(affiliateId)) || affiliateId || "Unattributed";

      return {
        id: sale.id,
        amount: sale.amountMinor,
        commission,
        currency: sale.currency,
        affiliateId,
        affiliateName,
        campaignId: sale.campaignId,
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
        payoutDate,
        payoutId: payoutIds[0] ?? null,
        payoutStatus,
        payoutSaleCount: payoutSaleCount > 0 ? payoutSaleCount : null,
      };
    });

    res.status(200).json({
      sales: mapped,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    console.error("[sales] List query failed:", err);
    res.status(500).json({ error: "Failed to load sales list" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sales/:id/approve
//
// Moves a sale from pending → approved. Creates a pending payout for the
// attributed affiliate so the commission lands on the ledger. Unattributed
// sales are rejected — attribution has to happen first via the Unattributed
// Sales panel, otherwise we'd have no affiliate to route the payout to.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/api/sales/:id/approve", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const saleId = String(req.params.id);

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        attributionClaim: { select: { affiliateId: true } },
        commissionLedgerEntries: {
          where: { type: "earned" },
          select: { id: true, amountMinor: true, payoutId: true },
        },
      },
    });

    if (!sale) {
      res.status(404).json({ error: "Sale not found" });
      return;
    }

    if (sale.status !== "pending") {
      res.status(409).json({
        error: `Sale is already ${sale.status}; cannot approve`,
        code: "INVALID_STATE",
      });
      return;
    }

    if (!sale.attributionClaim) {
      res.status(400).json({
        error: "Sale is unattributed — attribute an affiliate first",
        code: "UNATTRIBUTED",
      });
      return;
    }

    const affiliateId = sale.attributionClaim.affiliateId;
    const entries = sale.commissionLedgerEntries;
    const commission = entries.reduce((sum, entry) => sum + entry.amountMinor, 0);

    // Atomic: flip status, create pending payout, attach all earned entries.
    const updated = await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          tenantId,
          affiliateId,
          amountMinor: commission,
          currency: sale.currency,
          status: "pending",
        },
      });

      const unpaidEntries = entries.filter((e) => e.payoutId === null);
      if (unpaidEntries.length > 0) {
        await tx.commissionLedgerEntry.updateMany({
          where: { id: { in: unpaidEntries.map((e) => e.id) } },
          data: { payoutId: payout.id },
        });
      }

      return tx.sale.update({
        where: { id: saleId },
        data: { status: "approved" },
      });
    });

    res.status(200).json({
      id: updated.id,
      status: updated.status,
    });
  } catch (err) {
    console.error("[sales] Approve failed:", err);
    res.status(500).json({ error: "Failed to approve sale" });
  }
});

export { router as salesRouter };
