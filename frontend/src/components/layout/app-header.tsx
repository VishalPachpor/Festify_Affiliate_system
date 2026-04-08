"use client";

import { usePathname } from "next/navigation";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="6" cy="6" r="4" />
      <path d="M9.5 9.5L13 13" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.4 7.8a3.6 3.6 0 017.2 0c0 2.7.9 3.6.9 3.6H4.5s.9-.9.9-3.6z" />
      <path d="M9 14.4a1.8 1.8 0 01-1.8-1.8h3.6A1.8 1.8 0 019 14.4z" />
    </svg>
  );
}

// ── Page title map ────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":             "Dashboard",
  "/dashboard/application": "Application",
  "/dashboard/materials":   "Materials",
  "/dashboard/milestones":  "Milestones",
  "/dashboard/profile":     "Profile",
  "/dashboard/sales":       "Sales",
};

function getTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? "Dashboard";
}

// ── Header ────────────────────────────────────────────────────────────────────

export function AppHeader() {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="flex h-[3.6rem] shrink-0 items-center justify-between border-b border-[var(--color-border)] px-[1.25rem]">
      <h1 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        {title}
      </h1>

      <div className="flex items-center gap-[var(--space-4)]">
        {/* Search */}
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-[var(--space-3)] text-[var(--color-text-muted)]">
            <IconSearch />
          </span>
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search"
            className="h-[2.1rem] w-[9.5rem] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-input)] pl-[1.9rem] pr-[0.75rem] font-[var(--font-sans)] text-[0.78rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-ring)] transition-colors duration-[var(--duration-normal)] md:w-[11rem] xl:w-[12.5rem]"
          />
        </div>

        {/* Notification bell */}
        <button
          aria-label="Notifications"
          className="relative flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-[var(--duration-normal)]"
        >
          <IconBell />
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 size-[0.375rem] rounded-full bg-[var(--color-error)]"
          />
        </button>

        {/* User avatar */}
        <div
          aria-label="User menu"
          className="flex size-[var(--space-8)] items-center justify-center rounded-full bg-[var(--color-avatar-bg)] cursor-pointer"
        >
          <span className="font-[var(--font-sans)] font-semibold text-[var(--text-xs)] text-[var(--color-primary-foreground)]">
            JD
          </span>
        </div>
      </div>
    </header>
  );
}
