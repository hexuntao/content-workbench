import {
  type DraftStatus,
  type Prisma,
  type PublishStatus,
  ReviewStatus,
  type RewriteStrategy,
} from "@prisma/client";
import type { DatabaseClient } from "@/server/db";
import { prisma } from "@/server/db";
import {
  buildPaginationArgs,
  createPaginatedResult,
  type PaginatedResult,
  type PaginationInput,
} from "@/server/repositories/shared";

export interface ReviewQueueFilters extends PaginationInput {
  status?: ReviewStatus;
  reviewerEmail?: string;
}

export interface ReviewDraftSummary {
  id: string;
  title: string;
  status: DraftStatus;
  currentRewriteId: string | null;
}

export interface ReviewTaskSummary {
  id: string;
  draftId: string;
  reviewerEmail: string | null;
  status: ReviewStatus;
  checklist: Prisma.JsonValue | null;
  comments: string | null;
  decidedAt: Date | null;
  draft: ReviewDraftSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewTaskDetail extends ReviewTaskSummary {
  currentRewrite: {
    id: string;
    title: string | null;
    strategy: RewriteStrategy;
  } | null;
  publishPackages: Array<{
    id: string;
    channel: string;
    status: PublishStatus;
  }>;
}

export interface CreateReviewTaskInput {
  id?: string;
  draftId: string;
  reviewerEmail?: string | null;
  status?: ReviewStatus;
  checklist?: Prisma.InputJsonValue;
  comments?: string | null;
  decidedAt?: Date | null;
}

export interface UpdateReviewTaskInput {
  reviewerEmail?: string | null;
  status?: ReviewStatus;
  checklist?: Prisma.InputJsonValue;
  comments?: string | null;
  decidedAt?: Date | null;
}

export interface ReviewRepository {
  create(input: CreateReviewTaskInput): Promise<ReviewTaskDetail>;
  update(reviewTaskId: string, input: UpdateReviewTaskInput): Promise<ReviewTaskDetail>;
  getById(reviewTaskId: string): Promise<ReviewTaskDetail | null>;
  list(filters?: ReviewQueueFilters): Promise<PaginatedResult<ReviewTaskSummary>>;
  listByDraftId(draftId: string): Promise<ReviewTaskSummary[]>;
  findPendingByDraftId(draftId: string): Promise<ReviewTaskSummary | null>;
}

const reviewSummarySelect = {
  id: true,
  draftId: true,
  reviewerEmail: true,
  status: true,
  checklist: true,
  comments: true,
  decidedAt: true,
  createdAt: true,
  updatedAt: true,
  draft: {
    select: {
      id: true,
      title: true,
      status: true,
      currentRewriteId: true,
    },
  },
} satisfies Prisma.ReviewTaskSelect;

const reviewDetailSelect = {
  ...reviewSummarySelect,
  draft: {
    select: {
      id: true,
      title: true,
      status: true,
      currentRewriteId: true,
      currentRewrite: {
        select: {
          id: true,
          title: true,
          strategy: true,
        },
      },
      publishPackages: {
        orderBy: {
          channel: "asc",
        },
        select: {
          id: true,
          channel: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.ReviewTaskSelect;

type ReviewSummaryRecord = Prisma.ReviewTaskGetPayload<{
  select: typeof reviewSummarySelect;
}>;

type ReviewDetailRecord = Prisma.ReviewTaskGetPayload<{
  select: typeof reviewDetailSelect;
}>;

function mapReviewSummary(record: ReviewSummaryRecord): ReviewTaskSummary {
  return {
    id: record.id,
    draftId: record.draftId,
    reviewerEmail: record.reviewerEmail,
    status: record.status,
    checklist: record.checklist,
    comments: record.comments,
    decidedAt: record.decidedAt,
    draft: {
      id: record.draft.id,
      title: record.draft.title,
      status: record.draft.status,
      currentRewriteId: record.draft.currentRewriteId,
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapReviewDetail(record: ReviewDetailRecord): ReviewTaskDetail {
  return {
    ...mapReviewSummary(record),
    currentRewrite: record.draft.currentRewrite
      ? {
          id: record.draft.currentRewrite.id,
          title: record.draft.currentRewrite.title,
          strategy: record.draft.currentRewrite.strategy,
        }
      : null,
    publishPackages: record.draft.publishPackages.map((publishPackage) => ({
      id: publishPackage.id,
      channel: publishPackage.channel,
      status: publishPackage.status,
    })),
  };
}

function buildReviewWhere(filters: ReviewQueueFilters): Prisma.ReviewTaskWhereInput {
  return {
    status: filters.status,
    reviewerEmail: filters.reviewerEmail,
  };
}

export function createReviewRepository(database: DatabaseClient = prisma): ReviewRepository {
  return {
    async create(input: CreateReviewTaskInput): Promise<ReviewTaskDetail> {
      const record = await database.reviewTask.create({
        data: {
          id: input.id,
          draftId: input.draftId,
          reviewerEmail: input.reviewerEmail,
          status: input.status,
          checklist: input.checklist,
          comments: input.comments,
          decidedAt: input.decidedAt,
        },
        select: reviewDetailSelect,
      });

      return mapReviewDetail(record);
    },

    async update(reviewTaskId: string, input: UpdateReviewTaskInput): Promise<ReviewTaskDetail> {
      const record = await database.reviewTask.update({
        where: {
          id: reviewTaskId,
        },
        data: {
          reviewerEmail: input.reviewerEmail,
          status: input.status,
          checklist: input.checklist,
          comments: input.comments,
          decidedAt: input.decidedAt,
        },
        select: reviewDetailSelect,
      });

      return mapReviewDetail(record);
    },

    async getById(reviewTaskId: string): Promise<ReviewTaskDetail | null> {
      const record = await database.reviewTask.findUnique({
        where: {
          id: reviewTaskId,
        },
        select: reviewDetailSelect,
      });

      return record ? mapReviewDetail(record) : null;
    },

    async list(filters: ReviewQueueFilters = {}): Promise<PaginatedResult<ReviewTaskSummary>> {
      const pagination = buildPaginationArgs(filters);
      const where = buildReviewWhere(filters);
      const records = await database.reviewTask.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
        select: reviewSummarySelect,
      });
      const total = await database.reviewTask.count({ where });

      return createPaginatedResult(records.map(mapReviewSummary), total, pagination);
    },

    async listByDraftId(draftId: string): Promise<ReviewTaskSummary[]> {
      const records = await database.reviewTask.findMany({
        where: {
          draftId,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: reviewSummarySelect,
      });

      return records.map(mapReviewSummary);
    },

    async findPendingByDraftId(draftId: string): Promise<ReviewTaskSummary | null> {
      const record = await database.reviewTask.findFirst({
        where: {
          draftId,
          status: ReviewStatus.PENDING,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: reviewSummarySelect,
      });

      return record ? mapReviewSummary(record) : null;
    },
  };
}
