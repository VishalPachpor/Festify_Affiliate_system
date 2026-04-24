import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();

/**
 * One-shot migration: rewrites `Asset.fileUrl` from the old
 * `<PUBLIC_API_URL>/uploads/<tenantId>/<file>` format to the bare object key
 * (`<tenantId>/<file>`) that the new private-Spaces serving path expects.
 *
 * Prerequisite: sync `backend/uploads/` into the target Spaces bucket first:
 *   s3cmd sync backend/uploads/ s3://<bucket>/ \
 *     --host=sgp1.digitaloceanspaces.com \
 *     --host-bucket='%(bucket)s.sgp1.digitaloceanspaces.com'
 *
 * Safety: defaults to dry-run. Every candidate row is verified with HeadObject
 * against Spaces — rows whose object is missing are reported, not rewritten.
 *
 * Usage:
 *   ts-node prisma/migrate-asset-urls.ts           # dry run, no writes
 *   ts-node prisma/migrate-asset-urls.ts --apply   # actually update rows
 */

const APPLY = process.argv.includes("--apply");

const SPACES_REGION = process.env.SPACES_REGION ?? "sgp1";
const SPACES_ENDPOINT =
  process.env.SPACES_ENDPOINT ?? `https://${SPACES_REGION}.digitaloceanspaces.com`;
const SPACES_BUCKET = process.env.SPACES_BUCKET ?? "";

if (!SPACES_BUCKET || !process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
  console.error(
    "[migrate-asset-urls] SPACES_BUCKET / SPACES_KEY / SPACES_SECRET must be set.",
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: SPACES_REGION,
  endpoint: SPACES_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.SPACES_KEY ?? "",
    secretAccessKey: process.env.SPACES_SECRET ?? "",
  },
});

// Extract the `<tenantId>/<file>` suffix from either an absolute URL like
// `http://host/uploads/tenant/file.png` or a path like `/uploads/tenant/file.png`.
// Returns null if the value doesn't look like the old layout.
function extractKey(fileUrl: string): string | null {
  const marker = "/uploads/";
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  const key = fileUrl.slice(idx + marker.length).replace(/^\/+/, "");
  return key.length > 0 ? key : null;
}

// A value already in the new format is a bare `<tenantId>/<file>` — it has no
// scheme, no leading slash, and includes at least one slash separator.
function looksLikeBareKey(value: string): boolean {
  if (/^https?:\/\//i.test(value)) return false;
  if (value.startsWith("/")) return false;
  return value.includes("/");
}

async function headExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: SPACES_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(
    `[migrate-asset-urls] ${APPLY ? "APPLY" : "DRY RUN"} — bucket=${SPACES_BUCKET}`,
  );

  const assets = await prisma.asset.findMany({
    select: { id: true, tenantId: true, fileUrl: true, title: true },
  });

  let alreadyMigrated = 0;
  let rewritten = 0;
  let missingInSpaces = 0;
  let unrecognised = 0;

  for (const asset of assets) {
    if (looksLikeBareKey(asset.fileUrl)) {
      alreadyMigrated++;
      continue;
    }

    const key = extractKey(asset.fileUrl);
    if (!key) {
      unrecognised++;
      console.warn(
        `  [skip] id=${asset.id} (${asset.title}) — unrecognised fileUrl: ${asset.fileUrl}`,
      );
      continue;
    }

    if (!key.startsWith(`${asset.tenantId}/`)) {
      unrecognised++;
      console.warn(
        `  [skip] id=${asset.id} — key "${key}" does not match tenantId "${asset.tenantId}"`,
      );
      continue;
    }

    const exists = await headExists(key);
    if (!exists) {
      missingInSpaces++;
      console.warn(`  [missing] id=${asset.id} — object not found in Spaces: ${key}`);
      continue;
    }

    if (APPLY) {
      await prisma.asset.update({ where: { id: asset.id }, data: { fileUrl: key } });
      console.log(`  [rewrite] id=${asset.id} → ${key}`);
    } else {
      console.log(`  [would-rewrite] id=${asset.id} → ${key}`);
    }
    rewritten++;
  }

  console.log("\n[migrate-asset-urls] Summary:");
  console.log(`  total assets:       ${assets.length}`);
  console.log(`  already migrated:   ${alreadyMigrated}`);
  console.log(`  ${APPLY ? "rewritten" : "would rewrite"}:        ${rewritten}`);
  console.log(`  missing in Spaces:  ${missingInSpaces}`);
  console.log(`  unrecognised:       ${unrecognised}`);

  if (!APPLY && rewritten > 0) {
    console.log("\nRe-run with --apply to actually update the database.");
  }
}

main()
  .catch((err) => {
    console.error("[migrate-asset-urls] Fatal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
