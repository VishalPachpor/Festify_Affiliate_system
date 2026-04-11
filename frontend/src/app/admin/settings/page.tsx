"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { apiClient } from "@/services/api/client";

// ── Styles ────────────────────────────────────────────────────────────────────

const LABEL_CLASS =
  "font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--space-4)] tracking-[var(--tracking-label)] uppercase text-[rgba(255,255,255,0.88)] font-semibold";

const INPUT_CLASS =
  "h-[var(--space-12)] w-full rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.10)] bg-[rgba(17,21,34,0.96)] px-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-base)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] focus:border-[var(--color-ring)] focus:outline-none transition-colors";

type Settings = { eventName: string; orgName: string; commissionRate: number };

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => apiClient<Settings>("/dashboard/settings"),
  });

  const [eventName, setEventName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [commissionRate, setCommissionRate] = useState("");

  // Sync form when API data loads
  useEffect(() => {
    if (settings) {
      setEventName(settings.eventName);
      setOrgName(settings.orgName);
      setCommissionRate(String(settings.commissionRate));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient("/dashboard/settings", {
        method: "PATCH",
        body: {
          eventName,
          orgName,
          commissionRate: parseFloat(commissionRate) || 10,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  function handleReset() {
    if (settings) {
      setEventName(settings.eventName);
      setOrgName(settings.orgName);
      setCommissionRate(String(settings.commissionRate));
    }
  }

  return (
    <DashboardStageCanvas>
      <div className="flex min-h-[calc(100vh-var(--header-h))] flex-col px-[var(--space-8)] py-[var(--space-8)]">
        {/* Page header */}
        <div>
          <h2 className="font-[var(--font-display)] text-[var(--text-2xl)] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
            Campaign Settings
          </h2>
          <p className="mt-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-base)] leading-[var(--space-6)] text-[rgba(255,255,255,0.56)]">
            Configure event identity and the default commission rate.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="mt-[var(--space-8)] grid flex-1 grid-cols-1 gap-[var(--space-16)] xl:grid-cols-[minmax(0,1fr)_20.5rem]">
          {/* Left: Campaign Details form */}
          <div className="flex min-h-full max-w-none flex-col">
            <h3 className="font-[var(--font-display)] text-[var(--text-2xl)] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
              Campaign Details
            </h3>
            <p className="mt-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-base)] leading-[var(--space-6)] text-[rgba(255,255,255,0.56)]">
              Update your event identity, brand name, and payout defaults.
            </p>

            <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-8)]">
              <div className="flex flex-col gap-[var(--space-3)]">
                <label className={LABEL_CLASS}>Event Name</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-[var(--space-3)]">
                <label className={LABEL_CLASS}>Organization Name (White-Label)</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-[var(--space-3)]">
                <label className={LABEL_CLASS}>Default Commission Rate (%)</label>
                <input
                  type="text"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-auto flex items-center gap-[var(--space-6)] pt-[var(--space-12)]">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-[var(--space-12)] min-w-[12rem] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-8)] font-[var(--font-sans)] text-[var(--text-base)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving..." : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-[var(--space-12)] min-w-[12rem] rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-8)] font-[var(--font-sans)] text-[var(--text-base)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
              >
                Reset
              </button>
              {saveMutation.isSuccess && (
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[#22C55E]">
                  Saved!
                </span>
              )}
            </div>
          </div>

          {/* Right: Current Defaults */}
          <div className="flex min-h-full flex-col pt-[var(--space-16)]">
            <h3 className="font-[var(--font-display)] text-[var(--text-2xl)] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
              Current Defaults
            </h3>
            <p className="mt-[var(--space-2)] max-w-[18rem] font-[var(--font-sans)] text-[var(--text-base)] leading-[var(--space-6)] text-[rgba(255,255,255,0.56)]">
              Current saved values from the database.
            </p>

            <div className="mt-[var(--space-8)] flex flex-col gap-[var(--space-8)]">
              <div>
                <p className={LABEL_CLASS}>Event Name</p>
                <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-base)] leading-[var(--space-6)] text-[var(--color-text-primary)]">
                  {settings?.eventName ?? "—"}
                </p>
              </div>

              <div>
                <p className={LABEL_CLASS}>Organization Name</p>
                <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-base)] leading-[var(--space-6)] text-[var(--color-text-primary)]">
                  {settings?.orgName ?? "—"}
                </p>
              </div>

              <div>
                <p className={LABEL_CLASS}>Commission Rate</p>
                <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-base)] leading-[var(--space-6)] text-[var(--color-text-primary)]">
                  {settings?.commissionRate ?? 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardStageCanvas>
  );
}
