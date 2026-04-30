import { PrismaClient } from "@prisma/client";
import { processInboundEvent } from "../src/processors/process-inbound-event";

// One-shot: runs processInboundEvent directly on a specific InboundEvent
// id, bypassing the worker poll loop. Use to verify whether the
// processor itself works — if this succeeds but the worker doesn't pick
// up pending events, the worker process is dead/stuck.
//
// Run:
//   DATABASE_URL='<neon url>' REDIS_URL='<upstash url>' \
//     npx ts-node prisma/process-event-now.ts <event_id>

const prisma = new PrismaClient();

async function main() {
  const eventId = process.argv[2];
  if (!eventId) {
    console.error("Usage: process-event-now.ts <event_id>");
    process.exit(2);
  }

  const before = await prisma.inboundEvent.findUnique({
    where: { id: eventId },
    select: { id: true, provider: true, status: true, externalEventId: true },
  });
  if (!before) {
    console.error(`No InboundEvent with id=${eventId}`);
    process.exit(1);
  }
  console.log(`[before] id=${before.id} status=${before.status} provider=${before.provider} externalEventId=${before.externalEventId}`);

  // If it was already marked processed by an old code path, reset to
  // pending so processInboundEvent's "already processed" guard doesn't
  // short-circuit. (For the actual pending events we're chasing this is
  // a no-op.)
  if (before.status === "processed") {
    await prisma.inboundEvent.update({
      where: { id: eventId },
      data: { status: "pending", processedAt: null },
    });
    console.log("[before] reset processed -> pending");
  }

  console.log("[run] processInboundEvent…");
  await processInboundEvent(eventId);

  const after = await prisma.inboundEvent.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, processedAt: true, lastError: true },
  });
  console.log(`[after]  status=${after?.status} processedAt=${after?.processedAt?.toISOString() ?? "<null>"} lastError=${after?.lastError ?? "<null>"}`);
}

main()
  .catch((err) => {
    console.error("[process-event-now] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
