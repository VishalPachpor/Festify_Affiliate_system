"use client";

import { useState } from "react";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

// ── Types & mock data ─────────────────────────────────────────────────────────

type MaterialType = "banner" | "email" | "social" | "copy" | "guide";

type Material = {
  id: string;
  title: string;
  type: MaterialType;
  size: string;
  visible: boolean;
  addedAt: string;
  thumbnailGradient: string;
  icon: "image" | "email" | "document" | "download";
};

const MATERIALS: Material[] = [
  { id: "1", title: "TOKEN2049 Hero Banner", type: "banner", size: "2.4 MB", visible: true, addedAt: "2026-03-25", thumbnailGradient: "linear-gradient(135deg, #4A3728 0%, #6B5D52 50%, #7A6E8A 100%)", icon: "image" },
  { id: "2", title: "Email Invite Template", type: "email", size: "156 KB", visible: true, addedAt: "2026-03-25", thumbnailGradient: "linear-gradient(135deg, #1A4A4A 0%, #2B6B6B 50%, #3A7A7A 100%)", icon: "email" },
  { id: "3", title: "Social Media Square", type: "social", size: "1.8 MB", visible: true, addedAt: "2026-03-25", thumbnailGradient: "linear-gradient(135deg, #5A3A5A 0%, #7A4A6A 50%, #9A6A8A 100%)", icon: "image" },
  { id: "4", title: "Promo Copy Snippets", type: "copy", size: "24 KB", visible: true, addedAt: "2026-03-25", thumbnailGradient: "linear-gradient(135deg, #4A3A28 0%, #5A4A38 50%, #6A5A48 100%)", icon: "document" },
  { id: "5", title: "Affiliate Best Practices", type: "guide", size: "1.2 MB", visible: true, addedAt: "2026-03-25", thumbnailGradient: "linear-gradient(135deg, #1A3A4A 0%, #2A5A6A 50%, #3A6A7A 100%)", icon: "download" },
  { id: "6", title: "Instagram Story Template", type: "social", size: "980 KB", visible: true, addedAt: "2026-03-25", thumbnailGradient: "linear-gradient(135deg, #4A3A6A 0%, #6A4A8A 50%, #8A6A9A 100%)", icon: "image" },
];

const FILTER_TABS: { label: string; value: MaterialType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Banners", value: "banner" },
  { label: "Email Templates", value: "email" },
  { label: "Social Media", value: "social" },
  { label: "Copy", value: "copy" },
  { label: "Guides", value: "guide" },
];

const TYPE_BADGE_STYLE = { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.60)" };

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 10V2M8 2l3 3M8 2L5 5" />
      <path d="M2 10v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2v7M7 9l2.5-2.5M7 9L4.5 6.5" />
      <path d="M2 9.5v1.5a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0012 11V9.5" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h10M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M4 4l.7 9.1a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="2" width="10" height="9" rx="1.5" />
      <path d="M4 1v2M8 1v2M1 5h10" />
    </svg>
  );
}

// Thumbnail center icons
function ThumbIconImage() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="22" height="22" rx="3" />
      <circle cx="10" cy="10" r="2.5" />
      <path d="M25 19l-5-5-8 8" />
    </svg>
  );
}

function ThumbIconEmail() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="24" height="18" rx="3" />
      <path d="M2 8l12 7 12-7" />
    </svg>
  );
}

function ThumbIconDocument() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2h10l6 6v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
      <path d="M17 2v6h6" />
      <path d="M9 13h10M9 17h10M9 21h6" />
    </svg>
  );
}

function ThumbIconDownload() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2h10l6 6v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
      <path d="M17 2v6h6" />
      <path d="M14 12v7M14 19l3-3M14 19l-3-3" />
    </svg>
  );
}

