import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/review/server/errors";
import { getReviewDetail } from "@/features/review/server/review-service";

type ReviewRouteContext = {
  params: Promise<{
    reviewTaskId: string;
  }>;
};

export async function GET(_request: Request, context: ReviewRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { reviewTaskId } = await context.params;
    const detail = await getReviewDetail(reviewTaskId);

    return NextResponse.json(detail);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
