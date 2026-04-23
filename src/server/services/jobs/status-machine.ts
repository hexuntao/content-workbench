import { JobStatus } from "@prisma/client";
import { JobsServiceError } from "@/server/services/jobs/errors";

export type JobEvent =
  | "queueJob"
  | "startJob"
  | "completeJob"
  | "failJob"
  | "cancelJob"
  | "retryJob";

const jobTransitions: Record<JobStatus, Partial<Record<JobEvent, JobStatus>>> = {
  [JobStatus.QUEUED]: {
    startJob: JobStatus.RUNNING,
    cancelJob: JobStatus.CANCELED,
  },
  [JobStatus.RUNNING]: {
    completeJob: JobStatus.SUCCEEDED,
    failJob: JobStatus.FAILED,
    cancelJob: JobStatus.CANCELED,
  },
  [JobStatus.SUCCEEDED]: {},
  [JobStatus.FAILED]: {
    retryJob: JobStatus.QUEUED,
  },
  [JobStatus.CANCELED]: {},
};

export function transitionJobStatus(currentStatus: JobStatus, event: JobEvent): JobStatus {
  const nextStatus = jobTransitions[currentStatus][event];

  if (!nextStatus) {
    throw new JobsServiceError("JOB_STATUS_INVALID", "Job is not in a valid state.", 409, {
      currentStatus,
      event,
    });
  }

  return nextStatus;
}
