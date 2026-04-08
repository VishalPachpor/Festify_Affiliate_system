"use client";

import { type ReactNode } from "react";
import { useTenant } from "@/modules/tenant-shell";
import { useEventBridge } from "./use-event-bridge";

/**
 * RealtimeProvider — activates the SSE event bridge when a tenant is resolved.
 * Must be rendered inside QueryProvider and TenantProvider.
 */
function RealtimeBridge() {
  const { tenant } = useTenant();
  useEventBridge(tenant?.id);
  return null;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <RealtimeBridge />
      {children}
    </>
  );
}
