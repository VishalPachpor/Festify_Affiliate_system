"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deadLetterQueue = exports.eventQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
// ─────────────────────────────────────────────────────────────────────────────
// Durable Event Queue (BullMQ + Redis)
//
// Replaces the in-memory EventEmitter. Events are persisted to Redis before
// processing — they survive crashes, restarts, and can be retried.
//
// Dead letter: jobs that fail all attempts move to "events-dead" queue.
// ─────────────────────────────────────────────────────────────────────────────
exports.eventQueue = new bullmq_1.Queue("events", {
    connection: redis_1.redis,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: "exponential",
            delay: 1000, // 1s, 2s, 4s, 8s, 16s
        },
        removeOnComplete: { count: 1000 }, // keep last 1000 completed jobs
        removeOnFail: false, // keep failed jobs for inspection
    },
});
exports.deadLetterQueue = new bullmq_1.Queue("events-dead", {
    connection: redis_1.redis,
});
//# sourceMappingURL=queue.js.map