import { type JobEntityType, JobStatus, type JobType, type Prisma } from "@prisma/client";
import type { DatabaseClient } from "@/server/db";
import { prisma } from "@/server/db";
import {
  buildPaginationArgs,
  createPaginatedResult,
  type PaginatedResult,
  type PaginationInput,
} from "@/server/repositories/shared";

export interface JobFilters extends PaginationInput {
  entityType?: JobEntityType;
  entityId?: string;
  type?: JobType;
  status?: JobStatus;
}

export interface JobRecord {
  id: string;
  type: string;
  status: string;
  entityType: string;
  entityId: string;
  idempotencyKey: string | null;
  triggeredBy: string | null;
  input: Prisma.JsonValue | null;
  output: Prisma.JsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  retriesJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobInput {
  id?: string;
  type: JobType;
  status?: JobStatus;
  entityType: JobEntityType;
  entityId: string;
  topicClusterId?: string;
  draftId?: string;
  reviewTaskId?: string;
  publishPackageId?: string;
  idempotencyKey?: string | null;
  triggeredBy?: string | null;
  input?: Prisma.InputJsonValue;
  output?: Prisma.InputJsonValue;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  retriesJobId?: string | null;
}

export interface UpdateJobInput {
  status?: JobStatus;
  output?: Prisma.InputJsonValue;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  retriesJobId?: string | null;
}

export interface JobRepository {
  create(input: CreateJobInput): Promise<JobRecord>;
  update(jobId: string, input: UpdateJobInput): Promise<JobRecord>;
  getById(jobId: string): Promise<JobRecord | null>;
  list(filters?: JobFilters): Promise<PaginatedResult<JobRecord>>;
  findActiveByIdempotencyKey(idempotencyKey: string): Promise<JobRecord | null>;
}

const jobSelect = {
  id: true,
  type: true,
  status: true,
  entityType: true,
  entityId: true,
  idempotencyKey: true,
  triggeredBy: true,
  input: true,
  output: true,
  errorCode: true,
  errorMessage: true,
  startedAt: true,
  finishedAt: true,
  retriesJobId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.JobSelect;

type JobSelectRecord = Prisma.JobGetPayload<{
  select: typeof jobSelect;
}>;

function mapJob(record: JobSelectRecord): JobRecord {
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    entityType: record.entityType,
    entityId: record.entityId,
    idempotencyKey: record.idempotencyKey,
    triggeredBy: record.triggeredBy,
    input: record.input,
    output: record.output,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    retriesJobId: record.retriesJobId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildJobWhere(filters: JobFilters): Prisma.JobWhereInput {
  return {
    entityType: filters.entityType,
    entityId: filters.entityId,
    type: filters.type,
    status: filters.status,
  };
}

export function createJobRepository(database: DatabaseClient = prisma): JobRepository {
  return {
    async create(input: CreateJobInput): Promise<JobRecord> {
      const record = await database.job.create({
        data: {
          id: input.id,
          type: input.type,
          status: input.status,
          entityType: input.entityType,
          entityId: input.entityId,
          topicClusterId: input.topicClusterId,
          draftId: input.draftId,
          reviewTaskId: input.reviewTaskId,
          publishPackageId: input.publishPackageId,
          idempotencyKey: input.idempotencyKey,
          triggeredBy: input.triggeredBy,
          input: input.input,
          output: input.output,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
          retriesJobId: input.retriesJobId,
        },
        select: jobSelect,
      });

      return mapJob(record);
    },

    async update(jobId: string, input: UpdateJobInput): Promise<JobRecord> {
      const record = await database.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: input.status,
          output: input.output,
          errorCode: input.errorCode,
          errorMessage: input.errorMessage,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
          retriesJobId: input.retriesJobId,
        },
        select: jobSelect,
      });

      return mapJob(record);
    },

    async getById(jobId: string): Promise<JobRecord | null> {
      const record = await database.job.findUnique({
        where: {
          id: jobId,
        },
        select: jobSelect,
      });

      return record ? mapJob(record) : null;
    },

    async list(filters: JobFilters = {}): Promise<PaginatedResult<JobRecord>> {
      const pagination = buildPaginationArgs(filters);
      const where = buildJobWhere(filters);
      const records = await database.job.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
        select: jobSelect,
      });
      const total = await database.job.count({ where });

      return createPaginatedResult(records.map(mapJob), total, pagination);
    },

    async findActiveByIdempotencyKey(idempotencyKey: string): Promise<JobRecord | null> {
      const record = await database.job.findFirst({
        where: {
          idempotencyKey,
          status: {
            in: [JobStatus.QUEUED, JobStatus.RUNNING],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: jobSelect,
      });

      return record ? mapJob(record) : null;
    },
  };
}
