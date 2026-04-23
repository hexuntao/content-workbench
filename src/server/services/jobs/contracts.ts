import type { JobEntityType, JobStatus, JobType, Prisma } from "@prisma/client";
import type { JobFilters, JobRecord, PaginatedResult } from "@/server/repositories";

export interface JobResource {
  id: string;
  type: JobType;
  status: JobStatus;
  entityType: JobEntityType;
  entityId: string;
  idempotencyKey: string | null;
  triggeredBy: string | null;
  input: Prisma.JsonValue | null;
  output: Prisma.JsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  retriesJobId: string | null;
}

export interface JobListResponse {
  items: JobResource[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface AsyncJobResponse {
  jobId: string;
  status: JobStatus;
  entityType: JobEntityType;
  entityId: string;
  idempotencyKey?: string;
}

export interface RetryJobResponse {
  jobId: string;
  status: JobStatus;
  retriesJobId: string;
}

export interface QueueJobInput {
  type: JobType;
  entityType: JobEntityType;
  entityId: string;
  topicClusterId?: string;
  draftId?: string;
  reviewTaskId?: string;
  publishPackageId?: string;
  idempotencyKey?: string | null;
  triggeredBy?: string | null;
  input?: Prisma.InputJsonValue;
}

export interface RetryJobInput {
  triggeredBy?: string | null;
}

export interface JobQueryFilters extends JobFilters {}

export function mapJobRecord(record: JobRecord): JobResource {
  return {
    id: record.id,
    type: record.type as JobType,
    status: record.status as JobStatus,
    entityType: record.entityType as JobEntityType,
    entityId: record.entityId,
    idempotencyKey: record.idempotencyKey,
    triggeredBy: record.triggeredBy,
    input: record.input,
    output: record.output,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    startedAt: record.startedAt?.toISOString() ?? null,
    finishedAt: record.finishedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    retriesJobId: record.retriesJobId,
  };
}

export function mapJobListResult(result: PaginatedResult<JobRecord>): JobListResponse {
  return {
    items: result.items.map(mapJobRecord),
    pagination: result.pagination,
  };
}
