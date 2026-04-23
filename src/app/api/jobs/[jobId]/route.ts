import { NextResponse } from "next/server";
import { createRequestId, toErrorResponse } from "@/server/services/jobs/errors";
import { createJobsRuntime } from "@/server/services/jobs/runtime";

const jobsRuntime = createJobsRuntime();

type JobRouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, context: JobRouteContext): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    const { jobId } = await context.params;
    const response = await jobsRuntime.getJob(jobId);

    return NextResponse.json(response);
  } catch (error: unknown) {
    return toErrorResponse(error, requestId);
  }
}
