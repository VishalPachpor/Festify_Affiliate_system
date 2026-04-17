"use client";

import { useState } from "react";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { useTenant } from "@/modules/tenant-shell";
import {
  useAssets,
  useDeleteAsset,
  useSetAssetVisibility,
} from "@/modules/assets";
import type { AssetType } from "@/modules/assets";
import { UploadAssetModal } from "@/modules/assets/components/upload-asset-modal";

type MaterialType = AssetType;

type ThumbIcon = "image" | "email" | "document" | "download";

const TYPE_TO_ICON: Record<MaterialType, ThumbIcon> = {
  banner: "image",
  email: "email",
  social: "image",
  copy: "document",
  guide: "download",
};

const TYPE_TO_GRADIENT: Record<MaterialType, string> = {
  banner: "linear-gradient(135deg, #6B3E1E 0%, #9B5A3A 45%, #B07BA8 100%)",
  email: "linear-gradient(135deg, #0F5E5E 0%, #158F8F 50%, #2AA8A8 100%)",
  social: "linear-gradient(135deg, #7A2B7A 0%, #A14A8C 50%, #D083B6 100%)",
  copy: "linear-gradient(135deg, #6B4A1E 0%, #9B6E2B 50%, #C08C3E 100%)",
  guide: "linear-gradient(135deg, #0F3E5E 0%, #1F6A9B 50%, #3A96C8 100%)",
};

// Design-driven ordering (Figma). Sorted by type priority so row 1/row 2
// match the layout spec, not backend insertion order.
const TYPE_ORDER: Record<MaterialType, number> = {
  banner: 0,
  email: 1,
  social: 2,
  copy: 3,
  guide: 4,
};

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
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="22" height="22" rx="3" />
      <circle cx="10" cy="10" r="2.5" />
      <path d="M25 19l-5-5-8 8" />
    </svg>
  );
}

function ThumbIconEmail() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="24" height="18" rx="3" />
      <path d="M2 8l12 7 12-7" />
    </svg>
  );
}

function ThumbIconDocument() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2h10l6 6v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
      <path d="M17 2v6h6" />
      <path d="M9 13h10M9 17h10M9 21h6" />
    </svg>
  );
}

function ThumbIconDownload() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2h10l6 6v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" />
      <path d="M17 2v6h6" />
      <path d="M14 12v7M14 19l3-3M14 19l-3-3" />
    </svg>
  );
}

