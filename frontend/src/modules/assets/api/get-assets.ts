import { apiClient } from "@/services/api/client";
import { assetsResponseSchema, type AssetsResponse, type AssetType } from "../types";

export type GetAssetsParams = {
  tenantId: string;
  type?: AssetType;
  visibleOnly?: boolean;
};

export async function getAssets(params: GetAssetsParams): Promise<AssetsResponse> {
  const raw = await apiClient<unknown>("/assets", {
    headers: { "x-tenant-id": params.tenantId },
    searchParams: {
      ...(params.type ? { type: params.type } : {}),
      ...(params.visibleOnly ? { visible: "true" } : {}),
    },
  });

  return assetsResponseSchema.parse(raw);
}
