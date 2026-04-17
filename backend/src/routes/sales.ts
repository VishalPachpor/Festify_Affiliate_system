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
    const dateFilter = createdAtFilter(req);

    // Build where clause
    const where: Record<string, unknown> = { tenantId, ...dateFilter };

    // Filter by attribution status (maps to frontend "confirmed"/"pending")
    if (status === "confirmed") {
      where.attributionClaim = { isNot: null };
    } else if (status === "pending") {
      where.attributionClaim = { is: null };
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
              // Payout status is the source of truth for "paid" vs "has payout
              // record but still pending". Without this, a just-approved
              // commission (payout.status = pending) collapsed into "paid".
              payout: { select: { status: true, processedAt: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ]);

    // Map to frontend Sale shape.
    //
    // Commission status has three UI states that must be derived from the
    // payout graph, not just the presence of a payoutId:
    //   • pending   – no payout exists yet (Approve creates one)
    //   • confirmed – payout exists but isn't fully paid yet (Mark Paid flips it)
    //   • paid      – every earned entry is tied to a payout that reached 'paid'
    const mapped = sales.map((sale) => {
      const entries = sale.commissionLedgerEntries;
      const commission = entries.reduce((sum, entry) => sum + entry.amountMinor, 0);
      const isAttributed = !!sale.attributionClaim;

      const hasAnyPayout = entries.some((e) => e.payoutId !== null);
      const allFullyPaid =
        entries.length > 0 && entries.every((e) => e.payout?.status === "paid");

      let status: "pending" | "confirmed" | "paid";
      if (!isAttributed) {
        status = "pending";
      } else if (allFullyPaid) {
        status = "paid";
      } else if (hasAnyPayout) {
        status = "confirmed";
      } else {
        status = "pending";
      }

      // Payout date: the most recent processedAt across attached payouts,
      // if any have been processed. Used by the commissions table.
      const processedDates = entries
        .map((e) => e.payout?.processedAt)
        .filter((d): d is Date => d !== null && d !== undefined);
      const payoutDate =
        processedDates.length > 0
          ? new Date(Math.max(...processedDates.map((d) => d.getTime()))).toISOString()
          : null;

      return {
        id: sale.id,
        amount: sale.amountMinor,
        commission,
        currency: sale.currency,
        affiliateId: sale.attributionClaim?.affiliateId ?? "",
        affiliateName: sale.attributionClaim?.affiliateId ?? "Unattributed",
        campaignId: sale.campaignId,
        status,
        createdAt: sale.createdAt.toISOString(),
        payoutDate,
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

export { router as salesRouter };
