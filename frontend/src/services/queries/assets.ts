export const assetKeys = {
  all: (tenantId: string, campaignId: string) =>
    ["tenant", tenantId, "campaign", campaignId, "assets"] as const,

  list: (
    tenantId: string,
    campaignId: string,
    filters?: Record<string, unknown>,
  ) => [...assetKeys.all(tenantId, campaignId), "list", filters] as const,
};
