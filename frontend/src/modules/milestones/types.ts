import { z } from "zod";

// ─── Progress (summary for the dashboard widget) ────────────────────────────

export const milestoneProgressSchema = z.object({
  currentRevenue: z.number(),
  currentTier: z.string().nullable(),
  nextTier: z.string().nullable(),
  nextTierTarget: z.number(),
  currency: z.string(),
});

export type MilestoneProgress = z.infer<typeof milestoneProgressSchema>;

// ─── Tiers (full list for the milestones page) ──────────────────────────────

export const milestoneTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  letter: z.string(),
  targetAmount: z.number(),
  currentAmount: z.number(),
  currency: z.string(),
  description: z.string(),
  color: z.string(),
  unlocked: z.boolean(),
});

export const milestoneTiersResponseSchema = z.object({
  tiers: z.array(milestoneTierSchema),
});

export type MilestoneTier = z.infer<typeof milestoneTierSchema>;
export type MilestoneTiersResponse = z.infer<typeof milestoneTiersResponseSchema>;
