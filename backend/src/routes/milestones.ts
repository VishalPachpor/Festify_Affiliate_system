import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";

const router = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

function asNonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

// Coerce and clamp a user-supplied integer to [min, max]. Non-numeric inputs
// fall back to `min`. Used for the tier rate (basis points) and complimentary
// ticket count, which must stay in sensible bounds regardless of what the
// admin UI sends.
function clampInt(v: unknown, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/milestones/tiers
//
// Returns the tenant's milestone tiers with the *current affiliate's* progress
// against each. The affiliate is identified by affiliateId from the JWT —
// falls back to tenant-wide totals when no affiliate context (so the
// organizer dashboard can render the same shape).
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/milestones/tiers", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const affiliateId = req.affiliateId ?? null;

    const milestones = await prisma.milestone.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });

    const progressByMilestone = new Map<string, { currentMinor: number; unlockedAt: Date | null }>();

    if (affiliateId) {
      // Compute attributed revenue live from Sales — the source of truth.
      // The AffiliateMilestoneProgress table is still useful for the
      // unlockedAt timestamp (so we know when each tier was first crossed),
      // but currentMinor must come from the live aggregate, otherwise stale
      // event-worker state shows the wrong percentage on the milestones page.
      const [agg, persistedProgress] = await Promise.all([
        prisma.sale.aggregate({
          where: {
            tenantId,
            attributionClaim: { affiliateId },
            status: { not: "refunded" },
          },
          _sum: { amountMinor: true },
        }),
        prisma.affiliateMilestoneProgress.findMany({
          where: { tenantId, affiliateId, milestoneId: { in: milestones.map((m) => m.id) } },
          select: { milestoneId: true, unlockedAt: true },
        }),
      ]);
      const totalRevenue = agg._sum.amountMinor ?? 0;
      const persistedUnlock = new Map(persistedProgress.map((p) => [p.milestoneId, p.unlockedAt]));
      for (const m of milestones) {
        const currentMinor = Math.min(totalRevenue, m.targetMinor);
        // Prefer the persisted unlockedAt (so the timestamp matches when it
        // first happened); fall back to a live computed unlock if the row
        // was never written (e.g. event-worker missed an emit).
        const unlockedAt =
          persistedUnlock.get(m.id) ?? (totalRevenue >= m.targetMinor ? new Date() : null);
        progressByMilestone.set(m.id, { currentMinor, unlockedAt });
      }
    } else {
      // Organizer view: report tenant-wide revenue total against each tier.
      const stats = await prisma.dashboardStats.findUnique({ where: { tenantId } });
      const totalRevenue = stats?.totalRevenue ?? 0;
      for (const m of milestones) {
        progressByMilestone.set(m.id, {
          currentMinor: Math.min(totalRevenue, m.targetMinor),
          unlockedAt: totalRevenue >= m.targetMinor ? new Date() : null,
        });
      }
    }

    const tiers = milestones.map((m) => {
      const p = progressByMilestone.get(m.id);
      const currentAmount = p?.currentMinor ?? 0;
      return {
        id: m.id,
        key: m.key,
        name: m.name,
        letter: m.letter,
        color: m.color,
        targetAmount: m.targetMinor,
        description: m.description,
        unlocked: !!p?.unlockedAt,
        currentAmount,
        currency: "USD",
        commissionRateBps: m.commissionRateBps,
        complimentaryTickets: m.complimentaryTickets,
      };
    });

    res.status(200).json({ tiers });
  } catch (err) {
    console.error("[milestones] Tiers query failed:", err);
    res.status(500).json({ error: "Failed to load milestones" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/milestones/progress
//
// Returns the current/next tier summary for the requesting affiliate.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/milestones/progress", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const affiliateId = req.affiliateId ?? null;

    const milestones = await prisma.milestone.findMany({
      where: { tenantId },
      orderBy: { sortOrder: "asc" },
    });

    if (milestones.length === 0) {
      res.status(200).json({
        currentRevenue: 0,
        currentTier: null,
        currentTierRateBps: 0,
        currentTierComplimentaryTickets: 0,
        nextTier: null,
        nextTierTarget: 0,
        nextTierRateBps: 0,
        currency: "USD",
      });
      return;
    }

    let totalRevenue = 0;
    if (affiliateId) {
      const agg = await prisma.sale.aggregate({
        where: {
          tenantId,
          attributionClaim: { affiliateId },
          status: { not: "refunded" },
        },
        _sum: { amountMinor: true },
      });
      totalRevenue = agg._sum.amountMinor ?? 0;
    } else {
      const stats = await prisma.dashboardStats.findUnique({ where: { tenantId } });
      totalRevenue = stats?.totalRevenue ?? 0;
    }

    // Find the highest unlocked tier and the next locked tier.
    let currentTier: typeof milestones[number] | null = null;
    let nextTier: typeof milestones[number] | null = null;
    for (const m of milestones) {
      if (totalRevenue >= m.targetMinor) {
        currentTier = m;
      } else {
        nextTier = m;
        break;
      }
    }

    res.status(200).json({
      currentRevenue: totalRevenue,
      currentTier: currentTier?.key ?? null,
      currentTierRateBps: currentTier?.commissionRateBps ?? 0,
      currentTierComplimentaryTickets: currentTier?.complimentaryTickets ?? 0,
      nextTier: nextTier?.key ?? null,
      nextTierTarget: nextTier?.targetMinor ?? 0,
      nextTierRateBps: nextTier?.commissionRateBps ?? 0,
      currency: "USD",
    });
  } catch (err) {
    console.error("[milestones] Progress query failed:", err);
    res.status(500).json({ error: "Failed to load milestone progress" });
  }
});

