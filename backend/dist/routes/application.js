"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.applicationRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// Affiliate-facing application status. Used by the gated /dashboard layout to
// decide whether the affiliate is approved and can see protected pages.
//
// Resolution order:
//   1. affiliateId from JWT → look up CampaignAffiliate, return "approved"
//   2. ?email query param   → look up Application by email, return its status
//   3. otherwise            → "not_applied"
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/application/status", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        if (req.affiliateId) {
            const membership = await prisma_1.prisma.campaignAffiliate.findFirst({
                where: { tenantId, affiliateId: req.affiliateId },
            });
            if (membership) {
                res.status(200).json({ status: "approved" });
                return;
            }
        }
        const email = String(req.query.email ?? "").trim().toLowerCase();
        if (email) {
            const application = await prisma_1.prisma.application.findFirst({
                where: { tenantId, email },
                orderBy: { createdAt: "desc" },
            });
            if (application) {
                res.status(200).json({ status: application.status });
                return;
            }
        }
        res.status(200).json({ status: "not_applied" });
    }
    catch (err) {
        console.error("[application] Status query failed:", err);
        res.status(500).json({ error: "Failed to load application status" });
    }
});
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
function isEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
router.post("/api/application/submit", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const body = (req.body ?? {});
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
        if (!applyingAs) {
            res.status(400).json({ error: "Applying as must be individual or company" });
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
        if (!isEmail(canonicalEmail)) {
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
        if (signatoryEmail && !isEmail(signatoryEmail)) {
            res.status(400).json({ error: "Invalid signatory email" });
            return;
        }
        const campaignId = asNonEmptyString(body.campaignId);
        const campaign = campaignId
            ? await prisma_1.prisma.campaign.findFirst({ where: { id: campaignId, tenantId } })
            : await prisma_1.prisma.campaign.findFirst({ where: { tenantId } });
        if (!campaign) {
            res.status(404).json({ error: "No campaign available for this tenant" });
            return;
        }
        const existing = await prisma_1.prisma.application.findUnique({
            where: {
                tenantId_campaignId_email: {
                    tenantId,
                    campaignId: campaign.id,
                    email: canonicalEmail,
                },
            },
        });
        if (existing) {
            res.status(200).json({ success: true, duplicate: true, id: existing.id });
            return;
        }
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
                tenantId,
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
        res.status(201).json({ success: true, duplicate: false, id: application.id });
    }
    catch (err) {
        console.error("[application] Submit failed:", err);
        res.status(500).json({ error: "Failed to submit application" });
    }
});
//# sourceMappingURL=application.js.map