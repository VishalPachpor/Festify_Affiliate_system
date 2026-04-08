"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { PayoutsFilterState, PayoutStatus } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function usePayoutsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: PayoutsFilterState = useMemo(() => ({
    page: Number(searchParams.get("page")) || DEFAULT_PAGE,
    pageSize: Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE,
    status: (searchParams.get("status") as PayoutStatus) || undefined,
    affiliateId: searchParams.get("affiliateId") || undefined,
    sortBy: (searchParams.get("sortBy") as PayoutsFilterState["sortBy"]) || undefined,
    sortOrder: (searchParams.get("sortOrder") as PayoutsFilterState["sortOrder"]) || undefined,
  }), [searchParams]);

  const setFilters = useCallback(
    (updates: Partial<PayoutsFilterState>) => {
      const params = new URLSearchParams(searchParams.toString());

      const isFilterChange = Object.keys(updates).some((k) => k !== "page");
      if (isFilterChange && !("page" in updates)) {
        params.set("page", "1");
      }

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  return { filters, setFilters };
}
