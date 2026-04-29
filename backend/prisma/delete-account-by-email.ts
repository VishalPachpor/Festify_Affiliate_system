// Deletes every row tied to a given email so the same person can re-test
// the platform from scratch (re-apply, re-sign, etc.). Bails by default if
// the account has any financial history (sales / commission entries /
// payouts) — pass --force to delete those too.
//
// Usage:
//   # safe (default) — only deletes if no financial history exists
//   npx tsx prisma/delete-account-by-email.ts ash@festify.so
//
//   # force — also wipes attribution / ledger / payouts for the affiliate
//   npx tsx prisma/delete-account-by-email.ts ash@festify.so --force
//
// Reads DATABASE_URL from .env. Set it to your prod connection string in
// the shell (or via a per-run override) before running against prod:
//   DATABASE_URL="postgresql://..." npx tsx prisma/delete-account-by-email.ts ash@festify.so

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  const force = args.includes("--force");

  if (!email) {
    console.error("Usage: tsx delete-account-by-email.ts <email> [--force]");
    process.exit(1);
  }

  console.log(`\nTarget email: ${email}`);
  console.log(`Force mode:   ${force ? "ON (will wipe financial history)" : "OFF"}\n`);

  // ── 1. Resolve User + Application rows ─────────────────────────────────
  const users = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, tenantId: true, email: true, affiliateId: true, fullName: true },
  });
  const applications = await prisma.application.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, tenantId: true, status: true, affiliateId: true, firstName: true },
  });

  if (users.length === 0 && applications.length === 0) {
    console.log("Nothing to delete — no User or Application rows match.\n");
    return;
  }

  console.log(`Found ${users.length} user(s):`);
  for (const u of users) console.log(`  user.id=${u.id} tenant=${u.tenantId} affiliateId=${u.affiliateId ?? "—"} name="${u.fullName ?? ""}"`);
  console.log(`Found ${applications.length} application(s):`);
  for (const a of applications) console.log(`  app.id=${a.id} tenant=${a.tenantId} status=${a.status} affiliateId=${a.affiliateId ?? "—"} firstName="${a.firstName}"`);

  const affiliateIds = Array.from(
    new Set([
      ...users.map((u) => u.affiliateId).filter((v): v is string => !!v),
      ...applications.map((a) => a.affiliateId).filter((v): v is string => !!v),
    ]),
  );
  const userIds = users.map((u) => u.id);
  const applicationIds = applications.map((a) => a.id);

  // ── 2. Safety: bail if there's financial history (unless --force) ──────
  let claims = 0;
  let ledgerEntries = 0;
  let payouts = 0;
  let sales = 0;
  if (affiliateIds.length > 0) {
    [claims, ledgerEntries, payouts, sales] = await Promise.all([
      prisma.attributionClaim.count({ where: { affiliateId: { in: affiliateIds } } }),
      prisma.commissionLedgerEntry.count({ where: { affiliateId: { in: affiliateIds } } }),
      prisma.payout.count({ where: { affiliateId: { in: affiliateIds } } }),
      prisma.sale.count({ where: { attributionClaim: { is: { affiliateId: { in: affiliateIds } } } } }),
    ]);
  }
  console.log(`\nFinancial history: claims=${claims} ledgerEntries=${ledgerEntries} payouts=${payouts} attributedSales=${sales}`);

  if ((claims || ledgerEntries || payouts || sales) && !force) {
    console.error(
      `\nABORT: this account has financial history (claims=${claims}, ledger=${ledgerEntries}, payouts=${payouts}, sales=${sales}). ` +
      `Re-run with --force if you really want to delete those too.\n`,
    );
    process.exit(2);
  }

  // ── 3. Delete in dependency order, inside a transaction ────────────────
  const result = await prisma.$transaction(async (tx) => {
    const counts: Record<string, number> = {};

    if (affiliateIds.length > 0) {
      // Force-mode deletions (financial history). Order: dependents first.
      if (force) {
        // Sales linked to this affiliate's attribution claims need to lose
        // their claim FK before the claim itself can be deleted. Since Sale
        // hangs off AttributionClaim (1:1), we delete Sale rows first so
        // commission ledger entries (which FK to Sale) cascade out cleanly.
        const ledger = await tx.commissionLedgerEntry.deleteMany({
          where: { affiliateId: { in: affiliateIds } },
        });
        counts.commissionLedgerEntries = ledger.count;

        const claimRows = await tx.attributionClaim.findMany({
          where: { affiliateId: { in: affiliateIds } },
          select: { saleId: true, id: true },
        });
        const saleIds = claimRows.map((c) => c.saleId).filter((s): s is string => !!s);
        if (saleIds.length > 0) {
          const saleDel = await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
          counts.sales = saleDel.count;
        }

        const claimDel = await tx.attributionClaim.deleteMany({
          where: { affiliateId: { in: affiliateIds } },
        });
        counts.attributionClaims = claimDel.count;

        const payoutDel = await tx.payout.deleteMany({
          where: { affiliateId: { in: affiliateIds } },
        });
        counts.payouts = payoutDel.count;
      }

      const milestoneProg = await tx.affiliateMilestoneProgress.deleteMany({
        where: { affiliateId: { in: affiliateIds } },
      });
      counts.affiliateMilestoneProgress = milestoneProg.count;

      const campaignAff = await tx.campaignAffiliate.deleteMany({
        where: { affiliateId: { in: affiliateIds } },
      });
      counts.campaignAffiliates = campaignAff.count;
    }

    // Notifications addressed to this affiliate / user. recipientId is a
    // free-form string in the schema (affiliate id, user id, or "*"), so
    // we union both.
    const recipientIds = [...affiliateIds, ...userIds];
    if (recipientIds.length > 0) {
      const notif = await tx.notification.deleteMany({
        where: { recipientId: { in: recipientIds } },
      });
      counts.notifications = notif.count;
    }

    // MouAgreement cascades on Application delete, so we don't have to
    // hit it explicitly. Application → MouAgreement is onDelete: Cascade.
    if (applicationIds.length > 0) {
      const apps = await tx.application.deleteMany({
        where: { id: { in: applicationIds } },
      });
      counts.applications = apps.count;
    }

    // User cascades EmailVerification + PasswordResetToken.
    if (userIds.length > 0) {
      const usersDel = await tx.user.deleteMany({ where: { id: { in: userIds } } });
      counts.users = usersDel.count;
    }

    return counts;
  });

  console.log("\nDeleted:");
  for (const [k, v] of Object.entries(result)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log("\nDone. The email can now be used to re-apply.\n");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
