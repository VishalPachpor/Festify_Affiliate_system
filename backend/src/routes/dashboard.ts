import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import { buildCacheKey, getCache, setCache } from "../lib/cache";
import { extractDateRange } from "../lib/time-filters";
import { COMMISSION_CREDIT_TYPES } from "../lib/commission-types";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary
//
// FAST PATH: reads from precomputed DashboardStats aggregate table.
// Falls back to on-demand aggregation if stats row doesn't exist yet.
//
// When ?from=&to= are provided, always uses on-demand (aggregate tables
// store running totals, not time-windowed data).
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/dashboard/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const dateRange = extractDateRange(req);
    const hasDateFilter = !!dateRange.gte || !!dateRange.lte;

    // Resolve affiliateId for affiliate-scoped views. The affiliate dashboard
    // hits the same endpoint as admin — without this scoping, an affiliate
    // sees tenant-wide sales/commissions/payouts (i.e. other affiliates'
    // numbers) on their own KPI cards.
    //
    // Role check comes first: an admin who happens to have an affiliateId
    // claim on their JWT must still see tenant-wide totals. Treat the
    // request as affiliate-scoped only when the caller is non-admin.
    let affiliateId: string | null = null;
    if (req.userRole !== "admin") {
      affiliateId = req.affiliateId ?? null;
      if (!affiliateId && req.userId) {
        const user = await prisma.user.findFirst({
          where: { id: req.userId, tenantId },
          select: { affiliateId: true },
        });
        affiliateId = user?.affiliateId ?? null;
      }
    }
    const isAffiliate = !!affiliateId;

    const cacheKey = buildCacheKey(
      tenantId,
      isAffiliate ? `dashboard:summary:aff:${affiliateId}` : "dashboard:summary",
      req.query as Record<string, unknown>,
    );
    const cached = await getCache(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    let result;

    if (!hasDateFilter && !isAffiliate) {
      // ── FAST PATH: read from aggregate table ────────────────────────────
      // Tenant-wide only. DashboardStats holds running totals across the
      // tenant, so it can't serve an affiliate-scoped view.
      const stats = await prisma.dashboardStats.findUnique({ where: { tenantId } });

      if (stats) {
        const totalSales = stats.totalSales;
        const conversionRate = totalSales > 0
          ? Math.round((stats.attributedSales / totalSales) * 1000) / 10
          : 0;
        const pendingCount = await prisma.application.count({ where: { tenantId, status: "pending" } });

        const now = new Date();
        result = {
          totalRevenue: stats.totalRevenue,
          totalCommissions: stats.totalCommission,
          totalAffiliates: stats.totalAffiliates,
          conversionRate,
          paidOut: stats.totalPaidOut,
          pendingApprovals: pendingCount,
          milestonesUnlocked: 0,
          currency: stats.currency,
          periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
          periodEnd: now.toISOString().split("T")[0],
        };
      }
    }

    // ── SLOW PATH: on-demand aggregation (first load or date-filtered) ────
    if (!result) {
      const dateFilter = hasDateFilter ? { createdAt: dateRange } : {};

      if (isAffiliate) {
        // Sales attributed to this affiliate (via AttributionClaim).
        // Refunded sales are excluded — net revenue/sales-count is what
        // affiliates and admins want to see; the matching reversal entry
        // already nets the commission side via COMMISSION_CREDIT_TYPES.
        const saleWhere = {
          tenantId,
          attributionClaim: { affiliateId: affiliateId! },
          status: { not: "refunded" as const },
          ...dateFilter,
        };

        const [revenueSummary, salesCount, commissionSummary, paidOutSummary, milestonesAll] =
          await Promise.all([
            prisma.sale.aggregate({ where: saleWhere, _sum: { amountMinor: true } }),
            prisma.sale.count({ where: saleWhere }),
            prisma.commissionLedgerEntry.aggregate({
              where: { tenantId, affiliateId: affiliateId!, type: { in: COMMISSION_CREDIT_TYPES }, ...dateFilter },
              _sum: { amountMinor: true },
            }),
            prisma.payout.aggregate({
              where: { tenantId, affiliateId: affiliateId!, status: "paid" },
              _sum: { amountMinor: true },
            }),
            prisma.milestone.findMany({
              where: { tenantId },
              select: { targetMinor: true },
            }),
          ]);

        const totalRevenue = revenueSummary._sum.amountMinor ?? 0;
        // For an affiliate view, every sale they see is already attributed to
        // them — conversion rate as "attributed/total" collapses to 100% and
        // isn't meaningful, so report 0 and let the UI hide it.
        const conversionRate = 0;

        // "Milestones unlocked" tile: count tiers whose targetMinor is at or
        // below the affiliate's attributed revenue. Live computation —
        // independent of the AffiliateMilestoneProgress aggregate so the
        // tile stays accurate even if the event-worker missed a milestone
        // emission.
        const milestonesUnlocked = milestonesAll.filter(
          (m) => totalRevenue >= m.targetMinor,
        ).length;

        const now = new Date();
        result = {
          totalRevenue,
          totalCommissions: commissionSummary._sum.amountMinor ?? 0,
          totalAffiliates: 0,
          conversionRate,
          paidOut: paidOutSummary._sum.amountMinor ?? 0,
          pendingApprovals: 0,
          milestonesUnlocked,
          currency: "USD",
          periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
          periodEnd: now.toISOString().split("T")[0],
          totalSales: salesCount,
        };
      } else {
        // Refunded sales are excluded from headline revenue/sales-count
        // KPIs. The sales table page intentionally still shows them so
        // ops can see them with a status badge; this is the dashboard
        // tile path only.
        const where = { tenantId, status: { not: "refunded" as const }, ...dateFilter };

        const [revenueSummary, salesCount, commissionSummary, attributedCount, affiliateCount, paidOutSummary, pendingApprovals] =
          await Promise.all([
            prisma.sale.aggregate({ where, _sum: { amountMinor: true } }),
            prisma.sale.count({ where }),
            prisma.commissionLedgerEntry.aggregate({ where: { tenantId, type: { in: COMMISSION_CREDIT_TYPES }, ...dateFilter }, _sum: { amountMinor: true } }),
            prisma.attributionClaim.count({ where: { tenantId, sale: { status: { not: "refunded" } }, ...dateFilter } }),
            prisma.campaignAffiliate.count({ where: { tenantId } }),
            prisma.payout.aggregate({ where: { tenantId, status: "paid" }, _sum: { amountMinor: true } }),
            prisma.application.count({ where: { tenantId, status: "pending" } }),
          ]);

        const totalRevenue = revenueSummary._sum.amountMinor ?? 0;
        const totalSales = salesCount;
        const conversionRate = totalSales > 0
          ? Math.round((attributedCount / totalSales) * 1000) / 10
          : 0;

        const now = new Date();
        result = {
          totalRevenue,
          totalCommissions: commissionSummary._sum.amountMinor ?? 0,
          totalAffiliates: affiliateCount,
          conversionRate,
          paidOut: paidOutSummary._sum.amountMinor ?? 0,
          pendingApprovals,
          milestonesUnlocked: 0,
          currency: "USD",
          periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
          periodEnd: now.toISOString().split("T")[0],
        };
      }
    }

    // ── Revenue change % (current 30 days vs previous 30 days) ──────────
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 30);
    const prevStart = new Date(currentStart);
    prevStart.setDate(currentStart.getDate() - 30);

    // Net revenue (excluding refunded sales) for the change-% comparison.
    const revWhereCurrent = isAffiliate
      ? { tenantId, attributionClaim: { affiliateId: affiliateId! }, status: { not: "refunded" as const }, createdAt: { gte: currentStart, lte: now } }
      : { tenantId, status: { not: "refunded" as const }, createdAt: { gte: currentStart, lte: now } };
    const revWherePrev = isAffiliate
      ? { tenantId, attributionClaim: { affiliateId: affiliateId! }, status: { not: "refunded" as const }, createdAt: { gte: prevStart, lt: currentStart } }
      : { tenantId, status: { not: "refunded" as const }, createdAt: { gte: prevStart, lt: currentStart } };
    const commWhereCurrent = isAffiliate
      ? { tenantId, affiliateId: affiliateId!, type: { in: COMMISSION_CREDIT_TYPES }, createdAt: { gte: currentStart, lte: now } }
      : { tenantId, type: { in: COMMISSION_CREDIT_TYPES }, createdAt: { gte: currentStart, lte: now } };
    const commWherePrev = isAffiliate
      ? { tenantId, affiliateId: affiliateId!, type: { in: COMMISSION_CREDIT_TYPES }, createdAt: { gte: prevStart, lt: currentStart } }
      : { tenantId, type: { in: COMMISSION_CREDIT_TYPES }, createdAt: { gte: prevStart, lt: currentStart } };

    const [currentRev, prevRev, currentComm, prevComm] = await Promise.all([
      prisma.sale.aggregate({ where: revWhereCurrent, _sum: { amountMinor: true } }),
      prisma.sale.aggregate({ where: revWherePrev, _sum: { amountMinor: true } }),
      prisma.commissionLedgerEntry.aggregate({ where: commWhereCurrent, _sum: { amountMinor: true } }),
      prisma.commissionLedgerEntry.aggregate({ where: commWherePrev, _sum: { amountMinor: true } }),
    ]);

    const curVal = currentRev._sum.amountMinor ?? 0;
    const prevVal = prevRev._sum.amountMinor ?? 0;
    const revenueChangePct = prevVal > 0
      ? Math.round(((curVal - prevVal) / prevVal) * 1000) / 10
      : curVal > 0
        ? 100
        : 0;

    const curComVal = currentComm._sum.amountMinor ?? 0;
    const prevComVal = prevComm._sum.amountMinor ?? 0;
    const commissionsChangePct = prevComVal > 0
      ? Math.round(((curComVal - prevComVal) / prevComVal) * 1000) / 10
      : curComVal > 0
        ? 100
        : 0;

    (result as Record<string, unknown>).revenueChangePct = revenueChangePct;
    (result as Record<string, unknown>).commissionsChangePct = commissionsChangePct;

    await setCache(cacheKey, result, 60);
    res.status(200).json(result);
  } catch (err) {
    console.error("[dashboard] Summary query failed:", err);
    res.status(500).json({ error: "Failed to load dashboard summary" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/top-affiliates
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/dashboard/top-affiliates", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    // Single groupBy query: revenue + count per affiliate.
    // No N+1 — one DB call regardless of affiliate count.
    const grouped = await prisma.attributionClaim.groupBy({
      by: ["affiliateId"],
      where: { tenantId, sale: { status: { not: "refunded" } } },
      _count: { _all: true },
    });

    if (grouped.length === 0) {
      res.status(200).json({ affiliates: [], currency: "USD" });
      return;
    }

    const affiliateIds = grouped.map((g) => g.affiliateId);

    // Fetch revenue per affiliate via one aggregated query using the relation
    const sales = await prisma.sale.findMany({
      where: {
        tenantId,
        attributionClaim: { affiliateId: { in: affiliateIds } },
        status: { not: "refunded" },
      },
      select: { amountMinor: true, attributionClaim: { select: { affiliateId: true } } },
    });

    const revenueByAffiliate = new Map<string, number>();
    for (const s of sales) {
      const affId = s.attributionClaim?.affiliateId;
      if (!affId) continue;
      revenueByAffiliate.set(affId, (revenueByAffiliate.get(affId) ?? 0) + s.amountMinor);
    }

    // Resolve real names/emails from User and Application tables, plus referral codes
    const [users, applications, campaignAffiliates] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId, affiliateId: { in: affiliateIds } },
        select: { affiliateId: true, fullName: true, email: true },
      }),
      prisma.application.findMany({
        where: { tenantId, affiliateId: { in: affiliateIds }, status: "approved" },
        select: { affiliateId: true, firstName: true, email: true },
      }),
      prisma.campaignAffiliate.findMany({
        where: { tenantId, affiliateId: { in: affiliateIds } },
        select: { affiliateId: true, referralCode: true },
      }),
    ]);

    const userByAffId = new Map(users.map((u) => [u.affiliateId, u]));
    const appByAffId = new Map(applications.map((a) => [a.affiliateId, a]));
    const codeByAffId = new Map(campaignAffiliates.map((c) => [c.affiliateId, c.referralCode]));

    const mapped = grouped.map((g) => {
      const user = userByAffId.get(g.affiliateId);
      const app = appByAffId.get(g.affiliateId);
      return {
        id: g.affiliateId,
        name: user?.fullName ?? app?.firstName ?? g.affiliateId,
        email: user?.email ?? app?.email ?? `${g.affiliateId}@affiliate.local`,
        referralCode: codeByAffId.get(g.affiliateId) ?? null,
        totalSales: g._count._all,
        totalRevenue: revenueByAffiliate.get(g.affiliateId) ?? 0,
        conversionRate: 0,
      };
    });

    mapped.sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.status(200).json({ affiliates: mapped.slice(0, 5), currency: "USD" });
  } catch (err) {
    console.error("[dashboard] Top affiliates failed:", err);
    res.status(500).json({ error: "Failed to load top affiliates" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/activity
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/dashboard/activity", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    // Recent sales as activity items
    const recentSales = await prisma.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { attributionClaim: { select: { affiliateId: true } } },
    });

    const items = recentSales.map((sale) => ({
      id: sale.id,
      type: "sale" as const,
      description: `Ticket purchase — ${sale.currency} ${sale.amountMinor / 100}`,
      amount: sale.amountMinor,
      currency: sale.currency,
      affiliateName: sale.attributionClaim?.affiliateId ?? "Unattributed",
      timestamp: sale.createdAt.toISOString(),
    }));

    res.status(200).json({ items });
  } catch (err) {
    console.error("[dashboard] Activity failed:", err);
    res.status(500).json({ error: "Failed to load activity" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/trend
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/dashboard/trend", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const DAYS = 7;
    const now = new Date();
    const points = [];

    for (let i = DAYS - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [revAgg, commAgg] = await Promise.all([
        prisma.sale.aggregate({
          where: { tenantId, status: { not: "refunded" }, createdAt: { gte: dayStart, lte: dayEnd } },
          _sum: { amountMinor: true },
        }),
        prisma.commissionLedgerEntry.aggregate({
          where: { tenantId, type: { in: COMMISSION_CREDIT_TYPES }, createdAt: { gte: dayStart, lte: dayEnd } },
          _sum: { amountMinor: true },
        }),
      ]);

      points.push({
        date: dayStart.toISOString().split("T")[0],
        revenue: revAgg._sum.amountMinor ?? 0,
        commissions: commAgg._sum.amountMinor ?? 0,
      });
    }

    res.status(200).json({
      points,
      currency: "USD",
      periodStart: points[0]?.date ?? "",
      periodEnd: points[points.length - 1]?.date ?? "",
    });
  } catch (err) {
    console.error("[dashboard] Trend failed:", err);
    res.status(500).json({ error: "Failed to load trend" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/settings
// Returns tenant + campaign settings for the settings page.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/dashboard/settings", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const [tenant, campaign] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.campaign.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    ]);

    res.status(200).json({
      eventName: campaign?.name ?? tenant?.name ?? "",
      orgName: tenant?.name ?? "",
      commissionRate: campaign ? campaign.commissionRateBps / 100 : 10,
    });
  } catch (err) {
    console.error("[dashboard] Settings get failed:", err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/dashboard/settings
// Updates tenant name and campaign commission rate.
// ─────────────────────────────────────────────────────────────────────────────

router.patch("/api/dashboard/settings", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const eventName = typeof req.body?.eventName === "string" ? req.body.eventName.trim() : null;
    const orgName = typeof req.body?.orgName === "string" ? req.body.orgName.trim() : null;
    const commissionRate = typeof req.body?.commissionRate === "number" ? req.body.commissionRate : null;

    // Update tenant name
    if (orgName) {
      await prisma.tenant.update({ where: { id: tenantId }, data: { name: orgName } });
    }

    // Update first campaign
    const campaign = await prisma.campaign.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
    if (campaign) {
      const updates: Record<string, unknown> = {};
      if (eventName) updates.name = eventName;
      if (commissionRate !== null) updates.commissionRateBps = Math.round(commissionRate * 100);
      if (Object.keys(updates).length > 0) {
        await prisma.campaign.update({ where: { id: campaign.id }, data: updates });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[dashboard] Settings update failed:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export { router as dashboardRouter };
