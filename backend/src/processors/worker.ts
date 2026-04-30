import { prisma } from "../lib/prisma";
import { processInboundEvent } from "./process-inbound-event";

// ─────────────────────────────────────────────────────────────────────────────
// Worker: polls for pending InboundEvents and processes them.
//
// For MVP this runs as a simple polling loop. In production, replace with
// BullMQ job queue triggered by the webhook ingestion endpoint.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 10;

export async function startWorker(): Promise<void> {
  console.log(`[inbound-processor] starting (poll=${POLL_INTERVAL_MS}ms, batch=${BATCH_SIZE})`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let processedThisCycle = 0;
    try {
      // Tenant fairness: pick the OLDEST pending event per tenant.
      // Prevents one noisy tenant from starving others.
      const distinctTenants = await prisma.inboundEvent.findMany({
        where: { status: "pending" },
        distinct: ["tenantId"],
        orderBy: { createdAt: "asc" },
        take: BATCH_SIZE,
        select: { tenantId: true },
      });

      const eventsToProcess = await Promise.all(
        distinctTenants.map((t) =>
          prisma.inboundEvent.findFirst({
            where: { tenantId: t.tenantId, status: "pending" },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          }),
        ),
      );

      for (const event of eventsToProcess) {
        if (event) {
          await processInboundEvent(event.id);
          processedThisCycle += 1;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[inbound-processor] poll cycle error (will retry):", msg);
    }

    if (processedThisCycle > 0) {
      console.log(`[inbound-processor] processed ${processedThisCycle} event(s) this cycle`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run directly if this file is executed
if (require.main === module) {
  // Don't let a stray rejection or uncaught exception kill the worker
  // process — log loudly and keep going. We've seen ioredis emit Error
  // events outside any try/catch when the Upstash socket flaps; those
  // would bubble up to the Node default handler and exit the process,
  // taking the entire poll loop down with it.
  process.on("unhandledRejection", (reason) => {
    console.error("[inbound-processor] unhandledRejection:", reason instanceof Error ? reason.message : reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[inbound-processor] uncaughtException:", err.message);
  });

  startWorker().catch((err) => {
    console.error("[inbound-processor] fatal error in startWorker:", err);
    process.exit(1);
  });
}
