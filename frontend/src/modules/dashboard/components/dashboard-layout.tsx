import type { ReactNode } from "react";

export function DashboardContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--space-5)] px-[var(--space-6)] py-[var(--space-5)]">
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
