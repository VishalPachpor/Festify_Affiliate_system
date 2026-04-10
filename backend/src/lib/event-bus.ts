import { randomUUID } from "crypto";
import { eventQueue } from "./queue";

// ─────────────────────────────────────────────────────────────────────────────
// Typed Event Bus — backed by BullMQ durable queue.
//
// emit() persists the event to Redis via BullMQ before returning.
// Events survive crashes, are retried on failure, and are processed
// by the event worker (src/workers/event-worker.ts).
//
// The in-memory EventEmitter is gone. Events are now durable.
// ─────────────────────────────────────────────────────────────────────────────

type BaseEvent = {
  eventId: string;
  tenantId: string;
};

export type DomainEvents = {
  "order.created": BaseEvent & {
    amountMinor: number;
    attributed: boolean;
  };
  "commission.earned": BaseEvent & {
    amountMinor: number;
  };
  "payout.created": BaseEvent & {
    amountMinor: number;
  };
  "payout.status_changed": BaseEvent & {
    fromStatus: string;
    toStatus: string;
    amountMinor: number;
  };
  "affiliate.joined": BaseEvent & {
    affiliateId: string;
  };
  "milestone.progressed": BaseEvent & {
    affiliateId: string;
    milestoneId: string;
    milestoneKey: string;
    currentMinor: number;
    targetMinor: number;
    unlocked: boolean;
  };
  "application.approved": BaseEvent & {
    applicationId: string;
    affiliateId: string;
    email: string;
    firstName: string;
    referralCode: string;
  };
};

export type EventName = keyof DomainEvents;

/**
 * Emit a domain event to the durable queue.
 * Auto-generates eventId if not provided.
 * Returns after the event is persisted to Redis — NOT after processing.
 */
export async function emitEvent<K extends EventName>(
  name: K,
  payload: Omit<DomainEvents[K], "eventId"> & { eventId?: string },
): Promise<void> {
  const eventId = payload.eventId ?? randomUUID();
  const full = { ...payload, eventId };

  await eventQueue.add(name, full, {
    jobId: eventId, // BullMQ deduplication — same jobId = same job, not added twice
  });
}

/**
 * @deprecated Use emitEvent() instead. Kept for backward compatibility during migration.
 */
export const eventBus = {
  emit: emitEvent,
};
