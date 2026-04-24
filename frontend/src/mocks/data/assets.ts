import type { Asset } from "@/modules/assets/types";

// Mock data only — used by stories/tests when the real API isn't reachable.
// Real upload + CRUD happens through /api/assets via useUploadAsset() etc.
function mockUrls(id: string) {
  const base = "https://example.com/api/assets";
  return {
    fileUrl: `${base}/${id}/view`,
    viewUrl: `${base}/${id}/view`,
    downloadUrl: `${base}/${id}/download`,
  };
}

export const mockAssets: Asset[] = [
  {
    id: "asset-1",
    title: "TOKEN2049 Hero Banner",
    type: "banner",
    ...mockUrls("asset-1"),
    sizeBytes: 2_400_000,
    sizeLabel: "2.4 MB",
    mimeType: "image/png",
    visible: true,
    addedAt: "2026-03-25T10:00:00.000Z",
    thumbnailBg: "banner",
  },
  {
    id: "asset-2",
    title: "Email Invite Template",
    type: "email",
    ...mockUrls("asset-2"),
    sizeBytes: 156_000,
    sizeLabel: "156 KB",
    mimeType: "text/html",
    visible: true,
    addedAt: "2026-03-25T10:00:00.000Z",
    thumbnailBg: "email",
  },
  {
    id: "asset-3",
    title: "Social Media Square",
    type: "social",
    ...mockUrls("asset-3"),
    sizeBytes: 1_800_000,
    sizeLabel: "1.8 MB",
    mimeType: "image/jpeg",
    visible: true,
    addedAt: "2026-03-25T10:00:00.000Z",
    thumbnailBg: "social",
  },
  {
    id: "asset-4",
    title: "Promo Copy Snippets",
    type: "copy",
    ...mockUrls("asset-4"),
    sizeBytes: 24_000,
    sizeLabel: "24 KB",
    mimeType: "text/plain",
    visible: true,
    addedAt: "2026-03-25T10:00:00.000Z",
    thumbnailBg: "copy",
  },
  {
    id: "asset-5",
    title: "Affiliate Best Practices",
    type: "guide",
    ...mockUrls("asset-5"),
    sizeBytes: 1_200_000,
    sizeLabel: "1.2 MB",
    mimeType: "application/pdf",
    visible: true,
    addedAt: "2026-03-25T10:00:00.000Z",
    thumbnailBg: "guide",
  },
  {
    id: "asset-6",
    title: "Instagram Story Template",
    type: "social",
    ...mockUrls("asset-6"),
    sizeBytes: 980_000,
    sizeLabel: "980 KB",
    mimeType: "image/png",
    visible: true,
    addedAt: "2026-03-25T10:00:00.000Z",
    thumbnailBg: "story",
  },
];
