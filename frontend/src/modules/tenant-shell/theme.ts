import type { TenantBranding } from "./types";

/**
 * Convert tenant branding config to CSS custom properties.
 * These override :root tokens at runtime for white-label theming.
 */
export function buildTenantThemeVars(
  branding: TenantBranding,
): React.CSSProperties {
  const vars: Record<string, string> = {};

  if (branding.primaryColor) {
    vars["--color-primary"] = branding.primaryColor;
  }
  if (branding.primaryHoverColor) {
    vars["--color-primary-hover"] = branding.primaryHoverColor;
    vars["--color-ring"] = branding.primaryHoverColor;
  }

  return vars as React.CSSProperties;
}
