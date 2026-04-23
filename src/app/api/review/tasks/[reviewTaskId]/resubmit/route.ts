import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/review/server/errors";
import { resubmitReviewTask } from "@/features/review/server/review-service";
import { readJsonRecord, readString } from "@/features/review/server/route-helpers";

type ReviewRouteContext = {
  params: Promise<{
    reviewTaskId: string;
  }>;
};

export async function POST(request: Request, context: ReviewRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { reviewTaskId } = await context.params;
    const body = await readJsonRecord(request);
    const detail = await resubmitReviewTask(reviewTaskId, {
      draftId: readString(body.draftId) ?? "",
      newRewriteId: readString(body.newRewriteId),
    });

    return NextResponse.json(detail);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
