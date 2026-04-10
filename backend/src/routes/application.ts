import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Affiliate-facing application status. Used by the gated /dashboard layout to
// decide whether the affiliate is approved and can see protected pages.
//
// Resolution order:
//   1. affiliateId from JWT → look up CampaignAffiliate, return "approved"
//   2. ?email query param   → look up Application by email, return its status
//   3. otherwise            → "not_applied"
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/application/status", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (req.affiliateId) {
      const membership = await prisma.campaignAffiliate.findFirst({
        where: { tenantId, affiliateId: req.affiliateId },
      });
      if (membership) {
        res.status(200).json({ status: "approved" });
        return;
      }
    }

    const email = String(req.query.email ?? "").trim().toLowerCase();
    if (email) {
      const application = await prisma.application.findFirst({
        where: { tenantId, email },
        orderBy: { createdAt: "desc" },
      });
      if (application) {
        res.status(200).json({ status: application.status });
        return;
      }
    }

    res.status(200).json({ status: "not_applied" });
  } catch (err) {
    console.error("[application] Status query failed:", err);
    res.status(500).json({ error: "Failed to load application status" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/application/submit
//
// Authenticated submission path used by the gated dashboard form. Mirrors the
// public submission flow but uses tenant context from auth instead of an
// event slug. Picks the first campaign for the tenant if none specified.
// ─────────────────────────────────────────────────────────────────────────────

type SubmitBody = {
  campaignId?: unknown;
  firstName?: unknown;
  email?: unknown;
  socialProfiles?: unknown;
  audienceSize?: unknown;
  experience?: unknown;
  fitReason?: unknown;
  requestedCode?: unknown;
};

function asNonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

router.post("/api/application/submit", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const body = (req.body ?? {}) as SubmitBody;

    const firstName = asNonEmptyString(body.firstName);
    const email = asNonEmptyString(body.email)?.toLowerCase();
    const fitReason = asNonEmptyString(body.fitReason);

    if (!firstName || !email || !fitReason) {
      res.status(400).json({
        error: "Missing required fields: firstName, email, fitReason",
      });
      return;
    }

    const campaignId = asNonEmptyString(body.campaignId);
    const campaign = campaignId
      ? await prisma.campaign.findFirst({ where: { id: campaignId, tenantId } })
      : await prisma.campaign.findFirst({ where: { tenantId } });

    if (!campaign) {
      res.status(404).json({ error: "No campaign available for this tenant" });
      return;
    }

    const existing = await prisma.application.findUnique({
      where: {
        tenantId_campaignId_email: {
          tenantId,
          campaignId: campaign.id,
          email,
        },
      },
    });
    if (existing) {
      res.status(200).json({ success: true, duplicate: true, id: existing.id });
      return;
    }

    const rawCode = asNonEmptyString(body.requestedCode);
    const requestedCode = rawCode
      ? rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) || null
      : null;

    const application = await prisma.application.create({
      data: {
        tenantId,
        campaignId: campaign.id,
        firstName,
        email,
        socialProfiles: asNonEmptyString(body.socialProfiles),
        audienceSize: asNonEmptyString(body.audienceSize),
        experience: asNonEmptyString(body.experience),
        fitReason,
        requestedCode,
        status: "pending",
      },
    });

    res.status(201).json({ success: true, duplicate: false, id: application.id });
  } catch (err) {
    console.error("[application] Submit failed:", err);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

export { router as applicationRouter };
