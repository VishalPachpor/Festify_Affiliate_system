import { apiClient } from "@/services/api/client";
import { milestoneProgressSchema, type MilestoneProgress } from "../types";

export async function getMilestoneProgress(): Promise<MilestoneProgress> {
  const raw = await apiClient<unknown>("/milestones/progress");
  return milestoneProgressSchema.parse(raw);
}
