import type { ReactNode } from "react";

export function DashboardContainer({ children }: { children: ReactNode }) {
  // Figma designs against a 1440px viewport with a 240px sidebar — 1200px
  // content frame. Capping here keeps cards and grids at spec-size on wider
  // monitors instead of inflating with the viewport.
  return (
    <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-[var(--space-8)] px-[var(--space-8)] py-[var(--space-8)]">
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
