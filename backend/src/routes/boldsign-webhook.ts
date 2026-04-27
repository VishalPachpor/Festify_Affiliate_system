import { Router, type Request, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { activateAffiliateFromMou } from "../lib/affiliate-activation";
import { verifyBoldSignWebhook } from "../lib/boldsign";

const router = Router();

type BoldSignWebhookPayload = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringAt(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function extractEvent(payload: BoldSignWebhookPayload): {
  eventId: string;
  eventType: string | null;
  documentId: string | null;
} {
  const event = asRecord(payload.event);
  const data = asRecord(payload.data);
  const document = asRecord(data.document ?? payload.document);
  const timestamp =
    stringAt(payload.timestamp) ??
    stringAt(event.timestamp) ??
    stringAt(payload.created) ??
    String(Date.now());

  const eventType =
    stringAt(payload.eventType) ??
    stringAt(payload.eventName) ??
    stringAt(event.eventType) ??
    stringAt(event.eventName) ??
    stringAt(payload.type);
  const documentId =
    stringAt(data.documentId) ??
    stringAt(data.documentID) ??
    stringAt(document.documentId) ??
    stringAt(document.documentID) ??
    stringAt(payload.documentId);
  const eventId =
    stringAt(payload.eventId) ??
    stringAt(payload.id) ??
    stringAt(event.eventId) ??
    stringAt(event.id) ??
    `${documentId ?? "unknown"}:${eventType ?? "unknown"}:${timestamp}`;

  return { eventId, eventType, documentId };
}

function mapMouStatus(eventType: string): "sent" | "viewed" | "signed" | "declined" | "expired" | "failed" | null {
  const normalized = eventType.trim().toLowerCase();
  if (normalized.includes("completed")) return "signed";
  if (normalized.includes("signed")) return "signed";
  if (normalized.includes("viewed")) return "viewed";
  if (normalized.includes("sent")) return "sent";
  if (normalized.includes("declined")) return "declined";
  if (normalized.includes("expired")) return "expired";
  if (normalized.includes("failed")) return "failed";
  return null;
}

function isCompletionEvent(eventType: string): boolean {
  const normalized = eventType.trim().toLowerCase();
  return normalized.includes("completed");
}

// BoldSign's webhook setup UI sends a verification POST before it reveals
// the signing secret to the operator — there is no way for our backend to
// have the secret at that point. When BOLDSIGN_WEBHOOK_SECRET is not yet
// configured we accept the ping with 200 so verification succeeds; once the
// operator fills the secret in DO, strict signature verification resumes on
// the next deploy. The setup window cannot be abused for activation because
// activateAffiliateFromMou requires a real MOU row keyed by providerDocumentId.
router.get("/api/webhooks/boldsign", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

router.post("/api/webhooks/boldsign", async (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? {}), "utf8");

  try {
    const configuredSecret = process.env.BOLDSIGN_WEBHOOK_SECRET?.trim();
    if (!configuredSecret) {
      console.warn(
        "[boldsign-webhook] BOLDSIGN_WEBHOOK_SECRET not configured — accepting unverified ping (initial setup only). Fill the secret in DO to enable strict verification.",
      );
      res.status(200).send("ok (unverified — secret not yet configured)");
      return;
    }

    const signature = req.header("x-boldsign-signature") ?? req.header("X-BoldSign-Signature") ?? undefined;
    if (!verifyBoldSignWebhook(rawBody, signature)) {
      console.warn("[boldsign-webhook] invalid signature", {
        hasSignature: !!signature,
        bodyBytes: rawBody.length,
      });
      res.status(401).send("invalid signature");
      return;
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as BoldSignWebhookPayload;
    const { eventId, eventType, documentId } = extractEvent(payload);

    if (!eventType || !documentId) {
      res.status(200).send("ignored");
      return;
    }

    const mouStatus = mapMouStatus(eventType);
    if (!mouStatus) {
      res.status(200).send("ignored");
      return;
    }

    console.log("[boldsign-webhook] received", { eventId, eventType, documentId });

    if (isCompletionEvent(eventType)) {
      await activateAffiliateFromMou({
        documentId,
        eventId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
      });
      res.status(200).send("ok");
      return;
    }

    await prisma.$transaction(async (tx) => {
      const mou = await tx.mouAgreement.findFirst({
        where: {
          provider: "boldsign",
          providerDocumentId: documentId,
          isCurrent: true,
        },
      });

      try {
        await tx.processedWebhookEvent.create({
          data: {
            provider: "boldsign",
            eventId,
            eventType,
            documentId,
            tenantId: mou?.tenantId ?? null,
            payload: payload as Prisma.InputJsonValue,
          },
        });
      } catch (err: unknown) {
        if (isPrismaUniqueConstraintError(err)) return;
        throw err;
      }

      if (!mou || mou.status === "signed" || mou.status === "voided") return;

      await tx.mouAgreement.update({
        where: { id: mou.id },
        data: {
          status: mouStatus,
          ...(mouStatus === "sent" ? { sentAt: new Date() } : {}),
          ...(mouStatus === "viewed" ? { viewedAt: new Date() } : {}),
          ...(mouStatus === "declined" ? { declinedAt: new Date() } : {}),
          ...(mouStatus === "expired" ? { expiredAt: new Date() } : {}),
          ...(mouStatus === "failed" ? { failedAt: new Date() } : {}),
        },
      });
    });

    res.status(200).send("ok");
  } catch (err) {
    console.error("[boldsign-webhook] failed:", err);
    res.status(500).send("webhook failed");
  }
});

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

export { router as boldSignWebhookRouter };
