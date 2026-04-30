"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/modules/tenant-shell";
import { useAuth } from "@/modules/auth";
import { useApplicationStatus } from "@/modules/application";

// ── Icons (20×20, matching Figma node 71:3) ──────────────────────────────────

// Figma 71:23 — Dashboard: 2×2 grid of STROKED rounded squares
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

// Figma 71:30 — Materials: folder with tab flap
function IconMaterials() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5V6a1 1 0 011-1h3l2 2h7a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7.5z" />
    </svg>
  );
}

// Figma 75:19 — Milestones: trophy cup with handles + base
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

// Figma 75:38 — Sales: dollar sign $ with vertical line + S-curve
function IconSales() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2v16" />
      <path d="M14 5.5H8.5a2.5 2.5 0 000 5h3a2.5 2.5 0 010 5H6" />
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

const RESTRICTED_HOME_ITEM = { ...NAV_ITEMS[0], label: "Home" } as const;
const MOU_NAV_ITEM = { href: "/dashboard/application/mou", label: "Sign MOU", Icon: IconMaterials } as const;

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
  const requiresMou = data?.status === "approved_pending_mou";
  const isRestrictedAffiliate = user?.role === "affiliate" && (!isApproved || isLoading);
  const visibleNavItems = isRestrictedAffiliate
    ? requiresMou
      ? [RESTRICTED_HOME_ITEM, MOU_NAV_ITEM]
      : [RESTRICTED_HOME_ITEM]
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
      {/* Brand — p-12 (tightened from Figma's p-24 per request). Logo
          renders at its natural w-full size; padding is small so the
          brand block doesn't eat vertical real estate. */}
      <div className="border-b border-[var(--color-border)] px-[12px] pt-[12px] pb-[12px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/TOKEN2049_Logo.svg"
          alt={`TOKEN2049 ${brandSubtitle}`}
          className="h-auto w-full"
        />
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
                      : "text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)] hover:text-[var(--color-nav-active-text)]",
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
          className="flex h-[64px] items-center gap-[12px] rounded-[8px] px-[12px] transition-colors duration-[var(--duration-normal)] hover:bg-[var(--color-nav-hover-bg)]"
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
              {user?.email ?? (isRestrictedAffiliate ? "New User" : "Marketing Partner")}
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
