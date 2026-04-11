type KpiCardProps = {
  label: string;
  value: string;
  changePct?: number;
  changeLabel?: string;
  accentClassName: string;
  isLoading?: boolean;
};

function KpiCardSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${label}`}
      aria-busy="true"
      className="flex min-h-[7.5rem] flex-col gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-5)] py-[var(--space-4)]"
    >
      <div className="h-[var(--space-1)] w-[3.5rem] animate-pulse rounded-full bg-[var(--color-border)]" />
      <div className="h-[var(--space-3)] w-[5rem] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="h-[2rem] w-[7rem] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="h-[var(--text-xs)] w-[var(--space-8)] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  changePct,
  changeLabel,
  accentClassName,
  isLoading,
}: KpiCardProps) {
  if (isLoading) return <KpiCardSkeleton label={label} />;

  const delta = changeLabel
    ?? (changePct !== undefined ? `↗ +${changePct.toFixed(1)}%` : "");

  return (
    <dl className="flex min-h-[7.5rem] flex-col gap-[var(--space-2)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-5)] py-[var(--space-4)]">
      <span
        aria-hidden="true"
        className={`h-[var(--space-1)] w-[3.5rem] rounded-full ${accentClassName}`}
      />

      <dt className="truncate font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.03em] text-[rgba(166,209,255,0.95)]">
        {label}
      </dt>

      <dd className="font-[var(--font-sans)] text-[var(--text-2xl)] font-semibold leading-[1.1] text-[var(--color-text-primary)]">
        {value}
      </dd>

      <dd className="min-h-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--space-4)] text-[var(--color-success)]">
        {delta}
      </dd>
    </dl>
  );
}
