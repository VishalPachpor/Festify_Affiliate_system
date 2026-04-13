import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { generateDevToken } from "../middleware/auth";
import { EmailDeliveryError, sendVerificationCodeEmail } from "../lib/email";
import type { UserRole } from "@prisma/client";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Auth routes — real, persistent, JWT-issuing.
//
// Issues a 24h JWT with claims:
//   { sub: userId, tenantId, role, affiliateId, email, fullName }
// Frontend stores it in localStorage and sends as `Authorization: Bearer …`.
// `requireAuth` (middleware/auth.ts) decodes it and populates req.tenantId.
// `devAuth` keeps the legacy x-tenant-id header path for backward compat.
// ─────────────────────────────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV?.toLowerCase() === "production";

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (isProduction) {
    if (!secret || secret === "dev-secret-change-in-production") {
      throw new Error(
        "FATAL: JWT_SECRET must be set to a strong, unique value in production",
      );
    }
  }
  return secret ?? "dev-secret-change-in-production";
})();

const JWT_EXPIRY = "24h";
const PASSWORD_MIN_LEN = 8;
const VERIFY_CODE_TTL_MINUTES = 15;

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

// ─── Helpers ────────────────────────────────────────────────────────────────

type JWTPayload = {
  sub: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  affiliateId: string | null;
};

function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function publicUser(user: {
  id: string;
  email: string;
  fullName: string;
  pictureUrl?: string | null;
  role: UserRole;
  tenantId: string | null;
  affiliateId: string | null;
  emailVerifiedAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    pictureUrl: user.pictureUrl ?? null,
    role: user.role,
    tenantId: user.tenantId,
    affiliateId: user.affiliateId,
    emailVerified: !!user.emailVerifiedAt,
  };
}

function asNonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

type GoogleAuthIntent = "login" | "affiliate_signup";

function parseGoogleAuthIntent(value: unknown): GoogleAuthIntent {
  return value === "affiliate_signup" ? "affiliate_signup" : "login";
}

/**
 * Pick the demo tenant for new signups. Real production would resolve via
 * subdomain or invite link — for the demo, every new user joins tenant_demo.
 */
