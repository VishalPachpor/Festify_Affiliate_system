import { PrismaClient } from "@prisma/client";

// Diagnostic: prints the full payload of the most recent Luma InboundEvent.
// Used to verify the lumaAdapter's coupon-extraction logic matches the
// actual webhook shape Luma is sending. Read-only.
//
// Run:
//   DATABASE_URL='<neon url>' npx ts-node prisma/inspect-luma-event.ts

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.inboundEvent.findMany({
    where: { provider: "luma" },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (events.length === 0) {
    console.log("[inspect-luma-event] no luma events found.");
    return;
  }

  for (const event of events) {
    console.log(`\n=== InboundEvent ${event.id} ===`);
    console.log(`  externalEventId: ${event.externalEventId}`);
    console.log(`  status:          ${event.status}`);
    console.log(`  createdAt:       ${event.createdAt.toISOString()}`);
    console.log(`  payload:`);
    console.log(JSON.stringify(event.payload, null, 2));
  }
}

main()
  .catch((err) => {
    console.error("[inspect-luma-event] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
