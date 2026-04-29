import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// BullMQ blocking commands (BRPOPLPUSH etc.) hold the ioredis connection
// open for minutes at a time. Two configs are required for that to work:
//
//   • maxRetriesPerRequest: null    — never error out a queued command
//   • enableReadyCheck: false       — stops ioredis from issuing INFO
//                                     polls that race with the blocking op
//                                     and fire spurious "Connection is
//                                     closed" errors against Upstash.
//
// retryStrategy must NEVER return null for a worker process — that tells
// ioredis to give up forever, leaving the worker permanently disconnected.
// Cap the backoff at 30s and reconnect indefinitely; Upstash idle resets
// (~5min) and any transient network flap should heal automatically.
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 10_000,
  retryStrategy(times) {
    return Math.min(times * 500, 30_000);
  },
});

redis.on("error", (err) => {
  console.error("[redis] Connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[redis] Connected");
});

redis.on("reconnecting", (delay: number) => {
  console.warn(`[redis] Reconnecting in ${delay}ms`);
});