async function pickDefaultTenantId(): Promise<string | null> {
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  return tenant?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// Body: { fullName, email, password }
// Creates a User row + a verification code and sends it via the configured
// mail provider. Does NOT issue a JWT — caller must verify their email first.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/api/auth/signup", async (req: Request, res: Response) => {
  try {
    const fullName = asNonEmptyString(req.body?.fullName);
    const emailRaw = asNonEmptyString(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!fullName || !emailRaw) {
      res.status(400).json({ error: "fullName and email are required" });
      return;
    }
    const email = emailRaw.toLowerCase();
    if (!isEmail(email)) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }
    if (password.length < PASSWORD_MIN_LEN) {
      res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LEN} characters` });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "An account with that email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tenantId = await pickDefaultTenantId();

    const code = generateCode();
    const expiresAt = new Date(Date.now() + VERIFY_CODE_TTL_MINUTES * 60_000);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: "affiliate",
        tenantId,
        emailVerifications: {
          create: {
            code,
            expiresAt,
          },
        },
      },
    });

    try {
      await sendVerificationCodeEmail({
        to: email,
        fullName,
        code,
        expiresInMinutes: VERIFY_CODE_TTL_MINUTES,
      });
    } catch (error) {
      await prisma.user.delete({ where: { id: user.id } });

      if (error instanceof EmailDeliveryError) {
        console.error("[auth] signup mail delivery failed:", error.message);
        res.status(503).json({ error: "Failed to send verification email" });
        return;
      }

      throw error;
    }

    res.status(201).json({
      message: "Signup successful. Check your email for the verification code.",
      email,
    });
  } catch (err) {
    console.error("[auth] signup failed:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup/organizer
// Body: { fullName, email, password, eventName }
// Creates a Tenant + Campaign + admin User in a single transaction.
// Like affiliate signup, does NOT issue a JWT — email must be verified first.
// ─────────────────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

router.post("/api/auth/signup/organizer", async (req: Request, res: Response) => {
  try {
    const fullName = asNonEmptyString(req.body?.fullName);
    const emailRaw = asNonEmptyString(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const eventName = asNonEmptyString(req.body?.eventName);

    if (!fullName || !emailRaw || !eventName) {
      res.status(400).json({ error: "fullName, email, and eventName are required" });
      return;
    }
    const email = emailRaw.toLowerCase();
    if (!isEmail(email)) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }
    if (password.length < PASSWORD_MIN_LEN) {
      res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LEN} characters` });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "An account with that email already exists" });
      return;
    }

    // Generate a unique slug for the tenant/campaign
    let slug = slugify(eventName);
    if (!slug) slug = "event";
    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = generateCode();
    const expiresAt = new Date(Date.now() + VERIFY_CODE_TTL_MINUTES * 60_000);

    // Create Tenant + Campaign + User in a single transaction
    const { user } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: eventName,
          defaultCurrency: "USD",
        },
      });

      await tx.campaign.create({
        data: {
          tenantId: tenant.id,
          slug,
          name: eventName,
          commissionRateBps: 1000, // 10% default
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          fullName,
          passwordHash,
          role: "admin",
          tenantId: tenant.id,
          emailVerifications: {
            create: { code, expiresAt },
          },
        },
      });

      return { user, tenant };
    });

    try {
      await sendVerificationCodeEmail({
        to: email,
        fullName,
        code,
        expiresInMinutes: VERIFY_CODE_TTL_MINUTES,
      });
    } catch (error) {
      // Roll back: delete user (cascade will handle verification), campaign, tenant
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});

      if (error instanceof EmailDeliveryError) {
        console.error("[auth] organizer signup mail delivery failed:", error.message);
        res.status(503).json({ error: "Failed to send verification email" });
        return;
      }
      throw error;
    }

    res.status(201).json({
      message: "Signup successful. Check your email for the verification code.",
      email,
    });
  } catch (err) {
    console.error("[auth] organizer signup failed:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-email
// Body: { email, code }
// On success: marks emailVerifiedAt, issues a JWT.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/api/auth/verify-email", async (req: Request, res: Response) => {
  try {
    const email = asNonEmptyString(req.body?.email)?.toLowerCase();
    const code = asNonEmptyString(req.body?.code);

    if (!email || !code) {
      res.status(400).json({ error: "email and code are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    if (user.emailVerifiedAt) {
      // Already verified — reissue a token so the client gets a fresh session.
      const token = signToken({
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        affiliateId: user.affiliateId,
      });
      res.status(200).json({ token, user: publicUser(user) });
      return;
    }

    const verification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      res.status(400).json({ error: "Invalid or expired verification code" });
      return;
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const token = signToken({
      sub: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId,
      affiliateId: updatedUser.affiliateId,
    });

    res.status(200).json({ token, user: publicUser(updatedUser) });
  } catch (err) {
    console.error("[auth] verify-email failed:", err);
    res.status(500).json({ error: "Email verification failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-code
// Body: { email }
// ─────────────────────────────────────────────────────────────────────────────

router.post("/api/auth/resend-code", async (req: Request, res: Response) => {
  try {
    const email = asNonEmptyString(req.body?.email)?.toLowerCase();
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always 200 to avoid leaking which emails are registered.
    if (!user || user.emailVerifiedAt) {
      res.status(200).json({ message: "If the account exists, a code has been sent" });
      return;
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + VERIFY_CODE_TTL_MINUTES * 60_000);

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    await sendVerificationCodeEmail({
      to: email,
      fullName: user.fullName,
      code,
      expiresInMinutes: VERIFY_CODE_TTL_MINUTES,
    });

    res.status(200).json({ message: "If the account exists, a code has been sent" });
  } catch (err) {
    console.error("[auth] resend-code failed:", err);
    res.status(500).json({ error: "Failed to resend code" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// Issues a JWT only if email is verified.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const email = asNonEmptyString(req.body?.email)?.toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Vague error to avoid account-enumeration.
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.emailVerifiedAt) {
      res.status(403).json({
        error: "Please verify your email before signing in",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
      return;
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      affiliateId: user.affiliateId,
    });

    res.status(200).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth] login failed:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// Body: { credential }   // Google ID token (JWT)
// Verifies the token via google-auth-library, find-or-creates User by `sub`.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
      res.status(503).json({
        error: "Google sign-in is not configured on this backend",
        code: "GOOGLE_NOT_CONFIGURED",
      });
      return;
    }

    const credential = asNonEmptyString(req.body?.credential);
    if (!credential) {
      res.status(400).json({ error: "credential (Google ID token) is required" });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      res.status(400).json({ error: "Google token missing required fields" });
      return;
    }

    const email = payload.email.toLowerCase();
    const fullName = payload.name ?? email.split("@")[0];
    const googleSub = payload.sub;
    const pictureUrl = payload.picture ?? null;
    const intent = parseGoogleAuthIntent(req.body?.intent);

    // Find by googleSub first (the canonical link), fall back to email so
    // existing users can attach their Google account by signing in with it.
    let user =
      (await prisma.user.findUnique({ where: { googleSub } })) ??
      (await prisma.user.findUnique({ where: { email } }));

    if (!user) {
      // Auto-create an affiliate account for any Google sign-in (login or signup).
      // Users expect "Continue with Google" to just work regardless of which tab they're on.
      const tenantId = await pickDefaultTenantId();
      user = await prisma.user.create({
        data: {
          email,
          fullName,
          googleSub,
          pictureUrl,
          role: "affiliate",
          tenantId,
          emailVerifiedAt: new Date(), // Google has already verified the email
        },
      });
    } else if (!user.googleSub) {
      // Existing email-only user signing in with Google → link the accounts
      // and trust Google's verification.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleSub,
          pictureUrl: pictureUrl ?? user.pictureUrl,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    } else if (pictureUrl && !user.pictureUrl) {
      // Returning Google user whose picture wasn't saved before.
      user = await prisma.user.update({
        where: { id: user.id },
        data: { pictureUrl },
      });
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      affiliateId: user.affiliateId,
    });

    res.status(200).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth] google login failed:", err);
    res.status(401).json({ error: "Google sign-in failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns the current user from the JWT. Used by the frontend's AuthProvider
// to bootstrap the session on page load (instead of trusting a stale token).
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(header.slice(7), JWT_SECRET) as JWTPayload;
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    console.error("[auth] /me failed:", err);
    res.status(500).json({ error: "Failed to load session" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/dev-token
// Dev-only escape hatch — keeps the legacy x-tenant-id workflow alive.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/google/redirect
//
// Redirect-based OAuth2 flow — avoids GSI's unreliable origin check.
// Redirects the browser (popup) to Google's consent page. After consent,
// Google bounces back to /api/auth/google/callback with an auth code.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/auth/google/redirect", (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503).send("Google sign-in not configured");
    return;
  }

  const backendBase = process.env.PUBLIC_API_URL ?? "http://localhost:3001";
  const redirectUri = `${backendBase}/api/auth/google/callback`;

  const intent = parseGoogleAuthIntent(_req.query.intent);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    access_type: "offline",
    state: intent,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/google/callback?code=…
//
// Google redirects here after user consent. Exchanges the auth code for
// tokens, extracts the user info, find-or-creates a User row, issues a
// JWT, then renders a tiny HTML page that postMessages the result back
// to the opener window (the sign-in page) and closes itself.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/api/auth/google/callback", async (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const backendBase = process.env.PUBLIC_API_URL ?? "http://localhost:3001";
  const redirectUri = `${backendBase}/api/auth/google/callback`;

  function sendCallbackHtml(payload: { type: string; token?: string; user?: unknown; error?: string }) {
    // This HTML page runs inside the popup. It posts the result to the
    // opener window (the sign-in page) and then closes itself.
    const json = JSON.stringify(payload).replace(/</g, "\\u003c");
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
    res.send(`<!DOCTYPE html><html><body><script>
      window.opener && window.opener.postMessage(${json}, "*");
      window.close();
    </script><p>Signing in… you can close this window.</p></body></html>`);
  }

  try {
    const code = String(req.query.code ?? "");
    const errorParam = String(req.query.error ?? "");
    const intent = parseGoogleAuthIntent(req.query.state);

    if (errorParam) {
      sendCallbackHtml({ type: "google-auth-callback", error: `Google error: ${errorParam}` });
      return;
    }
    if (!code) {
      sendCallbackHtml({ type: "google-auth-callback", error: "Missing authorization code" });
      return;
    }
    if (!clientId || !clientSecret) {
      sendCallbackHtml({ type: "google-auth-callback", error: "Google OAuth not fully configured on server" });
      return;
    }

    // Exchange auth code for tokens.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[auth] Google token exchange failed:", body);
      sendCallbackHtml({ type: "google-auth-callback", error: "Failed to exchange authorization code" });
      return;
    }

    const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string };

    // Get user info from the ID token or userinfo endpoint.
    let email: string;
    let fullName: string;
    let googleSub: string;

    if (tokens.id_token) {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });
      const payload = ticket.getPayload()!;
      email = (payload.email ?? "").toLowerCase();
      fullName = payload.name ?? email.split("@")[0];
      googleSub = payload.sub;
    } else if (tokens.access_token) {
      const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const info = (await infoRes.json()) as { sub: string; email: string; name?: string };
      email = info.email.toLowerCase();
      fullName = info.name ?? email.split("@")[0];
      googleSub = info.sub;
    } else {
      sendCallbackHtml({ type: "google-auth-callback", error: "Google did not return tokens" });
      return;
    }

    // Find-or-create user — same logic as the existing POST /api/auth/google.
    let user =
      (await prisma.user.findUnique({ where: { googleSub } })) ??
      (await prisma.user.findUnique({ where: { email } }));

    if (!user) {
      // Auto-create an affiliate account for any Google sign-in (login or signup).
      const tenantId = await pickDefaultTenantId();
      user = await prisma.user.create({
        data: {
          email,
          fullName,
          googleSub,
          role: "affiliate",
          tenantId,
          emailVerifiedAt: new Date(),
        },
      });
    } else if (!user.googleSub) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleSub,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      affiliateId: user.affiliateId,
    });

    sendCallbackHtml({
      type: "google-auth-callback",
      token,
      user: publicUser(user),
    });
  } catch (err) {
    console.error("[auth] google callback failed:", err);
    sendCallbackHtml({ type: "google-auth-callback", error: "Google sign-in failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/dev-token
// ─────────────────────────────────────────────────────────────────────────────

router.post("/api/auth/dev-token", (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { tenantId, userId, role } = req.body;
  if (!tenantId || !userId) {
    res.status(400).json({ error: "tenantId and userId required" });
    return;
  }

  const token = generateDevToken(tenantId, userId, role ?? "admin");
  res.status(200).json({ token });
});

export { router as authRouter };
