import assert from "node:assert/strict";
import test from "node:test";
import { JobEntityType, JobStatus, JobType, type Prisma } from "@prisma/client";
import type {
  CreateJobInput,
  JobFilters,
  JobRecord,
  JobRepository,
  PaginatedResult,
  UpdateJobInput,
} from "@/server/repositories";
import { JobsServiceError } from "@/server/services/jobs/errors";
import { createJobService } from "@/server/services/jobs/job-service";
import { createJobsRuntime } from "@/server/services/jobs/runtime";
import { createWorkflowWorker } from "@/server/workflows";

class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, JobRecord>();

  async create(input: CreateJobInput): Promise<JobRecord> {
    const now = new Date();
    const record: JobRecord = {
      id: input.id ?? `job_${crypto.randomUUID()}`,
      type: input.type,
      status: input.status ?? JobStatus.QUEUED,
      entityType: input.entityType,
      entityId: input.entityId,
      idempotencyKey: input.idempotencyKey ?? null,
      triggeredBy: input.triggeredBy ?? null,
      input: (input.input as Prisma.JsonValue | undefined) ?? null,
      output: (input.output as Prisma.JsonValue | undefined) ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      startedAt: input.startedAt ?? null,
      finishedAt: input.finishedAt ?? null,
      retriesJobId: input.retriesJobId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(record.id, record);
    return record;
  }

  async update(jobId: string, input: UpdateJobInput): Promise<JobRecord> {
    const current = this.jobs.get(jobId);

    if (!current) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updated: JobRecord = {
      ...current,
      status: input.status ?? current.status,
      output: (input.output as Prisma.JsonValue | undefined) ?? current.output,
      errorCode: input.errorCode ?? current.errorCode,
      errorMessage: input.errorMessage ?? current.errorMessage,
      startedAt: input.startedAt ?? current.startedAt,
      finishedAt: input.finishedAt ?? current.finishedAt,
      retriesJobId: input.retriesJobId ?? current.retriesJobId,
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, updated);
    return updated;
  }

  async getById(jobId: string): Promise<JobRecord | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async list(filters: JobFilters = {}): Promise<PaginatedResult<JobRecord>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const filtered = [...this.jobs.values()].filter((job: JobRecord) => {
      return (
        (filters.entityType === undefined || job.entityType === filters.entityType) &&
        (filters.entityId === undefined || job.entityId === filters.entityId) &&
        (filters.type === undefined || job.type === filters.type) &&
        (filters.status === undefined || job.status === filters.status)
      );
    });
    const sorted = filtered.sort(
      (left: JobRecord, right: JobRecord) => left.createdAt.getTime() - right.createdAt.getTime(),
    );
    const start = (page - 1) * pageSize;

    return {
      items: sorted.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        total: sorted.length,
      },
    };
  }

  async findActiveByIdempotencyKey(idempotencyKey: string): Promise<JobRecord | null> {
    return (
      [...this.jobs.values()].find(
        (job: JobRecord) =>
          job.idempotencyKey === idempotencyKey &&
          (job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING),
      ) ?? null
    );
  }
}

test("workflow worker supports failed job retry and eventual success", async (): Promise<void> => {
  const repository = new InMemoryJobRepository();
  const jobService = createJobService({
    jobRepository: repository,
  });
  const attempts = new Map<string, number>();
  const worker = createWorkflowWorker({
    jobRepository: repository,
    jobService,
    runWorkflow: async (job: JobRecord): Promise<{ ok: true }> => {
      const currentAttempt = (attempts.get(job.entityId) ?? 0) + 1;
      attempts.set(job.entityId, currentAttempt);

      if (currentAttempt === 1) {
        throw new JobsServiceError("SOURCE_FETCH_FAILED", "Source fetch failed.", 502, {
          entityId: job.entityId,
        });
      }

      return {
        ok: true,
      };
    },
  });
  const manualWorker = {
    dispatch(_jobId: string): void {},
    execute(jobId: string): Promise<void> {
      return worker.execute(jobId);
    },
    processQueuedJobsOnce(limit?: number): Promise<string[]> {
      return worker.processQueuedJobsOnce(limit);
    },
  };
  const runtime = createJobsRuntime({
    jobService,
    workflowWorker: manualWorker,
  });

  const queued = await runtime.enqueueWorkflowJob({
    type: JobType.INGEST_SOURCE,
    entityType: JobEntityType.SOURCE,
    entityId: "source_1",
    input: {
      sourceId: "source_1",
    },
  });

  await worker.processQueuedJobsOnce();

  const failed = await runtime.getJob(queued.jobId);
  assert.equal(failed.status, JobStatus.FAILED);
  assert.equal(failed.errorCode, "SOURCE_FETCH_FAILED");

  const retried = await runtime.retryJob(queued.jobId);
  await worker.processQueuedJobsOnce();

  const succeeded = await runtime.getJob(retried.jobId);
  assert.equal(succeeded.status, JobStatus.SUCCEEDED);
  assert.equal(succeeded.retriesJobId, queued.jobId);
});
