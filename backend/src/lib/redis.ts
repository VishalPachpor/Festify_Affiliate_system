import Redis, { type RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Common ioredis configuration tuned for Upstash + BullMQ:
//
//   • maxRetriesPerRequest: null    — required by BullMQ; never error out
//                                     a queued command waiting on Redis.
//   • enableReadyCheck: false       — stops ioredis from issuing INFO
//                                     polls that race with BullMQ blocking
//                                     ops and fire spurious "Connection
//                                     is closed" errors against Upstash.
//   • keepAlive: 30s                — TCP-level keepalive so Upstash's
//                                     idle-connection killer doesn't
//                                     close the socket every few minutes.
//   • retryStrategy never returns null — workers stay alive across any
//                                     network flap; Upstash idle resets
//                                     and DNS hiccups self-heal.
const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 10_000,
  keepAlive: 30_000,
  retryStrategy(times) {
    return Math.min(times * 500, 30_000);
  },
};

// Primary connection — used for direct cache reads/writes and any
// non-blocking command. Cheap, multiplexed.
export const redis = new Redis(REDIS_URL, baseOptions);

// Dedicated connection for BullMQ. BullMQ holds its connection in
// blocking-mode (BRPOPLPUSH, BLPOP, etc.) for minutes at a time, which
// blocks any other traffic on the same socket. Sharing the primary
// `redis` instance leads to cache reads silently waiting behind worker
// blocking ops. Returns a NEW Redis instance per call — pass to BullMQ
// constructors so each Queue/Worker gets its own dedicated socket.
export function createBullConnection(): Redis {
  return new Redis(REDIS_URL, baseOptions);
}

redis.on("error", (err) => {
  console.error("[redis] Connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[redis] Connected");
});

redis.on("reconnecting", (delay: number) => {
  console.warn(`[redis] Reconnecting in ${delay}ms`);
});
