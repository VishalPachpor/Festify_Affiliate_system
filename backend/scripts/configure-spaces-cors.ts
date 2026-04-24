import "dotenv/config";
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";

// Idempotent, source-controlled CORS configuration for the Spaces bucket.
//
// The asset upload flow (backend/src/routes/assets.ts → POST /api/assets/upload-url)
// hands the browser a presigned POST URL, then the browser `fetch()`es the
// bytes straight to Spaces. Without CORS on the bucket, the browser blocks the
// cross-origin POST response and surfaces it as "Failed to fetch" — not a bug
// in the upload code, just missing bucket config.
//
// This script applies a narrow rule: POST only, scoped to our app origins. It
// does not alter ACLs, policies, lifecycle, or any existing objects.
//
// Run once after the bucket is provisioned, and re-run any time origins change:
//
//   cd backend
//   SPACES_KEY=... SPACES_SECRET=... SPACES_BUCKET=passtrack-assets \
//     CORS_ORIGIN="https://passtrack.xyz,https://www.passtrack.xyz" \
//     npm run spaces:cors

const SPACES_REGION = process.env.SPACES_REGION ?? "sgp1";
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT ?? `https://${SPACES_REGION}.digitaloceanspaces.com`;
const SPACES_BUCKET = process.env.SPACES_BUCKET ?? "";
const SPACES_KEY = process.env.SPACES_KEY ?? "";
const SPACES_SECRET = process.env.SPACES_SECRET ?? "";

// Dev origin is always allowed so `npm run dev` uploads work locally.
const LOCAL_DEV_ORIGIN = "http://localhost:3000";

function requiredEnv(): void {
  const missing: string[] = [];
  if (!SPACES_BUCKET) missing.push("SPACES_BUCKET");
  if (!SPACES_KEY) missing.push("SPACES_KEY");
  if (!SPACES_SECRET) missing.push("SPACES_SECRET");
  if (missing.length > 0) {
    console.error(`[spaces-cors] missing env: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function resolveAllowedOrigins(): string[] {
  const configured = String(process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const set = new Set<string>(configured);
  set.add(LOCAL_DEV_ORIGIN);

  if (set.size === 0) {
    console.error("[spaces-cors] no origins resolved — set CORS_ORIGIN");
    process.exit(1);
  }
  return Array.from(set);
}

async function main(): Promise<void> {
  requiredEnv();
  const allowedOrigins = resolveAllowedOrigins();

  const s3 = new S3Client({
    region: SPACES_REGION,
    endpoint: SPACES_ENDPOINT,
    forcePathStyle: false,
    credentials: {
      accessKeyId: SPACES_KEY,
      secretAccessKey: SPACES_SECRET,
    },
  });

  // POST only — that is the single browser-facing operation in the upload
  // flow. Reads flow through the backend's presigned GET redirects and do
  // not need bucket CORS (standard `<img>` / navigation loads, not fetch()).
  const corsConfiguration = {
    CORSRules: [
      {
        AllowedOrigins: allowedOrigins,
        AllowedMethods: ["POST"],
        AllowedHeaders: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3000,
      },
    ],
  };

  console.log(`[spaces-cors] bucket=${SPACES_BUCKET} endpoint=${SPACES_ENDPOINT}`);
  console.log(`[spaces-cors] applying rule:`, JSON.stringify(corsConfiguration, null, 2));

  await s3.send(
    new PutBucketCorsCommand({
      Bucket: SPACES_BUCKET,
      CORSConfiguration: corsConfiguration,
    }),
  );

  const verify = await s3.send(new GetBucketCorsCommand({ Bucket: SPACES_BUCKET }));
  console.log(`[spaces-cors] applied. live config:`, JSON.stringify(verify.CORSRules, null, 2));
}

main().catch((err) => {
  console.error("[spaces-cors] failed:", err);
  process.exit(1);
});
