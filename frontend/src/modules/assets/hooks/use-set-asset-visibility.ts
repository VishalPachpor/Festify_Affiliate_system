"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/modules/tenant-shell";
import { assetKeys } from "@/services/queries/assets";
import { setAssetVisibility } from "../api/set-asset-visibility";

const CAMPAIGN_PLACEHOLDER = "default";

export function useSetAssetVisibility() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, visible }: { assetId: string; visible: boolean }) =>
      setAssetVisibility({ tenantId: tenant!.id, assetId, visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: assetKeys.all(tenant!.id, CAMPAIGN_PLACEHOLDER),
      });
    },
  });
}
