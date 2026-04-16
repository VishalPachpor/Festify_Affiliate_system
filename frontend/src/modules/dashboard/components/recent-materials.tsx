"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useAssets } from "@/modules/assets/hooks/use-assets";

// Figma 60:1454 — article/document icon 24px
function IconArticle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

// Derive display media type from mime type
function getDisplayMediaType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") return "ZIP";
  if (mimeType === "text/html") return "HTML";
  if (mimeType === "text/plain") return "TXT";
  return mimeType.split("/")[1]?.toUpperCase() ?? "File";
}

export function RecentMaterials() {
  const { tenant } = useTenant();
  const { data, isLoading } = useAssets(tenant?.id);
  const assets = (data?.assets ?? []).slice(0, 3);

  return (
    <section
      aria-label="Recent materials"
      className="overflow-hidden rounded-[8px] p-[24px]"
      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)", boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.2)" }}
    >
      {/* Heading — Figma 55:2364: Oswald Medium 18px */}
      <div className="border-b border-[rgba(255,255,255,0.1)] pb-[24px]">
        <h2 className="font-[var(--font-display)] text-[18px] font-medium leading-[20px] tracking-[-0.2px] text-[#F0F0F0]">
          Recent Materials
        </h2>
      </div>

      {/* Items — Figma 55:2365 */}
      <div className="flex flex-col">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-[16px] border-b border-[rgba(255,255,255,0.05)] py-[20px] last:border-b-0">
              <div className="size-[48px] shrink-0 animate-pulse rounded-[8px] bg-[rgba(255,255,255,0.08)]" />
              <div className="flex-1 space-y-[4px]">
                <div className="h-[16px] w-3/4 animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.08)]" />
                <div className="h-[12px] w-1/2 animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.08)]" />
              </div>
            </div>
          ))
        ) : assets.length === 0 ? (
          <p className="py-[24px] font-[var(--font-sans)] text-[14px] text-[#9CA4B7]">
            No materials uploaded yet.
          </p>
        ) : (
          assets.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center gap-[16px] py-[20px] pl-[16px] ${
                i < assets.length - 1 ? "border-b border-[rgba(255,255,255,0.05)]" : ""
              }`}
            >
              {/* Icon container — Figma 55:2367: 48px, bg rgba(28,74,166,0.2), border rgba(28,74,166,0.3) */}
              <div className="flex size-[48px] shrink-0 items-center justify-center rounded-[8px] border border-[rgba(28,74,166,0.3)] bg-[rgba(28,74,166,0.2)] text-[#A6D1FF]">
                <IconArticle />
              </div>
              <div className="min-w-0 flex-1">
                {/* Title — Figma: Medium 16px, leading 24px */}
                <p className="truncate font-[var(--font-sans)] text-[16px] font-medium leading-[24px] text-[#F0F0F0]">
                  {item.title}
                </p>
                {/* Subtitle — Figma: Regular 12px, #9CA4B7 */}
                <p className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#9CA4B7]">
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
