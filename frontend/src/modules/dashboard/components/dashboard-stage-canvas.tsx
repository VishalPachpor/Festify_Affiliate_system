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
        background:
          "radial-gradient(ellipse at top right, rgba(59,130,246,0.10), rgba(55,48,163,0.04) 50%, transparent 80%)",
      }}
    >
      {/* Noise texture — CSS-only grain for tactile depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute right-[-6%] top-[1.5%] h-[21rem] w-[34rem] bg-no-repeat bg-contain opacity-34"
          style={{ backgroundImage: "url('/bg-dotted-horizontal.png')" }}
        />
        <div
          className="absolute right-[-13%] top-[10%] h-[30rem] w-[30rem] bg-no-repeat bg-contain opacity-16"
          style={{ backgroundImage: "url('/bg-dot-right.svg')" }}
        />
        <div
          className="absolute left-[-10%] bottom-[-12%] h-[16rem] w-[16rem] bg-no-repeat bg-contain opacity-8"
          style={{ backgroundImage: "url('/bg-dot-left.svg')" }}
        />
      </div>

      <div className={cn("relative z-10 w-full", centered && "mx-auto max-w-[49rem]")}>
        {children}
      </div>
    </section>
  );
}
