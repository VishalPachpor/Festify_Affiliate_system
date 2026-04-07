import { apiClient } from "./client";

export type Session = {
  userId: string;
  email: string;
  role: "organizer" | "affiliate" | "admin";
  tenantId: string;
  capabilities: string[];
};

export async function getSession(): Promise<Session | null> {
  try {
    return await apiClient<Session>("/auth/session");
  } catch {
    return null;
  }
}
