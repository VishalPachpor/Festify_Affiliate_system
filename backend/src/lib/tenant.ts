import { prisma } from "./prisma";

const tenantCache = new Map<string, { defaultCurrency: string; cachedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Get tenant configuration. Cached in-memory for 1 minute.
 * Falls back to "USD" if tenant not found (defensive — never block API).
 */
export async function getTenantConfig(tenantId: string): Promise<{ defaultCurrency: string }> {
  const cached = tenantCache.get(tenantId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { defaultCurrency: cached.defaultCurrency };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { defaultCurrency: true },
  });

  const config = { defaultCurrency: tenant?.defaultCurrency ?? "USD" };
  tenantCache.set(tenantId, { ...config, cachedAt: Date.now() });
  return config;
}
