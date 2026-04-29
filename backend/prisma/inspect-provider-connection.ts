import { PrismaClient } from "@prisma/client";

// Diagnostic: prints provider connection state and the timestamp of the
// most recent webhook that successfully made it past the ingest route.
//
// Useful when a purchase is visible on the provider's side (e.g. Luma's
// organizer dashboard) but no InboundEvent landed for it. If
// lastEventAt is stale relative to the missed purchase, the webhook was
// rejected pre-persistence (signature failure, wrong provider URL,
// normalization error) — check server logs around the purchase time.
//
// Run:
//   DATABASE_URL='<neon url>' npx ts-node prisma/inspect-provider-connection.ts

const prisma = new PrismaClient();

async function main() {
  const connections = await prisma.providerConnection.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tenantId: true,
      provider: true,
      connectionId: true,
      status: true,
      lastEventAt: true,
      createdAt: true,
    },
  });

  if (connections.length === 0) {
    console.log("[inspect] no ProviderConnection rows.");
    return;
  }

  for (const c of connections) {
    const lastEvent = c.lastEventAt ? c.lastEventAt.toISOString() : "<never>";
    const ageMs = c.lastEventAt ? Date.now() - c.lastEventAt.getTime() : null;
    const ageHours = ageMs !== null ? (ageMs / 1000 / 60 / 60).toFixed(1) : "?";

    console.log(`\n=== ${c.provider} / ${c.connectionId} ===`);
    console.log(`  id:           ${c.id}`);
    console.log(`  tenantId:     ${c.tenantId}`);
    console.log(`  status:       ${c.status}`);
    console.log(`  lastEventAt:  ${lastEvent} (${ageHours}h ago)`);
    console.log(`  createdAt:    ${c.createdAt.toISOString()}`);
  }

  // Also print the count of InboundEvents per provider in the last 7d
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const eventCounts = await prisma.inboundEvent.groupBy({
    by: ["provider", "status"],
    where: { createdAt: { gte: cutoff } },
    _count: { _all: true },
  });

  console.log(`\n=== InboundEvent counts (last 7 days) ===`);
  if (eventCounts.length === 0) {
    console.log("  (none)");
  } else {
    for (const row of eventCounts) {
      console.log(`  ${row.provider} / ${row.status}: ${row._count._all}`);
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
