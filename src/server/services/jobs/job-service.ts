import { JobStatus, type Prisma } from "@prisma/client";
import {
  createJobRepository,
  type JobRecord,
  type JobRepository,
  type UpdateJobInput,
} from "@/server/repositories";
import {
  type AsyncJobResponse,
  type JobQueryFilters,
  type JobResource,
  mapJobListResult,
  mapJobRecord,
  type QueueJobInput,
  type RetryJobInput,
  type RetryJobResponse,
} from "@/server/services/jobs/contracts";
import { JobsServiceError } from "@/server/services/jobs/errors";
import { transitionJobStatus } from "@/server/services/jobs/status-machine";

export interface JobService {
  queueJob(input: QueueJobInput): Promise<{ job: JobRecord; created: boolean }>;
  getJobRecord(jobId: string): Promise<JobRecord>;
  getJob(jobId: string): Promise<JobResource>;
  listJobs(filters?: JobQueryFilters): Promise<ReturnType<typeof mapJobListResult>>;
  startJob(jobId: string): Promise<JobRecord>;
  completeJob(jobId: string, output: Prisma.InputJsonValue): Promise<JobRecord>;
  failJob(jobId: string, error: { code: string; message: string }): Promise<JobRecord>;
  cancelJob(jobId: string, reason: string): Promise<JobRecord>;
  retryJob(
    jobId: string,
    input?: RetryJobInput,
  ): Promise<{ job: JobRecord; response: RetryJobResponse }>;
}

export interface JobServiceDependencies {
  jobRepository?: JobRepository;
}

function buildJobResponse(job: JobRecord): AsyncJobResponse {
  return {
    jobId: job.id,
    status: job.status as JobStatus,
    entityType: job.entityType as QueueJobInput["entityType"],
    entityId: job.entityId,
    idempotencyKey: job.idempotencyKey ?? undefined,
  };
}

function toUpdateInput(input: UpdateJobInput): UpdateJobInput {
  return input;
}

export function createJobService(dependencies: JobServiceDependencies = {}): JobService {
  const jobRepository = dependencies.jobRepository ?? createJobRepository();

  async function getJobRecord(jobId: string): Promise<JobRecord> {
    const job = await jobRepository.getById(jobId);

    if (job === null) {
      throw new JobsServiceError("JOB_NOT_FOUND", "Job not found.", 404, {
        jobId,
      });
    }

    return job;
  }

  return {
    async queueJob(input: QueueJobInput): Promise<{ job: JobRecord; created: boolean }> {
      if (input.idempotencyKey) {
        const activeJob = await jobRepository.findActiveByIdempotencyKey(input.idempotencyKey);

        if (activeJob) {
          return {
            job: activeJob,
            created: false,
          };
        }
      }

      const job = await jobRepository.create({
        id: `job_${crypto.randomUUID()}`,
        type: input.type,
        status: JobStatus.QUEUED,
        entityType: input.entityType,
        entityId: input.entityId,
        topicClusterId: input.topicClusterId,
        draftId: input.draftId,
        reviewTaskId: input.reviewTaskId,
        publishPackageId: input.publishPackageId,
        idempotencyKey: input.idempotencyKey,
        triggeredBy: input.triggeredBy,
        input: input.input,
      });

      return {
        job,
        created: true,
      };
    },

    async getJobRecord(jobId: string): Promise<JobRecord> {
      return getJobRecord(jobId);
    },

    async getJob(jobId: string): Promise<JobResource> {
      return mapJobRecord(await getJobRecord(jobId));
    },

    async listJobs(filters: JobQueryFilters = {}): Promise<ReturnType<typeof mapJobListResult>> {
      const result = await jobRepository.list(filters);
      return mapJobListResult(result);
    },

    async startJob(jobId: string): Promise<JobRecord> {
      const job = await getJobRecord(jobId);
      const nextStatus = transitionJobStatus(job.status as JobStatus, "startJob");

      return jobRepository.update(
        jobId,
        toUpdateInput({
          status: nextStatus,
          startedAt: job.startedAt ?? new Date(),
          errorCode: null,
          errorMessage: null,
        }),
      );
    },

    async completeJob(jobId: string, output: Prisma.InputJsonValue): Promise<JobRecord> {
      const job = await getJobRecord(jobId);
      const nextStatus = transitionJobStatus(job.status as JobStatus, "completeJob");

      return jobRepository.update(
        jobId,
        toUpdateInput({
          status: nextStatus,
          output,
          finishedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        }),
      );
    },

    async failJob(jobId: string, error: { code: string; message: string }): Promise<JobRecord> {
      const job = await getJobRecord(jobId);
      const nextStatus = transitionJobStatus(job.status as JobStatus, "failJob");

      return jobRepository.update(
        jobId,
        toUpdateInput({
          status: nextStatus,
          finishedAt: new Date(),
          errorCode: error.code,
          errorMessage: error.message,
        }),
      );
    },

    async cancelJob(jobId: string, reason: string): Promise<JobRecord> {
      const job = await getJobRecord(jobId);
      const nextStatus = transitionJobStatus(job.status as JobStatus, "cancelJob");

      return jobRepository.update(
        jobId,
        toUpdateInput({
          status: nextStatus,
          finishedAt: new Date(),
          errorCode: "JOB_CANCELED",
          errorMessage: reason,
        }),
      );
    },

    async retryJob(
      jobId: string,
      input: RetryJobInput = {},
    ): Promise<{ job: JobRecord; response: RetryJobResponse }> {
      const originalJob = await getJobRecord(jobId);

      if ((originalJob.status as JobStatus) !== JobStatus.FAILED) {
        throw new JobsServiceError(
          "JOB_RETRY_NOT_ALLOWED",
          "Only failed jobs can be retried.",
          409,
          {
            jobId,
            currentStatus: originalJob.status,
          },
        );
      }

      transitionJobStatus(originalJob.status as JobStatus, "retryJob");

      const retriedJob = await jobRepository.create({
        id: `job_${crypto.randomUUID()}`,
        type: originalJob.type as QueueJobInput["type"],
        status: JobStatus.QUEUED,
        entityType: originalJob.entityType as QueueJobInput["entityType"],
        entityId: originalJob.entityId,
        topicClusterId:
          originalJob.entityType === "TOPIC_CLUSTER" ? originalJob.entityId : undefined,
        draftId: originalJob.entityType === "DRAFT" ? originalJob.entityId : undefined,
        reviewTaskId: originalJob.entityType === "REVIEW_TASK" ? originalJob.entityId : undefined,
        publishPackageId:
          originalJob.entityType === "PUBLISH_PACKAGE" ? originalJob.entityId : undefined,
        idempotencyKey: originalJob.idempotencyKey,
        triggeredBy: input.triggeredBy ?? originalJob.triggeredBy,
        input: originalJob.input ?? undefined,
        retriesJobId: originalJob.id,
      });

      return {
        job: retriedJob,
        response: {
          jobId: retriedJob.id,
          status: retriedJob.status as JobStatus,
          retriesJobId: originalJob.id,
        },
      };
    },
  };
}

export { buildJobResponse };
