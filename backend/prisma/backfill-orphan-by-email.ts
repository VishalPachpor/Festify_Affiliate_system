import { PrismaClient } from "@prisma/client";
import type { Milestone, Prisma } from "@prisma/client";
import { normalizeReferralCode, pickTierRateBps } from "../src/processors/process-inbound-event";

// Backfill a single orphan Sale that came in without a coupon and
// therefore was created with referralCode=null and no AttributionClaim.
//
// Typical cause: the affiliate's referral link rendered with a stray
// trailing space ("https://luma.com/xxx ?coupon=Y"). The space terminates
// the URL on click/copy, the buyer pays without applying the coupon,
// Luma's webhook arrives with coupon_info=null, and the processor stores
// the Sale without attribution.
//
// This script identifies that Sale by buyer email + amount (looked up
// against InboundEvent payloads), backfills AttributionClaim and
// CommissionLedgerEntry in a single transaction, and updates
// Sale.referralCode for debuggability. Mirrors the post-Sale portion of
// process-inbound-event.ts:executeGoldenFlow — same tier-rate selection
// via pickTierRateBps, same code-normalization via normalizeReferralCode.
//
// Skipped (intentional): retro tier-adjustment delta against prior sales.
// The processor only emits tier_adjustment when a NEW sale crosses a
// threshold; running that retroactively against settled payouts is
// avoided elsewhere in the codebase. This backfill is for a single
// missed sale — sufficient for the affiliate dashboard to reflect it.
//
// Run (dry-run by default — add --apply to write):
//   DATABASE_URL='<neon url>' npm run db:backfill-orphan-by-email -- \
//     --email ash@festify.so --amount 4.50 --code ASHWALIAN
//   DATABASE_URL='<neon url>' npm run db:backfill-orphan-by-email -- \
//     --email ash@festify.so --amount 4.50 --code ASHWALIAN --apply

interface Args {
  email: string;
  amountMinor: number;
  code: string;
  apply: boolean;
}

function parseArgs(): Args {
  // npm sometimes prepends a leading space to the first forwarded arg
  // (the script.ts is followed by two spaces in the spawned command,
  // which surfaces as " --email" in argv[0]). Trim + drop empties so
  // indexOf matches cleanly regardless.
  const argv = process.argv
    .slice(2)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const get = (name: string): string | undefined => {
    const idx = argv.indexOf(`--${name}`);
    if (idx === -1 || idx === argv.length - 1) return undefined;
    return argv[idx + 1];
  };

  const email = get("email");
  const amountStr = get("amount");
  const code = get("code");
  const apply = argv.includes("--apply");

  if (!email || !amountStr || !code) {
    console.error("Usage: --email <buyer> --amount <dollars> --code <REFERRAL> [--apply]");
    console.error(`  argv (slice 2): ${JSON.stringify(argv)}`);
    console.error(`  parsed: email=${JSON.stringify(email)} amount=${JSON.stringify(amountStr)} code=${JSON.stringify(code)} apply=${apply}`);
    process.exit(2);
  }

  const amountFloat = Number(amountStr);
  if (!Number.isFinite(amountFloat) || amountFloat <= 0) {
    console.error(`Invalid --amount: ${amountStr}`);
    process.exit(2);
  }

  return {
    email: email.trim().toLowerCase(),
    amountMinor: Math.round(amountFloat * 100),
    code: code.trim(),
    apply,
  };
}

const prisma = new PrismaClient();

