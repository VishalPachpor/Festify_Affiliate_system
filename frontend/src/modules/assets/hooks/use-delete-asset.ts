"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/modules/tenant-shell";
import { assetKeys } from "@/services/queries/assets";
import { deleteAsset } from "../api/delete-asset";

const CAMPAIGN_PLACEHOLDER = "default";

export function useDeleteAsset() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      deleteAsset({ tenantId: tenant?.id ?? "", assetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.all(tenant?.id ?? "", CAMPAIGN_PLACEHOLDER),
      });
    },
  });
}
