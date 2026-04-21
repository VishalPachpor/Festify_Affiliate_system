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

type Milestone = {
  id: string;
  letter: string;
  name: string;
  description: string;
  threshold: number;
  commissionRateBps: number;
  complimentaryTickets: number;
  tileText: string;
  tileBorder: string;
  tileBg: string;
};

// ── Tier styles (matching affiliate milestones page) ──────────────────────────

const TIER_PRESETS: Record<string, { tileText: string; tileBorder: string; tileBg: string }> = {
  starter:  { tileText: "#9CA4B7", tileBorder: "rgba(156,164,183,0.6)", tileBg: "rgba(156,164,183,0.18)" },
  riser:    { tileText: "#5B8DEF", tileBorder: "rgba(91,141,239,0.6)",  tileBg: "rgba(91,141,239,0.18)" },
  pro:      { tileText: "#E19A3E", tileBorder: "rgba(225,154,62,0.6)",  tileBg: "rgba(225,154,62,0.18)" },
  elite:    { tileText: "#FFD620", tileBorder: "rgba(255,214,32,0.6)",  tileBg: "rgba(255,214,32,0.18)" },
};

const FALLBACK_PRESET = { tileText: "#E5E7EB", tileBorder: "rgba(229,231,235,0.6)", tileBg: "rgba(229,231,235,0.18)" };

