import type { Sale, SalesSummary, SaleDetail } from "@/modules/sales/types";

const statuses: Sale["status"][] = ["pending", "confirmed", "rejected", "paid"];
const sources = ["referral_link", "referral_code", "direct", "organic", "unattributed"] as const;
const names = ["Sarah Chen", "Marcus Johnson", "Priya Patel", "James Kim", "Elena Rodriguez", "David Park", "Lisa Wang"];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockSales(count: number): Sale[] {
  return Array.from({ length: count }, (_, i) => {
    const amount = 200 + Math.floor(Math.random() * 1800);
    const commission = Math.round(amount * 0.1);
    const name = pickRandom(names);
    return {
      id: `sale-${i + 1}`,
      amount,
      commission,
      currency: "USD",
      affiliateId: `aff-${(i % 5) + 1}`,
      affiliateName: name,
      campaignId: "camp-1",
      status: pickRandom(statuses),
      createdAt: new Date(Date.now() - i * 3_600_000 * 4).toISOString(),
    };
  });
}

export const mockSales: Sale[] = generateMockSales(87);

export const mockSalesSummary: SalesSummary = {
  totalSales: 87,
  totalRevenue: 142300,
  totalCommissions: 14230,
  currency: "USD",
  confirmedCount: 52,
  pendingCount: 18,
  rejectedCount: 17,
};

export function generateMockSaleDetail(saleId: string): SaleDetail {
  const sale = mockSales.find((s) => s.id === saleId) ?? mockSales[0];
  const isAttributed = Math.random() > 0.2;
  const source = isAttributed ? pickRandom(sources.filter((s) => s !== "unattributed")) : "unattributed";

  return {
    ...sale,
    attribution: {
      source,
      attributed: isAttributed,
      referralCode: source === "referral_code" ? "TOKEN2049VIP" : null,
      referralUrl: source === "referral_link" ? "https://token2049.com/?ref=sarah" : null,
      landingPage: isAttributed ? "/tickets/vip" : null,
      attributedAt: isAttributed ? sale.createdAt : null,
    },
    attributionDiagnostics: {
      reason: isAttributed
        ? `Matched via ${source.replace("_", " ")}`
        : "No referral data found in session or URL",
      steps: [
        { check: "URL parameter lookup", result: source === "referral_link" ? "passed" : "failed", detail: source === "referral_link" ? "Found ?ref=sarah in URL" : "No ref parameter in URL" },
        { check: "Referral code lookup", result: source === "referral_code" ? "passed" : isAttributed ? "skipped" : "failed", detail: source === "referral_code" ? "Code TOKEN2049VIP matched affiliate #1" : "No code provided" },
        { check: "Session cookie match", result: source === "direct" ? "passed" : "skipped", detail: source === "direct" ? "Session linked to affiliate #1" : "No session cookie" },
        { check: "Organic detection", result: source === "organic" ? "passed" : "skipped", detail: source === "organic" ? "Referrer from search engine" : "Not applicable" },
      ],
      resolvedAt: isAttributed ? sale.createdAt : null,
    },
    commissionBreakdown: isAttributed
      ? { rate: 10, baseAmount: sale.amount, commissionAmount: sale.commission, currency: "USD", tier: sale.amount > 1000 ? "VIP" : null }
      : null,
    payoutId: sale.status === "paid" ? `payout-${saleId}` : null,
    payoutStatus: sale.status === "paid" ? "paid" : sale.status === "confirmed" ? "pending" : null,
  };
}
