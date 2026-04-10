"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lumaAdapter = void 0;
const crypto_1 = __importDefault(require("crypto"));
// ─────────────────────────────────────────────────────────────────────────────
// Luma Adapter
//
// Maps Luma webhook payloads to our internal NormalizedEvent format.
// Luma sends events like:
//   { event: "ticket.purchased", data: { id, email, amount, currency, ... } }
// ─────────────────────────────────────────────────────────────────────────────
exports.lumaAdapter = {
    name: "luma",
    verifySignature(headers, _body, rawBody) {
        const secret = process.env.LUMA_WEBHOOK_SECRET;
        // Fail closed in production — never accept unsigned webhooks if secret missing.
        if (!secret) {
            if (process.env.NODE_ENV?.toLowerCase() === "production") {
                console.error("[luma-adapter] LUMA_WEBHOOK_SECRET not set in production — rejecting webhook");
                return false;
            }
            console.warn("[luma-adapter] LUMA_WEBHOOK_SECRET not set — skipping verification (dev only)");
            return true;
        }
        const signature = headers["x-luma-signature"];
        if (typeof signature !== "string" || signature.length === 0)
            return false;
        // Hash the raw request body — NOT the re-serialized object — so the HMAC
        // matches what the provider computed over the original wire bytes.
        const expected = crypto_1.default
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");
        // timingSafeEqual throws if buffers differ in length — guard with explicit check.
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length)
            return false;
        return crypto_1.default.timingSafeEqual(sigBuf, expBuf);
    },
    extractEventId(body) {
        const data = body;
        const inner = data.data;
        return String(inner?.id ?? data.id ?? "");
    },
    normalize(body) {
        const raw = body;
        const eventType = raw.event;
        const data = raw.data;
        if (!data)
            throw new Error("Luma payload missing 'data' field");
        const orderId = String(data.order_id ?? data.id ?? "");
        if (!orderId)
            throw new Error("Luma payload missing order identifier");
        // Luma sends amount in dollars — convert to minor units
        const amountDollars = Number(data.amount ?? data.price ?? 0);
        const amountMinor = Math.round(amountDollars * 100);
        const type = eventType === "ticket.refunded" ? "ticket.refunded" : "ticket.purchased";
        return {
            externalEventId: this.extractEventId(body),
            externalOrderId: orderId,
            type,
            amountMinor,
            currency: String(data.currency ?? "USD").toUpperCase(),
            referralCode: data.referral_code ?? data.discount_code ?? null,
            buyerEmail: data.email ?? data.user_email ?? null,
            campaignId: data.campaign_id ?? null,
            occurredAt: data.created_at ?? new Date().toISOString(),
            rawPayload: body,
        };
    },
};
//# sourceMappingURL=adapter.js.map