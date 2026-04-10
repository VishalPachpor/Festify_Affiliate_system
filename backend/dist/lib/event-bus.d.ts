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
export declare function emitEvent<K extends EventName>(name: K, payload: Omit<DomainEvents[K], "eventId"> & {
    eventId?: string;
}): Promise<void>;
/**
 * @deprecated Use emitEvent() instead. Kept for backward compatibility during migration.
 */
export declare const eventBus: {
    emit: typeof emitEvent;
};
export {};
//# sourceMappingURL=event-bus.d.ts.map