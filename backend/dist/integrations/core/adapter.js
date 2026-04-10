"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Provider Adapter Interface
//
// Every ticketing provider implements this interface. The webhook ingestion
// endpoint uses it to normalize external payloads into our internal format
// before storing as InboundEvent.
//
// Adapters NEVER touch business logic — they only parse and normalize.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=adapter.js.map