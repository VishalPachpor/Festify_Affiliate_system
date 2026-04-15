"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useAssets } from "@/modules/assets/hooks/use-assets";

function IconFile() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 2H5.5A1.5 1.5 0 004 3.5v11A1.5 1.5 0 005.5 16h7a1.5 1.5 0 001.5-1.5V6z" />
      <path d="M11 2v4h4" />
      <path d="M7 9.25h4M7 12h4" />
    </svg>
  );
}

// Derive Figma-style display media type from mime type.
// Figma shows generic tokens like "image", "ZIP", "PDF" — not the asset category.
function getDisplayMediaType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") return "ZIP";
  if (mimeType === "text/html") return "HTML";
  if (mimeType === "text/plain") return "TXT";
  return mimeType.split("/")[1]?.toUpperCase() ?? "file";
}

export function RecentMaterials() {
  const { tenant } = useTenant();
  const { data, isLoading } = useAssets(tenant?.id);
  const assets = (data?.assets ?? []).slice(0, 3);

  return (
    <section
      aria-label="Recent materials"
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]"
    >
      <h2 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        Recent Materials
      </h2>

      <div className="mt-[var(--space-4)] divide-y divide-[var(--color-border)]">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-[var(--space-4)] py-[var(--space-4)]">
              <div className="size-[var(--space-10)] shrink-0 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]" />
              <div className="flex-1 space-y-[var(--space-1)]">
                <div className="h-[1rem] w-3/4 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
                <div className="h-[var(--text-sm)] w-1/2 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
              </div>
            </div>
          ))
        ) : assets.length === 0 ? (
          <p className="py-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
            No materials uploaded yet.
          </p>
        ) : (
          assets.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-[var(--space-4)] py-[var(--space-4)]"
            >
              <div className="flex size-[var(--space-10)] shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[rgba(var(--color-primary-rgb),0.22)] text-[var(--color-text-white)]">
                <IconFile />
              </div>
              <div className="min-w-0">
                <p className="truncate font-[var(--font-sans)] text-[var(--text-base)] leading-[var(--space-5)] text-[var(--color-text-primary)]">
                  {item.title}
                </p>
                <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--space-4)] text-[var(--color-text-secondary)]">
                  {getDisplayMediaType(item.mimeType)} · {item.sizeLabel}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
