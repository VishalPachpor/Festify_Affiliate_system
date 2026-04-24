import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Minimal, idempotent affiliate bootstrap for production QA.
//
// Creates (if missing):
//   • tenant_demo
//   • campaign_demo
//   • CampaignAffiliate row (aff_alex_demo, referral code ALEXDEMO)
//   • alex@festify.io User with role=affiliate, affiliateId=aff_alex_demo,
//     pre-verified so login works immediately
//
// Partnered with bootstrap-admin.ts and seed-sales-payouts.ts: this gives
// the QA surface a working affiliate login that matches the sales/payouts
// fixture. Safe to re-run on every deploy — if alex@festify.io already
// exists the row is left untouched (password preserved).
//
// Manual run:
//   DATABASE_URL="<neon url>" npx ts-node prisma/bootstrap-affiliate.ts

const TENANT_ID = "tenant_demo";
const TENANT_SLUG = "demo";
const CAMPAIGN_ID = "campaign_demo";
const CAMPAIGN_SLUG = "demo";
const AFFILIATE_ID = "aff_alex_demo";
const REFERRAL_CODE = "ALEXDEMO";
const AFFILIATE_EMAIL = "alex@festify.io";
const AFFILIATE_PASSWORD = "Password123!";

const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      slug: TENANT_SLUG,
      name: "Demo Tenant",
      defaultCurrency: "USD",
    },
  });

  await prisma.campaign.upsert({
    where: { id: CAMPAIGN_ID },
    update: {},
    create: {
      id: CAMPAIGN_ID,
      tenantId: TENANT_ID,
      slug: CAMPAIGN_SLUG,
      name: "Demo Campaign",
      commissionRateBps: 1000,
    },
  });

  const existingCA = await prisma.campaignAffiliate.findUnique({
    where: {
      tenantId_referralCode: { tenantId: TENANT_ID, referralCode: REFERRAL_CODE },
    },
  });
  if (!existingCA) {
    await prisma.campaignAffiliate.create({
      data: {
        tenantId: TENANT_ID,
        campaignId: CAMPAIGN_ID,
        affiliateId: AFFILIATE_ID,
        referralCode: REFERRAL_CODE,
        codeStatus: "verified",
      },
    });
  }

  const existing = await prisma.user.findUnique({
    where: { email: AFFILIATE_EMAIL },
    select: { id: true, email: true },
  });

  if (existing) {
    console.log(
      `[bootstrap-affiliate] ${existing.email} already exists (id=${existing.id}) — leaving row untouched.`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(AFFILIATE_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: AFFILIATE_EMAIL,
      fullName: "Alex Demo",
      passwordHash,
      role: "affiliate",
      tenantId: TENANT_ID,
      affiliateId: AFFILIATE_ID,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(
    `[bootstrap-affiliate] created ${user.email} (id=${user.id}) linked to ${AFFILIATE_ID} with default demo password.`,
  );
}

main()
  .catch((err) => {
    console.error("[bootstrap-affiliate] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
