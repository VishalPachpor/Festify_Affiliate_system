import { delay } from "../utils";
import { mockMilestoneProgress, mockMilestoneTiers } from "../data/milestones";
import { milestoneProgressSchema, milestoneTiersResponseSchema } from "@/modules/milestones/types";

export async function mockGetMilestoneProgress() {
  await delay();
  return milestoneProgressSchema.parse(mockMilestoneProgress);
}

export async function mockGetMilestoneTiers() {
  await delay();
  return milestoneTiersResponseSchema.parse(mockMilestoneTiers);
}
