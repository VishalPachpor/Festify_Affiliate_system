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
      className="flex min-h-[7.4rem] flex-col gap-[0.55rem] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[1.4rem] py-[1.1rem]"
    >
      <div className="h-[0.25rem] w-[3.5rem] animate-pulse rounded-full bg-[var(--color-border)]" />
      <div className="h-[0.75rem] w-[5rem] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
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
    <dl className="flex min-h-[7.4rem] flex-col gap-[0.55rem] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[1.4rem] py-[1.1rem]">
      <span
        aria-hidden="true"
        className={`h-[0.25rem] w-[3.5rem] rounded-full ${accentClassName}`}
      />

      <dt className="truncate font-[var(--font-sans)] text-[0.72rem] uppercase tracking-[0.03em] text-[rgba(166,209,255,0.95)]">
        {label}
      </dt>

      <dd className="font-[var(--font-sans)] text-[2.05rem] font-semibold leading-[1.1] text-[var(--color-text-primary)]">
        {value}
      </dd>

      <dd className="min-h-[0.875rem] font-[var(--font-sans)] text-[0.78rem] leading-[0.95rem] text-[var(--color-success)]">
        {delta}
      </dd>
    </dl>
  );
}
