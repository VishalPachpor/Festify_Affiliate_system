import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import { sendAffiliateInviteEmail } from "../lib/email";
import { COMMISSION_CREDIT_TYPES } from "../lib/commission-types";

const router = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// Tier keys come from the rate-setting milestone ladder. Tiers unlock on
// attributed-revenue thresholds (GMV), NOT on commission earned, so this
// takes revenue — swapping in commission here will put every affiliate one
// tier behind where they should be.
function deriveTierKey(
  currentRevenueMinor: number,
  milestones: Array<{ key: string; targetMinor: number }>,
): string | null {
  let currentTier: string | null = null;
  for (const milestone of milestones) {
    if (currentRevenueMinor >= milestone.targetMinor) {
      currentTier = milestone.key.toLowerCase();
    } else {
      break;
    }
  }
  return currentTier;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/affiliates
//
// Returns paginated list of affiliates for the tenant.
// Matches frontend AffiliatesListResponse Zod schema.
//
// Affiliates are derived from CampaignAffiliate records, aggregated with
// their sale/commission data.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/affiliates/me
//
// Returns the current affiliate's profile + referral link + earnings.
// Identifies the affiliate via affiliateId from the JWT token.
// Used by the affiliate-side dashboard to render the referral card and KPIs.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/affiliates/me", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    let affiliateId = req.affiliateId;
    if (!affiliateId && req.userId) {
      const user = await prisma.user.findFirst({
        where: { id: req.userId, tenantId },
        select: { affiliateId: true },
      });
      affiliateId = user?.affiliateId ?? null;
    }

    if (!affiliateId) {
      res.status(403).json({ error: "Not an affiliate account" });
      return;
    }

    const membership = await prisma.campaignAffiliate.findFirst({
      where: { tenantId, affiliateId },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      res.status(404).json({ error: `Unknown affiliate: ${affiliateId}` });
      return;
    }

    // Aggregate this affiliate's commission + sales from the ledger.
    const [commissionAgg, attributionCount, sales] = await Promise.all([
      prisma.commissionLedgerEntry.aggregate({
        where: { tenantId, affiliateId, type: { in: COMMISSION_CREDIT_TYPES } },
        _sum: { amountMinor: true },
      }),
      prisma.attributionClaim.count({ where: { tenantId, affiliateId } }),
      prisma.sale.findMany({
        where: { tenantId, attributionClaim: { affiliateId } },
        select: { amountMinor: true },
      }),
    ]);

    const totalRevenueMinor = sales.reduce((acc, s) => acc + s.amountMinor, 0);
    const totalCommissionMinor = commissionAgg._sum.amountMinor ?? 0;

    // Build a copy-friendly referral URL. Uses ?coupon= for Luma compatibility.
    const referralBase = process.env.REFERRAL_LINK_BASE ?? "https://event.festify.io";
    const referralUrl = `${referralBase}?coupon=${encodeURIComponent(membership.referralCode)}`;

    res.status(200).json({
      affiliateId: membership.affiliateId,
      name: membership.affiliateId,
      referralCode: membership.referralCode,
      referralUrl,
      campaignId: membership.campaignId,
      totalRevenueMinor,
      totalCommissionMinor,
      totalSales: attributionCount,
      currency: "USD",
      joinedAt: membership.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[affiliates] /me query failed:", err);
    res.status(500).json({ error: "Failed to load affiliate profile" });
  }
});

router.get("/api/affiliates", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
    const search = req.query.search as string | undefined;
    const statusFilter = req.query.status as string | undefined; // "approved" | "pending" | "rejected"
    const tierFilter = String(req.query.tier ?? "").trim().toLowerCase() || undefined;

    // When filtering by pending/rejected, query Application table instead.
    // When filtering by approved or no filter, include CampaignAffiliate (approved)
    // plus applications for pending/rejected rows.

    type AffiliateRow = {
      id: string;
      name: string;
      email: string;
      status: "approved" | "pending" | "rejected";
      totalRevenue: number;
      totalCommission: number;
      totalSales: number;
      currency: string;
      joinedAt: string;
      referralCode: string | null;
      tier: string | null;
      requestedCode?: string | null;
    };

    const rows: AffiliateRow[] = [];
    const milestones = await prisma.milestone.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
      select: { key: true, targetMinor: true },
    });

    // ── Approved affiliates (from CampaignAffiliate) ──────────────────────
    if (!statusFilter || statusFilter === "approved") {
      const affWhere: Record<string, unknown> = { tenantId };
      // Search is applied post-fetch since name/email come from joined tables.
      // For referral code search, filter at DB level.
      if (search) {
        affWhere.OR = [
          { affiliateId: { contains: search, mode: "insensitive" } },
          { referralCode: { contains: search, mode: "insensitive" } },
        ];
      }

      const affiliateRecords = await prisma.campaignAffiliate.findMany({
        where: affWhere,
        orderBy: { createdAt: "desc" },
      });

      const affiliateIds = affiliateRecords.map((a) => a.affiliateId);

      const [commissionGroups, attributionGroups, sales] = await Promise.all([
        prisma.commissionLedgerEntry.groupBy({
          by: ["affiliateId"],
          where: { tenantId, affiliateId: { in: affiliateIds }, type: { in: COMMISSION_CREDIT_TYPES } },
          _sum: { amountMinor: true },
        }),
        prisma.attributionClaim.groupBy({
          by: ["affiliateId"],
          where: { tenantId, affiliateId: { in: affiliateIds } },
          _count: { _all: true },
        }),
        prisma.sale.findMany({
          where: { tenantId, attributionClaim: { affiliateId: { in: affiliateIds } } },
          select: { amountMinor: true, attributionClaim: { select: { affiliateId: true } } },
        }),
      ]);

      const commissionByAff = new Map(commissionGroups.map((g) => [g.affiliateId, g._sum.amountMinor ?? 0]));
      const countByAff = new Map(attributionGroups.map((g) => [g.affiliateId, g._count._all]));
      const revenueByAff = new Map<string, number>();
      for (const s of sales) {
        const id = s.attributionClaim?.affiliateId;
        if (!id) continue;
        revenueByAff.set(id, (revenueByAff.get(id) ?? 0) + s.amountMinor);
      }

      // Resolve real names/emails from User table (linked by affiliateId)
      // and Application table (linked by affiliateId on approval).
      const [users, applications] = await Promise.all([
        prisma.user.findMany({
          where: { tenantId, affiliateId: { in: affiliateIds } },
          select: { affiliateId: true, fullName: true, email: true },
        }),
        prisma.application.findMany({
          where: { tenantId, affiliateId: { in: affiliateIds }, status: "approved" },
          select: { affiliateId: true, firstName: true, email: true },
        }),
      ]);

      const userByAffId = new Map(users.map((u) => [u.affiliateId, u]));
      const appByAffId = new Map(applications.map((a) => [a.affiliateId, a]));

      for (const aff of affiliateRecords) {
        const user = userByAffId.get(aff.affiliateId);
        const app = appByAffId.get(aff.affiliateId);
        const name = user?.fullName ?? app?.firstName ?? aff.affiliateId;
        const email = user?.email ?? app?.email ?? `${aff.affiliateId}@affiliate.local`;

        rows.push({
          id: aff.affiliateId,
          name,
          email,
          status: "approved",
          totalRevenue: revenueByAff.get(aff.affiliateId) ?? 0,
          totalCommission: commissionByAff.get(aff.affiliateId) ?? 0,
          totalSales: countByAff.get(aff.affiliateId) ?? 0,
          currency: "USD",
          joinedAt: aff.createdAt.toISOString(),
          referralCode: aff.referralCode,
          tier: deriveTierKey(revenueByAff.get(aff.affiliateId) ?? 0, milestones),
        });
      }
    }

    // ── Pending / rejected applications ───────────────────────────────────
    if (!statusFilter || statusFilter === "pending" || statusFilter === "rejected") {
      const appStatuses = statusFilter
        ? [statusFilter as "pending" | "rejected"]
        : ["pending" as const, "rejected" as const];

      const appWhere: Record<string, unknown> = {
        tenantId,
        status: { in: appStatuses },
      };
      if (search) {
        appWhere.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const applications = await prisma.application.findMany({
        where: appWhere,
        orderBy: { createdAt: "desc" },
      });

      for (const app of applications) {
        rows.push({
          id: app.id,
          name: app.firstName,
          email: app.email,
          status: app.status as "pending" | "rejected",
          totalRevenue: 0,
          totalCommission: 0,
          totalSales: 0,
          currency: "USD",
          joinedAt: app.createdAt.toISOString(),
          referralCode: null,
          tier: null,
          requestedCode: app.requestedCode,
        });
      }
    }

    const filteredRows = tierFilter
      ? rows.filter((row) => (row.tier ?? "none") === tierFilter)
      : rows;

    // Sort: pending first, then by date descending
    filteredRows.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
    });

    // Paginate
    const total = filteredRows.length;
    const paged = filteredRows.slice((page - 1) * pageSize, page * pageSize);

    res.status(200).json({
      affiliates: paged,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    console.error("[affiliates] List query failed:", err);
    res.status(500).json({ error: "Failed to load affiliates list" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/affiliates/:id/financials
//
// Per-affiliate money snapshot for the admin drawer:
//   - totalEarnedMinor  = Σ earned ledger entries
//   - pendingMinor      = Σ entries whose sale isn't paid yet
//   - paidMinor         = Σ entries whose sale is paid
//   - payouts           = this affiliate's payouts (id, amount, status, dates)
//
// The split matches the Sale.status lifecycle that the Commissions table uses,
// so numbers stay consistent across screens.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/affiliates/:id/financials", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const affiliateId = String(req.params.id);

    const [entries, payouts] = await Promise.all([
      prisma.commissionLedgerEntry.findMany({
        where: { tenantId, affiliateId, type: { in: COMMISSION_CREDIT_TYPES } },
        select: {
          amountMinor: true,
          sale: { select: { status: true } },
        },
      }),
      prisma.payout.findMany({
        where: { tenantId, affiliateId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          createdAt: true,
          processedAt: true,
        },
      }),
    ]);

    let totalEarnedMinor = 0;
    let pendingMinor = 0;
    let paidMinor = 0;
    for (const e of entries) {
      totalEarnedMinor += e.amountMinor;
      if (e.sale?.status === "paid") {
        paidMinor += e.amountMinor;
      } else {
        pendingMinor += e.amountMinor;
      }
    }

    res.status(200).json({
      affiliateId,
      currency: "USD",
      totalEarnedMinor,
      pendingMinor,
      paidMinor,
      payouts: payouts.map((p) => ({
        id: p.id,
        amountMinor: p.amountMinor,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        processedAt: p.processedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    console.error("[affiliates] Financials query failed:", err);
    res.status(500).json({ error: "Failed to load affiliate financials" });
  }
});

router.post("/api/affiliates/invite", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const tenantId = getTenantId(req);
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const campaignId = String(req.body?.campaignId ?? "").trim() || null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Valid email required" });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    const campaign = campaignId
      ? await prisma.campaign.findFirst({
          where: { id: campaignId, tenantId },
          select: { id: true, name: true, slug: true },
        })
      : await prisma.campaign.findFirst({
          where: { tenantId },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, slug: true },
        });

    if (!campaign) {
      res.status(404).json({ error: "No campaign available for invite" });
      return;
    }

    const appBaseUrl =
      process.env.APP_URL?.trim() ||
      process.env.FRONTEND_APP_URL?.trim() ||
      "http://localhost:3000";
    const applyPath = campaign.slug ? `/apply/${campaign.slug}` : "/sign-up";
    const applyUrl = `${appBaseUrl.replace(/\/$/, "")}${applyPath}`;

    await sendAffiliateInviteEmail({
      to: email,
      campaignName: campaign.name,
      organizerName: tenant.name,
      applyUrl,
    });

    res.status(200).json({ success: true, email, applyUrl });
  } catch (err) {
    console.error("[affiliates] invite failed:", err);
    res.status(500).json({ error: "Failed to send affiliate invite" });
  }
});

export { router as affiliatesRouter };
