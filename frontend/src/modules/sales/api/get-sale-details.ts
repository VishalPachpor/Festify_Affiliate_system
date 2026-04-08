import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { saleDetailSchema, type SaleDetail } from "../types";

export type GetSaleDetailsParams = {
  tenantId: string;
  saleId: string;
};

export async function getSaleDetails(
  params: GetSaleDetailsParams,
): Promise<SaleDetail> {
  if (isMockEnabled()) {
    const { mockGetSaleDetails } = await import("@/mocks/handlers/sales");
    return mockGetSaleDetails(params.saleId);
  }

  const raw = await apiClient<unknown>(`/sales/${params.saleId}`, {
    searchParams: { tenantId: params.tenantId },
  });

  return saleDetailSchema.parse(raw);
}
