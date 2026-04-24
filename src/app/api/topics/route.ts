import { NextResponse } from "next/server";
import { createRequestId, toErrorResponse } from "@/features/topics/server/errors";
import {
  readPagination,
  readTopicSort,
  readTopicStatus,
} from "@/features/topics/server/route-helpers";
import { listTopics } from "@/features/topics/server/topics-service";

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const url = new URL(request.url);
    const pagination = readPagination(url.searchParams);
    const response = await listTopics({
      status: readTopicStatus(url.searchParams.get("status")),
      theme: url.searchParams.get("theme"),
      keyword: url.searchParams.get("keyword"),
      sortBy: readTopicSort(url.searchParams.get("sortBy")),
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
