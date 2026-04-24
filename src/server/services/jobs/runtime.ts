import type {
  AsyncJobResponse,
  JobQueryFilters,
  JobResource,
  QueueJobInput,
  RetryJobInput,
  RetryJobResponse,
} from "@/server/services/jobs/contracts";
import { createJobService, type JobService } from "@/server/services/jobs/job-service";
import { createWorkflowWorker, type WorkflowWorker } from "@/server/workflows";

export interface JobsRuntime {
  enqueueWorkflowJob(input: QueueJobInput): Promise<AsyncJobResponse>;
  getJob(jobId: string): Promise<JobResource>;
  listJobs(filters?: JobQueryFilters): Promise<{
    items: JobResource[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }>;
  retryJob(jobId: string, input?: RetryJobInput): Promise<RetryJobResponse>;
  cancelJob(jobId: string, reason?: string): Promise<JobResource>;
  processQueuedJobsOnce(limit?: number): Promise<string[]>;
}

export interface JobsRuntimeDependencies {
  jobService?: JobService;
  workflowWorker?: WorkflowWorker;
}

export function createJobsRuntime(dependencies: JobsRuntimeDependencies = {}): JobsRuntime {
  const jobService = dependencies.jobService ?? createJobService();
  const workflowWorker = dependencies.workflowWorker ?? createWorkflowWorker({ jobService });

  return {
    async enqueueWorkflowJob(input: QueueJobInput): Promise<AsyncJobResponse> {
      const result = await jobService.queueJob(input);

      if (result.created) {
        workflowWorker.dispatch(result.job.id);
      }

      return {
        jobId: result.job.id,
        status: result.job.status as AsyncJobResponse["status"],
        entityType: result.job.entityType as AsyncJobResponse["entityType"],
        entityId: result.job.entityId,
        idempotencyKey: result.job.idempotencyKey ?? undefined,
      };
    },

    async getJob(jobId: string): Promise<JobResource> {
      return jobService.getJob(jobId);
    },

    async listJobs(filters: JobQueryFilters = {}): Promise<{
      items: JobResource[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
      };
    }> {
      return jobService.listJobs(filters);
    },

    async retryJob(jobId: string, input: RetryJobInput = {}): Promise<RetryJobResponse> {
      const retried = await jobService.retryJob(jobId, input);
      workflowWorker.dispatch(retried.job.id);
      return retried.response;
    },

    async cancelJob(jobId: string, reason = "Canceled by user."): Promise<JobResource> {
      const job = await jobService.cancelJob(jobId, reason);
      return jobService.getJob(job.id);
    },

    async processQueuedJobsOnce(limit = 20): Promise<string[]> {
      return workflowWorker.processQueuedJobsOnce(limit);
    },
  };
}
