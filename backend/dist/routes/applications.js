"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationsRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const event_bus_1 = require("../lib/event-bus");
const cache_1 = require("../lib/cache");
const router = (0, express_1.Router)();
exports.applicationsRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications
//
// Organizer-side list of affiliate applications for the tenant. Filter by
// status with ?status=pending|approved|rejected.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/applications", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const status = String(req.query.status ?? "").trim().toLowerCase();
        const where = { tenantId };
        if (status === "pending" || status === "approved" || status === "rejected") {
            where.status = status;
        }
        const applications = await prisma_1.prisma.application.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { campaign: { select: { id: true, name: true, slug: true } } },
        });
        res.status(200).json({
            applications: applications.map((a) => ({
                id: a.id,
                firstName: a.firstName,
                email: a.email,
                socialProfiles: a.socialProfiles,
                audienceSize: a.audienceSize,
                experience: a.experience,
                fitReason: a.fitReason,
                status: a.status,
                affiliateId: a.affiliateId,
                campaignId: a.campaignId,
                campaignName: a.campaign.name,
                campaignSlug: a.campaign.slug,
                createdAt: a.createdAt.toISOString(),
                reviewedAt: a.reviewedAt?.toISOString() ?? null,
            })),
        });
    }
    catch (err) {
        console.error("[applications] list failed:", err);
        res.status(500).json({ error: "Failed to load applications" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/applications/:id/status
//
// Approve or reject a pending application. On approve:
//   1. Generate a unique referral code (firstName + 4 random hex chars)
//   2. Create a CampaignAffiliate row
//   3. Stamp the application with the new affiliateId + reviewedAt
//   4. Emit affiliate.joined + application.approved
// All within a single transaction.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/api/applications/:id/status", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const id = String(req.params.id);
        const nextStatus = String(req.body?.status ?? "").trim().toLowerCase();
        if (nextStatus !== "approved" && nextStatus !== "rejected") {
            res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
            return;
        }
        const application = await prisma_1.prisma.application.findFirst({
            where: { id, tenantId },
        });
        if (!application) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        if (application.status !== "pending") {
            res.status(400).json({
                error: `Application is already ${application.status}, cannot transition to ${nextStatus}`,
            });
            return;
        }
        if (nextStatus === "rejected") {
            const updated = await prisma_1.prisma.application.update({
                where: { id },
                data: { status: "rejected", reviewedAt: new Date() },
            });
            await (0, cache_1.invalidateCache)(tenantId, "applications:list");
            res.status(200).json({ id: updated.id, status: updated.status });
            return;
        }
        // ── Approval path ──────────────────────────────────────────────────
        const referralCode = buildReferralCode(application.firstName);
        const affiliateId = `affiliate_${(0, crypto_1.randomBytes)(6).toString("hex")}`;
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.campaignAffiliate.create({
                data: {
                    tenantId,
                    campaignId: application.campaignId,
                    affiliateId,
                    referralCode,
                },
            });
            const updated = await tx.application.update({
                where: { id },
                data: {
                    status: "approved",
                    affiliateId,
                    reviewedAt: new Date(),
                },
            });
            await tx.user.updateMany({
                where: {
                    tenantId,
                    email: application.email,
                },
                data: {
                    affiliateId,
                },
            });
            return updated;
        });
        await (0, event_bus_1.emitEvent)("affiliate.joined", { tenantId, affiliateId });
        await (0, event_bus_1.emitEvent)("application.approved", {
            tenantId,
            applicationId: result.id,
            affiliateId,
            email: result.email,
            firstName: result.firstName,
            referralCode,
        });
        await (0, cache_1.invalidateCache)(tenantId, "applications:list", "dashboard:summary");
        res.status(200).json({
            id: result.id,
            status: result.status,
            affiliateId,
            referralCode,
        });
    }
    catch (err) {
        if (typeof err === "object" &&
            err !== null &&
            "code" in err &&
            err.code === "P2002") {
            // Referral code collision — extremely unlikely with 4 hex chars but
            // worth surfacing cleanly so a retry succeeds.
            res.status(409).json({ error: "Referral code collision, please retry" });
            return;
        }
        console.error("[applications] status update failed:", err);
        res.status(500).json({ error: "Failed to update application" });
    }
});
function buildReferralCode(firstName) {
    const prefix = firstName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 8) || "ref";
    const suffix = (0, crypto_1.randomBytes)(2).toString("hex").toUpperCase();
    return `${prefix.toUpperCase()}-${suffix}`;
}
//# sourceMappingURL=applications.js.map