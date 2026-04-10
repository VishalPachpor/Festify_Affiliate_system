import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import { randomBytes } from "crypto";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/integrations/:provider/status
//
// Returns connection status for a provider:
//   - connected: bool
//   - webhookUrl: full URL to paste in provider's dashboard
//   - connectionId: x-provider-connection-id header value
//   - lastEventAt: timestamp of most recent webhook received
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/integrations/:provider/status", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const provider = String(req.params.provider).toLowerCase();

    const connection = await prisma.providerConnection.findFirst({
      where: { tenantId, provider, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.PUBLIC_API_URL ?? "http://localhost:3001";

    // Get event stats for this connection
    let eventCount = 0;
    let lastEventType: string | null = null;
    let lastEventAt: string | null = connection?.lastEventAt?.toISOString() ?? null;

    if (connection) {
      const [count, lastEvent] = await Promise.all([
        prisma.inboundEvent.count({
          where: { tenantId, provider, providerConnectionId: connection.connectionId },
        }),
        prisma.inboundEvent.findFirst({
          where: { tenantId, provider, providerConnectionId: connection.connectionId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, payload: true },
        }),
      ]);

      eventCount = count;
      if (lastEvent) {
        lastEventAt = lastEvent.createdAt.toISOString();
        // Extract event type from payload
        const payload = lastEvent.payload as Record<string, unknown> | null;
        const raw = (payload as Record<string, unknown>)?.raw as Record<string, unknown> | undefined;
        lastEventType = (raw?.event as string) ?? null;
      }
    }

    res.status(200).json({
      provider,
      connected: !!connection,
      webhookUrl: `${baseUrl}/api/webhooks/${provider}`,
      connectionId: connection?.connectionId ?? null,
      lastEventAt,
      eventCount,
      lastEventType,
    });
  } catch (err) {
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

router.post("/api/integrations/:provider/connect", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const provider = String(req.params.provider).toLowerCase();

    // Generate a fresh connection ID — opaque token, not derivable
    const connectionId = `${provider}_${randomBytes(12).toString("hex")}`;
    const baseUrl = process.env.PUBLIC_API_URL ?? "http://localhost:3001";

    // Persist the connection so webhook ingestion can resolve tenant from it
    await prisma.providerConnection.create({
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
  } catch (err) {
    console.error("[integrations] Connect failed:", err);
    res.status(500).json({ error: "Failed to create connection" });
  }
});

export { router as integrationsRouter };
