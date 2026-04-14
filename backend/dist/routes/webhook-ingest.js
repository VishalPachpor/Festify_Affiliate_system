"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookIngestRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const registry_1 = require("../integrations/core/registry");
const router = (0, express_1.Router)();
exports.webhookIngestRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/:provider
//
// Ingestion-only webhook endpoint with provider adapter pattern.
//
// Flow:
//   1. Look up adapter for the provider
//   2. Verify webhook signature
//   3. Extract event ID via adapter
//   4. Persist raw event (InboundEvent) with normalized metadata
//   5. Return 200 immediately — processing happens async
//
// No business logic here. No sales, attribution, or commission.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/webhooks/:provider", async (req, res) => {
    try {
        const rawProvider = req.params.provider;
        if (!rawProvider || typeof rawProvider !== "string") {
            res.status(400).json({ error: "Missing provider in route" });
            return;
        }
        const provider = rawProvider.toLowerCase().trim();
        // ── 1. Look up adapter ──────────────────────────────────────────────
        const adapter = (0, registry_1.getAdapter)(provider);
        if (!adapter) {
            res.status(400).json({ error: `Unknown provider: ${provider}` });
            return;
        }
        const body = req.body;
        if (!body || typeof body !== "object") {
            res.status(400).json({ error: "Invalid or missing JSON body" });
            return;
        }
        // Raw body buffer captured by express.json verify callback — used for
        // HMAC signature verification so adapters hash the original wire bytes.
        const rawBody = req.rawBody;
        if (!rawBody) {
            res.status(400).json({ error: "Could not capture raw request body" });
            return;
        }
        // ── 2. Verify signature ─────────────────────────────────────────────
        if (!adapter.verifySignature(req.headers, body, rawBody)) {
            console.warn(`[webhook-ingest] Signature verification failed for ${provider}`);
            res.status(401).json({ error: "Invalid webhook signature" });
            return;
        }
        // ── 3. Extract identifiers ──────────────────────────────────────────
        // Prefer explicit header, but fall back to finding the single active
        // connection for this provider — Luma doesn't support custom headers.
        let providerConnectionId;
        const rawConnectionId = req.headers["x-provider-connection-id"];
        if (typeof rawConnectionId === "string" && rawConnectionId.trim()) {
            providerConnectionId = rawConnectionId.trim();
        }
        else {
            const fallback = await prisma_1.prisma.providerConnection.findFirst({
                where: { provider, status: "active" },
                select: { connectionId: true },
                orderBy: { createdAt: "desc" },
            });
            if (!fallback) {
                console.warn(`[webhook-ingest] No connection header and no active ${provider} connection found`);
                res.status(400).json({ error: "No active connection for this provider" });
                return;
            }
            providerConnectionId = fallback.connectionId;
        }
        const externalEventId = adapter.extractEventId(body).trim();
        if (!externalEventId) {
            res.status(400).json({ error: "Could not extract event ID from payload" });
            return;
        }
        // ── 4. Tenant resolution ────────────────────────────────────────────
        const tenantId = await resolveTenantId(provider, providerConnectionId);
        if (!tenantId) {
            console.warn(`[webhook-ingest] Unknown connection: ${provider}/${providerConnectionId}`);
            res.status(404).json({ error: "Unknown provider connection" });
            return;
        }
        // ── 5. Build replayKey ──────────────────────────────────────────────
        const replayKey = `${provider}_${providerConnectionId}_${externalEventId}`;
        // ── 6. Normalize payload for metadata (but store raw) ───────────────
        let normalized;
        try {
            normalized = adapter.normalize(body);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown normalization error";
            console.warn(`[webhook-ingest] Normalization failed: ${msg}`);
            res.status(400).json({ error: `Payload normalization failed: ${msg}` });
            return;
        }
        // ── 7. Persist raw event ────────────────────────────────────────────
        // Store the ENTIRE raw payload plus normalized metadata.
        // The processor reads the normalized fields; raw payload is for audit.
        try {
            await prisma_1.prisma.inboundEvent.create({
                data: {
                    tenantId,
                    provider,
                    providerConnectionId,
                    externalEventId,
                    replayKey,
                    payload: {
                        raw: body,
                        normalized: {
                            externalOrderId: normalized.externalOrderId,
                            type: normalized.type,
                            amountMinor: normalized.amountMinor,
                            currency: normalized.currency,
                            referralCode: normalized.referralCode,
                            campaignId: normalized.campaignId,
                            occurredAt: normalized.occurredAt,
                        },
                    },
                    status: "pending",
                },
            });
        }
        catch (err) {
            if (isPrismaUniqueConstraintError(err)) {
                console.warn("[webhook-ingest] Duplicate webhook ignored", { replayKey });
                res.status(200).json({ received: true, duplicate: true });
                return;
            }
            throw err;
        }
        // ── 8. Acknowledge ──────────────────────────────────────────────────
        res.status(200).json({ received: true });
    }
    catch (err) {
        console.error("[webhook-ingest] Unexpected error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Resolve tenantId from a provider connection ID via DB lookup.
 * Returns null if no active connection exists.
 */
async function resolveTenantId(provider, providerConnectionId) {
    const connection = await prisma_1.prisma.providerConnection.findUnique({
        where: { provider_connectionId: { provider, connectionId: providerConnectionId } },
        select: { tenantId: true, status: true },
    });
    if (!connection || connection.status !== "active")
        return null;
    // Update lastEventAt for connection health tracking (fire-and-forget)
    prisma_1.prisma.providerConnection.update({
        where: { provider_connectionId: { provider, connectionId: providerConnectionId } },
        data: { lastEventAt: new Date() },
    }).catch((err) => console.warn("[webhook-ingest] Failed to update lastEventAt:", err));
    return connection.tenantId;
}
function isPrismaUniqueConstraintError(err) {
    return (typeof err === "object" &&
        err !== null &&
        "code" in err &&
        err.code === "P2002");
}
//# sourceMappingURL=webhook-ingest.js.map