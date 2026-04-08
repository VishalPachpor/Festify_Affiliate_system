import type { Affiliate, AffiliateDetail } from "@/modules/affiliates/types";

const affiliatesData: Affiliate[] = [
  { id: "aff-1", name: "Sarah Chen", email: "sarah@example.com", status: "approved", totalRevenue: 67200, totalCommission: 6720, totalSales: 89, currency: "USD", joinedAt: "2026-01-15T08:00:00Z" },
  { id: "aff-2", name: "Marcus Johnson", email: "marcus@example.com", status: "approved", totalRevenue: 54100, totalCommission: 5410, totalSales: 72, currency: "USD", joinedAt: "2026-01-22T10:30:00Z" },
  { id: "aff-3", name: "Priya Patel", email: "priya@example.com", status: "approved", totalRevenue: 43500, totalCommission: 4350, totalSales: 58, currency: "USD", joinedAt: "2026-02-03T14:00:00Z" },
  { id: "aff-4", name: "James Kim", email: "james@example.com", status: "approved", totalRevenue: 30800, totalCommission: 3080, totalSales: 41, currency: "USD", joinedAt: "2026-02-10T09:15:00Z" },
  { id: "aff-5", name: "Elena Rodriguez", email: "elena@example.com", status: "approved", totalRevenue: 26300, totalCommission: 2630, totalSales: 35, currency: "USD", joinedAt: "2026-02-18T11:45:00Z" },
  { id: "aff-6", name: "David Park", email: "david@example.com", status: "pending", totalRevenue: 0, totalCommission: 0, totalSales: 0, currency: "USD", joinedAt: "2026-03-28T16:00:00Z" },
  { id: "aff-7", name: "Nina Torres", email: "nina@example.com", status: "pending", totalRevenue: 0, totalCommission: 0, totalSales: 0, currency: "USD", joinedAt: "2026-03-30T13:20:00Z" },
  { id: "aff-8", name: "Alex Morgan", email: "alex@example.com", status: "rejected", totalRevenue: 0, totalCommission: 0, totalSales: 0, currency: "USD", joinedAt: "2026-03-05T07:45:00Z" },
];

export const mockAffiliates = affiliatesData;

export function generateMockAffiliateDetail(affiliateId: string): AffiliateDetail {
  const affiliate = affiliatesData.find((a) => a.id === affiliateId) ?? affiliatesData[0];
  return {
    ...affiliate,
    campaignIds: ["camp-1"],
    referralCode: `REF-${affiliate.name.split(" ")[0].toUpperCase()}`,
    conversionRate: affiliate.totalSales > 0 ? 8 + Math.random() * 12 : 0,
    lastSaleAt: affiliate.totalSales > 0 ? new Date(Date.now() - Math.random() * 7 * 86_400_000).toISOString() : null,
  };
}
