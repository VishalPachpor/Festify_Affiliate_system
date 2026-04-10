"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genericAdapter = void 0;
// ─────────────────────────────────────────────────────────────────────────────
// Generic Adapter
//
// Accepts a simple, standardized webhook format for any provider.
// Used for testing and providers without a dedicated adapter.
//
// Expected payload:
// {
//   id: "evt_123",
//   orderId: "order_456",
//   amountMinor: 10000,        // OR amount: 100.00
//   currency: "USD",
//   referralCode: "REF-ALEX",  // optional
//   campaignId: "camp_1",      // optional
// }
// ─────────────────────────────────────────────────────────────────────────────
exports.genericAdapter = {
    name: "generic",
    verifySignature() {
        // Generic adapter has no signature verification.
        // Block in production — only allow known, signed providers.
        if (process.env.NODE_ENV?.toLowerCase() === "production") {
            console.error("[generic-adapter] Generic webhooks are disabled in production");
            return false;
        }
        return true;
    },
    extractEventId(body) {
        const data = body;
        return String(data.id ?? "");
    },
    normalize(body) {
        const data = body;
        const eventId = String(data.id ?? "");
        if (!eventId)
            throw new Error("Generic payload missing 'id'");
        const orderId = String(data.orderId ?? data.order_id ?? "");
        if (!orderId)
            throw new Error("Generic payload missing 'orderId'");
        // Accept amountMinor (cents) directly, or convert amount (dollars)
        let amountMinor;
        if (typeof data.amountMinor === "number") {
            amountMinor = data.amountMinor;
        }
        else if (typeof data.amount === "number") {
            amountMinor = Math.round(data.amount * 100);
        }
        else {
            throw new Error("Generic payload missing 'amountMinor' or 'amount'");
        }
        return {
            externalEventId: eventId,
            externalOrderId: orderId,
            type: "ticket.purchased",
            amountMinor,
            currency: String(data.currency ?? "USD").toUpperCase(),
            referralCode: data.referralCode ?? data.referral_code ?? null,
            buyerEmail: data.email ?? null,
            campaignId: data.campaignId ?? data.campaign_id ?? null,
            occurredAt: data.occurredAt ?? new Date().toISOString(),
            rawPayload: body,
        };
    },
};
//# sourceMappingURL=adapter.js.map