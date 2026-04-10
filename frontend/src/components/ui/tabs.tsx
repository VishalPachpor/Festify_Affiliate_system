"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type TabItem = {
  label: string;
  href: string;
};

export function Tabs({ items }: { items: readonly TabItem[] }) {
  const pathname = usePathname();

  function isTabActive(href: string): boolean {
    if (href === "/sign-in") {
      return pathname === "/sign-in";
    }

    if (href === "/sign-up") {
      return pathname === "/sign-up" || pathname.startsWith("/signup/");
    }

    return pathname === href;
  }

  return (
    <div className="flex gap-[var(--space-2)] h-[var(--size-tab)] w-full">
      {items.map((tab) => {
        const isActive = isTabActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative inline-flex h-[var(--size-tab)] flex-1 items-center justify-center rounded-[var(--radius)]",
              "font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-tab)] font-medium",
              "border transition-colors duration-[var(--duration-normal)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-card)]",
              isActive
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "border-[var(--color-border-ghost)] bg-transparent text-[var(--color-text-inactive)] hover:bg-[var(--color-surface-ghost-hover)] hover:text-[var(--color-text-primary)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
