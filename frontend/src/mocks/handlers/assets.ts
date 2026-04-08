import { delay } from "../utils";
import { mockAssets } from "../data/assets";
import { assetsResponseSchema, type AssetType } from "@/modules/assets/types";

export async function mockGetAssets(type?: AssetType) {
  await delay();

  const filtered = type
    ? mockAssets.filter((a) => a.type === type)
    : mockAssets;

  return assetsResponseSchema.parse({ assets: filtered });
}
