// Smoke-test the create-coupon shape. After v1 we learned:
//   - code must be ≤20 chars
//   - discount needs a `discount_type` discriminator field
// This v2 cycles through likely discount_type values to find the right one.
//
// Run:
//   LUMA_API_KEY='<key>' LUMA_EVENT_ID='evt-D15DTJJimYz2w9V' \
//     npx ts-node scripts/probe-luma-create-coupon.ts

const apiKey = process.env.LUMA_API_KEY?.trim();
const eventId = process.env.LUMA_EVENT_ID?.trim() || "evt-D15DTJJimYz2w9V";

async function attempt(label: string, body: Record<string, unknown>) {
  console.log(`\n── ${label} ──`);
  console.log("body:", JSON.stringify(body));
  const res = await fetch("https://public-api.luma.com/v1/event/create-coupon", {
    method: "POST",
    headers: {
      "x-luma-api-key": apiKey!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`status: ${res.status}`);
  console.log(`response: ${text}`);
  return { status: res.status, text };
}

async function main() {
  if (!apiKey) {
    console.error("LUMA_API_KEY missing");
    process.exit(1);
  }

  // Use short, unique codes that fit ≤20 chars.
  const stamp = Date.now().toString().slice(-6);

  const cases: Array<{ label: string; suffix: string; discount: Record<string, unknown> }> = [
    { label: "discount_type: percent + percent_off",  suffix: "A", discount: { discount_type: "percent",     percent_off: 10 } },
    { label: "discount_type: percent_off",            suffix: "B", discount: { discount_type: "percent_off", percent_off: 10 } },
    { label: "discount_type: cents + cents_off",      suffix: "C", discount: { discount_type: "cents",       cents_off: 100, currency: "USD" } },
    { label: "discount_type: cents_off",              suffix: "D", discount: { discount_type: "cents_off",   cents_off: 100, currency: "USD" } },
    { label: "discount_type: percentage + amount",    suffix: "E", discount: { discount_type: "percentage",  amount: 10 } },
    { label: "discount_type: percent + amount",       suffix: "F", discount: { discount_type: "percent",     amount: 10 } },
  ];

  for (const c of cases) {
    const code = `PRB${stamp}${c.suffix}`; // ~10 chars, well under 20
    const r = await attempt(c.label, { event_api_id: eventId, code, discount: c.discount });
    if (r.status < 300) {
      console.log(`\n✅ WORKING SHAPE: ${c.label}`);
      console.log(`   discount = ${JSON.stringify(c.discount)}`);
      console.log(`   created code: ${code}`);
      return;
    }
  }

  console.log("\nAll variants failed — inspect error messages above for the next clue.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