const THUMB_ICONS: Record<Material["icon"], () => React.JSX.Element> = {
  image: ThumbIconImage,
  email: ThumbIconEmail,
  document: ThumbIconDocument,
  download: ThumbIconDownload,
};

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-[1.25rem] w-[2.25rem] shrink-0 cursor-pointer rounded-full transition-colors duration-200"
      style={{ background: checked ? "#5B8DEF" : "rgba(255,255,255,0.15)" }}
    >
      <span
        className="pointer-events-none inline-block size-[1rem] rounded-full bg-white shadow transition-transform duration-200"
        style={{
          transform: checked ? "translate(1.05rem, 0.125rem)" : "translate(0.15rem, 0.125rem)",
        }}
      />
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminMaterialsPage() {
  const [activeFilter, setActiveFilter] = useState<MaterialType | "all">("all");
  const [materials, setMaterials] = useState(MATERIALS);

  const filtered = activeFilter === "all" ? materials : materials.filter((m) => m.type === activeFilter);

  function toggleVisibility(id: string) {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m)),
    );
  }

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
              Marketing Materials Management
            </h2>
            <p className="mt-[0.3rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
              Upload and manage marketing materials for affiliates
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-[0.5rem] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <IconUpload />
            Upload Asset
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-[var(--space-2)]">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveFilter(tab.value)}
                className={[
                  "rounded-[var(--radius)] border px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-snug)] transition-colors duration-[var(--duration-normal)]",
                  isActive
                    ? "border-[rgba(255,255,255,0.08)] !bg-[rgba(255,255,255,0.95)] !text-[#000000]"
                    : "border-transparent bg-transparent text-[rgba(255,255,255,0.55)] hover:text-[var(--color-text-primary)]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Material cards grid */}
        <div className="grid grid-cols-1 gap-[var(--space-5)] md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((mat) => {
            const ThumbIcon = THUMB_ICONS[mat.icon];
            return (
              <article
                key={mat.id}
                className="overflow-hidden rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent"
              >
                {/* Thumbnail */}
                <div
                  className="flex h-[10rem] items-center justify-center"
                  style={{ background: mat.thumbnailGradient }}
                >
                  <ThumbIcon />
                </div>

                {/* Content */}
                <div className="px-[var(--space-4)] py-[var(--space-4)]">
                  {/* Title */}
                  <h3 className="font-[var(--font-display)] text-[var(--text-base)] font-bold leading-[var(--leading-snug)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
                    {mat.title}
                  </h3>

                  {/* Type badge + size */}
                  <div className="mt-[0.35rem] flex items-center gap-[var(--space-2)]">
                    <span
                      className="inline-block rounded-[0.25rem] px-[0.45rem] py-[0.1rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
                      style={{ background: TYPE_BADGE_STYLE.bg, color: TYPE_BADGE_STYLE.text }}
                    >
                      {mat.type}
                    </span>
                    <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
                      {mat.size}
                    </span>
                  </div>

                  {/* Visible toggle */}
                  <div className="mt-[0.6rem] flex items-center gap-[var(--space-2)]">
                    <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.50)]">
                      Visible to affiliates:
                    </span>
                    <Toggle
                      checked={mat.visible}
                      onChange={() => toggleVisibility(mat.id)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="mt-[0.7rem] flex items-center gap-[var(--space-2)]">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-[0.4rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-3)] py-[0.4rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <IconDownload />
                      Download
                    </button>
                    <button
                      type="button"
                      aria-label="Preview"
                      className="flex items-center justify-center rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] p-[0.4rem] text-[rgba(255,255,255,0.40)] transition-colors hover:text-[rgba(255,255,255,0.80)] hover:border-[rgba(255,255,255,0.20)]"
                    >
                      <IconEye />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      className="flex items-center justify-center rounded-[var(--radius)] border border-[rgba(239,68,68,0.25)] p-[0.4rem] text-[#EF4444] transition-colors hover:bg-[rgba(239,68,68,0.10)] hover:border-[rgba(239,68,68,0.40)]"
                    >
                      <IconTrash />
                    </button>
                  </div>

                  {/* Date */}
                  <div className="mt-[0.6rem] flex items-center gap-[0.35rem]">
                    <span className="text-[rgba(255,255,255,0.35)]">
                      <IconCalendar />
                    </span>
                    <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.40)]">
                      Added {mat.addedAt}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
