import { z } from "zod";
import { apiClient } from "@/services/api/client";

const signingUrlResponseSchema = z.object({
  url: z.string().url(),
});

export async function createMouSigningUrl(applicationId: string): Promise<string> {
  const raw = await apiClient<unknown>(`/mou/${applicationId}/signing-url`, {
    method: "POST",
  });
  return signingUrlResponseSchema.parse(raw).url;
}
