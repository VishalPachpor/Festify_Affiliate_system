import { getApiBaseUrl } from "@/services/api/client";
import { getAuthToken } from "@/modules/auth/token-store";
import { assetSchema, type Asset, type AssetType } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Three-step upload (presigned POST → direct PUT to Spaces → confirm):
//
//   1. POST /assets/upload-url  { filename, contentType, sizeBytes }
//        → { key, uploadUrl, fields }
//   2. FormData POST directly to uploadUrl (bytes never hit our backend)
//   3. POST /assets/confirm     { key, title, type }  → the persisted Asset row
//
// This replaces the earlier single-shot multipart POST. The backend bucket is
// private, so bytes flow browser ↔ Spaces while metadata flows browser ↔ API.
// ─────────────────────────────────────────────────────────────────────────────

export type UploadAssetParams = {
  title: string;
  type: AssetType;
  file: File;
};

type UploadUrlResponse = {
  key: string;
  uploadUrl: string;
  fields: Record<string, string>;
};

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body?.error) return String(body.error);
  } catch {
    // ignore — fall through
  }
  return response.statusText || `HTTP ${response.status}`;
}

async function requestUploadUrl(file: File): Promise<UploadUrlResponse> {
  const response = await fetch(`${getApiBaseUrl()}/assets/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
    credentials: "include",
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as UploadUrlResponse;
}

async function uploadToStorage(
  uploadUrl: string,
  fields: Record<string, string>,
  file: File,
): Promise<void> {
  // The `file` field must be the last entry in the FormData — S3-compatible
  // services require it to be after all policy fields.
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append("file", file);

  const response = await fetch(uploadUrl, { method: "POST", body: form });
  if (!response.ok) {
    throw new Error(`Storage upload failed (HTTP ${response.status})`);
  }
}

async function confirmUpload(
  key: string,
  title: string,
  type: AssetType,
): Promise<Asset> {
  const response = await fetch(`${getApiBaseUrl()}/assets/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ key, title, type }),
    credentials: "include",
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const raw = await response.json();
  return assetSchema.parse(raw);
}

export async function uploadAsset(params: UploadAssetParams): Promise<Asset> {
  const { uploadUrl, fields, key } = await requestUploadUrl(params.file);
  await uploadToStorage(uploadUrl, fields, params.file);
  return confirmUpload(key, params.title, params.type);
}
