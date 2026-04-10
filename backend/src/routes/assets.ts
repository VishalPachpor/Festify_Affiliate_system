import { Router, type Request, type Response, type NextFunction } from "express";
import multer, { type FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { getTenantId } from "../middleware/auth";
import type { AssetType } from "@prisma/client";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Multer config
//
// Files land under backend/uploads/<tenantId>/<random>.<ext>. The destination
// callback creates the per-tenant folder lazily so we never have stray empty
// dirs and tenant isolation is enforced at the filesystem level.
//
// Multer runs AFTER apiAuth (mounted on /api/assets in server.ts), so by the
// time `destination`/`filename` execute we have a verified req.tenantId.
// ─────────────────────────────────────────────────────────────────────────────

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const tenantId = getTenantId(req);
      const dir = path.join(UPLOAD_ROOT, tenantId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err as Error, "");
    }
  },
  filename: (_req, file, cb) => {
    // Random ID is enough — files aren't enumerated by humans, only fetched by
    // their canonical fileUrl. Keeps the original extension for content sniff.
    const random = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${random}${ext}`);
  },
});

const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/"];

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const ok = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
  if (!ok) {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: image/*, application/pdf, text/*`));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter,
});

// Wraps multer middleware so multer's own errors land as 400 JSON instead of
// crashing into the default Express error path.
function uploadSingle(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      console.warn("[assets] upload rejected:", message);
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TYPES: AssetType[] = ["banner", "email", "social", "copy", "guide"];

function isAssetType(s: unknown): s is AssetType {
  return typeof s === "string" && (VALID_TYPES as string[]).includes(s);
}

function publicUrl(tenantId: string, filename: string): string {
  const base = process.env.PUBLIC_API_URL ?? "http://localhost:3001";
  return `${base}/uploads/${tenantId}/${filename}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function thumbnailBgFor(type: AssetType): string {
  // Maps to existing UI gradients in admin/materials/page.tsx so the cards
  // render consistently without the page needing a per-asset palette field.
  return type;
}

function serializeAsset(asset: {
  id: string;
  title: string;
  type: AssetType;
  fileUrl: string;
  sizeBytes: number;
  mimeType: string;
  visible: boolean;
  createdAt: Date;
}) {
  return {
    id: asset.id,
    title: asset.title,
    type: asset.type,
    fileUrl: asset.fileUrl,
    sizeBytes: asset.sizeBytes,
    sizeLabel: formatBytes(asset.sizeBytes),
    mimeType: asset.mimeType,
    visible: asset.visible,
    addedAt: asset.createdAt.toISOString(),
    thumbnailBg: thumbnailBgFor(asset.type),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assets
//
// Returns the tenant's assets. Optional filters:
//   ?type=banner|email|social|copy|guide
//   ?visible=true     → only visible assets (used by the affiliate-side page)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/assets", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const typeQ = String(req.query.type ?? "").trim();
    const visibleQ = String(req.query.visible ?? "").trim().toLowerCase();

    const where: { tenantId: string; type?: AssetType; visible?: boolean } = { tenantId };
    if (typeQ && isAssetType(typeQ)) {
      where.type = typeQ;
    }
    if (visibleQ === "true") {
      where.visible = true;
    }

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      assets: assets.map(serializeAsset),
      total: assets.length,
    });
  } catch (err) {
    console.error("[assets] List query failed:", err);
    res.status(500).json({ error: "Failed to load assets" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assets
//
// Multipart upload. Body fields: title (required), type (required).
// File field: "file" (required, ≤5 MB, image/* | application/pdf | text/*).
// ─────────────────────────────────────────────────────────────────────────────

router.post("/api/assets", uploadSingle, async (req: Request, res: Response) => {
  const file = req.file;
  try {
    const tenantId = getTenantId(req);

    if (!file) {
      res.status(400).json({ error: "Missing file (multipart field 'file' required)" });
      return;
    }

    const title = String(req.body?.title ?? "").trim();
    const typeRaw = String(req.body?.type ?? "").trim().toLowerCase();

    if (!title) {
      // Roll back the orphan file if validation fails after multer wrote it.
      fs.unlink(file.path, () => undefined);
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (!isAssetType(typeRaw)) {
      fs.unlink(file.path, () => undefined);
      res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` });
      return;
    }

    const fileUrl = publicUrl(tenantId, path.basename(file.path));

    const asset = await prisma.asset.create({
      data: {
        tenantId,
        title,
        type: typeRaw,
        fileUrl,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      },
    });

    res.status(201).json(serializeAsset(asset));
  } catch (err) {
    // If the DB write failed after multer wrote the file, delete the orphan.
    if (file) fs.unlink(file.path, () => undefined);
    console.error("[assets] Upload failed:", err);
    res.status(500).json({ error: "Failed to upload asset" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/assets/:id/visibility
//
// Toggles or sets the asset's visibility flag. Body: { visible: boolean }.
// ─────────────────────────────────────────────────────────────────────────────

router.patch("/api/assets/:id/visibility", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const id = String(req.params.id);
    const visible = req.body?.visible;

    if (typeof visible !== "boolean") {
      res.status(400).json({ error: "visible must be a boolean" });
      return;
    }

    const existing = await prisma.asset.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: { visible },
    });

    res.status(200).json(serializeAsset(updated));
  } catch (err) {
    console.error("[assets] Visibility update failed:", err);
    res.status(500).json({ error: "Failed to update asset visibility" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/assets/:id
//
// Removes the DB row + the on-disk file. File deletion is best-effort —
// a missing/already-removed file does not block the delete.
// ─────────────────────────────────────────────────────────────────────────────

router.delete("/api/assets/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const id = String(req.params.id);

    const existing = await prisma.asset.findFirst({ where: { id, tenantId } });
    if (!existing) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    await prisma.asset.delete({ where: { id } });

    // Best-effort filesystem cleanup. Reconstruct the on-disk path from the
    // public URL by stripping the base + slug.
    const filename = existing.fileUrl.split("/").pop();
    if (filename) {
      const filepath = path.join(UPLOAD_ROOT, tenantId, filename);
      fs.unlink(filepath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.warn(`[assets] failed to remove file ${filepath}:`, err.message);
        }
      });
    }

    res.status(200).json({ id, deleted: true });
  } catch (err) {
    console.error("[assets] Delete failed:", err);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

export { router as assetsRouter };
export { UPLOAD_ROOT };
