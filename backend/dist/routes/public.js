"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
exports.publicRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// Public, unauthenticated routes for the affiliate-facing application flow.
// These do NOT use apiAuth — they live behind /api/public so the express
// middleware mounted at /api/* in server.ts skips them.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/events/:tenantSlug/:eventSlug
//
// Resolves an event by tenant slug + campaign slug. Campaign slugs are unique
// per tenant, so both segments are required.
// Also supports GET /api/public/events/:eventSlug (legacy single-slug) by
// falling back to a tenant-agnostic search when only one segment is given.
// ─────────────────────────────────────────────────────────────────────────────
async function handleEventLookup(req, res) {
    try {
        const tenantSlug = String(req.params.tenantSlug ?? "").trim().toLowerCase();
        const eventSlug = req.params.eventSlug
            ? String(req.params.eventSlug).trim().toLowerCase()
            : null;
        if (!tenantSlug) {
            res.status(400).json({ error: "Missing event slug" });
            return;
        }
        let campaign;
        if (eventSlug) {
            const tenant = await prisma_1.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
            if (!tenant) {
                res.status(404).json({ error: "Event not found" });
                return;
            }
            campaign = await prisma_1.prisma.campaign.findFirst({
                where: { tenantId: tenant.id, slug: eventSlug },
                include: { tenant: true },
            });
        }
        else {
            campaign = await prisma_1.prisma.campaign.findFirst({
                where: { slug: tenantSlug },
                include: { tenant: true },
            });
        }
        if (!campaign) {
            res.status(404).json({ error: "Event not found" });
            return;
        }
        res.status(200).json({
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignSlug: campaign.slug,
            commissionRateBps: campaign.commissionRateBps,
            tenantId: campaign.tenantId,
            tenantName: campaign.tenant.name,
            tenantSlug: campaign.tenant.slug,
        });
    }
    catch (err) {
        console.error("[public] event lookup failed:", err);
        res.status(500).json({ error: "Failed to load event" });
    }
}
// Two-segment: /events/:tenantSlug/:eventSlug
router.get("/api/public/events/:tenantSlug/:eventSlug", handleEventLookup);
// Single-segment legacy: /events/:slug
router.get("/api/public/events/:tenantSlug", handleEventLookup);
function asNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}
router.post("/api/public/applications", async (req, res) => {
    try {
        const body = (req.body ?? {});
        const eventSlug = asNonEmptyString(body.eventSlug)?.toLowerCase();
        const firstName = asNonEmptyString(body.firstName);
        const email = asNonEmptyString(body.email)?.toLowerCase();
        const fitReason = asNonEmptyString(body.fitReason);
        if (!eventSlug || !firstName || !email || !fitReason) {
            res.status(400).json({
                error: "Missing required fields: eventSlug, firstName, email, fitReason",
            });
            return;
        }
        // Loose email shape check — full RFC 5322 isn't worth it for an MVP form.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: "Invalid email" });
            return;
        }
        const campaign = await prisma_1.prisma.campaign.findFirst({
            where: { slug: eventSlug },
            include: { tenant: true },
        });
        if (!campaign) {
            res.status(404).json({ error: "Event not found" });
            return;
        }
        // Idempotent on (tenant, campaign, email): if the same applicant resubmits
        // we just return their existing record instead of erroring out. Avoids the
        // "I clicked submit twice" panic on the public form.
        const existing = await prisma_1.prisma.application.findUnique({
            where: {
                tenantId_campaignId_email: {
                    tenantId: campaign.tenantId,
                    campaignId: campaign.id,
                    email,
                },
            },
        });
        if (existing) {
            res.status(200).json({
                id: existing.id,
                status: existing.status,
                duplicate: true,
            });
            return;
        }
        const application = await prisma_1.prisma.application.create({
            data: {
                tenantId: campaign.tenantId,
                campaignId: campaign.id,
                firstName,
                email,
                socialProfiles: asNonEmptyString(body.socialProfiles),
                audienceSize: asNonEmptyString(body.audienceSize),
                experience: asNonEmptyString(body.experience),
                fitReason,
                status: "pending",
            },
        });
        res.status(201).json({
            id: application.id,
            status: application.status,
            duplicate: false,
        });
    }
    catch (err) {
        console.error("[public] application submit failed:", err);
        res.status(500).json({ error: "Failed to submit application" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/applications/status
//
// Public status lookup by email + eventSlug. Lets the public form show
// "you've already applied — currently {pending/approved/rejected}" without
// requiring the applicant to log in.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/public/applications/status", async (req, res) => {
    try {
        const eventSlug = String(req.query.eventSlug ?? "").trim().toLowerCase();
        const email = String(req.query.email ?? "").trim().toLowerCase();
        if (!eventSlug || !email) {
            res.status(400).json({ error: "eventSlug and email required" });
            return;
        }
        const campaign = await prisma_1.prisma.campaign.findFirst({ where: { slug: eventSlug } });
        if (!campaign) {
            res.status(200).json({ status: "not_applied" });
            return;
        }
        const application = await prisma_1.prisma.application.findUnique({
            where: {
                tenantId_campaignId_email: {
                    tenantId: campaign.tenantId,
                    campaignId: campaign.id,
                    email,
                },
            },
        });
        if (!application) {
            res.status(200).json({ status: "not_applied" });
            return;
        }
        res.status(200).json({
            status: application.status,
            affiliateId: application.affiliateId,
        });
    }
    catch (err) {
        console.error("[public] application status failed:", err);
        res.status(500).json({ error: "Failed to load status" });
    }
});
//# sourceMappingURL=public.js.map