// Unit tests for the tier-rate selection logic that underpins the
// rate-setting ladder (Starter / Riser / Pro / Elite) and the retroactive
// recompute path. These tests don't need the DB or Redis — they exercise
// the pure function and the math that decides how much delta to emit
// when an affiliate crosses a tier.

import test from "node:test";
import assert from "node:assert/strict";
import { pickTierRateBps } from "../src/processors/process-inbound-event";

// The canonical ladder seeded by prisma/seed.ts. Kept here so the test
// documents the expected thresholds without importing from the seed file
// (the seed is a script, not a module).
const TIER_LADDER = [
  { targetMinor: 0,          commissionRateBps: 250  }, // Starter  2.5%
  { targetMinor: 10_000_00,  commissionRateBps: 500  }, // Riser    5%    at $10k
  { targetMinor: 50_000_00,  commissionRateBps: 750  }, // Pro      7.5%  at $50k
  { targetMinor: 100_000_00, commissionRateBps: 1000 }, // Elite    10%   at $100k
];

const CAMPAIGN_RATE_BPS = 1000; // only used when no tiers are defined

// ── Tier selection ──────────────────────────────────────────────────────────

test("pickTierRateBps: $0 revenue sits at Starter", () => {
  assert.equal(pickTierRateBps(TIER_LADDER, 0, CAMPAIGN_RATE_BPS), 250);
});

test("pickTierRateBps: just under Riser stays at Starter", () => {
  assert.equal(pickTierRateBps(TIER_LADDER, 999_999, CAMPAIGN_RATE_BPS), 250);
});

test("pickTierRateBps: exactly hitting the Riser threshold unlocks Riser", () => {
  assert.equal(pickTierRateBps(TIER_LADDER, 10_000_00, CAMPAIGN_RATE_BPS), 500);
});

test("pickTierRateBps: above Riser but below Pro picks Riser", () => {
  assert.equal(pickTierRateBps(TIER_LADDER, 25_000_00, CAMPAIGN_RATE_BPS), 500);
});

test("pickTierRateBps: crossing $50k unlocks Pro", () => {
  assert.equal(pickTierRateBps(TIER_LADDER, 50_000_00, CAMPAIGN_RATE_BPS), 750);
});

test("pickTierRateBps: at $100k the affiliate is Elite", () => {
  assert.equal(pickTierRateBps(TIER_LADDER, 100_000_00, CAMPAIGN_RATE_BPS), 1000);
});

test("pickTierRateBps: well above Elite stays at Elite", () => {
  assert.equal(pickTierRateBps(TIER_LADDER, 1_000_000_00, CAMPAIGN_RATE_BPS), 1000);
});

test("pickTierRateBps: empty tier list falls back to campaign rate", () => {
  assert.equal(pickTierRateBps([], 50_000_00, CAMPAIGN_RATE_BPS), CAMPAIGN_RATE_BPS);
});

test("pickTierRateBps: unordered tier input still produces the right rate", () => {
  // Regression guard on the internal sort. Shuffled input must not change
  // the result — the hot path in the processor sorts ascending, but the
  // helper has to be robust to being handed an unsorted list from a test
  // fixture or a future caller.
  const shuffled = [TIER_LADDER[3], TIER_LADDER[0], TIER_LADDER[2], TIER_LADDER[1]];
  assert.equal(pickTierRateBps(shuffled, 60_000_00, CAMPAIGN_RATE_BPS), 750);
});

// ── Retro delta math ────────────────────────────────────────────────────────
//
// The processor emits a positive delta per prior sale when an affiliate
// crosses into a higher-rate tier. The amount is Math.round(sale * newRate
// / 10000) - Math.round(sale * oldRate / 10000). These tests pin down the
// math so the "every sale benefits from the best rate" promise stays true
// to the cent.

function deltaForSale(saleAmountMinor: number, newRateBps: number, priorRateBps: number): number {
  const newCommission = Math.round((saleAmountMinor * newRateBps) / 10_000);
  const priorCommission = Math.round((saleAmountMinor * priorRateBps) / 10_000);
  return newCommission - priorCommission;
}

test("retro delta: $10k sale repriced Riser→Pro yields +$250", () => {
  // 7.5% - 5% = 2.5% of $10,000 = $250
  assert.equal(deltaForSale(10_000_00, 750, 500), 250_00);
});

test("retro delta: $10k sale repriced Starter→Riser yields +$250", () => {
  // 5% - 2.5% = 2.5% of $10,000 = $250
  assert.equal(deltaForSale(10_000_00, 500, 250), 250_00);
});

test("retro delta: $50k sale repriced Riser→Elite yields +$2500", () => {
  // 10% - 5% = 5% of $50,000 = $2,500
  assert.equal(deltaForSale(50_000_00, 1000, 500), 2_500_00);
});

test("retro delta: same rate yields zero (no-op)", () => {
  assert.equal(deltaForSale(50_000_00, 500, 500), 0);
});

test("retro delta: rounding to cent is consistent per sale", () => {
  // Odd-cent sales must not produce fractional deltas. $123.45 at
  // 2.5% → $3.09 (rounded from 3.08625), at 5% → $6.17 (rounded from
  // 6.1725) → delta = $3.08. Proves Math.round on both sides doesn't
  // drift beyond a cent per sale.
  const sale = 123_45;
  const starter = Math.round(sale * 250 / 10_000); // 3_09 (rounded up from 3_08.625)
  const riser   = Math.round(sale * 500 / 10_000); // 6_17 (rounded down from 6_17.25)
  assert.equal(starter, 309);
  assert.equal(riser, 617);
  assert.equal(deltaForSale(sale, 500, 250), 308);
});
