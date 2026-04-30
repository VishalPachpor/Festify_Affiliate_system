import { z } from "zod";

// ── Sale ─────────────────────────────────────────────────

// Sale lifecycle on the backend is {pending, approved, paid, refunded,
// rejected}. Older payloads use "confirmed" as an alias for "approved"; we
// accept both so a rolling deploy doesn't reject in-flight responses, but
// UI code should read "approved". "refunded" lands here when a ticket
// refund webhook arrives — admin Commissions surfaces these so the
// "Reverse Payout" action can be offered when needed.
export const saleSchema = z.object({
  id: z.string(),
  amount: z.number(),
  commission: z.number(),
  currency: z.string(),
  affiliateId: z.string(),
  affiliateName: z.string(),
  campaignId: z.string(),
  status: z.enum(["pending", "approved", "confirmed", "rejected", "paid", "refunded"]),
  createdAt: z.string(),
  // Latest payout.processedAt across attached payouts (null until a payout lands).
  payoutDate: z.string().nullable().optional(),
  payoutId: z.string().nullable().optional(),
  payoutStatus: z.enum(["pending", "processing", "paid", "failed"]).nullable().optional(),
  payoutSaleCount: z.number().int().nullable().optional(),
});

export type Sale = z.infer<typeof saleSchema>;

// ── Paginated list response ──────────────────────────────

export const salesListResponseSchema = z.object({
  sales: z.array(saleSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type SalesListResponse = z.infer<typeof salesListResponseSchema>;

// ── Summary ──────────────────────────────────────────────

export const salesSummarySchema = z.object({
  totalSales: z.number(),
  totalRevenue: z.number(),
  totalCommissions: z.number(),
  currency: z.string(),
  confirmedCount: z.number(),
  pendingCount: z.number(),
  rejectedCount: z.number(),
  // Affiliate's current tier rate (in basis points). Only present when the
  // caller is an affiliate; admin views compute their own averaged rate.
  commissionRateBps: z.number().optional(),
});

export type SalesSummary = z.infer<typeof salesSummarySchema>;

// ── Attribution trace (server-computed) ──────────────────

export const attributionSourceSchema = z.enum([
  "referral_link",
  "referral_code",
  "direct",
  "organic",
  "unattributed",
]);

export type AttributionSource = z.infer<typeof attributionSourceSchema>;

export const attributionSchema = z.object({
  source: attributionSourceSchema,
  attributed: z.boolean(),
  referralCode: z.string().nullable(),
  referralUrl: z.string().nullable(),
  landingPage: z.string().nullable(),
  attributedAt: z.string().nullable(),
});

export type Attribution = z.infer<typeof attributionSchema>;

export const commissionBreakdownSchema = z.object({
  rate: z.number(),
  baseAmount: z.number(),
  commissionAmount: z.number(),
  currency: z.string(),
  tier: z.string().nullable(),
});

export type CommissionBreakdown = z.infer<typeof commissionBreakdownSchema>;

// ── Attribution diagnostics (server-computed reasons) ────

export const attributionDiagnosticStepSchema = z.object({
  check: z.string(),
  result: z.enum(["passed", "failed", "skipped"]),
  detail: z.string(),
});

export type AttributionDiagnosticStep = z.infer<typeof attributionDiagnosticStepSchema>;

export const attributionDiagnosticsSchema = z.object({
  reason: z.string(),
  steps: z.array(attributionDiagnosticStepSchema),
  resolvedAt: z.string().nullable(),
});

export type AttributionDiagnostics = z.infer<typeof attributionDiagnosticsSchema>;

export const saleDetailSchema = saleSchema.extend({
  attribution: attributionSchema,
  attributionDiagnostics: attributionDiagnosticsSchema,
  commissionBreakdown: commissionBreakdownSchema.nullable(),
  payoutId: z.string().nullable(),
  payoutStatus: z.enum(["pending", "processing", "paid", "failed"]).nullable(),
});

export type SaleDetail = z.infer<typeof saleDetailSchema>;

// ── Filter state (URL-driven) ────────────────────────────

export type SalesFilterState = {
  page: number;
  pageSize: number;
  status?: Sale["status"];
  affiliateId?: string;
  search?: string;
  sortBy?: "createdAt" | "amount" | "commission";
  sortOrder?: "asc" | "desc";
  attributed?: "true" | "false";
  attributionSource?: AttributionSource;
  from?: string;
  to?: string;
};
