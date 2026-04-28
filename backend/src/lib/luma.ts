// Luma API client — outbound calls to Luma's public API.
//
// Today the only outbound call we make is creating an event coupon at
// affiliate-activation time so the operator does not have to mirror
// codes manually in the Luma dashboard. Webhook-side processing lives
// in src/integrations/luma — this file is for OUTBOUND only.
//
// Endpoint reference: POST https://public-api.luma.com/v1/event/create-coupon
// Auth: x-luma-api-key header (calendar-scoped key). Requires Luma Plus on
// the calendar that owns the event_api_id.
//
// Failures are returned as a structured result rather than thrown so the
// caller can record the error message on CampaignAffiliate.codeSyncError
// without aborting the activation transaction.

const DEFAULT_BASE_URL = "https://public-api.luma.com";

function getBaseUrl(): string {
  return (process.env.LUMA_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function getApiKey(): string | null {
  const key = process.env.LUMA_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export type CreateCouponInput = {
  eventId: string;          // Luma event_api_id, e.g. "evt-D15DTJJimYz2w9V"
  code: string;             // ≤ 20 chars, uppercase alphanumeric (Luma normalises)
  percentOff: number;       // 0–100; 0 = tracking-only coupon
  maxUses?: number | null;  // null/undefined = unlimited
  name?: string;            // human-readable name shown in Luma admin
};

export type CreateCouponResult =
  | { ok: true; couponApiId: string | null; raw: Record<string, unknown> }
  | { ok: false; reason: "no_api_key" | "request_failed"; status?: number; message: string };

export async function createEventCoupon(input: CreateCouponInput): Promise<CreateCouponResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      reason: "no_api_key",
      message: "LUMA_API_KEY is not configured — coupon auto-sync skipped",
    };
  }

  const body: Record<string, unknown> = {
    event_api_id: input.eventId,
    code: input.code,
    percent_off: input.percentOff,
  };
  if (input.maxUses != null) body.max_uses = input.maxUses;
  if (input.name) body.name = input.name;

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}/v1/event/create-coupon`, {
      method: "POST",
      headers: {
        "x-luma-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "request_failed", message: `network: ${message}` };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      ok: false,
      reason: "request_failed",
      status: response.status,
      message: `Luma create-coupon ${response.status}${text ? `: ${text.slice(0, 300)}` : ""}`,
    };
  }

  let raw: Record<string, unknown> = {};
  try {
    raw = (await response.json()) as Record<string, unknown>;
  } catch {
    // Some Luma endpoints return empty bodies on success. Treat as ok.
  }

  const couponApiId =
    typeof raw.api_id === "string" ? raw.api_id :
    typeof raw.coupon_api_id === "string" ? raw.coupon_api_id :
    null;

  return { ok: true, couponApiId, raw };
}
