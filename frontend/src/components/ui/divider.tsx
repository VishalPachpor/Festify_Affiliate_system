export function Divider({ label }: { label?: string }) {
  if (!label) {
    return <div className="h-px w-full bg-[var(--color-border)]" />;
  }

  return (
    <div className="flex items-center gap-[var(--space-4)]">
      <div className="h-px flex-1 bg-[var(--color-border)]" />
      <span className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[var(--color-text-secondary)]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}
