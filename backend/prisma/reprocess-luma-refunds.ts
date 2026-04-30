import { PrismaClient } from "@prisma/client";

// One-shot: find Luma InboundEvents whose raw payload signals a refund
// (approval_status === "declined") but were processed by an older
// version of the adapter that didn't recognise the signal — they would
// have routed through executeGoldenFlow, hit the duplicate-Sale guard,
// and been marked status="processed" without ever flipping the Sale to
// refunded or writing a reversal entry.
//
// Reset those events to status="pending" so the inbound-processor
// picks them up again with the current adapter logic.
//
// Idempotent: if a refund event already has its matching Sale in
// status "refunded" the new processor will short-circuit, so re-running
// this script is safe.
//
// Run:
//   DATABASE_URL='<neon url>' npx ts-node prisma/reprocess-luma-refunds.ts
//   (add --dry-run to preview, --apply to write)

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");

  const candidates = await prisma.inboundEvent.findMany({
    where: { provider: "luma", status: "processed" },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, externalEventId: true, payload: true, processedAt: true },
  });

  type Hit = { id: string; externalEventId: string; orderId: string | null };
  const hits: Hit[] = [];
  for (const event of candidates) {
    const raw = (event.payload as Record<string, unknown> | null)?.raw as
      | Record<string, unknown>
      | undefined;
    const data = raw?.data as Record<string, unknown> | undefined;
    if (!data) continue;
    const approvalStatus = typeof data.approval_status === "string" ? data.approval_status : null;
    if (approvalStatus !== "declined") continue;
    const orderId = typeof data.api_id === "string" ? data.api_id : null;
    hits.push({ id: event.id, externalEventId: event.externalEventId, orderId });
  }

  if (hits.length === 0) {
    console.log("[reprocess] no processed events with approval_status='declined' to reset.");
    return;
  }

  console.log(`[reprocess] ${hits.length} candidate(s) to reset to pending:`);
  for (const h of hits) {
    console.log(`  - id=${h.id} externalEventId=${h.externalEventId} orderId=${h.orderId}`);
  }

  if (!apply) {
    console.log("\n[reprocess] dry-run — re-run with --apply to actually reset status.");
    return;
  }

  const reset = await prisma.inboundEvent.updateMany({
    where: { id: { in: hits.map((h) => h.id) } },
    data: { status: "pending", processedAt: null, lastError: null },
  });
  console.log(`\n[reprocess] reset ${reset.count} event(s) to pending. The inbound-processor will pick them up on its next poll cycle (~2s).`);
}

main()
  .catch((err) => {
    console.error("[reprocess] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
