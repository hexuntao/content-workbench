import type { ChannelType, DraftStatus, Prisma, PublishStatus } from "@prisma/client";
import type { DatabaseClient } from "@/server/db";
import { prisma } from "@/server/db";
import {
  buildPaginationArgs,
  createPaginatedResult,
  type PaginatedResult,
  type PaginationInput,
} from "@/server/repositories/shared";

export interface PublishPackageFilters extends PaginationInput {
  status?: PublishStatus;
  channel?: ChannelType;
  draftId?: string;
}

export interface PublicationRecordDetail {
  id: string;
  channel: string;
  publishedUrl: string | null;
  publishedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishPackageSummary {
  id: string;
  draftId: string;
  channel: string;
  status: PublishStatus;
  title: string | null;
  summary: string | null;
  exportPath: string | null;
  draftUrl: string | null;
  updatedAt: Date;
}

export interface PublishPackageDetail extends PublishPackageSummary {
  content: string | null;
  contentFormat: string | null;
  metadata: Prisma.JsonValue | null;
  publication: PublicationRecordDetail | null;
  draft: {
    id: string;
    title: string;
    status: DraftStatus;
    currentRewriteId: string | null;
  };
  createdAt: Date;
}

export interface UpsertPublishPackageInput {
  id?: string;
  draftId: string;
  channel: ChannelType;
  status?: PublishStatus;
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  contentFormat?: string | null;
  exportPath?: string | null;
  draftUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdatePublishPackageInput {
  status?: PublishStatus;
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  contentFormat?: string | null;
  exportPath?: string | null;
  draftUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface UpsertPublicationRecordInput {
  id?: string;
  publishPackageId: string;
  channel: ChannelType;
  publishedUrl?: string | null;
  publishedAt?: Date | null;
  notes?: string | null;
}

export interface PublishRepository {
  getById(publishPackageId: string): Promise<PublishPackageDetail | null>;
  list(filters?: PublishPackageFilters): Promise<PaginatedResult<PublishPackageSummary>>;
  listByDraftId(draftId: string): Promise<PublishPackageSummary[]>;
  upsertByDraftAndChannel(input: UpsertPublishPackageInput): Promise<PublishPackageDetail>;
  update(publishPackageId: string, input: UpdatePublishPackageInput): Promise<PublishPackageDetail>;
  upsertPublicationRecord(input: UpsertPublicationRecordInput): Promise<PublishPackageDetail>;
}

const publicationSelect = {
  id: true,
  channel: true,
  publishedUrl: true,
  publishedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PublicationRecordSelect;

const publishSummarySelect = {
  id: true,
  draftId: true,
  channel: true,
  status: true,
  title: true,
  summary: true,
  exportPath: true,
  draftUrl: true,
  updatedAt: true,
} satisfies Prisma.PublishPackageSelect;

const publishDetailSelect = {
  ...publishSummarySelect,
  content: true,
  contentFormat: true,
  metadata: true,
  createdAt: true,
  publication: {
    select: publicationSelect,
  },
  draft: {
    select: {
      id: true,
      title: true,
      status: true,
      currentRewriteId: true,
    },
  },
} satisfies Prisma.PublishPackageSelect;

type PublishSummaryRecord = Prisma.PublishPackageGetPayload<{
  select: typeof publishSummarySelect;
}>;

type PublishDetailRecord = Prisma.PublishPackageGetPayload<{
  select: typeof publishDetailSelect;
}>;

function mapPublishSummary(record: PublishSummaryRecord): PublishPackageSummary {
  return {
    id: record.id,
    draftId: record.draftId,
    channel: record.channel,
    status: record.status,
    title: record.title,
    summary: record.summary,
    exportPath: record.exportPath,
    draftUrl: record.draftUrl,
    updatedAt: record.updatedAt,
  };
}

function mapPublication(
  record: NonNullable<PublishDetailRecord["publication"]>,
): PublicationRecordDetail {
  return {
    id: record.id,
    channel: record.channel,
    publishedUrl: record.publishedUrl,
    publishedAt: record.publishedAt,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapPublishDetail(record: PublishDetailRecord): PublishPackageDetail {
  return {
    ...mapPublishSummary(record),
    content: record.content,
    contentFormat: record.contentFormat,
    metadata: record.metadata,
    publication: record.publication ? mapPublication(record.publication) : null,
    draft: {
      id: record.draft.id,
      title: record.draft.title,
      status: record.draft.status,
      currentRewriteId: record.draft.currentRewriteId,
    },
    createdAt: record.createdAt,
  };
}

function buildPublishWhere(filters: PublishPackageFilters): Prisma.PublishPackageWhereInput {
  return {
    status: filters.status,
    channel: filters.channel,
    draftId: filters.draftId,
  };
}

export function createPublishRepository(database: DatabaseClient = prisma): PublishRepository {
  return {
    async getById(publishPackageId: string): Promise<PublishPackageDetail | null> {
      const record = await database.publishPackage.findUnique({
        where: {
          id: publishPackageId,
        },
        select: publishDetailSelect,
      });

      return record ? mapPublishDetail(record) : null;
    },

    async list(
      filters: PublishPackageFilters = {},
    ): Promise<PaginatedResult<PublishPackageSummary>> {
      const pagination = buildPaginationArgs(filters);
      const where = buildPublishWhere(filters);
      const records = await database.publishPackage.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { channel: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
        select: publishSummarySelect,
      });
      const total = await database.publishPackage.count({ where });

      return createPaginatedResult(records.map(mapPublishSummary), total, pagination);
    },

    async listByDraftId(draftId: string): Promise<PublishPackageSummary[]> {
      const records = await database.publishPackage.findMany({
        where: {
          draftId,
        },
        orderBy: [{ updatedAt: "desc" }, { channel: "asc" }],
        select: publishSummarySelect,
      });

      return records.map(mapPublishSummary);
    },

    async upsertByDraftAndChannel(input: UpsertPublishPackageInput): Promise<PublishPackageDetail> {
      const record = await database.publishPackage.upsert({
        where: {
          draftId_channel: {
            draftId: input.draftId,
            channel: input.channel,
          },
        },
        update: {
          status: input.status,
          title: input.title,
          summary: input.summary,
          content: input.content,
          contentFormat: input.contentFormat,
          exportPath: input.exportPath,
          draftUrl: input.draftUrl,
          metadata: input.metadata,
        },
        create: {
          id: input.id,
          draftId: input.draftId,
          channel: input.channel,
          status: input.status,
          title: input.title,
          summary: input.summary,
          content: input.content,
          contentFormat: input.contentFormat,
          exportPath: input.exportPath,
          draftUrl: input.draftUrl,
          metadata: input.metadata,
        },
        select: publishDetailSelect,
      });

      return mapPublishDetail(record);
    },

    async update(
      publishPackageId: string,
      input: UpdatePublishPackageInput,
    ): Promise<PublishPackageDetail> {
      const record = await database.publishPackage.update({
        where: {
          id: publishPackageId,
        },
        data: {
          status: input.status,
          title: input.title,
          summary: input.summary,
          content: input.content,
          contentFormat: input.contentFormat,
          exportPath: input.exportPath,
          draftUrl: input.draftUrl,
          metadata: input.metadata,
        },
        select: publishDetailSelect,
      });

      return mapPublishDetail(record);
    },

    async upsertPublicationRecord(
      input: UpsertPublicationRecordInput,
    ): Promise<PublishPackageDetail> {
      const record = await database.publishPackage.update({
        where: {
          id: input.publishPackageId,
        },
        data: {
          publication: {
            upsert: {
              create: {
                id: input.id,
                channel: input.channel,
                publishedUrl: input.publishedUrl,
                publishedAt: input.publishedAt,
                notes: input.notes,
              },
              update: {
                channel: input.channel,
                publishedUrl: input.publishedUrl,
                publishedAt: input.publishedAt,
                notes: input.notes,
              },
            },
          },
        },
        select: publishDetailSelect,
      });

      return mapPublishDetail(record);
    },
  };
}
