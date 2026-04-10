import type { Request } from "express";
/**
 * Extract ?from=YYYY-MM-DD&to=YYYY-MM-DD from query params.
 * Returns Prisma-compatible date range filter or empty object.
 */
export declare function extractDateRange(req: Request): {
    gte?: Date;
    lte?: Date;
};
/**
 * Build a Prisma `createdAt` where clause from the date range.
 * Returns undefined if no filters provided (no-op in queries).
 */
export declare function createdAtFilter(req: Request): {
    createdAt?: {
        gte?: Date;
        lte?: Date;
    };
};
//# sourceMappingURL=time-filters.d.ts.map