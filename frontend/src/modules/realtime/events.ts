import { z } from "zod";

/**
 * All domain events the frontend can receive.
 * Each event has a type, tenantId, version, and typed payload.
 */

export const SUPPORTED_EVENT_VERSION = 1;

export const domainEventTypes = [
  "sale.created",
  "sale.confirmed",
  "sale.rejected",
  "commission.updated",
  "commission.paid",
  "affiliate.approved",
  "affiliate.rejected",
  "affiliate.signed_up",
  "campaign.updated",
  "payout.completed",
] as const;

export type DomainEventType = (typeof domainEventTypes)[number];

export const domainEventSchema = z.object({
  id: z.string(),
  version: z.number(),
  type: z.enum(domainEventTypes),
  tenantId: z.string(),
  timestamp: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export type DomainEvent = z.infer<typeof domainEventSchema>;

/**
 * Parse raw SSE data into a validated DomainEvent.
 * Returns null for invalid/unknown events — never throws.
 */
export function parseDomainEvent(raw: string): DomainEvent | null {
  try {
    const parsed = JSON.parse(raw);
    const result = domainEventSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
