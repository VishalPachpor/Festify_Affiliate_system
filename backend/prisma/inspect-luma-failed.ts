import { PrismaClient } from "@prisma/client";

// Diagnostic: prints the lastError for the most recent failed Luma
// InboundEvents, plus a CampaignAffiliate lookup for whatever
// referralCode each event surfaced. Read-only.
//
// Run:
//   DATABASE_URL='<neon url>' npx ts-node prisma/inspect-luma-failed.ts

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.inboundEvent.findMany({
    where: { provider: "luma", status: "failed" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      tenantId: true,
      externalEventId: true,
      lastError: true,
      createdAt: true,
      payload: true,
    },
  });

  if (events.length === 0) {
    console.log("[inspect] no failed luma events.");
    return;
  }

  for (const event of events) {
    const normalized = (event.payload as Record<string, unknown> | null)?.normalized as
      | Record<string, unknown>
      | undefined;
    const referralCode = typeof normalized?.referralCode === "string" ? normalized.referralCode : null;
    const externalOrderId = typeof normalized?.externalOrderId === "string" ? normalized.externalOrderId : null;
    const amountMinor = typeof normalized?.amountMinor === "number" ? normalized.amountMinor : null;

    const raw = (event.payload as Record<string, unknown> | null)?.raw as Record<string, unknown> | undefined;
    const data = raw?.data as Record<string, unknown> | undefined;
    const buyerEmail = typeof data?.user_email === "string" ? data.user_email : null;
    const buyerName = typeof data?.user_name === "string" ? data.user_name : null;
    const lumaType = typeof raw?.type === "string" ? raw.type : null;

    console.log(`\n=== ${event.id} ===`);
    console.log(`  createdAt:    ${event.createdAt.toISOString()}`);
    console.log(`  luma type:    ${lumaType}`);
    console.log(`  buyer:        ${buyerName} <${buyerEmail}>`);
    console.log(`  amountMinor:  ${amountMinor}`);
    console.log(`  externalOrderId: ${externalOrderId}`);
    console.log(`  referralCode (extracted): ${JSON.stringify(referralCode)}`);
    console.log(`  lastError:    ${event.lastError ?? "<null>"}`);

    if (referralCode) {
      const ca = await prisma.campaignAffiliate.findFirst({
        where: { tenantId: event.tenantId, referralCode },
        select: { affiliateId: true, codeStatus: true, createdAt: true },
      });
      if (ca) {
        console.log(`  → CampaignAffiliate: affiliateId=${ca.affiliateId} codeStatus=${ca.codeStatus} createdAt=${ca.createdAt.toISOString()}`);
      } else {
        console.log(`  → CampaignAffiliate: NONE for code=${referralCode} in tenant=${event.tenantId}`);
      }
    }
  }
}

main()
  .catch((err) => {
    console.error("[inspect] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
