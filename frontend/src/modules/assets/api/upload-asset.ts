import { getApiBaseUrl } from "@/services/api/client";
import { getAuthToken } from "@/modules/auth/token-store";
import { assetSchema, type Asset, type AssetType } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Multipart upload — bypasses apiClient because the JSON helper always sets
// Content-Type: application/json and serializes the body. For file uploads we
// need the browser to set its own multipart Content-Type with the boundary.
// ─────────────────────────────────────────────────────────────────────────────

export type UploadAssetParams = {
  title: string;
  type: AssetType;
  file: File;
};

export async function uploadAsset(params: UploadAssetParams): Promise<Asset> {
  const formData = new FormData();
  formData.append("title", params.title);
  formData.append("type", params.type);
  formData.append("file", params.file);

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${getApiBaseUrl()}/assets`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — fallback to statusText
    }
    throw new Error(message);
  }

  const raw = await response.json();
  return assetSchema.parse(raw);
}
