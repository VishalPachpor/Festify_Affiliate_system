"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { useTenant } from "@/modules/tenant-shell";
import { useMilestoneTiers } from "@/modules/milestones";
import type { MilestoneTier } from "@/modules/milestones";
import { apiClient } from "@/services/api/client";

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

// Figma treats the entry tiers (bronze / silver) as auto-unlocking —
// they trigger from sales thresholds alone. Higher tiers (gold / platinum)
// require an admin to release the reward, so they stay Locked by default.
const AUTO_UNLOCK_TIERS = new Set(["bronze", "silver"]);

function tierToMilestone(tier: MilestoneTier): Milestone {
  const key = tier.name.toLowerCase();
  const preset = TIER_PRESETS[key] ?? TIER_PRESETS.bronze;
  const unlockType: UnlockType = AUTO_UNLOCK_TIERS.has(key) ? "Auto-unlock" : "Locked";
  return {
    id: tier.id,
    letter: tier.letter,
    name: tier.name,
    description: tier.description,
    threshold: tier.targetAmount,
    unlockType,
    ...preset,
  };
}

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

// ── Tile icon ─────────────────────────────────────────────────────────────────
//
// Figma spec (92:16998): 64×64 tile with 32px letter glyph. The tile keeps
// its tier-specific border + fill so bronze/silver/gold/platinum stay
// visually distinct at a glance.

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
      className="flex size-[4rem] shrink-0 items-center justify-center rounded-[var(--radius-md)] border font-[var(--font-sans)] text-[2rem] font-bold leading-none"
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
    // Figma uses a subtle blue chip, not green — signals "configured", not "success".
    return (
      <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[rgba(91,141,239,0.10)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#A6D1FF]">
        Auto-unlock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[rgba(239,68,68,0.10)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#EF8A8A]">
      Locked
    </span>
  );
}

// ── Input field styling ───────────────────────────────────────────────────────
//
// Glass-like: softer fill than the old 0.04 wash, 0.10 resting border lifting
// to 0.20 on focus — reads as "editable" without the heavy outlined look.
// 32px tall to keep edit rows compact enough to align with the tier tile.

const INPUT_CLASS =
  "h-[2rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] px-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] transition-colors focus:border-[rgba(255,255,255,0.20)] focus:bg-[rgba(255,255,255,0.05)] focus:outline-none";

const LABEL_CLASS =
  "font-[var(--font-sans)] text-[10px] leading-[1] tracking-[0.08em] uppercase text-[rgba(255,255,255,0.45)] font-semibold";

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
      <div className="w-full max-w-[28rem] rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.08)] bg-[#111525] px-[var(--space-8)] py-[var(--space-6)]">
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

        <form onSubmit={handleSubmit} className="mt-[var(--space-6)] flex flex-col gap-[var(--space-5)]">
          {/* Tier Name */}
          <div className="flex flex-col gap-[var(--space-2)]">
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
          <div className="flex flex-col gap-[var(--space-2)]">
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
          <div className="flex flex-col gap-[var(--space-2)]">
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
          <div className="flex flex-col gap-[var(--space-2)]">
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
          <div className="mt-[var(--space-2)] flex gap-[var(--space-3)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-[var(--radius)] bg-[var(--color-primary)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
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
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const { data: tiersData } = useMilestoneTiers(tenant?.id);

  const apiMilestones = (tiersData?.tiers ?? []).map(tierToMilestone);
  const milestones = apiMilestones;
  const [showModal, setShowModal] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { threshold: string; name: string; description: string }>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, { threshold: string; name: string; description: string }> = {};
      for (const m of apiMilestones) {
        next[m.id] = prev[m.id] ?? { threshold: formatCurrency(m.threshold), name: m.name, description: m.description };
      }
      return next;
    });
  }, [tiersData]);

  const invalidateMilestones = () =>
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.includes("milestones"),
    });

  const addMutation = useMutation({
    mutationFn: (data: { name: string; threshold: number; reward: string }) =>
      apiClient("/milestones", {
        method: "POST",
        body: {
          name: data.name,
          description: data.reward,
          targetAmount: data.threshold,
          letter: data.name.charAt(0).toUpperCase(),
        },
      }),
    onSuccess: async () => {
      setShowModal(false);
      await invalidateMilestones();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; targetAmount?: number; name?: string; description?: string }) =>
      apiClient(`/milestones/${id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: async () => {
      await invalidateMilestones();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/milestones/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await invalidateMilestones();
    },
  });

  function handleAdd(data: { name: string; threshold: number; reward: string; unlockType: UnlockType }) {
    void addMutation.mutateAsync({
      name: data.name,
      threshold: data.threshold,
      reward: data.reward,
    });
  }

  function handleDelete(id: string) {
    void deleteMutation.mutateAsync(id);
  }

  function updateDraft(id: string, field: "threshold" | "name" | "description", value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
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
            <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
              Configure sales thresholds and rewards for affiliates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <IconMilestone />
            Add Milestone +
          </button>
        </div>

        {/* Milestone cards — Figma 92:16997 layout.
            Card: 1136×192, 24px padding. Tile 64×64 (left), content (right).
            Content: [Name bold · Badge+Delete top-right] / Description / Label / Input.
            Threshold is the only inline-editable field (saves on blur/Enter). */}
        <div className="flex flex-col gap-[var(--space-4)]">
          {milestones.map((m) => {
            const draft = drafts[m.id];
            const thresholdValue = draft?.threshold ?? formatCurrency(m.threshold);

            function commitThreshold() {
              const numeric = Number((draft?.threshold ?? "").replace(/[^0-9]/g, ""));
              if (!Number.isFinite(numeric) || numeric <= 0 || numeric === m.threshold) {
                // Nothing to save — snap the visible value back to the server truth
                setDrafts((prev) => ({
                  ...prev,
                  [m.id]: { ...prev[m.id], threshold: formatCurrency(m.threshold) },
                }));
                return;
              }
              void updateMutation.mutateAsync({ id: m.id, targetAmount: numeric });
            }

            return (
              <article
                key={m.id}
                className="rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.015),transparent)] px-[var(--space-6)] py-[var(--space-6)] transition-colors hover:border-[rgba(255,255,255,0.10)]"
              >
                <div className="flex items-start gap-[var(--space-6)]">
                  {/* LEFT — 64×64 tier tile */}
                  <TierTile
                    letter={m.letter}
                    tileText={m.tileText}
                    tileBorder={m.tileBorder}
                    tileBg={m.tileBg}
                  />

                  {/* RIGHT — content column fills remaining width */}
                  <div className="min-w-0 flex-1">
                    {/* Name row + status + delete (top-right cluster) */}
                    <div className="flex items-start justify-between gap-[var(--space-4)]">
                      <h3 className="font-[var(--font-display)] text-[1.375rem] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
                        {m.name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-[var(--space-2)]">
                        <UnlockBadge type={m.unlockType} />
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
                          aria-label={`Delete ${m.name}`}
                          disabled={m.unlockType !== "Locked" || deleteMutation.isPending}
                          className="flex size-[2rem] items-center justify-center rounded-[var(--radius)] text-[rgba(239,68,68,0.55)] transition-colors hover:bg-[rgba(239,68,68,0.08)] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>

                    {/* Description — ~12px gap below name (Figma: text at y=44 from container top, name is 32 tall → 12px gap) */}
                    <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.4] text-[rgba(255,255,255,0.55)]">
                      {m.description}
                    </p>

                    {/* Revenue Threshold — label + always-visible input */}
                    <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)]">
                      <label
                        htmlFor={`threshold-${m.id}`}
                        className="font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]"
                      >
                        Revenue Threshold ($)
                      </label>
                      <input
                        id={`threshold-${m.id}`}
                        type="text"
                        inputMode="numeric"
                        value={thresholdValue}
                        onChange={(e) => updateDraft(m.id, "threshold", e.target.value)}
                        onBlur={commitThreshold}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            setDrafts((prev) => ({
                              ...prev,
                              [m.id]: { ...prev[m.id], threshold: formatCurrency(m.threshold) },
                            }));
                            e.currentTarget.blur();
                          }
                        }}
                        className="h-[2.5rem] w-full max-w-[20rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] px-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] transition-colors focus:border-[rgba(255,255,255,0.20)] focus:bg-[rgba(255,255,255,0.05)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
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
