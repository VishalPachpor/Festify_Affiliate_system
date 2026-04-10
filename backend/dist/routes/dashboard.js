"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const cache_1 = require("../lib/cache");
const time_filters_1 = require("../lib/time-filters");
const router = (0, express_1.Router)();
exports.dashboardRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary
//
// FAST PATH: reads from precomputed DashboardStats aggregate table.
// Falls back to on-demand aggregation if stats row doesn't exist yet.
//
// When ?from=&to= are provided, always uses on-demand (aggregate tables
// store running totals, not time-windowed data).
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/dashboard/summary", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const dateRange = (0, time_filters_1.extractDateRange)(req);
        const hasDateFilter = !!dateRange.gte || !!dateRange.lte;
        const cacheKey = (0, cache_1.buildCacheKey)(tenantId, "dashboard:summary", req.query);
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            res.status(200).json(cached);
            return;
        }
        let result;
        if (!hasDateFilter) {
            // ── FAST PATH: read from aggregate table ────────────────────────────
            const stats = await prisma_1.prisma.dashboardStats.findUnique({ where: { tenantId } });
            if (stats) {
                const totalSales = stats.totalSales;
                const conversionRate = totalSales > 0
                    ? Math.round((stats.attributedSales / totalSales) * 1000) / 10
                    : 0;
                const now = new Date();
                result = {
                    totalRevenue: stats.totalRevenue,
                    totalCommissions: stats.totalCommission,
                    totalAffiliates: stats.totalAffiliates,
                    conversionRate,
                    paidOut: stats.totalPaidOut,
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
            const where = { tenantId, ...dateFilter };
            const [revenueSummary, salesCount, commissionSummary, attributedCount, affiliateCount, paidOutSummary] = await Promise.all([
                prisma_1.prisma.sale.aggregate({ where, _sum: { amountMinor: true } }),
                prisma_1.prisma.sale.count({ where }),
                prisma_1.prisma.commissionLedgerEntry.aggregate({ where: { tenantId, type: "earned", ...dateFilter }, _sum: { amountMinor: true } }),
                prisma_1.prisma.attributionClaim.count({ where: { tenantId, ...dateFilter } }),
                prisma_1.prisma.campaignAffiliate.count({ where: { tenantId } }),
                prisma_1.prisma.payout.aggregate({ where: { tenantId, status: "paid" }, _sum: { amountMinor: true } }),
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
                milestonesUnlocked: 0,
                currency: "USD",
                periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
                periodEnd: now.toISOString().split("T")[0],
            };
        }
        await (0, cache_1.setCache)(cacheKey, result, 60);
        res.status(200).json(result);
    }
    catch (err) {
        console.error("[dashboard] Summary query failed:", err);
        res.status(500).json({ error: "Failed to load dashboard summary" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/top-affiliates
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/dashboard/top-affiliates", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        // Single groupBy query: revenue + count per affiliate.
        // No N+1 — one DB call regardless of affiliate count.
        const grouped = await prisma_1.prisma.attributionClaim.groupBy({
            by: ["affiliateId"],
            where: { tenantId },
            _count: { _all: true },
        });
        if (grouped.length === 0) {
            res.status(200).json({ affiliates: [], currency: "USD" });
            return;
        }
        const affiliateIds = grouped.map((g) => g.affiliateId);
        // Fetch revenue per affiliate via one aggregated query using the relation
        const sales = await prisma_1.prisma.sale.findMany({
            where: { tenantId, attributionClaim: { affiliateId: { in: affiliateIds } } },
            select: { amountMinor: true, attributionClaim: { select: { affiliateId: true } } },
        });
        const revenueByAffiliate = new Map();
        for (const s of sales) {
            const affId = s.attributionClaim?.affiliateId;
            if (!affId)
                continue;
            revenueByAffiliate.set(affId, (revenueByAffiliate.get(affId) ?? 0) + s.amountMinor);
        }
        // Resolve real names/emails from User and Application tables
        const [users, applications] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where: { tenantId, affiliateId: { in: affiliateIds } },
                select: { affiliateId: true, fullName: true, email: true },
            }),
            prisma_1.prisma.application.findMany({
                where: { tenantId, affiliateId: { in: affiliateIds }, status: "approved" },
                select: { affiliateId: true, firstName: true, email: true },
            }),
        ]);
        const userByAffId = new Map(users.map((u) => [u.affiliateId, u]));
        const appByAffId = new Map(applications.map((a) => [a.affiliateId, a]));
        const mapped = grouped.map((g) => {
            const user = userByAffId.get(g.affiliateId);
            const app = appByAffId.get(g.affiliateId);
            return {
                id: g.affiliateId,
                name: user?.fullName ?? app?.firstName ?? g.affiliateId,
                email: user?.email ?? app?.email ?? `${g.affiliateId}@affiliate.local`,
                totalSales: g._count._all,
                totalRevenue: revenueByAffiliate.get(g.affiliateId) ?? 0,
                conversionRate: 0,
            };
        });
        mapped.sort((a, b) => b.totalRevenue - a.totalRevenue);
        res.status(200).json({ affiliates: mapped.slice(0, 5), currency: "USD" });
    }
    catch (err) {
        console.error("[dashboard] Top affiliates failed:", err);
        res.status(500).json({ error: "Failed to load top affiliates" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/activity
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/dashboard/activity", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        // Recent sales as activity items
        const recentSales = await prisma_1.prisma.sale.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { attributionClaim: { select: { affiliateId: true } } },
        });
        const items = recentSales.map((sale) => ({
            id: sale.id,
            type: "sale",
            description: `Ticket purchase — ${sale.currency} ${sale.amountMinor / 100}`,
            amount: sale.amountMinor,
            currency: sale.currency,
            affiliateName: sale.attributionClaim?.affiliateId ?? "Unattributed",
            timestamp: sale.createdAt.toISOString(),
        }));
        res.status(200).json({ items });
    }
    catch (err) {
        console.error("[dashboard] Activity failed:", err);
        res.status(500).json({ error: "Failed to load activity" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/trend
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/dashboard/trend", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
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
                prisma_1.prisma.sale.aggregate({
                    where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } },
                    _sum: { amountMinor: true },
                }),
                prisma_1.prisma.commissionLedgerEntry.aggregate({
                    where: { tenantId, type: "earned", createdAt: { gte: dayStart, lte: dayEnd } },
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
    }
    catch (err) {
        console.error("[dashboard] Trend failed:", err);
        res.status(500).json({ error: "Failed to load trend" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sales/:id (sale detail)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/sales/:id", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const saleId = String(req.params.id);
        const sale = await prisma_1.prisma.sale.findFirst({
            where: { id: saleId, tenantId },
            include: {
                attributionClaim: true,
                commissionLedgerEntries: { where: { type: "earned" } },
            },
        });
        if (!sale) {
            res.status(404).json({ error: "Sale not found" });
            return;
        }
        const commission = sale.commissionLedgerEntries.reduce((s, e) => s + e.amountMinor, 0);
        const isAttributed = !!sale.attributionClaim;
        res.status(200).json({
            id: sale.id,
            amount: sale.amountMinor,
            commission,
            currency: sale.currency,
            affiliateId: sale.attributionClaim?.affiliateId ?? "",
            affiliateName: sale.attributionClaim?.affiliateId ?? "Unattributed",
            campaignId: sale.campaignId,
            status: isAttributed ? "confirmed" : "pending",
            createdAt: sale.createdAt.toISOString(),
            attribution: sale.attributionClaim ? {
                source: sale.attributionClaim.method,
                attributed: true,
                referralCode: sale.referralCode,
                referralUrl: null,
                landingPage: null,
                attributedAt: sale.attributionClaim.createdAt.toISOString(),
            } : {
                source: "unattributed",
                attributed: false,
                referralCode: null,
                referralUrl: null,
                landingPage: null,
                attributedAt: null,
            },
            attributionDiagnostics: {
                reason: isAttributed ? `Matched via ${sale.attributionClaim.method}` : "No referral data found",
                steps: [],
                resolvedAt: isAttributed ? sale.attributionClaim.createdAt.toISOString() : null,
            },
            commissionBreakdown: commission > 0 ? {
                rate: 10,
                baseAmount: sale.amountMinor,
                commissionAmount: commission,
                currency: sale.currency,
                tier: null,
            } : null,
            payoutId: null,
            payoutStatus: null,
        });
    }
    catch (err) {
        console.error("[sales] Detail failed:", err);
        res.status(500).json({ error: "Failed to load sale detail" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/settings
// Returns tenant + campaign settings for the settings page.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/dashboard/settings", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const [tenant, campaign] = await Promise.all([
            prisma_1.prisma.tenant.findUnique({ where: { id: tenantId } }),
            prisma_1.prisma.campaign.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
        ]);
        res.status(200).json({
            eventName: campaign?.name ?? tenant?.name ?? "",
            orgName: tenant?.name ?? "",
            commissionRate: campaign ? campaign.commissionRateBps / 100 : 10,
        });
    }
    catch (err) {
        console.error("[dashboard] Settings get failed:", err);
        res.status(500).json({ error: "Failed to load settings" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/dashboard/settings
// Updates tenant name and campaign commission rate.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/api/dashboard/settings", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const eventName = typeof req.body?.eventName === "string" ? req.body.eventName.trim() : null;
        const orgName = typeof req.body?.orgName === "string" ? req.body.orgName.trim() : null;
        const commissionRate = typeof req.body?.commissionRate === "number" ? req.body.commissionRate : null;
        // Update tenant name
        if (orgName) {
            await prisma_1.prisma.tenant.update({ where: { id: tenantId }, data: { name: orgName } });
        }
        // Update first campaign
        const campaign = await prisma_1.prisma.campaign.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
        if (campaign) {
            const updates = {};
            if (eventName)
                updates.name = eventName;
            if (commissionRate !== null)
                updates.commissionRateBps = Math.round(commissionRate * 100);
            if (Object.keys(updates).length > 0) {
                await prisma_1.prisma.campaign.update({ where: { id: campaign.id }, data: updates });
            }
        }
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error("[dashboard] Settings update failed:", err);
        res.status(500).json({ error: "Failed to save settings" });
    }
});
//# sourceMappingURL=dashboard.js.map