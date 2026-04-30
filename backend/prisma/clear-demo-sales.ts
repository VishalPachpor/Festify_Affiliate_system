import { PrismaClient, Prisma } from "@prisma/client";

// One-shot cleanup: remove the QA seed sales/payouts dataset created by
// `prisma/seed-sales-payouts.ts` from tenant_demo, while preserving any
// real Luma-attributed sales (e.g. the $4.50 ticket purchases used to
// validate the production attribution pipeline).
//
// What gets deleted (only on tenant_demo):
//   - Sale rows with externalOrderId in demo_qa_sale_1..4
//   - Their AttributionClaim, CommissionLedgerEntry rows
//   - Any Payout exclusively backed by those commission entries
//   - PayoutIdempotencyKey rows for those payouts
//
// Defaults to DRY-RUN. Pass --apply to mutate.
//
// Run:
//   DATABASE_URL='<neon>' npx ts-node prisma/clear-demo-sales.ts
//   DATABASE_URL='<neon>' npx ts-node prisma/clear-demo-sales.ts --apply

const TENANT_ID = "tenant_demo";
const DUMMY_ORDER_IDS = [
  "demo_qa_sale_1",
  "demo_qa_sale_2",
  "demo_qa_sale_3",
  "demo_qa_sale_4",
];

const APPLY = process.argv.includes("--apply");

const prisma = new PrismaClient();

async function main() {
  console.log(`[clear-demo-sales] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  const dummySales = await prisma.sale.findMany({
    where: { tenantId: TENANT_ID, externalOrderId: { in: DUMMY_ORDER_IDS } },
    select: { id: true, externalOrderId: true, amountMinor: true, currency: true, referralCode: true, createdAt: true },
  });

  if (dummySales.length === 0) {
    console.log("[clear-demo-sales] no dummy sales found — nothing to do.");
    return;
  }

  const saleIds = dummySales.map((s) => s.id);

  const claims = await prisma.attributionClaim.findMany({
    where: { saleId: { in: saleIds } },
    select: { id: true, saleId: true, affiliateId: true },
  });

  const ledger = await prisma.commissionLedgerEntry.findMany({
    where: { saleId: { in: saleIds } },
    select: { id: true, saleId: true, payoutId: true, amountMinor: true },
  });

  const ledgerIds = ledger.map((l) => l.id);
  const referencedPayoutIds = Array.from(new Set(ledger.map((l) => l.payoutId).filter((v): v is string => !!v)));

  // For each referenced payout, check whether ALL its commission entries are
  // in our dummy set. If yes, the payout is purely demo and we can delete it.
  // If a real entry references it (shouldn't happen, but defensive), skip.
  const payoutsToDelete: string[] = [];
  for (const pid of referencedPayoutIds) {
    const all = await prisma.commissionLedgerEntry.findMany({
      where: { payoutId: pid },
      select: { id: true },
    });
    const realEntries = all.filter((e) => !ledgerIds.includes(e.id));
    if (realEntries.length === 0) {
      payoutsToDelete.push(pid);
    } else {
      console.warn(
        `[clear-demo-sales] payout ${pid} also has ${realEntries.length} real commission entries — leaving payout intact, only the dummy entries will be unlinked/deleted.`,
      );
    }
  }

  const idemKeys = payoutsToDelete.length > 0
    ? await prisma.payoutIdempotencyKey.findMany({
        where: { payoutId: { in: payoutsToDelete } },
        select: { id: true, payoutId: true, key: true },
      })
    : [];

  // Affiliates whose sales we're about to delete need their milestone
  // progress reset — otherwise unlockedAt timestamps survive and the
  // dashboard keeps showing "N/M unlocked" against $0 sales.
  const affectedAffiliateIds = Array.from(new Set(claims.map((c) => c.affiliateId)));
  const milestoneToReset = affectedAffiliateIds.length > 0
    ? await prisma.affiliateMilestoneProgress.findMany({
        where: {
          tenantId: TENANT_ID,
          affiliateId: { in: affectedAffiliateIds },
          OR: [{ currentMinor: { not: 0 } }, { unlockedAt: { not: null } }],
        },
        select: { id: true, affiliateId: true, milestoneId: true, currentMinor: true, unlockedAt: true },
      })
    : [];

  console.log(`\n[clear-demo-sales] inventory:`);
  console.log(`  sales:                 ${dummySales.length}`);
  for (const s of dummySales) {
    console.log(`    ${s.externalOrderId}  $${(s.amountMinor / 100).toFixed(2)} ${s.currency}  code=${s.referralCode}`);
  }
  console.log(`  attribution claims:    ${claims.length}`);
  console.log(`  ledger entries:        ${ledger.length}  (sum=$${(ledger.reduce((a, l) => a + l.amountMinor, 0) / 100).toFixed(2)})`);
  console.log(`  payouts to delete:     ${payoutsToDelete.length}  ${payoutsToDelete.join(", ")}`);
  console.log(`  payout idempotency:    ${idemKeys.length}`);
  console.log(`  milestone rows to reset: ${milestoneToReset.length} (affiliates affected: ${affectedAffiliateIds.length})`);
  for (const p of milestoneToReset) {
    console.log(
      `    affiliate=${p.affiliateId} milestone=${p.milestoneId} currentMinor=${p.currentMinor} unlockedAt=${p.unlockedAt?.toISOString() ?? "<null>"}`,
    );
  }

  if (!APPLY) {
    console.log(`\n[clear-demo-sales] DRY-RUN complete. Pass --apply to execute.`);
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

    const r = await tx.sale.deleteMany({
      where: { id: { in: saleIds } },
    });
    console.log(`[apply] deleted ${r.count} sales`);

    if (milestoneToReset.length > 0) {
      const r2 = await tx.affiliateMilestoneProgress.updateMany({
        where: { id: { in: milestoneToReset.map((p) => p.id) } },
        data: { currentMinor: 0, unlockedAt: null },
      });
      console.log(`[apply] reset ${r2.count} milestone progress rows`);
    }
  });

  console.log(`\n[clear-demo-sales] APPLY complete.`);
}

main()
  .catch((err) => {
    console.error("[clear-demo-sales] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
