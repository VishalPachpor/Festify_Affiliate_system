"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { AffiliatesFilterState, AffiliateStatus } from "../types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export function useAffiliatesFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: AffiliatesFilterState = useMemo(() => ({
    page: Number(searchParams.get("page")) || DEFAULT_PAGE,
    pageSize: Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE,
    status: (searchParams.get("status") as AffiliateStatus) || undefined,
    search: searchParams.get("search") || undefined,
    sortBy: (searchParams.get("sortBy") as AffiliatesFilterState["sortBy"]) || undefined,
    sortOrder: (searchParams.get("sortOrder") as AffiliatesFilterState["sortOrder"]) || undefined,
  }), [searchParams]);

  const setFilters = useCallback(
    (updates: Partial<AffiliatesFilterState>) => {
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
