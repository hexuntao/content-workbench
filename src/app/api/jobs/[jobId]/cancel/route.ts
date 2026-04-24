import { NextResponse } from "next/server";
import { readJsonRecord } from "@/features/drafts/server/route-helpers";
import { createRequestId, toErrorResponse } from "@/server/services/jobs/errors";
import { createJobsRuntime } from "@/server/services/jobs/runtime";

const jobsRuntime = createJobsRuntime();

type JobCancelRouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function POST(
  request: Request,
  context: JobCancelRouteContext,
): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { jobId } = await context.params;
    const body = await readJsonRecord(request);
    const reason =
      typeof body.reason === "string" && body.reason.length > 0 ? body.reason : undefined;
    const response = await jobsRuntime.cancelJob(jobId, reason);

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
