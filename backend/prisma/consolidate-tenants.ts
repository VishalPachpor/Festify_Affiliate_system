import { PrismaClient } from "@prisma/client";

// One-shot consolidation: collapse stranded test/CI tenants into tenant_demo.
//
// The production DB ended up with 4 tenants because pickDefaultTenantId()
// returns the *oldest* tenant by createdAt — early CI/e2e runs created
// throwaway tenants (TOKEN_TEST, codex-organizer-smoke, codex-e2e-event)
// before tenant_demo existed, so subsequent signups landed there. Two real
// users (Pachpor admin + Vishal Patil's affiliate signup) ended up on the
// TOKEN_TEST tenant, which is why /admin views diverged depending on which
// account was logged in.
//
// This script:
//   1. Moves real users → tenant_demo (User.tenantId = tenant_demo)
//   2. Moves Vishal's Application → tenant_demo / campaign_demo
//   3. Deletes throwaway test users (cascades to EmailVerification + PWReset)
//   4. Deletes throwaway test Applications (cascades to MouAgreement)
//   5. Deletes orphan Campaigns + Tenants
//
// Defaults to DRY-RUN. Pass --apply to actually mutate.
//
// Run:
//   DATABASE_URL='<neon-url>' npx ts-node prisma/consolidate-tenants.ts
//   DATABASE_URL='<neon-url>' npx ts-node prisma/consolidate-tenants.ts --apply

const TARGET_TENANT_ID = "tenant_demo";
const TARGET_CAMPAIGN_ID = "campaign_demo";

// Real user emails to relocate (rather than delete)
const PRESERVE_USER_EMAILS = new Set([
  "polymarketbot334@gmail.com",
  "ngravity763@gmail.com",
]);

const APPLY = process.argv.includes("--apply");

const prisma = new PrismaClient();

