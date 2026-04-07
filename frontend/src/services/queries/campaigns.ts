export const campaignKeys = {
  all: (tenantId: string) => ["tenant", tenantId, "campaigns"] as const,

  list: (tenantId: string, filters?: Record<string, unknown>) =>
    [...campaignKeys.all(tenantId), "list", filters] as const,

  detail: (tenantId: string, campaignId: string) =>
    [...campaignKeys.all(tenantId), "detail", campaignId] as const,
};
