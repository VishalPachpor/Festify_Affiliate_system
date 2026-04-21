import { z } from "zod";

// ─── Progress (summary for the dashboard widget) ────────────────────────────

export const milestoneProgressSchema = z.object({
  currentRevenue: z.number(),
  currentTier: z.string().nullable(),
  /// Commission rate the affiliate is currently earning (basis points).
  /// 0 when they haven't crossed even the entry tier.
  currentTierRateBps: z.number().default(0),
  currentTierComplimentaryTickets: z.number().default(0),
  nextTier: z.string().nullable(),
  nextTierTarget: z.number(),
  nextTierRateBps: z.number().default(0),
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
  /// Rate-setting ladder: commission rate applied to sales while the
  /// affiliate sits at this tier, in basis points (250 = 2.5%).
  commissionRateBps: z.number().default(0),
  /// Display-only perk count. No redemption flow.
  complimentaryTickets: z.number().default(0),
});

export const milestoneTiersResponseSchema = z.object({
  tiers: z.array(milestoneTierSchema),
});

export type MilestoneTier = z.infer<typeof milestoneTierSchema>;
export type MilestoneTiersResponse = z.infer<typeof milestoneTiersResponseSchema>;
