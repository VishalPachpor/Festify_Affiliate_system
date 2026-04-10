"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiAuth = void 0;
exports.requireAuth = requireAuth;
exports.devAuth = devAuth;
exports.getTenantId = getTenantId;
exports.generateDevToken = generateDevToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
// ─────────────────────────────────────────────────────────────────────────────
// Auth Middleware
//
// Extracts and verifies JWT from Authorization header.
// Populates req.tenantId, req.userId, req.userRole, req.affiliateId.
// Rejects with 401 if missing/invalid.
//
// JWT payload expected shape:
//   { sub: string, tenantId: string, role: string, affiliateId: string | null }
// ─────────────────────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV?.toLowerCase() === "production";
// Fail hard in production if JWT_SECRET is missing or still the dev default.
const JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (isProduction) {
        if (!secret || secret === "dev-secret-change-in-production") {
            throw new Error("FATAL: JWT_SECRET must be set to a strong, unique value in production");
        }
    }
    return secret ?? "dev-secret-change-in-production";
})();
/**
 * Middleware: requires valid JWT. Populates req.tenantId, req.userId, req.userRole.
 */
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid Authorization header" });
        return;
    }
    const token = header.slice(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!decoded.tenantId || !decoded.sub) {
            res.status(401).json({ error: "Invalid token payload" });
            return;
        }
        req.tenantId = decoded.tenantId;
        req.userId = decoded.sub;
        req.userRole = decoded.role;
        req.affiliateId = decoded.affiliateId ?? null;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
/**
 * Middleware: for development/testing only.
 * Accepts JWT OR explicit x-tenant-id header. Never auto-mocks.
 * Use requireAuth in production.
 */
async function devAuth(req, res, next) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
        try {
            const decoded = jsonwebtoken_1.default.verify(header.slice(7), JWT_SECRET);
            req.tenantId = decoded.tenantId;
            req.userId = decoded.sub;
            req.userRole = decoded.role;
            req.affiliateId = decoded.affiliateId ?? null;
            next();
            return;
        }
        catch {
            // fall through
        }
    }
    // Dev allows explicit x-tenant-id header (NEVER silent mock).
    const headerTenant = req.headers["x-tenant-id"];
    if (typeof headerTenant === "string" && headerTenant.trim().length > 0) {
        const tenantId = headerTenant.trim();
        // Validate the tenant actually exists. Without this check, downstream
        // writes (e.g. ProviderConnection.create) fail with an opaque P2003
        // foreign-key error and the client just sees a 500.
        try {
            const exists = await prisma_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
            if (!exists) {
                res.status(404).json({ error: `Unknown tenant: ${tenantId}` });
                return;
            }
        }
        catch (err) {
            console.error("[devAuth] Tenant lookup failed:", err);
            res.status(500).json({ error: "Tenant validation failed" });
            return;
        }
        req.tenantId = tenantId;
        req.userId = "dev-user";
        req.userRole = "admin";
        req.affiliateId = null;
        next();
        return;
    }
    // No credentials → reject. No silent fallback even in dev.
    res.status(401).json({ error: "Missing authentication: provide Authorization Bearer or x-tenant-id header" });
}
/**
 * Choose the right auth middleware based on environment.
 * Production: requireAuth (JWT only, no fallback)
 * Development: devAuth (JWT or header or mock)
 */
exports.apiAuth = isProduction ? requireAuth : devAuth;
/**
 * Helper: get tenantId from request or throw.
 * Use inside route handlers after auth middleware.
 */
function getTenantId(req) {
    if (!req.tenantId) {
        throw new Error("Tenant context missing — auth middleware not applied");
    }
    return req.tenantId;
}
/**
 * Generate a JWT for development/testing.
 */
function generateDevToken(tenantId, userId, role = "admin") {
    return jsonwebtoken_1.default.sign({ sub: userId, tenantId, role }, JWT_SECRET, { expiresIn: "24h" });
}
//# sourceMappingURL=auth.js.map