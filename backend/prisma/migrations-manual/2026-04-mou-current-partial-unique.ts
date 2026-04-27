import { PrismaClient } from "@prisma/client";

// Defensive partial unique index on MouAgreement(applicationId) WHERE isCurrent.
//
// Today's code paths (approveApplication / reissueMou) serialize correctly —
// they flip every prior isCurrent=true to false inside the transaction before
// inserting a new isCurrent=true row. But Prisma cannot express "unique only
// when X" in schema.prisma, so there is no DB-level guarantee against a
// future code path silently creating two isCurrent=true rows for the same
// application. The activation lookup (`findFirst` by providerDocumentId +
// isCurrent) would become nondeterministic in that case.
//
// This migration adds the partial unique index Postgres can enforce. Apply
// once after `prisma db push`. Idempotent via IF NOT EXISTS.
//
// Manual run:
//   DATABASE_URL="<neon url>" npx ts-node prisma/migrations-manual/2026-04-mou-current-partial-unique.ts

const INDEX_NAME = "mou_agreement_application_current";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "${INDEX_NAME}" ON "MouAgreement"("applicationId") WHERE "isCurrent" = true`,
  );
  console.log(`[mou-current-partial-unique] index ${INDEX_NAME} ensured.`);
}

main()
  .catch((err) => {
    console.error("[mou-current-partial-unique] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
