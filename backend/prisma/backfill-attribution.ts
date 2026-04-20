import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeReferralCode } from "../src/processors/process-inbound-event";

const prisma = new PrismaClient();

/**
 * Retroactively create AttributionClaim + CommissionLedgerEntry rows for
 * unattributed sales that have a referralCode matching a CampaignAffiliate
 * once normalized. Repairs the past impact of the case-sensitivity bug in
 * the ingest processor (fixed alongside this script).
 *
 * What it does (per sale, inside one transaction each):
 *   1. Normalize Sale.referralCode via normalizeReferralCode().
 *   2. Look up CampaignAffiliate by (tenantId, normalized code).
 *   3. If found AND no AttributionClaim exists yet:
 *        - create AttributionClaim(method="referral_code")
 *        - create CommissionLedgerEntry(type="earned", amount=amountMinor * campaign.bps / 10_000)
 *   4. If already attributed (race / re-run), skip — idempotent.
 *
 * What it does NOT do:
 *   - Touch Sale.referralCode (keeps raw buyer input for debugging).
 *   - Create Payout rows (approval is a separate admin action).
 *   - Emit events or update DashboardStats / milestones — those are derived
 *     and can be recomputed after (see cleanup-dummy-data.ts for the pattern).
 *
 * Run:
 *   DRY_RUN=1 ts-node prisma/backfill-attribution.ts     # inspect only
 *   ts-node prisma/backfill-attribution.ts               # apply
 *
 * Point at production: set DATABASE_URL to the prod connection string in
 * your shell for this command only — don't commit it to .env.
 */

const DRY_RUN = process.env.DRY_RUN === "1";

type Candidate = {
  saleId: string;
  tenantId: string;
  campaignId: string;
  amountMinor: number;
  currency: string;
  saleReferralCode: string;
  normalizedCode: string;
  matchedAffiliateId: string | null;
  commissionRateBps: number;
  projectedCommissionMinor: number;
  existingAttribution: boolean;
};

