import { PrismaClient } from "@prisma/client";

// One-shot: align Alex Demo's referralCode with the existing Luma coupon.
//
// The Luma event has a pre-existing coupon `TJQ59Q` (10% off) that webhooks
// arrive with. Our DB had Alex's CampaignAffiliate.referralCode = "ALEXDEMO",
// which never matched a Luma coupon. Updating to "TJQ59Q" so the existing
// Luma coupon attributes incoming sales to Alex.
//
// Idempotent: re-running is a no-op once the code is already TJQ59Q. Aborts
// if another affiliate already holds TJQ59Q in the same tenant (would violate
// the unique (tenantId, referralCode) constraint).
//
// Run:
//   DATABASE_URL='<neon url>' npx ts-node prisma/update-alex-referral-code.ts

const TENANT_ID = "tenant_demo";
const AFFILIATE_ID = "aff_alex_demo";
const NEW_CODE = "TJQ59Q";

const prisma = new PrismaClient();

async function main() {
  const target = await prisma.campaignAffiliate.findFirst({
    where: { tenantId: TENANT_ID, affiliateId: AFFILIATE_ID },
  });

  if (!target) {
    console.error(
      `[update-referral-code] no CampaignAffiliate for tenant=${TENANT_ID} affiliate=${AFFILIATE_ID}`,
    );
    process.exit(1);
  }

  if (target.referralCode === NEW_CODE) {
    console.log(
      `[update-referral-code] already ${NEW_CODE} (id=${target.id}) — no change.`,
    );
    return;
  }

  // Guard against the new code being held by a different affiliate in the
  // same tenant — the @@unique constraint would throw otherwise.
  const collision = await prisma.campaignAffiliate.findUnique({
    where: {
      tenantId_referralCode: { tenantId: TENANT_ID, referralCode: NEW_CODE },
    },
  });
  if (collision && collision.id !== target.id) {
    console.error(
      `[update-referral-code] code ${NEW_CODE} is already held by id=${collision.id} affiliateId=${collision.affiliateId}. Aborting.`,
    );
    process.exit(1);
  }

  const updated = await prisma.campaignAffiliate.update({
    where: { id: target.id },
    data: { referralCode: NEW_CODE },
  });

  console.log(
    `[update-referral-code] updated id=${updated.id}: referralCode ${target.referralCode} → ${updated.referralCode}`,
  );
}

main()
  .catch((err) => {
    console.error("[update-referral-code] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