async function main() {
  const args = parseArgs();

  console.log(
    `[backfill-orphan] looking for orphan Sale: email=${args.email} amountMinor=${args.amountMinor} code=${args.code} (apply=${args.apply})`,
  );

  // 1. Email-first search: scan recent Luma InboundEvents for ones whose
  //    normalized.buyerEmail matches. Doing the email match in JS keeps it
  //    case-insensitive (Luma echoes the buyer's typed casing).
  const recentEvents = await prisma.inboundEvent.findMany({
    where: { provider: "luma" },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      tenantId: true,
      payload: true,
      status: true,
      createdAt: true,
      externalEventId: true,
    },
  });

  type Hit = {
    eventId: string;
    tenantId: string;
    eventStatus: string;
    eventCreatedAt: Date;
    externalOrderId: string | null;
    amountMinor: number | null;
    referralCodeOnPayload: string | null;
  };

  const hits: Hit[] = [];
  for (const event of recentEvents) {
    const normalized = (event.payload as Record<string, unknown> | null)?.normalized as
      | Record<string, unknown>
      | undefined;
    const buyerEmail = typeof normalized?.buyerEmail === "string"
      ? normalized.buyerEmail.trim().toLowerCase()
      : null;
    if (buyerEmail !== args.email) continue;

    hits.push({
      eventId: event.id,
      tenantId: event.tenantId,
      eventStatus: event.status,
      eventCreatedAt: event.createdAt,
      externalOrderId: typeof normalized?.externalOrderId === "string" ? normalized.externalOrderId : null,
      amountMinor: typeof normalized?.amountMinor === "number" ? normalized.amountMinor : null,
      referralCodeOnPayload: typeof normalized?.referralCode === "string" ? normalized.referralCode : null,
    });
  }

  if (hits.length === 0) {
    console.error(
      `[backfill-orphan] no Luma InboundEvents found for buyerEmail=${args.email} in the last 500 events.\n` +
      `  → Luma may never have fired a webhook for this purchase. Check Luma's webhook log.\n` +
      `  → Or the buyer email was different than expected. Try inspect-luma-event.ts to peek at recent payloads.`,
    );
    process.exit(1);
  }

  console.log(`[backfill-orphan] found ${hits.length} Luma InboundEvent(s) for ${args.email}:`);
  for (const h of hits) {
    console.log(
      `  - event=${h.eventId} status=${h.eventStatus} order=${h.externalOrderId} amountMinor=${h.amountMinor} referralCodeOnPayload=${JSON.stringify(h.referralCodeOnPayload)} at=${h.eventCreatedAt.toISOString()}`,
    );
  }

  // 2. For each hit, look up the Sale + attribution state.
  type Candidate = Hit & {
    sale: {
      id: string;
      tenantId: string;
      campaignId: string;
      amountMinor: number;
      currency: string;
      referralCode: string | null;
    } | null;
    hasAttribution: boolean;
  };

  const candidates: Candidate[] = [];
  for (const h of hits) {
    if (!h.externalOrderId) {
      candidates.push({ ...h, sale: null, hasAttribution: false });
      continue;
    }
    const sale = await prisma.sale.findUnique({
      where: { tenantId_externalOrderId: { tenantId: h.tenantId, externalOrderId: h.externalOrderId } },
      select: {
        id: true,
        tenantId: true,
        campaignId: true,
        amountMinor: true,
        currency: true,
        referralCode: true,
        attributionClaim: { select: { id: true } },
      },
    });
    if (!sale) {
      candidates.push({ ...h, sale: null, hasAttribution: false });
      continue;
    }
    candidates.push({
      ...h,
      sale: {
        id: sale.id,
        tenantId: sale.tenantId,
        campaignId: sale.campaignId,
        amountMinor: sale.amountMinor,
        currency: sale.currency,
        referralCode: sale.referralCode,
      },
      hasAttribution: sale.attributionClaim !== null,
    });
  }

  console.log(`\n[backfill-orphan] sale state per event:`);
  for (const c of candidates) {
    if (!c.sale) {
      console.log(`  - event=${c.eventId} → NO Sale row (status=${c.eventStatus})`);
    } else {
      console.log(
        `  - event=${c.eventId} → sale=${c.sale.id} amountMinor=${c.sale.amountMinor} referralCode=${JSON.stringify(c.sale.referralCode)} attributed=${c.hasAttribution}`,
      );
    }
  }

  // 3. Pick the one orphan Sale (no AttributionClaim).
  const orphans = candidates.filter((c) => c.sale && !c.hasAttribution);
  if (orphans.length === 0) {
    console.error(
      `\n[backfill-orphan] no orphan Sale found for ${args.email}. Either every Sale already has attribution, or Luma never created a Sale for this purchase. Nothing to backfill.`,
    );
    process.exit(1);
  }

  // Prefer one matching the supplied amount; if multiple, abort.
  const exactAmount = orphans.filter((c) => c.sale!.amountMinor === args.amountMinor);
  const matchSet = exactAmount.length > 0 ? exactAmount : orphans;
  if (matchSet.length > 1) {
    console.error(
      `\n[backfill-orphan] ABORT: multiple orphan Sales match. Disambiguate by re-running with the correct --amount.`,
    );
    process.exit(1);
  }
  const match = matchSet[0].sale!;
  if (exactAmount.length === 0) {
    console.warn(
      `\n[backfill-orphan] WARNING: no orphan Sale matches --amount ${args.amountMinor}; the only orphan is ${match.amountMinor}. Proceeding with that one.`,
    );
  }

  // 3. Resolve affiliate by referral code (normalized exactly as the
  //    processor would).
  const code = normalizeReferralCode(args.code);
  if (!code) {
    console.error(`[backfill-orphan] referral code ${JSON.stringify(args.code)} normalized to null.`);
    process.exit(1);
  }

  const affiliate = await prisma.campaignAffiliate.findUnique({
    where: { tenantId_referralCode: { tenantId: match.tenantId, referralCode: code } },
    select: { affiliateId: true },
  });
  if (!affiliate) {
    console.error(
      `[backfill-orphan] no CampaignAffiliate for tenant=${match.tenantId} code=${code}.`,
    );
    process.exit(1);
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: match.campaignId },
    select: { commissionRateBps: true },
  });
  if (!campaign) {
    console.error(`[backfill-orphan] campaign ${match.campaignId} missing.`);
    process.exit(1);
  }

  const tiers = await prisma.milestone.findMany({
    where: { tenantId: match.tenantId },
    orderBy: { targetMinor: "asc" },
  });

  // 4. Compute commission against the affiliate's CURRENT cumulative
  //    attributed revenue (post this orphan's amount), matching the rate
  //    a fresh inbound event would have used.
  const priorAgg = await prisma.sale.aggregate({
    where: {
      tenantId: match.tenantId,
      attributionClaim: { affiliateId: affiliate.affiliateId },
      id: { not: match.id },
    },
    _sum: { amountMinor: true },
  });
  const priorRevenue = priorAgg._sum.amountMinor ?? 0;
  const newRevenue = priorRevenue + match.amountMinor;
  const rateBps = pickTierRateBps(
    tiers as Pick<Milestone, "targetMinor" | "commissionRateBps">[],
    newRevenue,
    campaign.commissionRateBps,
  );
  const commissionAmount = Math.round((match.amountMinor * rateBps) / 10_000);

  console.log("\n[backfill-orphan] plan:");
  console.log(`  sale.id           = ${match.id}`);
  console.log(`  sale.amountMinor  = ${match.amountMinor} (${match.currency})`);
  console.log(`  sale.referralCode = ${JSON.stringify(match.referralCode)} → will be set to ${code}`);
  console.log(`  affiliate.id      = ${affiliate.affiliateId}`);
  console.log(`  referralCode      = ${code}`);
  console.log(`  priorRevenueMinor = ${priorRevenue}`);
  console.log(`  newRevenueMinor   = ${newRevenue}`);
  console.log(`  rateBps           = ${rateBps} (= ${(rateBps / 100).toFixed(2)}%)`);
  console.log(`  commissionMinor   = ${commissionAmount}`);

  if (!args.apply) {
    console.log("\n[backfill-orphan] dry-run — re-run with --apply to write.");
    return;
  }

  // 5. Apply.
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.sale.update({
      where: { id: match.id },
      data: { referralCode: code },
    });

    await tx.attributionClaim.create({
      data: {
        tenantId: match.tenantId,
        saleId: match.id,
        affiliateId: affiliate.affiliateId,
        method: "referral_code",
      },
    });

    if (commissionAmount > 0) {
      await tx.commissionLedgerEntry.create({
        data: {
          tenantId: match.tenantId,
          saleId: match.id,
          affiliateId: affiliate.affiliateId,
          amountMinor: commissionAmount,
          currency: match.currency,
          type: "earned",
        },
      });
    }
  });

  console.log(
    `\n[backfill-orphan] ✓ attributed sale=${match.id} → affiliate=${affiliate.affiliateId} commission=${commissionAmount} ${match.currency}`,
  );
}

main()
  .catch((err) => {
    console.error("[backfill-orphan] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
