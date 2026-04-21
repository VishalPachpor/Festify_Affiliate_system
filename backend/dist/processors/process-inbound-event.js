"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryableError = void 0;
exports.processInboundEvent = processInboundEvent;
exports.pickTierRateBps = pickTierRateBps;
exports.normalizeReferralCode = normalizeReferralCode;
const prisma_1 = require("../lib/prisma");
const cache_1 = require("../lib/cache");
const event_bus_1 = require("../lib/event-bus");
/**
 * Thrown when an event can't be processed yet but should be retried later.
 * Causes status to remain "pending" instead of moving to "failed".
 */
class RetryableError extends Error {
    constructor(message) {
        super(message);
        this.name = "RetryableError";
    }
}
exports.RetryableError = RetryableError;
// ─────────────────────────────────────────────────────────────────────────────
// Event Processor
//
// Picks up InboundEvent records with status "pending" and processes them
// through the Golden Flow: Sale → Attribution → Commission.
//
// NON-NEGOTIABLE RULES:
//   1. All writes happen inside a single $transaction — atomic or nothing.
//   2. Idempotent at every layer — safe under retries and race conditions.
//   3. Sale is the anchor — duplicate sale (P2002) means "already processed".
//   4. Attribution is optional — sale can exist without a matched affiliate.
//   5. Commission rate comes from the affiliate's current Milestone tier
//      (rate-setting ladder — Starter / Riser / Pro / Elite). Campaign.
//      commissionRateBps is the fallback when no tiers are defined for the
//      tenant. When a sale crosses a tier threshold, ALL prior attributed
//      sales for that affiliate are repriced by emitting tier_adjustment
//      ledger entries (positive delta → next payout cycle).
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Process a single pending InboundEvent by its ID.
 * Called by a worker loop or directly after ingestion.
 *
 * Status transitions are OUTSIDE the business transaction:
 *   success → "processed" + processedAt
 *   failure → "failed" + lastError
 * This guarantees the event always leaves "pending" state.
 */
