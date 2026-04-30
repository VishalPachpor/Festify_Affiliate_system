import type { Prisma } from "@prisma/client";

// Shared cleanup helper. Call this from any script or transaction that needs
// to remove an affiliate's transactional footprint (sales/payouts/etc.). It
// exists because the Payout table has no FK to Sale and AffiliateMilestoneProgress
// has no FK to Sale either — so a naive "delete the sales" script leaves
// orphan payouts (still summed into TOTAL PAID) and orphan unlockedAt
// timestamps (still counted into MILESTONES UNLOCKED). That's how Domminance
// ended up showing $0.11 paid out and 1/4 unlocked with zero sales.
//
// What gets deleted (scoped to tenantId + affiliateId):
//   1. PayoutIdempotencyKey rows for affected payouts
//   2. CommissionLedgerEntry rows
//   3. Payout rows that have NO remaining ledger entries from other affiliates
//      (defensive — payouts shouldn't mix affiliates, but if one does we keep
//      the payout row and only clear our entries)
//   4. AttributionClaim rows
//   5. Sale rows reachable via those AttributionClaims
// What gets reset (rows kept, counters zeroed so the dashboard tier list
// continues to render):
//   6. AffiliateMilestoneProgress.currentMinor → 0, unlockedAt → null

export type PurgeAffiliateOptions = {
  tenantId: string;
  affiliateId: string;
};

export type PurgeAffiliateResult = {
  payoutIdempotencyKeysDeleted: number;
  commissionLedgerEntriesDeleted: number;
  payoutsDeleted: number;
  payoutsLeftIntact: string[];
  attributionClaimsDeleted: number;
  salesDeleted: number;
  milestoneProgressReset: number;
};

export async function purgeAffiliateData(
  tx: Prisma.TransactionClient,
  opts: PurgeAffiliateOptions,
): Promise<PurgeAffiliateResult> {
  const { tenantId, affiliateId } = opts;

  const claims = await tx.attributionClaim.findMany({
    where: { tenantId, affiliateId },
    select: { id: true, saleId: true },
  });
  const claimIds = claims.map((c) => c.id);
  const saleIds = claims.map((c) => c.saleId);

  const ledger = await tx.commissionLedgerEntry.findMany({
    where: { tenantId, affiliateId },
    select: { id: true, payoutId: true },
  });
  const ledgerIds = ledger.map((l) => l.id);
  const referencedPayoutIds = Array.from(
    new Set(ledger.map((l) => l.payoutId).filter((v): v is string => !!v)),
  );

  // Always include payouts directly attached to this affiliate, even if no
  // ledger entries currently reference them. This is the orphan-payout case
  // (Domminance's $0.11) — the ledger was already wiped by a prior cleanup
  // but the Payout row was left behind.
  const directPayouts = await tx.payout.findMany({
    where: { tenantId, affiliateId },
    select: { id: true },
  });
  const candidatePayoutIds = Array.from(
    new Set([...referencedPayoutIds, ...directPayouts.map((p) => p.id)]),
  );

  const payoutsToDelete: string[] = [];
  const payoutsLeftIntact: string[] = [];
  for (const pid of candidatePayoutIds) {
    const remaining = await tx.commissionLedgerEntry.findMany({
      where: { payoutId: pid, NOT: { id: { in: ledgerIds } } },
      select: { id: true },
    });
    if (remaining.length === 0) {
      payoutsToDelete.push(pid);
    } else {
      payoutsLeftIntact.push(pid);
    }
  }

  const idemKeys = payoutsToDelete.length > 0
    ? await tx.payoutIdempotencyKey.findMany({
        where: { payoutId: { in: payoutsToDelete } },
        select: { id: true },
      })
    : [];

  const idemRes = idemKeys.length > 0
    ? await tx.payoutIdempotencyKey.deleteMany({
        where: { id: { in: idemKeys.map((k) => k.id) } },
      })
    : { count: 0 };

  const ledgerRes = ledgerIds.length > 0
    ? await tx.commissionLedgerEntry.deleteMany({ where: { id: { in: ledgerIds } } })
    : { count: 0 };

  const payoutRes = payoutsToDelete.length > 0
    ? await tx.payout.deleteMany({ where: { id: { in: payoutsToDelete } } })
    : { count: 0 };

  const claimRes = claimIds.length > 0
    ? await tx.attributionClaim.deleteMany({ where: { id: { in: claimIds } } })
    : { count: 0 };

  const saleRes = saleIds.length > 0
    ? await tx.sale.deleteMany({ where: { id: { in: saleIds } } })
    : { count: 0 };

  const milestoneRes = await tx.affiliateMilestoneProgress.updateMany({
    where: {
      tenantId,
      affiliateId,
      OR: [{ currentMinor: { not: 0 } }, { unlockedAt: { not: null } }],
    },
    data: { currentMinor: 0, unlockedAt: null },
  });

  return {
    payoutIdempotencyKeysDeleted: idemRes.count,
    commissionLedgerEntriesDeleted: ledgerRes.count,
    payoutsDeleted: payoutRes.count,
    payoutsLeftIntact,
    attributionClaimsDeleted: claimRes.count,
    salesDeleted: saleRes.count,
    milestoneProgressReset: milestoneRes.count,
  };
}

