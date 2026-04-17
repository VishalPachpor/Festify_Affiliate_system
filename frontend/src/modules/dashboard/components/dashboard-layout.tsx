import type { ReactNode } from "react";

export function DashboardContainer({ children }: { children: ReactNode }) {
  // Cap the working frame on very wide monitors (max-w 90rem ~= 1440px)
  // while keeping content flush-left within the main area — prevents the
  // grid from inflating on 4K screens without visually centring the column.
  return (
    <div className="flex w-full max-w-[90rem] flex-col gap-[var(--space-8)] px-[var(--space-8)] py-[var(--space-8)]">
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
