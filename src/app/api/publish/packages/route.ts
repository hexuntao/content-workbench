import { NextResponse } from "next/server";

import { createRequestId, toErrorResponse } from "@/features/publish/server/errors";
import { listPublishPackages } from "@/features/publish/server/publish-service";

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const url = new URL(request.url);
    const response = await listPublishPackages({
      status: url.searchParams.get("status"),
      channel: url.searchParams.get("channel"),
      draftId: url.searchParams.get("draftId"),
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
