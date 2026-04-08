"use client";

import { useEffect, useRef } from "react";

export function DotBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Respect reduced-motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("mousemove", handleMove);

    let raf: number;

    const animate = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      const left = el.querySelector<HTMLElement>("[data-layer='left']");
      const right = el.querySelector<HTMLElement>("[data-layer='right']");

      if (left) {
        left.style.transform = `translate3d(${currentX * 10}px, ${currentY * 7}px, 0)`;
      }
      if (right) {
        right.style.transform = `translate3d(${currentX * -10}px, ${currentY * -7}px, 0)`;
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[var(--color-page)]"
    >
      {/* Bottom-left halftone cluster */}
      <div
        data-layer="left"
        className="absolute will-change-transform"
        style={{
          width: "1560px",
          height: "1560px",
          left: "-16%",
          top: "10%",
          backgroundImage: "url('/bg-dot-left.svg')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          opacity: "0.88",
        }}
      />

      {/* Right halftone cluster */}
      <div
        data-layer="right"
        className="absolute will-change-transform"
        style={{
          width: "1560px",
          height: "1560px",
          right: "-16%",
          top: "10%",
          backgroundImage: "url('/bg-dot-right.svg')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          mixBlendMode: "screen",
          opacity: "0.88",
        }}
      />
    </div>
  );
}
