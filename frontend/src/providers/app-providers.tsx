"use client";

import { type ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { TenantProvider } from "@/modules/tenant-shell";
import { RealtimeProvider } from "@/modules/realtime";
import type { Tenant } from "@/modules/tenant-shell";

type AppProvidersProps = {
  tenant?: Tenant | null;
  children: ReactNode;
};

export function AppProviders({ tenant = null, children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <TenantProvider tenant={tenant}>
        <RealtimeProvider>{children}</RealtimeProvider>
      </TenantProvider>
    </QueryProvider>
  );
}
