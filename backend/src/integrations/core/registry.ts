import type { ProviderAdapter } from "./adapter";
import { lumaAdapter } from "../luma/adapter";
import { genericAdapter } from "../generic/adapter";

// ─────────────────────────────────────────────────────────────────────────────
// Provider Registry
//
// Maps provider names to their adapters. When a webhook arrives at
// POST /api/webhooks/:provider, we look up the adapter here.
//
// To add a new provider: create adapter file + register here.
// ─────────────────────────────────────────────────────────────────────────────

const adapters: Record<string, ProviderAdapter> = {
  luma: lumaAdapter,
  generic: genericAdapter,
  test: genericAdapter, // alias for testing
};

export function getAdapter(provider: string): ProviderAdapter | undefined {
  return adapters[provider.toLowerCase()];
}

export function listProviders(): string[] {
  return Object.keys(adapters);
}