router.post("/api/milestones", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const tenantId = getTenantId(req);
    const name = asNonEmptyString(req.body?.name);
    const description = asNonEmptyString(req.body?.description);
    const targetAmount = Number(req.body?.targetAmount ?? 0);
    const color = asNonEmptyString(req.body?.color) ?? "#E19A3E";
    const letter = (asNonEmptyString(req.body?.letter) ?? name?.charAt(0) ?? "M")
      .slice(0, 1)
      .toUpperCase();
    // Allow 0% (e.g. an entry tier that grants no commission) and 0 comp
    // tickets. The unlock-threshold enforces positive; rate + tickets don't.
    const commissionRateBps = clampInt(req.body?.commissionRateBps, 0, 10_000);
    const complimentaryTickets = clampInt(req.body?.complimentaryTickets, 0, 1_000);

    if (!name || !description || !Number.isFinite(targetAmount) || targetAmount < 0) {
      res.status(400).json({ error: "name, description, and a non-negative targetAmount are required" });
      return;
    }

    const count = await prisma.milestone.count({ where: { tenantId } });

    let keyBase = slugifyKey(name) || "milestone";
    let key = keyBase;
    let suffix = 2;
    while (await prisma.milestone.findFirst({ where: { tenantId, key } })) {
      key = `${keyBase}-${suffix}`;
      suffix += 1;
    }

    const milestone = await prisma.milestone.create({
      data: {
        tenantId,
        key,
        name,
        letter,
        color,
        description,
        targetMinor: targetAmount,
        commissionRateBps,
        complimentaryTickets,
        sortOrder: count,
      },
    });

    res.status(201).json({
      id: milestone.id,
      key: milestone.key,
      name: milestone.name,
      letter: milestone.letter,
      color: milestone.color,
      targetAmount: milestone.targetMinor,
      currentAmount: 0,
      currency: "USD",
      description: milestone.description,
      unlocked: false,
      commissionRateBps: milestone.commissionRateBps,
      complimentaryTickets: milestone.complimentaryTickets,
    });
  } catch (err) {
    console.error("[milestones] create failed:", err);
    res.status(500).json({ error: "Failed to create milestone" });
  }
});

router.patch("/api/milestones/:id", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const tenantId = getTenantId(req);
    const id = String(req.params.id);
    const targetAmount =
      req.body?.targetAmount === undefined ? null : Number(req.body.targetAmount);
    const name = asNonEmptyString(req.body?.name);
    const description = asNonEmptyString(req.body?.description);
    const commissionRateBps =
      req.body?.commissionRateBps === undefined ? null : clampInt(req.body.commissionRateBps, 0, 10_000);
    const complimentaryTickets =
      req.body?.complimentaryTickets === undefined ? null : clampInt(req.body.complimentaryTickets, 0, 1_000);

    // targetAmount=0 is allowed (the Starter entry tier). Reject only negative
    // or non-finite values — everything else goes through.
    if (
      targetAmount !== null &&
      (!Number.isFinite(targetAmount) || targetAmount < 0)
    ) {
      res.status(400).json({ error: "targetAmount must be a non-negative number" });
      return;
    }

    const existing = await prisma.milestone.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        ...(targetAmount !== null ? { targetMinor: targetAmount } : {}),
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
        ...(commissionRateBps !== null ? { commissionRateBps } : {}),
        ...(complimentaryTickets !== null ? { complimentaryTickets } : {}),
      },
    });

    res.status(200).json({
      id: updated.id,
      key: updated.key,
      name: updated.name,
      letter: updated.letter,
      color: updated.color,
      targetAmount: updated.targetMinor,
      currentAmount: 0,
      currency: "USD",
      description: updated.description,
      unlocked: false,
      commissionRateBps: updated.commissionRateBps,
      complimentaryTickets: updated.complimentaryTickets,
    });
  } catch (err) {
    console.error("[milestones] update failed:", err);
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

router.delete("/api/milestones/:id", async (req: Request, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const tenantId = getTenantId(req);
    const id = String(req.params.id);

    const existing = await prisma.milestone.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    const unlockedCount = await prisma.affiliateMilestoneProgress.count({
      where: { tenantId, milestoneId: id, unlockedAt: { not: null } },
    });

    if (unlockedCount > 0) {
      res.status(409).json({ error: "Only locked milestones can be deleted" });
      return;
    }

    await prisma.$transaction([
      prisma.affiliateMilestoneProgress.deleteMany({
        where: { tenantId, milestoneId: id },
      }),
      prisma.milestone.delete({ where: { id } }),
    ]);

    res.status(200).json({ success: true, id });
  } catch (err) {
    console.error("[milestones] delete failed:", err);
    res.status(500).json({ error: "Failed to delete milestone" });
  }
});

export { router as milestonesRouter };
