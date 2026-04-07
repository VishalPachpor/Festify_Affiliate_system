export const milestoneKeys = {
  all: (tenantId: string, campaignId: string) =>
    ["tenant", tenantId, "campaign", campaignId, "milestones"] as const,

  list: (tenantId: string, campaignId: string) =>
    [...milestoneKeys.all(tenantId, campaignId), "list"] as const,

  progress: (
    tenantId: string,
    campaignId: string,
    affiliateId: string,
  ) =>
    [
      ...milestoneKeys.all(tenantId, campaignId),
      "progress",
      affiliateId,
    ] as const,
};
