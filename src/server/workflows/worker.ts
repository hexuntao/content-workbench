import { JobStatus, type Prisma } from "@prisma/client";
import { createJobRepository, type JobRecord, type JobRepository } from "@/server/repositories";
import { JobsServiceError } from "@/server/services/jobs/errors";
import { createJobService, type JobService } from "@/server/services/jobs/job-service";
import { runWorkflowForJob } from "@/server/workflows/shared";

export interface WorkflowWorker {
  dispatch(jobId: string): void;
  execute(jobId: string): Promise<void>;
  processQueuedJobsOnce(limit?: number): Promise<string[]>;
}

export interface WorkflowWorkerDependencies {
  jobService?: JobService;
  jobRepository?: JobRepository;
  runWorkflow?: (job: JobRecord) => Promise<unknown>;
}

function toWorkflowOutputValue(output: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(output)) as Prisma.InputJsonValue;
}

function mapFailure(error: unknown): { code: string; message: string } {
  if (error instanceof JobsServiceError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "UNEXPECTED_WORKFLOW_FAILURE",
    message: "Workflow execution failed unexpectedly.",
  };
}

export function createWorkflowWorker(
  dependencies: WorkflowWorkerDependencies = {},
): WorkflowWorker {
  const jobRepository = dependencies.jobRepository ?? createJobRepository();
  const jobService = dependencies.jobService ?? createJobService({ jobRepository });
  const workflowRunner = dependencies.runWorkflow ?? runWorkflowForJob;

  return {
    dispatch(jobId: string): void {
      queueMicrotask(() => {
        void this.execute(jobId);
      });
    },

    async execute(jobId: string): Promise<void> {
      const currentJob = await jobService.getJobRecord(jobId);

      if (currentJob.status !== JobStatus.QUEUED) {
        return;
      }

      await jobService.startJob(jobId);

      try {
        const latestJob = await jobService.getJobRecord(jobId);
        const output = await workflowRunner(latestJob);
        await jobService.completeJob(jobId, toWorkflowOutputValue(output));
      } catch (error: unknown) {
        await jobService.failJob(jobId, mapFailure(error));
      }
    },

    async processQueuedJobsOnce(limit = 20): Promise<string[]> {
      const queuedJobs = await jobRepository.list({
        status: JobStatus.QUEUED,
        page: 1,
        pageSize: limit,
      });
      const processedJobIds: string[] = [];

      for (const job of queuedJobs.items) {
        await this.execute(job.id);
        processedJobIds.push(job.id);
      }

      return processedJobIds;
    },
  };
}
