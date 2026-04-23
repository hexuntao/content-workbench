import { NextResponse } from "next/server";
import { createRequestId, toErrorResponse } from "@/server/services/jobs/errors";
import { createJobsRuntime } from "@/server/services/jobs/runtime";

const jobsRuntime = createJobsRuntime();

type JobRetryRouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function POST(
  _request: Request,
  context: JobRetryRouteContext,
): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { jobId } = await context.params;
    const response = await jobsRuntime.retryJob(jobId);

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
