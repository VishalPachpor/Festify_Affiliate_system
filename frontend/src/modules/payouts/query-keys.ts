import type { PayoutsFilterState } from "./types";

export const payoutsKeys = {
  all: ["payouts"] as const,

  lists: () => [...payoutsKeys.all, "list"] as const,
  list: (tenantId: string, filters?: PayoutsFilterState) =>
    [...payoutsKeys.lists(), { tenantId, ...filters }] as const,

  summaries: () => [...payoutsKeys.all, "summary"] as const,
  summary: (tenantId: string) =>
    [...payoutsKeys.summaries(), { tenantId }] as const,
};