export type PreviewAffiliatePurge = {
  sales: Array<{
    id: string;
    externalOrderId: string;
    amountMinor: number;
    currency: string;
    referralCode: string | null;
    status: string;
    createdAt: Date;
  }>;
  attributionClaimCount: number;
  ledgerEntries: Array<{ id: string; type: string; amountMinor: number; payoutId: string | null; saleId: string }>;
  payoutsToDelete: string[];
  payoutsLeftIntact: string[];
  payoutIdempotencyKeys: number;
  milestoneProgress: Array<{ id: string; milestoneId: string; currentMinor: number; unlockedAt: Date | null }>;
  milestoneRowsToReset: number;
};

// Read-only inventory for dry-run output. Mirrors purgeAffiliateData's
// targeting so the apply step deletes exactly what was previewed.
export async function previewAffiliatePurge(
  tx: Prisma.TransactionClient,
  opts: PurgeAffiliateOptions,
): Promise<PreviewAffiliatePurge> {
  const { tenantId, affiliateId } = opts;

  const claims = await tx.attributionClaim.findMany({
    where: { tenantId, affiliateId },
    select: { id: true, saleId: true },
  });
  const saleIds = claims.map((c) => c.saleId);

  const sales = saleIds.length > 0
    ? await tx.sale.findMany({
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
      })
    : [];

  const ledgerEntries = await tx.commissionLedgerEntry.findMany({
    where: { tenantId, affiliateId },
    select: { id: true, type: true, amountMinor: true, payoutId: true, saleId: true },
  });

  const ledgerIds = ledgerEntries.map((l) => l.id);
  const referencedPayoutIds = Array.from(
    new Set(ledgerEntries.map((l) => l.payoutId).filter((v): v is string => !!v)),
  );
  const directPayouts = await tx.payout.findMany({
    where: { tenantId, affiliateId },
    select: { id: true },
  });
  const candidatePayoutIds = Array.from(
    new Set([...referencedPayoutIds, ...directPayouts.map((p) => p.id)]),
  );

  const payoutsToDelete: string[] = [];
  const payoutsLeftIntact: string[] = [];
  for (const pid of candidatePayoutIds) {
    const remaining = await tx.commissionLedgerEntry.findMany({
      where: { payoutId: pid, NOT: { id: { in: ledgerIds } } },
      select: { id: true },
    });
    (remaining.length === 0 ? payoutsToDelete : payoutsLeftIntact).push(pid);
  }

  const payoutIdempotencyKeys = payoutsToDelete.length > 0
    ? await tx.payoutIdempotencyKey.count({
        where: { payoutId: { in: payoutsToDelete } },
      })
    : 0;

  const milestoneProgress = await tx.affiliateMilestoneProgress.findMany({
    where: { tenantId, affiliateId },
    select: { id: true, milestoneId: true, currentMinor: true, unlockedAt: true },
  });
  const milestoneRowsToReset = milestoneProgress.filter(
    (p) => p.currentMinor !== 0 || p.unlockedAt !== null,
  ).length;

  return {
    sales,
    attributionClaimCount: claims.length,
    ledgerEntries,
    payoutsToDelete,
    payoutsLeftIntact,
    payoutIdempotencyKeys,
    milestoneProgress,
    milestoneRowsToReset,
  };
}
