import type { AffiliatesFilterState } from "./types";

export const affiliatesKeys = {
  all: ["affiliates"] as const,

  lists: () => [...affiliatesKeys.all, "list"] as const,
  list: (tenantId: string, campaignId?: string, filters?: AffiliatesFilterState) =>
    [...affiliatesKeys.lists(), { tenantId, campaignId, ...filters }] as const,

  details: () => [...affiliatesKeys.all, "detail"] as const,
  detail: (tenantId: string, affiliateId: string) =>
    [...affiliatesKeys.details(), { tenantId, affiliateId }] as const,
};
