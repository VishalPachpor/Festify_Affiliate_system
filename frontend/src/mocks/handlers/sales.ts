import { delay } from "../utils";
import { mockSales, mockSalesSummary, generateMockSaleDetail } from "../data/sales";
import {
  salesListResponseSchema,
  salesSummarySchema,
  saleDetailSchema,
  type SalesFilterState,
} from "@/modules/sales/types";

export async function mockGetSalesList(filters: SalesFilterState) {
  await delay();

  let filtered = [...mockSales];

  if (filters.status) {
    filtered = filtered.filter((s) => s.status === filters.status);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.affiliateName.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q),
    );
  }

  if (filters.affiliateId) {
    filtered = filtered.filter((s) => s.affiliateId === filters.affiliateId);
  }

  // attributed filter: simulate by checking sale index parity
  if (filters.attributed === "false") {
    filtered = filtered.filter((_, i) => i % 5 === 0);
  } else if (filters.attributed === "true") {
    filtered = filtered.filter((_, i) => i % 5 !== 0);
  }

  const total = filtered.length;
  const page = filters.page;
  const pageSize = filters.pageSize;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return salesListResponseSchema.parse({
    sales: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function mockGetSalesSummary() {
  await delay();
  return salesSummarySchema.parse(mockSalesSummary);
}

export async function mockGetSaleDetails(saleId: string) {
  await delay();
  return saleDetailSchema.parse(generateMockSaleDetail(saleId));
}
