import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardContainer({
  children,
  fluid = false,
  className,
}: {
  children: ReactNode;
  fluid?: boolean;
  className?: string;
}) {
  // Cap the working frame at 1440px (90rem) and centre it on ultra-wide
  // screens so content doesn't drift hard-left on 4K monitors. Inside the
  // container, grids still layout flush-left — the container is centred,
  // not the grid.
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-[var(--space-8)] px-[var(--space-8)] py-[var(--space-8)]",
        !fluid && "mx-auto max-w-[90rem]",
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
