import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { assetsResponseSchema, type AssetsResponse, type AssetType } from "../types";

export type GetAssetsParams = {
  tenantId: string;
  type?: AssetType;
};

export async function getAssets(params: GetAssetsParams): Promise<AssetsResponse> {
  if (isMockEnabled()) {
    const { mockGetAssets } = await import("@/mocks/handlers/assets");
    return mockGetAssets(params.type);
  }

  const raw = await apiClient<unknown>("/assets", {
    searchParams: {
      tenantId: params.tenantId,
      ...(params.type ? { type: params.type } : {}),
    },
  });

  return assetsResponseSchema.parse(raw);
}
