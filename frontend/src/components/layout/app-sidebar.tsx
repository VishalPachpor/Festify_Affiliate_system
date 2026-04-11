"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTenant } from "@/modules/tenant-shell";
import { useAuth } from "@/modules/auth";
import { useApplicationStatus } from "@/modules/application";

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

function IconSales() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M8 2v12" />
      <path d="M5 5h4.5a2.5 2.5 0 010 5H5" />
      <path d="M5 10h5" />
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
      {/* Brand */}
      <div className="px-[var(--space-5)] pt-[var(--space-6)] pb-[var(--space-4)]">
        <Image
          src="/token.png"
          alt="TOKEN2049"
          width={188}
          height={24}
          className="h-[var(--space-6)] w-auto"
          priority
        />
        <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--space-4)] text-[var(--color-text-secondary)]">
          {brandSubtitle}
        </p>
      </div>

      <div className="mx-[var(--space-6)] h-px bg-[var(--color-border)]" />

      {/* Nav */}
      <nav className="flex-1 px-[var(--space-3)] py-[var(--space-4)]" aria-label="Dashboard sections">
        <ul className="flex flex-col gap-[var(--space-1)]">
          {visibleNavItems.map(({ href, label, Icon }) => {
            const active = isNavActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-[var(--space-3)] rounded-[var(--radius)] px-[var(--space-4)] py-[var(--space-3)]",
                    "font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--space-4)]",
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
      <div className="mx-[var(--space-6)] h-px bg-[var(--color-border)]" />
      <Link
        href="/dashboard/profile"
        className="flex items-center gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-4)] transition-colors duration-[var(--duration-normal)] hover:bg-[var(--color-surface-ghost-hover)]"
      >
        <div
          className="flex size-[var(--space-10)] shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)]"
          aria-hidden="true"
        >
          <span className="font-[var(--font-sans)] font-semibold text-[var(--text-xs)] text-[var(--color-primary-foreground)]">
            {user?.fullName
              ? user.fullName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
              : "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-[var(--font-sans)] font-medium text-[var(--text-sm)] leading-[var(--space-4)] text-[var(--color-text-primary)]">
            {user?.fullName ?? "User"}
          </p>
          <p className="truncate font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--space-4)] text-[var(--color-text-secondary)]">
            {user?.email ?? (isRestrictedAffiliate ? "New User" : "Affiliate")}
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