async function main() {
  console.log(`[backfill-attribution] Starting${DRY_RUN ? " (DRY RUN)" : ""}...\n`);

  // ── 1. Gather unattributed sales with a referralCode ─────────────────────
  const sales = await prisma.sale.findMany({
    where: {
      referralCode: { not: null },
      attributionClaim: { is: null },
    },
    select: {
      id: true,
      tenantId: true,
      campaignId: true,
      amountMinor: true,
      currency: true,
      referralCode: true,
    },
  });

  if (sales.length === 0) {
    console.log("  No unattributed sales with a referralCode. Nothing to do.");
    return;
  }
  console.log(`  Unattributed sales with referralCode: ${sales.length}\n`);

  // ── Pre-flight: collision detection ──────────────────────────────────────
  // DB unique on (tenantId, referralCode) prevents duplicate stored codes,
  // but two rows can still collapse to the same normalized string (e.g. a
  // JOHN-DOE row created pre-normalization plus a JOHNDOE row post-). Under
  // the processor's normalized findUnique, one of them becomes silently
  // unreachable. Refuse to backfill until a human decides which wins.
  const tenantIds = Array.from(new Set(sales.map((s) => s.tenantId)));
  const allAffs = await prisma.campaignAffiliate.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { tenantId: true, affiliateId: true, referralCode: true },
  });
  const collisions = new Map<string, Array<typeof allAffs[number]>>();
  for (const aff of allAffs) {
    const norm = normalizeReferralCode(aff.referralCode);
    if (!norm) continue;
    const key = `${aff.tenantId}::${norm}`;
    const bucket = collisions.get(key) ?? [];
    bucket.push(aff);
    collisions.set(key, bucket);
  }
  const colliding = Array.from(collisions.values()).filter((bucket) => bucket.length > 1);
  if (colliding.length > 0) {
    console.error("  ✗ Collision detected — multiple affiliates normalize to the same code:");
    for (const bucket of colliding) {
      for (const aff of bucket) {
        console.error(`      tenant=${aff.tenantId} aff=${aff.affiliateId} stored="${aff.referralCode}"`);
      }
      console.error("      ─");
    }
    console.error(
      "  Refusing to backfill. Pick one affiliate per collision and rename the other(s) " +
        "in the admin UI so their stored code matches the new normalization, then re-run.",
    );
    process.exit(2);
  }

  // ── 2. Resolve each against CampaignAffiliate + Campaign ─────────────────
  const campaignIds = Array.from(new Set(sales.map((s) => s.campaignId)));
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, commissionRateBps: true },
  });
  const campaignBps = new Map(campaigns.map((c) => [c.id, c.commissionRateBps]));

  const candidates: Candidate[] = [];
  for (const s of sales) {
    const normalized = normalizeReferralCode(s.referralCode);
    if (!normalized) continue;

    const aff = await prisma.campaignAffiliate.findUnique({
      where: { tenantId_referralCode: { tenantId: s.tenantId, referralCode: normalized } },
      select: { affiliateId: true },
    });

    const bps = campaignBps.get(s.campaignId) ?? 0;
    const projectedCommission = aff ? Math.round((s.amountMinor * bps) / 10_000) : 0;

    candidates.push({
      saleId: s.id,
      tenantId: s.tenantId,
      campaignId: s.campaignId,
      amountMinor: s.amountMinor,
      currency: s.currency,
      saleReferralCode: s.referralCode!,
      normalizedCode: normalized,
      matchedAffiliateId: aff?.affiliateId ?? null,
      commissionRateBps: bps,
      projectedCommissionMinor: projectedCommission,
      existingAttribution: false,
    });
  }

  const matched = candidates.filter((c) => c.matchedAffiliateId);
  const unmatched = candidates.filter((c) => !c.matchedAffiliateId);

  // Snapshot to disk so rollback inspection doesn't depend on terminal scrollback.
  const snapshotDir = join(__dirname, "snapshots");
  mkdirSync(snapshotDir, { recursive: true });
  const snapshotPath = join(
    snapshotDir,
    `backfill-attribution-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(snapshotPath, JSON.stringify({ matched, unmatched }, null, 2), "utf8");
  console.log(`  Snapshot written to: ${snapshotPath}\n`);

  console.log(`  Match summary:`);
  console.log(`    Matched to an affiliate:    ${matched.length}`);
  console.log(`    Unmatched (code not found): ${unmatched.length}\n`);

  if (matched.length === 0) {
    console.log("  Nothing to backfill.");
    if (unmatched.length > 0) {
      console.log("  Unmatched codes (first 10):");
      for (const u of unmatched.slice(0, 10)) {
        console.log(`    sale=${u.saleId} raw="${u.saleReferralCode}" normalized="${u.normalizedCode}"`);
      }
    }
    return;
  }

  console.log("  Matched sales to be backfilled:");
  for (const m of matched) {
    console.log(
      `    sale=${m.saleId}  aff=${m.matchedAffiliateId}  amount=${m.amountMinor}  commission=${m.projectedCommissionMinor}  (code="${m.saleReferralCode}" → "${m.normalizedCode}")`,
    );
  }

  if (DRY_RUN) {
    console.log("\n[backfill-attribution] DRY_RUN=1 — no writes performed.");
    return;
  }

  // ── 3. Apply — one transaction per sale, fully idempotent ───────────────
  let applied = 0;
  let skipped = 0;
  for (const c of matched) {
    const result = await prisma.$transaction(async (tx) => {
      // Idempotency check inside transaction — another worker or an earlier
      // run of this script may have already attributed this sale.
      const existing = await tx.attributionClaim.findUnique({
        where: { saleId: c.saleId },
      });
      if (existing) return { created: false };

      await tx.attributionClaim.create({
        data: {
          tenantId: c.tenantId,
          saleId: c.saleId,
          affiliateId: c.matchedAffiliateId!,
          method: "referral_code",
        },
      });

      if (c.projectedCommissionMinor > 0) {
        await tx.commissionLedgerEntry.create({
          data: {
            tenantId: c.tenantId,
            saleId: c.saleId,
            affiliateId: c.matchedAffiliateId!,
            amountMinor: c.projectedCommissionMinor,
            currency: c.currency,
            type: "earned",
          },
        });
      }
      return { created: true };
    });
    if (result.created) applied++;
    else skipped++;
  }

  console.log(`\n[backfill-attribution] Done.`);
  console.log(`    AttributionClaim + LedgerEntry created: ${applied}`);
  console.log(`    Already attributed (skipped):           ${skipped}`);
  console.log("\n  Next step (optional): recompute DashboardStats/SalesStats/milestones");
  console.log("  the same way cleanup-dummy-data.ts does, so the admin KPIs reflect the");
  console.log("  new attribution rows immediately instead of waiting for event-driven updates.");
}

main()
  .catch((err) => {
    console.error("[backfill-attribution] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
