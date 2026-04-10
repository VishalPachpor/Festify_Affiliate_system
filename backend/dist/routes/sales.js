"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const cache_1 = require("../lib/cache");
const time_filters_1 = require("../lib/time-filters");
const router = (0, express_1.Router)();
exports.salesRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sales/summary
//
// Returns aggregated sales KPIs for the tenant.
// Matches frontend SalesSummary Zod schema.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/sales/summary", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const dateFilter = (0, time_filters_1.createdAtFilter)(req);
        const cacheKey = (0, cache_1.buildCacheKey)(tenantId, "sales:summary", req.query);
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            res.status(200).json(cached);
            return;
        }
        const where = { tenantId, ...dateFilter };
        const [totalCount, revenueSummary, commissionSummary, confirmedCount, pendingCount, rejectedCount,] = await Promise.all([
            prisma_1.prisma.sale.count({ where }),
            prisma_1.prisma.sale.aggregate({
                where,
                _sum: { amountMinor: true },
            }),
            prisma_1.prisma.commissionLedgerEntry.aggregate({
                where: { tenantId, type: "earned", ...dateFilter },
                _sum: { amountMinor: true },
            }),
            // Sale statuses: for MVP, attributed = "confirmed", unattributed = "pending"
            prisma_1.prisma.attributionClaim.count({ where: { tenantId } }),
            prisma_1.prisma.sale.count({
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
        await (0, cache_1.setCache)(cacheKey, result, 60);
        res.status(200).json(result);
    }
    catch (err) {
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
router.get("/api/sales", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
        const status = req.query.status;
        const search = req.query.search;
        const dateFilter = (0, time_filters_1.createdAtFilter)(req);
        // Build where clause
        const where = { tenantId, ...dateFilter };
        // Filter by attribution status (maps to frontend "confirmed"/"pending")
        if (status === "confirmed") {
            where.attributionClaim = { isNot: null };
        }
        else if (status === "pending") {
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
            prisma_1.prisma.sale.findMany({
                where,
                include: {
                    attributionClaim: { select: { affiliateId: true } },
                    commissionLedgerEntries: {
                        where: { type: "earned" },
                        select: { amountMinor: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma_1.prisma.sale.count({ where }),
        ]);
        // Map to frontend Sale shape
        const mapped = sales.map((sale) => {
            const commission = sale.commissionLedgerEntries.reduce((sum, entry) => sum + entry.amountMinor, 0);
            const isAttributed = !!sale.attributionClaim;
            return {
                id: sale.id,
                amount: sale.amountMinor,
                commission,
                currency: sale.currency,
                affiliateId: sale.attributionClaim?.affiliateId ?? "",
                affiliateName: sale.attributionClaim?.affiliateId ?? "Unattributed",
                campaignId: sale.campaignId,
                status: isAttributed ? "confirmed" : "pending",
                createdAt: sale.createdAt.toISOString(),
            };
        });
        res.status(200).json({
            sales: mapped,
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        });
    }
    catch (err) {
        console.error("[sales] List query failed:", err);
        res.status(500).json({ error: "Failed to load sales list" });
    }
});
//# sourceMappingURL=sales.js.map