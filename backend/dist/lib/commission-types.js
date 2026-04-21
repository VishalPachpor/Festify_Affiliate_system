"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMISSION_CREDIT_TYPES = void 0;
// Ledger entry types that add to an affiliate's earned commission total.
// Every query that sums "what an affiliate earned" (payout bundling,
// affiliate KPIs, sales-page commission column) must filter by this set —
// filtering on "earned" alone silently drops retroactive tier adjustments.
exports.COMMISSION_CREDIT_TYPES = ["earned", "tier_adjustment"];
//# sourceMappingURL=commission-types.js.map