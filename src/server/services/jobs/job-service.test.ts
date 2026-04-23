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
      (left: JobRecord, right: JobRecord) => right.createdAt.getTime() - left.createdAt.getTime(),
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

test("job service enforces state transitions and idempotent queueing", async (): Promise<void> => {
  const repository = new InMemoryJobRepository();
  const jobService = createJobService({
    jobRepository: repository,
  });

  const firstQueued = await jobService.queueJob({
    type: JobType.REWRITE_DRAFT,
    entityType: JobEntityType.DRAFT,
    entityId: "draft_1",
    draftId: "draft_1",
    idempotencyKey: "rewrite:draft_1:AUTHOR_VOICE",
    input: {
      draftId: "draft_1",
      strategies: ["AUTHOR_VOICE"],
    },
  });
  const secondQueued = await jobService.queueJob({
    type: JobType.REWRITE_DRAFT,
    entityType: JobEntityType.DRAFT,
    entityId: "draft_1",
    draftId: "draft_1",
    idempotencyKey: "rewrite:draft_1:AUTHOR_VOICE",
    input: {
      draftId: "draft_1",
      strategies: ["AUTHOR_VOICE"],
    },
  });

  assert.equal(firstQueued.created, true);
  assert.equal(secondQueued.created, false);
  assert.equal(firstQueued.job.id, secondQueued.job.id);

  const running = await jobService.startJob(firstQueued.job.id);
  const succeeded = await jobService.completeJob(running.id, {
    rewriteIds: ["rw_1"],
  });

  assert.equal(running.status, JobStatus.RUNNING);
  assert.equal(succeeded.status, JobStatus.SUCCEEDED);

  await assert.rejects(
    async (): Promise<void> => {
      await jobService.retryJob(succeeded.id);
    },
    (error: unknown): boolean => {
      assert.equal(error instanceof JobsServiceError, true);
      assert.equal((error as JobsServiceError).code, "JOB_RETRY_NOT_ALLOWED");
      return true;
    },
  );
});

test("job service creates a fresh retry record for failed jobs", async (): Promise<void> => {
  const repository = new InMemoryJobRepository();
  const jobService = createJobService({
    jobRepository: repository,
  });
  const queued = await jobService.queueJob({
    type: JobType.EXPORT_PUBLISH_PACKAGE,
    entityType: JobEntityType.PUBLISH_PACKAGE,
    entityId: "package_1",
    publishPackageId: "package_1",
    input: {
      publishPackageId: "package_1",
    },
  });

  await jobService.startJob(queued.job.id);
  const failed = await jobService.failJob(queued.job.id, {
    code: "ASSET_UPLOAD_FAILED",
    message: "Upload failed.",
  });
  const retried = await jobService.retryJob(failed.id);

  assert.equal(failed.status, JobStatus.FAILED);
  assert.equal(retried.job.status, JobStatus.QUEUED);
  assert.equal(retried.job.retriesJobId, failed.id);
  assert.equal(retried.response.retriesJobId, failed.id);
});
