import { ApiError } from "./client";

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAuthError(error: unknown): boolean {
  return isApiError(error) && error.code.startsWith("AUTH_");
}

export function isPermissionError(error: unknown): boolean {
  return isApiError(error) && error.code.startsWith("AUTHZ_");
}

export function isValidationError(error: unknown): boolean {
  return isApiError(error) && error.code.startsWith("VALIDATION_");
}

export function isRateLimitError(error: unknown): boolean {
  return isApiError(error) && error.code.startsWith("RATE_LIMIT_");
}

export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.code.startsWith("NOT_FOUND_");
}
