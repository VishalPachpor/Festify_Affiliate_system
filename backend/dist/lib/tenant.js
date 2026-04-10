"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantConfig = getTenantConfig;
const prisma_1 = require("./prisma");
const tenantCache = new Map();
const CACHE_TTL_MS = 60_000; // 1 minute
/**
 * Get tenant configuration. Cached in-memory for 1 minute.
 * Falls back to "USD" if tenant not found (defensive — never block API).
 */
async function getTenantConfig(tenantId) {
    const cached = tenantCache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return { defaultCurrency: cached.defaultCurrency };
    }
    const tenant = await prisma_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { defaultCurrency: true },
    });
    const config = { defaultCurrency: tenant?.defaultCurrency ?? "USD" };
    tenantCache.set(tenantId, { ...config, cachedAt: Date.now() });
    return config;
}
//# sourceMappingURL=tenant.js.map