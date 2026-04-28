import { PrismaClient } from "@prisma/client";

// One-shot: link campaign_demo to the Luma event used in this account so the
// coupon auto-sync has a target. The event_api_id was observed in the Luma
// webhook payload (data.event.api_id = "evt-D15DTJJimYz2w9V"). Override via
// LUMA_DEMO_EVENT_ID if you want to point at a different event.
//
// Idempotent — re-running with the same value is a no-op. Aborts loudly if
// campaign_demo doesn't exist (run bootstrap-admin first).
//
// Run:
//   DATABASE_URL='<neon url>' \
//     LUMA_DEMO_EVENT_ID=evt-D15DTJJimYz2w9V \
//     npx ts-node prisma/set-luma-event-on-demo.ts

const CAMPAIGN_ID = "campaign_demo";
const DEFAULT_EVENT_ID = "evt-D15DTJJimYz2w9V";

const prisma = new PrismaClient();

async function main() {
  const eventId = (process.env.LUMA_DEMO_EVENT_ID?.trim() || DEFAULT_EVENT_ID).trim();

  const campaign = await prisma.campaign.findUnique({
    where: { id: CAMPAIGN_ID },
    select: { id: true, name: true, lumaEventId: true },
  });
  if (!campaign) {
    console.error(`[set-luma-event] campaign ${CAMPAIGN_ID} not found — run bootstrap-admin first.`);
    process.exit(1);
  }

  if (campaign.lumaEventId === eventId) {
    console.log(`[set-luma-event] ${CAMPAIGN_ID} already points at ${eventId} — no change.`);
    return;
  }

  await prisma.campaign.update({
    where: { id: CAMPAIGN_ID },
    data: { lumaEventId: eventId },
  });

  console.log(
    `[set-luma-event] ${CAMPAIGN_ID} (${campaign.name}): lumaEventId ${campaign.lumaEventId ?? "(null)"} → ${eventId}`,
  );
}

main()
  .catch((err) => {
    console.error("[set-luma-event] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
