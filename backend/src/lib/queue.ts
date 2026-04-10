import { Queue } from "bullmq";
import { redis } from "./redis";

// ─────────────────────────────────────────────────────────────────────────────
// Durable Event Queue (BullMQ + Redis)
//
// Replaces the in-memory EventEmitter. Events are persisted to Redis before
// processing — they survive crashes, restarts, and can be retried.
//
// Dead letter: jobs that fail all attempts move to "events-dead" queue.
// ─────────────────────────────────────────────────────────────────────────────

export const eventQueue = new Queue("events", {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 1000, // 1s, 2s, 4s, 8s, 16s
    },
    removeOnComplete: { count: 1000 },   // keep last 1000 completed jobs
    removeOnFail: false,                   // keep failed jobs for inspection
  },
});

export const deadLetterQueue = new Queue("events-dead", {
  connection: redis,
});
