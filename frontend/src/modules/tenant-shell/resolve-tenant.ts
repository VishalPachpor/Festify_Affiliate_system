import type { Tenant } from "./types";

/**
 * Resolve tenant from hostname.
 *
 * Resolution order:
 * 1. Custom domain → lookup in API
 * 2. Subdomain (e.g. acme.festify.io) → extract slug
 * 3. Fallback → null (public/auth pages)
 *
 * In dev, uses NEXT_PUBLIC_TENANT_SLUG env var.
 */
export async function resolveTenant(
  hostname: string,
): Promise<Tenant | null> {
  // Mock mode — always return a tenant so queries fire
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return {
      id: "mock-tenant",
      slug: "token2049",
      name: "TOKEN2049 Singapore",
      branding: {},
    };
  }

  // Dev override — uses a real tenant id seeded in the backend so writes
  // (e.g. ProviderConnection.create) don't fail with FK violations.
  const devTenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  const devSlug = process.env.NEXT_PUBLIC_TENANT_SLUG;
  if (devTenantId) {
    const slug = devSlug ?? "demo";
    return {
      id: devTenantId,
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      branding: {},
    };
  }
  if (devSlug) {
    return {
      id: `dev-${devSlug}`,
      slug: devSlug,
      name: devSlug.charAt(0).toUpperCase() + devSlug.slice(1),
      branding: {},
    };
  }

  // Extract subdomain from hostname
  const parts = hostname.split(".");
  if (parts.length < 3) {
    return null; // No subdomain — public/auth context
  }

  const slug = parts[0];
  if (slug === "www" || slug === "app") {
    return null;
  }

  // TODO: Replace with API call when backend is ready
  // return apiClient<Tenant>(`/tenants/resolve?slug=${slug}`);
  return {
    id: `tenant-${slug}`,
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    branding: {},
  };
}
