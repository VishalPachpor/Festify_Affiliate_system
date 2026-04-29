// Read-only inspection: dump every row tied to a given email so we know
// exactly what a deletion would touch. Run with:
//   npx tsx prisma/inspect-account-by-email.ts ash@festify.so
//
// No writes. Outputs a JSON-ish summary to stdout.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: tsx inspect-account-by-email.ts <email>");
    process.exit(1);
  }

  console.log(`\nInspecting account: ${email}\n`);

  const users = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      tenantId: true,
      email: true,
      fullName: true,
      role: true,
      affiliateId: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  console.log(`User rows (${users.length}):`);
  console.log(users);

  const applications = await prisma.application.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      tenantId: true,
      campaignId: true,
      status: true,
      affiliateId: true,
      requestedCode: true,
      createdAt: true,
    },
  });
  console.log(`\nApplication rows (${applications.length}):`);
  console.log(applications);

  const affiliateIds = Array.from(
    new Set([
      ...users.map((u) => u.affiliateId).filter((v): v is string => !!v),
      ...applications.map((a) => a.affiliateId).filter((v): v is string => !!v),
    ]),
  );

  const campaignAffiliates = affiliateIds.length
    ? await prisma.campaignAffiliate.findMany({
        where: { affiliateId: { in: affiliateIds } },
        select: { id: true, tenantId: true, campaignId: true, affiliateId: true, referralCode: true, createdAt: true },
      })
    : [];
  console.log(`\nCampaignAffiliate rows (${campaignAffiliates.length}):`);
  console.log(campaignAffiliates);

  const mouAgreements = applications.length
    ? await prisma.mouAgreement.findMany({
        where: { applicationId: { in: applications.map((a) => a.id) } },
        select: { id: true, applicationId: true, status: true, version: true, isCurrent: true, providerDocumentId: true },
      })
    : [];
  console.log(`\nMouAgreement rows (${mouAgreements.length}):`);
  console.log(mouAgreements);

  const ledger = affiliateIds.length
    ? await prisma.commissionLedgerEntry.count({ where: { affiliateId: { in: affiliateIds } } })
    : 0;
  const attribution = affiliateIds.length
    ? await prisma.attributionClaim.count({ where: { affiliateId: { in: affiliateIds } } })
    : 0;
  const payouts = affiliateIds.length
    ? await prisma.payout.count({ where: { affiliateId: { in: affiliateIds } } })
    : 0;
  const milestoneProgress = affiliateIds.length
    ? await prisma.affiliateMilestoneProgress.count({ where: { affiliateId: { in: affiliateIds } } })
    : 0;

  console.log(`\nLinked counts (by affiliateId):`);
  console.log({ commissionLedgerEntries: ledger, attributionClaims: attribution, payouts, milestoneProgress });

  const verifications = users.length
    ? await prisma.emailVerification.count({ where: { userId: { in: users.map((u) => u.id) } } })
    : 0;
  const resets = users.length
    ? await prisma.passwordResetToken.count({ where: { userId: { in: users.map((u) => u.id) } } })
    : 0;
  console.log(`\nAuxiliary auth rows: emailVerifications=${verifications}, passwordResetTokens=${resets}`);

  console.log("\nDone (read-only).\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
