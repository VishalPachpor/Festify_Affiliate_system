"use client";

import { useState } from "react";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

// ── Styles ────────────────────────────────────────────────────────────────────

const LABEL_CLASS =
  "font-[var(--font-sans)] text-[0.86rem] leading-[1rem] tracking-[0.32rem] uppercase text-[rgba(255,255,255,0.88)] font-semibold";

const INPUT_CLASS =
  "h-[3.35rem] w-full rounded-[0.6rem] border border-[rgba(255,255,255,0.10)] bg-[rgba(17,21,34,0.96)] px-[1.1rem] font-[var(--font-sans)] text-[1.05rem] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] focus:border-[var(--color-ring)] focus:outline-none transition-colors";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [eventName, setEventName] = useState("TOKEN2049 Singapore 2026");
  const [orgName, setOrgName] = useState("TOKEN2049");
  const [commissionRate, setCommissionRate] = useState("10%");

  const [saved, setSaved] = useState({ eventName: "TOKEN2049 Singapore 2026", orgName: "TOKEN2049 Singapore 2026", commissionRate: "10%" });

  function handleSave() {
    setSaved({ eventName, orgName, commissionRate });
  }

  function handleReset() {
    setEventName("TOKEN2049 Singapore 2026");
    setOrgName("TOKEN2049");
    setCommissionRate("10%");
    setSaved({ eventName: "TOKEN2049 Singapore 2026", orgName: "TOKEN2049 Singapore 2026", commissionRate: "10%" });
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
            <div className="mt-auto flex gap-[1.5rem] pt-[3.2rem]">
              <button
                type="button"
                onClick={handleSave}
                className="h-[3.35rem] min-w-[12.8rem] rounded-[0.65rem] bg-[var(--color-primary)] px-[2rem] font-[var(--font-sans)] text-[1rem] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
              >
                Save Settings
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-[3.35rem] min-w-[13rem] rounded-[0.65rem] border border-[#E4544A] bg-transparent px-[2rem] font-[var(--font-sans)] text-[1rem] font-medium text-[#F0635B] transition-colors hover:bg-[rgba(239,68,68,0.08)]"
              >
                Reset All Data
              </button>
            </div>
          </div>

          {/* Right: Current Defaults */}
          <div className="flex min-h-full flex-col pt-[3.85rem]">
            <h3 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
              Current Defaults
            </h3>
            <p className="mt-[0.45rem] max-w-[18rem] font-[var(--font-sans)] text-[1rem] leading-[1.5rem] text-[rgba(255,255,255,0.56)]">
              Update your event identity, brand name, and payout defaults.
            </p>

            <div className="mt-[2.25rem] flex flex-col gap-[2.35rem]">
              <div>
                <p className={LABEL_CLASS}>Event Name</p>
                <p className="mt-[0.7rem] font-[var(--font-sans)] text-[1.05rem] leading-[1.55rem] text-[var(--color-text-primary)]">
                  {saved.eventName}
                </p>
              </div>

              <div>
                <p className={LABEL_CLASS}>Organization Name</p>
                <p className="mt-[0.7rem] font-[var(--font-sans)] text-[1.05rem] leading-[1.55rem] text-[var(--color-text-primary)]">
                  {saved.orgName}
                </p>
              </div>

              <div>
                <p className={LABEL_CLASS}>Commission Rate</p>
                <p className="mt-[0.7rem] font-[var(--font-sans)] text-[1.05rem] leading-[1.55rem] text-[var(--color-text-primary)]">
                  {saved.commissionRate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardStageCanvas>
  );
}
