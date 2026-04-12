import { z } from "zod";

// ── Affiliate ────────────────────────────────────────────

export const affiliateStatusSchema = z.enum(["pending", "approved", "rejected"]);

export type AffiliateStatus = z.infer<typeof affiliateStatusSchema>;

export const affiliateSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  status: affiliateStatusSchema,
  totalRevenue: z.number(),
  totalCommission: z.number(),
  totalSales: z.number(),
  currency: z.string(),
  joinedAt: z.string(),
  referralCode: z.string().nullable().optional(),
  tier: z.string().nullable().optional(),
  requestedCode: z.string().nullable().optional(),
});

export type Affiliate = z.infer<typeof affiliateSchema>;

// ── Paginated list response ──────────────────────────────

export const affiliatesListResponseSchema = z.object({
  affiliates: z.array(affiliateSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type AffiliatesListResponse = z.infer<typeof affiliatesListResponseSchema>;

// ── Detail response (extended) ───────────────────────────

export const affiliateDetailSchema = affiliateSchema.extend({
  campaignIds: z.array(z.string()),
  referralCode: z.string(),
  conversionRate: z.number(),
  lastSaleAt: z.string().nullable(),
});

export type AffiliateDetail = z.infer<typeof affiliateDetailSchema>;

// ── Filter state (URL-driven) ────────────────────────────

export type AffiliatesFilterState = {
  page: number;
  pageSize: number;
  status?: AffiliateStatus;
  tier?: "bronze" | "silver" | "gold" | "platinum" | "none";
  search?: string;
  sortBy?: "joinedAt" | "totalRevenue" | "totalSales";
  sortOrder?: "asc" | "desc";
};
