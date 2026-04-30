import { PrismaClient } from "@prisma/client";

// Diagnostic: prints the full attribution-and-commission picture for one
// affiliate by referral code. Used when an affiliate dashboard shows
// numbers that don't match the live Sale data — confirms whether the
// problem is at the DB layer (no AttributionClaim) or further upstream.
//
// Run:
//   DATABASE_URL='<neon url>' npx ts-node prisma/inspect-affiliate-by-code.ts <CODE>

const prisma = new PrismaClient();

async function main() {
  const code = (process.argv[2] ?? "").trim().toUpperCase();
  if (!code) {
    console.error("Usage: inspect-affiliate-by-code.ts <REFERRAL_CODE>");
    process.exit(2);
  }

  const ca = await prisma.campaignAffiliate.findFirst({
    where: { referralCode: code },
    select: { id: true, tenantId: true, affiliateId: true, campaignId: true, codeStatus: true, createdAt: true },
  });
  if (!ca) {
    console.error(`No CampaignAffiliate with code=${code}`);
    process.exit(1);
  }

  console.log(`\n=== CampaignAffiliate ===`);
  console.log(`  tenantId:    ${ca.tenantId}`);
  console.log(`  affiliateId: ${ca.affiliateId}`);
  console.log(`  campaignId:  ${ca.campaignId}`);
  console.log(`  codeStatus:  ${ca.codeStatus}`);

  const [user, application] = await Promise.all([
    prisma.user.findFirst({
      where: { tenantId: ca.tenantId, affiliateId: ca.affiliateId },
      select: { id: true, fullName: true, email: true, role: true },
    }),
    prisma.application.findFirst({
      where: { tenantId: ca.tenantId, affiliateId: ca.affiliateId, status: "approved" },
      select: { id: true, firstName: true, email: true, status: true },
    }),
  ]);
  console.log(`\n=== User row ===`);
  console.log(user ? `  id=${user.id} ${user.fullName} <${user.email}> role=${user.role}` : "  <not found>");
  console.log(`\n=== Application row ===`);
  console.log(application ? `  id=${application.id} ${application.firstName} <${application.email}>` : "  <not found>");

  const claims = await prisma.attributionClaim.findMany({
    where: { tenantId: ca.tenantId, affiliateId: ca.affiliateId },
    include: { sale: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\n=== AttributionClaim rows: ${claims.length} ===`);
  for (const c of claims) {
    console.log(
      `  claim=${c.id} sale=${c.sale.id} amountMinor=${c.sale.amountMinor} status=${c.sale.status} externalOrderId=${c.sale.externalOrderId} createdAt=${c.createdAt.toISOString()}`,
    );
  }

  const liveAgg = await prisma.sale.aggregate({
    where: {
      tenantId: ca.tenantId,
      attributionClaim: { affiliateId: ca.affiliateId },
      status: { not: "refunded" },
    },
    _sum: { amountMinor: true },
  });
  console.log(`\n=== Live attributed-revenue aggregate (excl refunded) ===`);
  console.log(`  sumAmountMinor: ${liveAgg._sum.amountMinor ?? 0} ($${((liveAgg._sum.amountMinor ?? 0) / 100).toFixed(2)})`);

  const ledger = await prisma.commissionLedgerEntry.findMany({
    where: { tenantId: ca.tenantId, affiliateId: ca.affiliateId },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, amountMinor: true, payoutId: true, createdAt: true, saleId: true },
  });
  console.log(`\n=== CommissionLedgerEntry rows: ${ledger.length} ===`);
  for (const e of ledger) {
    console.log(
      `  entry=${e.id} type=${e.type} amountMinor=${e.amountMinor} payoutId=${e.payoutId ?? "<null>"} sale=${e.saleId} createdAt=${e.createdAt.toISOString()}`,
    );
  }

  const milestoneProgress = await prisma.affiliateMilestoneProgress.findMany({
    where: { tenantId: ca.tenantId, affiliateId: ca.affiliateId },
    include: { milestone: { select: { key: true, name: true, targetMinor: true } } },
    orderBy: { milestone: { sortOrder: "asc" } },
  });
  console.log(`\n=== AffiliateMilestoneProgress rows: ${milestoneProgress.length} ===`);
  for (const p of milestoneProgress) {
    console.log(
      `  ${p.milestone.key} (target=${p.milestone.targetMinor}) currentMinor=${p.currentMinor} unlockedAt=${p.unlockedAt?.toISOString() ?? "<null>"}`,
    );
  }
  if (milestoneProgress.length === 0) {
    console.log("  (no rows — event-worker may not be processing milestone.progressed events)");
  }

  const dashboardStats = await prisma.dashboardStats.findUnique({ where: { tenantId: ca.tenantId } });
  console.log(`\n=== DashboardStats (tenant-wide cache) ===`);
  console.log(dashboardStats ?? "  <no row — never been emitted>");
}

main()
  .catch((err) => {
    console.error("[inspect-affiliate] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
