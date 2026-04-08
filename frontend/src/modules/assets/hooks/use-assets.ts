"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssets } from "../api/get-assets";
import { assetKeys } from "@/services/queries/assets";
import type { AssetType } from "../types";

const CAMPAIGN_PLACEHOLDER = "default";

export function useAssets(tenantId: string | undefined, type?: AssetType) {
  return useQuery({
    queryKey: assetKeys.list(tenantId ?? "", CAMPAIGN_PLACEHOLDER, type ? { type } : undefined),
    queryFn: () => getAssets({ tenantId: tenantId!, type }),
    enabled: !!tenantId,
  });
}
