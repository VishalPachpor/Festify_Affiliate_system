/**
 * Query key factory for dashboard module.
 *
 * Pattern: module → scope → filters
 * Enables granular cache invalidation.
 */
export const dashboardKeys = {
  all: ["dashboard"] as const,

  summaries: () => [...dashboardKeys.all, "summary"] as const,
  summary: (tenantId: string, campaignId?: string) =>
    [...dashboardKeys.summaries(), { tenantId, campaignId }] as const,

  trends: () => [...dashboardKeys.all, "trend"] as const,
  trend: (tenantId: string, campaignId?: string) =>
    [...dashboardKeys.trends(), { tenantId, campaignId }] as const,

  topAffiliates: () => [...dashboardKeys.all, "top-affiliates"] as const,
  topAffiliate: (tenantId: string, limit?: number) =>
    [...dashboardKeys.topAffiliates(), { tenantId, limit }] as const,

  activities: () => [...dashboardKeys.all, "activity"] as const,
  activity: (tenantId: string) =>
    [...dashboardKeys.activities(), { tenantId }] as const,
};
