export const salesKeys = {
  all: (tenantId: string, campaignId: string) =>
    ["tenant", tenantId, "campaign", campaignId, "sales"] as const,

  list: (
    tenantId: string,
    campaignId: string,
    filters?: Record<string, unknown>,
  ) => [...salesKeys.all(tenantId, campaignId), "list", filters] as const,

  summary: (tenantId: string, campaignId: string) =>
    [...salesKeys.all(tenantId, campaignId), "summary"] as const,
};
