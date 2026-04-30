"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const cache_1 = require("../lib/cache");
const boldsign_1 = require("../lib/boldsign");
const mou_signer_1 = require("../lib/mou-signer");
const email_1 = require("../lib/email");
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
        if (status === "pending" ||
            status === "approved_pending_mou" ||
            status === "approved" ||
            status === "rejected") {
            where.status = status;
        }
        const applications = await prisma_1.prisma.application.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                campaign: { select: { id: true, name: true, slug: true } },
                mouAgreements: {
                    where: { isCurrent: true },
                    orderBy: { version: "desc" },
                    take: 1,
                },
            },
        });
        res.status(200).json({
            applications: applications.map((a) => ({
                id: a.id,
                applyingAs: a.applyingAs,
                firstName: a.firstName,
                email: a.email,
                individualFullName: a.individualFullName,
                telegramUsername: a.telegramUsername,
                companyName: a.companyName,
                contactPersonName: a.contactPersonName,
                contactPersonEmail: a.contactPersonEmail,
                signatoryName: a.signatoryName,
                signatoryEmail: a.signatoryEmail,
                contactPersonTelegramUsername: a.contactPersonTelegramUsername,
                communicationChannels: a.communicationChannels,
                emailDatabaseSize: a.emailDatabaseSize,
                telegramGroupLink: a.telegramGroupLink,
                xProfileLink: a.xProfileLink,
                redditProfileLink: a.redditProfileLink,
                linkedInProfileLink: a.linkedInProfileLink,
                instagramAccountLink: a.instagramAccountLink,
                discordServerLink: a.discordServerLink,
                socialProfiles: a.socialProfiles,
                audienceSize: a.audienceSize,
                experience: a.experience,
                fitReason: a.fitReason,
                requestedCode: a.requestedCode,
                status: a.status,
                affiliateId: a.affiliateId,
                campaignId: a.campaignId,
                campaignName: a.campaign.name,
                campaignSlug: a.campaign.slug,
                mouStatus: a.mouAgreements[0]?.status ?? null,
                mouSignerEmail: a.mouAgreements[0]?.signerEmail ?? null,
                mouSignerName: a.mouAgreements[0]?.signerName ?? null,
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
// Backwards-compatible review endpoint. Approval now means "commercially
// accepted": it creates a BoldSign MOU and moves the application to
// approved_pending_mou. CampaignAffiliate/User.affiliateId are created only by
// the verified BoldSign completion webhook.
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
        if (req.userRole !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        if (nextStatus === "rejected") {
            await rejectApplication({ id, tenantId });
            res.status(200).json({ id, status: "rejected" });
            return;
        }
        const result = await approveApplication({ id, tenantId });
        res.status(200).json(result);
    }
    catch (err) {
        handleApplicationActionError(err, res);
    }
});
router.post("/api/applications/:id/approve", async (req, res) => {
    try {
        if (req.userRole !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        const result = await approveApplication({
            id: String(req.params.id),
            tenantId: (0, auth_1.getTenantId)(req),
        });
        res.status(200).json(result);
    }
    catch (err) {
        handleApplicationActionError(err, res);
    }
});
router.post("/api/applications/:id/reject", async (req, res) => {
    try {
        if (req.userRole !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        const id = String(req.params.id);
        await rejectApplication({ id, tenantId: (0, auth_1.getTenantId)(req) });
        res.status(200).json({ id, status: "rejected" });
    }
    catch (err) {
        handleApplicationActionError(err, res);
    }
});
router.post("/api/applications/:id/mou/resend", async (req, res) => {
    try {
        if (req.userRole !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        const tenantId = (0, auth_1.getTenantId)(req);
        const application = await prisma_1.prisma.application.findFirst({
            where: { id: String(req.params.id), tenantId },
            include: {
                campaign: { select: { name: true } },
                mouAgreements: {
                    where: { isCurrent: true },
                    orderBy: { version: "desc" },
                    take: 1,
                },
            },
        });
        if (!application) {
            res.status(404).json({ error: "Application not found" });
            return;
        }
        if (application.status !== "approved_pending_mou") {
            res.status(400).json({ error: "Application is not awaiting MOU signature" });
            return;
        }
        const mou = application.mouAgreements[0] ?? null;
        if (!mou || !mou.providerDocumentId || mou.status === "failed" || mou.status === "expired" || mou.status === "declined") {
            const result = await reissueMou({ applicationId: application.id, tenantId });
            res.status(200).json(result);
            return;
        }
        await (0, boldsign_1.remindBoldSignDocument)(mou.providerDocumentId);
        await prisma_1.prisma.mouAgreement.update({
            where: { id: mou.id },
            data: { resendCount: { increment: 1 } },
        });
        await sendMouEmail(mou.signerEmail, mou.signerName, application.campaign.name);
        res.status(200).json({ id: application.id, status: application.status, mouStatus: mou.status });
    }
    catch (err) {
        handleApplicationActionError(err, res);
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/affiliates/:affiliateId/verify-code
//
// Admin confirms the coupon code has been created in Luma.
// Transitions codeStatus from unverified → verified.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/api/affiliates/:affiliateId/verify-code", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        if (req.userRole !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        const affiliateId = String(req.params.affiliateId);
        const affiliate = await prisma_1.prisma.campaignAffiliate.findFirst({
            where: { tenantId, affiliateId },
        });
        if (!affiliate) {
            res.status(404).json({ error: "Affiliate not found" });
            return;
        }
        await prisma_1.prisma.campaignAffiliate.update({
            where: { id: affiliate.id },
            data: { codeStatus: "verified" },
        });
        res.status(200).json({ success: true, affiliateId, codeStatus: "verified" });
    }
    catch (err) {
        console.error("[affiliates] verify-code failed:", err);
        res.status(500).json({ error: "Failed to verify code" });
    }
});
function frontendBaseUrl() {
    return (process.env.APP_URL?.trim() ||
        process.env.FRONTEND_APP_URL?.trim() ||
        process.env.PUBLIC_FRONTEND_URL?.trim() ||
        "http://localhost:3000").replace(/\/$/, "");
}
async function sendMouEmail(to, signerName, campaignName) {
    await (0, email_1.sendAffiliateMouEmail)({
        to,
        signerName,
        campaignName,
        signingUrl: `${frontendBaseUrl()}/dashboard/application/mou`,
    });
}
async function approveApplication(args) {
    const application = await prisma_1.prisma.application.findFirst({
        where: { id: args.id, tenantId: args.tenantId },
        include: { campaign: { select: { name: true } } },
    });
    if (!application) {
        throw new ApplicationActionError(404, "Application not found");
    }
    if (application.status !== "pending") {
        throw new ApplicationActionError(400, `Application is already ${application.status}, cannot approve`);
    }
    const signer = (0, mou_signer_1.deriveMouSigner)(application);
    const templateId = (0, boldsign_1.getBoldSignTemplateId)();
    const claimed = await prisma_1.prisma.$transaction(async (tx) => {
        const current = await tx.application.findFirst({
            where: { id: args.id, tenantId: args.tenantId },
        });
        if (!current) {
            throw new ApplicationActionError(404, "Application not found");
        }
        if (current.status !== "pending") {
            throw new ApplicationActionError(400, `Application is already ${current.status}`);
        }
        await tx.application.update({
            where: { id: current.id },
            data: {
                status: "approved_pending_mou",
                reviewedAt: new Date(),
            },
        });
        const priorCount = await tx.mouAgreement.count({
            where: { applicationId: current.id },
        });
        const mou = await tx.mouAgreement.create({
            data: {
                tenantId: current.tenantId,
                applicationId: current.id,
                providerTemplateId: templateId,
                version: priorCount + 1,
                isCurrent: true,
                signerName: signer.signerName,
                signerEmail: signer.signerEmail,
                status: "created",
            },
        });
        return { applicationId: current.id, mouId: mou.id };
    });
    try {
        const created = await (0, boldsign_1.createMouFromTemplate)({
            signerName: signer.signerName,
            signerEmail: signer.signerEmail,
            applicationId: claimed.applicationId,
            tenantId: args.tenantId,
            templateId,
        });
        await prisma_1.prisma.mouAgreement.update({
            where: { id: claimed.mouId },
            data: {
                providerDocumentId: created.documentId,
                status: "sent",
                sentAt: new Date(),
                lastError: null,
            },
        });
        await sendMouEmail(signer.signerEmail, signer.signerName, application.campaign.name);
    }
    catch (err) {
        await prisma_1.prisma.mouAgreement.update({
            where: { id: claimed.mouId },
            data: {
                status: "failed",
                failedAt: new Date(),
                lastError: err instanceof Error ? err.message : "Failed to create BoldSign MOU",
            },
        }).catch((updateErr) => {
            console.error("[applications] failed to mark MOU as failed:", updateErr);
        });
        throw err;
    }
    await (0, cache_1.invalidateCache)(args.tenantId, "applications:list");
    return { id: claimed.applicationId, status: "approved_pending_mou", mouStatus: "sent" };
}
async function reissueMou(args) {
    const application = await prisma_1.prisma.application.findFirst({
        where: { id: args.applicationId, tenantId: args.tenantId },
        include: { campaign: { select: { name: true } } },
    });
    if (!application) {
        throw new ApplicationActionError(404, "Application not found");
    }
    if (application.status !== "approved_pending_mou") {
        throw new ApplicationActionError(400, "Application is not awaiting MOU signature");
    }
    const signer = (0, mou_signer_1.deriveMouSigner)(application);
    const templateId = (0, boldsign_1.getBoldSignTemplateId)();
    const existingCurrent = await prisma_1.prisma.mouAgreement.findFirst({
        where: { applicationId: application.id, isCurrent: true },
        orderBy: { version: "desc" },
    });
    const created = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.mouAgreement.updateMany({
            where: { applicationId: application.id, isCurrent: true },
            data: {
                isCurrent: false,
                status: "voided",
                voidedAt: new Date(),
            },
        });
        const priorCount = await tx.mouAgreement.count({
            where: { applicationId: application.id },
        });
        return tx.mouAgreement.create({
            data: {
                tenantId: application.tenantId,
                applicationId: application.id,
                providerTemplateId: templateId,
                version: priorCount + 1,
                isCurrent: true,
                signerName: signer.signerName,
                signerEmail: signer.signerEmail,
                status: "created",
            },
        });
    });
    if (existingCurrent?.providerDocumentId) {
        (0, boldsign_1.voidBoldSignDocument)(existingCurrent.providerDocumentId, "MOU reissued")
            .catch((err) => console.warn("[applications] failed to void previous MOU:", err));
    }
    try {
        const boldSignDoc = await (0, boldsign_1.createMouFromTemplate)({
            signerName: signer.signerName,
            signerEmail: signer.signerEmail,
            applicationId: application.id,
            tenantId: application.tenantId,
            templateId,
        });
        await prisma_1.prisma.mouAgreement.update({
            where: { id: created.id },
            data: {
                providerDocumentId: boldSignDoc.documentId,
                status: "sent",
                sentAt: new Date(),
                resendCount: { increment: 1 },
                lastError: null,
            },
        });
        await sendMouEmail(signer.signerEmail, signer.signerName, application.campaign.name);
    }
    catch (err) {
        await prisma_1.prisma.mouAgreement.update({
            where: { id: created.id },
            data: {
                status: "failed",
                failedAt: new Date(),
                lastError: err instanceof Error ? err.message : "Failed to reissue BoldSign MOU",
            },
        }).catch((updateErr) => {
            console.error("[applications] failed to mark reissued MOU as failed:", updateErr);
        });
        throw err;
    }
    await (0, cache_1.invalidateCache)(args.tenantId, "applications:list");
    return { id: application.id, status: application.status, mouStatus: "sent" };
}
async function rejectApplication(args) {
    const application = await prisma_1.prisma.application.findFirst({
        where: { id: args.id, tenantId: args.tenantId },
        include: {
            mouAgreements: {
                where: { isCurrent: true },
                orderBy: { version: "desc" },
                take: 1,
            },
        },
    });
    if (!application) {
        throw new ApplicationActionError(404, "Application not found");
    }
    if (application.status === "approved") {
        throw new ApplicationActionError(400, "Approved affiliates cannot be rejected");
    }
    if (application.status === "rejected") {
        throw new ApplicationActionError(400, "Application is already rejected");
    }
    const currentMou = application.mouAgreements[0] ?? null;
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.application.update({
            where: { id: application.id },
            data: { status: "rejected", reviewedAt: application.reviewedAt ?? new Date() },
        });
        await tx.mouAgreement.updateMany({
            where: { applicationId: application.id, isCurrent: true },
            data: { status: "voided", isCurrent: false, voidedAt: new Date() },
        });
    });
    if (currentMou?.providerDocumentId) {
        (0, boldsign_1.voidBoldSignDocument)(currentMou.providerDocumentId, "Application rejected")
            .catch((err) => console.warn("[applications] failed to void rejected MOU:", err));
    }
    await (0, cache_1.invalidateCache)(args.tenantId, "applications:list");
}
class ApplicationActionError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ApplicationActionError";
    }
}
function handleApplicationActionError(err, res) {
    if (err instanceof ApplicationActionError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }
    if (err instanceof mou_signer_1.MouSignerError) {
        res.status(400).json({ error: err.message });
        return;
    }
    console.error("[applications] action failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Application action failed" });
}
//# sourceMappingURL=applications.js.map