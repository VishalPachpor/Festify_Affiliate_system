import { z } from "zod";

export const milestoneProgressSchema = z.object({
  tierName: z.string(),
  currentAmount: z.number(),
  targetAmount: z.number(),
  currency: z.string(),
});

export type MilestoneProgress = z.infer<typeof milestoneProgressSchema>;

export const milestoneTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  letter: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  currency: z.string(),
  description: z.string(),
  color: z.string(), // CSS color value for the tier badge
  unlocked: z.boolean(),
  isCurrent: z.boolean(),
});

export const milestoneTiersResponseSchema = z.object({
  tiers: z.array(milestoneTierSchema),
  totalEarned: z.number(),
  currency: z.string(),
});

export type MilestoneTier = z.infer<typeof milestoneTierSchema>;
export type MilestoneTiersResponse = z.infer<typeof milestoneTiersResponseSchema>;
