import { randomBytes } from "crypto";
import type { Application, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { emitEvent } from "./event-bus";

type ActivationResult =
  | { activated: true; tenantId: string; applicationId: string; affiliateId: string; email: string; firstName: string; referralCode: string }
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
    };
  });

  if (result.activated) {
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
