import type { MilestoneProgress, MilestoneTiersResponse } from "@/modules/milestones/types";

export const mockMilestoneProgress: MilestoneProgress = {
  tierName: "Gold",
  currentAmount: 18450,
  targetAmount: 25000,
  currency: "USD",
};

export const mockMilestoneTiers: MilestoneTiersResponse = {
  totalEarned: 18450,
  currency: "USD",
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
      isCurrent: false,
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
      isCurrent: false,
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
      isCurrent: false,
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
      isCurrent: false,
    },
  ],
};
