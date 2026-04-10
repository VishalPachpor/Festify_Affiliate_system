"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = startWorker;
const prisma_1 = require("../lib/prisma");
const process_inbound_event_1 = require("./process-inbound-event");
// ─────────────────────────────────────────────────────────────────────────────
// Worker: polls for pending InboundEvents and processes them.
//
// For MVP this runs as a simple polling loop. In production, replace with
// BullMQ job queue triggered by the webhook ingestion endpoint.
// ─────────────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 10;
async function startWorker() {
    console.log("[worker] Started. Polling for pending events...");
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            // Tenant fairness: pick the OLDEST pending event per tenant.
            // Prevents one noisy tenant from starving others.
            const distinctTenants = await prisma_1.prisma.inboundEvent.findMany({
                where: { status: "pending" },
                distinct: ["tenantId"],
                orderBy: { createdAt: "asc" },
                take: BATCH_SIZE,
                select: { tenantId: true },
            });
            const eventsToProcess = await Promise.all(distinctTenants.map((t) => prisma_1.prisma.inboundEvent.findFirst({
                where: { tenantId: t.tenantId, status: "pending" },
                orderBy: { createdAt: "asc" },
                select: { id: true },
            })));
            for (const event of eventsToProcess) {
                if (event)
                    await (0, process_inbound_event_1.processInboundEvent)(event.id);
            }
        }
        catch (err) {
            console.error("[worker] Poll cycle error:", err);
        }
        await sleep(POLL_INTERVAL_MS);
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Run directly if this file is executed
if (require.main === module) {
    startWorker().catch((err) => {
        console.error("[worker] Fatal error:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=worker.js.map