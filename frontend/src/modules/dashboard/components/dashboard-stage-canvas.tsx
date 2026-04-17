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
        "relative min-h-[calc(100vh-var(--header-h)-var(--space-8)*2)] overflow-hidden",
        centered && "flex items-center justify-center",
        className,
      )}
      style={{
        // Premium ambient backdrop — two soft radial orbs that span the full
        // content area (not just the form). Blue top-left + violet bottom-right
        // give the whole dashboard shell depth without noise. Kept subtle so
        // the UI still reads on white surfaces and doesn't fight chart/table
        // content on data-heavy screens.
        background:
          "radial-gradient(ellipse at 18% 15%, rgba(59,130,246,0.12), transparent 42%)," +
          "radial-gradient(ellipse at 82% 85%, rgba(139,92,246,0.10), transparent 52%)",
      }}
    >
      {/* Figma-referenced dot texture in the top-right quadrant — kept because
          it provides tenant-brand density without adding color noise. The old
          stacked PNG decorations (bg-dot-right/bg-dot-left/bg-dotted-horizontal)
          are gone — they added visual chatter the client flagged. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[40px] top-[40px] h-[380px] w-[380px] opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.5px)",
          backgroundSize: "10px 10px",
          filter: "blur(0.3px)",
          maskImage: "radial-gradient(circle, white 30%, rgba(255,255,255,0.6) 55%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle, white 30%, rgba(255,255,255,0.6) 55%, transparent 80%)",
        }}
      />

      <div className={cn("relative z-10 w-full", centered && "mx-auto max-w-[49rem]")}>
        {children}
      </div>
    </section>
  );
}
