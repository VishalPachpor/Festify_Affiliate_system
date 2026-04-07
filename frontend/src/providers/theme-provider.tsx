"use client";

import { type ReactNode } from "react";

export type TenantBranding = {
  primaryColor?: string;
  primaryHoverColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
};

export function buildTenantThemeVars(
  branding: TenantBranding,
): React.CSSProperties {
  const vars: Record<string, string> = {};

  if (branding.primaryColor) {
    vars["--color-primary"] = branding.primaryColor;
  }
  if (branding.primaryHoverColor) {
    vars["--color-primary-hover"] = branding.primaryHoverColor;
  }

  return vars as React.CSSProperties;
}

export function ThemeProvider({
  branding,
  children,
}: {
  branding?: TenantBranding;
  children: ReactNode;
}) {
  const style = branding ? buildTenantThemeVars(branding) : undefined;

  return <div style={style}>{children}</div>;
}
