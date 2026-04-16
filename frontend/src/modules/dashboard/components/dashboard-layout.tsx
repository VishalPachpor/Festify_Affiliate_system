import type { ReactNode } from "react";

export function DashboardContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--space-8)] px-[var(--space-8)] py-[var(--space-8)]">
      {children}
    </div>
  );
}

export function DashboardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-[var(--space-5)] lg:grid-cols-2">
      {children}
    </div>
  );
}
