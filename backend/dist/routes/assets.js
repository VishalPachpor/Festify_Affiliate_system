"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetsRouter = void 0;
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.assetsRouter = router;
// ─────────────────────────────────────────────────────────────────────────────
// Spaces (S3-compatible) — PRIVATE bucket.
//
// Upload flow:
//   1. POST /api/assets/upload-url  { filename, contentType, sizeBytes }
//        → { key, uploadUrl, fields }
//   2. Browser FormData-POSTs directly to uploadUrl (bytes bypass this process)
//   3. POST /api/assets/confirm     { key, title, type }
//        → creates DB row, returns serialized asset
//
// Read flow:
//   GET /api/assets/:id/view      → 302 presigned GET (inline, ~15 min TTL)
//   GET /api/assets/:id/download  → 302 presigned GET (attachment, 60s TTL)
//
// DB: `Asset.fileUrl` column stores the bare object key (e.g.
// `<tenantId>/<random>.png`). Clients never see the key — serializer emits
// viewUrl / downloadUrl backed by this service.
// ─────────────────────────────────────────────────────────────────────────────
const SPACES_REGION = process.env.SPACES_REGION ?? "sgp1";
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT ?? `https://${SPACES_REGION}.digitaloceanspaces.com`;
const SPACES_BUCKET = process.env.SPACES_BUCKET ?? "";
if (!SPACES_BUCKET || !process.env.SPACES_KEY || !process.env.SPACES_SECRET) {
    console.warn("[assets] Spaces credentials/bucket not set — uploads will fail.");
}
const s3 = new client_s3_1.S3Client({
    region: SPACES_REGION,
    endpoint: SPACES_ENDPOINT,
    forcePathStyle: false,
    credentials: {
        accessKeyId: process.env.SPACES_KEY ?? "",
        secretAccessKey: process.env.SPACES_SECRET ?? "",
    },
});
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/"];
const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const VIEW_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60;
const VALID_TYPES = ["banner", "email", "social", "copy", "guide"];
function isAssetType(s) {
    return typeof s === "string" && VALID_TYPES.includes(s);
}
function isAllowedMime(mime) {
    return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function thumbnailBgFor(type, title) {
    if (title === "Instagram Story Template")
        return "story";
    return type;
}
function publicApiUrl() {
    return process.env.PUBLIC_API_URL ?? "http://localhost:3001";
}
function buildObjectKey(tenantId, originalFilename) {
    const random = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const ext = path_1.default.extname(originalFilename).toLowerCase();
    return `${tenantId}/${random}${ext}`;
}
function serializeAsset(asset, previewUrl = null) {
    const base = publicApiUrl();
    const viewUrl = `${base}/api/assets/${asset.id}/view`;
    return {
        id: asset.id,
        title: asset.title,
        type: asset.type,
        // Kept so existing callers that read `fileUrl` still render inline
        // previews against the view redirect. New code should use viewUrl.
        fileUrl: viewUrl,
        viewUrl,
        downloadUrl: `${base}/api/assets/${asset.id}/download`,
        // Direct presigned GET to Spaces, only emitted for image MIME types so
        // browsers can render <img> thumbnails without going through apiAuth
        // (which <img> tags can't satisfy — they send cookies only, no Bearer).
        // Null for non-images; the frontend falls back to the type-icon gradient.
        previewUrl,
        sizeBytes: asset.sizeBytes,
        sizeLabel: formatBytes(asset.sizeBytes),
        mimeType: asset.mimeType,
        visible: asset.visible,
        addedAt: asset.createdAt.toISOString(),
        thumbnailBg: thumbnailBgFor(asset.type, asset.title),
    };
}
async function signPreviewUrl(key, mimeType) {
    if (!mimeType.startsWith("image/"))
        return null;
    // Seeded demo assets (prisma/seed.ts) persist fileUrl as a local HTTP path
    // like `http://localhost:3001/uploads/<tenant>/foo.png`, not a real Spaces
    // object key. Signing such a value would produce a nonsense presigned URL
    // and waste an S3 round-trip at render time; skip it so the UI falls back
    // to the gradient + type icon.
    if (/^https?:\/\//i.test(key))
        return null;
    try {
        return await (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand({ Bucket: SPACES_BUCKET, Key: key }), { expiresIn: VIEW_URL_TTL_SECONDS });
    }
    catch (err) {
        console.warn("[assets] preview URL sign failed for key=%s: %s", key, err);
        return null;
    }
}
// ─── GET /api/assets ────────────────────────────────────────────────────────
router.get("/api/assets", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const typeQ = String(req.query.type ?? "").trim();
        const visibleQ = String(req.query.visible ?? "").trim().toLowerCase();
        const where = { tenantId };
        if (typeQ && isAssetType(typeQ))
            where.type = typeQ;
        if (visibleQ === "true")
            where.visible = true;
        const assets = await prisma_1.prisma.asset.findMany({ where, orderBy: { createdAt: "desc" } });
        const serialized = await Promise.all(assets.map(async (a) => serializeAsset(a, await signPreviewUrl(a.fileUrl, a.mimeType))));
        res.status(200).json({ assets: serialized, total: assets.length });
    }
    catch (err) {
        console.error("[assets] List query failed:", err);
        res.status(500).json({ error: "Failed to load assets" });
    }
});
// ─── POST /api/assets/upload-url ────────────────────────────────────────────
router.post("/api/assets/upload-url", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const filename = String(req.body?.filename ?? "").trim();
        const contentType = String(req.body?.contentType ?? "").trim();
        const sizeBytes = Number(req.body?.sizeBytes);
        if (!filename) {
            res.status(400).json({ error: "filename is required" });
            return;
        }
        if (!isAllowedMime(contentType)) {
            res.status(400).json({
                error: `Unsupported content type: ${contentType}. Allowed: image/*, application/pdf, text/*`,
            });
            return;
        }
        if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_BYTES) {
            res.status(400).json({ error: `sizeBytes must be between 1 and ${MAX_FILE_BYTES}` });
            return;
        }
        const key = buildObjectKey(tenantId, filename);
        const { url, fields } = await (0, s3_presigned_post_1.createPresignedPost)(s3, {
            Bucket: SPACES_BUCKET,
            Key: key,
            Expires: UPLOAD_URL_TTL_SECONDS,
            Conditions: [
                ["content-length-range", 1, MAX_FILE_BYTES],
                ["eq", "$Content-Type", contentType],
                ["eq", "$key", key],
            ],
            Fields: { "Content-Type": contentType },
        });
        res.status(200).json({ key, uploadUrl: url, fields });
    }
    catch (err) {
        console.error("[assets] Upload URL generation failed:", err);
        res.status(500).json({ error: "Failed to create upload URL" });
    }
});
// ─── POST /api/assets/confirm ───────────────────────────────────────────────
router.post("/api/assets/confirm", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const key = String(req.body?.key ?? "").trim();
        const title = String(req.body?.title ?? "").trim();
        const typeRaw = String(req.body?.type ?? "").trim().toLowerCase();
        // Tenant isolation: caller can only confirm keys they uploaded.
        if (!key.startsWith(`${tenantId}/`)) {
            res.status(400).json({ error: "key does not belong to this tenant" });
            return;
        }
        if (!title) {
            res.status(400).json({ error: "title is required" });
            return;
        }
        if (!isAssetType(typeRaw)) {
            res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` });
            return;
        }
        // Verify the object actually landed in Spaces before writing a DB row.
        let head;
        try {
            head = await s3.send(new client_s3_1.HeadObjectCommand({ Bucket: SPACES_BUCKET, Key: key }));
        }
        catch {
            res.status(404).json({ error: "Upload not found — complete the PUT before confirm" });
            return;
        }
        const mimeType = head.ContentType ?? "application/octet-stream";
        const sizeBytes = Number(head.ContentLength ?? 0);
        if (!isAllowedMime(mimeType)) {
            await s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: SPACES_BUCKET, Key: key })).catch(() => { });
            res.status(400).json({ error: `Uploaded object has disallowed content type: ${mimeType}` });
            return;
        }
        const asset = await prisma_1.prisma.asset.create({
            data: {
                tenantId,
                title,
                type: typeRaw,
                fileUrl: key,
                sizeBytes,
                mimeType,
            },
        });
        res.status(201).json(serializeAsset(asset, await signPreviewUrl(asset.fileUrl, asset.mimeType)));
    }
    catch (err) {
        console.error("[assets] Confirm failed:", err);
        res.status(500).json({ error: "Failed to confirm upload" });
    }
});
// ─── GET /api/assets/:id/view ───────────────────────────────────────────────
router.get("/api/assets/:id/view", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const id = String(req.params.id);
        const asset = await prisma_1.prisma.asset.findFirst({ where: { id, tenantId } });
        if (!asset) {
            res.status(404).json({ error: "Asset not found" });
            return;
        }
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand({ Bucket: SPACES_BUCKET, Key: asset.fileUrl }), { expiresIn: VIEW_URL_TTL_SECONDS });
        // Cache the redirect in the browser so bulk list views don't re-sign each
        // image. Shorter than the signed URL TTL so we don't serve stale URLs.
        res.setHeader("Cache-Control", `private, max-age=${VIEW_URL_TTL_SECONDS - 60}`);
        res.redirect(302, url);
    }
    catch (err) {
        console.error("[assets] View redirect failed:", err);
        res.status(500).json({ error: "Failed to generate view URL" });
    }
});
// ─── GET /api/assets/:id/download ───────────────────────────────────────────
router.get("/api/assets/:id/download", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const id = String(req.params.id);
        const asset = await prisma_1.prisma.asset.findFirst({ where: { id, tenantId } });
        if (!asset) {
            res.status(404).json({ error: "Asset not found" });
            return;
        }
        const ext = path_1.default.extname(asset.fileUrl);
        const safeTitle = asset.title.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand({
            Bucket: SPACES_BUCKET,
            Key: asset.fileUrl,
            ResponseContentDisposition: `attachment; filename="${safeTitle}${ext}"`,
        }), { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
        res.redirect(302, url);
    }
    catch (err) {
        console.error("[assets] Download redirect failed:", err);
        res.status(500).json({ error: "Failed to generate download URL" });
    }
});
// ─── PATCH /api/assets/:id/visibility ───────────────────────────────────────
router.patch("/api/assets/:id/visibility", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const id = String(req.params.id);
        const visible = req.body?.visible;
        if (typeof visible !== "boolean") {
            res.status(400).json({ error: "visible must be a boolean" });
            return;
        }
        const existing = await prisma_1.prisma.asset.findFirst({ where: { id, tenantId } });
        if (!existing) {
            res.status(404).json({ error: "Asset not found" });
            return;
        }
        const updated = await prisma_1.prisma.asset.update({ where: { id }, data: { visible } });
        res.status(200).json(serializeAsset(updated, await signPreviewUrl(updated.fileUrl, updated.mimeType)));
    }
    catch (err) {
        console.error("[assets] Visibility update failed:", err);
        res.status(500).json({ error: "Failed to update asset visibility" });
    }
});
// ─── DELETE /api/assets/:id ─────────────────────────────────────────────────
router.delete("/api/assets/:id", async (req, res) => {
    try {
        const tenantId = (0, auth_1.getTenantId)(req);
        const id = String(req.params.id);
        const existing = await prisma_1.prisma.asset.findFirst({ where: { id, tenantId } });
        if (!existing) {
            res.status(404).json({ error: "Asset not found" });
            return;
        }
        await prisma_1.prisma.asset.delete({ where: { id } });
        try {
            await s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: SPACES_BUCKET, Key: existing.fileUrl }));
        }
        catch (e) {
            console.warn(`[assets] failed to remove object ${existing.fileUrl}:`, e.message);
        }
        res.status(200).json({ id, deleted: true });
    }
    catch (err) {
        console.error("[assets] Delete failed:", err);
        res.status(500).json({ error: "Failed to delete asset" });
    }
});
//# sourceMappingURL=assets.js.map