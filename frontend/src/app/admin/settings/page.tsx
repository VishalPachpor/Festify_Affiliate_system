"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { apiClient } from "@/services/api/client";

// ── Styles (Figma 101:9329) ───────────────────────────────────────────────────

// Label: Open Sauce Sans Medium 12/18, tracking 4px, uppercase, #f0f0f0
const LABEL_CLASS =
  "font-[var(--font-sans)] text-[12px] font-medium leading-[18px] tracking-[4px] uppercase text-[#f0f0f0]";

// Input: 40.19px tall, #111522 fill, 10% white hairline, 8px radius, 10×16 padding
const INPUT_CLASS =
  "h-[40px] w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#111522] px-[16px] py-[10px] font-[var(--font-sans)] text-[14px] text-white placeholder:text-[rgba(255,255,255,0.30)] focus:border-[var(--color-ring)] focus:outline-none transition-colors";

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

  // Figma 101:9329 — values are rendered as static read-only text (16/28 body)
  const VALUE_CLASS =
    "mt-[8px] font-[var(--font-sans)] text-[16px] leading-[28px] text-white";

  return (
    <DashboardStageCanvas>
      <div className="flex flex-col px-[32px] py-[32px]">
        {/* Page header — Campaign Settings (Oswald Bold 24/32 #fff, desc #b0b8cc) */}
        <div className="flex flex-col gap-[8px]">
          <h2 className="font-[var(--font-display)] text-[24px] font-bold leading-[32px] tracking-[-0.3px] text-white">
            Campaign Settings
          </h2>
          <p className="font-[var(--font-sans)] text-[14px] leading-[21px] text-[#b0b8cc]">
            Configure event identity and the default commission rate.
          </p>
        </div>

        {/* Form + Current Defaults — Figma col ratio 796 : 300 w/ 40px gap */}
        <div className="mt-[32px] grid grid-cols-1 gap-[40px] xl:grid-cols-[minmax(0,796px)_300px]">
          {/* Left: Campaign Details form */}
          <div className="flex flex-col">
            {/* Section head — Oswald Medium 18/20 #f0f0f0, gap 8, body 14/21 #b0b8cc */}
            <div className="flex flex-col gap-[8px]">
              <h3 className="font-[var(--font-display)] text-[18px] font-medium leading-[20px] tracking-[-0.2px] text-[#f0f0f0]">
                Campaign Details
              </h3>
              <p className="font-[var(--font-sans)] text-[14px] leading-[21px] text-[#b0b8cc]">
                Update your event identity, brand name, and payout defaults.
              </p>
            </div>

            {/* Fields — 32px between containers, 8px label→input */}
            <div className="mt-[32px] flex flex-col gap-[32px]">
              <div className="flex flex-col gap-[8px]">
                <label className={LABEL_CLASS}>Event Name</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className={LABEL_CLASS}>Organization Name (White-Label)</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-[8px]">
                <label className={LABEL_CLASS}>Default Commission Rate (%)</label>
                <input
                  type="text"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          {/* Right: Current Defaults (Figma 101:11040, 300 wide) */}
          <div className="flex flex-col">
            <div className="flex flex-col gap-[8px]">
              <h3 className="font-[var(--font-display)] text-[18px] font-medium leading-[20px] tracking-[-0.2px] text-[#f0f0f0]">
                Current Defaults
              </h3>
              <p className="font-[var(--font-sans)] text-[14px] leading-[21px] text-[#b0b8cc]">
                Update your event identity, brand name, and payout defaults.
              </p>
            </div>

            <div className="mt-[32px] flex flex-col gap-[32px]">
              <div>
                <p className={LABEL_CLASS}>Event Name</p>
                <p className={VALUE_CLASS}>{settings?.eventName ?? "—"}</p>
              </div>
              <div>
                <p className={LABEL_CLASS}>Organization Name</p>
                <p className={VALUE_CLASS}>{settings?.orgName ?? "—"}</p>
              </div>
              <div>
                <p className={LABEL_CLASS}>Commission Rate</p>
                <p className={VALUE_CLASS}>{settings?.commissionRate ?? 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons — Figma Frame 29 at 32px below grid, 24px gap */}
        <div className="mt-[32px] flex items-center gap-[24px]">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-[8px] bg-[#1c4aa6] px-[40px] py-[12px] font-[var(--font-sans)] text-[14px] font-semibold leading-[21px] text-[#f0f0f0] transition-colors hover:bg-[#1a3f8f] disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-[8px] border border-[#ef4444] bg-[rgba(239,68,68,0.04)] px-[40px] py-[12px] font-[var(--font-sans)] text-[14px] font-semibold leading-[21px] text-[#ef4444] transition-colors hover:bg-[rgba(239,68,68,0.1)]"
          >
            Reset All Data
          </button>
          {saveMutation.isSuccess && (
            <span className="font-[var(--font-sans)] text-[14px] text-[#22c55e]">
              Saved!
            </span>
          )}
        </div>
      </div>
    </DashboardStageCanvas>
  );
}
