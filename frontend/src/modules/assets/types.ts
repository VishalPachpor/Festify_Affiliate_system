import { z } from "zod";

export const assetTypeSchema = z.enum(["banner", "email", "social", "copy", "guide"]);
export type AssetType = z.infer<typeof assetTypeSchema>;

export const assetSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: assetTypeSchema,
  sizeLabel: z.string(),
  addedAt: z.string(),
  thumbnailBg: z.string(), // CSS color token name used for thumbnail bg
});

export const assetsResponseSchema = z.object({
  assets: z.array(assetSchema),
});

export type Asset = z.infer<typeof assetSchema>;
export type AssetsResponse = z.infer<typeof assetsResponseSchema>;
