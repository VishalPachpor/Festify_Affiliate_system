import type { Request } from "express";

/**
 * Extract ?from=YYYY-MM-DD&to=YYYY-MM-DD from query params.
 * Returns Prisma-compatible date range filter or empty object.
 */
export function extractDateRange(req: Request): { gte?: Date; lte?: Date } {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const range: { gte?: Date; lte?: Date } = {};

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
export function createdAtFilter(req: Request): { createdAt?: { gte?: Date; lte?: Date } } {
  const range = extractDateRange(req);

  if (!range.gte && !range.lte) return {};

  return { createdAt: range };
}

function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}
