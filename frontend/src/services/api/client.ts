export type ApiRequestConfig = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
};

export type ApiErrorResponse = {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
};

function toUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unexpected API response";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public requestId: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
}

/**
 * Public accessor for the API base URL — used by callers that can't go
 * through `apiClient` (e.g. multipart uploads, raw fetch streaming).
 */
export function getApiBaseUrl(): string {
  return getBaseUrl().replace(/\/$/, "");
}

function buildUrl(
  path: string,
  searchParams?: ApiRequestConfig["searchParams"],
): string {
  const base = getBaseUrl().replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${suffix}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function apiClient<T>(
  path: string,
  config: ApiRequestConfig = {},
): Promise<T> {
  const { method = "GET", headers = {}, body, searchParams } = config;

  const url = buildUrl(path, searchParams);

  // Lazy import keeps this module free of circular deps with the auth module.
  // The token store is a tiny standalone localStorage wrapper.
  let authHeader: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const { getAuthToken } = await import("@/modules/auth/token-store");
      const token = getAuthToken();
      if (token && !headers["Authorization"] && !headers["authorization"]) {
        authHeader = { Authorization: `Bearer ${token}` };
      }
    } catch {
      // token store unavailable — fall through without an auth header
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch (error) {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "unknown",
      toUnknownErrorMessage(error),
    );
  }

  if (!response.ok) {
    const raw = await response.json().catch(() => null);

    const error: ApiErrorResponse = {
      status: raw?.status ?? response.status,
      code: raw?.code ?? "INTERNAL_UNKNOWN",
      message: raw?.message ?? raw?.error ?? response.statusText,
      requestId: raw?.requestId ?? "unknown",
      details: raw?.details,
    };

    throw new ApiError(
      error.status,
      error.code,
      error.requestId,
      error.message,
      error.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ApiError(
      response.status,
      "INVALID_JSON_RESPONSE",
      "unknown",
      toUnknownErrorMessage(error),
    );
  }
}
