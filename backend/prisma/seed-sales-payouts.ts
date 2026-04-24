import { PrismaClient } from "@prisma/client";

// Narrow QA seed: creates a minimal sales + payouts dataset on tenant_demo
// so the commissions / payouts / "Mark Paid" admin flows have something to
// render and act on. Distinct from the full db:seed — this touches only:
//
//   • campaign_demo (upsert — created if missing)
//   • one CampaignAffiliate row (aff_alex_demo with a referral code)
//   • 4 Sale rows (status=approved) with fixed externalOrderIds
//   • 4 AttributionClaim rows linking each sale to the affiliate
//   • 4 CommissionLedgerEntry rows (earned)
//   • 1 Payout row (pending) bundling two of the entries, plus two entries
//     left with payoutId=null so the "New Payout / Mark Paid" flow has work
//
// Idempotent — detects a prior run via the sentinel externalOrderId
// "demo_qa_sale_1" and exits early if found, so safe to re-run against
// production without duplicating rows.
//
// Manual run:
//   DATABASE_URL="<neon url>" npx ts-node prisma/seed-sales-payouts.ts

const TENANT_ID = "tenant_demo";
const CAMPAIGN_ID = "campaign_demo";
const CAMPAIGN_SLUG = "demo";
const AFFILIATE_ID = "aff_alex_demo";
const REFERRAL_CODE = "ALEXDEMO";
const SENTINEL_ORDER_ID = "demo_qa_sale_1";

const CAMPAIGN_COMMISSION_BPS = 1000; // 10%

// Sale amounts in minor units (cents).
const SALE_AMOUNTS: Array<{ externalOrderId: string; amountMinor: number }> = [
  { externalOrderId: "demo_qa_sale_1", amountMinor: 15_000_00 }, // $15,000
  { externalOrderId: "demo_qa_sale_2", amountMinor: 8_500_00 },  //  $8,500
  { externalOrderId: "demo_qa_sale_3", amountMinor: 4_200_00 },  //  $4,200
  { externalOrderId: "demo_qa_sale_4", amountMinor: 2_800_00 },  //  $2,800
];

const prisma = new PrismaClient();

async function main() {
  // Guard: tenant_demo must exist. bootstrap-admin or the full seed creates it.
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.error(
      `[seed-sales-payouts] tenant ${TENANT_ID} not found. Run \`npm run db:bootstrap-admin\` or \`npm run db:seed\` first.`,
    );
    process.exit(1);
  }

  // Idempotency sentinel — if the first sale already exists, exit clean.
  const existing = await prisma.sale.findUnique({
    where: {
      tenantId_externalOrderId: {
        tenantId: TENANT_ID,
        externalOrderId: SENTINEL_ORDER_ID,
      },
    },
  });
  if (existing) {
    console.log(
      `[seed-sales-payouts] sentinel sale ${SENTINEL_ORDER_ID} already present — skipping.`,
    );
    return;
  }

  await prisma.campaign.upsert({
    where: { id: CAMPAIGN_ID },
    update: {},
    create: {
      id: CAMPAIGN_ID,
      tenantId: TENANT_ID,
      slug: CAMPAIGN_SLUG,
      name: "Demo Campaign",
      commissionRateBps: CAMPAIGN_COMMISSION_BPS,
    },
  });

  // CampaignAffiliate rows don't have a unique (tenantId, campaignId,
  // affiliateId) key, but (tenantId, referralCode) IS unique. Use that.
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

  const createdSaleIds: string[] = [];
  for (const spec of SALE_AMOUNTS) {
    const sale = await prisma.sale.create({
      data: {
        tenantId: TENANT_ID,
        campaignId: CAMPAIGN_ID,
        externalOrderId: spec.externalOrderId,
        amountMinor: spec.amountMinor,
        currency: "USD",
        referralCode: REFERRAL_CODE,
        status: "approved",
      },
    });
    createdSaleIds.push(sale.id);

    await prisma.attributionClaim.create({
      data: {
        tenantId: TENANT_ID,
        saleId: sale.id,
        affiliateId: AFFILIATE_ID,
        method: "referral_code",
      },
    });
  }

  // Create one pending Payout bundling the first two sales' commissions;
  // leave the remaining two ledger entries with payoutId=null so the admin
  // UI has work for the "New Payout" / "Mark Paid" flows.
  const payout = await prisma.payout.create({
    data: {
      tenantId: TENANT_ID,
      affiliateId: AFFILIATE_ID,
      amountMinor:
        Math.round((SALE_AMOUNTS[0].amountMinor * CAMPAIGN_COMMISSION_BPS) / 10_000) +
        Math.round((SALE_AMOUNTS[1].amountMinor * CAMPAIGN_COMMISSION_BPS) / 10_000),
      currency: "USD",
      status: "pending",
    },
  });

  for (const [index, saleId] of createdSaleIds.entries()) {
    const spec = SALE_AMOUNTS[index];
    await prisma.commissionLedgerEntry.create({
      data: {
        tenantId: TENANT_ID,
        saleId,
        affiliateId: AFFILIATE_ID,
        amountMinor: Math.round((spec.amountMinor * CAMPAIGN_COMMISSION_BPS) / 10_000),
        currency: "USD",
        type: "earned",
        payoutId: index < 2 ? payout.id : null,
      },
    });
  }

  console.log(
    `[seed-sales-payouts] created ${SALE_AMOUNTS.length} sales, 1 pending payout (id=${payout.id}), 2 unpaid commission entries for affiliate ${AFFILIATE_ID}.`,
  );
}

main()
  .catch((err) => {
    console.error("[seed-sales-payouts] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
