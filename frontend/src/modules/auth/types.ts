import { z } from "zod";

// ── Domain types ─────────────────────────────────────────

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: "organizer" | "affiliate" | "admin";
  tenantId: string;
  createdAt: string;
};

export type Session = {
  userId: string;
  email: string;
  role: User["role"];
  tenantId: string;
  capabilities: string[];
};

// ── API response schemas (runtime validation) ────────────

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string(),
    role: z.enum(["organizer", "affiliate", "admin"]),
    tenantId: z.string(),
    createdAt: z.string(),
  }),
  token: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const verifyEmailResponseSchema = z.object({
  verified: z.boolean(),
  message: z.string(),
});

export type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>;

export const resendCodeResponseSchema = z.object({
  sent: z.boolean(),
  message: z.string(),
});

export type ResendCodeResponse = z.infer<typeof resendCodeResponseSchema>;

export const sessionSchema = z.object({
  userId: z.string(),
  email: z.string(),
  role: z.enum(["organizer", "affiliate", "admin"]),
  tenantId: z.string(),
  capabilities: z.array(z.string()),
});
