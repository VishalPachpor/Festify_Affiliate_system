import { z } from "zod";

export const assetTypeSchema = z.enum(["banner", "email", "social", "copy", "guide"]);
export type AssetType = z.infer<typeof assetTypeSchema>;

export const assetSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: assetTypeSchema,
  // Inline view URL (same as viewUrl) — kept for backward compatibility.
  fileUrl: z.string(),
  viewUrl: z.string(),
  downloadUrl: z.string(),
  // Direct presigned GET to Spaces, only present for image MIME types.
  // Use this for <img src> to avoid apiAuth (which image tags can't satisfy).
  previewUrl: z.string().nullable().optional(),
  sizeBytes: z.number(),
  sizeLabel: z.string(),
  mimeType: z.string(),
  visible: z.boolean(),
  addedAt: z.string(),
  thumbnailBg: z.string(), // CSS color token name used for thumbnail bg
});

export const assetsResponseSchema = z.object({
  assets: z.array(assetSchema),
  total: z.number().optional(),
});

export type Asset = z.infer<typeof assetSchema>;
export type AssetsResponse = z.infer<typeof assetsResponseSchema>;
