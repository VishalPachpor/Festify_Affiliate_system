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

    // Luma delivers webhooks via the Standard Webhooks / Svix scheme when
    // the secret is in `whsec_<base64>` form. Detect by prefix and route
    // to the correct verifier — falling back to the legacy single-header
    // HMAC for any tenant still on an older Luma signing flow.
    if (secret.startsWith("whsec_")) {
      return verifyStandardWebhooks(headers, rawBody, secret);
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
    const raw = body as Record<string, unknown>;
    const data = raw.data as Record<string, unknown> | undefined;
    return String(data?.api_id ?? data?.id ?? raw.id ?? "");
  },

  normalize(body): NormalizedEvent {
    const raw = body as Record<string, unknown>;
    // Luma sends "type" (not "event") at the top level
    const eventType = (raw.type as string) ?? (raw.event as string) ?? "";
    const data = raw.data as Record<string, unknown>;

    if (!data) throw new Error("Luma payload missing 'data' field");

    const orderId = String(data.order_id ?? data.api_id ?? data.id ?? "");
    if (!orderId) throw new Error("Luma payload missing order identifier");

    // ── Amount extraction ──────────────────────────────────────────────
    // Luma nests ticket pricing under data.event_ticket.amount (in cents)
    // and data.event_ticket_orders[].amount. Fall back to top-level fields.
    const eventTicket = data.event_ticket as Record<string, unknown> | undefined;
    const eventTicketOrders = data.event_ticket_orders as Array<Record<string, unknown>> | undefined;
    const firstOrder = eventTicketOrders?.[0];

    // Prefer order-level amount, then ticket-level, then top-level.
    // Luma sends amounts in cents already (e.g. 450 = $4.50).
    let amountMinor: number;
    const orderAmount = firstOrder?.amount ?? eventTicket?.amount;
    if (typeof orderAmount === "number" && orderAmount > 0) {
      amountMinor = orderAmount;
    } else {
      // Legacy/fallback: top-level amount in dollars
      const amountDollars = Number(data.amount ?? data.price ?? 0);
      amountMinor = Math.round(amountDollars * 100);
    }

    const type = eventType === "ticket.refunded" ? "ticket.refunded" as const : "ticket.purchased" as const;

    // ── Coupon/referral code extraction ─────────────────────────────────
    // Luma nests coupon info under data.event_ticket_orders[].coupon_info.code.
    // Fall back to top-level fields for simpler payload formats.
    const couponInfo = firstOrder?.coupon_info as Record<string, unknown> | undefined;
    const referralCode =
      (couponInfo?.code as string) ??
      (data.coupon_code as string) ??
      (data.coupon as string) ??
      (data.discount_code as string) ??
      (data.referral_code as string) ??
      (data.promo_code as string) ??
      null;

    // ── Currency ────────────────────────────────────────────────────────
    const currency = String(
      firstOrder?.currency ?? eventTicket?.currency ?? data.currency ?? "USD"
    ).toUpperCase();

    return {
      externalEventId: this.extractEventId(body),
      externalOrderId: orderId,
      type,
      amountMinor,
      currency,
      referralCode,
      buyerEmail: (data.email as string) ?? (data.user_email as string) ?? null,
      campaignId: (data.campaign_id as string) ?? null,
      occurredAt: (data.created_at as string) ?? new Date().toISOString(),
      rawPayload: body,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Standard Webhooks (Svix) signature verification
// https://www.standardwebhooks.com/
//
// Luma uses this scheme when the secret is in the `whsec_<base64>` form.
// Headers:
//   webhook-id          — unique id per delivery
//   webhook-timestamp   — unix seconds the payload was signed at
//   webhook-signature   — space-separated list of `v1,<base64sig>` pairs
//                         (multiple to support secret rotation)
//
// Signed content: `${id}.${timestamp}.${rawBody}`
// HMAC key: base64-decode the part after `whsec_`
// Algorithm: HMAC-SHA256, base64 output
// Replay window: ±5 minutes (rejecting stale timestamps)
// ─────────────────────────────────────────────────────────────────────────────

const STANDARD_WEBHOOK_REPLAY_WINDOW_SECONDS = 5 * 60;

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | null {
  const raw = headers[name];
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") return raw[0];
  return null;
}

function verifyStandardWebhooks(
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer,
  secret: string,
): boolean {
  const webhookId = getHeader(headers, "webhook-id");
  const webhookTimestamp = getHeader(headers, "webhook-timestamp");
  const webhookSignature = getHeader(headers, "webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.warn(
      `[luma-adapter] Standard Webhooks headers missing — id=${!!webhookId} ts=${!!webhookTimestamp} sig=${!!webhookSignature}`,
    );
    return false;
  }

  // Replay-attack guard. Timestamp is unix seconds.
  const tsSeconds = Number(webhookTimestamp);
  if (!Number.isFinite(tsSeconds)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > STANDARD_WEBHOOK_REPLAY_WINDOW_SECONDS) {
    console.warn(
      `[luma-adapter] Standard Webhooks timestamp outside replay window (delta=${nowSeconds - tsSeconds}s)`,
    );
    return false;
  }

  // The HMAC key is the base64-decoded portion after the `whsec_` prefix.
  const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  // Header may carry multiple sigs (key rotation). Format: "v1,<sig> v1,<sig>".
  // Accept the message if ANY of them matches.
  const candidates = webhookSignature.split(" ");
  for (const candidate of candidates) {
    const [version, sig] = candidate.split(",", 2);
    if (version !== "v1" || !sig) continue;
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length !== expectedBuf.length) continue;
    if (crypto.timingSafeEqual(sigBuf, expectedBuf)) return true;
  }
  return false;
}
