"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/modules/tenant-shell";
import { useAuth } from "@/modules/auth";
import { useApplicationStatus } from "@/modules/application";

// ── Icons (20×20, matching Figma node 71:3) ──────────────────────────────────

function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconMaterials() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 7a1 1 0 011-1h3.5l2 2H17a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" />
    </svg>
  );
}

function IconMilestones() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3h10v5.5a5 5 0 01-10 0V3z" />
      <path d="M3 3h2M15 3h2" />
      <path d="M10 13.5v3M7 16.5h6" />
    </svg>
  );
}

function IconSales() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5v15" />
      <path d="M13.5 5.5H8a2.5 2.5 0 000 5h4a2.5 2.5 0 010 5H6.5" />
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
  { href: "/dashboard",            label: "Dashboard",  Icon: IconDashboard  },
  { href: "/dashboard/materials",  label: "Materials",  Icon: IconMaterials  },
  { href: "/dashboard/milestones", label: "Milestones", Icon: IconMilestones },
  { href: "/dashboard/sales",      label: "Sales",      Icon: IconSales      },
] as const;

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/application");
  }
  return pathname.startsWith(href);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { data, isLoading } = useApplicationStatus(tenant?.id);
  const isApproved = data?.status === "approved";
  const isRestrictedAffiliate = user?.role === "affiliate" && (!isApproved || isLoading);
  const visibleNavItems = isRestrictedAffiliate
    ? [{ ...NAV_ITEMS[0], label: "Home" }]
    : NAV_ITEMS;
  const brandSubtitle = tenant?.name?.startsWith("TOKEN2049")
    ? (() => {
        const subtitle = tenant.name.replace(/^TOKEN2049\s*/i, "").trim();
        return subtitle.includes("2026") ? subtitle : `${subtitle} 2026`;
      })()
    : tenant?.name ?? "Singapore 2026";

  return (
    <aside
      className="flex w-[var(--sidebar-w)] shrink-0 flex-col bg-[var(--color-surface-sidebar)] border-r border-[var(--color-border)]"
      aria-label="Main navigation"
    >
      {/* Brand — Figma 71:4: p-24, border-bottom */}
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

      {/* Nav — Figma 71:21: pt-16 px-16, gap-4 between items */}
      <nav className="flex-1 px-[16px] pt-[16px]" aria-label="Dashboard sections">
        <ul className="flex flex-col gap-[4px]">
          {visibleNavItems.map(({ href, label, Icon }) => {
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

      {/* User footer — Figma 71:51: border-top, pt-17 px-16 */}
      <div className="border-t border-[var(--color-border)] px-[16px] pt-[17px] pb-[16px]">
        <Link
          href="/dashboard/profile"
          className="flex h-[64px] items-center gap-[12px] rounded-[8px] px-[12px] transition-colors duration-[var(--duration-normal)] hover:bg-[var(--color-surface-ghost-hover)]"
        >
          {/* Avatar — Figma 71:53: 40px circle, bg #161616, border rgba(166,209,255,0.3) */}
          <div
            className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)] border border-[var(--color-avatar-border)]"
            aria-hidden="true"
          >
            <span className="font-[var(--font-sans)] font-bold text-[16px] leading-[24px] text-[#F0F0F0]">
              {user?.fullName
                ? user.fullName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : "?"}
            </span>
          </div>
          {/* Name + subtitle — Figma 71:55 */}
          <div className="flex-1 min-w-0">
            <p className="truncate font-[var(--font-sans)] font-medium text-[12px] leading-[17px] text-[#F0F0F0]">
              {user?.fullName ?? "User"}
            </p>
            <p className="truncate font-[var(--font-sans)] text-[11px] leading-[15px] text-[#9CA4B7]">
              {user?.email ?? (isRestrictedAffiliate ? "New User" : "Affiliate")}
            </p>
          </div>
          {/* Chevron — Figma 71:60: 16px */}
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
