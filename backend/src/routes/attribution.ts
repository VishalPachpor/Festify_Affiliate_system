import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import { buildCacheKey, getCache, setCache } from "../lib/cache";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attribution/summary
//
// Attribution KPIs: total sales, attributed vs unattributed, success/failure rates.
// All queries scoped by tenantId.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/attribution/summary", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const cacheKey = buildCacheKey(tenantId, "attribution:summary");
    const cached = await getCache(cacheKey);
    if (cached) { res.status(200).json(cached); return; }

    const [totalSales, attributedCount] = await Promise.all([
      prisma.sale.count({ where: { tenantId } }),
      prisma.attributionClaim.count({ where: { tenantId } }),
    ]);

    const unattributedCount = totalSales - attributedCount;
    const successRate = totalSales > 0
      ? Math.round((attributedCount / totalSales) * 1000) / 10
      : 0;
    const failureRate = totalSales > 0
      ? Math.round((unattributedCount / totalSales) * 1000) / 10
      : 0;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const periodEnd = now.toISOString().split("T")[0];

    const result = {
      totalSales,
      attributedCount,
      unattributedCount,
      successRate,
      failureRate,
      periodStart,
      periodEnd,
    };

    await setCache(cacheKey, result, 60);
    res.status(200).json(result);
  } catch (err) {
    console.error("[attribution] Summary failed:", err);
    res.status(500).json({ error: "Failed to load attribution summary" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attribution/trends
//
// Daily attribution trend for the last 14 days.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/attribution/trends", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const DAYS = 14;
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const points = [];

    for (let i = DAYS - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [daySales, dayAttributed] = await Promise.all([
        prisma.sale.count({
          where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } },
        }),
        prisma.attributionClaim.count({
          where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } },
        }),
      ]);

      const unattributed = daySales - dayAttributed;
      const successRate = daySales > 0
        ? Math.round((dayAttributed / daySales) * 1000) / 10
        : 0;

      points.push({
        date: dayStart.toISOString().split("T")[0],
        attributed: dayAttributed,
        unattributed,
        successRate,
      });
    }

    const periodStart = points[0]?.date ?? "";
    const periodEnd = points[points.length - 1]?.date ?? "";

    res.status(200).json({ points, periodStart, periodEnd });
  } catch (err) {
    console.error("[attribution] Trends failed:", err);
    res.status(500).json({ error: "Failed to load attribution trends" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attribution/breakdown/source
//
// Breakdown of attributions by method (referral_code, etc).
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/attribution/breakdown/source", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const claims = await prisma.attributionClaim.groupBy({
      by: ["method"],
      where: { tenantId },
      _count: true,
    });

    const totalAttributed = claims.reduce((sum, c) => sum + c._count, 0);

    // For each method, get total revenue
    const items: { source: string; count: number; percentage: number; revenue: number; currency: string }[] = await Promise.all(
      claims.map(async (claim) => {
        const revenueAgg = await prisma.sale.aggregate({
          where: {
            tenantId,
            attributionClaim: { method: claim.method },
          },
          _sum: { amountMinor: true },
        });

        return {
          source: claim.method,
          count: claim._count,
          percentage: totalAttributed > 0
            ? Math.round((claim._count / totalAttributed) * 1000) / 10
            : 0,
          revenue: revenueAgg._sum.amountMinor ?? 0,
          currency: "USD",
        };
      }),
    );

    // Add unattributed as a source entry
    const totalSales = await prisma.sale.count({ where: { tenantId } });
    const unattributed = totalSales - totalAttributed;

    if (unattributed > 0) {
      const unattributedRevenue = await prisma.sale.aggregate({
        where: { tenantId, attributionClaim: { is: null } },
        _sum: { amountMinor: true },
      });

      items.push({
        source: "unattributed",
        count: unattributed,
        percentage: totalSales > 0
          ? Math.round((unattributed / totalSales) * 1000) / 10
          : 0,
        revenue: unattributedRevenue._sum.amountMinor ?? 0,
        currency: "USD",
      });
    }

    res.status(200).json({ items });
  } catch (err) {
    console.error("[attribution] Source breakdown failed:", err);
    res.status(500).json({ error: "Failed to load source breakdown" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attribution/breakdown/failures
//
// Breakdown of unattributed sales by failure reason.
// MVP: all unattributed sales have reason "no_referral_code".
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/attribution/breakdown/failures", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const [totalSales, attributedCount] = await Promise.all([
      prisma.sale.count({ where: { tenantId } }),
      prisma.attributionClaim.count({ where: { tenantId } }),
    ]);

    const totalFailures = totalSales - attributedCount;

    // MVP: single failure reason — no referral code provided
    const items = totalFailures > 0
      ? [
          {
            reason: "No referral code in purchase",
            count: totalFailures,
            percentage: 100,
          },
        ]
      : [];

    res.status(200).json({ items, totalFailures });
  } catch (err) {
    console.error("[attribution] Failure reasons failed:", err);
    res.status(500).json({ error: "Failed to load failure reasons" });
  }
});

export { router as attributionRouter };
