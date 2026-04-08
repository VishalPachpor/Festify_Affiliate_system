"use client";

import { useState } from "react";
import { useTenant } from "@/modules/tenant-shell";
import { useAssets } from "@/modules/assets";
import type { Asset, AssetType } from "@/modules/assets";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { cn } from "@/lib/utils";

const FILTER_TABS: { label: string; value: AssetType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Banners", value: "banner" },
  { label: "Email Templates", value: "email" },
  { label: "Social Media", value: "social" },
  { label: "Copy", value: "copy" },
  { label: "Guides", value: "guide" },
];

function IconDownload() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2v7M4 6.5l3 3 3-3" />
      <path d="M2 11h10" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="2.5" width="9" height="8" rx="1.2" />
      <path d="M4 1.5v2M8 1.5v2M1.5 4.5h9" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M20 16l-4.5-4.5L8 19" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M5.5 8l6.5 5 6.5-5" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

function PreviewIcon({ type }: { type: AssetType }) {
  if (type === "email") return <IconMail />;
  if (type === "copy" || type === "guide") return <IconFile />;
  return <IconImage />;
}

function formatAddedDate(iso: string) {
  return iso.slice(0, 10);
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <article className="h-full overflow-hidden rounded-[0.45rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,24,42,0.92)]">
      <div
        className="flex h-[12.6rem] items-center justify-center text-[rgba(255,255,255,0.72)]"
        style={{ background: asset.thumbnailBg }}
        aria-hidden="true"
      >
        <PreviewIcon type={asset.type} />
      </div>

      <div className="px-[0.9rem] pb-[0.9rem] pt-[0.8rem]">
        <h3 className="truncate font-[var(--font-display)] text-[1.35rem] font-bold leading-[1.3rem] tracking-[-0.03em] text-[var(--color-text-primary)]">
          {asset.title}
        </h3>

        <div className="mt-[0.55rem] flex items-center gap-[0.5rem]">
          <span className="rounded-[0.35rem] bg-[rgba(255,255,255,0.08)] px-[0.48rem] py-[0.18rem] font-[var(--font-sans)] text-[0.7rem] font-medium leading-[0.95rem] text-[rgba(255,255,255,0.9)]">
            {asset.type}
          </span>
          <span className="font-[var(--font-sans)] text-[0.72rem] leading-[0.95rem] text-[rgba(255,255,255,0.68)]">
            {asset.sizeLabel}
          </span>
        </div>

        <button
          type="button"
          className="mt-[0.85rem] flex h-[3rem] w-full items-center justify-center gap-[0.55rem] rounded-[0.65rem] border border-[rgba(59,102,208,0.95)] bg-transparent font-[var(--font-sans)] text-[1.05rem] font-medium text-[var(--color-text-primary)] transition-colors duration-[var(--duration-normal)] hover:bg-[rgba(59,102,208,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          aria-label={`Download ${asset.title}`}
        >
          <IconDownload />
          Download
        </button>

        <div className="mt-[0.9rem] flex items-center gap-[0.4rem] text-[rgba(255,255,255,0.74)]">
          <IconCalendar />
          <span className="font-[var(--font-sans)] text-[0.72rem] leading-[0.95rem]">
            Added {formatAddedDate(asset.addedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

function AssetCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[0.45rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,24,42,0.92)]">
      <div className="h-[12.6rem] animate-pulse bg-[rgba(51,71,124,0.8)]" />
      <div className="space-y-[0.7rem] px-[0.9rem] pb-[0.9rem] pt-[0.8rem]">
        <div className="h-[1.2rem] w-[70%] animate-pulse rounded-[0.2rem] bg-[rgba(255,255,255,0.08)]" />
        <div className="h-[0.9rem] w-[38%] animate-pulse rounded-[0.2rem] bg-[rgba(255,255,255,0.08)]" />
        <div className="h-[3rem] w-full animate-pulse rounded-[0.65rem] bg-[rgba(28,74,166,0.2)]" />
        <div className="h-[0.8rem] w-[42%] animate-pulse rounded-[0.2rem] bg-[rgba(255,255,255,0.08)]" />
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  const { tenant } = useTenant();
  const [activeFilter, setActiveFilter] = useState<AssetType | "all">("all");
  const { data, isLoading } = useAssets(
    tenant?.id,
    activeFilter === "all" ? undefined : activeFilter,
  );

  const assets = (data?.assets ?? []).slice(0, 6);

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        <section className="w-full">
          <div className="max-w-[32rem]">
            <h2 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
              Marketing Materials
            </h2>
            <p className="mt-[0.25rem] font-[var(--font-sans)] text-[0.82rem] leading-[1.08rem] text-[var(--color-text-secondary)]">
              Download and use these assets for your TOKEN2049 promotions.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter materials by type"
            className="mt-[0.8rem] flex flex-wrap gap-[0.45rem]"
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.value;

              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveFilter(tab.value)}
                  className={cn(
                    "rounded-[0.35rem] px-[0.75rem] py-[0.38rem] font-[var(--font-sans)] text-[0.72rem] leading-[0.95rem] transition-colors duration-[var(--duration-normal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                    isActive
                      ? "bg-[rgba(255,255,255,0.96)] text-[var(--color-text-dark)]"
                      : "bg-[rgba(20,24,42,0.9)] text-[rgba(255,255,255,0.62)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text-primary)]",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <section
            aria-label="Marketing materials"
            aria-busy={isLoading}
            aria-live="polite"
            className="mt-[1rem]"
          >
            {isLoading ? (
              <div className="grid w-full grid-cols-1 items-stretch gap-[1.1rem] md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <AssetCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid w-full grid-cols-1 items-stretch gap-[1.1rem] md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
                {assets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            )}
          </section>
        </section>
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
