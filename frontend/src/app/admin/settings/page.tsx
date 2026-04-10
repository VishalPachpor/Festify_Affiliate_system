"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { apiClient } from "@/services/api/client";

// ── Styles ────────────────────────────────────────────────────────────────────

const LABEL_CLASS =
  "font-[var(--font-sans)] text-[0.86rem] leading-[1rem] tracking-[0.32rem] uppercase text-[rgba(255,255,255,0.88)] font-semibold";

const INPUT_CLASS =
  "h-[3.35rem] w-full rounded-[0.6rem] border border-[rgba(255,255,255,0.10)] bg-[rgba(17,21,34,0.96)] px-[1.1rem] font-[var(--font-sans)] text-[1.05rem] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] focus:border-[var(--color-ring)] focus:outline-none transition-colors";

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
      <div className="flex min-h-[calc(100vh-var(--header-h))] flex-col px-[2.25rem] py-[2.1rem]">
        {/* Page header */}
        <div>
          <h2 className="font-[var(--font-display)] text-[2.25rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
            Campaign Settings
          </h2>
          <p className="mt-[0.55rem] font-[var(--font-sans)] text-[1rem] leading-[1.5rem] text-[rgba(255,255,255,0.56)]">
            Configure event identity and the default commission rate.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="mt-[2.35rem] grid flex-1 grid-cols-1 gap-[3.6rem] xl:grid-cols-[minmax(0,1fr)_20.5rem]">
          {/* Left: Campaign Details form */}
          <div className="flex min-h-full max-w-none flex-col">
            <h3 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
              Campaign Details
            </h3>
            <p className="mt-[0.45rem] font-[var(--font-sans)] text-[1rem] leading-[1.5rem] text-[rgba(255,255,255,0.56)]">
              Update your event identity, brand name, and payout defaults.
            </p>

            <div className="mt-[1.75rem] flex flex-col gap-[2rem]">
              <div className="flex flex-col gap-[0.72rem]">
                <label className={LABEL_CLASS}>Event Name</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-[0.72rem]">
                <label className={LABEL_CLASS}>Organization Name (White-Label)</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-[0.72rem]">
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
            <div className="mt-auto flex items-center gap-[1.5rem] pt-[3.2rem]">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="h-[3.35rem] min-w-[12.8rem] rounded-[0.65rem] bg-[var(--color-primary)] px-[2rem] font-[var(--font-sans)] text-[1rem] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving..." : "Save Settings"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-[3.35rem] min-w-[13rem] rounded-[0.65rem] border border-[rgba(255,255,255,0.12)] bg-transparent px-[2rem] font-[var(--font-sans)] text-[1rem] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
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
          <div className="flex min-h-full flex-col pt-[3.85rem]">
            <h3 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
              Current Defaults
            </h3>
            <p className="mt-[0.45rem] max-w-[18rem] font-[var(--font-sans)] text-[1rem] leading-[1.5rem] text-[rgba(255,255,255,0.56)]">
              Current saved values from the database.
            </p>

            <div className="mt-[2.25rem] flex flex-col gap-[2.35rem]">
              <div>
                <p className={LABEL_CLASS}>Event Name</p>
                <p className="mt-[0.7rem] font-[var(--font-sans)] text-[1.05rem] leading-[1.55rem] text-[var(--color-text-primary)]">
                  {settings?.eventName ?? "—"}
                </p>
              </div>

              <div>
                <p className={LABEL_CLASS}>Organization Name</p>
                <p className="mt-[0.7rem] font-[var(--font-sans)] text-[1.05rem] leading-[1.55rem] text-[var(--color-text-primary)]">
                  {settings?.orgName ?? "—"}
                </p>
              </div>

              <div>
                <p className={LABEL_CLASS}>Commission Rate</p>
                <p className="mt-[0.7rem] font-[var(--font-sans)] text-[1.05rem] leading-[1.55rem] text-[var(--color-text-primary)]">
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
