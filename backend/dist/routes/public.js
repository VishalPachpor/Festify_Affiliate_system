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
function asApplicantType(v) {
    return v === "company" || v === "individual" ? v : null;
}
function asChannels(v) {
    if (!Array.isArray(v))
        return [];
    return v
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);
}
router.post("/api/public/applications", async (req, res) => {
    try {
        const body = (req.body ?? {});
        const eventSlug = asNonEmptyString(body.eventSlug)?.toLowerCase();
        const applyingAs = asApplicantType(body.applyingAs);
        const fullName = asNonEmptyString(body.fullName);
        const email = asNonEmptyString(body.email)?.toLowerCase();
        const telegramUsername = asNonEmptyString(body.telegramUsername);
        const companyName = asNonEmptyString(body.companyName);
        const contactPersonName = asNonEmptyString(body.contactPersonName);
        const contactPersonEmail = asNonEmptyString(body.contactPersonEmail)?.toLowerCase();
        const signatoryName = asNonEmptyString(body.signatoryName);
        const signatoryEmail = asNonEmptyString(body.signatoryEmail)?.toLowerCase();
        const contactPersonTelegramUsername = asNonEmptyString(body.contactPersonTelegramUsername);
        const communicationChannels = asChannels(body.communicationChannels);
        const experience = asNonEmptyString(body.experience);
        if (!eventSlug || !applyingAs) {
            res.status(400).json({ error: "Missing required application details" });
            return;
        }
        if (communicationChannels.length === 0) {
            res.status(400).json({ error: "Select at least one communication channel" });
            return;
        }
        const canonicalEmail = applyingAs === "individual" ? email : contactPersonEmail;
        const displayName = applyingAs === "individual" ? fullName : companyName;
        if (!canonicalEmail || !displayName) {
            res.status(400).json({ error: "Missing required application details" });
            return;
        }
        // Loose email shape check — full RFC 5322 isn't worth it for an MVP form.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(canonicalEmail)) {
            res.status(400).json({ error: "Invalid email" });
            return;
        }
        if (applyingAs === "individual" && !telegramUsername) {
            res.status(400).json({ error: "Telegram username is required" });
            return;
        }
        if (applyingAs === "company" &&
            (!contactPersonName ||
                !signatoryName ||
                !signatoryEmail ||
                !contactPersonTelegramUsername)) {
            res.status(400).json({ error: "Missing required company application details" });
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
                    email: canonicalEmail,
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
        // Validate and normalize requested referral code
        const rawCode = asNonEmptyString(body.requestedCode);
        const requestedCode = rawCode
            ? rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) || null
            : null;
        if (!requestedCode) {
            res.status(400).json({ error: "Preferred referral code is required" });
            return;
        }
        const application = await prisma_1.prisma.application.create({
            data: {
                tenantId: campaign.tenantId,
                campaignId: campaign.id,
                applyingAs,
                firstName: displayName,
                email: canonicalEmail,
                individualFullName: fullName,
                telegramUsername,
                companyName,
                contactPersonName,
                contactPersonEmail,
                signatoryName,
                signatoryEmail,
                contactPersonTelegramUsername,
                communicationChannels,
                emailDatabaseSize: asNonEmptyString(body.emailDatabaseSize),
                telegramGroupLink: asNonEmptyString(body.telegramGroupLink),
                xProfileLink: asNonEmptyString(body.xProfileLink),
                redditProfileLink: asNonEmptyString(body.redditProfileLink),
                linkedInProfileLink: asNonEmptyString(body.linkedInLink),
                instagramAccountLink: asNonEmptyString(body.instagramAccountLink),
                discordServerLink: asNonEmptyString(body.discordServerLink),
                socialProfiles: communicationChannels.join(", "),
                audienceSize: asNonEmptyString(body.emailDatabaseSize),
                experience,
                fitReason: experience ?? `Structured ${applyingAs} application submitted`,
                requestedCode,
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