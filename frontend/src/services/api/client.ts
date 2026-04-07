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
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
}

function buildUrl(
  path: string,
  searchParams?: ApiRequestConfig["searchParams"],
): string {
  const url = new URL(path, getBaseUrl());

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

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const error: ApiErrorResponse = await response.json().catch(() => ({
      status: response.status,
      code: "INTERNAL_UNKNOWN",
      message: response.statusText,
      requestId: "unknown",
    }));

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

  return response.json() as Promise<T>;
}
