// Integration tests for the refund flow. Requires:
//   - Postgres reachable via DATABASE_URL
//   - Demo seed applied (npm run db:seed) — needed for tenant_demo +
//     campaign_demo + an affiliate to attach attribution to.
//
// Runs with: npx ts-node --transpile-only tests/refund-flow.integration.test.ts
//
// Strategy: each test provisions its own ephemeral Sale + AttributionClaim
// + earned ledger entry via Prisma, fakes an InboundEvent with the
// "ticket.refunded" normalized type, runs the processor against it, and
// asserts on the resulting state. Cleanup is per-test and only touches
// the rows the test created.

import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { processInboundEvent } from "../src/processors/process-inbound-event";

const TENANT_ID = "tenant_demo";
const CAMPAIGN_ID = "campaign_demo";
const AFFILIATE_ID = "affiliate_alex";

// ── Fixtures ────────────────────────────────────────────────────────────────

async function createAttributedSale(opts: {
  amountMinor: number;
  commissionMinor: number;
}): Promise<{
  saleId: string;
  externalOrderId: string;
  earnedEntryId: string;
}> {
  const externalOrderId = `refund_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const sale = await prisma.sale.create({
    data: {
      tenantId: TENANT_ID,
      campaignId: CAMPAIGN_ID,
      externalOrderId,
      amountMinor: opts.amountMinor,
      currency: "USD",
      referralCode: "REF-ALEX",
      status: "pending",
    },
  });

  await prisma.attributionClaim.create({
    data: {
      tenantId: TENANT_ID,
      saleId: sale.id,
      affiliateId: AFFILIATE_ID,
      method: "referral_code",
    },
  });

  const earned = await prisma.commissionLedgerEntry.create({
    data: {
      tenantId: TENANT_ID,
      saleId: sale.id,
      affiliateId: AFFILIATE_ID,
      amountMinor: opts.commissionMinor,
      currency: "USD",
      type: "earned",
    },
  });

  return { saleId: sale.id, externalOrderId, earnedEntryId: earned.id };
}

async function createUnattributedSale(amountMinor: number): Promise<{
  saleId: string;
  externalOrderId: string;
}> {
  const externalOrderId = `refund_test_unattr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sale = await prisma.sale.create({
    data: {
      tenantId: TENANT_ID,
      campaignId: CAMPAIGN_ID,
      externalOrderId,
      amountMinor,
      currency: "USD",
      status: "pending",
    },
  });
  return { saleId: sale.id, externalOrderId };
}

async function createRefundEvent(externalOrderId: string, amountMinor: number): Promise<string> {
  const externalEventId = `evt_refund_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inbound = await prisma.inboundEvent.create({
    data: {
      tenantId: TENANT_ID,
      provider: "luma",
      providerConnectionId: "test_connection",
      externalEventId,
      replayKey: `luma_test_${externalEventId}`,
      payload: {
        raw: { synthetic: true },
        normalized: {
          type: "ticket.refunded",
          externalOrderId,
          amountMinor,
          currency: "USD",
        },
      },
      status: "pending",
    },
  });
  return inbound.id;
}

async function cleanup(saleId: string, eventIds: string[]): Promise<void> {
  await prisma.commissionLedgerEntry.deleteMany({ where: { saleId } });
  await prisma.attributionClaim.deleteMany({ where: { saleId } });
  await prisma.sale.deleteMany({ where: { id: saleId } });
  if (eventIds.length > 0) {
    await prisma.inboundEvent.deleteMany({ where: { id: { in: eventIds } } });
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

test("refund of attributed sale: flips status + writes reversal entry", async () => {
  const { saleId, externalOrderId, earnedEntryId } = await createAttributedSale({
    amountMinor: 5_000,
    commissionMinor: 250,
  });
  const eventId = await createRefundEvent(externalOrderId, 5_000);

  try {
    await processInboundEvent(eventId);

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    assert.equal(sale?.status, "refunded", "Sale.status should flip to refunded");

    const entries = await prisma.commissionLedgerEntry.findMany({
      where: { saleId },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(entries.length, 2, "earned + reversal = 2 entries");
    assert.equal(entries[0].id, earnedEntryId, "original earned entry preserved");
    assert.equal(entries[0].amountMinor, 250);
    assert.equal(entries[1].type, "reversal", "second entry is a reversal");
    assert.equal(entries[1].amountMinor, -250, "reversal nets out the earned amount");

    const event = await prisma.inboundEvent.findUnique({ where: { id: eventId } });
    assert.equal(event?.status, "processed");
  } finally {
    await cleanup(saleId, [eventId]);
  }
});

test("refund of unattributed sale: flips status, no ledger entry written", async () => {
  const { saleId, externalOrderId } = await createUnattributedSale(5_000);
  const eventId = await createRefundEvent(externalOrderId, 5_000);

  try {
    await processInboundEvent(eventId);

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    assert.equal(sale?.status, "refunded");

    const entries = await prisma.commissionLedgerEntry.findMany({ where: { saleId } });
    assert.equal(entries.length, 0, "no ledger writes for unattributed refund");
  } finally {
    await cleanup(saleId, [eventId]);
  }
});

test("refund is idempotent: re-processing the event is a no-op", async () => {
  const { saleId, externalOrderId } = await createAttributedSale({
    amountMinor: 5_000,
    commissionMinor: 250,
  });
  const firstEventId = await createRefundEvent(externalOrderId, 5_000);
  const secondEventId = await createRefundEvent(externalOrderId, 5_000);

  try {
    await processInboundEvent(firstEventId);
    await processInboundEvent(secondEventId);

    const entries = await prisma.commissionLedgerEntry.findMany({
      where: { saleId, type: "reversal" },
    });
    assert.equal(entries.length, 1, "second refund event must NOT write a duplicate reversal");

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    assert.equal(sale?.status, "refunded");
  } finally {
    await cleanup(saleId, [firstEventId, secondEventId]);
  }
});

test("refund for unknown order: succeeds without changes", async () => {
  const eventId = await createRefundEvent("does_not_exist_in_db", 5_000);

  try {
    await processInboundEvent(eventId);

    const event = await prisma.inboundEvent.findUnique({ where: { id: eventId } });
    assert.equal(event?.status, "processed", "no-op refund still marks event processed");
  } finally {
    await prisma.inboundEvent.delete({ where: { id: eventId } });
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
