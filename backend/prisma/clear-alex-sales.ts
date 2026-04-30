import { PrismaClient, Prisma } from "@prisma/client";

// One-shot cleanup: remove ALL sales attributed to Alex Demo
// (tenantId=tenant_demo, affiliateId=aff_alex_demo), including the
// $4.50 Luma-attributed ticket purchases that the QA-only
// `clear-demo-sales.ts` script intentionally preserves.
//
// What gets deleted:
//   - Every Sale linked via AttributionClaim.affiliateId = aff_alex_demo
//   - Their AttributionClaim rows
//   - Their CommissionLedgerEntry rows
//   - Any Payout exclusively backed by those commission entries
//   - PayoutIdempotencyKey rows for those payouts
// What gets reset (rows kept, counters zeroed so the dashboard tier list
// continues to render):
//   - AffiliateMilestoneProgress.currentMinor → 0, unlockedAt → null
//
// Defaults to DRY-RUN. Pass --apply to mutate.
//
// Run:
//   DATABASE_URL='<neon>' npx ts-node prisma/clear-alex-sales.ts
//   DATABASE_URL='<neon>' npx ts-node prisma/clear-alex-sales.ts --apply

const TENANT_ID = "tenant_demo";
const AFFILIATE_ID = "aff_alex_demo";

const APPLY = process.argv.includes("--apply");

const prisma = new PrismaClient();

async function main() {
  console.log(
    `[clear-alex-sales] mode=${APPLY ? "APPLY" : "DRY-RUN"}  tenant=${TENANT_ID} affiliate=${AFFILIATE_ID}`,
  );

  const claims = await prisma.attributionClaim.findMany({
    where: { tenantId: TENANT_ID, affiliateId: AFFILIATE_ID },
    select: { id: true, saleId: true },
  });

  if (claims.length === 0) {
    console.log("[clear-alex-sales] no attribution claims for Alex — nothing to do.");
    return;
  }

  const saleIds = claims.map((c) => c.saleId);

  const sales = await prisma.sale.findMany({
    where: { id: { in: saleIds } },
    select: {
      id: true,
      externalOrderId: true,
      amountMinor: true,
      currency: true,
      referralCode: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const ledger = await prisma.commissionLedgerEntry.findMany({
    where: { tenantId: TENANT_ID, affiliateId: AFFILIATE_ID, saleId: { in: saleIds } },
    select: { id: true, saleId: true, payoutId: true, amountMinor: true, type: true },
  });

  const ledgerIds = ledger.map((l) => l.id);
  const referencedPayoutIds = Array.from(
    new Set(ledger.map((l) => l.payoutId).filter((v): v is string => !!v)),
  );

  // Only delete a payout if every commission entry attached to it belongs to
  // Alex. Defensive: a real payout shouldn't mix affiliates, but if it does we
  // unlink Alex's entries instead of deleting the payout.
  const payoutsToDelete: string[] = [];
  for (const pid of referencedPayoutIds) {
    const all = await prisma.commissionLedgerEntry.findMany({
      where: { payoutId: pid },
      select: { id: true },
    });
    const otherEntries = all.filter((e) => !ledgerIds.includes(e.id));
    if (otherEntries.length === 0) {
      payoutsToDelete.push(pid);
    } else {
      console.warn(
        `[clear-alex-sales] payout ${pid} has ${otherEntries.length} commission entries from other affiliates — leaving payout intact, only Alex's entries will be deleted.`,
      );
    }
  }

  const idemKeys = payoutsToDelete.length > 0
    ? await prisma.payoutIdempotencyKey.findMany({
        where: { payoutId: { in: payoutsToDelete } },
        select: { id: true, payoutId: true, key: true },
      })
    : [];

  const milestoneProgress = await prisma.affiliateMilestoneProgress.findMany({
    where: { tenantId: TENANT_ID, affiliateId: AFFILIATE_ID },
    select: { id: true, milestoneId: true, currentMinor: true, unlockedAt: true },
  });
  const milestoneToReset = milestoneProgress.filter(
    (p) => p.currentMinor !== 0 || p.unlockedAt !== null,
  );

  const totalAmount = sales.reduce((a, s) => a + s.amountMinor, 0);
  const totalLedger = ledger.reduce((a, l) => a + l.amountMinor, 0);

  console.log(`\n[clear-alex-sales] inventory:`);
  console.log(`  sales:                 ${sales.length}  (sum=$${(totalAmount / 100).toFixed(2)})`);
  for (const s of sales) {
    console.log(
      `    ${s.externalOrderId}  $${(s.amountMinor / 100).toFixed(2)} ${s.currency}  code=${s.referralCode}  status=${s.status}  ${s.createdAt.toISOString()}`,
    );
  }
  console.log(`  attribution claims:    ${claims.length}`);
  console.log(`  ledger entries:        ${ledger.length}  (sum=$${(totalLedger / 100).toFixed(2)})`);
  console.log(`  payouts to delete:     ${payoutsToDelete.length}  ${payoutsToDelete.join(", ")}`);
  console.log(`  payout idempotency:    ${idemKeys.length}`);
  console.log(`  milestone rows to reset: ${milestoneToReset.length} of ${milestoneProgress.length}`);
  for (const p of milestoneToReset) {
    console.log(
      `    milestone=${p.milestoneId} currentMinor=${p.currentMinor} unlockedAt=${p.unlockedAt?.toISOString() ?? "<null>"}`,
    );
  }

  if (!APPLY) {
    console.log(`\n[clear-alex-sales] DRY-RUN complete. Pass --apply to execute.`);
    return;
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (idemKeys.length > 0) {
      const r = await tx.payoutIdempotencyKey.deleteMany({
        where: { id: { in: idemKeys.map((k) => k.id) } },
      });
      console.log(`[apply] deleted ${r.count} payout idempotency keys`);
    }

    if (ledger.length > 0) {
      const r = await tx.commissionLedgerEntry.deleteMany({
        where: { id: { in: ledgerIds } },
      });
      console.log(`[apply] deleted ${r.count} commission ledger entries`);
    }

    if (payoutsToDelete.length > 0) {
      const r = await tx.payout.deleteMany({
        where: { id: { in: payoutsToDelete } },
      });
      console.log(`[apply] deleted ${r.count} payouts`);
    }

    if (claims.length > 0) {
      const r = await tx.attributionClaim.deleteMany({
        where: { id: { in: claims.map((c) => c.id) } },
      });
      console.log(`[apply] deleted ${r.count} attribution claims`);
    }

    const r = await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
    console.log(`[apply] deleted ${r.count} sales`);

    if (milestoneToReset.length > 0) {
      const r2 = await tx.affiliateMilestoneProgress.updateMany({
        where: { id: { in: milestoneToReset.map((p) => p.id) } },
        data: { currentMinor: 0, unlockedAt: null },
      });
      console.log(`[apply] reset ${r2.count} milestone progress rows`);
    }
  });

  console.log(`\n[clear-alex-sales] APPLY complete.`);
  console.log(
    `[clear-alex-sales] note: tenant-wide caches (DashboardStats / SalesStats / AttributionStats) are not touched here — the event-worker rebuilds them when the next sale event arrives. If the dashboard still shows Alex's old totals, force a refresh by emitting any sale event or restart the worker.`,
  );
}

main()
  .catch((err) => {
    console.error("[clear-alex-sales] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
