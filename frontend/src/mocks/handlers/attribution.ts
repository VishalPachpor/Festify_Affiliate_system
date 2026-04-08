import { delay } from "../utils";
import {
  mockAttributionSummary,
  mockSourceBreakdown,
  mockFailureReasons,
  mockAttributionTrend,
} from "../data/attribution";
import {
  attributionSummarySchema,
  sourceBreakdownResponseSchema,
  failureReasonsResponseSchema,
  attributionTrendResponseSchema,
} from "@/modules/attribution-insights/types";

export async function mockGetAttributionSummary() {
  await delay();
  return attributionSummarySchema.parse(mockAttributionSummary);
}

export async function mockGetSourceBreakdown() {
  await delay();
  return sourceBreakdownResponseSchema.parse(mockSourceBreakdown);
}

export async function mockGetFailureReasons() {
  await delay();
  return failureReasonsResponseSchema.parse(mockFailureReasons);
}

export async function mockGetAttributionTrends() {
  await delay();
  return attributionTrendResponseSchema.parse(mockAttributionTrend);
}
