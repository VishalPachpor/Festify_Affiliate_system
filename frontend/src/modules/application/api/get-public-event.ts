import { apiClient } from "@/services/api/client";

export type PublicEvent = {
  campaignId: string;
  campaignName: string;
  campaignSlug: string;
  commissionRateBps: number;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
};

export async function getPublicEvent(slug: string): Promise<PublicEvent> {
  return apiClient<PublicEvent>(`/public/events/${encodeURIComponent(slug)}`);
}
