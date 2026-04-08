"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseDomainEvent, SUPPORTED_EVENT_VERSION } from "./events";
import { dispatchEvent } from "./event-handlers";
import { useConnectionStore } from "./connection-store";

const BASE_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;
const DEDUP_WINDOW_SIZE = 500;

function getReconnectDelay(attempt: number): number {
  const base = Math.min(BASE_RECONNECT_MS * 2 ** attempt, MAX_RECONNECT_MS);
  const jitter = Math.random() * base * 0.3;
  return base + jitter;
}

function getStreamUrl(tenantId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
  return `${base}/events/stream?tenantId=${encodeURIComponent(tenantId)}`;
}

/**
 * SSE event bridge with:
 * - Zod validation
 * - Tenant filtering
 * - Event version guard
 * - Deduplication (sliding window of processed IDs)
 * - Exponential backoff reconnection
 *
 * Pipeline: SSE → parse → validate → version check → dedup → tenant filter → dispatch
 */
export function useEventBridge(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  const {
    setStatus,
    recordEvent,
    incrementReconnect,
    resetReconnect,
  } = useConnectionStore();

  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tenantId) {
      setStatus("idle");
      return;
    }

    let disposed = false;

    // Reset dedup window on new connection
    processedIdsRef.current.clear();

    function connect() {
      if (disposed) return;

      eventSourceRef.current?.close();
      eventSourceRef.current = null;

      setStatus(
        useConnectionStore.getState().reconnectAttempt > 0
          ? "reconnecting"
          : "connecting",
      );

      const source = new EventSource(getStreamUrl(tenantId!));
      eventSourceRef.current = source;

      source.onopen = () => {
        if (disposed) return;
        setStatus("live");
        resetReconnect();
      };

      source.onmessage = (msg) => {
        if (disposed) return;

        // Parse + Zod validate
        const event = parseDomainEvent(msg.data);
        if (!event) return;

        // Version guard — ignore events from unsupported versions
        if (event.version !== SUPPORTED_EVENT_VERSION) return;

        // Deduplication — skip already-processed events
        if (processedIdsRef.current.has(event.id)) return;

        // Track processed ID (bounded set)
        processedIdsRef.current.add(event.id);
        if (processedIdsRef.current.size > DEDUP_WINDOW_SIZE) {
          // Evict oldest entries by rebuilding from the tail
          const ids = Array.from(processedIdsRef.current);
          processedIdsRef.current = new Set(ids.slice(-DEDUP_WINDOW_SIZE));
        }

        // Tenant filter
        if (event.tenantId !== tenantId) return;

        // Record + dispatch
        recordEvent();
        dispatchEvent(event, queryClient);
      };

      source.onerror = () => {
        if (disposed) return;

        source.close();
        setStatus("offline");

        const attempt = useConnectionStore.getState().reconnectAttempt;
        incrementReconnect();

        const delay = getReconnectDelay(attempt);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setStatus("idle");
    };
  }, [tenantId, queryClient, setStatus, recordEvent, incrementReconnect, resetReconnect]);
}
