"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationError = void 0;
exports.parsePagination = parsePagination;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
/**
 * Parse and validate pagination params from query string.
 * Returns { page, pageSize } or throws on invalid input.
 */
function parsePagination(req) {
    const rawPage = req.query.page;
    const rawPageSize = req.query.pageSize;
    const page = rawPage !== undefined ? parseInt(String(rawPage), 10) : 1;
    const pageSize = rawPageSize !== undefined ? parseInt(String(rawPageSize), 10) : DEFAULT_PAGE_SIZE;
    if (Number.isNaN(page) || page < 1) {
        throw new PaginationError("page must be a positive integer");
    }
    if (Number.isNaN(pageSize) || pageSize < 1) {
        throw new PaginationError("pageSize must be a positive integer");
    }
    if (pageSize > MAX_PAGE_SIZE) {
        throw new PaginationError(`pageSize must be at most ${MAX_PAGE_SIZE}`);
    }
    return { page, pageSize };
}
class PaginationError extends Error {
    constructor(message) {
        super(message);
        this.name = "PaginationError";
    }
}
exports.PaginationError = PaginationError;
//# sourceMappingURL=pagination.js.map