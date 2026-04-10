"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/modules/tenant-shell";
import { assetKeys } from "@/services/queries/assets";
import { uploadAsset, type UploadAssetParams } from "../api/upload-asset";

const CAMPAIGN_PLACEHOLDER = "default";

export function useUploadAsset() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Omit<UploadAssetParams, "tenantId">) =>
      uploadAsset({ ...params, tenantId: tenant!.id }),
    onSuccess: () => {
      // Invalidate by prefix so every variant of the assets query refetches —
      // both the admin (all) and affiliate (visible-only) views update.
      queryClient.invalidateQueries({
        queryKey: assetKeys.all(tenant!.id, CAMPAIGN_PLACEHOLDER),
      });
    },
  });
}
