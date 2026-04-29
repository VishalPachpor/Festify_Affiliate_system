import { apiClient } from "@/services/api/client";
import { applicationResponsesSchema, type ApplicationResponses } from "../types";

export type GetApplicationResponsesParams = {
  tenantId: string;
  // The admin Affiliates list uses a single id field that can be either an
  // applicationId (pending / rejected / mou_pending rows) or an affiliateId
  // (active CampaignAffiliate rows). The backend resolves either.
  idOrAffiliateId: string;
};

export async function getApplicationResponses(
  params: GetApplicationResponsesParams,
): Promise<ApplicationResponses> {
  const raw = await apiClient<unknown>(
    `/applications/${encodeURIComponent(params.idOrAffiliateId)}/responses`,
    {
      headers: {
        "x-tenant-id": params.tenantId,
      },
    },
  );
  return applicationResponsesSchema.parse(raw);
}
