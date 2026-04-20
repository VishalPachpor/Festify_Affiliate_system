import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "tenant_demo";

  const [sales, attributions, ledger, campAffs] = await Promise.all([
    prisma.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        externalOrderId: true,
        amountMinor: true,
        referralCode: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.attributionClaim.findMany({
      where: { tenantId },
      select: { saleId: true, affiliateId: true, method: true },
    }),
    prisma.commissionLedgerEntry.findMany({
      where: { tenantId },
      select: { saleId: true, affiliateId: true, amountMinor: true, type: true, payoutId: true },
    }),
    prisma.campaignAffiliate.findMany({
      where: { tenantId },
      select: { affiliateId: true, referralCode: true, codeStatus: true },
    }),
  ]);

  const saleMap = new Map(sales.map((s) => [s.id, s]));
  const sold = {
    salesCount: sales.length,
    salesTotalMinor: sales.reduce((s, x) => s + x.amountMinor, 0),
    attributedCount: attributions.length,
    ledgerCount: ledger.length,
    ledgerTotalMinor: ledger.reduce((s, x) => s + x.amountMinor, 0),
    campaignAffiliates: campAffs.length,
  };

  const attributionsWithSale = attributions.map((a) => ({
    ...a,
    sale: saleMap.get(a.saleId)
      ? {
          externalOrderId: saleMap.get(a.saleId)!.externalOrderId,
          referralCode: saleMap.get(a.saleId)!.referralCode,
          amountMinor: saleMap.get(a.saleId)!.amountMinor,
          status: saleMap.get(a.saleId)!.status,
        }
      : null,
  }));

  const unattributedSales = sales.filter((s) => !attributions.find((a) => a.saleId === s.id));

  console.log(JSON.stringify({
    counts: sold,
    sales,
    attributions: attributionsWithSale,
    ledger,
    campaignAffiliateCodes: campAffs,
    unattributedSales,
  }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
