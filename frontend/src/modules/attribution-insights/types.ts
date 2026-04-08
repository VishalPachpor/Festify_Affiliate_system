import { z } from "zod";

// ── Summary ──────────────────────────────────────────────

export const attributionSummarySchema = z.object({
  totalSales: z.number(),
  attributedCount: z.number(),
  unattributedCount: z.number(),
  successRate: z.number(),
  failureRate: z.number(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export type AttributionSummary = z.infer<typeof attributionSummarySchema>;

// ── Breakdown by source ──────────────────────────────────

export const sourceBreakdownItemSchema = z.object({
  source: z.string(),
  count: z.number(),
  percentage: z.number(),
  revenue: z.number(),
  currency: z.string(),
});

export const sourceBreakdownResponseSchema = z.object({
  items: z.array(sourceBreakdownItemSchema),
});

export type SourceBreakdownItem = z.infer<typeof sourceBreakdownItemSchema>;
export type SourceBreakdownResponse = z.infer<typeof sourceBreakdownResponseSchema>;

// ── Breakdown by failure reason ──────────────────────────

export const failureReasonItemSchema = z.object({
  reason: z.string(),
  count: z.number(),
  percentage: z.number(),
});

export const failureReasonsResponseSchema = z.object({
  items: z.array(failureReasonItemSchema),
  totalFailures: z.number(),
});

export type FailureReasonItem = z.infer<typeof failureReasonItemSchema>;
export type FailureReasonsResponse = z.infer<typeof failureReasonsResponseSchema>;

// ── Trend (time series) ──────────────────────────────────

export const attributionTrendPointSchema = z.object({
  date: z.string(),
  attributed: z.number(),
  unattributed: z.number(),
  successRate: z.number(),
});

export const attributionTrendResponseSchema = z.object({
  points: z.array(attributionTrendPointSchema),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export type AttributionTrendPoint = z.infer<typeof attributionTrendPointSchema>;
export type AttributionTrendResponse = z.infer<typeof attributionTrendResponseSchema>;
