// One-shot diagnostic: fetch existing coupons from Luma so we can see the exact
// discount object shape the API uses, then mirror it on the create-coupon side.
//
// The current backend create-coupon call is failing with:
//   400: discount: Invalid input: expected object, received undefined
// meaning Luma wants `discount` as a structured object, not a flat percent_off.
// This script reads back what's already there to reverse-engineer the shape.
//
// Run:
//   LUMA_API_KEY='<key>' LUMA_EVENT_ID='evt-D15DTJJimYz2w9V' \
//     npx ts-node scripts/probe-luma-coupon-shape.ts

const apiKey = process.env.LUMA_API_KEY?.trim();
const eventId = process.env.LUMA_EVENT_ID?.trim() || "evt-D15DTJJimYz2w9V";

async function main() {
  if (!apiKey) {
    console.error("LUMA_API_KEY missing");
    process.exit(1);
  }

  const url = `https://public-api.luma.com/v1/event/coupons?event_api_id=${encodeURIComponent(eventId)}`;
  console.log(`GET ${url}\n`);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-luma-api-key": apiKey,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  console.log(`status: ${res.status}\n`);
  try {
    const json = JSON.parse(text);
    console.log(JSON.stringify(json, null, 2));
  } catch {
    console.log(text);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
