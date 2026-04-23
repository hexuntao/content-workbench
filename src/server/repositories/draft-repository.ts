import type {
  AssetType,
  DraftStatus,
  DraftType,
  Prisma,
  PublishStatus,
  ReviewStatus,
  RewriteStrategy,
} from "@prisma/client";
import type { DatabaseClient } from "@/server/db";
import { prisma, runInTransaction } from "@/server/db";

export interface RewriteSummary {
  id: string;
  strategy: string;
  title: string | null;
  diffSummary: string | null;
  score: number | null;
  isSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetRecord {
  id: string;
  type: string;
  path: string;
  mimeType: string | null;
  fileSize: number | null;
  promptText: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftReviewSummary {
  id: string;
  status: ReviewStatus;
  reviewerEmail: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}

export interface DraftPublishPackageSummary {
  id: string;
  channel: string;
  status: PublishStatus;
  title: string | null;
  exportPath: string | null;
  draftUrl: string | null;
  updatedAt: Date;
}

export interface DraftDetail {
  id: string;
  topicClusterId: string;
  draftType: DraftType;
  status: DraftStatus;
  title: string;
  summary: string | null;
  content: string;
  contentFormat: string;
  version: number;
  currentRewriteId: string | null;
  metadata: Prisma.JsonValue | null;
  currentRewrite: RewriteSummary | null;
  latestReview: DraftReviewSummary | null;
  publishPackages: DraftPublishPackageSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftListItem {
  id: string;
  topicClusterId: string;
  draftType: DraftType;
  status: DraftStatus;
  title: string;
  summary: string | null;
  version: number;
  currentRewriteId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDraftInput {
  id?: string;
  topicClusterId: string;
  draftType: DraftType;
  status?: DraftStatus;
  title: string;
  summary?: string | null;
  content: string;
  contentFormat?: string;
  version?: number;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateDraftInput {
  status?: DraftStatus;
  title?: string;
  summary?: string | null;
  content?: string;
  contentFormat?: string;
  version?: number;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateRewriteInput {
  id?: string;
  draftId: string;
  strategy: RewriteStrategy;
  title?: string | null;
  content: string;
  diffSummary?: string | null;
  score?: number | null;
  isSelected?: boolean;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateAssetInput {
  id?: string;
  draftId: string;
  type: AssetType;
  path: string;
  mimeType?: string | null;
  fileSize?: number | null;
  promptText?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface DraftRepository {
  create(input: CreateDraftInput): Promise<DraftDetail>;
  update(draftId: string, input: UpdateDraftInput): Promise<DraftDetail>;
  getById(draftId: string): Promise<DraftDetail | null>;
  listByTopicId(topicClusterId: string): Promise<DraftListItem[]>;
  createRewrite(input: CreateRewriteInput): Promise<RewriteSummary>;
  listRewrites(draftId: string): Promise<RewriteSummary[]>;
  selectRewrite(draftId: string, rewriteId: string): Promise<DraftDetail | null>;
  createAsset(input: CreateAssetInput): Promise<AssetRecord>;
  listAssets(draftId: string): Promise<AssetRecord[]>;
}

const rewriteSelect = {
  id: true,
  strategy: true,
  title: true,
  diffSummary: true,
  score: true,
  isSelected: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RewriteVersionSelect;

const draftDetailSelect = {
  id: true,
  topicClusterId: true,
  draftType: true,
  status: true,
  title: true,
  summary: true,
  content: true,
  contentFormat: true,
  version: true,
  currentRewriteId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  currentRewrite: {
    select: rewriteSelect,
  },
  reviews: {
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
    select: {
      id: true,
      status: true,
      reviewerEmail: true,
      decidedAt: true,
      createdAt: true,
    },
  },
  publishPackages: {
    orderBy: [{ updatedAt: "desc" }, { channel: "asc" }],
    select: {
      id: true,
      channel: true,
      status: true,
      title: true,
      exportPath: true,
      draftUrl: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.DraftSelect;

const draftListSelect = {
  id: true,
  topicClusterId: true,
  draftType: true,
  status: true,
  title: true,
  summary: true,
  version: true,
  currentRewriteId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DraftSelect;

const assetSelect = {
  id: true,
  type: true,
  path: true,
  mimeType: true,
  fileSize: true,
  promptText: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssetSelect;

type RewriteRecord = Prisma.RewriteVersionGetPayload<{
  select: typeof rewriteSelect;
}>;

type DraftDetailRecord = Prisma.DraftGetPayload<{
  select: typeof draftDetailSelect;
}>;

type DraftListRecord = Prisma.DraftGetPayload<{
  select: typeof draftListSelect;
}>;

type AssetSelectRecord = Prisma.AssetGetPayload<{
  select: typeof assetSelect;
}>;

function mapRewrite(record: RewriteRecord): RewriteSummary {
  return {
    id: record.id,
    strategy: record.strategy,
    title: record.title,
    diffSummary: record.diffSummary,
    score: record.score,
    isSelected: record.isSelected,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapDraftListItem(record: DraftListRecord): DraftListItem {
  return {
    id: record.id,
    topicClusterId: record.topicClusterId,
    draftType: record.draftType,
    status: record.status,
    title: record.title,
    summary: record.summary,
    version: record.version,
    currentRewriteId: record.currentRewriteId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapDraftDetail(record: DraftDetailRecord): DraftDetail {
  return {
    id: record.id,
    topicClusterId: record.topicClusterId,
    draftType: record.draftType,
    status: record.status,
    title: record.title,
    summary: record.summary,
    content: record.content,
    contentFormat: record.contentFormat,
    version: record.version,
    currentRewriteId: record.currentRewriteId,
    metadata: record.metadata,
    currentRewrite: record.currentRewrite ? mapRewrite(record.currentRewrite) : null,
    latestReview: record.reviews[0]
      ? {
          id: record.reviews[0].id,
          status: record.reviews[0].status,
          reviewerEmail: record.reviews[0].reviewerEmail,
          decidedAt: record.reviews[0].decidedAt,
          createdAt: record.reviews[0].createdAt,
        }
      : null,
    publishPackages: record.publishPackages.map((publishPackage) => ({
      id: publishPackage.id,
      channel: publishPackage.channel,
      status: publishPackage.status,
      title: publishPackage.title,
      exportPath: publishPackage.exportPath,
      draftUrl: publishPackage.draftUrl,
      updatedAt: publishPackage.updatedAt,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function mapAsset(record: AssetSelectRecord): AssetRecord {
  return {
    id: record.id,
    type: record.type,
    path: record.path,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    promptText: record.promptText,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function createDraftRepository(database: DatabaseClient = prisma): DraftRepository {
  return {
    async create(input: CreateDraftInput): Promise<DraftDetail> {
      const record = await database.draft.create({
        data: {
          id: input.id,
          topicClusterId: input.topicClusterId,
          draftType: input.draftType,
          status: input.status,
          title: input.title,
          summary: input.summary,
          content: input.content,
          contentFormat: input.contentFormat,
          version: input.version,
          metadata: input.metadata,
        },
        select: draftDetailSelect,
      });

      return mapDraftDetail(record);
    },

    async update(draftId: string, input: UpdateDraftInput): Promise<DraftDetail> {
      const record = await database.draft.update({
        where: {
          id: draftId,
        },
        data: {
          status: input.status,
          title: input.title,
          summary: input.summary,
          content: input.content,
          contentFormat: input.contentFormat,
          version: input.version,
          metadata: input.metadata,
        },
        select: draftDetailSelect,
      });

      return mapDraftDetail(record);
    },

    async getById(draftId: string): Promise<DraftDetail | null> {
      const record = await database.draft.findUnique({
        where: {
          id: draftId,
        },
        select: draftDetailSelect,
      });

      return record ? mapDraftDetail(record) : null;
    },

    async listByTopicId(topicClusterId: string): Promise<DraftListItem[]> {
      const records = await database.draft.findMany({
        where: {
          topicClusterId,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: draftListSelect,
      });

      return records.map(mapDraftListItem);
    },

    async createRewrite(input: CreateRewriteInput): Promise<RewriteSummary> {
      const record = await database.rewriteVersion.create({
        data: {
          id: input.id,
          draftId: input.draftId,
          strategy: input.strategy,
          title: input.title,
          content: input.content,
          diffSummary: input.diffSummary,
          score: input.score,
          isSelected: input.isSelected ?? false,
          metadata: input.metadata,
        },
        select: rewriteSelect,
      });

      if (input.isSelected) {
        const selectedDraft = await this.selectRewrite(input.draftId, record.id);

        if (!selectedDraft?.currentRewrite) {
          throw new Error(`Failed to select rewrite ${record.id} for draft ${input.draftId}`);
        }

        return selectedDraft.currentRewrite;
      }

      return mapRewrite(record);
    },

    async listRewrites(draftId: string): Promise<RewriteSummary[]> {
      const records = await database.rewriteVersion.findMany({
        where: {
          draftId,
        },
        orderBy: [{ isSelected: "desc" }, { createdAt: "desc" }],
        select: rewriteSelect,
      });

      return records.map(mapRewrite);
    },

    async selectRewrite(draftId: string, rewriteId: string): Promise<DraftDetail | null> {
      const result = await runInTransaction(
        async (tx: Prisma.TransactionClient): Promise<DraftDetail | null> => {
          const rewrite = await tx.rewriteVersion.findFirst({
            where: {
              id: rewriteId,
              draftId,
            },
            select: {
              id: true,
            },
          });

          if (!rewrite) {
            return null;
          }

          await tx.rewriteVersion.updateMany({
            where: {
              draftId,
            },
            data: {
              isSelected: false,
            },
          });

          await tx.rewriteVersion.update({
            where: {
              id: rewriteId,
            },
            data: {
              isSelected: true,
            },
          });

          const draft = await tx.draft.update({
            where: {
              id: draftId,
            },
            data: {
              currentRewriteId: rewriteId,
            },
            select: draftDetailSelect,
          });

          return mapDraftDetail(draft);
        },
      );

      return result;
    },

    async createAsset(input: CreateAssetInput): Promise<AssetRecord> {
      const record = await database.asset.create({
        data: {
          id: input.id,
          draftId: input.draftId,
          type: input.type,
          path: input.path,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          promptText: input.promptText,
          metadata: input.metadata,
        },
        select: assetSelect,
      });

      return mapAsset(record);
    },

    async listAssets(draftId: string): Promise<AssetRecord[]> {
      const records = await database.asset.findMany({
        where: {
          draftId,
        },
        orderBy: [{ createdAt: "desc" }, { type: "asc" }],
        select: assetSelect,
      });

      return records.map(mapAsset);
    },
  };
}
