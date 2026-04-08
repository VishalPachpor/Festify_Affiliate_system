import type { ReactNode } from "react";

/**
 * Shared card wrapper for all dashboard panels.
 * Provides consistent surface, border, padding, and radius.
 */
export function PanelShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        {title}
      </h3>
      <div className="mt-[var(--space-5)]">{children}</div>
    </div>
  );
}

export function PanelError({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
        {message}
      </p>
    </div>
  );
}

export function SkeletonLine({ width }: { width?: string }) {
  return (
    <div
      className="h-[var(--text-sm)] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]"
      style={{ width: width ?? "100%" }}
    />
  );
}
