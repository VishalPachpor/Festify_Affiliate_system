"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
exports.emitEvent = emitEvent;
const crypto_1 = require("crypto");
const queue_1 = require("./queue");
/**
 * Emit a domain event to the durable queue.
 * Auto-generates eventId if not provided.
 * Returns after the event is persisted to Redis — NOT after processing.
 */
async function emitEvent(name, payload) {
    const eventId = payload.eventId ?? (0, crypto_1.randomUUID)();
    const full = { ...payload, eventId };
    await queue_1.eventQueue.add(name, full, {
        jobId: eventId, // BullMQ deduplication — same jobId = same job, not added twice
    });
}
/**
 * @deprecated Use emitEvent() instead. Kept for backward compatibility during migration.
 */
exports.eventBus = {
    emit: emitEvent,
};
//# sourceMappingURL=event-bus.js.map