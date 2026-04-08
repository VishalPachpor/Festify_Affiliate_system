export type TenantBranding = {
  primaryColor?: string;
  primaryHoverColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  branding: TenantBranding;
};

export type TenantContext = {
  tenant: Tenant | null;
  isResolved: boolean;
};