function tierToMilestone(tier: MilestoneTier): Milestone {
  const key = tier.name.toLowerCase();
  const preset = TIER_PRESETS[key] ?? FALLBACK_PRESET;
  return {
    id: tier.id,
    letter: tier.letter,
    name: tier.name,
    description: tier.description,
    threshold: tier.targetAmount,
    commissionRateBps: tier.commissionRateBps,
    complimentaryTickets: tier.complimentaryTickets,
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

function formatRatePct(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}` : pct.toFixed(1);
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

// ── Tier tile ─────────────────────────────────────────────────────────────────

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

// ── Input + label classes ─────────────────────────────────────────────────────

const INPUT_CLASS =
  "h-[2rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] px-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] transition-colors focus:border-[rgba(255,255,255,0.20)] focus:bg-[rgba(255,255,255,0.05)] focus:outline-none";

const LABEL_CLASS =
  "font-[var(--font-sans)] text-[10px] leading-[1] tracking-[0.08em] uppercase text-[rgba(255,255,255,0.45)] font-semibold";

const FIELD_LABEL_CLASS =
  "font-[var(--font-sans)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]";

const FIELD_INPUT_CLASS =
  "h-[2.5rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] px-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] transition-colors focus:border-[rgba(255,255,255,0.20)] focus:bg-[rgba(255,255,255,0.05)] focus:outline-none";

// ── Modal ─────────────────────────────────────────────────────────────────────

function AddMilestoneModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (m: {
    name: string;
    threshold: number;
    reward: string;
    commissionRateBps: number;
    complimentaryTickets: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("");
  const [reward, setReward] = useState("");
  const [ratePct, setRatePct] = useState("");
  const [tickets, setTickets] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !threshold || !reward) return;
    const rateNumber = Number(ratePct);
    const ticketsNumber = Number(tickets);
    onAdd({
      name,
      threshold: Number(threshold),
      reward,
      // Rate field accepts "%" so 5 → 500 bps, 7.5 → 750 bps.
      commissionRateBps: Number.isFinite(rateNumber) ? Math.round(rateNumber * 100) : 0,
      complimentaryTickets: Number.isFinite(ticketsNumber) && ticketsNumber >= 0 ? Math.round(ticketsNumber) : 0,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.60)]">
      <div className="w-full max-w-[28rem] rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.08)] bg-[#111525] px-[var(--space-8)] py-[var(--space-6)]">
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-[1.5rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
            Add New Tier
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
          <div className="flex flex-col gap-[var(--space-2)]">
            <label className={LABEL_CLASS}>Tier Name</label>
            <input type="text" placeholder="e.g. Pro" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
          </div>

          <div className="grid grid-cols-2 gap-[var(--space-3)]">
            <div className="flex flex-col gap-[var(--space-2)]">
              <label className={LABEL_CLASS}>Revenue to Unlock ($)</label>
              <input type="number" placeholder="e.g. 50000" value={threshold} onChange={(e) => setThreshold(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div className="flex flex-col gap-[var(--space-2)]">
              <label className={LABEL_CLASS}>Revenue Share (%)</label>
              <input type="number" step="0.1" placeholder="e.g. 7.5" value={ratePct} onChange={(e) => setRatePct(e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>

          <div className="flex flex-col gap-[var(--space-2)]">
            <label className={LABEL_CLASS}>Complimentary Tickets</label>
            <input type="number" placeholder="e.g. 4" value={tickets} onChange={(e) => setTickets(e.target.value)} className={INPUT_CLASS} />
          </div>

          <div className="flex flex-col gap-[var(--space-2)]">
            <label className={LABEL_CLASS}>Reward / Description</label>
            <input type="text" placeholder="e.g. Cross $50k to unlock 7.5%…" value={reward} onChange={(e) => setReward(e.target.value)} className={INPUT_CLASS} />
          </div>

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
              Add Tier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type Draft = {
  threshold: string;
  ratePct: string;
  tickets: string;
  name: string;
  description: string;
};

export default function AdminMilestonesPage() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const { data: tiersData } = useMilestoneTiers(tenant?.id);

  const apiMilestones = (tiersData?.tiers ?? []).map(tierToMilestone);
  const milestones = apiMilestones;
  const [showModal, setShowModal] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  // Rebuild drafts whenever server data lands. Keep any in-flight user edit
  // (existing draft value) but overwrite any field the user hasn't touched.
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const m of apiMilestones) {
        next[m.id] = prev[m.id] ?? {
          threshold: formatCurrency(m.threshold),
          ratePct: formatRatePct(m.commissionRateBps),
          tickets: String(m.complimentaryTickets),
          name: m.name,
          description: m.description,
        };
      }
      return next;
    });
  }, [tiersData]);

  const invalidateMilestones = () =>
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.includes("milestones"),
    });

  const addMutation = useMutation({
    mutationFn: (data: {
      name: string;
      threshold: number;
      reward: string;
      commissionRateBps: number;
      complimentaryTickets: number;
    }) =>
      apiClient("/milestones", {
        method: "POST",
        body: {
          name: data.name,
          description: data.reward,
          targetAmount: data.threshold,
          letter: data.name.charAt(0).toUpperCase(),
          commissionRateBps: data.commissionRateBps,
          complimentaryTickets: data.complimentaryTickets,
        },
      }),
    onSuccess: async () => {
      setShowModal(false);
      await invalidateMilestones();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      targetAmount?: number;
      name?: string;
      description?: string;
      commissionRateBps?: number;
      complimentaryTickets?: number;
    }) =>
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

  function handleAdd(data: {
    name: string;
    threshold: number;
    reward: string;
    commissionRateBps: number;
    complimentaryTickets: number;
  }) {
    void addMutation.mutateAsync(data);
  }

  function handleDelete(id: string) {
    void deleteMutation.mutateAsync(id);
  }

  function updateDraft<K extends keyof Draft>(id: string, field: K, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
              Commission Tiers
            </h2>
            <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
              Configure the revenue-share ladder. Crossing a tier retroactively
              reprices every prior sale at the new rate.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <IconMilestone />
            Add Tier +
          </button>
        </div>

        <div className="flex flex-col gap-[var(--space-4)]">
          {milestones.map((m) => {
            const draft = drafts[m.id];
            const thresholdValue = draft?.threshold ?? formatCurrency(m.threshold);
            const rateValue = draft?.ratePct ?? formatRatePct(m.commissionRateBps);
            const ticketsValue = draft?.tickets ?? String(m.complimentaryTickets);

            function commitThreshold() {
              const numeric = Number((draft?.threshold ?? "").replace(/[^0-9]/g, ""));
              if (!Number.isFinite(numeric) || numeric < 0 || numeric === m.threshold) {
                // Snap back to server truth — the onBlur was a no-op edit.
                setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], threshold: formatCurrency(m.threshold) } }));
                return;
              }
              void updateMutation.mutateAsync({ id: m.id, targetAmount: numeric });
            }

            function commitRate() {
              // Accepts any numeric string (including "7.5"); basis-points
              // conversion caps the scale so "5" → 500, "7.5" → 750.
              const pct = Number((draft?.ratePct ?? "").replace(/[^0-9.]/g, ""));
              if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
                setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], ratePct: formatRatePct(m.commissionRateBps) } }));
                return;
              }
              const bps = Math.round(pct * 100);
              if (bps === m.commissionRateBps) {
                setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], ratePct: formatRatePct(m.commissionRateBps) } }));
                return;
              }
              void updateMutation.mutateAsync({ id: m.id, commissionRateBps: bps });
            }

            function commitTickets() {
              const numeric = Math.round(Number((draft?.tickets ?? "").replace(/[^0-9]/g, "")));
              if (!Number.isFinite(numeric) || numeric < 0 || numeric === m.complimentaryTickets) {
                setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], tickets: String(m.complimentaryTickets) } }));
                return;
              }
              void updateMutation.mutateAsync({ id: m.id, complimentaryTickets: numeric });
            }

            return (
              <article
                key={m.id}
                className="rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.015),transparent)] px-[var(--space-6)] py-[var(--space-6)] transition-colors hover:border-[rgba(255,255,255,0.10)]"
              >
                <div className="flex items-start gap-[var(--space-6)]">
                  <TierTile letter={m.letter} tileText={m.tileText} tileBorder={m.tileBorder} tileBg={m.tileBg} />

                  <div className="min-w-0 flex-1">
                    {/* Name row + rate chip + delete */}
                    <div className="flex items-start justify-between gap-[var(--space-4)]">
                      <div className="flex items-baseline gap-[var(--space-3)]">
                        <h3 className="font-[var(--font-display)] text-[1.375rem] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
                          {m.name}
                        </h3>
                        <span
                          className="font-[var(--font-display)] text-[1.25rem] font-bold leading-none tracking-[-0.02em]"
                          style={{ color: m.tileText }}
                        >
                          {formatRatePct(m.commissionRateBps)}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        aria-label={`Delete ${m.name}`}
                        disabled={deleteMutation.isPending}
                        className="flex size-[2rem] items-center justify-center rounded-[var(--radius)] text-[rgba(239,68,68,0.55)] transition-colors hover:bg-[rgba(239,68,68,0.08)] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <IconTrash />
                      </button>
                    </div>

                    <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.4] text-[rgba(255,255,255,0.55)]">
                      {m.description}
                    </p>

                    {/* Three-column editable grid: Revenue to Unlock ·
                        Revenue Share · Complimentary Tickets. Matches the
                        shape of the reference table the product is modeled on. */}
                    <div className="mt-[var(--space-4)] grid grid-cols-3 gap-[var(--space-4)]">
                      <div className="flex flex-col gap-[var(--space-2)]">
                        <label htmlFor={`threshold-${m.id}`} className={FIELD_LABEL_CLASS}>
                          Revenue to Unlock ($)
                        </label>
                        <input
                          id={`threshold-${m.id}`}
                          type="text"
                          inputMode="numeric"
                          value={thresholdValue}
                          onChange={(e) => updateDraft(m.id, "threshold", e.target.value)}
                          onBlur={commitThreshold}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            else if (e.key === "Escape") {
                              setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], threshold: formatCurrency(m.threshold) } }));
                              e.currentTarget.blur();
                            }
                          }}
                          className={FIELD_INPUT_CLASS}
                        />
                      </div>

                      <div className="flex flex-col gap-[var(--space-2)]">
                        <label htmlFor={`rate-${m.id}`} className={FIELD_LABEL_CLASS}>
                          Revenue Share (%)
                        </label>
                        <input
                          id={`rate-${m.id}`}
                          type="text"
                          inputMode="decimal"
                          value={rateValue}
                          onChange={(e) => updateDraft(m.id, "ratePct", e.target.value)}
                          onBlur={commitRate}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            else if (e.key === "Escape") {
                              setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], ratePct: formatRatePct(m.commissionRateBps) } }));
                              e.currentTarget.blur();
                            }
                          }}
                          className={FIELD_INPUT_CLASS}
                        />
                      </div>

                      <div className="flex flex-col gap-[var(--space-2)]">
                        <label htmlFor={`tickets-${m.id}`} className={FIELD_LABEL_CLASS}>
                          Complimentary Tickets
                        </label>
                        <input
                          id={`tickets-${m.id}`}
                          type="text"
                          inputMode="numeric"
                          value={ticketsValue}
                          onChange={(e) => updateDraft(m.id, "tickets", e.target.value)}
                          onBlur={commitTickets}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            else if (e.key === "Escape") {
                              setDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], tickets: String(m.complimentaryTickets) } }));
                              e.currentTarget.blur();
                            }
                          }}
                          className={FIELD_INPUT_CLASS}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </DashboardContainer>

      {showModal && <AddMilestoneModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </DashboardStageCanvas>
  );
}
