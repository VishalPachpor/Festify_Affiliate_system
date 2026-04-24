import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Minimal, idempotent admin bootstrap for production.
//
// Creates ONLY:
//   • tenant_demo (upsert) — required as FK target for the admin user
//   • admin@festify.io (upsert) — role=admin, pre-verified so login works
//
// Deliberately skips everything else the full seed does — milestones,
// campaigns, demo assets, etc. — so re-running this against a live tenant
// does not overwrite URLs or wipe real data.
//
// Run once against production:
//   DATABASE_URL="<neon url>" npx ts-node prisma/bootstrap-admin.ts

const TENANT_ID = "tenant_demo";
const TENANT_SLUG = "demo";
const ADMIN_EMAIL = "admin@festify.io";
const ADMIN_PASSWORD = "Password123!";

const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      slug: TENANT_SLUG,
      name: "Demo Tenant",
      defaultCurrency: "USD",
    },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      role: "admin",
      tenantId: TENANT_ID,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: ADMIN_EMAIL,
      fullName: "Demo Admin",
      passwordHash,
      role: "admin",
      tenantId: TENANT_ID,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`[bootstrap-admin] ok — ${user.email} (id=${user.id}) is ready. Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("[bootstrap-admin] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
