export const attributionInsightsKeys = {
  all: ["attribution-insights"] as const,

  summaries: () => [...attributionInsightsKeys.all, "summary"] as const,
  summary: (tenantId: string) =>
    [...attributionInsightsKeys.summaries(), { tenantId }] as const,

  breakdowns: () => [...attributionInsightsKeys.all, "breakdown"] as const,
  sourceBreakdown: (tenantId: string) =>
    [...attributionInsightsKeys.breakdowns(), "source", { tenantId }] as const,
  failureReasons: (tenantId: string) =>
    [...attributionInsightsKeys.breakdowns(), "failures", { tenantId }] as const,

  trends: () => [...attributionInsightsKeys.all, "trend"] as const,
  trend: (tenantId: string) =>
    [...attributionInsightsKeys.trends(), { tenantId }] as const,
};
