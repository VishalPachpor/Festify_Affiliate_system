import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Minimal, idempotent admin bootstrap for production.
//
// Creates ONLY:
//   • tenant_demo (create-if-missing) — required as FK target for the admin
//   • admin@festify.io (create-if-missing) — role=admin, pre-verified
//
// Deliberately skips everything else the full seed does — milestones,
// campaigns, demo assets, etc. — so re-running this against a live tenant
// does not overwrite URLs or wipe real data.
//
// Safe to run on every deploy: if the admin user already exists, the row is
// left untouched (passwords, email verification, role — all preserved). This
// lets the script sit in the PRE_DEPLOY pipeline without ever clobbering a
// password that an admin changed after the first deploy.
//
// Manual run:
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

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, email: true },
  });

  if (existing) {
    console.log(
      `[bootstrap-admin] ${existing.email} already exists (id=${existing.id}) — leaving row untouched.`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      fullName: "Demo Admin",
      passwordHash,
      role: "admin",
      tenantId: TENANT_ID,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(
    `[bootstrap-admin] created ${user.email} (id=${user.id}) with default demo password.`,
  );
}

main()
  .catch((err) => {
    console.error("[bootstrap-admin] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
