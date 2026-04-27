import { z } from "zod";
import { apiClient } from "@/services/api/client";

export const mouStatusResponseSchema = z.object({
  applicationId: z.string(),
  applicationStatus: z.enum([
    "pending",
    "approved_pending_mou",
    "approved",
    "rejected",
  ]),
  mouStatus: z.enum([
    "created",
    "sent",
    "viewed",
    "signed",
    "declined",
    "expired",
    "voided",
    "failed",
  ]).nullable(),
  signedAt: z.string().nullable(),
  signerEmail: z.string().nullable(),
  signerName: z.string().nullable(),
  hasDocument: z.boolean(),
});

export type MouStatusResponse = z.infer<typeof mouStatusResponseSchema>;

export async function getMouStatus(applicationId: string): Promise<MouStatusResponse> {
  const raw = await apiClient<unknown>(`/mou/${applicationId}/status`);
  return mouStatusResponseSchema.parse(raw);
}
