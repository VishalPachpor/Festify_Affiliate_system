import { apiClient } from "@/services/api/client";

export type DeleteAssetParams = {
  tenantId: string;
  assetId: string;
};

export async function deleteAsset(
  params: DeleteAssetParams,
): Promise<{ id: string; deleted: boolean }> {
  return apiClient<{ id: string; deleted: boolean }>(`/assets/${params.assetId}`, {
    method: "DELETE",
    headers: { "x-tenant-id": params.tenantId },
  });
}
