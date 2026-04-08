import { delay } from "../utils";
import { mockAffiliates, generateMockAffiliateDetail } from "../data/affiliates";
import {
  affiliatesListResponseSchema,
  affiliateDetailSchema,
  type AffiliatesFilterState,
} from "@/modules/affiliates/types";

export async function mockGetAffiliatesList(filters: AffiliatesFilterState) {
  await delay();

  let filtered = [...mockAffiliates];

  if (filters.status) {
    filtered = filtered.filter((a) => a.status === filters.status);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q),
    );
  }

  const total = filtered.length;
  const page = filters.page;
  const pageSize = filters.pageSize;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return affiliatesListResponseSchema.parse({
    affiliates: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function mockGetAffiliateDetails(affiliateId: string) {
  await delay();
  return affiliateDetailSchema.parse(generateMockAffiliateDetail(affiliateId));
}
