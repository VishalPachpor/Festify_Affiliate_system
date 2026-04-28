import { PrismaClient } from "@prisma/client";
import type { Prisma, Milestone } from "@prisma/client";
import { normalizeReferralCode, pickTierRateBps } from "../src/processors/process-inbound-event";

// Retroactive attribution for orphaned Sales.
//
// A Sale becomes orphaned when the inbound webhook arrives with a
// referralCode but no CampaignAffiliate matches at processing time —
// the Sale row is created without an AttributionClaim and without a
// commission ledger entry. Once the matching CampaignAffiliate is
// created (or its referralCode is fixed to match the Luma coupon),
// this script walks every orphaned Sale and runs the post-Sale
// portion of the Golden Flow: AttributionClaim + CommissionLedgerEntry,
// in a single transaction per Sale.
//
// Idempotent — only acts on Sales that lack an AttributionClaim. Re-running
// after a successful pass is a no-op.
//
// Skipped (intentional): retro tier-adjustment back-fill across already-paid
// sales. The processor only emits tier_adjustment when a NEW sale crosses
// a threshold; running that retroactively here would emit deltas against
// settled payouts, which the codebase deliberately avoids. The cleanup
// covers attribution + the per-sale commission only — sufficient for the
// affiliate dashboard to reflect the missing sale.
//
// Run:
//   DATABASE_URL='<neon url>' npm run db:retro-attribute

const prisma = new PrismaClient();

async function main() {
  const orphans = await prisma.sale.findMany({
    where: {
      attributionClaim: null,
      referralCode: { not: null },
    },
    select: {
      id: true,
      tenantId: true,
      campaignId: true,
      amountMinor: true,
      currency: true,
      referralCode: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (orphans.length === 0) {
    console.log("[retro-attribute] no orphaned attributable sales found.");
    return;
  }

  console.log(`[retro-attribute] found ${orphans.length} orphan(s) with a referralCode.`);

  let attributed = 0;
  let skipped = 0;

  for (const sale of orphans) {
    const code = normalizeReferralCode(sale.referralCode);
    if (!code) {
      skipped += 1;
      console.log(`  - sale=${sale.id}: referralCode=${JSON.stringify(sale.referralCode)} normalized to null, skipping`);
      continue;
    }

    const affiliate = await prisma.campaignAffiliate.findUnique({
      where: {
        tenantId_referralCode: { tenantId: sale.tenantId, referralCode: code },
      },
      select: { affiliateId: true },
    });

    if (!affiliate) {
      skipped += 1;
      console.log(`  - sale=${sale.id}: no CampaignAffiliate matches code=${code}, skipping`);
      continue;
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: sale.campaignId },
      select: { commissionRateBps: true },
    });
    if (!campaign) {
      skipped += 1;
      console.log(`  - sale=${sale.id}: campaign ${sale.campaignId} missing, skipping`);
      continue;
    }

    const tiers = await prisma.milestone.findMany({
      where: { tenantId: sale.tenantId },
      orderBy: { targetMinor: "asc" },
    });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Compute commission against the affiliate's CURRENT cumulative
      // attributed revenue (post this orphan's amount), matching the rate
      // a fresh inbound event would have used.
      const priorAgg = await tx.sale.aggregate({
        where: {
          tenantId: sale.tenantId,
          attributionClaim: { affiliateId: affiliate.affiliateId },
          id: { not: sale.id },
        },
        _sum: { amountMinor: true },
      });
      const priorRevenue = priorAgg._sum.amountMinor ?? 0;
      const newRevenue = priorRevenue + sale.amountMinor;
      const rateBps = pickTierRateBps(
        tiers as Pick<Milestone, "targetMinor" | "commissionRateBps">[],
        newRevenue,
        campaign.commissionRateBps,
      );

      await tx.attributionClaim.create({
        data: {
          tenantId: sale.tenantId,
          saleId: sale.id,
          affiliateId: affiliate.affiliateId,
          method: "referral_code",
        },
      });

      const commissionAmount = Math.round((sale.amountMinor * rateBps) / 10_000);
      if (commissionAmount > 0) {
        await tx.commissionLedgerEntry.create({
          data: {
            tenantId: sale.tenantId,
            saleId: sale.id,
            affiliateId: affiliate.affiliateId,
            amountMinor: commissionAmount,
            currency: sale.currency,
            type: "earned",
          },
        });
      }
    });

    attributed += 1;
    console.log(
      `  ✓ sale=${sale.id} amount=$${(sale.amountMinor / 100).toFixed(2)}  → affiliate=${affiliate.affiliateId} (code=${code})`,
    );
  }

  console.log(`[retro-attribute] done — attributed=${attributed} skipped=${skipped}`);
}

main()
  .catch((err) => {
    console.error("[retro-attribute] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
