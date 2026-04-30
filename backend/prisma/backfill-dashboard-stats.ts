import { PrismaClient } from "@prisma/client";

// Recompute DashboardStats / SalesStats from the source-of-truth tables
// (Sale, AttributionClaim, CommissionLedgerEntry, Payout, CampaignAffiliate)
// for every tenant. Use whenever the cached aggregates drift from reality —
// e.g. after a manual cleanup script, after a worker outage, or whenever
// the admin dashboard tile shows numbers that don't match the underlying
// list views.
//
// The display-side fix (dashboard.ts) now live-counts CampaignAffiliate
// instead of trusting stats.totalAffiliates, so this script is no longer
// required for the affiliate count to render correctly. It's still useful
// for the rest of the cached fields (totalRevenue / totalSales /
// totalCommission / attributedSales / totalPaidOut), which remain on the
// fast path.
//
// Defaults to DRY-RUN. Pass --apply to mutate.
//
// Run:
//   DATABASE_URL='<neon>' npx ts-node prisma/backfill-dashboard-stats.ts
//   DATABASE_URL='<neon>' npx ts-node prisma/backfill-dashboard-stats.ts --apply

const APPLY = process.argv.includes("--apply");

const prisma = new PrismaClient();

async function main() {
  console.log(`[backfill-dashboard-stats] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  if (tenants.length === 0) {
    console.log("[backfill] no tenants found — nothing to do.");
    return;
  }

  for (const { id: tenantId } of tenants) {
    const [
      revenueAgg,
      salesCount,
      commissionAgg,
      attributionCount,
      affiliateCount,
      paidOutAgg,
      existingStats,
    ] = await Promise.all([
      // Refunded sales are excluded — matches the read-side filter on the
      // dashboard so the cache reflects the same numbers the slow path
      // computes.
      prisma.sale.aggregate({
        where: { tenantId, status: { not: "refunded" } },
        _sum: { amountMinor: true },
      }),
      prisma.sale.count({
        where: { tenantId, status: { not: "refunded" } },
      }),
      prisma.commissionLedgerEntry.aggregate({
        where: { tenantId, type: "earned" },
        _sum: { amountMinor: true },
      }),
      prisma.attributionClaim.count({
        where: { tenantId, sale: { status: { not: "refunded" } } },
      }),
      prisma.campaignAffiliate.count({ where: { tenantId } }),
      prisma.payout.aggregate({
        where: { tenantId, status: "paid" },
        _sum: { amountMinor: true },
      }),
      prisma.dashboardStats.findUnique({ where: { tenantId } }),
    ]);

    const fresh = {
      totalRevenue: revenueAgg._sum.amountMinor ?? 0,
      totalSales: salesCount,
      totalCommission: commissionAgg._sum.amountMinor ?? 0,
      attributedSales: attributionCount,
      totalAffiliates: affiliateCount,
      totalPaidOut: paidOutAgg._sum.amountMinor ?? 0,
    };

    const drift: string[] = [];
    if (existingStats) {
      if (existingStats.totalRevenue !== fresh.totalRevenue)
        drift.push(`totalRevenue ${existingStats.totalRevenue} → ${fresh.totalRevenue}`);
      if (existingStats.totalSales !== fresh.totalSales)
        drift.push(`totalSales ${existingStats.totalSales} → ${fresh.totalSales}`);
      if (existingStats.totalCommission !== fresh.totalCommission)
        drift.push(`totalCommission ${existingStats.totalCommission} → ${fresh.totalCommission}`);
      if (existingStats.attributedSales !== fresh.attributedSales)
        drift.push(`attributedSales ${existingStats.attributedSales} → ${fresh.attributedSales}`);
      if (existingStats.totalAffiliates !== fresh.totalAffiliates)
        drift.push(`totalAffiliates ${existingStats.totalAffiliates} → ${fresh.totalAffiliates}`);
      if (existingStats.totalPaidOut !== fresh.totalPaidOut)
        drift.push(`totalPaidOut ${existingStats.totalPaidOut} → ${fresh.totalPaidOut}`);
    } else {
      drift.push("(no DashboardStats row — will be created)");
    }

    if (drift.length === 0) {
      console.log(`[${tenantId}] in sync — no changes.`);
      continue;
    }

    console.log(`[${tenantId}] drift detected:`);
    for (const d of drift) console.log(`    ${d}`);

    if (!APPLY) continue;

    await prisma.dashboardStats.upsert({
      where: { tenantId },
      update: fresh,
      create: { tenantId, ...fresh, currency: "USD" },
    });

    await prisma.salesStats.upsert({
      where: { tenantId },
      update: {
        totalSales: fresh.totalSales,
        totalRevenue: fresh.totalRevenue,
        totalCommission: fresh.totalCommission,
      },
      create: {
        tenantId,
        totalSales: fresh.totalSales,
        totalRevenue: fresh.totalRevenue,
        totalCommission: fresh.totalCommission,
      },
    });

    console.log(`[${tenantId}] APPLIED.`);
  }

  if (!APPLY) {
    console.log(`\n[backfill] DRY-RUN complete. Pass --apply to execute.`);
  } else {
    console.log(`\n[backfill] APPLY complete.`);
  }
}

main()
  .catch((err) => {
    console.error("[backfill-dashboard-stats] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