async function processInboundEvent(eventId) {
    const event = await prisma_1.prisma.inboundEvent.findUnique({
        where: { id: eventId },
    });
    if (!event) {
        console.warn(`[processor] Event not found: ${eventId}`);
        return;
    }
    // Guard: don't re-process already completed events.
    if (event.status === "processed") {
        return;
    }
    try {
        await executeGoldenFlow(event);
        // ── Status update: SUCCESS ──────────────────────────────────────────
        // Outside the transaction so it always commits even if the transaction
        // succeeded but a later retry picks this up again.
        await prisma_1.prisma.inboundEvent.update({
            where: { id: eventId },
            data: { status: "processed", processedAt: new Date(), lastError: null },
        });
        // Invalidate all summary caches for this tenant after new sale/commission
        await (0, cache_1.invalidateCache)(event.tenantId, "dashboard:summary", "sales:summary", "attribution:summary", "payouts:summary");
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // ── Retryable: keep "pending" so the worker picks it up later ──────
        if (err instanceof RetryableError) {
            console.warn(`[processor] Retryable error for event ${eventId}: ${message}`);
            await prisma_1.prisma.inboundEvent.update({
                where: { id: eventId },
                data: { lastError: message },
            });
            return;
        }
        console.error(`[processor] Failed event ${eventId}:`, message);
        // ── Status update: FAILURE ──────────────────────────────────────────
        // Outside the transaction. The business transaction rolled back,
        // but we still record why it failed for debugging and retry systems.
        await prisma_1.prisma.inboundEvent.update({
            where: { id: eventId },
            data: { status: "failed", lastError: message },
        });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Golden Flow: Sale → Attribution (optional) → Commission (if attributed)
// ─────────────────────────────────────────────────────────────────────────────
async function executeGoldenFlow(event) {
    const rawPayload = event.payload;
    const tenantId = event.tenantId;
    // ── 1. Extract from normalized payload (adapter output) or legacy flat format
    const normalized = rawPayload.normalized;
    const payload = normalized ?? rawPayload;
    const externalOrderId = extractString(payload, "externalOrderId") ?? extractString(payload, "orderId");
    if (!externalOrderId) {
        throw new Error("Payload missing required field: orderId / externalOrderId");
    }
    const currency = extractString(payload, "currency");
    if (!currency) {
        throw new Error("Payload missing required field: currency");
    }
    let amountMinor = extractInt(payload, "amountMinor");
    if (amountMinor === null) {
        const amountFloat = extractNumber(payload, "amount");
        if (amountFloat !== null) {
            amountMinor = Math.round(amountFloat * 100);
        }
    }
    if (amountMinor === null || amountMinor < 0) {
        throw new Error("Payload missing required field: amountMinor or amount");
    }
    // Safe integer guard — JavaScript can lose precision above 2^53.
    // Cap at $1B to leave headroom for commission multiplication.
    const MAX_AMOUNT_MINOR = 100_000_000_000; // $1B in cents
    if (amountMinor > MAX_AMOUNT_MINOR) {
        throw new Error(`Amount exceeds max allowed: ${amountMinor}`);
    }
    const referralCodeRaw = extractString(payload, "referralCode") ?? null;
    // CampaignAffiliate.referralCode is stored UPPERCASE + alphanumeric-only by the
    // admin approval UI. Luma's webhook echoes whatever the buyer typed at checkout,
    // which can be any case. Normalize before the unique lookup so `vishal2020` and
    // `VISHAL2020` both resolve to the same affiliate. Sale.referralCode keeps the
    // raw trimmed value so it's still debuggable.
    const referralCodeLookup = normalizeReferralCode(referralCodeRaw);
    // ── 2. Resolve campaign from DB ─────────────────────────────────────────
    // Prefer campaignId from payload if provided; otherwise fall back to
    // the first campaign for this tenant (MVP behavior).
    const payloadCampaignId = extractString(payload, "campaignId") ?? extractString(payload, "campaign_id");
    const campaign = payloadCampaignId
        ? await prisma_1.prisma.campaign.findFirst({ where: { id: payloadCampaignId, tenantId } })
        : await prisma_1.prisma.campaign.findFirst({ where: { tenantId } });
    if (!campaign) {
        // Custom error type so the worker can mark this as "pending" (retryable)
        // instead of "failed" (terminal). New campaigns may be created later.
        throw new RetryableError(`No campaign found for tenant: ${tenantId}`);
    }
    // ── 3. Resolve affiliate (optional, before transaction) ─────────────────
    let affiliate = null;
    if (referralCodeLookup) {
        affiliate = await prisma_1.prisma.campaignAffiliate.findUnique({
            where: { tenantId_referralCode: { tenantId, referralCode: referralCodeLookup } },
            select: { affiliateId: true },
        });
    }
    // ── 3a. Load tier ladder for this tenant (if any) ────────────────────────
    // Used inside the transaction to price the new sale AND to detect whether
    // this sale crossed a tier threshold — in which case every prior sale
    // needs a delta adjustment written to the ledger.
    const tiers = await prisma_1.prisma.milestone.findMany({
        where: { tenantId },
        orderBy: { targetMinor: "asc" },
    });
    // ── 4. Transaction: Sale + Attribution + Commission ─────────────────────
    // All writes are atomic. If any step fails, everything rolls back.
    //
    // Sale creation uses try/catch for P2002 (unique constraint on
    // tenantId + externalOrderId). This is the TRUE idempotency guard —
    // no pre-check findUnique that can race under concurrent workers.
    // If the sale already exists, we know this event was already processed
    // and we return cleanly.
    // Track what happened inside the transaction for event emission
    const txResult = await prisma_1.prisma.$transaction(async (tx) => {
        // STEP 1: Create Sale (the anchor)
        let sale;
        try {
            sale = await tx.sale.create({
                data: {
                    tenantId,
                    campaignId: campaign.id,
                    externalOrderId,
                    amountMinor,
                    currency,
                    referralCode: referralCodeRaw,
                },
            });
        }
        catch (err) {
            if (isPrismaUniqueConstraintError(err)) {
                console.warn(`[processor] Sale already exists: ${externalOrderId}, skipping`);
                return null; // duplicate — already processed
            }
            throw err;
        }
        let commissionAmount = 0;
        let tierAdjustmentTotal = 0;
        // STEP 2: Attribution (only if affiliate was resolved)
        if (affiliate) {
            await tx.attributionClaim.create({
                data: {
                    tenantId,
                    saleId: sale.id,
                    affiliateId: affiliate.affiliateId,
                    method: "referral_code",
                },
            });
            // STEP 3: Commission (only if attributed)
            //
            // Rate comes from the affiliate's *current* tier after this sale lands.
            // That's the correct rate for this sale itself — and if it crosses
            // a tier threshold, the retro delta below catches prior sales up.
            const priorRevenue = await sumPriorAttributedRevenue(tx, tenantId, affiliate.affiliateId, sale.id);
            const newRevenue = priorRevenue + sale.amountMinor;
            const effectiveRateBps = pickTierRateBps(tiers, newRevenue, campaign.commissionRateBps);
            // Round to nearest cent. Math.round ensures fair commission calculation.
            // Math.floor would systematically underpay affiliates.
            commissionAmount = Math.round((sale.amountMinor * effectiveRateBps) / 10_000);
            if (commissionAmount > 0) {
                await tx.commissionLedgerEntry.create({
                    data: {
                        tenantId,
                        saleId: sale.id,
                        affiliateId: affiliate.affiliateId,
                        amountMinor: commissionAmount,
                        currency: sale.currency,
                        type: "earned",
                    },
                });
            }
            // STEP 4: Retroactive tier adjustment
            //
            // If this sale pushed the affiliate into a tier with a higher rate
            // than the tier they were in *before* this sale, every prior sale
            // is entitled to the delta. We emit one tier_adjustment ledger
            // entry per prior sale, payoutId=null — they ride the next payout.
            //
            // Paid-out sales still get their delta: the catch-up rides the next
            // payout cycle and the ledger stays append-only (no rewriting of
            // settled entries). Pending (approved) payouts stay at their
            // approve-time total; the delta bundles separately.
            if (tiers.length > 0) {
                const priorRateBps = pickTierRateBps(tiers, priorRevenue, campaign.commissionRateBps);
                if (effectiveRateBps > priorRateBps) {
                    tierAdjustmentTotal = await emitRetroTierAdjustments(tx, {
                        tenantId,
                        affiliateId: affiliate.affiliateId,
                        excludeSaleId: sale.id,
                        newRateBps: effectiveRateBps,
                        priorRateBps,
                    });
                }
            }
        }
        return {
            saleAmount: sale.amountMinor,
            attributed: !!affiliate,
            commissionAmount,
            tierAdjustmentTotal,
        };
    });
    // ── Emit domain events AFTER transaction commits ──────────────────────
    // Events drive aggregate table updates. Only fire if transaction succeeded
    // and actually created a new sale (not a duplicate skip).
    if (txResult) {
        await (0, event_bus_1.emitEvent)("order.created", {
            tenantId,
            amountMinor: txResult.saleAmount,
            attributed: txResult.attributed,
        });
        if (affiliate) {
            const totalEarned = txResult.commissionAmount + txResult.tierAdjustmentTotal;
            if (totalEarned > 0) {
                await (0, event_bus_1.emitEvent)("commission.earned", {
                    tenantId,
                    amountMinor: totalEarned,
                });
            }
            // ── Milestone progression ─────────────────────────────────────────
            // Recompute the affiliate's attributed-revenue total and emit one
            // milestone.progressed event per defined tier. The handler is
            // idempotent + only flips unlockedAt on the locked → unlocked edge,
            // so re-emitting tiers the affiliate already passed is safe.
            if (txResult.commissionAmount > 0 || txResult.tierAdjustmentTotal > 0) {
                await emitMilestoneProgress(tenantId, affiliate.affiliateId);
            }
        }
    }
}
/**
 * Recomputes the affiliate's attributed-revenue total against every
 * milestone tier defined for the tenant and emits one
 * `milestone.progressed` event per tier.
 *
 * Recomputing (vs incrementing) keeps the source of truth in the Sale +
 * AttributionClaim tables and means out-of-order events / replays don't
 * drift the per-affiliate progress.
 */
async function emitMilestoneProgress(tenantId, affiliateId) {
    const [milestones, revenueAgg] = await Promise.all([
        prisma_1.prisma.milestone.findMany({
            where: { tenantId },
            orderBy: { sortOrder: "asc" },
        }),
        prisma_1.prisma.sale.aggregate({
            where: { tenantId, attributionClaim: { affiliateId } },
            _sum: { amountMinor: true },
        }),
    ]);
    if (milestones.length === 0)
        return;
    const totalRevenue = revenueAgg._sum.amountMinor ?? 0;
    for (const milestone of milestones) {
        const currentMinor = Math.min(totalRevenue, milestone.targetMinor);
        const unlocked = totalRevenue >= milestone.targetMinor;
        await (0, event_bus_1.emitEvent)("milestone.progressed", {
            tenantId,
            affiliateId,
            milestoneId: milestone.id,
            milestoneKey: milestone.key,
            currentMinor,
            targetMinor: milestone.targetMinor,
            unlocked,
        });
    }
}
// ─── Tier helpers ────────────────────────────────────────────────────────────
/**
 * Pick the rate that applies at a given cumulative attributed revenue.
 *
 * Walks tiers in ascending targetMinor order and returns the highest tier
 * whose threshold has been crossed. Falls back to the campaign rate if
 * no tiers are defined for the tenant or the affiliate hasn't crossed
 * even the entry tier's threshold (defensive — entry tier should be 0).
 *
 * Exported for unit testing. Accepts a loose tier shape so the test can
 * construct fixtures without pulling the full Prisma `Milestone` type.
 */
function pickTierRateBps(tiers, cumulativeRevenueMinor, campaignRateBps) {
    if (tiers.length === 0)
        return campaignRateBps;
    // Sort defensively in case the caller didn't pre-sort. Costs nothing on
    // the hot path (tier ladders are ~4 items) and makes the unit test
    // boundary self-contained.
    const sorted = [...tiers].sort((a, b) => a.targetMinor - b.targetMinor);
    let rate = campaignRateBps;
    let matched = false;
    for (const tier of sorted) {
        if (cumulativeRevenueMinor >= tier.targetMinor) {
            rate = tier.commissionRateBps;
            matched = true;
        }
        else {
            break;
        }
    }
    return matched ? rate : campaignRateBps;
}
/**
 * Sums the affiliate's prior attributed sale revenue (all attributed sales
 * except the one currently being processed). Used to work out what tier the
 * affiliate was in *before* this sale landed, so we can detect a tier crossing.
 */
async function sumPriorAttributedRevenue(tx, tenantId, affiliateId, excludeSaleId) {
    const agg = await tx.sale.aggregate({
        where: {
            tenantId,
            attributionClaim: { affiliateId },
            id: { not: excludeSaleId },
        },
        _sum: { amountMinor: true },
    });
    return agg._sum.amountMinor ?? 0;
}
/**
 * Emits one `tier_adjustment` ledger entry per prior attributed sale,
 * equal to the delta between the new and old rate applied to that sale's
 * revenue. Returns the total delta written (cents).
 *
 * Entries are written with payoutId=null so they bundle into the next
 * payout cycle — paid-out sales get their catch-up without rewriting
 * settled ledger rows.
 */
async function emitRetroTierAdjustments(tx, args) {
    const { tenantId, affiliateId, excludeSaleId, newRateBps, priorRateBps } = args;
    const priorSales = await tx.sale.findMany({
        where: {
            tenantId,
            attributionClaim: { affiliateId },
            id: { not: excludeSaleId },
        },
        select: { id: true, amountMinor: true, currency: true },
    });
    let total = 0;
    for (const sale of priorSales) {
        const newCommission = Math.round((sale.amountMinor * newRateBps) / 10_000);
        const priorCommission = Math.round((sale.amountMinor * priorRateBps) / 10_000);
        const delta = newCommission - priorCommission;
        if (delta <= 0)
            continue;
        await tx.commissionLedgerEntry.create({
            data: {
                tenantId,
                saleId: sale.id,
                affiliateId,
                amountMinor: delta,
                currency: sale.currency,
                type: "tier_adjustment",
            },
        });
        total += delta;
    }
    return total;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function isPrismaUniqueConstraintError(err) {
    return (typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "P2002");
}
function extractString(obj, key) {
    const val = obj[key];
    if (typeof val === "string" && val.trim().length > 0)
        return val.trim();
    return null;
}
/**
 * Canonicalise a referral code for affiliate lookups.
 *
 * Admin approval forces codes to UPPER + alphanumeric-only on the way in
 * (see frontend/src/app/admin/affiliates/page.tsx), so CampaignAffiliate
 * rows are always stored in that shape. Webhooks echo whatever the buyer
 * typed at checkout (Luma is case-insensitive on coupons), so lookups must
 * normalize identically — otherwise a `vishal2020` sale misses
 * `VISHAL2020` and attribution silently fails.
 */
function normalizeReferralCode(raw) {
    if (raw == null)
        return null;
    const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned.length > 0 ? cleaned : null;
}
function extractInt(obj, key) {
    const val = obj[key];
    if (typeof val === "number" && Number.isInteger(val))
        return val;
    if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        if (!Number.isNaN(parsed))
            return parsed;
    }
    return null;
}
function extractNumber(obj, key) {
    const val = obj[key];
    if (typeof val === "number" && Number.isFinite(val))
        return val;
    if (typeof val === "string") {
        const parsed = parseFloat(val);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return null;
}
//# sourceMappingURL=process-inbound-event.js.map