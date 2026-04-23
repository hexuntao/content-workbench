import { DraftStatus, DraftType, type Prisma, type TopicStatus } from "@prisma/client";
import type { DatabaseClient } from "@/server/db";
import { prisma, runInTransaction } from "@/server/db";
import {
  buildPaginationArgs,
  createPaginatedResult,
  type PaginatedResult,
  type PaginationInput,
} from "@/server/repositories/shared";

export interface TopicListFilters extends PaginationInput {
  status?: TopicStatus;
  theme?: string;
  keyword?: string;
  sortBy?: "createdAt" | "totalScore" | "updatedAt";
}

export interface TopicMasterDraftSummary {
  id: string;
  title: string;
  status: DraftStatus;
  updatedAt: Date;
}

export interface TopicSummary {
  id: string;
  title: string;
  summary: string | null;
  keywords: string[];
  theme: string | null;
  trendScore: number;
  relevanceScore: number;
  editorialScore: number;
  totalScore: number;
  recommendedAngle: string | null;
  status: TopicStatus;
  sourceItemCount: number;
  currentMasterDraft: TopicMasterDraftSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicDetail extends TopicSummary {
  metadata: Prisma.JsonValue | null;
}

export interface TopicSourceItemRecord {
  id: string;
  title: string;
  url: string;
  author: string | null;
  publishedAt: Date | null;
  summary: string | null;
  rank: number;
  reason: string | null;
}

export interface CreateTopicClusterInput {
  id?: string;
  title: string;
  summary?: string | null;
  keywords: string[];
  theme?: string | null;
  trendScore?: number;
  relevanceScore?: number;
  editorialScore?: number;
  totalScore?: number;
  recommendedAngle?: string | null;
  status?: TopicStatus;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateTopicClusterInput {
  title?: string;
  summary?: string | null;
  keywords?: string[];
  theme?: string | null;
  trendScore?: number;
  relevanceScore?: number;
  editorialScore?: number;
  totalScore?: number;
  recommendedAngle?: string | null;
  status?: TopicStatus;
  metadata?: Prisma.InputJsonValue;
}

export interface TopicSourceLinkInput {
  sourceItemId: string;
  rank?: number;
  reason?: string | null;
}

export interface TopicRepository {
  create(input: CreateTopicClusterInput): Promise<TopicDetail>;
  update(topicId: string, input: UpdateTopicClusterInput): Promise<TopicDetail>;
  getById(topicId: string): Promise<TopicDetail | null>;
  list(filters?: TopicListFilters): Promise<PaginatedResult<TopicSummary>>;
  listSourceItems(topicId: string): Promise<TopicSourceItemRecord[]>;
  replaceSourceItems(topicId: string, sourceItems: TopicSourceLinkInput[]): Promise<void>;
  countActiveMasterDrafts(topicId: string): Promise<number>;
}

const activeMasterDraftSelect = {
  id: true,
  title: true,
  status: true,
  updatedAt: true,
} satisfies Prisma.DraftSelect;

const topicSummarySelect = {
  id: true,
  title: true,
  summary: true,
  keywords: true,
  theme: true,
  trendScore: true,
  relevanceScore: true,
  editorialScore: true,
  totalScore: true,
  recommendedAngle: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      sourceLinks: true,
    },
  },
  drafts: {
    where: {
      draftType: DraftType.MASTER,
      status: {
        not: DraftStatus.ARCHIVED,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 1,
    select: activeMasterDraftSelect,
  },
} satisfies Prisma.TopicClusterSelect;

const topicDetailSelect = {
  ...topicSummarySelect,
  metadata: true,
} satisfies Prisma.TopicClusterSelect;

const topicSourceItemsSelect = {
  rank: true,
  reason: true,
  sourceItem: {
    select: {
      id: true,
      title: true,
      url: true,
      author: true,
      publishedAt: true,
      summary: true,
    },
  },
} satisfies Prisma.TopicClusterSourceItemSelect;

type TopicSummaryRecord = Prisma.TopicClusterGetPayload<{
  select: typeof topicSummarySelect;
}>;

type TopicDetailRecord = Prisma.TopicClusterGetPayload<{
  select: typeof topicDetailSelect;
}>;

type TopicSourceItemLinkRecord = Prisma.TopicClusterSourceItemGetPayload<{
  select: typeof topicSourceItemsSelect;
}>;

function mapMasterDraft(
  record: TopicSummaryRecord["drafts"][number] | undefined,
): TopicMasterDraftSummary | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    title: record.title,
    status: record.status,
    updatedAt: record.updatedAt,
  };
}

