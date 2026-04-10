import { z } from "zod";

// ─── Domain types ────────────────────────────────────────────────────────────

export const userRoleSchema = z.enum(["admin", "affiliate"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: userRoleSchema,
  tenantId: z.string().nullable(),
  affiliateId: z.string().nullable(),
  emailVerified: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

// ─── API response schemas ────────────────────────────────────────────────────

export const sessionResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const signupResponseSchema = z.object({
  message: z.string(),
  email: z.string(),
});
export type SignupResponse = z.infer<typeof signupResponseSchema>;

export const meResponseSchema = z.object({
  user: userSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;
