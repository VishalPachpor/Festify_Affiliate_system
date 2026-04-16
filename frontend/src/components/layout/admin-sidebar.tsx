"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/modules/tenant-shell";
import { useAuth } from "@/modules/auth";

// ── Icons (20×20, matching Figma sidebar spec) ───────────────────────────────

function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconAffiliates() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="6" r="3" />
      <path d="M2.5 16c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      <circle cx="14" cy="6.5" r="2" />
      <path d="M14 10.5c2.2 0 4 1.8 4 4" />
    </svg>
  );
}

function IconMaterials() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5V6a1 1 0 011-1h3l2 2h7a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7.5z" />
    </svg>
  );
}

function IconMilestones() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h8v5a4 4 0 01-8 0V3z" />
      <path d="M6 5H4a1 1 0 00-1 1v1a3 3 0 003 3" />
      <path d="M14 5h2a1 1 0 011 1v1a3 3 0 01-3 3" />
      <path d="M10 12v3" />
      <path d="M7 17h6" />
      <path d="M7 15h6" />
    </svg>
  );
}

function IconCommissions() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="4" width="17" height="12" rx="2" />
      <path d="M1.5 8.5h17" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 1.5v2.5M10 16v2.5M3.8 3.8l1.8 1.8M14.4 14.4l1.8 1.8M1.5 10H4M16 10h2.5M3.8 16.2l1.8-1.8M14.4 5.6l1.8-1.8" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin",              label: "Dashboard",    Icon: IconDashboard    },
  { href: "/admin/affiliates",   label: "Affiliates",   Icon: IconAffiliates   },
  { href: "/admin/materials",    label: "Materials",     Icon: IconMaterials    },
  { href: "/admin/milestones",   label: "Milestones",   Icon: IconMilestones   },
  { href: "/admin/commissions",  label: "Commissions",  Icon: IconCommissions  },
  { href: "/admin/settings",     label: "Settings",     Icon: IconSettings     },
] as const;

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const { tenant } = useTenant();
  const { user } = useAuth();
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
      {/* Brand — Figma spec: p-24, border-bottom */}
      <div className="border-b border-[var(--color-border)] px-[24px] pt-[24px] pb-[24px]">
        <Image
          src="/token.png"
          alt="TOKEN2049"
          width={188}
          height={24}
          className="h-[21px] w-auto"
          priority
        />
        <p className="mt-[4px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[#9CA4B7]">
          {brandSubtitle}
        </p>
      </div>

      {/* Nav — Figma spec: pt-16 px-16, gap-4 between items */}
      <nav className="flex-1 px-[16px] pt-[16px]" aria-label="Admin sections">
        <ul className="flex flex-col gap-[4px]">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isNavActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex h-[48px] items-center gap-[12px] rounded-[8px] pl-[16px]",
                    "font-[var(--font-sans)] text-[16px] leading-[24px]",
                    "transition-colors duration-[var(--duration-normal)]",
                    active
                      ? "bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] font-medium"
                      : "text-[#9CA4B7] hover:bg-[var(--color-surface-ghost-hover)] hover:text-[var(--color-text-primary)]",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="shrink-0 size-[20px]">
                    <Icon />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer — Figma spec: border-top, pt-17 px-16 */}
      <div className="border-t border-[var(--color-border)] px-[16px] pt-[17px] pb-[16px]">
        <Link
          href="/admin/settings"
          className="flex h-[64px] items-center gap-[12px] rounded-[8px] px-[12px] transition-colors duration-[var(--duration-normal)] hover:bg-[var(--color-surface-ghost-hover)]"
        >
          <div
            className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)] border border-[var(--color-avatar-border)]"
            aria-hidden="true"
          >
            <span className="font-[var(--font-sans)] font-bold text-[16px] leading-[24px] text-[#F0F0F0]">
              {user?.fullName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "??"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-[var(--font-sans)] font-medium text-[12px] leading-[17px] text-[#F0F0F0]">
              {user?.fullName ?? "User"}
            </p>
            <p className="truncate font-[var(--font-sans)] text-[11px] leading-[15px] text-[#9CA4B7]">
              {user?.role === "admin" ? "Organizer Admin" : "Affiliate"}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 text-[#9CA4B7] transition-colors duration-[var(--duration-normal)]"
          >
            <IconChevron />
          </span>
        </Link>
      </div>
    </aside>
  );
}
