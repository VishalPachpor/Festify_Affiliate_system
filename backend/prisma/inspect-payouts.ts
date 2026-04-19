import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [total, byStatus, recent] = await Promise.all([
    prisma.payout.count(),
    prisma.payout.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amountMinor: true } }),
    prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        tenantId: true,
        affiliateId: true,
        amountMinor: true,
        status: true,
        createdAt: true,
        _count: { select: { commissionEntries: true } },
      },
    }),
  ]);

  const bundled = await prisma.payout.findMany({
    where: { commissionEntries: { some: {} } },
    select: {
      id: true,
      amountMinor: true,
      status: true,
      commissionEntries: { select: { saleId: true } },
    },
  });
  const multiSale = bundled
    .map((p) => ({
      id: p.id,
      amountMinor: p.amountMinor,
      status: p.status,
      distinctSales: new Set(p.commissionEntries.map((e) => e.saleId)).size,
      entryCount: p.commissionEntries.length,
    }))
    .filter((p) => p.distinctSales > 1);

  console.log(JSON.stringify({ total, byStatus, recent, multiSalePayouts: multiSale }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
