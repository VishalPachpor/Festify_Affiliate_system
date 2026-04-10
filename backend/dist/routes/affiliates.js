"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.affiliatesRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const email_1 = require("../lib/email");
const router = (0, express_1.Router)();
exports.affiliatesRouter = router;
function requireAdmin(req, res) {
    if (req.userRole !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return false;
    }
    return true;
}
function deriveTierKey(currentCommissionMinor, milestones) {
    let currentTier = null;
    for (const milestone of milestones) {
        if (currentCommissionMinor >= milestone.targetMinor) {
            currentTier = milestone.key.toLowerCase();
        }
        else {
            break;
        }
    }
    return currentTier;
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/affiliates
//
// Returns paginated list of affiliates for the tenant.
// Matches frontend AffiliatesListResponse Zod schema.
//
// Affiliates are derived from CampaignAffiliate records, aggregated with
// their sale/commission data.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/affiliates/me
//
// Returns the current affiliate's profile + referral link + earnings.
// Identifies the affiliate via affiliateId from the JWT token.
// Used by the affiliate-side dashboard to render the referral card and KPIs.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/affiliates/me", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        let affiliateId = req.affiliateId;
        if (!affiliateId && req.userId) {
            const user = await prisma_1.prisma.user.findFirst({
                where: { id: req.userId, tenantId },
                select: { affiliateId: true },
            });
            affiliateId = user?.affiliateId ?? null;
        }
        if (!affiliateId) {
            res.status(403).json({ error: "Not an affiliate account" });
            return;
        }
        const membership = await prisma_1.prisma.campaignAffiliate.findFirst({
            where: { tenantId, affiliateId },
            orderBy: { createdAt: "asc" },
        });
        if (!membership) {
            res.status(404).json({ error: `Unknown affiliate: ${affiliateId}` });
            return;
        }
        // Aggregate this affiliate's commission + sales from the ledger.
        const [commissionAgg, attributionCount, sales] = await Promise.all([
            prisma_1.prisma.commissionLedgerEntry.aggregate({
                where: { tenantId, affiliateId, type: "earned" },
                _sum: { amountMinor: true },
            }),
            prisma_1.prisma.attributionClaim.count({ where: { tenantId, affiliateId } }),
            prisma_1.prisma.sale.findMany({
                where: { tenantId, attributionClaim: { affiliateId } },
                select: { amountMinor: true },
            }),
        ]);
        const totalRevenueMinor = sales.reduce((acc, s) => acc + s.amountMinor, 0);
        const totalCommissionMinor = commissionAgg._sum.amountMinor ?? 0;
        // Build a copy-friendly referral URL. The base host is configurable so
        // organizers can point at their actual landing page in production.
        const referralBase = process.env.REFERRAL_LINK_BASE ?? "https://event.festify.io";
        const referralUrl = `${referralBase}?ref=${encodeURIComponent(membership.referralCode)}`;
        res.status(200).json({
            affiliateId: membership.affiliateId,
            name: membership.affiliateId,
            referralCode: membership.referralCode,
            referralUrl,
            campaignId: membership.campaignId,
            totalRevenueMinor,
            totalCommissionMinor,
            totalSales: attributionCount,
            currency: "USD",
            joinedAt: membership.createdAt.toISOString(),
        });
    }
    catch (err) {
        console.error("[affiliates] /me query failed:", err);
        res.status(500).json({ error: "Failed to load affiliate profile" });
    }
});
router.get("/api/affiliates", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
        const search = req.query.search;
        const statusFilter = req.query.status; // "approved" | "pending" | "rejected"
        const tierFilter = String(req.query.tier ?? "").trim().toLowerCase() || undefined;
        const rows = [];
        const milestones = await prisma_1.prisma.milestone.findMany({
            where: { tenantId },
            orderBy: { sortOrder: "asc" },
            select: { key: true, targetMinor: true },
        });
        // ── Approved affiliates (from CampaignAffiliate) ──────────────────────
        if (!statusFilter || statusFilter === "approved") {
            const affWhere = { tenantId };
            // Search is applied post-fetch since name/email come from joined tables.
            // For referral code search, filter at DB level.
            if (search) {
                affWhere.OR = [
                    { affiliateId: { contains: search, mode: "insensitive" } },
                    { referralCode: { contains: search, mode: "insensitive" } },
                ];
            }
            const affiliateRecords = await prisma_1.prisma.campaignAffiliate.findMany({
                where: affWhere,
                orderBy: { createdAt: "desc" },
            });
            const affiliateIds = affiliateRecords.map((a) => a.affiliateId);
            const [commissionGroups, attributionGroups, sales] = await Promise.all([
                prisma_1.prisma.commissionLedgerEntry.groupBy({
                    by: ["affiliateId"],
                    where: { tenantId, affiliateId: { in: affiliateIds }, type: "earned" },
                    _sum: { amountMinor: true },
                }),
                prisma_1.prisma.attributionClaim.groupBy({
                    by: ["affiliateId"],
                    where: { tenantId, affiliateId: { in: affiliateIds } },
                    _count: { _all: true },
                }),
                prisma_1.prisma.sale.findMany({
                    where: { tenantId, attributionClaim: { affiliateId: { in: affiliateIds } } },
                    select: { amountMinor: true, attributionClaim: { select: { affiliateId: true } } },
                }),
            ]);
            const commissionByAff = new Map(commissionGroups.map((g) => [g.affiliateId, g._sum.amountMinor ?? 0]));
            const countByAff = new Map(attributionGroups.map((g) => [g.affiliateId, g._count._all]));
            const revenueByAff = new Map();
            for (const s of sales) {
                const id = s.attributionClaim?.affiliateId;
                if (!id)
                    continue;
                revenueByAff.set(id, (revenueByAff.get(id) ?? 0) + s.amountMinor);
            }
            // Resolve real names/emails from User table (linked by affiliateId)
            // and Application table (linked by affiliateId on approval).
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
            for (const aff of affiliateRecords) {
                const user = userByAffId.get(aff.affiliateId);
                const app = appByAffId.get(aff.affiliateId);
                const name = user?.fullName ?? app?.firstName ?? aff.affiliateId;
                const email = user?.email ?? app?.email ?? `${aff.affiliateId}@affiliate.local`;
                rows.push({
                    id: aff.affiliateId,
                    name,
                    email,
                    status: "approved",
                    totalRevenue: revenueByAff.get(aff.affiliateId) ?? 0,
                    totalCommission: commissionByAff.get(aff.affiliateId) ?? 0,
                    totalSales: countByAff.get(aff.affiliateId) ?? 0,
                    currency: "USD",
                    joinedAt: aff.createdAt.toISOString(),
                    referralCode: aff.referralCode,
                    tier: deriveTierKey(commissionByAff.get(aff.affiliateId) ?? 0, milestones),
                });
            }
        }
        // ── Pending / rejected applications ───────────────────────────────────
        if (!statusFilter || statusFilter === "pending" || statusFilter === "rejected") {
            const appStatuses = statusFilter
                ? [statusFilter]
                : ["pending", "rejected"];
            const appWhere = {
                tenantId,
                status: { in: appStatuses },
            };
            if (search) {
                appWhere.OR = [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ];
            }
            const applications = await prisma_1.prisma.application.findMany({
                where: appWhere,
                orderBy: { createdAt: "desc" },
            });
            for (const app of applications) {
                rows.push({
                    id: app.id,
                    name: app.firstName,
                    email: app.email,
                    status: app.status,
                    totalRevenue: 0,
                    totalCommission: 0,
                    totalSales: 0,
                    currency: "USD",
                    joinedAt: app.createdAt.toISOString(),
                    referralCode: null,
                    tier: null,
                });
            }
        }
        const filteredRows = tierFilter
            ? rows.filter((row) => (row.tier ?? "none") === tierFilter)
            : rows;
        // Sort: pending first, then by date descending
        filteredRows.sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending")
                return -1;
            if (b.status === "pending" && a.status !== "pending")
                return 1;
            return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        });
        // Paginate
        const total = filteredRows.length;
        const paged = filteredRows.slice((page - 1) * pageSize, page * pageSize);
        res.status(200).json({
            affiliates: paged,
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        });
    }
    catch (err) {
        console.error("[affiliates] List query failed:", err);
        res.status(500).json({ error: "Failed to load affiliates list" });
    }
});
router.post("/api/affiliates/invite", async (req, res) => {
    try {
        if (!requireAdmin(req, res))
            return;
        const tenantId = (0, auth_1.getTenantId)(req);
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const campaignId = String(req.body?.campaignId ?? "").trim() || null;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: "Valid email required" });
            return;
        }
        const tenant = await prisma_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
        });
        if (!tenant) {
            res.status(404).json({ error: "Tenant not found" });
            return;
        }
        const campaign = campaignId
            ? await prisma_1.prisma.campaign.findFirst({
                where: { id: campaignId, tenantId },
                select: { id: true, name: true, slug: true },
            })
            : await prisma_1.prisma.campaign.findFirst({
                where: { tenantId },
                orderBy: { createdAt: "asc" },
                select: { id: true, name: true, slug: true },
            });
        if (!campaign) {
            res.status(404).json({ error: "No campaign available for invite" });
            return;
        }
        const appBaseUrl = process.env.APP_URL?.trim() ||
            process.env.FRONTEND_APP_URL?.trim() ||
            "http://localhost:3000";
        const applyPath = campaign.slug ? `/apply/${campaign.slug}` : "/sign-up";
        const applyUrl = `${appBaseUrl.replace(/\/$/, "")}${applyPath}`;
        await (0, email_1.sendAffiliateInviteEmail)({
            to: email,
            campaignName: campaign.name,
            organizerName: tenant.name,
            applyUrl,
        });
        res.status(200).json({ success: true, email, applyUrl });
    }
    catch (err) {
        console.error("[affiliates] invite failed:", err);
        res.status(500).json({ error: "Failed to send affiliate invite" });
    }
});
//# sourceMappingURL=affiliates.js.map