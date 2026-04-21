import type { MilestoneProgress, MilestoneTiersResponse } from "@/modules/milestones/types";

// Mirrors the rate-setting ladder seeded by backend/prisma/seed.ts
// (Starter / Riser / Pro / Elite). Kept in sync so offline demos and
// Storybook-style fixtures render the same shape the live backend returns.
export const mockMilestoneProgress: MilestoneProgress = {
  currentRevenue: 25_000_00,
  currentTier: "riser",
  currentTierRateBps: 500,
  currentTierComplimentaryTickets: 2,
  nextTier: "pro",
  nextTierTarget: 50_000_00,
  nextTierRateBps: 750,
  currency: "USD",
};

export const mockMilestoneTiers: MilestoneTiersResponse = {
  tiers: [
    {
      id: "starter",
      name: "Starter",
      letter: "S",
      targetAmount: 0,
      currentAmount: 0,
      currency: "USD",
      description: "Entry tier — your first sales earn 2.5%.",
      color: "#9CA4B7",
      unlocked: true,
      commissionRateBps: 250,
      complimentaryTickets: 0,
    },
    {
      id: "riser",
      name: "Riser",
      letter: "R",
      targetAmount: 10_000_00,
      currentAmount: 10_000_00,
      currency: "USD",
      description: "Cross $10k to unlock 5% on every sale, past and future.",
      color: "#5B8DEF",
      unlocked: true,
      commissionRateBps: 500,
      complimentaryTickets: 2,
    },
    {
      id: "pro",
      name: "Pro",
      letter: "P",
      targetAmount: 50_000_00,
      currentAmount: 25_000_00,
      currency: "USD",
      description: "Cross $50k to unlock 7.5% — prior sales are repriced at the new rate.",
      color: "#E19A3E",
      unlocked: false,
      commissionRateBps: 750,
      complimentaryTickets: 4,
    },
    {
      id: "elite",
      name: "Elite",
      letter: "E",
      targetAmount: 100_000_00,
      currentAmount: 25_000_00,
      currency: "USD",
      description: "Cross $100k to unlock 10% — the top of the ladder.",
      color: "#FFD620",
      unlocked: false,
      commissionRateBps: 1000,
      complimentaryTickets: 6,
    },
  ],
};
