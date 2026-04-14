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
        // If no secret is configured, skip verification. Luma's free webhook
        // tier doesn't provide a signing secret — only the API key.
        if (!secret) {
            console.warn("[luma-adapter] LUMA_WEBHOOK_SECRET not set — accepting webhook without signature verification");
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
        const raw = body;
        const data = raw.data;
        return String(data?.api_id ?? data?.id ?? raw.id ?? "");
    },
    normalize(body) {
        const raw = body;
        // Luma sends "type" (not "event") at the top level
        const eventType = raw.type ?? raw.event ?? "";
        const data = raw.data;
        if (!data)
            throw new Error("Luma payload missing 'data' field");
        const orderId = String(data.order_id ?? data.api_id ?? data.id ?? "");
        if (!orderId)
            throw new Error("Luma payload missing order identifier");
        // ── Amount extraction ──────────────────────────────────────────────
        // Luma nests ticket pricing under data.event_ticket.amount (in cents)
        // and data.event_ticket_orders[].amount. Fall back to top-level fields.
        const eventTicket = data.event_ticket;
        const eventTicketOrders = data.event_ticket_orders;
        const firstOrder = eventTicketOrders?.[0];
        // Prefer order-level amount, then ticket-level, then top-level.
        // Luma sends amounts in cents already (e.g. 450 = $4.50).
        let amountMinor;
        const orderAmount = firstOrder?.amount ?? eventTicket?.amount;
        if (typeof orderAmount === "number" && orderAmount > 0) {
            amountMinor = orderAmount;
        }
        else {
            // Legacy/fallback: top-level amount in dollars
            const amountDollars = Number(data.amount ?? data.price ?? 0);
            amountMinor = Math.round(amountDollars * 100);
        }
        const type = eventType === "ticket.refunded" ? "ticket.refunded" : "ticket.purchased";
        // ── Coupon/referral code extraction ─────────────────────────────────
        // Luma nests coupon info under data.event_ticket_orders[].coupon_info.code.
        // Fall back to top-level fields for simpler payload formats.
        const couponInfo = firstOrder?.coupon_info;
        const referralCode = couponInfo?.code ??
            data.coupon_code ??
            data.coupon ??
            data.discount_code ??
            data.referral_code ??
            data.promo_code ??
            null;
        // ── Currency ────────────────────────────────────────────────────────
        const currency = String(firstOrder?.currency ?? eventTicket?.currency ?? data.currency ?? "USD").toUpperCase();
        return {
            externalEventId: this.extractEventId(body),
            externalOrderId: orderId,
            type,
            amountMinor,
            currency,
            referralCode,
            buyerEmail: data.email ?? data.user_email ?? null,
            campaignId: data.campaign_id ?? null,
            occurredAt: data.created_at ?? new Date().toISOString(),
            rawPayload: body,
        };
    },
};
//# sourceMappingURL=adapter.js.map