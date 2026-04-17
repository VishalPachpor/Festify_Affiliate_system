import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardContainer({
  children,
  fluid: _fluid = false,
  className,
}: {
  children: ReactNode;
  /** @deprecated kept for API compatibility — the container is always fluid now */
  fluid?: boolean;
  className?: string;
}) {
  // App-shell layout: the sidebar is a flex sibling in admin/layout.tsx, so
  // this container should stretch to fill the remaining flex-1 area. The old
  // mx-auto + max-w-[90rem] cap produced floating-island margins on ultra-wide
  // screens — Figma's design is app-style full-width, not Bootstrap-centered.
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-[var(--space-8)] px-[var(--space-8)] py-[var(--space-8)]",
        className,
      )}
    >
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
