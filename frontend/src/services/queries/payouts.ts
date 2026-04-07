export const payoutKeys = {
  all: (tenantId: string, campaignId: string) =>
    ["tenant", tenantId, "campaign", campaignId, "payouts"] as const,

  list: (
    tenantId: string,
    campaignId: string,
    filters?: Record<string, unknown>,
  ) => [...payoutKeys.all(tenantId, campaignId), "list", filters] as const,

  summary: (tenantId: string, campaignId: string) =>
    [...payoutKeys.all(tenantId, campaignId), "summary"] as const,
};
