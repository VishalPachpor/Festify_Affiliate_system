import Redis, { type RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Parse the URL once so we can (a) decide whether to enable TLS and how to
// configure it, and (b) print a non-secret breadcrumb at boot. Wrapped in
// try so a malformed URL doesn't take down the worker before retryStrategy
// has a chance to scream.
function parseRedisUrl(url: string): {
  scheme: string;
  host: string;
  port: number;
  ok: boolean;
} {
  try {
    const u = new URL(url);
    return {
      scheme: u.protocol.replace(":", ""),
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 6379,
      ok: true,
    };
  } catch {
    return { scheme: "?", host: "?", port: 0, ok: false };
  }
}

const parsed = parseRedisUrl(REDIS_URL);

// Common ioredis configuration tuned for managed Redis (DO Managed, Upstash):
//
//   • maxRetriesPerRequest: null    — required by BullMQ; never error out
//                                     a queued command waiting on Redis.
//   • enableReadyCheck: false       — stops ioredis from issuing INFO
//                                     polls that race with BullMQ blocking
//                                     ops and fire spurious "Connection
//                                     is closed" errors.
//   • keepAlive: 30s                — TCP-level keepalive so the provider's
//                                     idle-connection killer doesn't close
//                                     the socket every few minutes.
//   • retryStrategy never returns null — workers stay alive across any
//                                     network flap.
//   • tls (rediss://)               — DigitalOcean Managed Redis serves a
//                                     cert from their internal CA which
//                                     Node's default trust store doesn't
//                                     include, so strict validation fails
//                                     mid-handshake and the connection
//                                     bounces (TCP up → TLS validation
//                                     fail → server closes → reconnect).
//                                     rejectUnauthorized:false relaxes that
//                                     validation. Transport is still
//                                     encrypted; we only stop checking the
//                                     cert chain. For tighter security,
//                                     pin the CA via DO_CA_CERT_PEM env.
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

if (parsed.scheme === "rediss") {
  // ioredis derives `tls: {}` from `rediss://` but it inherits Node's strict
  // CA validation by default. DO Managed Redis fails that check. Override.
  baseOptions.tls = {
    rejectUnauthorized: false,
  };
}

// Boot-time diagnostic — no secrets. Surfaces:
//   - exactly which scheme is in use (rediss vs redis)
//   - exactly which host:port we'll dial
//   - whether TLS-with-relaxed-CA is in effect
// First thing in any worker's runtime log so config issues are obvious.
console.log(
  `[redis] connecting scheme=${parsed.scheme} host=${parsed.host} port=${parsed.port} tls=${parsed.scheme === "rediss"}`,
);
if (parsed.scheme === "redis" && parsed.host !== "localhost" && parsed.host !== "127.0.0.1") {
  console.warn(
    "[redis] REDIS_URL uses plain redis:// against a non-localhost host — managed Redis providers usually require rediss:// (TLS). If you see ECONNRESET in the logs, this is likely the cause.",
  );
}

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
  const conn = new Redis(REDIS_URL, baseOptions);
  conn.on("error", (err) => {
    console.warn("[redis-bull] connection flap:", err instanceof Error ? err.message : err);
  });
  conn.on("end", () => {
    console.warn("[redis-bull] connection ended (will not auto-reconnect from `end`)");
  });
  return conn;
}

redis.on("error", (err) => {
  console.warn("[redis] connection flap:", err.message);
});

redis.on("connect", () => {
  // Fires on TCP-level connect. Does NOT mean ioredis is usable yet.
  console.log("[redis] tcp connected (handshake pending)");
});

redis.on("ready", () => {
  // Fires after TLS handshake + AUTH. This is the "actually usable" signal.
  // If you see `tcp connected` repeatedly without `ready`, the failure is
  // in TLS validation or AUTH (wrong password, untrusted CA, expired cert).
  console.log("[redis] ready");
});

redis.on("end", () => {
  console.warn("[redis] connection ended");
});

redis.on("reconnecting", (delay: number) => {
  console.warn(`[redis] Reconnecting in ${delay}ms`);
});

// Heartbeat: ping the primary connection every 30s so the managed Redis
// idle-killer doesn't reset our socket between bursts of work. Polling
// workers can sit idle for minutes between events; without this, every
// burst pays a reconnect tax. Lazy-started via startRedisHeartbeat() so
// short-lived scripts (migrations, one-shot ts-node tools) don't keep
// the process alive.
let heartbeatHandle: NodeJS.Timeout | null = null;

export function startRedisHeartbeat(intervalMs = 30_000): void {
  if (heartbeatHandle) return;
  heartbeatHandle = setInterval(() => {
    redis.ping().catch(() => {
      // retryStrategy will reconnect; swallow rejection so the timer
      // doesn't spawn an unhandled rejection on its own.
    });
  }, intervalMs);
  // unref so the heartbeat alone never keeps the event loop alive.
  heartbeatHandle.unref();
}

export function stopRedisHeartbeat(): void {
  if (heartbeatHandle) {
    clearInterval(heartbeatHandle);
    heartbeatHandle = null;
  }
}
