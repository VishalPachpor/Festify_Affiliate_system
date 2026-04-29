import { z } from "zod";

// ── Affiliate ────────────────────────────────────────────

export const affiliateStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  // approved by admin, awaiting BoldSign MOU signature. Surfaced in the list
  // so applicants don't disappear between admin approval and MOU completion.
  "mou_pending",
]);

export type AffiliateStatus = z.infer<typeof affiliateStatusSchema>;

export const affiliateSchema = z.object({
  id: z.string(),
  // Application id is exposed alongside the affiliate id so the admin drawer
  // can fetch the original form responses via a single endpoint regardless
  // of which lifecycle stage the row is in.
  applicationId: z.string().nullable().optional(),
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
  tier?: "starter" | "riser" | "pro" | "elite" | "none";
  search?: string;
  sortBy?: "joinedAt" | "totalRevenue" | "totalSales";
  sortOrder?: "asc" | "desc";
};

// ── Application responses (admin drawer) ─────────────────────────────────────

export const applicationResponsesSchema = z.object({
  id: z.string(),
  affiliateId: z.string().nullable().optional(),
  applyingAs: z.enum(["individual", "company"]),
  firstName: z.string(),
  email: z.string(),
  individualFullName: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  contactPersonName: z.string().nullable().optional(),
  contactPersonEmail: z.string().nullable().optional(),
  signatoryName: z.string().nullable().optional(),
  signatoryEmail: z.string().nullable().optional(),
  contactPersonTelegramUsername: z.string().nullable().optional(),
  communicationChannels: z.array(z.string()),
  emailDatabaseSize: z.string().nullable().optional(),
  telegramGroupLink: z.string().nullable().optional(),
  xProfileLink: z.string().nullable().optional(),
  redditProfileLink: z.string().nullable().optional(),
  linkedInProfileLink: z.string().nullable().optional(),
  instagramAccountLink: z.string().nullable().optional(),
  discordServerLink: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  requestedCode: z.string().nullable().optional(),
  status: z.string(),
  campaignId: z.string(),
  campaignName: z.string(),
  createdAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
});

export type ApplicationResponses = z.infer<typeof applicationResponsesSchema>;
