import type { QueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/modules/dashboard/query-keys";
import { salesKeys } from "@/modules/sales/query-keys";
import { affiliatesKeys } from "@/modules/affiliates/query-keys";
import { payoutsKeys } from "@/modules/payouts/query-keys";
import { saleSchema } from "@/modules/sales/types";
import type { SalesListResponse } from "@/modules/sales/types";
import type { RecentActivityResponse } from "@/modules/dashboard/types";
import type { DomainEvent, DomainEventType } from "./events";

/**
 * Event handler — receives the event and query client.
 *
 * Rules:
 * - NEVER compute financial aggregates client-side
 * - Summaries/totals: ALWAYS invalidate (server recomputes)
 * - Lists: use setQueryData for prepend when the payload contains a full entity
 * - Unknown payloads: fall back to invalidation
 */
type EventHandler = (event: DomainEvent, queryClient: QueryClient) => void;

/**
 * Attempt to prepend a new sale to all cached sales lists.
 * Falls back to invalidation if the payload doesn't contain a valid Sale.
 */
function prependSaleToLists(event: DomainEvent, qc: QueryClient): void {
  const parsed = saleSchema.safeParse(event.payload);

  if (!parsed.success) {
    // Payload doesn't match Sale shape — fall back to full refetch
    qc.invalidateQueries({ queryKey: salesKeys.lists() });
    return;
  }

  const newSale = parsed.data;
  let updated = false;

  // Update all matching cached list queries
  qc.setQueriesData<SalesListResponse>(
    { queryKey: salesKeys.lists() },
    (old) => {
      if (!old) return old;
      updated = true;
      return {
        ...old,
        sales: [newSale, ...old.sales].slice(0, old.pageSize),
        total: old.total + 1,
        totalPages: Math.ceil((old.total + 1) / old.pageSize),
      };
    },
  );

  // If no cached lists existed, invalidate so the next mount fetches fresh
  if (!updated) {
    qc.invalidateQueries({ queryKey: salesKeys.lists() });
  }
}

/**
 * Map a domain event to an activity feed item and prepend it.
 * Falls back to invalidation if the event doesn't carry enough info.
 */
const activityTypeMap: Partial<Record<DomainEventType, RecentActivityResponse["items"][number]["type"]>> = {
  "sale.created": "sale",
  "affiliate.signed_up": "signup",
  "payout.completed": "payout",
};

const MAX_ACTIVITY_ITEMS = 50;

function prependToActivityFeed(event: DomainEvent, qc: QueryClient): void {
  const activityType = activityTypeMap[event.type];
  if (!activityType) {
    qc.invalidateQueries({ queryKey: dashboardKeys.activities() });
    return;
  }

  const affiliateName =
    typeof event.payload.affiliateName === "string"
      ? event.payload.affiliateName
      : "Unknown";

  const description =
    typeof event.payload.description === "string"
      ? event.payload.description
      : event.type.replace(".", " ");

  const newItem = {
    id: event.id,
    type: activityType,
    description,
    amount: typeof event.payload.amount === "number" ? event.payload.amount : undefined,
    currency: typeof event.payload.currency === "string" ? event.payload.currency : undefined,
    affiliateName,
    timestamp: event.timestamp,
  };

  let updated = false;

  qc.setQueriesData<RecentActivityResponse>(
    { queryKey: dashboardKeys.activities() },
    (old) => {
      if (!old) return old;
      updated = true;
      return {
        items: [newItem, ...old.items].slice(0, MAX_ACTIVITY_ITEMS),
      };
    },
  );

  if (!updated) {
    qc.invalidateQueries({ queryKey: dashboardKeys.activities() });
  }
}

const handlers: Partial<Record<DomainEventType, EventHandler>> = {
  "sale.created": (event, qc) => {
    prependSaleToLists(event, qc);
    prependToActivityFeed(event, qc);
    qc.invalidateQueries({ queryKey: salesKeys.summaries() });
    qc.invalidateQueries({ queryKey: dashboardKeys.summaries() });
    qc.invalidateQueries({ queryKey: dashboardKeys.trends() });
  },

  "sale.confirmed": (_event, qc) => {
    qc.invalidateQueries({ queryKey: salesKeys.lists() });
    qc.invalidateQueries({ queryKey: salesKeys.summaries() });
    qc.invalidateQueries({ queryKey: dashboardKeys.summaries() });
  },

  "sale.rejected": (_event, qc) => {
    qc.invalidateQueries({ queryKey: salesKeys.lists() });
    qc.invalidateQueries({ queryKey: salesKeys.summaries() });
  },

  "commission.updated": (_event, qc) => {
    qc.invalidateQueries({ queryKey: dashboardKeys.summaries() });
    qc.invalidateQueries({ queryKey: salesKeys.summaries() });
  },

  "commission.paid": (_event, qc) => {
    qc.invalidateQueries({ queryKey: dashboardKeys.summaries() });
    qc.invalidateQueries({ queryKey: salesKeys.lists() });
    qc.invalidateQueries({ queryKey: salesKeys.summaries() });
    qc.invalidateQueries({ queryKey: payoutsKeys.lists() });
    qc.invalidateQueries({ queryKey: payoutsKeys.summaries() });
  },

  "affiliate.approved": (_event, qc) => {
    qc.invalidateQueries({ queryKey: affiliatesKeys.lists() });
    qc.invalidateQueries({ queryKey: dashboardKeys.summaries() });
    qc.invalidateQueries({ queryKey: dashboardKeys.topAffiliates() });
  },

  "affiliate.rejected": (_event, qc) => {
    qc.invalidateQueries({ queryKey: affiliatesKeys.lists() });
  },

  "affiliate.signed_up": (event, qc) => {
    qc.invalidateQueries({ queryKey: affiliatesKeys.lists() });
    qc.invalidateQueries({ queryKey: dashboardKeys.summaries() });
    prependToActivityFeed(event, qc);
  },

  "campaign.updated": (_event, qc) => {
    qc.invalidateQueries({ queryKey: dashboardKeys.all });
  },

  "payout.completed": (event, qc) => {
    qc.invalidateQueries({ queryKey: payoutsKeys.lists() });
    qc.invalidateQueries({ queryKey: payoutsKeys.summaries() });
    qc.invalidateQueries({ queryKey: salesKeys.lists() });
    qc.invalidateQueries({ queryKey: salesKeys.summaries() });
    qc.invalidateQueries({ queryKey: dashboardKeys.summaries() });
    prependToActivityFeed(event, qc);
  },
};

/**
 * Dispatch a domain event to the registered handler.
 * Unknown event types are silently ignored.
 * Handler errors are caught — never crash the event pipeline.
 */
export function dispatchEvent(
  event: DomainEvent,
  queryClient: QueryClient,
): void {
  const handler = handlers[event.type];
  if (!handler) return;

  try {
    handler(event, queryClient);
  } catch (err) {
    console.error(`[realtime] handler error for ${event.type}:`, err);
  }
}
