import { type Request, type Response, type NextFunction } from "express";
export type AuthPayload = {
    sub: string;
    tenantId: string;
    role: string;
    affiliateId: string | null;
};
declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
            userId?: string;
            userRole?: string;
            affiliateId?: string | null;
        }
    }
}
/**
 * Middleware: requires valid JWT. Populates req.tenantId, req.userId, req.userRole.
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware: for development/testing only.
 * Accepts JWT OR explicit x-tenant-id header. Never auto-mocks.
 * Use requireAuth in production.
 */
export declare function devAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Choose the right auth middleware based on environment.
 * Production: requireAuth (JWT only, no fallback)
 * Development: devAuth (JWT or header or mock)
 */
export declare const apiAuth: typeof requireAuth;
/**
 * Helper: get tenantId from request or throw.
 * Use inside route handlers after auth middleware.
 */
export declare function getTenantId(req: Request): string;
/**
 * Generate a JWT for development/testing.
 */
export declare function generateDevToken(tenantId: string, userId: string, role?: string): string;
//# sourceMappingURL=auth.d.ts.map