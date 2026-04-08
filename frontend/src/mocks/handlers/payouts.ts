import { delay } from "../utils";
import { mockPayouts, mockPayoutSummary } from "../data/payouts";
import {
  payoutsListResponseSchema,
  payoutSummarySchema,
  type PayoutsFilterState,
} from "@/modules/payouts/types";

export async function mockGetPayouts(filters: PayoutsFilterState) {
  await delay();

  let filtered = [...mockPayouts];

  if (filters.status) {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  if (filters.affiliateId) {
    filtered = filtered.filter((p) => p.affiliateId === filters.affiliateId);
  }

  const total = filtered.length;
  const page = filters.page;
  const pageSize = filters.pageSize;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return payoutsListResponseSchema.parse({
    payouts: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function mockGetPayoutSummary() {
  await delay();
  return payoutSummarySchema.parse(mockPayoutSummary);
}
