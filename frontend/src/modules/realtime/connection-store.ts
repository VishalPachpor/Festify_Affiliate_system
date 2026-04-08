import { create } from "zustand";

export type ConnectionStatus = "idle" | "connecting" | "live" | "reconnecting" | "offline";

/**
 * Freshness derived from lastEventAt:
 * - live:    event received within last 30s
 * - recent:  event received within last 2min
 * - stale:   event received more than 2min ago
 * - offline: no events ever, or connection is down
 */
export type FreshnessStatus = "live" | "recent" | "stale" | "offline";

const LIVE_THRESHOLD_MS = 30_000;
const RECENT_THRESHOLD_MS = 120_000;

type ConnectionState = {
  status: ConnectionStatus;
  lastEventAt: number | null;
  reconnectAttempt: number;

  setStatus: (status: ConnectionStatus) => void;
  recordEvent: () => void;
  incrementReconnect: () => void;
  resetReconnect: () => void;
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "idle",
  lastEventAt: null,
  reconnectAttempt: 0,

  setStatus: (status) => set({ status }),
  recordEvent: () => set({ lastEventAt: Date.now() }),
  incrementReconnect: () =>
    set((s) => ({ reconnectAttempt: s.reconnectAttempt + 1 })),
  resetReconnect: () => set({ reconnectAttempt: 0 }),
}));

/**
 * Derive freshness from connection status and last event timestamp.
 * Pure function — no side effects.
 */
export function getFreshness(
  status: ConnectionStatus,
  lastEventAt: number | null,
): FreshnessStatus {
  if (status === "offline" || status === "idle") return "offline";
  if (!lastEventAt) return "offline";

  const age = Date.now() - lastEventAt;
  if (age < LIVE_THRESHOLD_MS) return "live";
  if (age < RECENT_THRESHOLD_MS) return "recent";
  return "stale";
}
