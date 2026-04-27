import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import { invalidateCache } from "../lib/cache";
import { createMouFromTemplate, getBoldSignTemplateId, remindBoldSignDocument, voidBoldSignDocument } from "../lib/boldsign";
import { deriveMouSigner, MouSignerError } from "../lib/mou-signer";
import { sendAffiliateMouEmail, sendApplicationRejectedEmail } from "../lib/email";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/applications
//
// Organizer-side list of affiliate applications for the tenant. Filter by
// status with ?status=pending|approved|rejected.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/applications", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const status = String(req.query.status ?? "").trim().toLowerCase();

    const where: Record<string, unknown> = { tenantId };
    if (
      status === "pending" ||
      status === "approved_pending_mou" ||
      status === "approved" ||
      status === "rejected"
    ) {
      where.status = status;
    }

    const applications = await prisma.application.findMany({
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
  } catch (err) {
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

router.patch("/api/applications/:id/status", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
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
  } catch (err: unknown) {
    handleApplicationActionError(err, res);
  }
});

router.post("/api/applications/:id/approve", async (req: Request, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const result = await approveApplication({
      id: String(req.params.id),
      tenantId: getTenantId(req),
    });
    res.status(200).json(result);
  } catch (err) {
    handleApplicationActionError(err, res);
  }
});

router.post("/api/applications/:id/reject", async (req: Request, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const id = String(req.params.id);
    await rejectApplication({ id, tenantId: getTenantId(req) });
    res.status(200).json({ id, status: "rejected" });
  } catch (err) {
    handleApplicationActionError(err, res);
  }
});

