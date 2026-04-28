import { randomBytes } from "crypto";
import type { Application, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { emitEvent } from "./event-bus";
import { createEventCoupon } from "./luma";

type ActivationResult =
  | { activated: true; tenantId: string; applicationId: string; affiliateId: string; email: string; firstName: string; referralCode: string; campaignId: string }
  | { activated: false; reason: string };

function normalizeReferralCode(value: string | null | undefined): string | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
  return normalized || null;
}

function referralBase(application: Application): string {
  return normalizeReferralCode(application.requestedCode)
    ?? normalizeReferralCode(application.firstName)
    ?? "REF";
}

async function generateUniqueReferralCode(
  tx: Prisma.TransactionClient,
  application: Application,
): Promise<string> {
  const base = referralBase(application);
  const candidates = new Set<string>([base.slice(0, 20)]);
  while (candidates.size < 20) {
    const suffixLength = candidates.size < 8 ? 3 : 6;
    candidates.add(`${base}${randomBytes(suffixLength).toString("hex").toUpperCase()}`.slice(0, 20));
  }
  candidates.add(`REF${randomBytes(8).toString("hex").toUpperCase()}`.slice(0, 20));

  for (const candidate of candidates) {
    const existing = await tx.campaignAffiliate.findUnique({
      where: {
        tenantId_referralCode: {
          tenantId: application.tenantId,
          referralCode: candidate,
        },
      },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new Error("Unable to generate a unique referral code");
}

export async function activateAffiliateFromMou(args: {
  documentId: string;
  eventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}): Promise<ActivationResult> {
  const result = await prisma.$transaction(async (tx): Promise<ActivationResult> => {
    const mou = await tx.mouAgreement.findFirst({
      where: {
        provider: "boldsign",
        providerDocumentId: args.documentId,
        isCurrent: true,
      },
    });

    try {
      await tx.processedWebhookEvent.create({
        data: {
          provider: "boldsign",
          eventId: args.eventId,
          eventType: args.eventType,
          documentId: args.documentId,
          tenantId: mou?.tenantId ?? null,
          payload: args.payload,
        },
      });
    } catch (err: unknown) {
      if (isPrismaUniqueConstraintError(err)) {
        return { activated: false, reason: "duplicate_webhook_event" };
      }
      throw err;
    }

    if (!mou) return { activated: false, reason: "mou_not_found" };
    if (mou.status === "signed") return { activated: false, reason: "mou_already_signed" };
    if (mou.status === "voided") return { activated: false, reason: "mou_voided" };

    const application = await tx.application.findUnique({
      where: { id: mou.applicationId },
    });
    if (!application) return { activated: false, reason: "application_not_found" };
    if (application.status === "approved") return { activated: false, reason: "application_already_approved" };
    if (application.status !== "approved_pending_mou") {
      return { activated: false, reason: `invalid_application_status_${application.status}` };
    }

    const affiliateId = `affiliate_${randomBytes(6).toString("hex")}`;
    const referralCode = await generateUniqueReferralCode(tx, application);

    await tx.campaignAffiliate.create({
      data: {
        tenantId: application.tenantId,
        campaignId: application.campaignId,
        affiliateId,
        referralCode,
        codeStatus: "unverified",
      },
    });

    await tx.application.update({
      where: { id: application.id },
      data: {
        status: "approved",
        affiliateId,
        activatedAt: new Date(),
      },
    });

    await tx.mouAgreement.update({
      where: { id: mou.id },
      data: {
        status: "signed",
        signedAt: new Date(),
      },
    });

    await tx.user.updateMany({
      where: {
        tenantId: application.tenantId,
        email: application.email,
      },
      data: { affiliateId },
    });

    return {
      activated: true,
      tenantId: application.tenantId,
      applicationId: application.id,
      affiliateId,
      email: application.email,
      firstName: application.firstName,
      referralCode,
      campaignId: application.campaignId,
    };
  });

  if (result.activated) {
    // Auto-create the matching coupon in Luma so admins do not have to
    // mirror codes by hand. Best-effort: failure here does NOT roll back
    // activation — the affiliate row exists with codeStatus=unverified
    // and codeSyncError set, and an admin can retry from /verify-code.
    await syncCouponToLuma({
      tenantId: result.tenantId,
      affiliateId: result.affiliateId,
      campaignId: result.campaignId,
      referralCode: result.referralCode,
      affiliateName: result.firstName,
    });

    await emitEvent("affiliate.joined", {
      tenantId: result.tenantId,
      affiliateId: result.affiliateId,
      eventId: `affiliate-joined:${result.applicationId}`,
    });
    await emitEvent("application.approved", {
      tenantId: result.tenantId,
      applicationId: result.applicationId,
      affiliateId: result.affiliateId,
      email: result.email,
      firstName: result.firstName,
      referralCode: result.referralCode,
      eventId: `application-approved:${result.applicationId}`,
    });
  }

  return result;
}

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Luma coupon sync — outbound. Best-effort; never throws.
//
// Looks up the campaign to determine the Luma event_api_id + default percent
// discount, calls Luma's create-coupon API, and writes the result back to
// CampaignAffiliate.codeStatus / codeSyncError. If the campaign has no
// lumaEventId configured the sync is skipped entirely (codeStatus stays
// unverified — admin can wire it later).
//
// Exported so the retry endpoint can reuse the same logic without duplicating
// the lookup-or-skip dance.
// ─────────────────────────────────────────────────────────────────────────────

export async function syncCouponToLuma(args: {
  tenantId: string;
  affiliateId: string;
  campaignId: string;
  referralCode: string;
  affiliateName?: string;
}): Promise<{ status: "verified" | "unverified" | "skipped"; error: string | null }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: args.campaignId },
    select: {
      lumaEventId: true,
      referralCouponPercentOff: true,
      name: true,
    },
  });

  // Skip path: no Luma event linked → leave codeStatus untouched (defaults to
  // unverified at create time). The admin must set Campaign.lumaEventId or
  // create the coupon manually in Luma.
  if (!campaign?.lumaEventId) {
    return { status: "skipped", error: null };
  }

  const result = await createEventCoupon({
    eventId: campaign.lumaEventId,
    code: args.referralCode,
    percentOff: campaign.referralCouponPercentOff ?? 10,
    name: args.affiliateName
      ? `${args.affiliateName} – ${campaign.name}`
      : `Affiliate ${args.referralCode}`,
  });

  if (result.ok) {
    await prisma.campaignAffiliate.updateMany({
      where: { tenantId: args.tenantId, affiliateId: args.affiliateId },
      data: { codeStatus: "verified", codeSyncError: null },
    });
    return { status: "verified", error: null };
  }

  // Idempotent path — Luma rejects with 400 "You already have a coupon with
  // this code. Please try another code." when the code is already on the
  // event. That's the desired end state (the coupon exists, sales referencing
  // it will get tracked), so treat it as verified rather than surfacing an
  // error. Common scenarios: admin pre-created the code manually before the
  // auto-sync was wired, or a previous activation race.
  if (isAlreadyExistsError(result.message)) {
    await prisma.campaignAffiliate.updateMany({
      where: { tenantId: args.tenantId, affiliateId: args.affiliateId },
      data: { codeStatus: "verified", codeSyncError: null },
    });
    return { status: "verified", error: null };
  }

  // Failure path — record the error so the admin UI can show it.
  console.warn(
    `[luma-sync] coupon create failed for affiliate=${args.affiliateId} code=${args.referralCode}: ${result.message}`,
  );
  await prisma.campaignAffiliate.updateMany({
    where: { tenantId: args.tenantId, affiliateId: args.affiliateId },
    data: { codeStatus: "unverified", codeSyncError: result.message },
  });
  return { status: "unverified", error: result.message };
}

function isAlreadyExistsError(message: string): boolean {
  return /already have a coupon with this code/i.test(message);
}
