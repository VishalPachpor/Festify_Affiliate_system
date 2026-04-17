// Integration tests for the payout lifecycle. Requires:
//   - Backend running on :3001 (npm run dev)
//   - Postgres reachable via DATABASE_URL
//   - Demo seed applied (npm run db:seed)
//
// Runs with: npm test (uses ts-node + node:test)
//
// Strategy: each test provisions its own ephemeral sale via Prisma, then
// exercises the HTTP endpoints the UI uses. Cleanup deletes only the records
// this test created — demo data is left untouched.

import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";
const TENANT_ID = "tenant_demo";
const AFFILIATE_ID = "affiliate_alex";
const CAMPAIGN_ID = "campaign_demo";
const ADMIN_EMAIL = "admin@festify.io";
const ADMIN_PASSWORD = "Password123!";

let adminToken = "";

// ── Auth + HTTP helpers ─────────────────────────────────────────────────────

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const body = (await res.json()) as { token: string };
  return body.token;
}

async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${adminToken}`,
      "x-tenant-id": TENANT_ID,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed as T };
}

// ── Ephemeral sale helpers ──────────────────────────────────────────────────

async function createEphemeralSale(amountMinor = 50_000): Promise<{
  saleId: string;
  entryId: string;
  externalOrderId: string;
}> {
  const externalOrderId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const sale = await prisma.sale.create({
    data: {
      tenantId: TENANT_ID,
      campaignId: CAMPAIGN_ID,
      externalOrderId,
      amountMinor,
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
  const entry = await prisma.commissionLedgerEntry.create({
    data: {
      tenantId: TENANT_ID,
      affiliateId: AFFILIATE_ID,
      saleId: sale.id,
      type: "earned",
      amountMinor: Math.round(amountMinor * 0.1),
      currency: "USD",
    },
  });
  return { saleId: sale.id, entryId: entry.id, externalOrderId };
}

async function cleanupSale(saleId: string): Promise<void> {
  // Delete order: ledger entries → payouts they link to → attribution → sale.
  const entries = await prisma.commissionLedgerEntry.findMany({
    where: { saleId },
    select: { id: true, payoutId: true },
  });
  const payoutIds = Array.from(new Set(entries.map((e) => e.payoutId).filter((id): id is string => id !== null)));
  await prisma.commissionLedgerEntry.deleteMany({ where: { saleId } });
  if (payoutIds.length > 0) {
    await prisma.payoutIdempotencyKey.deleteMany({ where: { payoutId: { in: payoutIds } } });
    await prisma.payout.deleteMany({ where: { id: { in: payoutIds } } });
  }
  await prisma.attributionClaim.deleteMany({ where: { saleId } });
  await prisma.sale.delete({ where: { id: saleId } });
}

// ── Setup ───────────────────────────────────────────────────────────────────

test.before(async () => {
  adminToken = await login();
});

test.after(async () => {
  await prisma.$disconnect();
});

// ── Tests ───────────────────────────────────────────────────────────────────

test("approve → mark paid: full lifecycle", async () => {
  const { saleId } = await createEphemeralSale(100_000);
  try {
    // 1. Approve pending sale
    const approve = await api<{ id: string; status: string }>(`/api/sales/${saleId}/approve`, {
      method: "POST",
    });
    assert.equal(approve.status, 200);
    assert.equal(approve.body.status, "approved");

    // Sale should be approved and have a pending payout linked.
    const afterApprove = await prisma.sale.findUnique({ where: { id: saleId } });
    assert.equal(afterApprove?.status, "approved");

    const linkedEntries = await prisma.commissionLedgerEntry.findMany({
      where: { saleId },
      select: { payoutId: true, payout: { select: { status: true } } },
    });
    assert.ok(linkedEntries.every((e) => e.payoutId !== null), "entries should be linked to a payout");
    assert.ok(linkedEntries.every((e) => e.payout?.status === "pending"), "payout should be pending");

    // 2. Mark Paid the same sale — should promote the existing pending payout.
    const pay = await api<{ id: string; status: string; amountMinor: number }>(
      "/api/payouts/create",
      {
        method: "POST",
        body: { affiliateId: AFFILIATE_ID, saleId, markAsPaid: true },
      },
    );
    assert.equal(pay.status, 201);
    assert.equal(pay.body.status, "paid");
    assert.equal(pay.body.amountMinor, 10_000); // 10% of 100_000

    // Sale and payout should both read `paid` now.
    const afterPay = await prisma.sale.findUnique({ where: { id: saleId } });
    assert.equal(afterPay?.status, "paid");
    const paidEntries = await prisma.commissionLedgerEntry.findMany({
      where: { saleId },
      select: { payout: { select: { status: true } } },
    });
    assert.ok(paidEntries.every((e) => e.payout?.status === "paid"), "payout should be paid");
  } finally {
    await cleanupSale(saleId);
  }
});

test("mark paid is idempotent — two clicks do not create duplicate payouts", async () => {
  const { saleId } = await createEphemeralSale(200_000);
  try {
    // Snapshot payout count BEFORE any action tied to this sale.
    const payoutsBefore = await prisma.payout.count({
      where: { tenantId: TENANT_ID, affiliateId: AFFILIATE_ID },
    });

    // Approve creates exactly 1 new payout (pending) for this sale.
    await api(`/api/sales/${saleId}/approve`, { method: "POST" });

    const first = await api<{ status: string }>("/api/payouts/create", {
      method: "POST",
      body: { affiliateId: AFFILIATE_ID, saleId, markAsPaid: true },
    });
    assert.equal(first.body.status, "paid");

    const second = await api<{ status: string }>("/api/payouts/create", {
      method: "POST",
      body: { affiliateId: AFFILIATE_ID, saleId, markAsPaid: true },
    });
    // Second call must not succeed with a new payout — either 400 (no money
    // left to move) or 201 only if some other channel produced new work.
    // In our scenario, the sale is already paid → no unpaid entries → 400.
    assert.equal(
      second.status,
      400,
      `expected 400 on idempotent second call, got ${second.status}`,
    );

    const payoutsAfter = await prisma.payout.count({
      where: { tenantId: TENANT_ID, affiliateId: AFFILIATE_ID },
    });
    // Exactly +1 payout (the one created by Approve and later promoted).
    // No duplicates from the second click.
    assert.equal(
      payoutsAfter,
      payoutsBefore + 1,
      `expected exactly +1 payout total, got +${payoutsAfter - payoutsBefore}`,
    );
  } finally {
    await cleanupSale(saleId);
  }
});

test("bulk payout: sum of linked ledger entries == payout.amountMinor", async () => {
  const { saleId: s1 } = await createEphemeralSale(300_000);
  const { saleId: s2 } = await createEphemeralSale(400_000);
  try {
    // Approve both sales so they're ready to be paid.
    await api(`/api/sales/${s1}/approve`, { method: "POST" });
    await api(`/api/sales/${s2}/approve`, { method: "POST" });

    // Bulk pay — no saleId means "every unpaid / pending for this affiliate".
    const result = await api<{ id: string; amountMinor: number }>("/api/payouts/create", {
      method: "POST",
      body: { affiliateId: AFFILIATE_ID, markAsPaid: true },
    });
    assert.ok(result.status === 200 || result.status === 201);

    // Accounting invariant: every paid payout's amount must equal Σ of its
    // linked ledger entries. No drift.
    const paidPayouts = await prisma.payout.findMany({
      where: {
        tenantId: TENANT_ID,
        affiliateId: AFFILIATE_ID,
        status: "paid",
        commissionEntries: { some: { saleId: { in: [s1, s2] } } },
      },
      include: { commissionEntries: { select: { amountMinor: true } } },
    });
    assert.ok(paidPayouts.length > 0, "at least one paid payout should cover these sales");
    for (const p of paidPayouts) {
      const sum = p.commissionEntries.reduce((acc, e) => acc + e.amountMinor, 0);
      assert.equal(sum, p.amountMinor, `payout ${p.id}: sum ${sum} !== amountMinor ${p.amountMinor}`);
    }

    // Both sales should now be paid.
    const [sale1, sale2] = await Promise.all([
      prisma.sale.findUnique({ where: { id: s1 } }),
      prisma.sale.findUnique({ where: { id: s2 } }),
    ]);
    assert.equal(sale1?.status, "paid");
    assert.equal(sale2?.status, "paid");
  } finally {
    await cleanupSale(s1);
    await cleanupSale(s2);
  }
});
