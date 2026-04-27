import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import { getEmbeddedSigningLink } from "../lib/boldsign";

const router = Router();

function frontendBaseUrl(): string {
  return (
    process.env.APP_URL?.trim() ||
    process.env.FRONTEND_APP_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function getAuthenticatedEmail(req: Request): Promise<string | null> {
  if (!req.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return user?.email?.toLowerCase() ?? null;
}

async function loadAuthorizedMou(req: Request, applicationId: string) {
  const tenantId = getTenantId(req);
  const application = await prisma.application.findFirst({
    where: { id: applicationId, tenantId },
    include: {
      mouAgreements: {
        where: { isCurrent: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!application) return null;
  if (req.userRole === "admin") return application;

  const authEmail = await getAuthenticatedEmail(req);
  const signerEmail = application.mouAgreements[0]?.signerEmail?.toLowerCase() ?? null;
  if (authEmail && (authEmail === application.email.toLowerCase() || authEmail === signerEmail)) {
    return application;
  }

  return null;
}

router.get("/api/mou/:applicationId/status", async (req: Request, res: Response) => {
  try {
    const application = await loadAuthorizedMou(req, String(req.params.applicationId));
    if (!application) {
      res.status(404).json({ error: "MOU not found" });
      return;
    }

    const mou = application.mouAgreements[0] ?? null;
    res.status(200).json({
      applicationId: application.id,
      applicationStatus: application.status,
      mouStatus: mou?.status ?? null,
      signedAt: mou?.signedAt?.toISOString() ?? null,
      signerEmail: mou?.signerEmail ?? null,
      signerName: mou?.signerName ?? null,
      hasDocument: !!mou?.providerDocumentId,
    });
  } catch (err) {
    console.error("[mou] status failed:", err);
    res.status(500).json({ error: "Failed to load MOU status" });
  }
});

router.post("/api/mou/:applicationId/signing-url", async (req: Request, res: Response) => {
  try {
    const application = await loadAuthorizedMou(req, String(req.params.applicationId));
    if (!application) {
      res.status(404).json({ error: "MOU not found" });
      return;
    }

    const mou = application.mouAgreements[0] ?? null;
    if (!mou || !mou.providerDocumentId) {
      res.status(409).json({ error: "MOU document is not ready yet" });
      return;
    }
    if (mou.status === "signed") {
      res.status(409).json({ error: "MOU is already signed" });
      return;
    }
    if (mou.status === "voided") {
      res.status(409).json({ error: "MOU has been voided" });
      return;
    }

    const signLink = await getEmbeddedSigningLink({
      documentId: mou.providerDocumentId,
      signerEmail: mou.signerEmail,
      redirectUrl: `${frontendBaseUrl()}/dashboard/application/mou?signed=1`,
    });

    res.status(200).json({ url: signLink });
  } catch (err) {
    console.error("[mou] signing URL failed:", err);
    res.status(500).json({ error: "Failed to create MOU signing link" });
  }
});

export { router as mouRouter };
