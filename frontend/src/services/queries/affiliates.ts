export const affiliateKeys = {
  all: (tenantId: string, campaignId: string) =>
    ["tenant", tenantId, "campaign", campaignId, "affiliates"] as const,

  list: (
    tenantId: string,
    campaignId: string,
    filters?: Record<string, unknown>,
  ) =>
    [...affiliateKeys.all(tenantId, campaignId), "list", filters] as const,

  detail: (tenantId: string, campaignId: string, affiliateId: string) =>
    [
      ...affiliateKeys.all(tenantId, campaignId),
      "detail",
      affiliateId,
    ] as const,
};
