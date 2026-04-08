import { z } from "zod";

// ── Payout ───────────────────────────────────────────────

export const payoutStatusSchema = z.enum(["pending", "processing", "paid", "failed"]);

export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

export const payoutSchema = z.object({
  id: z.string(),
  affiliateId: z.string(),
  affiliateName: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: payoutStatusSchema,
  externalReference: z.string().nullable(),
  createdAt: z.string(),
  processedAt: z.string().nullable(),
});

export type Payout = z.infer<typeof payoutSchema>;

// ── Paginated list response ──────────────────────────────

export const payoutsListResponseSchema = z.object({
  payouts: z.array(payoutSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type PayoutsListResponse = z.infer<typeof payoutsListResponseSchema>;

// ── Summary (server-computed, never derived client-side) ──

export const payoutSummarySchema = z.object({
  totalPaid: z.number(),
  totalPending: z.number(),
  totalProcessing: z.number(),
  totalFailed: z.number(),
  currency: z.string(),
  paidCount: z.number(),
  pendingCount: z.number(),
  processingCount: z.number(),
  failedCount: z.number(),
});

export type PayoutSummary = z.infer<typeof payoutSummarySchema>;

// ── Filter state (URL-driven) ────────────────────────────

export type PayoutsFilterState = {
  page: number;
  pageSize: number;
  status?: PayoutStatus;
  affiliateId?: string;
  sortBy?: "createdAt" | "amount" | "processedAt";
  sortOrder?: "asc" | "desc";
};
