import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cleanup script — removes all transaction/sales data left over from
 * end-to-end testing while preserving structural data (users, tenants,
 * campaigns, affiliates, milestones, applications).
 *
 * Run with:  npx tsx prisma/cleanup-test-data.ts
 */

async function main() {
  console.log("[cleanup] Starting test data cleanup...\n");

  // Delete in dependency order (children before parents)

  const payoutKeys = await prisma.payoutIdempotencyKey.deleteMany({});
  console.log(`  PayoutIdempotencyKey:    ${payoutKeys.count} deleted`);

  const processedEvents = await prisma.processedEvent.deleteMany({});
  console.log(`  ProcessedEvent:          ${processedEvents.count} deleted`);

  const commissions = await prisma.commissionLedgerEntry.deleteMany({});
  console.log(`  CommissionLedgerEntry:   ${commissions.count} deleted`);

  const payouts = await prisma.payout.deleteMany({});
  console.log(`  Payout:                  ${payouts.count} deleted`);

  const attributions = await prisma.attributionClaim.deleteMany({});
  console.log(`  AttributionClaim:        ${attributions.count} deleted`);

  const sales = await prisma.sale.deleteMany({});
  console.log(`  Sale:                    ${sales.count} deleted`);

  // Reset aggregate/stats tables to zero
  const dashStats = await prisma.dashboardStats.updateMany({
    data: {
      totalRevenue: 0,
      totalSales: 0,
      totalCommission: 0,
      attributedSales: 0,
      totalPaidOut: 0,
    },
  });
  console.log(`  DashboardStats:          ${dashStats.count} reset to zero`);

  const salesStats = await prisma.salesStats.updateMany({
    data: {
      totalSales: 0,
      totalRevenue: 0,
      confirmedCount: 0,
      pendingCount: 0,
      totalCommission: 0,
    },
  });
  console.log(`  SalesStats:              ${salesStats.count} reset to zero`);

  console.log("\n[cleanup] Done. Dashboard should now show zeroes.");
}

main()
  .catch((err) => {
    console.error("[cleanup] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
