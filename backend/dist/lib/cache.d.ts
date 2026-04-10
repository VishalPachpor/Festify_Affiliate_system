/**
 * Build a tenant-scoped cache key.
 * Format: tenantId:endpoint:queryHash
 *
 * Throws if tenantId is empty — prevents cross-tenant cache collisions.
 */
export declare function buildCacheKey(tenantId: string, endpoint: string, query?: Record<string, unknown>): string;
/**
 * Try to get cached response. Returns parsed JSON or null.
 * Logs all failure modes — no silent swallows.
 */
export declare function getCache<T>(key: string): Promise<T | null>;
/**
 * Store response in cache with TTL.
 */
export declare function setCache(key: string, data: unknown, ttl?: number): Promise<void>;
/**
 * Invalidate cache keys matching a pattern for a tenant.
 * Use after mutations (payout create, status change, etc).
 */
export declare function invalidateCache(tenantId: string, ...endpoints: string[]): Promise<void>;
//# sourceMappingURL=cache.d.ts.map