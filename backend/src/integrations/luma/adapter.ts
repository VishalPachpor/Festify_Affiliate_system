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

    // Luma never emits a clean "ticket.refunded" event type. Refunds
    // arrive as `guest.updated` with the guest's approval_status flipped
    // from "approved" to "declined" and event_ticket nulled out. Detect
    // those signals here so executeRefundFlow can run downstream. If
    // approval_status flips to "declined" on a free registration that
    // never produced a Sale, executeRefundFlow exits cleanly with a
    // warning — safe to over-classify in that direction.
    const approvalStatus = typeof data.approval_status === "string" ? data.approval_status : null;
    const isRefund =
      eventType === "ticket.refunded" ||
      approvalStatus === "declined" ||
      (eventType === "guest.updated" && eventTicket === null && (eventTicketOrders?.length ?? 0) > 0);

    const type = isRefund ? ("ticket.refunded" as const) : ("ticket.purchased" as const);

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
  // Headers can land under either the `webhook-*` namespace (Standard
  // Webhooks) or the legacy `svix-*` namespace. Try both.
  const webhookId =
    getHeader(headers, "webhook-id") ?? getHeader(headers, "svix-id");
  const webhookTimestamp =
    getHeader(headers, "webhook-timestamp") ?? getHeader(headers, "svix-timestamp");
  const webhookSignature =
    getHeader(headers, "webhook-signature") ?? getHeader(headers, "svix-signature");

  if (!webhookSignature) {
    console.warn(
      `[luma-adapter] Webhook signature header missing. Header keys present: ${Object.keys(headers).join(", ")}`,
    );
    return false;
  }

  // Two header formats observed in the wild:
  //   A. Standard Webhooks: "v1,<base64sig> v1,<base64sig>"
  //      (separate webhook-id + webhook-timestamp headers)
  //   B. Stripe-style:      "t=<unix-ts>,v1=<hexsig>[,v1=<hexsig>...]"
  //      (id absent; ts inline)
  // Detect by sniffing the first token.
  const isStripeStyle = webhookSignature.includes("t=") && webhookSignature.includes(",v1=");

  let timestamp: string;
  const candidateSigs: string[] = [];

  if (isStripeStyle) {
    // Parse t=<ts>,v1=<sig>[,v1=<sig>]
    let ts: string | null = null;
    for (const part of webhookSignature.split(",")) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (key === "t") ts = value;
      else if (key === "v1") candidateSigs.push(value);
    }
    if (!ts || candidateSigs.length === 0) {
      console.warn(`[luma-adapter] Stripe-style header malformed: ${webhookSignature.slice(0, 64)}`);
      return false;
    }
    timestamp = ts;
  } else {
    // Standard Webhooks: requires id + ts headers AND v1,<sig> entries.
    if (!webhookId || !webhookTimestamp) {
      console.warn(
        `[luma-adapter] Standard Webhooks headers missing — id=${!!webhookId} ts=${!!webhookTimestamp}. Header keys: ${Object.keys(headers).join(", ")}`,
      );
      return false;
    }
    timestamp = webhookTimestamp;
    for (const candidate of webhookSignature.split(" ")) {
      const [version, sig] = candidate.split(",", 2);
      if (version === "v1" && sig) candidateSigs.push(sig);
    }
    if (candidateSigs.length === 0) {
      console.warn(`[luma-adapter] No v1 signatures in header: ${webhookSignature.slice(0, 64)}`);
      return false;
    }
  }

  // Replay-attack guard. Timestamp is unix seconds; tolerate ms format.
  let tsSeconds = Number(timestamp);
  if (!Number.isFinite(tsSeconds)) return false;
  if (tsSeconds > 1e12) tsSeconds = Math.floor(tsSeconds / 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const skew = Math.abs(nowSeconds - tsSeconds);
  if (skew > STANDARD_WEBHOOK_REPLAY_WINDOW_SECONDS) {
    console.warn(
      `[luma-adapter] Webhook timestamp outside replay window (delta=${nowSeconds - tsSeconds}s, ts=${timestamp})`,
    );
    return false;
  }

  // Build candidate HMAC keys + signed payloads + output encodings. Different
  // platforms differ on all three axes; until we confirm Luma's exact choice,
  // try every plausible combo. Each compare is constant-time, so trying
  // multiple is safe — the worst case is a few extra HMACs per request.
  const secretAfterPrefix = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const keyVariants: { name: string; key: Buffer | string }[] = [
    { name: "raw-full", key: secret },
    { name: "raw-suffix", key: secretAfterPrefix },
    { name: "base64-decoded-suffix", key: Buffer.from(secretAfterPrefix, "base64") },
  ];

  const stripeSigned = `${timestamp}.${rawBody.toString("utf8")}`;
  const stdWebhooksSigned = webhookId
    ? `${webhookId}.${timestamp}.${rawBody.toString("utf8")}`
    : null;

  const payloadVariants: { name: string; signed: string }[] = isStripeStyle
    ? [{ name: "stripe(<ts>.<body>)", signed: stripeSigned }]
    : stdWebhooksSigned
      ? [
          { name: "stdwebhooks(<id>.<ts>.<body>)", signed: stdWebhooksSigned },
          { name: "stripe(<ts>.<body>)", signed: stripeSigned },
        ]
      : [{ name: "stripe(<ts>.<body>)", signed: stripeSigned }];

  const encodings: ("hex" | "base64")[] = ["hex", "base64"];

  for (const sig of candidateSigs) {
    for (const { name: keyName, key } of keyVariants) {
      for (const { name: payloadName, signed } of payloadVariants) {
        for (const encoding of encodings) {
          let computed: string;
          try {
            computed = crypto.createHmac("sha256", key).update(signed).digest(encoding);
          } catch {
            continue;
          }
          const sigBuf = Buffer.from(sig);
          const compBuf = Buffer.from(computed);
          if (sigBuf.length !== compBuf.length) continue;
          if (crypto.timingSafeEqual(sigBuf, compBuf)) {
            console.log(
              `[luma-adapter] signature MATCH via key=${keyName} payload=${payloadName} encoding=${encoding}`,
            );
            return true;
          }
        }
      }
    }
  }

  console.warn(
    `[luma-adapter] signature mismatch across all combos — id=${webhookId ?? "<absent>"} ts=${timestamp} bodyLen=${rawBody.length} sigsTried=${candidateSigs.length} headerSigPrefix=${webhookSignature.slice(0, 24)}`,
  );
  return false;
}
