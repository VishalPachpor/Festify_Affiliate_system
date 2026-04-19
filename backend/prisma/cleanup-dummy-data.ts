import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Removes only the demo/seed affiliates and their sales/commissions while
 * preserving real user-created data (actual signups, real sales, admin user,
 * tenant, campaign, milestones, marketing assets).
 *
 * Run with:  ts-node prisma/cleanup-dummy-data.ts
 */

const TENANT_ID = "tenant_demo";

const DUMMY_AFFILIATE_IDS = [
  "affiliate_alex",
  "affiliate_sarah",
  "affiliate_marcus",
  "affiliate_priya",
  "affiliate_james",
];

const DUMMY_EMAILS = [
  "alex@festify.io",
  "sarah@festify.io",
  "marcus@festify.io",
  "priya@festify.io",
  "james@festify.io",
];

async function main() {
  console.log("[cleanup-dummy] Starting...\n");

  // 1. Sales seeded by the demo — drop them and their dependents.
  const demoSales = await prisma.sale.findMany({
    where: {
      tenantId: TENANT_ID,
      externalOrderId: { startsWith: "sale_demo_" },
    },
    select: { id: true },
  });
  const demoSaleIds = demoSales.map((s) => s.id);

  const attr = await prisma.attributionClaim.deleteMany({
    where: { tenantId: TENANT_ID, saleId: { in: demoSaleIds } },
  });
  console.log(`  AttributionClaim (demo sales): ${attr.count}`);

  const ledgerBySale = await prisma.commissionLedgerEntry.deleteMany({
    where: { tenantId: TENANT_ID, saleId: { in: demoSaleIds } },
  });
  console.log(`  CommissionLedgerEntry (demo sales): ${ledgerBySale.count}`);

  const salesDel = await prisma.sale.deleteMany({
    where: { tenantId: TENANT_ID, id: { in: demoSaleIds } },
  });
  console.log(`  Sale (demo): ${salesDel.count}`);

  // 2. Anything still tied to the dummy affiliate IDs (belt-and-suspenders).
  const ledgerByAff = await prisma.commissionLedgerEntry.deleteMany({
    where: { tenantId: TENANT_ID, affiliateId: { in: DUMMY_AFFILIATE_IDS } },
  });
  console.log(`  CommissionLedgerEntry (dummy affs): ${ledgerByAff.count}`);

  const payouts = await prisma.payout.deleteMany({
    where: { tenantId: TENANT_ID, affiliateId: { in: DUMMY_AFFILIATE_IDS } },
  });
  console.log(`  Payout (dummy affs): ${payouts.count}`);

  const progress = await prisma.affiliateMilestoneProgress.deleteMany({
    where: { tenantId: TENANT_ID, affiliateId: { in: DUMMY_AFFILIATE_IDS } },
  });
  console.log(`  AffiliateMilestoneProgress: ${progress.count}`);

  const campAff = await prisma.campaignAffiliate.deleteMany({
    where: { tenantId: TENANT_ID, affiliateId: { in: DUMMY_AFFILIATE_IDS } },
  });
  console.log(`  CampaignAffiliate: ${campAff.count}`);

  const users = await prisma.user.deleteMany({
    where: { tenantId: TENANT_ID, email: { in: DUMMY_EMAILS } },
  });
  console.log(`  User (dummy accounts): ${users.count}`);

  // 3. Recompute DashboardStats from what's left so the admin dashboard
  //    reflects real numbers immediately (fast path reads this table).
  const [revenueAgg, salesCount, commissionAgg, attributionCount, affCount, paidOutAgg] =
    await Promise.all([
      prisma.sale.aggregate({ where: { tenantId: TENANT_ID }, _sum: { amountMinor: true } }),
      prisma.sale.count({ where: { tenantId: TENANT_ID } }),
      prisma.commissionLedgerEntry.aggregate({
        where: { tenantId: TENANT_ID, type: "earned" },
        _sum: { amountMinor: true },
      }),
      prisma.attributionClaim.count({ where: { tenantId: TENANT_ID } }),
      prisma.campaignAffiliate.count({ where: { tenantId: TENANT_ID } }),
      prisma.payout.aggregate({
        where: { tenantId: TENANT_ID, status: "paid" },
        _sum: { amountMinor: true },
      }),
    ]);

  await prisma.dashboardStats.upsert({
    where: { tenantId: TENANT_ID },
    update: {
      totalRevenue: revenueAgg._sum.amountMinor ?? 0,
      totalSales: salesCount,
      totalCommission: commissionAgg._sum.amountMinor ?? 0,
      attributedSales: attributionCount,
      totalAffiliates: affCount,
      totalPaidOut: paidOutAgg._sum.amountMinor ?? 0,
    },
    create: {
      tenantId: TENANT_ID,
      totalRevenue: revenueAgg._sum.amountMinor ?? 0,
      totalSales: salesCount,
      totalCommission: commissionAgg._sum.amountMinor ?? 0,
      attributedSales: attributionCount,
      totalAffiliates: affCount,
      totalPaidOut: paidOutAgg._sum.amountMinor ?? 0,
      currency: "USD",
    },
  });

  await prisma.salesStats.upsert({
    where: { tenantId: TENANT_ID },
    update: {
      totalSales: salesCount,
      totalRevenue: revenueAgg._sum.amountMinor ?? 0,
      totalCommission: commissionAgg._sum.amountMinor ?? 0,
    },
    create: {
      tenantId: TENANT_ID,
      totalSales: salesCount,
      totalRevenue: revenueAgg._sum.amountMinor ?? 0,
      totalCommission: commissionAgg._sum.amountMinor ?? 0,
    },
  });

  console.log(`\n[cleanup-dummy] Recomputed stats:`);
  console.log(`    totalSales=${salesCount}`);
  console.log(`    totalRevenue=${revenueAgg._sum.amountMinor ?? 0}`);
  console.log(`    totalCommission=${commissionAgg._sum.amountMinor ?? 0}`);
  console.log(`    totalAffiliates=${affCount}`);
  console.log(`    paidOut=${paidOutAgg._sum.amountMinor ?? 0}`);
  console.log(`\n[cleanup-dummy] Done.`);
}

main()
  .catch((err) => {
    console.error("[cleanup-dummy] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
