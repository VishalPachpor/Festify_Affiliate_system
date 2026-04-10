"use client";

import { type ReactNode } from "react";

/**
 * RealtimeProvider — placeholder for an SSE event bridge.
 *
 * The backend does not have a /api/events/stream endpoint yet, so the
 * bridge is disabled to stop 404 spam in the network tab. Re-enable
 * RealtimeBridge when the backend ships the SSE route — the hook
 * (use-event-bridge.ts) is already written and ready to connect.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
