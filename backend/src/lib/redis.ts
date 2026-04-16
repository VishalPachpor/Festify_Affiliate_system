import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: 3000,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying after 3 attempts
    return Math.min(times * 200, 1000);
  },
});

redis.on("error", (err) => {
  console.error("[redis] Connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[redis] Connected");
});
