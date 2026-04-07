export const dashboardKeys = {
  all: (tenantId: string) => ["tenant", tenantId, "dashboard"] as const,

  kpis: (tenantId: string, campaignId?: string) =>
    [...dashboardKeys.all(tenantId), "kpis", campaignId] as const,

  activity: (tenantId: string) =>
    [...dashboardKeys.all(tenantId), "activity"] as const,
};
