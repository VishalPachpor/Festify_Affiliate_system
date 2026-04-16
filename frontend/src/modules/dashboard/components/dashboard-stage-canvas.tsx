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
      {/* Dot pattern — localized top-right, soft masked fade, matching Figma */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[40px] top-[40px] h-[380px] w-[380px] opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.5px)",
          backgroundSize: "10px 10px",
          filter: "blur(0.3px)",
          maskImage: "radial-gradient(circle, white 30%, rgba(255,255,255,0.6) 55%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle, white 30%, rgba(255,255,255,0.6) 55%, transparent 80%)",
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
