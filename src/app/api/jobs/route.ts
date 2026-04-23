import { NextResponse } from "next/server";
import {
  readJobEntityType,
  readJobStatus,
  readJobType,
  readPagination,
} from "@/app/api/jobs/route-helpers";
import { createRequestId, toErrorResponse } from "@/server/services/jobs/errors";
import { createJobsRuntime } from "@/server/services/jobs/runtime";

const jobsRuntime = createJobsRuntime();

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const pagination = readPagination(searchParams);
    const response = await jobsRuntime.listJobs({
      entityType: readJobEntityType(searchParams.get("entityType")),
      entityId: searchParams.get("entityId") ?? undefined,
      type: readJobType(searchParams.get("type")),
      status: readJobStatus(searchParams.get("status")),
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
