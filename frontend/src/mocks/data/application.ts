import type { ApplicationStatus } from "@/modules/application/types";

// Mutable mock store — persists status changes within the session.
let currentStatus: ApplicationStatus = "approved";

export function getMockApplicationStatus(): ApplicationStatus {
  return currentStatus;
}

export function setMockApplicationStatus(status: ApplicationStatus): void {
  currentStatus = status;
}
