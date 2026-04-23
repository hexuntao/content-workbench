import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/review/server/errors";
import { requestChangesForReviewTask } from "@/features/review/server/review-service";
import { readBoolean, readJsonRecord, readString } from "@/features/review/server/route-helpers";
import type { ReviewChecklistState } from "@/features/review/types";

type ReviewRouteContext = {
  params: Promise<{
    reviewTaskId: string;
  }>;
};

function readChecklist(body: Record<string, unknown>): ReviewChecklistState {
  const rawChecklist =
    typeof body.checklist === "object" && body.checklist !== null && !Array.isArray(body.checklist)
      ? (body.checklist as Record<string, unknown>)
      : {};

  return {
    factsChecked: readBoolean(rawChecklist.factsChecked) ?? false,
    argumentClear: readBoolean(rawChecklist.argumentClear) ?? false,
    voiceConsistent: readBoolean(rawChecklist.voiceConsistent) ?? false,
    channelReady: readBoolean(rawChecklist.channelReady) ?? false,
    aiClicheFree: readBoolean(rawChecklist.aiClicheFree) ?? false,
  };
}

export async function POST(request: Request, context: ReviewRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { reviewTaskId } = await context.params;
    const body = await readJsonRecord(request);
    const detail = await requestChangesForReviewTask(reviewTaskId, {
      comments: readString(body.comments) ?? "",
      checklist: readChecklist(body),
    });

    return NextResponse.json(detail);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
