import type { ProviderAdapter, NormalizedEvent } from "../core/adapter";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Luma Adapter
//
// Maps Luma webhook payloads to our internal NormalizedEvent format.
// Luma sends events like:
//   { event: "ticket.purchased", data: { id, email, amount, currency, ... } }
// ─────────────────────────────────────────────────────────────────────────────

export const lumaAdapter: ProviderAdapter = {
  name: "luma",

  verifySignature(headers, _body, rawBody): boolean {
    const secret = process.env.LUMA_WEBHOOK_SECRET;

    // If no secret is configured, skip verification. Luma's free webhook
    // tier doesn't provide a signing secret — only the API key.
    if (!secret) {
      console.warn("[luma-adapter] LUMA_WEBHOOK_SECRET not set — accepting webhook without signature verification");
      return true;
    }

    const signature = headers["x-luma-signature"];
    if (typeof signature !== "string" || signature.length === 0) return false;

    // Hash the raw request body — NOT the re-serialized object — so the HMAC
    // matches what the provider computed over the original wire bytes.
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    // timingSafeEqual throws if buffers differ in length — guard with explicit check.
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expBuf);
  },

  extractEventId(body): string {
    const data = body as Record<string, unknown>;
    const inner = data.data as Record<string, unknown> | undefined;
    return String(inner?.id ?? data.id ?? "");
  },

  normalize(body): NormalizedEvent {
    const raw = body as Record<string, unknown>;
    const eventType = raw.event as string;
    const data = raw.data as Record<string, unknown>;

    if (!data) throw new Error("Luma payload missing 'data' field");

    const orderId = String(data.order_id ?? data.id ?? "");
    if (!orderId) throw new Error("Luma payload missing order identifier");

    // Luma sends amount in dollars — convert to minor units
    const amountDollars = Number(data.amount ?? data.price ?? 0);
    const amountMinor = Math.round(amountDollars * 100);

    const type = eventType === "ticket.refunded" ? "ticket.refunded" as const : "ticket.purchased" as const;

    return {
      externalEventId: this.extractEventId(body),
      externalOrderId: orderId,
      type,
      amountMinor,
      currency: String(data.currency ?? "USD").toUpperCase(),
      referralCode: (data.referral_code as string) ?? (data.discount_code as string) ?? null,
      buyerEmail: (data.email as string) ?? (data.user_email as string) ?? null,
      campaignId: (data.campaign_id as string) ?? null,
      occurredAt: (data.created_at as string) ?? new Date().toISOString(),
      rawPayload: body,
    };
  },
};
