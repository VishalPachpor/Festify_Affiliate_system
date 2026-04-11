"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

// ─── Types ────────────────────────────────────────────────────────────────────

type LumaStatus = {
  provider: string;
  connected: boolean;
  webhookUrl: string;
  connectionId: string | null;
  lastEventAt: string | null;
  eventCount: number;
  lastEventType: string | null;
};

type ConnectResponse = {
  provider: string;
  connectionId: string;
  webhookUrl: string;
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
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#FF5F1F" />
      <path d="M14 11v18h12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M3.5 5.5l3.5 3.5 3.5-3.5" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) > 1 ? "s" : ""} ago`;
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
    <div className="flex flex-col gap-[var(--space-2)]">
      <label className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.50)]">
        {label}
      </label>
      <div className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.25)] px-[var(--space-3)] py-[var(--space-2)]">
        <code className="flex-1 truncate font-mono text-[var(--text-sm)] text-[var(--color-text-primary)]">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex shrink-0 items-center gap-[var(--space-1)] rounded-[var(--radius)] border px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] transition-colors ${
            copied
              ? "border-[rgba(34,197,94,0.40)] text-[#22C55E]"
              : "border-[rgba(255,255,255,0.12)] text-[var(--color-text-primary)] hover:border-[rgba(255,255,255,0.20)]"
          }`}
        >
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ─── Setup steps ─────────────────────────────────────────────────────────────

const SETUP_STEPS = [
  "Go to your **Luma Dashboard**",
  "Open: **Calendar → Settings → Developer → Webhooks**",
  'Click **"Add Webhook"**',
  "Paste the **Webhook URL** below",
  "Select events: **ticket.registered** (required), guest.registered (optional)",
  "Add custom header with the **Connection ID** below",
  "**Save** and send a test event",
];

