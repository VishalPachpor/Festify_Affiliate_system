export type DomainEventType =
  | "sale.created"
  | "sale.refunded"
  | "asset.published"
  | "milestone.unlocked"
  | "commission.updated"
  | "payout.updated"
  | "announcement.sent";

export type DomainEvent<TPayload = unknown> = {
  id: string;
  type: DomainEventType;
  version: number;
  tenantId: string;
  campaignId?: string;
  occurredAt: string;
  payload: TPayload;
};
