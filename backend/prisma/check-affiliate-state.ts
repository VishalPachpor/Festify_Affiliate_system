import { PrismaClient } from "@prisma/client";

// One-shot diagnostic: print the full state of an affiliate journey for a given
// email. Useful after testing the approve → MOU sign → Luma coupon flow to
// confirm every step landed where it should.
//
// Run:
//   DATABASE_URL='<neon-url>' AFFILIATE_EMAIL=ngravity763@gmail.com \
//     npx ts-node prisma/check-affiliate-state.ts

const EMAIL = (process.env.AFFILIATE_EMAIL ?? "ngravity763@gmail.com").trim().toLowerCase();

const prisma = new PrismaClient();

async function main() {
  console.log(`\n[check] inspecting state for ${EMAIL}\n${"─".repeat(64)}`);

  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, email: true, fullName: true, tenantId: true, role: true, affiliateId: true, emailVerifiedAt: true },
  });
  console.log("\n● User");
  if (!user) {
    console.log("  (none)");
  } else {
    console.log(`  id:              ${user.id}`);
    console.log(`  fullName:        ${user.fullName}`);
    console.log(`  tenantId:        ${user.tenantId}`);
    console.log(`  role:            ${user.role}`);
    console.log(`  affiliateId:     ${user.affiliateId ?? "(null — not yet linked to CampaignAffiliate)"}`);
    console.log(`  emailVerifiedAt: ${user.emailVerifiedAt?.toISOString() ?? "(null)"}`);
  }

  const application = await prisma.application.findFirst({
    where: { email: EMAIL },
    select: {
      id: true, tenantId: true, campaignId: true, status: true, requestedCode: true,
      affiliateId: true, activatedAt: true, welcomeEmailSentAt: true, createdAt: true, updatedAt: true,
    },
  });
  console.log("\n● Application");
  if (!application) {
    console.log("  (none)");
  } else {
    console.log(`  id:                  ${application.id}`);
    console.log(`  tenantId:            ${application.tenantId}`);
    console.log(`  campaignId:          ${application.campaignId}`);
    console.log(`  status:              ${application.status}`);
    console.log(`  requestedCode:       ${application.requestedCode ?? "(null)"}`);
    console.log(`  affiliateId:         ${application.affiliateId ?? "(null — not yet activated)"}`);
    console.log(`  activatedAt:         ${application.activatedAt?.toISOString() ?? "(null)"}`);
    console.log(`  welcomeEmailSentAt:  ${application.welcomeEmailSentAt?.toISOString() ?? "(null)"}`);
    console.log(`  updatedAt:           ${application.updatedAt.toISOString()}`);
  }

  if (application) {
    const mou = await prisma.mouAgreement.findFirst({
      where: { applicationId: application.id, isCurrent: true },
      select: { id: true, provider: true, providerDocumentId: true, status: true, signedAt: true, voidedAt: true, createdAt: true },
    });
    console.log("\n● MouAgreement (current)");
    if (!mou) {
      console.log("  (none)");
    } else {
      console.log(`  id:                  ${mou.id}`);
      console.log(`  provider:            ${mou.provider}`);
      console.log(`  providerDocumentId:  ${mou.providerDocumentId}`);
      console.log(`  status:              ${mou.status}`);
      console.log(`  signedAt:            ${mou.signedAt?.toISOString() ?? "(null)"}`);
      console.log(`  voidedAt:            ${mou.voidedAt?.toISOString() ?? "(null)"}`);
    }

    if (mou) {
      const webhooks = await prisma.processedWebhookEvent.findMany({
        where: { provider: "boldsign", documentId: mou.providerDocumentId },
        orderBy: { processedAt: "desc" },
        select: { eventId: true, eventType: true, processedAt: true },
      });
      console.log(`\n● ProcessedWebhookEvent (BoldSign for this document)  count=${webhooks.length}`);
      for (const w of webhooks) {
        console.log(`  ${w.processedAt.toISOString()}  ${w.eventType.padEnd(14)}  ${w.eventId}`);
      }
    }
  }

  if (user?.affiliateId) {
    const affiliate = await prisma.campaignAffiliate.findFirst({
      where: { affiliateId: user.affiliateId },
      select: {
        id: true, tenantId: true, campaignId: true, affiliateId: true, referralCode: true,
        codeStatus: true, codeSyncError: true, createdAt: true,
      },
    });
    console.log("\n● CampaignAffiliate");
    if (!affiliate) {
      console.log("  (none — User.affiliateId set but no CampaignAffiliate row found — INCONSISTENT)");
    } else {
      console.log(`  id:             ${affiliate.id}`);
      console.log(`  affiliateId:    ${affiliate.affiliateId}`);
      console.log(`  referralCode:   ${affiliate.referralCode}`);
      console.log(`  codeStatus:     ${affiliate.codeStatus}`);
      console.log(`  codeSyncError:  ${affiliate.codeSyncError ?? "(null)"}`);
      console.log(`  createdAt:      ${affiliate.createdAt.toISOString()}`);
    }
  } else {
    console.log("\n● CampaignAffiliate");
    console.log("  (n/a — no User.affiliateId yet, so activation hasn't run)");
  }

  // Verdict summary
  console.log(`\n${"─".repeat(64)}\n● Verdict`);
  if (!application) {
    console.log("  ⚠️  No Application — user hasn't applied yet.");
  } else if (application.status === "pending") {
    console.log("  📋 Application pending — admin needs to approve.");
  } else if (application.status === "approved_pending_mou") {
    console.log("  ⏳ Approved, waiting for MOU signature. If signing is done, BoldSign Completed webhook hasn't arrived (or activation failed).");
  } else if (application.status === "approved" && user?.affiliateId) {
    const aff = await prisma.campaignAffiliate.findFirst({
      where: { affiliateId: user.affiliateId },
      select: { codeStatus: true, codeSyncError: true, referralCode: true },
    });
    if (aff?.codeStatus === "verified") {
      console.log(`  ✅ Fully activated. Coupon ${aff.referralCode} is verified in Luma.`);
    } else if (aff?.codeStatus === "unverified" && aff.codeSyncError) {
      console.log(`  ⚠️  Activated but Luma sync failed: ${aff.codeSyncError}`);
      console.log(`      Retry via PATCH /api/affiliates/<affiliateId>/verify-code (admin More menu).`);
    } else if (aff?.codeStatus === "unverified") {
      console.log(`  ⚠️  Activated but Luma sync was skipped (no LUMA_API_KEY or no Campaign.lumaEventId).`);
      console.log(`      Set the env / event link, then retry via the admin More menu.`);
    } else {
      console.log(`  ❓ Activated but CampaignAffiliate state unclear.`);
    }
  } else if (application.status === "rejected") {
    console.log("  ❌ Application rejected.");
  } else {
    console.log(`  ❓ Unknown state: status=${application.status}`);
  }
}

main()
  .catch((err) => {
    console.error("[check] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