router.post("/api/applications/:id/mou/resend", async (req: Request, res: Response) => {
  try {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const tenantId = getTenantId(req);
    const application = await prisma.application.findFirst({
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

    await remindBoldSignDocument(mou.providerDocumentId);
    await prisma.mouAgreement.update({
      where: { id: mou.id },
      data: { resendCount: { increment: 1 } },
    });
    await sendMouEmail(mou.signerEmail, mou.signerName, application.campaign.name);
    res.status(200).json({ id: application.id, status: application.status, mouStatus: mou.status });
  } catch (err) {
    handleApplicationActionError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/affiliates/:affiliateId/verify-code
//
// Admin confirms the coupon code has been created in Luma.
// Transitions codeStatus from unverified → verified.
// ─────────────────────────────────────────────────────────────────────────────

router.patch("/api/affiliates/:affiliateId/verify-code", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const affiliateId = String(req.params.affiliateId);

    const affiliate = await prisma.campaignAffiliate.findFirst({
      where: { tenantId, affiliateId },
    });
    if (!affiliate) {
      res.status(404).json({ error: "Affiliate not found" });
      return;
    }

    await prisma.campaignAffiliate.update({
      where: { id: affiliate.id },
      data: { codeStatus: "verified" },
    });

    res.status(200).json({ success: true, affiliateId, codeStatus: "verified" });
  } catch (err) {
    console.error("[affiliates] verify-code failed:", err);
    res.status(500).json({ error: "Failed to verify code" });
  }
});

type ApplicationActionArgs = {
  id: string;
  tenantId: string;
};

function frontendBaseUrl(): string {
  return (
    process.env.APP_URL?.trim() ||
    process.env.FRONTEND_APP_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function sendMouEmail(to: string, signerName: string, campaignName: string): Promise<void> {
  await sendAffiliateMouEmail({
    to,
    signerName,
    campaignName,
    signingUrl: `${frontendBaseUrl()}/dashboard/application/mou`,
  });
}

async function approveApplication(args: ApplicationActionArgs): Promise<{
  id: string;
  status: string;
  mouStatus: string;
}> {
  const application = await prisma.application.findFirst({
    where: { id: args.id, tenantId: args.tenantId },
    include: { campaign: { select: { name: true } } },
  });
  if (!application) {
    throw new ApplicationActionError(404, "Application not found");
  }
  if (application.status !== "pending") {
    throw new ApplicationActionError(
      400,
      `Application is already ${application.status}, cannot approve`,
    );
  }

  const templateId = getBoldSignTemplateId();

  const claimed = await prisma.$transaction(async (tx) => {
    const current = await tx.application.findFirst({
      where: { id: args.id, tenantId: args.tenantId },
    });
    if (!current) {
      throw new ApplicationActionError(404, "Application not found");
    }
    if (current.status !== "pending") {
      throw new ApplicationActionError(400, `Application is already ${current.status}`);
    }

    // Derive signer from the in-tx snapshot so a concurrent application edit
    // can't slip stale signer values past the consistency boundary.
    const signer = deriveMouSigner(current);

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

    return { applicationId: current.id, mouId: mou.id, signer };
  });
  const signer = claimed.signer;

  try {
    const created = await createMouFromTemplate({
      signerName: signer.signerName,
      signerEmail: signer.signerEmail,
      applicationId: claimed.applicationId,
      tenantId: args.tenantId,
      templateId,
    });

    await prisma.mouAgreement.update({
      where: { id: claimed.mouId },
      data: {
        providerDocumentId: created.documentId,
        status: "sent",
        sentAt: new Date(),
        lastError: null,
      },
    });

    await sendMouEmail(signer.signerEmail, signer.signerName, application.campaign.name);
  } catch (err) {
    await prisma.mouAgreement.update({
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

  await invalidateCache(args.tenantId, "applications:list");
  return { id: claimed.applicationId, status: "approved_pending_mou", mouStatus: "sent" };
}

async function reissueMou(args: { applicationId: string; tenantId: string }): Promise<{
  id: string;
  status: string;
  mouStatus: string;
}> {
  const application = await prisma.application.findFirst({
    where: { id: args.applicationId, tenantId: args.tenantId },
    include: { campaign: { select: { name: true } } },
  });
  if (!application) {
    throw new ApplicationActionError(404, "Application not found");
  }
  if (application.status !== "approved_pending_mou") {
    throw new ApplicationActionError(400, "Application is not awaiting MOU signature");
  }

  const templateId = getBoldSignTemplateId();
  const existingCurrent = await prisma.mouAgreement.findFirst({
    where: { applicationId: application.id, isCurrent: true },
    orderBy: { version: "desc" },
  });

  const { mou: created, signer } = await prisma.$transaction(async (tx) => {
    // Re-fetch the application inside the tx so signer derivation uses the
    // committed snapshot — matches the approve path's consistency model.
    const current = await tx.application.findFirst({
      where: { id: application.id, tenantId: application.tenantId },
    });
    if (!current) {
      throw new ApplicationActionError(404, "Application not found");
    }
    const txSigner = deriveMouSigner(current);

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
    const mou = await tx.mouAgreement.create({
      data: {
        tenantId: application.tenantId,
        applicationId: application.id,
        providerTemplateId: templateId,
        version: priorCount + 1,
        isCurrent: true,
        signerName: txSigner.signerName,
        signerEmail: txSigner.signerEmail,
        status: "created",
      },
    });
    return { mou, signer: txSigner };
  });

  if (existingCurrent?.providerDocumentId) {
    voidBoldSignDocument(existingCurrent.providerDocumentId, "MOU reissued")
      .catch((err) => console.warn("[applications] failed to void previous MOU:", err));
  }

  try {
    const boldSignDoc = await createMouFromTemplate({
      signerName: signer.signerName,
      signerEmail: signer.signerEmail,
      applicationId: application.id,
      tenantId: application.tenantId,
      templateId,
    });
    await prisma.mouAgreement.update({
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
  } catch (err) {
    await prisma.mouAgreement.update({
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

  await invalidateCache(args.tenantId, "applications:list");
  return { id: application.id, status: application.status, mouStatus: "sent" };
}

async function rejectApplication(args: ApplicationActionArgs): Promise<void> {
  const application = await prisma.application.findFirst({
    where: { id: args.id, tenantId: args.tenantId },
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
    throw new ApplicationActionError(404, "Application not found");
  }
  if (application.status === "approved") {
    throw new ApplicationActionError(400, "Approved affiliates cannot be rejected");
  }
  if (application.status === "rejected") {
    throw new ApplicationActionError(400, "Application is already rejected");
  }

  const currentMou = application.mouAgreements[0] ?? null;
  await prisma.$transaction(async (tx) => {
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
    voidBoldSignDocument(currentMou.providerDocumentId, "Application rejected")
      .catch((err) => console.warn("[applications] failed to void rejected MOU:", err));
  }

  // Email is best-effort: the rejection itself is committed above. A delivery
  // failure (Resend down, bad address) shouldn't surface as a 500 to the
  // admin — they've successfully rejected the application either way.
  sendApplicationRejectedEmail({
    to: application.email,
    firstName: application.firstName,
    campaignName: application.campaign.name,
  }).catch((err) => console.warn("[applications] rejection email failed:", err));

  await invalidateCache(args.tenantId, "applications:list");
}

class ApplicationActionError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApplicationActionError";
  }
}

function handleApplicationActionError(err: unknown, res: Response): void {
  if (err instanceof ApplicationActionError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof MouSignerError) {
    res.status(400).json({ error: err.message });
    return;
  }
  console.error("[applications] action failed:", err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Application action failed" });
}

export { router as applicationsRouter };
