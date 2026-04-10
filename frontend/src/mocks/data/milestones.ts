import type { MilestoneProgress, MilestoneTiersResponse } from "@/modules/milestones/types";

export const mockMilestoneProgress: MilestoneProgress = {
  currentRevenue: 18450,
  currentTier: "gold",
  nextTier: "platinum",
  nextTierTarget: 25000,
  currency: "USD",
};

export const mockMilestoneTiers: MilestoneTiersResponse = {
  tiers: [
    {
      id: "bronze",
      name: "Bronze",
      letter: "B",
      targetAmount: 1000,
      currentAmount: 1000,
      currency: "USD",
      description: "Event VIP pass upgrade",
      color: "#D8913D",
      unlocked: true,
    },
    {
      id: "silver",
      name: "Silver",
      letter: "S",
      targetAmount: 5000,
      currentAmount: 5000,
      currency: "USD",
      description: "Backstage / speaker lounge access",
      color: "#E5E7EB",
      unlocked: true,
    },
    {
      id: "gold",
      name: "Gold",
      letter: "G",
      targetAmount: 10000,
      currentAmount: 10000,
      currency: "USD",
      description: "Speaking / panel opportunity",
      color: "#FFC800",
      unlocked: true,
    },
    {
      id: "platinum",
      name: "Platinum",
      letter: "P",
      targetAmount: 25000,
      currentAmount: 18450,
      currency: "USD",
      description: "Revenue share increase to 15%",
      color: "#E5E7EB",
      unlocked: false,
    },
  ],
};
