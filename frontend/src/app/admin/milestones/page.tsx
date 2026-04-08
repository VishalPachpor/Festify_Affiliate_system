"use client";

import { useState } from "react";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

// ── Types ─────────────────────────────────────────────────────────────────────

type UnlockType = "Auto-unlock" | "Locked";

type Milestone = {
  id: string;
  letter: string;
  name: string;
  description: string;
  threshold: number;
  unlockType: UnlockType;
  tileText: string;
  tileBorder: string;
  tileBg: string;
};

// ── Tier styles (matching affiliate milestones page) ──────────────────────────

const TIER_PRESETS: Record<string, { tileText: string; tileBorder: string; tileBg: string }> = {
  bronze:   { tileText: "#E19A3E", tileBorder: "#9F6B33", tileBg: "rgba(225,154,62,0.12)" },
  silver:   { tileText: "#DADCE3", tileBorder: "#8F93A0", tileBg: "rgba(218,220,227,0.12)" },
  gold:     { tileText: "#FFD620", tileBorder: "#9E8F19", tileBg: "rgba(255,214,32,0.12)" },
  platinum: { tileText: "#E2E4EB", tileBorder: "#8C909D", tileBg: "rgba(226,228,235,0.12)" },
};

// ── Initial data ──────────────────────────────────────────────────────────────

const INITIAL_MILESTONES: Milestone[] = [
  { id: "bronze", letter: "B", name: "Bronze", description: "Event VIP pass upgrade", threshold: 1000, unlockType: "Auto-unlock", ...TIER_PRESETS.bronze },
  { id: "silver", letter: "S", name: "Silver", description: "Backstage / speaker lounge access", threshold: 5000, unlockType: "Auto-unlock", ...TIER_PRESETS.silver },
  { id: "gold", letter: "G", name: "Gold", description: "Speaking / panel opportunity", threshold: 10000, unlockType: "Locked", ...TIER_PRESETS.gold },
  { id: "platinum", letter: "P", name: "Platinum", description: "Revenue share increase to 15%", threshold: 25000, unlockType: "Locked", ...TIER_PRESETS.platinum },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconMilestone() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2h8v5a4 4 0 01-8 0V2z" />
      <path d="M2 2h2M12 2h2" />
      <path d="M8 11v3M5 14h6" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M4 4l.7 9.1a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 5.5l3.5 3.5 3.5-3.5" />
    </svg>
  );
}

// ── Tile icon (reused from affiliate milestones) ──────────────────────────────

