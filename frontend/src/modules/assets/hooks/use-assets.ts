"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssets } from "../api/get-assets";
import { assetKeys } from "@/services/queries/assets";
import type { AssetType } from "../types";

const CAMPAIGN_PLACEHOLDER = "default";

export function useAssets(
  tenantId: string | undefined,
  type?: AssetType,
  options?: { visibleOnly?: boolean },
) {
  const visibleOnly = options?.visibleOnly ?? false;
  return useQuery({
    queryKey: [
      ...assetKeys.list(tenantId ?? "", CAMPAIGN_PLACEHOLDER, type ? { type } : undefined),
      visibleOnly ? "visible" : "all",
    ],
    queryFn: () => getAssets({ tenantId: tenantId!, type, visibleOnly }),
  });
}
