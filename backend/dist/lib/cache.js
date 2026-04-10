"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCacheKey = buildCacheKey;
exports.getCache = getCache;
exports.setCache = setCache;
exports.invalidateCache = invalidateCache;
const redis_1 = require("./redis");
const DEFAULT_TTL = 60; // seconds
/**
 * Build a tenant-scoped cache key.
 * Format: tenantId:endpoint:queryHash
 *
 * Throws if tenantId is empty — prevents cross-tenant cache collisions.
 */
function buildCacheKey(tenantId, endpoint, query) {
    if (!tenantId || typeof tenantId !== "string" || tenantId.trim().length === 0) {
        throw new Error("buildCacheKey: tenantId is required");
    }
    if (!endpoint) {
        throw new Error("buildCacheKey: endpoint is required");
    }
    const base = `${tenantId}:${endpoint}`;
    if (!query || Object.keys(query).length === 0)
        return base;
    const sorted = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
    return sorted ? `${base}:${sorted}` : base;
}
/**
 * Try to get cached response. Returns parsed JSON or null.
 * Logs all failure modes — no silent swallows.
 */
async function getCache(key) {
    try {
        const cached = await redis_1.redis.get(key);
        if (cached === null)
            return null;
        try {
            return JSON.parse(cached);
        }
        catch (parseErr) {
            console.error(`[cache] Corrupted JSON in Redis key "${key}":`, parseErr);
            // Best-effort cleanup
            redis_1.redis.del(key).catch(() => { });
            return null;
        }
    }
    catch (err) {
        console.warn(`[cache] Redis get failed for "${key}":`, err instanceof Error ? err.message : err);
        return null;
    }
}
/**
 * Store response in cache with TTL.
 */
async function setCache(key, data, ttl = DEFAULT_TTL) {
    try {
        await redis_1.redis.set(key, JSON.stringify(data), "EX", ttl);
    }
    catch (err) {
        console.warn(`[cache] Redis set failed for "${key}":`, err instanceof Error ? err.message : err);
    }
}
/**
 * Invalidate cache keys matching a pattern for a tenant.
 * Use after mutations (payout create, status change, etc).
 */
async function invalidateCache(tenantId, ...endpoints) {
    if (!tenantId) {
        console.error("[cache] invalidateCache called without tenantId");
        return;
    }
    for (const endpoint of endpoints) {
        try {
            const pattern = `${tenantId}:${endpoint}*`;
            const keys = await redis_1.redis.keys(pattern);
            if (keys.length > 0) {
                await redis_1.redis.del(...keys);
            }
        }
        catch (err) {
            console.warn(`[cache] Invalidation failed for ${tenantId}:${endpoint}:`, err instanceof Error ? err.message : err);
        }
    }
}
//# sourceMappingURL=cache.js.map