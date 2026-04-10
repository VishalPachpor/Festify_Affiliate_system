/**
 * Get tenant configuration. Cached in-memory for 1 minute.
 * Falls back to "USD" if tenant not found (defensive — never block API).
 */
export declare function getTenantConfig(tenantId: string): Promise<{
    defaultCurrency: string;
}>;
//# sourceMappingURL=tenant.d.ts.map