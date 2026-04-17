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
    mutationFn: (params: UploadAssetParams) =>
      uploadAsset(params),
    onSuccess: () => {
      // Invalidate by prefix so every variant of the assets query refetches —
      // both the admin (all) and affiliate (visible-only) views update.
      // Match the same `tenantId ?? ""` fallback useAssets uses as its key,
      // otherwise this crashes with "Cannot read properties of null" when
      // running on a host where resolveTenant() returns null (e.g. localhost).
      queryClient.invalidateQueries({
        queryKey: assetKeys.all(tenant?.id ?? "", CAMPAIGN_PLACEHOLDER),
      });
    },
  });
}
