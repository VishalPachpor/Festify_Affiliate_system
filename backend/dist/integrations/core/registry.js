"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdapter = getAdapter;
exports.listProviders = listProviders;
const adapter_1 = require("../luma/adapter");
const adapter_2 = require("../generic/adapter");
// ─────────────────────────────────────────────────────────────────────────────
// Provider Registry
//
// Maps provider names to their adapters. When a webhook arrives at
// POST /api/webhooks/:provider, we look up the adapter here.
//
// To add a new provider: create adapter file + register here.
// ─────────────────────────────────────────────────────────────────────────────
const adapters = {
    luma: adapter_1.lumaAdapter,
    generic: adapter_2.genericAdapter,
    test: adapter_2.genericAdapter, // alias for testing
};
function getAdapter(provider) {
    return adapters[provider.toLowerCase()];
}
function listProviders() {
    return Object.keys(adapters);
}
//# sourceMappingURL=registry.js.map