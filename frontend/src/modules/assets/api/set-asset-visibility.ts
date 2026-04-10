import { apiClient } from "@/services/api/client";
import { assetSchema, type Asset } from "../types";

export type SetAssetVisibilityParams = {
  tenantId: string;
  assetId: string;
  visible: boolean;
};

export async function setAssetVisibility(
  params: SetAssetVisibilityParams,
): Promise<Asset> {
  const raw = await apiClient<unknown>(`/assets/${params.assetId}/visibility`, {
    method: "PATCH",
    headers: { "x-tenant-id": params.tenantId },
    body: { visible: params.visible },
  });
  return assetSchema.parse(raw);
}