function TierTile({
  letter,
  tileText,
  tileBorder,
  tileBg,
}: {
  letter: string;
  tileText: string;
  tileBorder: string;
  tileBg: string;
}) {
  return (
    <div
      className="flex size-[3.5rem] shrink-0 items-center justify-center rounded-[0.55rem] border font-[var(--font-sans)] text-[1.4rem] font-semibold"
      style={{ borderColor: tileBorder, color: tileText, background: tileBg }}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}

// ── Unlock badge ──────────────────────────────────────────────────────────────

function UnlockBadge({ type }: { type: UnlockType }) {
  if (type === "Auto-unlock") {
    return (
      <span className="inline-block rounded-[0.25rem] bg-[rgba(34,197,94,0.14)] px-[0.5rem] py-[0.15rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#22C55E]">
        Auto-unlock
      </span>
    );
  }
  return (
    <span className="inline-block rounded-[0.25rem] bg-[rgba(239,68,68,0.14)] px-[0.5rem] py-[0.15rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#EF4444]">
      Locked
    </span>
  );
}

// ── Input field styling ───────────────────────────────────────────────────────

const INPUT_CLASS =
  "h-[2.5rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] focus:border-[var(--color-ring)] focus:outline-none transition-colors";

const LABEL_CLASS =
  "font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[0.08em] uppercase text-[rgba(255,255,255,0.50)] font-semibold";

// ── Modal ─────────────────────────────────────────────────────────────────────

function AddMilestoneModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (m: { name: string; threshold: number; reward: string; unlockType: UnlockType }) => void;
}) {
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("");
  const [reward, setReward] = useState("");
  const [unlockType, setUnlockType] = useState<UnlockType>("Auto-unlock");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !threshold || !reward) return;
    onAdd({ name, threshold: Number(threshold), reward, unlockType });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.60)]">
      <div className="w-full max-w-[28rem] rounded-[0.75rem] border border-[rgba(255,255,255,0.08)] bg-[#111525] px-[2rem] py-[1.75rem]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-[1.5rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
            Add New Milestone
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[rgba(255,255,255,0.40)] transition-colors hover:text-[var(--color-text-primary)]"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-[1.5rem] flex flex-col gap-[1.25rem]">
          {/* Tier Name */}
          <div className="flex flex-col gap-[0.4rem]">
            <label className={LABEL_CLASS}>Tier Name</label>
            <input
              type="text"
              placeholder="e.g. Diamond"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {/* Target Sales */}
          <div className="flex flex-col gap-[0.4rem]">
            <label className={LABEL_CLASS}>Target Sales ($)</label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {/* Reward */}
          <div className="flex flex-col gap-[0.4rem]">
            <label className={LABEL_CLASS}>Reward</label>
            <input
              type="text"
              placeholder="e.g. Exclusive lounge access"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {/* Unlock Type */}
          <div className="flex flex-col gap-[0.4rem]">
            <label className={LABEL_CLASS}>Unlock Type</label>
            <div className="relative">
              <select
                value={unlockType}
                onChange={(e) => setUnlockType(e.target.value as UnlockType)}
                className={`${INPUT_CLASS} appearance-none pr-[2.5rem]`}
              >
                <option value="Auto-unlock">Auto-unlock</option>
                <option value="Locked">Locked</option>
              </select>
              <span className="pointer-events-none absolute right-[var(--space-3)] top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.40)]">
                <IconChevronDown />
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-[0.5rem] flex gap-[var(--space-3)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent py-[0.6rem] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-[var(--radius)] bg-[var(--color-primary)] py-[0.6rem] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Add Milestone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminMilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  const [showModal, setShowModal] = useState(false);

  function handleAdd(data: { name: string; threshold: number; reward: string; unlockType: UnlockType }) {
    const letter = data.name.charAt(0).toUpperCase();
    const preset = TIER_PRESETS.bronze; // default style for new tiers
    const newMilestone: Milestone = {
      id: `custom-${Date.now()}`,
      letter,
      name: data.name,
      description: data.reward,
      threshold: data.threshold,
      unlockType: data.unlockType,
      ...preset,
    };
    setMilestones((prev) => [...prev, newMilestone]);
    setShowModal(false);
  }

  function handleDelete(id: string) {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }

  function handleThresholdChange(id: string, value: string) {
    const num = Number(value.replace(/[^0-9]/g, ""));
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, threshold: num } : m)),
    );
  }

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
              Milestones: Rewards & Incentives
            </h2>
            <p className="mt-[0.3rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
              Configure sales thresholds and rewards for affiliates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-[0.5rem] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <IconMilestone />
            Add Milestone +
          </button>
        </div>

        {/* Milestone cards */}
        <div className="flex flex-col gap-[var(--space-4)]">
          {milestones.map((m) => (
            <article
              key={m.id}
              className="rounded-[0.45rem] border border-[rgba(255,255,255,0.08)] bg-transparent px-[1.5rem] py-[1.3rem]"
            >
              <div className="flex items-start justify-between">
                {/* Left: tile + info */}
                <div className="flex items-start gap-[1rem]">
                  <TierTile
                    letter={m.letter}
                    tileText={m.tileText}
                    tileBorder={m.tileBorder}
                    tileBg={m.tileBg}
                  />
                  <div>
                    <h3 className="font-[var(--font-display)] text-[1.35rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
                      {m.name}
                    </h3>
                    <p className="mt-[0.25rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
                      {m.description}
                    </p>

                    {/* Revenue threshold input */}
                    <div className="mt-[0.75rem]">
                      <label className={LABEL_CLASS}>Revenue Threshold ($)</label>
                      <input
                        type="text"
                        value={formatCurrency(m.threshold)}
                        onChange={(e) => handleThresholdChange(m.id, e.target.value)}
                        className={`mt-[0.35rem] max-w-[16rem] ${INPUT_CLASS}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: badge + delete */}
                <div className="flex items-center gap-[var(--space-3)]">
                  <UnlockBadge type={m.unlockType} />
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    aria-label={`Delete ${m.name}`}
                    className="flex items-center justify-center text-[#EF4444] transition-colors hover:text-[#FF6B6B]"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </DashboardContainer>

      {/* Add Milestone Modal */}
      {showModal && (
        <AddMilestoneModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </DashboardStageCanvas>
  );
}
