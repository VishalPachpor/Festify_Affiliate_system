"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/modules/tenant-shell";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconAffiliates() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <circle cx="11.5" cy="5.5" r="1.5" />
      <path d="M11.5 9c1.7 0 3 1.3 3 3" />
    </svg>
  );
}

function IconMaterials() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 5a1 1 0 011-1h3l2 2h7a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V5z" />
    </svg>
  );
}

function IconMilestones() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2h8v5a4 4 0 01-8 0V2z" />
      <path d="M2 2h2M12 2h2" />
      <path d="M8 11v3M5 14h6" />
    </svg>
  );
}

function IconCommissions() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="14" height="10" rx="2" />
      <path d="M1 7h14" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M1 8h2M13 8h2M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 5l4 4 4-4" />
    </svg>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin",              label: "Dashboard",   Icon: IconDashboard   },
  { href: "/admin/affiliates",   label: "Affiliates",  Icon: IconAffiliates  },
  { href: "/admin/materials",    label: "Materials",    Icon: IconMaterials   },
  { href: "/admin/milestones",   label: "Milestones",  Icon: IconMilestones  },
  { href: "/admin/commissions",  label: "Commissions", Icon: IconCommissions },
  { href: "/admin/settings",     label: "Settings",    Icon: IconSettings    },
] as const;

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const { tenant } = useTenant();
  const brandSubtitle = tenant?.name?.startsWith("TOKEN2049")
    ? (() => {
        const subtitle = tenant.name.replace(/^TOKEN2049\s*/i, "").trim();
        return subtitle.includes("2026") ? subtitle : `${subtitle} 2026`;
      })()
    : tenant?.name ?? "Singapore 2026";

  return (
    <aside
      className="flex w-[var(--sidebar-w)] shrink-0 flex-col bg-[var(--color-surface-sidebar)] border-r border-[var(--color-border)]"
      aria-label="Admin navigation"
    >
      {/* Brand */}
      <div className="px-[1.35rem] pt-[1.45rem] pb-[0.95rem]">
        <Image
          src="/token.png"
          alt="TOKEN2049"
          width={188}
          height={24}
          className="h-[1.55rem] w-auto"
          priority
        />
        <p className="mt-[0.3rem] font-[var(--font-sans)] text-[0.68rem] leading-[0.92rem] text-[var(--color-text-secondary)]">
          {brandSubtitle}
        </p>
      </div>

      <div className="mx-[1.5rem] h-px bg-[var(--color-border)]" />

      {/* Nav */}
      <nav className="flex-1 px-[0.75rem] py-[0.95rem]" aria-label="Admin sections">
        <ul className="flex flex-col gap-[0.28rem]">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isNavActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-[0.7rem] rounded-[var(--radius)] px-[0.9rem] py-[0.72rem]",
                    "font-[var(--font-sans)] text-[0.86rem] leading-[1.1rem]",
                    "transition-colors duration-[var(--duration-normal)]",
                    active
                      ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] font-medium"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-ghost-hover)] hover:text-[var(--color-text-primary)]",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="mx-[1.5rem] h-px bg-[var(--color-border)]" />
      <Link
        href="/admin/profile"
        className="flex items-center gap-[var(--space-3)] px-[1.15rem] py-[1.05rem] transition-colors duration-[var(--duration-normal)] hover:bg-[var(--color-surface-ghost-hover)]"
      >
        <div
          className="flex size-[2.35rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)]"
          aria-hidden="true"
        >
          <span className="font-[var(--font-sans)] font-semibold text-[var(--text-xs)] text-[var(--color-primary-foreground)]">
            JD
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-[var(--font-sans)] font-medium text-[0.84rem] leading-[1.05rem] text-[var(--color-text-primary)]">
            John Doe
          </p>
          <p className="truncate font-[var(--font-sans)] text-[0.7rem] leading-[0.9rem] text-[var(--color-text-secondary)]">
            Gold Tier
          </p>
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 text-[var(--color-text-muted)] transition-colors duration-[var(--duration-normal)]"
        >
          <IconChevron />
        </span>
      </Link>
    </aside>
  );
}
