import type { ReactNode } from "react";

export function DashboardContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[1.25rem] px-[1.625rem] py-[1.375rem]">
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
