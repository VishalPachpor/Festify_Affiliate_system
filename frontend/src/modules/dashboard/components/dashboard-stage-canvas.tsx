import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardStageCanvas({
  children,
  centered = false,
  className,
}: {
  children: ReactNode;
  centered?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative min-h-[calc(100vh-var(--header-h)-var(--space-8)*2)]",
        centered && "flex items-center justify-center",
        className,
      )}
    >
      {/* Ambient backdrop lives on the admin/dashboard layout root so the
          glow reads as one continuous atmosphere. StageCanvas is transparent
          — layering a second pass here used to draw a visible inset
          rectangle (the "double background" the client flagged). */}

      <div className={cn("relative z-10 w-full", centered && "mx-auto max-w-[49rem]")}>
        {children}
      </div>
    </section>
  );
}
