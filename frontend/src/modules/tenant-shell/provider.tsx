"use client";

import { createContext, useContext, type ReactNode } from "react";
import { buildTenantThemeVars } from "./theme";
import type { Tenant, TenantContext } from "./types";

const TenantCtx = createContext<TenantContext>({
  tenant: null,
  isResolved: false,
});

export function useTenant() {
  return useContext(TenantCtx);
}

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: Tenant | null;
  children: ReactNode;
}) {
  const style = tenant?.branding
    ? buildTenantThemeVars(tenant.branding)
    : undefined;

  return (
    <TenantCtx.Provider value={{ tenant, isResolved: true }}>
      <div style={style}>{children}</div>
    </TenantCtx.Provider>
  );
}
