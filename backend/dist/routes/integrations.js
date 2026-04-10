"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
exports.integrationsRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/integrations/:provider/status
//
// Returns connection status for a provider:
//   - connected: bool
//   - webhookUrl: full URL to paste in provider's dashboard
//   - connectionId: x-provider-connection-id header value
//   - lastEventAt: timestamp of most recent webhook received
// ─────────────────────────────────────────────────────────────────────────────
router.get("/api/integrations/:provider/status", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const provider = String(req.params.provider).toLowerCase();
        const connection = await prisma_1.prisma.providerConnection.findFirst({
            where: { tenantId, provider, status: "active" },
            orderBy: { createdAt: "desc" },
        });
        const baseUrl = process.env.PUBLIC_API_URL ?? "http://localhost:3001";
        res.status(200).json({
            provider,
            connected: !!connection,
            webhookUrl: `${baseUrl}/api/webhooks/${provider}`,
            connectionId: connection?.connectionId ?? null,
            lastEventAt: connection?.lastEventAt?.toISOString() ?? null,
        });
    }
    catch (err) {
        console.error("[integrations] Status query failed:", err);
        res.status(500).json({ error: "Failed to load integration status" });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/integrations/:provider/connect
//
// Generates a fresh connectionId for the provider. The user copies it
// into their provider dashboard as the x-provider-connection-id header.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/api/integrations/:provider/connect", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const provider = String(req.params.provider).toLowerCase();
        // Generate a fresh connection ID — opaque token, not derivable
        const connectionId = `${provider}_${(0, crypto_1.randomBytes)(12).toString("hex")}`;
        const baseUrl = process.env.PUBLIC_API_URL ?? "http://localhost:3001";
        // Persist the connection so webhook ingestion can resolve tenant from it
        await prisma_1.prisma.providerConnection.create({
            data: {
                tenantId,
                provider,
                connectionId,
                status: "active",
            },
        });
        res.status(201).json({
            provider,
            connectionId,
            webhookUrl: `${baseUrl}/api/webhooks/${provider}`,
            headerName: "x-provider-connection-id",
            instructions: [
                `Go to your ${provider} dashboard`,
                "Open Webhooks settings",
                "Add a new webhook endpoint",
                `Paste the webhook URL: ${baseUrl}/api/webhooks/${provider}`,
                `Add custom header: x-provider-connection-id = ${connectionId}`,
                "Save and send a test event",
            ],
        });
    }
    catch (err) {
        console.error("[integrations] Connect failed:", err);
        res.status(500).json({ error: "Failed to create connection" });
    }
});
//# sourceMappingURL=integrations.js.map