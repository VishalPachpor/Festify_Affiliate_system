import express from "express";
import rateLimit from "express-rate-limit";
import { apiAuth } from "./middleware/auth";
import { webhookIngestRouter } from "./routes/webhook-ingest";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { salesRouter } from "./routes/sales";
import { affiliatesRouter } from "./routes/affiliates";
import { payoutsRouter } from "./routes/payouts";
import { attributionRouter } from "./routes/attribution";
import { milestonesRouter } from "./routes/milestones";
import { applicationRouter } from "./routes/application";
import { applicationsRouter } from "./routes/applications";
import { assetsRouter } from "./routes/assets";
import { integrationsRouter } from "./routes/integrations";
import { publicRouter } from "./routes/public";
import { notificationsRouter } from "./routes/notifications";

const app = express();
const PORT = process.env.PORT ?? 3001;
const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;
const VERCEL_ORIGIN = /^https:\/\/[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i;

// DigitalOcean/Cloudflare terminate TLS before the request reaches Express.
// Trust one proxy hop so express-rate-limit can safely read X-Forwarded-For.
app.set("trust proxy", 1);

function getAllowedOrigins(): Set<string> {
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

function isAllowedOrigin(origin: string, allowedOrigins: Set<string>): boolean {
  return LOCALHOST_ORIGIN.test(origin) || VERCEL_ORIGIN.test(origin) || allowedOrigins.has(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (origin && isAllowedOrigin(origin, allowedOrigins)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-tenant-id, x-affiliate-id",
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
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
app.use(
  express.json({
    limit: "30mb",
    verify: (req, _res, buf) => {
      (req as unknown as Record<string, unknown>).rawBody = buf;
    },
  }),
);

// ── Rate limiting ────────────────────────────────────────────────────────────

// Auth endpoints (signup, login, verify) — stricter to prevent brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30,                 // 30 requests per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Webhook endpoints — moderate limit to absorb bursts but stop abuse.
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  limit: 120,                // 120 per minute per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many webhook requests" },
});

// General API — broad limit for authenticated endpoints.
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  limit: 200,                // 200 per minute per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Health check (no auth)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Auth routes (no auth required, rate-limited)
app.use("/api/auth", authLimiter);
app.use(authRouter);

// Webhook ingestion (uses its own tenant resolution, rate-limited)
app.use("/api/webhooks", webhookLimiter);
app.use(webhookIngestRouter);

// Public, unauthenticated routes (event landing + public application submit).
// MUST be mounted BEFORE the apiAuth middleware below or requests will be rejected.
app.use(publicRouter);

// All API routes below use auth middleware + rate limiting.
app.use("/api/dashboard", apiLimiter, apiAuth);
app.use("/api/sales", apiLimiter, apiAuth);
app.use("/api/affiliates", apiLimiter, apiAuth);
app.use("/api/payouts", apiLimiter, apiAuth);
app.use("/api/attribution", apiLimiter, apiAuth);
app.use("/api/milestones", apiLimiter, apiAuth);
app.use("/api/application", apiLimiter, apiAuth);
app.use("/api/applications", apiLimiter, apiAuth);
app.use("/api/assets", apiLimiter, apiAuth);
app.use("/api/integrations", apiLimiter, apiAuth);
app.use("/api/notifications", apiLimiter, apiAuth);

// API routes
app.use(dashboardRouter);
app.use(salesRouter);
app.use(affiliatesRouter);
app.use(payoutsRouter);
app.use(attributionRouter);
app.use(milestonesRouter);
app.use(applicationRouter);
app.use(applicationsRouter);
app.use(assetsRouter);
app.use(integrationsRouter);
app.use(notificationsRouter);

// Workers run as separate processes in production (see .do/app.yaml).
// Start them locally with `npm run worker` and `npm run worker:events`.

app.listen(PORT, () => {
  console.log(`[backend] Listening on http://localhost:${PORT}`);
});

export default app;
