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
    >
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