async function main() {
  console.log(`[consolidate] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  const target = await prisma.tenant.findUnique({ where: { id: TARGET_TENANT_ID } });
  if (!target) throw new Error(`target tenant ${TARGET_TENANT_ID} not found — aborting`);

  const targetCampaign = await prisma.campaign.findUnique({ where: { id: TARGET_CAMPAIGN_ID } });
  if (!targetCampaign) throw new Error(`target campaign ${TARGET_CAMPAIGN_ID} not found — aborting`);

  const strandedTenants = await prisma.tenant.findMany({
    where: { id: { not: TARGET_TENANT_ID } },
    select: { id: true, slug: true, name: true },
  });

  if (strandedTenants.length === 0) {
    console.log("[consolidate] no stranded tenants — nothing to do.");
    return;
  }

  console.log(`[consolidate] found ${strandedTenants.length} stranded tenant(s):`);
  for (const t of strandedTenants) console.log(`  - ${t.id}  slug=${t.slug}  name=${t.name}`);

  const strandedTenantIds = strandedTenants.map((t) => t.id);

  // ── Plan: list everything attached to stranded tenants ────────────────────
  const usersOnStranded = await prisma.user.findMany({
    where: { tenantId: { in: strandedTenantIds } },
    select: { id: true, email: true, fullName: true, tenantId: true, role: true },
  });

  const appsOnStranded = await prisma.application.findMany({
    where: { tenantId: { in: strandedTenantIds } },
    select: { id: true, email: true, firstName: true, tenantId: true, campaignId: true, status: true },
  });

  const affiliatesOnStranded = await prisma.campaignAffiliate.findMany({
    where: { tenantId: { in: strandedTenantIds } },
    select: { id: true, affiliateId: true, referralCode: true, tenantId: true },
  });

  const salesOnStranded = await prisma.sale.findMany({
    where: { tenantId: { in: strandedTenantIds } },
    select: { id: true, tenantId: true },
  });

  const inboundOnStranded = await prisma.inboundEvent.findMany({
    where: { tenantId: { in: strandedTenantIds } },
    select: { id: true, tenantId: true },
  });

  const providerConnsOnStranded = await prisma.providerConnection.findMany({
    where: { tenantId: { in: strandedTenantIds } },
    select: { id: true, provider: true, connectionId: true, tenantId: true },
  });

  const campaignsOnStranded = await prisma.campaign.findMany({
    where: { tenantId: { in: strandedTenantIds } },
    select: { id: true, slug: true, name: true, tenantId: true },
  });

  console.log(`\n[consolidate] inventory on stranded tenants:`);
  console.log(`  users: ${usersOnStranded.length}`);
  for (const u of usersOnStranded) {
    const verdict = PRESERVE_USER_EMAILS.has(u.email) ? "MOVE" : "DELETE";
    console.log(`    ${verdict}  ${u.email}  (${u.fullName}, role=${u.role}, tenantId=${u.tenantId})`);
  }
  console.log(`  applications: ${appsOnStranded.length}`);
  for (const a of appsOnStranded) {
    const verdict = PRESERVE_USER_EMAILS.has(a.email) ? "MOVE" : "DELETE";
    console.log(`    ${verdict}  ${a.email}  (${a.firstName}, status=${a.status})`);
  }
  console.log(`  campaign affiliates: ${affiliatesOnStranded.length}`);
  for (const ca of affiliatesOnStranded) {
    console.log(`    DELETE  ${ca.affiliateId}  code=${ca.referralCode}`);
  }
  console.log(`  sales: ${salesOnStranded.length}    (DELETE)`);
  console.log(`  inbound events: ${inboundOnStranded.length}    (DELETE)`);
  console.log(`  provider connections: ${providerConnsOnStranded.length}`);
  for (const pc of providerConnsOnStranded) {
    console.log(`    DELETE  ${pc.provider}/${pc.connectionId}`);
  }
  console.log(`  campaigns: ${campaignsOnStranded.length}`);
  for (const c of campaignsOnStranded) {
    console.log(`    DELETE  ${c.slug} (${c.name})`);
  }

  // ── Pre-flight: check destination conflicts ───────────────────────────────
  const movableUsers = usersOnStranded.filter((u) => PRESERVE_USER_EMAILS.has(u.email));
  const movableApps = appsOnStranded.filter((a) => PRESERVE_USER_EMAILS.has(a.email));

  for (const a of movableApps) {
    const conflict = await prisma.application.findUnique({
      where: {
        tenantId_campaignId_email: {
          tenantId: TARGET_TENANT_ID,
          campaignId: TARGET_CAMPAIGN_ID,
          email: a.email,
        },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new Error(
        `cannot move application ${a.id} (${a.email}): a row already exists at ` +
          `(${TARGET_TENANT_ID}, ${TARGET_CAMPAIGN_ID}, ${a.email}) — manual resolution needed`,
      );
    }
  }

  if (!APPLY) {
    console.log(`\n[consolidate] DRY-RUN complete. Pass --apply to execute.`);
    return;
  }

  // ── Execute in a single transaction ───────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // 1. Move preserve-listed users → tenant_demo
    for (const u of movableUsers) {
      await tx.user.update({
        where: { id: u.id },
        data: { tenantId: TARGET_TENANT_ID },
      });
      console.log(`[apply] moved user ${u.email} → ${TARGET_TENANT_ID}`);
    }

    // 2. Move preserve-listed applications → tenant_demo / campaign_demo
    for (const a of movableApps) {
      await tx.application.update({
        where: { id: a.id },
        data: { tenantId: TARGET_TENANT_ID, campaignId: TARGET_CAMPAIGN_ID },
      });
      console.log(`[apply] moved application ${a.email} → ${TARGET_TENANT_ID}/${TARGET_CAMPAIGN_ID}`);
    }

    // 3. Delete sales on stranded tenants (no preserve list — none of these are real)
    if (salesOnStranded.length > 0) {
      const r = await tx.sale.deleteMany({ where: { tenantId: { in: strandedTenantIds } } });
      console.log(`[apply] deleted ${r.count} sales`);
    }

    // 4. Delete inbound events on stranded tenants
    if (inboundOnStranded.length > 0) {
      const r = await tx.inboundEvent.deleteMany({ where: { tenantId: { in: strandedTenantIds } } });
      console.log(`[apply] deleted ${r.count} inbound events`);
    }

    // 5. Delete campaign affiliates on stranded tenants
    if (affiliatesOnStranded.length > 0) {
      const r = await tx.campaignAffiliate.deleteMany({ where: { tenantId: { in: strandedTenantIds } } });
      console.log(`[apply] deleted ${r.count} campaign affiliates`);
    }

    // 6. Delete provider connections on stranded tenants
    if (providerConnsOnStranded.length > 0) {
      const r = await tx.providerConnection.deleteMany({ where: { tenantId: { in: strandedTenantIds } } });
      console.log(`[apply] deleted ${r.count} provider connections`);
    }

    // 7. Delete remaining applications on stranded tenants (cascades to MouAgreement)
    const remainingApps = appsOnStranded.filter((a) => !PRESERVE_USER_EMAILS.has(a.email));
    if (remainingApps.length > 0) {
      const r = await tx.application.deleteMany({
        where: { id: { in: remainingApps.map((a) => a.id) } },
      });
      console.log(`[apply] deleted ${r.count} applications`);
    }

    // 8. Delete remaining users on stranded tenants (cascades to EmailVerification + PasswordResetToken)
    const remainingUsers = usersOnStranded.filter((u) => !PRESERVE_USER_EMAILS.has(u.email));
    if (remainingUsers.length > 0) {
      const r = await tx.user.deleteMany({
        where: { id: { in: remainingUsers.map((u) => u.id) } },
      });
      console.log(`[apply] deleted ${r.count} users`);
    }

    // 9. Delete orphan campaigns on stranded tenants
    if (campaignsOnStranded.length > 0) {
      const r = await tx.campaign.deleteMany({ where: { tenantId: { in: strandedTenantIds } } });
      console.log(`[apply] deleted ${r.count} campaigns`);
    }

    // 10. Finally, delete the stranded tenants themselves
    const r = await tx.tenant.deleteMany({ where: { id: { in: strandedTenantIds } } });
    console.log(`[apply] deleted ${r.count} tenants`);
  });

  console.log(`\n[consolidate] APPLY complete. Verify in Prisma Studio:`);
  console.log(`  - Tenant: 1 row (tenant_demo)`);
  console.log(`  - Campaign: 1 row (campaign_demo)`);
  console.log(`  - User: should still include polymarketbot334@gmail.com + ngravity763@gmail.com on tenant_demo`);
  console.log(`  - Application: should include ngravity763@gmail.com on tenant_demo/campaign_demo`);
}

main()
  .catch((err) => {
    console.error("[consolidate] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
