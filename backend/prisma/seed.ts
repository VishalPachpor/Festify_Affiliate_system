import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Demo seed
//
// Creates a deterministic tenant + campaign + one approved affiliate +
// milestone tiers so the entire PRD flow has data to render against:
//
//   • Public application page    → /apply/demo resolves to this campaign
//   • Organizer review page      → already-approved affiliate visible
//   • Affiliate dashboard        → ReferralCard + milestone progress render
//   • Webhook → Golden Flow      → updates this affiliate's commission/tiers
//
// Run with: pnpm db:seed   (or)   npx prisma db seed
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_ID = "tenant_demo";
const TENANT_SLUG = "demo";
const CAMPAIGN_ID = "campaign_demo";
const CAMPAIGN_SLUG = "demo";
const AFFILIATE_ID = "affiliate_alex";
const REFERRAL_CODE = "REF-ALEX";

const MILESTONES = [
  { key: "bronze",   name: "Bronze",   letter: "B", color: "#E19A3E", description: "Event VIP pass upgrade",            targetMinor: 100_00,    sortOrder: 1 },
  { key: "silver",   name: "Silver",   letter: "S", color: "#DADCE3", description: "Backstage / speaker lounge access", targetMinor: 500_00,    sortOrder: 2 },
  { key: "gold",     name: "Gold",     letter: "G", color: "#FFD620", description: "Speaking / panel opportunity",      targetMinor: 1_000_00,  sortOrder: 3 },
  { key: "platinum", name: "Platinum", letter: "P", color: "#E2E4EB", description: "Revenue share increase to 15%",     targetMinor: 2_500_00,  sortOrder: 4 },
];

async function main() {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: { slug: TENANT_SLUG, name: "Demo Tenant" },
    create: {
      id: TENANT_ID,
      slug: TENANT_SLUG,
      name: "Demo Tenant",
      defaultCurrency: "USD",
    },
  });

  await prisma.campaign.upsert({
    where: { id: CAMPAIGN_ID },
    update: { slug: CAMPAIGN_SLUG, name: "Demo Campaign", commissionRateBps: 1000 },
    create: {
      id: CAMPAIGN_ID,
      tenantId: TENANT_ID,
      slug: CAMPAIGN_SLUG,
      name: "Demo Campaign",
      commissionRateBps: 1000, // 10%
    },
  });

  await prisma.campaignAffiliate.upsert({
    where: { tenantId_referralCode: { tenantId: TENANT_ID, referralCode: REFERRAL_CODE } },
    update: {},
    create: {
      tenantId: TENANT_ID,
      campaignId: CAMPAIGN_ID,
      affiliateId: AFFILIATE_ID,
      referralCode: REFERRAL_CODE,
    },
  });

  // Milestone tiers — keep targets low so the demo webhook actually unlocks
  // Bronze on the first sale ($100 ticket × 10% = $10 commission, well past
  // Bronze's $100 ticket / Silver at $500 / etc).
  for (const m of MILESTONES) {
    await prisma.milestone.upsert({
      where: { tenantId_key: { tenantId: TENANT_ID, key: m.key } },
      update: {
        name: m.name,
        letter: m.letter,
        color: m.color,
        description: m.description,
        targetMinor: m.targetMinor,
        sortOrder: m.sortOrder,
      },
      create: {
        tenantId: TENANT_ID,
        key: m.key,
        name: m.name,
        letter: m.letter,
        color: m.color,
        description: m.description,
        targetMinor: m.targetMinor,
        sortOrder: m.sortOrder,
      },
    });
  }

  // ── Demo users ─────────────────────────────────────────────────────────
  // Two pre-verified accounts so the login flow can be demoed without
  // first running through signup → email verification.
  const passwordHash = await bcrypt.hash("Password123!", 10);

  await prisma.user.upsert({
    where: { email: "admin@festify.io" },
    update: {
      tenantId: TENANT_ID,
      role: "admin",
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "admin@festify.io",
      fullName: "Demo Admin",
      passwordHash,
      role: "admin",
      tenantId: TENANT_ID,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "alex@festify.io" },
    update: {
      tenantId: TENANT_ID,
      role: "affiliate",
      affiliateId: AFFILIATE_ID,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: "alex@festify.io",
      fullName: "Alex Demo",
      passwordHash,
      role: "affiliate",
      tenantId: TENANT_ID,
      affiliateId: AFFILIATE_ID,
      emailVerifiedAt: new Date(),
    },
  });

  // ── Demo marketing materials (Figma node 60:1975) ───────────────────
  const DEMO_ASSETS = [
    { id: "asset_hero_banner",     type: "banner" as const, title: "TOKEN2049 Hero Banner",       sizeBytes: 2_516_582, mimeType: "image/png"        },
    { id: "asset_email_invite",    type: "email"  as const, title: "Email Invite Template",       sizeBytes: 159_744,   mimeType: "text/html"        },
    { id: "asset_social_square",   type: "social" as const, title: "Social Media Square",         sizeBytes: 1_887_436, mimeType: "image/png"        },
    { id: "asset_promo_copy",      type: "copy"   as const, title: "Promo Copy Snippets",         sizeBytes: 24_576,    mimeType: "text/plain"       },
    { id: "asset_best_practices",  type: "guide"  as const, title: "Affiliate Best Practices",    sizeBytes: 1_258_291, mimeType: "application/pdf"  },
    { id: "asset_ig_story",        type: "social" as const, title: "Instagram Story Template",    sizeBytes: 1_003_520, mimeType: "image/png"        },
  ];

  for (const a of DEMO_ASSETS) {
    await prisma.asset.upsert({
      where: { id: a.id },
      update: { title: a.title, type: a.type, sizeBytes: a.sizeBytes, mimeType: a.mimeType, visible: true },
      create: {
        id: a.id,
        tenantId: TENANT_ID,
        type: a.type,
        title: a.title,
        fileUrl: `#demo-${a.id}`,
        sizeBytes: a.sizeBytes,
        mimeType: a.mimeType,
        visible: true,
      },
    });
  }

  console.log(
    `[seed] tenant=${TENANT_ID} campaign=${CAMPAIGN_ID}(slug=${CAMPAIGN_SLUG}) affiliate=${AFFILIATE_ID} referral=${REFERRAL_CODE} milestones=${MILESTONES.length} assets=${DEMO_ASSETS.length}`,
  );
  console.log(`[seed] users: admin@festify.io / alex@festify.io  (password: Password123!)`);
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
