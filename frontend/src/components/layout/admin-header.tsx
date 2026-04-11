"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="6" cy="6" r="4" />
      <path d="M9.5 9.5L13 13" />
    </svg>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/admin":              "Admin Dashboard",
  "/admin/applications": "Applications",
  "/admin/affiliates":   "Affiliates",
  "/admin/materials":    "Materials",
  "/admin/milestones":   "Milestones",
  "/admin/commissions":  "Commissions",
  "/admin/integrations": "Integrations",
  "/admin/profile":      "Profile",
  "/admin/settings":     "Settings",
};

function getTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? "Admin Dashboard";
}

const SEARCHABLE_PATHS = new Set([
  "/admin/affiliates",
  "/admin/commissions",
]);

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const title = getTitle(pathname);
  const isSearchable = SEARCHABLE_PATHS.has(pathname);
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!isSearchable) return;

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
        params.set("page", "1");
      } else {
        params.delete("search");
        params.delete("page");
      }

      startTransition(() => {
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [isSearchable, pathname, router, searchParams, searchValue, startTransition]);

  return (
    <header className="flex h-[var(--space-16)] shrink-0 items-center justify-between border-b border-[var(--color-border)] px-[var(--space-5)]">
      <h1 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        {title}
      </h1>

      <div className="flex items-center gap-[var(--space-4)]">
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-[var(--space-3)] text-[var(--color-text-muted)]">
            <IconSearch />
          </span>
          <input
            type="search"
            placeholder={isSearchable ? "Search..." : "Search unavailable"}
            aria-label="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            disabled={!isSearchable}
            className="h-[var(--space-8)] w-[9.5rem] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-input)] pl-[var(--space-8)] pr-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-ring)] transition-colors duration-[var(--duration-normal)] md:w-[11rem] xl:w-[12.5rem]"
          />
        </div>

        <NotificationBell recipient="tenant" />

        <UserMenu />
      </div>
    </header>
  );
}
