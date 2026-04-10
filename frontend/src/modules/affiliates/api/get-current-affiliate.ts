import { apiClient } from "@/services/api/client";

export type CurrentAffiliate = {
  affiliateId: string;
  name: string;
  referralCode: string;
  referralUrl: string;
  campaignId: string;
  totalRevenueMinor: number;
  totalCommissionMinor: number;
  totalSales: number;
  currency: string;
  joinedAt: string;
};

export async function getCurrentAffiliate(): Promise<CurrentAffiliate> {
  return apiClient<CurrentAffiliate>("/affiliates/me");
}
