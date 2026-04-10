"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/modules/tenant-shell";
import { apiClient } from "@/services/api/client";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = {
  provider: string;
  connected: boolean;
  webhookUrl: string;
  connectionId: string | null;
  lastEventAt: string | null;
};

type ConnectResponse = {
  provider: string;
  connectionId: string;
  webhookUrl: string;
  headerName: string;
  instructions: string[];
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7l3 3 5-5" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.2" />
      <path d="M2 9V3a1 1 0 011-1h6" />
    </svg>
  );
}

function IconLuma() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#FF5F1F" />
      <path d="M11 9v14h10" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── CopyField ────────────────────────────────────────────────────────────────

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-[0.4rem]">
      <label className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.50)]">
        {label}
      </label>
      <div className="flex items-center gap-[0.5rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-[var(--space-3)] py-[0.55rem]">
        <code className="flex-1 truncate font-[var(--font-mono)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-[0.3rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] px-[0.6rem] py-[0.25rem] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
        >
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ─── Luma Card ────────────────────────────────────────────────────────────────

function LumaCard() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [showInstructions, setShowInstructions] = useState(false);
  const [connectResult, setConnectResult] = useState<ConnectResponse | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["integrations", "luma", tenant?.id],
    queryFn: () => apiClient<IntegrationStatus>("/integrations/luma/status", {
      headers: { "x-tenant-id": tenant!.id },
    }),
    enabled: !!tenant?.id,
  });

  const connectMutation = useMutation({
    mutationFn: () => apiClient<ConnectResponse>("/integrations/luma/connect", {
      method: "POST",
      headers: { "x-tenant-id": tenant!.id },
      body: {},
    }),
    onSuccess: (data) => {
      setConnectResult(data);
      setShowInstructions(true);
      queryClient.invalidateQueries({ queryKey: ["integrations", "luma"] });
    },
    onError: (err) => {
      console.error("[luma-connect] failed:", err);
    },
  });

  const connectError = connectMutation.error instanceof Error
    ? connectMutation.error.message
    : null;

  const isConnected = status?.connected ?? false;

  return (
    <div className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-transparent p-[1.5rem]">
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className="flex items-start gap-[1rem]">
          <IconLuma />
          <div>
            <h3 className="font-[var(--font-display)] text-[1.25rem] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
              Luma
            </h3>
            <p className="mt-[0.3rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.55)]">
              Sync ticket sales from your Luma events
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-[var(--space-3)]">
          {isLoading ? (
            <div className="h-[1.5rem] w-[6rem] animate-pulse rounded-full bg-[rgba(255,255,255,0.08)]" />
          ) : isConnected ? (
            <span className="inline-flex items-center gap-[0.3rem] rounded-full border border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.12)] px-[0.7rem] py-[0.2rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#22C55E]">
              <span className="size-[0.4rem] rounded-full bg-[#22C55E]" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-[0.3rem] rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-[0.7rem] py-[0.2rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[rgba(255,255,255,0.55)]">
              <span className="size-[0.4rem] rounded-full bg-[rgba(255,255,255,0.30)]" />
              Not Connected
            </span>
          )}

          {!isConnected && (
            <button
              type="button"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-4)] py-[0.5rem] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {connectMutation.isPending ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {connectError && (
        <div className="mt-[var(--space-4)] rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[0.6rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
          Failed to connect Luma: {connectError}
        </div>
      )}

      {/* Connection details (when connected OR after connect button click) */}
      {(isConnected || connectResult) && (
        <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-4)]">
          {/* Last event timestamp */}
          {isConnected && status?.lastEventAt && (
            <div className="flex items-center gap-[var(--space-2)] text-[var(--text-xs)]">
              <span className="text-[rgba(255,255,255,0.50)]">Last webhook received:</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {timeAgo(status.lastEventAt)}
              </span>
            </div>
          )}

          {/* Webhook URL + Connection ID */}
          <CopyField
            label="Webhook URL"
            value={connectResult?.webhookUrl ?? status?.webhookUrl ?? ""}
          />
          <CopyField
            label="Connection ID (header value)"
            value={connectResult?.connectionId ?? status?.connectionId ?? ""}
          />
        </div>
      )}

      {/* Setup instructions */}
      {showInstructions && connectResult && (
        <div className="mt-[var(--space-5)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-[var(--space-4)]">
          <h4 className="font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
            Setup Instructions
          </h4>
          <ol className="mt-[var(--space-3)] flex flex-col gap-[0.6rem]">
            {connectResult.instructions.map((step, i) => (
              <li key={i} className="flex items-start gap-[0.6rem]">
                <span className="flex size-[1.4rem] shrink-0 items-center justify-center rounded-full bg-[rgba(91,141,239,0.18)] font-[var(--font-sans)] text-[var(--text-xs)] font-semibold text-[#5B8DEF]">
                  {i + 1}
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.4rem] text-[rgba(255,255,255,0.75)]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Header */}
        <div>
          <h2 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
            Integrations
          </h2>
          <p className="mt-[0.3rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
            Connect external platforms to automatically sync ticket sales and attribution.
          </p>
        </div>

        {/* Integration cards */}
        <div className="flex flex-col gap-[var(--space-4)]">
          <LumaCard />
        </div>
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
