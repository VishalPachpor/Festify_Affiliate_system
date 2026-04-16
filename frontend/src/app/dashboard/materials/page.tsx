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

// Figma-exact gradient per asset type (node 60:1975)
const CARD_GRADIENTS: Record<AssetType, string> = {
  banner:
    "linear-gradient(152deg, rgba(43,127,255,0.2) 0%, rgba(173,70,255,0.2) 100%), linear-gradient(90deg, rgb(21,26,43) 0%, rgb(21,26,43) 100%)",
  email:
    "linear-gradient(152deg, rgba(0,201,80,0.2) 0%, rgba(0,188,125,0.2) 100%), linear-gradient(90deg, rgb(21,26,43) 0%, rgb(21,26,43) 100%)",
  social:
    "linear-gradient(152deg, rgba(246,51,154,0.2) 0%, rgba(255,32,86,0.2) 100%), linear-gradient(90deg, rgb(21,26,43) 0%, rgb(21,26,43) 100%)",
  copy:
    "linear-gradient(152deg, rgba(254,154,0,0.2) 0%, rgba(255,105,0,0.2) 100%), linear-gradient(90deg, rgb(21,26,43) 0%, rgb(21,26,43) 100%)",
  guide:
    "linear-gradient(152deg, rgba(0,184,219,0.2) 0%, rgba(43,127,255,0.2) 100%), linear-gradient(90deg, rgb(21,26,43) 0%, rgb(21,26,43) 100%)",
};

function formatAddedDate(iso: string) {
  return iso.slice(0, 10);
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <article className="h-full overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,22,40,0.5)] p-px">
      {/* Gradient preview — 192px, centered icon */}
      <div
        className="flex h-[192px] items-center justify-center text-[rgba(255,255,255,0.55)]"
        style={{ backgroundImage: CARD_GRADIENTS[asset.type] ?? CARD_GRADIENTS.banner }}
        aria-hidden="true"
      >
        <PreviewIcon type={asset.type} />
      </div>

      {/* Card body — p-16, gap-12 */}
      <div className="flex flex-col gap-[12px] p-[16px]">
        {/* Title — Oswald Medium 18px, tracking -0.2px */}
        <h3 className="truncate font-[var(--font-display)] text-[18px] font-medium leading-[20px] tracking-[-0.2px] text-white">
          {asset.title}
        </h3>

        {/* Badge + size */}
        <div className="flex items-center gap-[8px]">
          <span className="rounded-[4px] bg-[rgba(156,164,183,0.2)] px-[8px] py-[4px] font-[var(--font-sans)] text-[12px] font-medium leading-[15px] text-[#eaeaea]">
            {asset.type}
          </span>
          <span className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#b0b8cc]">
            {asset.sizeLabel}
          </span>
        </div>

        {/* Download button — border #1c4aa6 */}
        <a
          href={asset.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex h-[37px] w-full items-center justify-center gap-[8px] rounded-[8px] border border-[#1c4aa6] bg-transparent font-[var(--font-sans)] text-[14px] font-semibold leading-[21px] text-[#f0f0f0] transition-colors duration-[var(--duration-normal)] hover:bg-[rgba(28,74,166,0.15)]"
          aria-label={`Download ${asset.title}`}
        >
          <IconDownload />
          Download
        </a>

        {/* Added date — 12px #eaeaea */}
        <div className="flex items-center gap-[8px] text-[#eaeaea]">
          <IconCalendar />
          <span className="font-[var(--font-sans)] text-[12px] leading-[18px]">
            Added {formatAddedDate(asset.addedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

function AssetCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,24,42,0.92)]">
      <div className="h-[12rem] animate-pulse bg-[rgba(51,71,124,0.8)]" />
      <div className="space-y-[var(--space-3)] p-[var(--space-4)]">
        <div className="h-[var(--space-5)] w-[70%] animate-pulse rounded-[var(--space-1)] bg-[rgba(255,255,255,0.08)]" />
        <div className="h-[var(--space-4)] w-[38%] animate-pulse rounded-[var(--space-1)] bg-[rgba(255,255,255,0.08)]" />
        <div className="h-[37px] w-full animate-pulse rounded-[var(--radius-md)] bg-[rgba(28,74,166,0.2)]" />
        <div className="h-[var(--space-3)] w-[42%] animate-pulse rounded-[var(--space-1)] bg-[rgba(255,255,255,0.08)]" />
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
    { visibleOnly: true }, // affiliates only see what the organizer flagged visible
  );

  const assets = (data?.assets ?? []).slice(0, 6);
  const eventName = tenant?.name?.split(" ")[0] ?? "TOKEN2049";

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        <section className="w-full">
          <div className="max-w-[32rem]">
            <h2 className="font-[var(--font-display)] text-[24px] font-bold leading-[32px] tracking-[-0.3px] text-white">
              Marketing Materials
            </h2>
            <p className="mt-[8px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[#e5e5e5]">
              Download and use these assets for your {eventName} promotions.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter materials by type"
            className="mt-[var(--space-8)] flex flex-wrap gap-[var(--space-2)]"
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
                  className="inline-flex h-[35px] items-center justify-center rounded-[8px] border-none px-[16px] font-[var(--font-sans)] text-[14px] leading-[21px] transition-colors duration-[var(--duration-normal)]"
                  style={{
                    background: isActive ? "#ddd" : "#0f1628",
                    color: isActive ? "#0b0e1a" : "#b0b8cc",
                  }}
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
            className="mt-[var(--space-8)]"
          >
            {isLoading ? (
              <div className="grid w-full grid-cols-1 items-stretch gap-[24px] md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <AssetCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid w-full grid-cols-1 items-stretch gap-[24px] md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))]">
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
