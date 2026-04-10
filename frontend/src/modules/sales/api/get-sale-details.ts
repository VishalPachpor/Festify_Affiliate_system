import { apiClient } from "@/services/api/client";
import { saleDetailSchema, type SaleDetail } from "../types";

export type GetSaleDetailsParams = {
  tenantId: string;
  saleId: string;
};

export async function getSaleDetails(
  params: GetSaleDetailsParams,
): Promise<SaleDetail> {
  const raw = await apiClient<unknown>(`/sales/${params.saleId}`, {
    headers: { "x-tenant-id": params.tenantId },
  });

  return saleDetailSchema.parse(raw);
}