function mapTopicSummary(record: TopicSummaryRecord): TopicSummary {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    keywords: record.keywords,
    theme: record.theme,
    trendScore: record.trendScore,
    relevanceScore: record.relevanceScore,
    editorialScore: record.editorialScore,
    totalScore: record.totalScore,
    recommendedAngle: record.recommendedAngle,
    status: record.status,
    sourceItemCount: record._count.sourceLinks,
    currentMasterDraft: mapMasterDraft(record.drafts[0]),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapTopicDetail(record: TopicDetailRecord): TopicDetail {
  return {
    ...mapTopicSummary(record),
    metadata: record.metadata,
  };
}

function mapTopicSourceItem(record: TopicSourceItemLinkRecord): TopicSourceItemRecord {
  return {
    id: record.sourceItem.id,
    title: record.sourceItem.title,
    url: record.sourceItem.url,
    author: record.sourceItem.author,
    publishedAt: record.sourceItem.publishedAt,
    summary: record.sourceItem.summary,
    rank: record.rank,
    reason: record.reason,
  };
}

function buildTopicWhere(filters: TopicListFilters): Prisma.TopicClusterWhereInput {
  return {
    status: filters.status,
    theme: filters.theme,
    keywords: filters.keyword
      ? {
          has: filters.keyword,
        }
      : undefined,
  };
}

function buildTopicOrderBy(
  sortBy: TopicListFilters["sortBy"],
): Prisma.TopicClusterOrderByWithRelationInput[] {
  if (sortBy === "createdAt") {
    return [{ createdAt: "desc" }];
  }

  if (sortBy === "updatedAt") {
    return [{ updatedAt: "desc" }];
  }

  return [{ totalScore: "desc" }, { updatedAt: "desc" }];
}

export function createTopicRepository(database: DatabaseClient = prisma): TopicRepository {
  return {
    async create(input: CreateTopicClusterInput): Promise<TopicDetail> {
      const record = await database.topicCluster.create({
        data: {
          id: input.id,
          title: input.title,
          summary: input.summary,
          keywords: input.keywords,
          theme: input.theme,
          trendScore: input.trendScore,
          relevanceScore: input.relevanceScore,
          editorialScore: input.editorialScore,
          totalScore: input.totalScore,
          recommendedAngle: input.recommendedAngle,
          status: input.status,
          metadata: input.metadata,
        },
        select: topicDetailSelect,
      });

      return mapTopicDetail(record);
    },

    async update(topicId: string, input: UpdateTopicClusterInput): Promise<TopicDetail> {
      const record = await database.topicCluster.update({
        where: {
          id: topicId,
        },
        data: {
          title: input.title,
          summary: input.summary,
          keywords: input.keywords,
          theme: input.theme,
          trendScore: input.trendScore,
          relevanceScore: input.relevanceScore,
          editorialScore: input.editorialScore,
          totalScore: input.totalScore,
          recommendedAngle: input.recommendedAngle,
          status: input.status,
          metadata: input.metadata,
        },
        select: topicDetailSelect,
      });

      return mapTopicDetail(record);
    },

    async getById(topicId: string): Promise<TopicDetail | null> {
      const record = await database.topicCluster.findUnique({
        where: {
          id: topicId,
        },
        select: topicDetailSelect,
      });

      return record ? mapTopicDetail(record) : null;
    },

    async list(filters: TopicListFilters = {}): Promise<PaginatedResult<TopicSummary>> {
      const pagination = buildPaginationArgs(filters);
      const where = buildTopicWhere(filters);
      const records = await database.topicCluster.findMany({
        where,
        orderBy: buildTopicOrderBy(filters.sortBy),
        skip: pagination.skip,
        take: pagination.take,
        select: topicSummarySelect,
      });
      const total = await database.topicCluster.count({ where });

      return createPaginatedResult(records.map(mapTopicSummary), total, pagination);
    },

    async listSourceItems(topicId: string): Promise<TopicSourceItemRecord[]> {
      const records = await database.topicClusterSourceItem.findMany({
        where: {
          topicClusterId: topicId,
        },
        orderBy: [{ rank: "asc" }, { sourceItem: { publishedAt: "desc" } }],
        select: topicSourceItemsSelect,
      });

      return records.map(mapTopicSourceItem);
    },

    async replaceSourceItems(topicId: string, sourceItems: TopicSourceLinkInput[]): Promise<void> {
      await runInTransaction(async (tx: Prisma.TransactionClient): Promise<void> => {
        await tx.topicClusterSourceItem.deleteMany({
          where: {
            topicClusterId: topicId,
          },
        });

        if (sourceItems.length === 0) {
          return;
        }

        await tx.topicClusterSourceItem.createMany({
          data: sourceItems.map((item: TopicSourceLinkInput) => ({
            topicClusterId: topicId,
            sourceItemId: item.sourceItemId,
            rank: item.rank ?? 0,
            reason: item.reason,
          })),
        });
      });
    },

    async countActiveMasterDrafts(topicId: string): Promise<number> {
      return database.draft.count({
        where: {
          topicClusterId: topicId,
          draftType: DraftType.MASTER,
          status: {
            not: DraftStatus.ARCHIVED,
          },
        },
      });
    },
  };
}
