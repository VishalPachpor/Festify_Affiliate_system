import type { SalesFilterState } from "./types";

export const salesKeys = {
  all: ["sales"] as const,

  lists: () => [...salesKeys.all, "list"] as const,
  list: (tenantId: string, campaignId?: string, filters?: SalesFilterState) =>
    [...salesKeys.lists(), { tenantId, campaignId, ...filters }] as const,

  summaries: () => [...salesKeys.all, "summary"] as const,
  summary: (tenantId: string, campaignId?: string) =>
    [...salesKeys.summaries(), { tenantId, campaignId }] as const,

  details: () => [...salesKeys.all, "detail"] as const,
  detail: (tenantId: string, saleId: string) =>
    [...salesKeys.details(), { tenantId, saleId }] as const,
};
