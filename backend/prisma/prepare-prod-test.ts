import { PrismaClient } from "@prisma/client";
import { syncCouponToLuma } from "../src/lib/affiliate-activation";

// One-shot: prepare the deployed DB so the client can test the referral →
// payment flow end-to-end. Idempotent — safe to re-run.
//
//   1. Sets Campaign.lumaEventId on campaign_demo so the coupon auto-sync
//      has a target.
//   2. Re-runs syncCouponToLuma() for every CampaignAffiliate on that
//      campaign whose codeStatus !== "verified", so existing affiliates
//      (e.g. ASH2049) get their coupons registered in Luma now that the
//      event is wired up.
//
// Required env: DATABASE_URL, LUMA_API_KEY.
// Optional env: LUMA_DEMO_EVENT_ID (defaults to evt-D15DTJJimYz2w9V).
//
// Run:
//   DATABASE_URL='<prod url>' \
//     LUMA_API_KEY='<luma key>' \
//     npx ts-node prisma/prepare-prod-test.ts

const CAMPAIGN_ID = "campaign_demo";
const DEFAULT_EVENT_ID = "evt-D15DTJJimYz2w9V";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.LUMA_API_KEY?.trim()) {
    console.warn("[prepare-prod-test] LUMA_API_KEY is not set — coupon sync will be skipped. Set it before re-running.");
  }

  const eventId = (process.env.LUMA_DEMO_EVENT_ID?.trim() || DEFAULT_EVENT_ID).trim();

  // ── 1. Wire campaign → Luma event ────────────────────────────────────────
  const campaign = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
    select: { id: true, name: true, tenantId: true, lumaEventId: true },
  });
  if (!campaign) {
    console.error(`[prepare-prod-test] campaign ${CAMPAIGN_ID} not found — run bootstrap-admin first.`);
    process.exit(1);
  }

  if (campaign.lumaEventId === eventId) {
    console.log(`[prepare-prod-test] ${CAMPAIGN_ID} already points at ${eventId} — no change.`);
  } else {
    await prisma.campaign.update({
      where: { id: CAMPAIGN_ID },
      data: { lumaEventId: eventId },
    });
    console.log(
      `[prepare-prod-test] ${CAMPAIGN_ID} (${campaign.name}): lumaEventId ${campaign.lumaEventId ?? "(null)"} → ${eventId}`,
    );
  }

  // ── 2. Sync coupons for existing affiliates ──────────────────────────────
  const affiliates = await prisma.campaignAffiliate.findMany({
    where: { campaignId: CAMPAIGN_ID },
    select: { tenantId: true, affiliateId: true, referralCode: true, codeStatus: true, codeSyncError: true },
  });

  if (affiliates.length === 0) {
    console.log(`[prepare-prod-test] no CampaignAffiliate rows on ${CAMPAIGN_ID} — nothing to sync.`);
    return;
  }

  console.log(`[prepare-prod-test] syncing ${affiliates.length} affiliate(s) to Luma…`);
  for (const aff of affiliates) {
    if (aff.codeStatus === "verified") {
      console.log(`  ✓ ${aff.referralCode} (${aff.affiliateId}) already verified — skipping`);
      continue;
    }

    const result = await syncCouponToLuma({
      tenantId: aff.tenantId,
      affiliateId: aff.affiliateId,
      campaignId: CAMPAIGN_ID,
      referralCode: aff.referralCode,
    });

    const tag = result.status === "verified" ? "✓" : result.status === "skipped" ? "·" : "✗";
    const detail = result.error ? ` — ${result.error}` : "";
    console.log(`  ${tag} ${aff.referralCode} (${aff.affiliateId}): ${result.status}${detail}`);
  }
}

main()
  .catch((err) => { console.error("[prepare-prod-test] failed:", err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