function StepText({ text }: { text: string }) {
  // Simple bold markdown rendering
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="text-[var(--color-text-primary)]">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// ─── Luma Integration Card ───────────────────────────────────────────────────

function LumaIntegrationCard() {
  const queryClient = useQueryClient();
  const instructionsRef = useRef<HTMLDivElement>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const { data: status, isLoading } = useQuery<LumaStatus>({
    queryKey: ["integrations", "luma"],
    queryFn: () => apiClient<LumaStatus>("/integrations/luma/status"),
    refetchInterval: 5000,
  });

  const connectMutation = useMutation({
    mutationFn: () =>
      apiClient<ConnectResponse>("/integrations/luma/connect", {
        method: "POST",
        body: {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "luma"] });
    },
  });

  // Auto-scroll to instructions after connect
  useEffect(() => {
    if (connectMutation.isSuccess && instructionsRef.current) {
      instructionsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [connectMutation.isSuccess]);

  const isConnected = status?.connected ?? false;
  const hasEvents = (status?.eventCount ?? 0) > 0;
  const webhookUrl = status?.webhookUrl ?? "";
  const connectionId = status?.connectionId ?? "";

  // Determine status state
  type StatusState = "loading" | "not_connected" | "waiting" | "connected";
  let statusState: StatusState = "not_connected";
  if (isLoading) statusState = "loading";
  else if (isConnected && hasEvents) statusState = "connected";
  else if (isConnected && !hasEvents) statusState = "waiting";

  return (
    <div className="rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.10)] bg-transparent">
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--space-4)] px-[var(--space-6)] pt-[var(--space-6)] pb-[var(--space-5)]">
        <div className="flex items-center gap-[var(--space-4)]">
          <IconLuma />
          <div>
            <h3 className="font-[var(--font-display)] text-[var(--text-xl)] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
              Luma Integration
            </h3>
            <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.55)]">
              Sync ticket sales from your Luma events automatically
            </p>
          </div>
        </div>

        {/* Status badge */}
        {statusState === "loading" ? (
          <div className="h-[var(--space-6)] w-[7rem] animate-pulse rounded-full bg-[rgba(255,255,255,0.08)]" />
        ) : statusState === "connected" ? (
          <span className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.10)] px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#22C55E]">
            <span className="relative flex size-[var(--space-2)]">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
              <span className="relative inline-flex size-full rounded-full bg-[#22C55E]" />
            </span>
            Connected
          </span>
        ) : statusState === "waiting" ? (
          <span className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[rgba(234,179,8,0.30)] bg-[rgba(234,179,8,0.10)] px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#EAB308]">
            <span className="size-[var(--space-2)] animate-pulse rounded-full bg-[#EAB308]" />
            Waiting for webhook...
          </span>
        ) : (
          <span className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[rgba(255,255,255,0.50)]">
            <span className="size-[var(--space-2)] rounded-full bg-[rgba(255,255,255,0.30)]" />
            Not Connected
          </span>
        )}
      </div>

      {/* Connect button (when not connected) */}
      {!isConnected && !connectMutation.isSuccess && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-[var(--space-6)] py-[var(--space-5)]">
          <button
            type="button"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {connectMutation.isPending ? "Setting up..." : "Connect Luma"}
          </button>
          <p className="mt-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.40)]">
            Generates a webhook URL and connection ID for your Luma account.
          </p>
        </div>
      )}

      {/* Error */}
      {connectMutation.isError && (
        <div className="mx-[var(--space-6)] mb-[var(--space-4)] rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
          Failed to connect. Please try again.
        </div>
      )}

      {/* Webhook setup section (shown when connected or just connected) */}
      {(isConnected || connectMutation.isSuccess) && (
        <div ref={instructionsRef} className="border-t border-[rgba(255,255,255,0.06)] px-[var(--space-6)] py-[var(--space-5)]">
          {/* Setup instructions */}
          <h4 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
            Connect your Luma account
          </h4>
          <ol className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
            {SETUP_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-[var(--space-3)]">
                <span className="flex size-[var(--space-6)] shrink-0 items-center justify-center rounded-full bg-[rgba(91,141,239,0.15)] font-[var(--font-sans)] text-[var(--text-xs)] font-semibold text-[#5B8DEF]">
                  {i + 1}
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--space-6)] text-[rgba(255,255,255,0.70)]">
                  <StepText text={step} />
                </span>
              </li>
            ))}
          </ol>

          {/* Copy blocks */}
          <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-4)]">
            <CopyField label="Webhook URL" value={webhookUrl} />
            <div className="flex flex-col gap-[var(--space-2)]">
              <label className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.50)]">
                Custom Header
              </label>
              <div className="grid grid-cols-2 gap-[var(--space-2)]">
                <CopyField label="Key" value="x-provider-connection-id" />
                <CopyField label="Value" value={connectionId} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live status section */}
      {isConnected && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-[var(--space-6)] py-[var(--space-5)]">
          <h4 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
            Live Status
          </h4>
          <div className="mt-[var(--space-4)] grid grid-cols-3 gap-[var(--space-4)]">
            <div>
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">
                Last webhook received
              </p>
              <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                {timeAgo(status?.lastEventAt ?? null)}
              </p>
            </div>
            <div>
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">
                Total events received
              </p>
              <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                {status?.eventCount ?? 0}
              </p>
            </div>
            <div>
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">
                Last event type
              </p>
              <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                {status?.lastEventType ?? "—"}
              </p>
            </div>
          </div>

          {/* Warning if connected but no events */}
          {!hasEvents && (
            <div className="mt-[var(--space-4)] rounded-[var(--radius)] border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.06)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#EAB308]">
              No webhook events received yet. Send a test event from Luma to verify.
            </div>
          )}
        </div>
      )}

      {/* Troubleshooting (collapsible) */}
      {isConnected && (
        <div className="border-t border-[rgba(255,255,255,0.06)]">
          <button
            type="button"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="flex w-full items-center justify-between px-[var(--space-6)] py-[var(--space-4)] text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
          >
            <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[rgba(255,255,255,0.60)]">
              Having trouble?
            </span>
            <IconChevron open={showTroubleshooting} />
          </button>
          {showTroubleshooting && (
            <div className="px-[var(--space-6)] pb-[var(--space-5)]">
              <ul className="flex flex-col gap-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.60)]">
                <li>Make sure the webhook URL is copied exactly (no extra spaces)</li>
                <li>Ensure <strong className="text-[var(--color-text-primary)]">ticket.registered</strong> is selected as an event type</li>
                <li>Verify the <strong className="text-[var(--color-text-primary)]">x-provider-connection-id</strong> header is added with the correct value</li>
                <li>Try sending a test event from Luma&apos;s webhook settings</li>
                <li>Check that your Luma calendar has an active <strong className="text-[var(--color-text-primary)]">Luma Plus</strong> subscription</li>
              </ul>
            </div>
          )}
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
        <div>
          <h2 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
            Integrations
          </h2>
          <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
            Connect your ticketing platform to automatically sync sales and attribution.
          </p>
        </div>

        <LumaIntegrationCard />
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
