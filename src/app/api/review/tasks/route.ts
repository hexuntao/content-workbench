import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/review/server/errors";
import { createReviewTask, listReviewTasks } from "@/features/review/server/review-service";
import { readJsonRecord, readString } from "@/features/review/server/route-helpers";

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const url = new URL(request.url);
    const response = await listReviewTasks({
      status: url.searchParams.get("status"),
      reviewerEmail: url.searchParams.get("reviewerEmail"),
      page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
      pageSize: url.searchParams.get("pageSize")
        ? Number(url.searchParams.get("pageSize"))
        : undefined,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const body = await readJsonRecord(request);
    const detail = await createReviewTask({
      draftId: readString(body.draftId) ?? "",
      reviewerEmail: readString(body.reviewerEmail),
    });

    return NextResponse.json(detail, {
      status: 201,
    });
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
