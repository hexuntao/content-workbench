import { JobEntityType, JobStatus, JobType } from "@prisma/client";
import { JobsServiceError } from "@/server/services/jobs/errors";

function readPositiveInteger(value: string | null, fallback: number): number {
  if (value === null || value.length === 0) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new JobsServiceError(
      "INVALID_QUERY_PARAMS",
      "Query parameter must be a positive integer.",
      400,
      {
        value,
      },
    );
  }

  return parsed;
}

export function readJobEntityType(value: string | null): JobEntityType | undefined {
  if (value === null || value.length === 0) {
    return undefined;
  }

  if (Object.values(JobEntityType).includes(value as JobEntityType)) {
    return value as JobEntityType;
  }

  throw new JobsServiceError("INVALID_QUERY_PARAMS", "Invalid entityType query parameter.", 400, {
    entityType: value,
  });
}

export function readJobStatus(value: string | null): JobStatus | undefined {
  if (value === null || value.length === 0) {
    return undefined;
  }

  if (Object.values(JobStatus).includes(value as JobStatus)) {
    return value as JobStatus;
  }

  throw new JobsServiceError("INVALID_QUERY_PARAMS", "Invalid status query parameter.", 400, {
    status: value,
  });
}

export function readJobType(value: string | null): JobType | undefined {
  if (value === null || value.length === 0) {
    return undefined;
  }

  if (Object.values(JobType).includes(value as JobType)) {
    return value as JobType;
  }

  throw new JobsServiceError("INVALID_QUERY_PARAMS", "Invalid type query parameter.", 400, {
    type: value,
  });
}

export function readPagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
} {
  return {
    page: readPositiveInteger(searchParams.get("page"), 1),
    pageSize: readPositiveInteger(searchParams.get("pageSize"), 20),
  };
}
