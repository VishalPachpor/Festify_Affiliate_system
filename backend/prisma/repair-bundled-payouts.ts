import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

/**
 * One-shot repair for the bundled-payout incident.
 *
 * Targets three known-bad payouts:
 *   cmnzxgjcr — bundled $0.90 covering multiple sales (violates 1-sale→1-payout)
 *   cmo2ub6ke — orphan $0.45 with no linked ledger entry
 *   cmo686ztf — orphan $0.45 with no linked ledger entry
 *
 * Does:
 *   1. Snapshot current state of the three payouts + their ledger links (stdout
 *      JSON for rollback reference — pipe to a file if you want to keep it).
 *   2. In a single transaction:
 *        - UPDATE CommissionLedgerEntry SET payoutId = NULL for those three ids
 *        - DELETE PayoutIdempotencyKey rows referencing those payouts (FK-less
 *          pointer, would otherwise dangle and block idempotency-key reuse)
 *        - DELETE Payout rows
 *      Sale.status is intentionally left untouched — the commissions UI is
 *      ledger-driven (payoutId IS NULL → unpaid). Re-approval recreates a
 *      clean pending payout per sale.
 *   3. Recompute DashboardStats.totalPaidOut for any affected tenants (matches
 *      the pattern used by cleanup-dummy-data.ts).
 *
 * Run:         ts-node prisma/repair-bundled-payouts.ts
 * Dry-run:     DRY_RUN=1 ts-node prisma/repair-bundled-payouts.ts
 */

const TARGET_PAYOUT_IDS = ["cmnzxgjcr", "cmo2ub6ke", "cmo686ztf"];
const DRY_RUN = process.env.DRY_RUN === "1";

async function main() {
  console.log(`[repair-bundled-payouts] Starting${DRY_RUN ? " (DRY RUN)" : ""}...\n`);
  console.log(`  Target payouts: ${TARGET_PAYOUT_IDS.join(", ")}\n`);

  // ── 1. Snapshot ────────────────────────────────────────────────────────────
  const payouts = await prisma.payout.findMany({
    where: { id: { in: TARGET_PAYOUT_IDS } },
    include: {
      commissionEntries: {
        select: { id: true, saleId: true, amountMinor: true, type: true },
      },
    },
  });

  const idemptKeys = await prisma.payoutIdempotencyKey.findMany({
    where: { payoutId: { in: TARGET_PAYOUT_IDS } },
    select: { id: true, tenantId: true, key: true, payoutId: true },
  });

  const snapshot = {
    capturedAt: new Date().toISOString(),
    payouts: payouts.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      affiliateId: p.affiliateId,
      amountMinor: p.amountMinor,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      processedAt: p.processedAt?.toISOString() ?? null,
      linkedLedgerEntries: p.commissionEntries,
    })),
    idempotencyKeys: idemptKeys,
  };

  // Persist snapshot to disk so rollback isn't dependent on a clean terminal
  // scrollback. Same file is written in dry-run and real-run modes.
  const snapshotDir = join(__dirname, "snapshots");
  mkdirSync(snapshotDir, { recursive: true });
  const snapshotPath = join(
    snapshotDir,
    `repair-bundled-payouts-${snapshot.capturedAt.replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`  Snapshot written to: ${snapshotPath}\n`);

  console.log("─── SNAPSHOT (also saved to file above) ───────────────────────────");
  console.log(JSON.stringify(snapshot, null, 2));
  console.log("───────────────────────────────────────────────────────────────────\n");

  const foundIds = new Set(payouts.map((p) => p.id));
  const missing = TARGET_PAYOUT_IDS.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    console.warn(`  WARNING: ${missing.length} target payout(s) not found: ${missing.join(", ")}`);
    console.warn("  Proceeding with the ones that do exist.\n");
  }
  if (foundIds.size === 0) {
    console.log("[repair-bundled-payouts] Nothing to do. Exiting.");
    return;
  }

  // Sanity check: refuse to run if any target payout is already paid. The
  // incident spec says all three are pending; if one is paid, totalPaidOut
  // would shift on delete and we want a human to look at it first.
  const paid = payouts.filter((p) => p.status === "paid");
  if (paid.length > 0) {
    throw new Error(
      `Refusing to delete payouts with status=paid: ${paid.map((p) => p.id).join(", ")}. ` +
        `Investigate manually before re-running.`,
    );
  }

  const tenantIds = Array.from(new Set(payouts.map((p) => p.tenantId)));

  // ── 2. Mutate (transactional) ──────────────────────────────────────────────
  if (DRY_RUN) {
    console.log("[repair-bundled-payouts] DRY_RUN=1 — skipping mutations.\n");
    console.log("  Would UPDATE CommissionLedgerEntry SET payoutId=NULL WHERE payoutId IN (...)");
    console.log("  Would DELETE PayoutIdempotencyKey WHERE payoutId IN (...)");
    console.log("  Would DELETE Payout WHERE id IN (...)");
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const unlinked = await tx.commissionLedgerEntry.updateMany({
      where: { payoutId: { in: Array.from(foundIds) } },
      data: { payoutId: null },
    });

    const idemptDeleted = await tx.payoutIdempotencyKey.deleteMany({
      where: { payoutId: { in: Array.from(foundIds) } },
    });

    const payoutsDeleted = await tx.payout.deleteMany({
      where: { id: { in: Array.from(foundIds) } },
    });

    return { unlinked: unlinked.count, idemptDeleted: idemptDeleted.count, payoutsDeleted: payoutsDeleted.count };
  });

  console.log(`  CommissionLedgerEntry unlinked (payoutId → NULL): ${result.unlinked}`);
  console.log(`  PayoutIdempotencyKey deleted:                     ${result.idemptDeleted}`);
  console.log(`  Payout deleted:                                   ${result.payoutsDeleted}`);

  // ── 3. Recompute DashboardStats.totalPaidOut for affected tenants ──────────
  for (const tenantId of tenantIds) {
    const paidAgg = await prisma.payout.aggregate({
      where: { tenantId, status: "paid" },
      _sum: { amountMinor: true },
    });
    const totalPaidOut = paidAgg._sum.amountMinor ?? 0;
    await prisma.dashboardStats.updateMany({
      where: { tenantId },
      data: { totalPaidOut },
    });
    console.log(`  DashboardStats[${tenantId}].totalPaidOut = ${totalPaidOut}`);
  }

  console.log("\n[repair-bundled-payouts] Done.");
  console.log("  Next step: verify commissions UI shows the unlinked entries as unpaid,");
  console.log("  then apply the guardrail in src/routes/payouts.ts (see follow-up).");
}

main()
  .catch((err) => {
    console.error("[repair-bundled-payouts] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
