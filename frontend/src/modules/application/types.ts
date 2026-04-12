import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "not_applied",
  "pending",
  "approved",
  "rejected",
]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const applicationStatusResponseSchema = z.object({
  status: applicationStatusSchema,
});

export type ApplicationStatusResponse = z.infer<typeof applicationStatusResponseSchema>;

export const applicationSubmissionSchema = z.object({
  firstName: z.string().min(1),
  email: z.string().email(),
  socialProfiles: z.string().optional(),
  audienceSize: z.string().optional(),
  experience: z.string().optional(),
  fitReason: z.string().min(1),
  requestedCode: z.string().optional(),
});

export type ApplicationSubmission = z.infer<typeof applicationSubmissionSchema>;
