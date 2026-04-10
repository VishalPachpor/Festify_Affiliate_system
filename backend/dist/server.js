"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("./middleware/auth");
const webhook_ingest_1 = require("./routes/webhook-ingest");
const auth_2 = require("./routes/auth");
const dashboard_1 = require("./routes/dashboard");
const sales_1 = require("./routes/sales");
const affiliates_1 = require("./routes/affiliates");
const payouts_1 = require("./routes/payouts");
const attribution_1 = require("./routes/attribution");
const milestones_1 = require("./routes/milestones");
const application_1 = require("./routes/application");
const applications_1 = require("./routes/applications");
const assets_1 = require("./routes/assets");
const integrations_1 = require("./routes/integrations");
const public_1 = require("./routes/public");
const notifications_1 = require("./routes/notifications");
const event_worker_1 = require("./workers/event-worker");
const worker_1 = require("./processors/worker");
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3001;
const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;
function getAllowedOrigins() {
    const configuredOrigins = [
        process.env.APP_URL,
        process.env.FRONTEND_APP_URL,
        process.env.PUBLIC_FRONTEND_URL,
        process.env.CORS_ORIGIN,
    ]
        .flatMap((value) => String(value ?? "").split(","))
        .map((value) => value.trim())
        .filter(Boolean);
    return new Set(configuredOrigins);
}
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = getAllowedOrigins();
    if (origin && (LOCALHOST_ORIGIN.test(origin) || allowedOrigins.has(origin))) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id, x-affiliate-id");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    }
    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }
    next();
});
// Parse JSON bodies with size limit.
// The `verify` callback captures the raw body for webhook signature validation.
// express.json() stores the parsed object in req.body; the verify hook stashes
// the original bytes in (req as any).rawBody so adapters can HMAC the wire bytes.
app.use(express_1.default.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
// ── Rate limiting ────────────────────────────────────────────────────────────
// Auth endpoints (signup, login, verify) — stricter to prevent brute-force.
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 30, // 30 requests per window per IP
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
});
// Webhook endpoints — moderate limit to absorb bursts but stop abuse.
const webhookLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 120, // 120 per minute per IP
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many webhook requests" },
});
// General API — broad limit for authenticated endpoints.
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 200, // 200 per minute per IP
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
});
// Health check (no auth)
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Static asset serving (no auth) — uploaded marketing materials live under
// backend/uploads/<tenantId>/<file>. Files are addressed by random ids so
// listing without auth is fine; affiliates need plain URLs to download.
app.use("/uploads", express_1.default.static(path_1.default.resolve(process.cwd(), "uploads")));
// Auth routes (no auth required, rate-limited)
app.use("/api/auth", authLimiter);
app.use(auth_2.authRouter);
// Webhook ingestion (uses its own tenant resolution, rate-limited)
app.use("/api/webhooks", webhookLimiter);
app.use(webhook_ingest_1.webhookIngestRouter);
// Public, unauthenticated routes (event landing + public application submit).
// MUST be mounted BEFORE the apiAuth middleware below or requests will be rejected.
app.use(public_1.publicRouter);
// All API routes below use auth middleware + rate limiting.
app.use("/api/dashboard", apiLimiter, auth_1.apiAuth);
app.use("/api/sales", apiLimiter, auth_1.apiAuth);
app.use("/api/affiliates", apiLimiter, auth_1.apiAuth);
app.use("/api/payouts", apiLimiter, auth_1.apiAuth);
app.use("/api/attribution", apiLimiter, auth_1.apiAuth);
app.use("/api/milestones", apiLimiter, auth_1.apiAuth);
app.use("/api/application", apiLimiter, auth_1.apiAuth);
app.use("/api/applications", apiLimiter, auth_1.apiAuth);
app.use("/api/assets", apiLimiter, auth_1.apiAuth);
app.use("/api/integrations", apiLimiter, auth_1.apiAuth);
app.use("/api/notifications", apiLimiter, auth_1.apiAuth);
// API routes
app.use(dashboard_1.dashboardRouter);
app.use(sales_1.salesRouter);
app.use(affiliates_1.affiliatesRouter);
app.use(payouts_1.payoutsRouter);
app.use(attribution_1.attributionRouter);
app.use(milestones_1.milestonesRouter);
app.use(application_1.applicationRouter);
app.use(applications_1.applicationsRouter);
app.use(assets_1.assetsRouter);
app.use(integrations_1.integrationsRouter);
app.use(notifications_1.notificationsRouter);
// Start durable event worker (BullMQ) — consumes domain events, updates aggregates
(0, event_worker_1.startEventWorker)();
// Start inbound event processor — turns InboundEvent(pending) into Sale/Attribution/Commission
(0, worker_1.startWorker)().catch((err) => {
    console.error("[inbound-processor] crashed:", err);
    process.exit(1);
});
app.listen(PORT, () => {
    console.log(`[backend] Listening on http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map