"use client";

import { useSaleDetails } from "../hooks/use-sale-details";
import type { AttributionDiagnosticStep } from "../types";

const resultStyles: Record<AttributionDiagnosticStep["result"], { color: string; label: string }> = {
  passed: { color: "var(--color-success)", label: "Passed" },
  failed: { color: "var(--color-error)", label: "Failed" },
  skipped: { color: "var(--color-text-muted)", label: "Skipped" },
};

const sourceLabels: Record<string, string> = {
  referral_link: "Referral Link",
  referral_code: "Referral Code",
  direct: "Direct",
  organic: "Organic",
  unattributed: "Unattributed",
};

function DiagnosticSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-[var(--space-3)]">
          <div className="h-[var(--space-2)] w-[var(--space-2)] mt-[var(--space-1)] shrink-0 animate-pulse rounded-full bg-[var(--color-border)]" />
          <div className="flex-1 flex flex-col gap-[var(--space-1)]">
            <div className="h-[var(--text-sm)] w-[50%] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
            <div className="h-[var(--text-xs)] w-[70%] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttributionDiagnosticsPanel({
  tenantId,
  saleId,
  onClose,
}: {
  tenantId: string | undefined;
  saleId: string | undefined;
  onClose?: () => void;
}) {
  const { data, isLoading, error } = useSaleDetails(tenantId, saleId);

  if (!saleId) return null;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
          Attribution Diagnostics
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-link)] underline transition-colors hover:text-[var(--color-text-link-hover)]"
          >
            Close
          </button>
        )}
      </div>

      <div className="mt-[var(--space-5)]">
        {error ? (
          <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
            Failed to load diagnostics.
          </p>
        ) : isLoading || !data ? (
          <DiagnosticSkeleton />
        ) : (
          <div className="flex flex-col gap-[var(--space-6)]">
            {/* Summary */}
            <div className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-input)] px-[var(--space-4)] py-[var(--space-3)]">
              <div className="flex items-center justify-between">
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
                  Result
                </span>
                <span
                  className="font-[var(--font-sans)] text-[var(--text-sm)] font-semibold"
                  style={{
                    color: data.attribution.attributed
                      ? "var(--color-success)"
                      : "var(--color-warning)",
                  }}
                >
                  {data.attribution.attributed ? "Attributed" : "Unattributed"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
                  Source
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
                  {sourceLabels[data.attribution.source] ?? data.attribution.source}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
                  Reason
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
                  {data.attributionDiagnostics.reason}
                </span>
              </div>
            </div>

            {/* Match steps */}
            <div>
              <h4 className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
                Resolution Steps
              </h4>
              <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-3)]">
                {data.attributionDiagnostics.steps.map((step, index) => {
                  const style = resultStyles[step.result];
                  return (
                    <div key={index} className="flex items-start gap-[var(--space-3)]">
                      <div
                        className="mt-[var(--space-1)] h-[var(--space-2)] w-[var(--space-2)] shrink-0 rounded-full"
                        style={{ backgroundColor: style.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[var(--space-2)]">
                          <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                            {step.check}
                          </span>
                          <span
                            className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
                            style={{ color: style.color }}
                          >
                            {style.label}
                          </span>
                        </div>
                        <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data present */}
            <div>
              <h4 className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
                Available Data
              </h4>
              <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-2)]">
                {[
                  { label: "Referral Code", value: data.attribution.referralCode },
                  { label: "Referral URL", value: data.attribution.referralUrl },
                  { label: "Landing Page", value: data.attribution.landingPage },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                      {label}
                    </span>
                    {value ? (
                      <code className="font-[var(--font-mono)] text-[var(--text-xs)] text-[var(--color-text-primary)] bg-[var(--color-input)] px-[var(--space-2)] py-[var(--space-1)] rounded-[var(--radius)] max-w-[60%] truncate">
                        {value}
                      </code>
                    ) : (
                      <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
                        Missing
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
