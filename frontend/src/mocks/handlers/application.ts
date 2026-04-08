import { delay } from "../utils";
import { getMockApplicationStatus, setMockApplicationStatus } from "../data/application";
import { applicationStatusResponseSchema } from "@/modules/application/types";

export async function mockGetApplicationStatus() {
  await delay();
  return applicationStatusResponseSchema.parse({
    status: getMockApplicationStatus(),
  });
}

export async function mockSubmitApplication() {
  await delay();
  setMockApplicationStatus("pending");
  return { success: true };
}
