import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

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

// Rate-setting tier ladder. targetMinor is the attributed revenue (GMV)
// threshold to reach the tier. commissionRateBps is applied to every sale
// the affiliate has accrued once they reach the tier (retroactive).
// complimentaryTickets is display-only — no redemption flow.
const MILESTONES = [
  { key: "starter", name: "Starter", letter: "S", color: "#9CA4B7", description: "Entry tier — your first sales earn 2.5%.",                                       targetMinor: 0,           commissionRateBps: 250,  complimentaryTickets: 0, sortOrder: 1 },
  { key: "riser",   name: "Riser",   letter: "R", color: "#5B8DEF", description: "Cross $10k in attributed revenue to unlock 5% on every sale, past and future.",   targetMinor: 10_000_00,   commissionRateBps: 500,  complimentaryTickets: 2, sortOrder: 2 },
  { key: "pro",     name: "Pro",     letter: "P", color: "#E19A3E", description: "Cross $50k to unlock 7.5% — prior sales are repriced at the new rate.",           targetMinor: 50_000_00,   commissionRateBps: 750,  complimentaryTickets: 4, sortOrder: 3 },
  { key: "elite",   name: "Elite",   letter: "E", color: "#FFD620", description: "Cross $100k to unlock 10% — the top of the ladder.",                              targetMinor: 100_000_00,  commissionRateBps: 1000, complimentaryTickets: 6, sortOrder: 4 },
];

const MILESTONE_KEYS = MILESTONES.map((m) => m.key);

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

  // ── Wipe legacy milestones ──────────────────────────────────────────────
  // The old Bronze/Silver/Gold/Platinum unlock-tier system was replaced by
  // the Starter/Riser/Pro/Elite rate-setting ladder. Drop any tenant rows
  // whose key isn't in the new ladder, along with their per-affiliate
  // progress, so the demo (and any prod tenant re-running this seed) boots
  // with a clean slate instead of mixing old + new tiers in the UI.
  const legacyMilestones = await prisma.milestone.findMany({
    where: { tenantId: TENANT_ID, key: { notIn: MILESTONE_KEYS } },
    select: { id: true },
  });
  if (legacyMilestones.length > 0) {
    const legacyIds = legacyMilestones.map((m) => m.id);
    await prisma.$transaction([
      prisma.affiliateMilestoneProgress.deleteMany({
        where: { tenantId: TENANT_ID, milestoneId: { in: legacyIds } },
      }),
      prisma.milestone.deleteMany({
        where: { tenantId: TENANT_ID, id: { in: legacyIds } },
      }),
    ]);
  }

  // ── Reseed the rate-setting tier ladder ─────────────────────────────────
  for (const m of MILESTONES) {
    await prisma.milestone.upsert({
      where: { tenantId_key: { tenantId: TENANT_ID, key: m.key } },
      update: {
        name: m.name,
        letter: m.letter,
        color: m.color,
        description: m.description,
        targetMinor: m.targetMinor,
        commissionRateBps: m.commissionRateBps,
        complimentaryTickets: m.complimentaryTickets,
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
        commissionRateBps: m.commissionRateBps,
        complimentaryTickets: m.complimentaryTickets,
        sortOrder: m.sortOrder,
      },
    });
  }

  // ── Admin user ─────────────────────────────────────────────────────────
  // One pre-verified admin account so the organizer login flow works out
  // of the box. Real affiliates sign up through the public application.
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

  // ── Demo marketing materials (Figma node 60:1975) ───────────────────
  //
  // Each demo asset is backed by a placeholder file written under
  // backend/uploads/<tenantId>/ — the same path Express serves via
  // /uploads/* (backend/src/server.ts). That keeps the Download anchor
  // on the Materials page functional without shipping binaries in git.
  const DEMO_ASSETS = [
    { id: "asset_hero_banner",     type: "banner" as const, title: "TOKEN2049 Hero Banner",    mimeType: "image/png",       ext: "png"  },
    { id: "asset_email_invite",    type: "email"  as const, title: "Email Invite Template",    mimeType: "text/html",       ext: "html" },
    { id: "asset_social_square",   type: "social" as const, title: "Social Media Square",      mimeType: "image/png",       ext: "png"  },
    { id: "asset_promo_copy",      type: "copy"   as const, title: "Promo Copy Snippets",      mimeType: "text/plain",      ext: "txt"  },
    { id: "asset_best_practices",  type: "guide"  as const, title: "Affiliate Best Practices", mimeType: "application/pdf", ext: "pdf"  },
    { id: "asset_ig_story",        type: "social" as const, title: "Instagram Story Template", mimeType: "image/png",       ext: "png"  },
  ];

  const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", TENANT_ID);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? "http://localhost:3001";

  // Minimal valid payloads per mime type. Keeps the download flow honest:
  //   • Plain-text placeholders masquerading as .png opened to broken images.
  //   • These bytes are the smallest self-contained valid file for each type,
  //     so the browser can actually open the download if the user clicks through.
  const ONE_PX_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const MINIMAL_PDF = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n" +
      "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000098 00000 n \n" +
      "trailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF\n",
    "utf8",
  );

  function placeholderBytes(mimeType: string, title: string): Buffer {
    if (mimeType === "image/png") return ONE_PX_PNG;
    if (mimeType === "application/pdf") return MINIMAL_PDF;
    if (mimeType === "text/html") {
      return Buffer.from(
        `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>` +
          `<body><h1>${title}</h1><p>Placeholder asset for the TOKEN2049 demo tenant.</p></body></html>`,
        "utf8",
      );
    }
    return Buffer.from(
      `${title}\n\nPlaceholder asset for the TOKEN2049 demo tenant.\nReplace via Admin → Materials.\n`,
      "utf8",
    );
  }

  for (const a of DEMO_ASSETS) {
    const filename = `${a.id}.${a.ext}`;
    const absPath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(absPath, placeholderBytes(a.mimeType, a.title));
    const sizeBytes = fs.statSync(absPath).size;
    const fileUrl = `${PUBLIC_API_URL}/uploads/${TENANT_ID}/${filename}`;

    await prisma.asset.upsert({
      where: { id: a.id },
      update: { title: a.title, type: a.type, sizeBytes, mimeType: a.mimeType, fileUrl, visible: true },
      create: {
        id: a.id,
        tenantId: TENANT_ID,
        type: a.type,
        title: a.title,
        fileUrl,
        sizeBytes,
        mimeType: a.mimeType,
        visible: true,
      },
    });
  }

  console.log(
    `[seed] tenant=${TENANT_ID} campaign=${CAMPAIGN_ID}(slug=${CAMPAIGN_SLUG}) milestones=${MILESTONES.length} assets=${DEMO_ASSETS.length}`,
  );
  console.log(`[seed] admin: admin@festify.io  (password: Password123!)`);
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
