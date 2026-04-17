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
const AFFILIATE_ID = "affiliate_alex";
const REFERRAL_CODE = "REF-ALEX";

// Figma 60:2705 target values: $1,000 → $5,000 → $10,000 → $25,000
const MILESTONES = [
  { key: "bronze",   name: "Bronze",   letter: "B", color: "#CD7F32", description: "Event VIP pass upgrade",            targetMinor: 1_000_00,   sortOrder: 1 },
  { key: "silver",   name: "Silver",   letter: "S", color: "#C0C0C0", description: "Backstage / speaker lounge access", targetMinor: 5_000_00,   sortOrder: 2 },
  { key: "gold",     name: "Gold",     letter: "G", color: "#FFD700", description: "Speaking / panel opportunity",      targetMinor: 10_000_00,  sortOrder: 3 },
  { key: "platinum", name: "Platinum", letter: "P", color: "#E5E4E2", description: "Revenue share increase to 15%",     targetMinor: 25_000_00,  sortOrder: 4 },
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

  // ── Additional demo affiliates for realistic admin dashboard ──────────
  const EXTRA_AFFILIATES = [
    { id: "affiliate_sarah",  code: "SARAH2049",  name: "Sarah Chen",     email: "sarah@festify.io"  },
    { id: "affiliate_marcus", code: "MARCUS26",    name: "Marcus Johnson", email: "marcus@festify.io" },
    { id: "affiliate_priya",  code: "PRIYA-SG",    name: "Priya Sharma",   email: "priya@festify.io"  },
    { id: "affiliate_james",  code: "JAMES-VIP",   name: "James Wilson",   email: "james@festify.io"  },
  ];

  for (const aff of EXTRA_AFFILIATES) {
    await prisma.campaignAffiliate.upsert({
      where: { tenantId_referralCode: { tenantId: TENANT_ID, referralCode: aff.code } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        campaignId: CAMPAIGN_ID,
        affiliateId: aff.id,
        referralCode: aff.code,
      },
    });
    await prisma.user.upsert({
      where: { email: aff.email },
      update: { tenantId: TENANT_ID, role: "affiliate", affiliateId: aff.id, emailVerifiedAt: new Date() },
      create: {
        email: aff.email,
        fullName: aff.name,
        passwordHash,
        role: "affiliate",
        tenantId: TENANT_ID,
        affiliateId: aff.id,
        emailVerifiedAt: new Date(),
      },
    });
  }

  // ── Demo sales for chart + table data ─────────────────────────────────
  // Commission = 10% of amount. Milestone thresholds (commission):
  //   Bronze=$1K, Silver=$5K, Gold=$10K, Platinum=$25K
  //
  // Target tier distribution:
  //   Sarah:  $435K revenue → $43.5K commission → PLATINUM
  //   Priya:  $180K revenue → $18K commission   → GOLD
  //   James:  $108K revenue → $10.8K commission  → GOLD
  //   Marcus: $65.5K revenue → $6.55K commission → SILVER
  //   Alex:   $25.5K revenue → $2.55K commission → BRONZE
  const DEMO_SALES = [
    { extId: "sale_demo_1",  amount: 15000000, aff: "affiliate_sarah",  daysAgo: 1  },
    { extId: "sale_demo_2",  amount: 8000000,  aff: "affiliate_marcus", daysAgo: 1  },
    { extId: "sale_demo_3",  amount: 4000000,  aff: AFFILIATE_ID,       daysAgo: 2  },
    { extId: "sale_demo_4",  amount: 6000000,  aff: "affiliate_priya",  daysAgo: 3  },
    { extId: "sale_demo_5",  amount: 8000000,  aff: "affiliate_james",  daysAgo: 4  },
    { extId: "sale_demo_6",  amount: 8000000,  aff: "affiliate_sarah",  daysAgo: 5  },
    { extId: "sale_demo_7",  amount: 5000000,  aff: "affiliate_marcus", daysAgo: 6  },
    { extId: "sale_demo_8",  amount: 12000000, aff: "affiliate_priya",  daysAgo: 7  },
    { extId: "sale_demo_9",  amount: 20500000, aff: "affiliate_sarah",  daysAgo: 2  },
    { extId: "sale_demo_10", amount: 2500000,  aff: "affiliate_marcus", daysAgo: 3  },
    { extId: "sale_demo_11", amount: 2800000,  aff: "affiliate_james",  daysAgo: 6  },
    { extId: "sale_demo_12", amount: 2050000,  aff: AFFILIATE_ID,       daysAgo: 4  },
  ];

  // Map sale age → commission lifecycle so the demo has all three UI states:
  //   ≥ 6 days old → paid (payout settled)
  //   3–5 days    → approved (payout scheduled, Mark Paid available)
  //   ≤ 2 days    → pending (needs Approve)
  function statusForDaysAgo(days: number): "pending" | "approved" | "paid" {
    if (days >= 6) return "paid";
    if (days >= 3) return "approved";
    return "pending";
  }

  for (const s of DEMO_SALES) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - s.daysAgo);
    saleDate.setHours(12, 0, 0, 0);

    const refCode = s.aff === AFFILIATE_ID ? REFERRAL_CODE :
      EXTRA_AFFILIATES.find(a => a.id === s.aff)?.code ?? "UNKNOWN";

    const existing = await prisma.sale.findUnique({
      where: { tenantId_externalOrderId: { tenantId: TENANT_ID, externalOrderId: s.extId } },
    });
    const commissionMinor = Math.round(s.amount * 0.1);
    const targetStatus = statusForDaysAgo(s.daysAgo);

    if (existing) {
      // Backfill status on prior seed runs (column added in a later schema migration).
      if (existing.status !== targetStatus) {
        await prisma.sale.update({
          where: { id: existing.id },
          data: { status: targetStatus },
        });
      }
    }

    if (!existing) {

      const sale = await prisma.sale.create({
        data: {
          tenantId: TENANT_ID,
          campaignId: CAMPAIGN_ID,
          externalOrderId: s.extId,
          amountMinor: s.amount,
          currency: "USD",
          referralCode: refCode,
          status: targetStatus,
          createdAt: saleDate,
        },
      });
      await prisma.attributionClaim.create({
        data: {
          tenantId: TENANT_ID,
          saleId: sale.id,
          affiliateId: s.aff,
          method: "referral_code",
        },
      });

      // For approved/paid statuses, create the corresponding payout record
      // and link the ledger entry to it. Matches what the UI actions would
      // produce after Approve / Mark Paid clicks.
      let payoutId: string | null = null;
      if (targetStatus !== "pending") {
        const payoutDate = new Date(saleDate);
        payoutDate.setDate(payoutDate.getDate() + 2); // processed 2 days after sale
        const payout = await prisma.payout.create({
          data: {
            tenantId: TENANT_ID,
            affiliateId: s.aff,
            amountMinor: commissionMinor,
            currency: "USD",
            status: targetStatus === "paid" ? "paid" : "pending",
            processedAt: targetStatus === "paid" ? payoutDate : null,
          },
        });
        payoutId = payout.id;
      }

      await prisma.commissionLedgerEntry.create({
        data: {
          tenantId: TENANT_ID,
          affiliateId: s.aff,
          saleId: sale.id,
          type: "earned",
          amountMinor: commissionMinor,
          currency: "USD",
          payoutId,
          createdAt: saleDate,
        },
      });
    }
  }

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
