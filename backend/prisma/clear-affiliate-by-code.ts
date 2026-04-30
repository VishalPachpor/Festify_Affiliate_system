import { PrismaClient } from "@prisma/client";
import { previewAffiliatePurge, purgeAffiliateData } from "./_purge-affiliate";

// Generic version of clear-alex-sales.ts: takes a referral code, finds the
// CampaignAffiliate it belongs to, and purges the affiliate's full
// transactional footprint. Handles orphan payouts and milestone unlocks
// left behind by older cleanups (e.g. Domminance's $0.11 ghost payout +
// 1/4 unlocked from before the integrity guard was in place).
//
// Defaults to DRY-RUN. Pass --apply to mutate.
//
// Run:
//   DATABASE_URL='<neon>' npx ts-node prisma/clear-affiliate-by-code.ts VISHAL2026
//   DATABASE_URL='<neon>' npx ts-node prisma/clear-affiliate-by-code.ts VISHAL2026 --apply

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const APPLY = process.argv.includes("--apply");
const code = (args[0] ?? "").trim().toUpperCase();

if (!code) {
  console.error("Usage: clear-affiliate-by-code.ts <REFERRAL_CODE> [--apply]");
  process.exit(2);
}

const prisma = new PrismaClient();

async function main() {
  console.log(`[clear-affiliate-by-code] mode=${APPLY ? "APPLY" : "DRY-RUN"}  code=${code}`);

  const ca = await prisma.campaignAffiliate.findFirst({
    where: { referralCode: code },
    select: { id: true, tenantId: true, affiliateId: true },
  });
  if (!ca) {
    console.error(`[clear-affiliate-by-code] no CampaignAffiliate with referralCode=${code}`);
    process.exit(1);
  }

  const { tenantId, affiliateId } = ca;
  console.log(`  tenantId=${tenantId}  affiliateId=${affiliateId}`);

  // Preview pass — read-only, runs even in apply mode so the log captures
  // exactly what the destructive call is about to do.
  const preview = await prisma.$transaction(async (tx) =>
    previewAffiliatePurge(tx, { tenantId, affiliateId }),
  );

  const totalSaleAmount = preview.sales.reduce((a, s) => a + s.amountMinor, 0);
  const totalLedger = preview.ledgerEntries.reduce((a, l) => a + l.amountMinor, 0);

  console.log(`\n[clear-affiliate-by-code] inventory:`);
  console.log(`  sales:                 ${preview.sales.length}  (sum=$${(totalSaleAmount / 100).toFixed(2)})`);
  for (const s of preview.sales) {
    console.log(
      `    ${s.externalOrderId}  $${(s.amountMinor / 100).toFixed(2)} ${s.currency}  code=${s.referralCode}  status=${s.status}  ${s.createdAt.toISOString()}`,
    );
  }
  console.log(`  attribution claims:    ${preview.attributionClaimCount}`);
  console.log(`  ledger entries:        ${preview.ledgerEntries.length}  (sum=$${(totalLedger / 100).toFixed(2)})`);
  console.log(`  payouts to delete:     ${preview.payoutsToDelete.length}  ${preview.payoutsToDelete.join(", ")}`);
  if (preview.payoutsLeftIntact.length > 0) {
    console.log(`  payouts left intact:   ${preview.payoutsLeftIntact.length}  (mixed-affiliate, only this affiliate's entries cleared)  ${preview.payoutsLeftIntact.join(", ")}`);
  }
  console.log(`  payout idempotency:    ${preview.payoutIdempotencyKeys}`);
  console.log(`  milestone rows to reset: ${preview.milestoneRowsToReset} of ${preview.milestoneProgress.length}`);
  for (const p of preview.milestoneProgress.filter((m) => m.currentMinor !== 0 || m.unlockedAt !== null)) {
    console.log(
      `    milestone=${p.milestoneId} currentMinor=${p.currentMinor} unlockedAt=${p.unlockedAt?.toISOString() ?? "<null>"}`,
    );
  }

  const nothingToDo =
    preview.sales.length === 0 &&
    preview.ledgerEntries.length === 0 &&
    preview.payoutsToDelete.length === 0 &&
    preview.milestoneRowsToReset === 0;

  if (nothingToDo) {
    console.log(`\n[clear-affiliate-by-code] nothing to clean for code=${code} — exiting.`);
    return;
  }

  if (!APPLY) {
    console.log(`\n[clear-affiliate-by-code] DRY-RUN complete. Pass --apply to execute.`);
    return;
  }

  const result = await prisma.$transaction(async (tx) =>
    purgeAffiliateData(tx, { tenantId, affiliateId }),
  );

  console.log(`\n[apply] payoutIdempotencyKeys deleted:    ${result.payoutIdempotencyKeysDeleted}`);
  console.log(`[apply] commissionLedgerEntries deleted:  ${result.commissionLedgerEntriesDeleted}`);
  console.log(`[apply] payouts deleted:                  ${result.payoutsDeleted}`);
  if (result.payoutsLeftIntact.length > 0) {
    console.log(`[apply] payouts left intact:              ${result.payoutsLeftIntact.length}  ${result.payoutsLeftIntact.join(", ")}`);
  }
  console.log(`[apply] attributionClaims deleted:        ${result.attributionClaimsDeleted}`);
  console.log(`[apply] sales deleted:                    ${result.salesDeleted}`);
  console.log(`[apply] milestoneProgress reset:          ${result.milestoneProgressReset}`);

  console.log(`\n[clear-affiliate-by-code] APPLY complete.`);
  console.log(
    `[clear-affiliate-by-code] note: tenant-wide caches (DashboardStats / SalesStats / AttributionStats) are not touched here — the worker rebuilds them when the next sale event arrives.`,
  );
}

main()
  .catch((err) => {
    console.error("[clear-affiliate-by-code] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
