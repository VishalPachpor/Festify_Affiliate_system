import type { Request } from "express";
export type PaginationParams = {
    page: number;
    pageSize: number;
};
/**
 * Parse and validate pagination params from query string.
 * Returns { page, pageSize } or throws on invalid input.
 */
export declare function parsePagination(req: Request): PaginationParams;
export declare class PaginationError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=pagination.d.ts.map