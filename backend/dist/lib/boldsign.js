"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBoldSignTemplateId = getBoldSignTemplateId;
exports.createMouFromTemplate = createMouFromTemplate;
exports.getEmbeddedSigningLink = getEmbeddedSigningLink;
exports.remindBoldSignDocument = remindBoldSignDocument;
exports.voidBoldSignDocument = voidBoldSignDocument;
exports.verifyBoldSignWebhook = verifyBoldSignWebhook;
const crypto_1 = require("crypto");
const DEFAULT_BASE_URL = "https://api.boldsign.com";
function requiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
}
function getBaseUrl() {
    return (process.env.BOLDSIGN_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
}
function getApiKey() {
    return requiredEnv("BOLDSIGN_API_KEY");
}
function getBoldSignTemplateId() {
    return requiredEnv("BOLDSIGN_MOU_TEMPLATE_ID");
}
function shouldDisableBoldSignEmails() {
    return process.env.BOLDSIGN_DISABLE_EMAILS?.trim().toLowerCase() === "true";
}
async function createMouFromTemplate(args) {
    const templateId = args.templateId ?? getBoldSignTemplateId();
    const response = await fetch(`${getBaseUrl()}/v1/template/send?templateId=${encodeURIComponent(templateId)}`, {
        method: "POST",
        headers: {
            "X-API-KEY": getApiKey(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            Title: `Affiliate MOU - ${args.signerName}`,
            Message: "Please review and sign your affiliate MOU to activate your account.",
            DisableEmails: shouldDisableBoldSignEmails(),
            Roles: [
                {
                    RoleIndex: 1,
                    SignerName: args.signerName,
                    SignerEmail: args.signerEmail,
                    SignerType: "Signer",
                },
            ],
            Labels: [`application-${args.applicationId}`, `tenant-${args.tenantId}`],
        }),
    });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`BoldSign MOU create failed (${response.status})${details ? `: ${details}` : ""}`);
    }
    const data = await response.json();
    const documentId = String(data.documentId ?? data.documentID ?? "").trim();
    if (!documentId) {
        throw new Error("BoldSign MOU create response did not include documentId");
    }
    return {
        documentId,
        status: typeof data.status === "string" ? data.status : null,
    };
}
async function getEmbeddedSigningLink(args) {
    const url = new URL(`${getBaseUrl()}/v1/document/getEmbeddedSignLink`);
    url.searchParams.set("documentId", args.documentId);
    url.searchParams.set("signerEmail", args.signerEmail);
    url.searchParams.set("redirectUrl", args.redirectUrl);
    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "X-API-KEY": getApiKey(),
        },
    });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`BoldSign embedded signing link failed (${response.status})${details ? `: ${details}` : ""}`);
    }
    const data = await response.json();
    const link = String(data.signLink ?? data.signingUrl ?? data.url ?? "").trim();
    if (!link) {
        throw new Error("BoldSign embedded signing response did not include signLink");
    }
    return link;
}
async function remindBoldSignDocument(documentId) {
    const url = new URL(`${getBaseUrl()}/v1/document/remind`);
    url.searchParams.set("documentId", documentId);
    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "X-API-KEY": getApiKey(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ Message: "Please sign your affiliate MOU to activate access." }),
    });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`BoldSign reminder failed (${response.status})${details ? `: ${details}` : ""}`);
    }
}
async function voidBoldSignDocument(documentId, reason) {
    const url = new URL(`${getBaseUrl()}/v1/document/revoke`);
    url.searchParams.set("documentId", documentId);
    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "X-API-KEY": getApiKey(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ Message: reason }),
    });
    if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`BoldSign revoke failed (${response.status})${details ? `: ${details}` : ""}`);
    }
}
function parseSignatureHeader(header) {
    const parts = header.split(",").map((part) => part.trim()).filter(Boolean);
    const values = new Map();
    for (const part of parts) {
        const [key, ...rest] = part.split("=");
        if (!key || rest.length === 0)
            continue;
        values.set(key.trim().toLowerCase(), rest.join("=").trim());
    }
    const timestamp = values.get("t");
    const signatures = Array.from(values.entries())
        .filter(([key]) => key.startsWith("s"))
        .map(([, value]) => value)
        .filter(Boolean);
    if (!timestamp || signatures.length === 0)
        return null;
    return { timestamp, signatures };
}
function safeCompareHex(a, b) {
    const first = Buffer.from(a, "hex");
    const second = Buffer.from(b, "hex");
    if (first.length === 0 || first.length !== second.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(first, second);
}
function verifyBoldSignWebhook(rawBody, signatureHeader) {
    if (!signatureHeader)
        return false;
    const parsed = parseSignatureHeader(signatureHeader);
    if (!parsed)
        return false;
    const timestampMs = Number(parsed.timestamp) * 1000;
    if (!Number.isFinite(timestampMs))
        return false;
    const toleranceMs = 5 * 60 * 1000;
    if (Math.abs(Date.now() - timestampMs) > toleranceMs)
        return false;
    const signedPayload = Buffer.concat([
        Buffer.from(`${parsed.timestamp}.`, "utf8"),
        rawBody,
    ]);
    const computed = (0, crypto_1.createHmac)("sha256", requiredEnv("BOLDSIGN_WEBHOOK_SECRET"))
        .update(signedPayload)
        .digest("hex");
    return parsed.signatures.some((signature) => safeCompareHex(computed, signature));
}
//# sourceMappingURL=boldsign.js.map