import type { Prisma, SourceStatus, SourceType } from "@prisma/client";
import type { DatabaseClient } from "@/server/db";
import { prisma } from "@/server/db";

export interface SourceDetail {
  id: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  config: Prisma.JsonValue;
  priority: number;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceItemLookup {
  id: string;
}

export interface UpsertSourceItemInput {
  sourceId: string;
  url: string;
  sourceExternalId?: string | null;
  title: string;
  author?: string | null;
  publishedAt?: Date | null;
  rawContent?: string | null;
  normalizedContent?: string | null;
  summary?: string | null;
  dedupeHash: string;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateSourceInput {
  status?: SourceStatus;
  lastRunAt?: Date | null;
}

export interface SourceRepository {
  getById(sourceId: string): Promise<SourceDetail | null>;
  findItemBySourceAndUrl(sourceId: string, url: string): Promise<SourceItemLookup | null>;
  upsertSourceItemByUrl(input: UpsertSourceItemInput): Promise<void>;
  update(sourceId: string, input: UpdateSourceInput): Promise<SourceDetail>;
}

const sourceSelect = {
  id: true,
  name: true,
  type: true,
  status: true,
  config: true,
  priority: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SourceSelect;

type SourceSelectRecord = Prisma.SourceGetPayload<{
  select: typeof sourceSelect;
}>;

function mapSource(record: SourceSelectRecord): SourceDetail {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    status: record.status,
    config: record.config,
    priority: record.priority,
    lastRunAt: record.lastRunAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function createSourceRepository(database: DatabaseClient = prisma): SourceRepository {
  return {
    async getById(sourceId: string): Promise<SourceDetail | null> {
      const record = await database.source.findUnique({
        where: {
          id: sourceId,
        },
        select: sourceSelect,
      });

      return record ? mapSource(record) : null;
    },

    async findItemBySourceAndUrl(sourceId: string, url: string): Promise<SourceItemLookup | null> {
      const record = await database.sourceItem.findUnique({
        where: {
          sourceId_url: {
            sourceId,
            url,
          },
        },
        select: {
          id: true,
        },
      });

      return record ?? null;
    },

    async upsertSourceItemByUrl(input: UpsertSourceItemInput): Promise<void> {
      await database.sourceItem.upsert({
        where: {
          sourceId_url: {
            sourceId: input.sourceId,
            url: input.url,
          },
        },
        update: {
          sourceExternalId: input.sourceExternalId,
          title: input.title,
          author: input.author,
          publishedAt: input.publishedAt,
          rawContent: input.rawContent,
          normalizedContent: input.normalizedContent,
          summary: input.summary,
          dedupeHash: input.dedupeHash,
          metadata: input.metadata,
        },
        create: {
          sourceId: input.sourceId,
          sourceExternalId: input.sourceExternalId,
          title: input.title,
          url: input.url,
          author: input.author,
          publishedAt: input.publishedAt,
          rawContent: input.rawContent,
          normalizedContent: input.normalizedContent,
          summary: input.summary,
          dedupeHash: input.dedupeHash,
          metadata: input.metadata,
        },
      });
    },

    async update(sourceId: string, input: UpdateSourceInput): Promise<SourceDetail> {
      const record = await database.source.update({
        where: {
          id: sourceId,
        },
        data: {
          status: input.status,
          lastRunAt: input.lastRunAt,
        },
        select: sourceSelect,
      });

      return mapSource(record);
    },
  };
}
