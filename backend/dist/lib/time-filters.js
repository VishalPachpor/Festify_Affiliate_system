"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDateRange = extractDateRange;
exports.createdAtFilter = createdAtFilter;
/**
 * Extract ?from=YYYY-MM-DD&to=YYYY-MM-DD from query params.
 * Returns Prisma-compatible date range filter or empty object.
 */
function extractDateRange(req) {
    const from = req.query.from;
    const to = req.query.to;
    const range = {};
    if (from && isValidDate(from)) {
        range.gte = new Date(`${from}T00:00:00.000Z`);
    }
    if (to && isValidDate(to)) {
        range.lte = new Date(`${to}T23:59:59.999Z`);
    }
    return range;
}
/**
 * Build a Prisma `createdAt` where clause from the date range.
 * Returns undefined if no filters provided (no-op in queries).
 */
function createdAtFilter(req) {
    const range = extractDateRange(req);
    if (!range.gte && !range.lte)
        return {};
    return { createdAt: range };
}
function isValidDate(str) {
    return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}
//# sourceMappingURL=time-filters.js.map