const THUMB_ICONS: Record<ThumbIcon, () => React.JSX.Element> = {
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

function formatAddedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminMaterialsPage() {
  const { tenant } = useTenant();
  const [activeFilter, setActiveFilter] = useState<MaterialType | "all">("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  // Real list. The previous version reached around to apiClient with the wrong
  // URL ("/tenants/<id>/assets") and silently 404'd — useAssets() goes through
  // the canonical /api/assets route with the x-tenant-id header.
  const { data: assetsData, isLoading } = useAssets(
    tenant?.id,
    activeFilter === "all" ? undefined : activeFilter,
  );
  const deleteMutation = useDeleteAsset();
  const visibilityMutation = useSetAssetVisibility();

  const assets = assetsData?.assets ?? [];

  const materials = assets
    .map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      size: a.sizeLabel,
      visible: a.visible,
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      addedAt: formatAddedAt(a.addedAt),
      thumbnailGradient: TYPE_TO_GRADIENT[a.type] ?? TYPE_TO_GRADIENT.banner,
      icon: TYPE_TO_ICON[a.type] ?? ("image" as ThumbIcon),
      isImage: a.mimeType.startsWith("image/"),
    }))
    .sort((a, b) => {
      const byType = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
      if (byType !== 0) return byType;
      return a.title.localeCompare(b.title);
    });

  // Filter is enforced server-side via useAssets(type), so the array is
  // already narrowed when activeFilter !== "all".
  const filtered = materials;

  function handleToggleVisibility(id: string, current: boolean) {
    visibilityMutation.mutate({ assetId: id, visible: !current });
  }

  function handleDelete(id: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this asset? This cannot be undone.")) {
      return;
    }
    deleteMutation.mutate(id);
  }

  function handleDownload(fileUrl: string) {
    if (typeof window !== "undefined") window.open(fileUrl, "_blank", "noopener,noreferrer");
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
            <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
              Upload and manage marketing materials for affiliates
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
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

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-[var(--radius)] border border-dashed border-[rgba(255,255,255,0.14)] bg-transparent px-[var(--space-6)] py-[var(--space-8)] text-center">
            <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.55)]">
              No materials yet. Click <strong className="text-[var(--color-text-primary)]">Upload Asset</strong> to share your first banner, email template, or guide with affiliates.
            </p>
          </div>
        )}

        {/* Material cards grid */}
        <div className="grid grid-cols-1 gap-[var(--space-6)] md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((mat) => {
            const ThumbIcon = THUMB_ICONS[mat.icon];
            return (
              <article
                key={mat.id}
                className="flex min-h-[19rem] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] transition-colors duration-[var(--duration-normal)] hover:border-[rgba(255,255,255,0.10)]"
              >
                {/* Thumbnail */}
                <div
                  className="relative flex h-[10rem] shrink-0 items-center justify-center overflow-hidden"
                  style={{ background: mat.thumbnailGradient }}
                >
                  {mat.isImage ? (
                    <img
                      src={mat.fileUrl}
                      alt={mat.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : null}
                  {/* Fallback icon — always rendered behind the image; visible when image fails or for non-image types */}
                  <ThumbIcon />
                </div>

                {/* Content — flex-1 so footer (actions + date) sits flush at the bottom of every card */}
                <div className="flex flex-1 flex-col px-[var(--space-4)] py-[var(--space-4)]">
                  {/* Title */}
                  <h3 className="font-[var(--font-display)] text-[var(--text-base)] font-bold leading-[var(--leading-snug)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
                    {mat.title}
                  </h3>

                  {/* Type badge + size */}
                  <div className="mt-[var(--space-2)] flex items-center gap-[var(--space-2)]">
                    <span
                      className="inline-block rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium capitalize"
                      style={{ background: TYPE_BADGE_STYLE.bg, color: TYPE_BADGE_STYLE.text }}
                    >
                      {mat.type}
                    </span>
                    <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
                      {mat.size}
                    </span>
                  </div>

                  {/* Visible toggle */}
                  <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-3)]">
                    <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.55)]">
                      Visible to affiliates
                    </span>
                    <Toggle
                      checked={mat.visible}
                      onChange={() => handleToggleVisibility(mat.id, mat.visible)}
                    />
                  </div>

                  {/* Spacer — pushes actions + date to the bottom of the card for consistent grid alignment */}
                  <div className="flex-1" />

                  {/* Actions */}
                  <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-2)]">
                    <button
                      type="button"
                      onClick={() => handleDownload(mat.fileUrl)}
                      className="flex flex-1 items-center justify-center gap-[var(--space-2)] rounded-[var(--radius)] px-[var(--space-3)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(28,74,166,0.18)]"
                      style={{ background: "rgba(28,74,166,0.10)" }}
                    >
                      <IconDownload />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(mat.fileUrl)}
                      aria-label="Preview"
                      className="flex items-center justify-center rounded-[var(--radius)] border p-[var(--space-2)] text-[rgba(255,255,255,0.35)] transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-[rgba(255,255,255,0.70)]"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <IconEye />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(mat.id)}
                      disabled={deleteMutation.isPending}
                      aria-label="Delete"
                      className="flex items-center justify-center rounded-[var(--radius)] border p-[var(--space-2)] text-[rgba(239,68,68,0.55)] transition-colors hover:border-[rgba(239,68,68,0.30)] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#EF4444] disabled:opacity-40"
                      style={{ borderColor: "rgba(239,68,68,0.14)" }}
                    >
                      <IconTrash />
                    </button>
                  </div>

                  {/* Date */}
                  <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-2)]">
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

      <UploadAssetModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </DashboardStageCanvas>
  );
}
