import { JobEntityType, JobType, type Prisma, TopicStatus } from "@prisma/client";
import { invariant, TopicsError } from "@/features/topics/server/errors";
import type {
  TopicActionResponse,
  TopicDetailResponse,
  TopicGenerateDraftResponse,
  TopicListItem,
  TopicListResponse,
  TopicRelatedDraft,
  TopicSourceItem,
  TopicSourceItemsResponse,
} from "@/features/topics/types";
import {
  createDraftRepository,
  createTopicRepository,
  type TopicDetail,
  type TopicSourceItemRecord,
  type TopicSummary,
} from "@/server/repositories";
import { assertTopicCanGenerateMaster } from "@/server/services/jobs/domain-guards";
import { createJobsRuntime } from "@/server/services/jobs/runtime";

const topicRepository = createTopicRepository();
const draftRepository = createDraftRepository();
const jobsRuntime = createJobsRuntime();

type TopicListInput = {
  status?: TopicStatus;
  theme?: string | null;
  keyword?: string | null;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "totalScore" | "updatedAt";
};

type GenerateMasterDraftInput = {
  voiceProfileId: string | null;
  idempotencyKey: string | null;
};

function mapTopicSummary(topic: TopicSummary): TopicListItem {
  return {
    id: topic.id,
    title: topic.title,
    summary: topic.summary,
    keywords: topic.keywords,
    theme: topic.theme,
    trendScore: topic.trendScore,
    relevanceScore: topic.relevanceScore,
    editorialScore: topic.editorialScore,
    totalScore: topic.totalScore,
    recommendedAngle: topic.recommendedAngle,
    status: topic.status,
    sourceItemCount: topic.sourceItemCount,
    currentMasterDraft: topic.currentMasterDraft
      ? {
          id: topic.currentMasterDraft.id,
          title: topic.currentMasterDraft.title,
          status: topic.currentMasterDraft.status,
          updatedAt: topic.currentMasterDraft.updatedAt.toISOString(),
        }
      : null,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
  };
}

function mapTopicDetail(topic: TopicDetail, drafts: TopicRelatedDraft[]): TopicDetailResponse {
  return {
    topic: {
      ...mapTopicSummary(topic),
      metadata: topic.metadata,
    },
    drafts,
  };
}

function mapTopicSourceItem(item: TopicSourceItemRecord): TopicSourceItem {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    author: item.author,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    summary: item.summary,
    rank: item.rank,
    reason: item.reason,
  };
}

async function getTopicOrThrow(topicId: string): Promise<TopicDetail> {
  const topic = await topicRepository.getById(topicId);

  if (topic === null) {
    throw new TopicsError("TOPIC_NOT_FOUND", "Topic not found.", 404, {
      topicId,
    });
  }

  return topic;
}

function mergeTopicMetadata(
  currentMetadata: Prisma.JsonValue | null,
  nextFields: Record<string, string | null | undefined>,
): Prisma.InputJsonValue | undefined {
  const merged: Record<string, Prisma.InputJsonValue | null> = {};

  if (
    typeof currentMetadata === "object" &&
    currentMetadata !== null &&
    !Array.isArray(currentMetadata)
  ) {
    for (const [key, value] of Object.entries(currentMetadata)) {
      merged[key] = value as Prisma.InputJsonValue | null;
    }
  }

  for (const [key, value] of Object.entries(nextFields)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

async function updateTopicStatus(
  topicId: string,
  nextStatus: TopicStatus,
  metadata?: Prisma.InputJsonValue,
): Promise<TopicActionResponse> {
  const updated = await topicRepository.update(topicId, {
    status: nextStatus,
    metadata,
  });

  return {
    id: updated.id,
    status: updated.status,
  };
}

export async function listTopics(input: TopicListInput = {}): Promise<TopicListResponse> {
  const result = await topicRepository.list({
    status: input.status,
    theme: input.theme ?? undefined,
    keyword: input.keyword ?? undefined,
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
  });

  return {
    items: result.items.map(mapTopicSummary),
    pagination: result.pagination,
  };
}

export async function getTopicDetail(topicId: string): Promise<TopicDetailResponse> {
  const topic = await getTopicOrThrow(topicId);
  const drafts = await draftRepository.listByTopicId(topic.id);

  return mapTopicDetail(
    topic,
    drafts.map(
      (draft): TopicRelatedDraft => ({
        id: draft.id,
        draftType: draft.draftType,
        status: draft.status,
        title: draft.title,
        summary: draft.summary,
        updatedAt: draft.updatedAt.toISOString(),
      }),
    ),
  );
}

export async function listTopicSourceItems(topicId: string): Promise<TopicSourceItemsResponse> {
  await getTopicOrThrow(topicId);
  const items = await topicRepository.listSourceItems(topicId);

  return {
    items: items.map(mapTopicSourceItem),
  };
}

export async function shortlistTopic(topicId: string): Promise<TopicActionResponse> {
  const topic = await getTopicOrThrow(topicId);

  invariant(
    topic.status === TopicStatus.NEW,
    "TOPIC_STATUS_INVALID",
    "Only new topics can be shortlisted.",
    409,
    {
      topicId,
      currentStatus: topic.status,
    },
  );

  return updateTopicStatus(topic.id, TopicStatus.SHORTLISTED);
}

export async function ignoreTopic(
  topicId: string,
  reason: string | null,
): Promise<TopicActionResponse> {
  const topic = await getTopicOrThrow(topicId);

  if (topic.status === TopicStatus.IGNORED) {
    throw new TopicsError("TOPIC_ALREADY_IGNORED", "Topic is already ignored.", 409, {
      topicId,
    });
  }

  invariant(
    topic.status === TopicStatus.NEW || topic.status === TopicStatus.SHORTLISTED,
    "TOPIC_STATUS_INVALID",
    "Only new or shortlisted topics can be ignored.",
    409,
    {
      topicId,
      currentStatus: topic.status,
    },
  );

  return updateTopicStatus(
    topic.id,
    TopicStatus.IGNORED,
    mergeTopicMetadata(topic.metadata, {
      ignoredReason: reason,
    }),
  );
}

export async function startTopic(topicId: string): Promise<TopicActionResponse> {
  const topic = await getTopicOrThrow(topicId);

  invariant(
    topic.status === TopicStatus.NEW || topic.status === TopicStatus.SHORTLISTED,
    "TOPIC_STATUS_INVALID",
    "Only new or shortlisted topics can be started.",
    409,
    {
      topicId,
      currentStatus: topic.status,
    },
  );

  const activeMasterDraftCount = await topicRepository.countActiveMasterDrafts(topic.id);

  invariant(
    activeMasterDraftCount === 0,
    "TOPIC_ALREADY_HAS_ACTIVE_MASTER_DRAFT",
    "Topic already has an active master draft.",
    409,
    {
      topicId,
      activeMasterDraftCount,
    },
  );

  return updateTopicStatus(topic.id, TopicStatus.IN_PROGRESS);
}

export async function generateMasterDraft(
  topicId: string,
  input: GenerateMasterDraftInput,
): Promise<TopicGenerateDraftResponse> {
  const topic = await getTopicOrThrow(topicId);
  const activeMasterDraftCount = await topicRepository.countActiveMasterDrafts(topic.id);

  assertTopicCanGenerateMaster(topic.status, activeMasterDraftCount, topic.id);

  const idempotencyKey = input.idempotencyKey ?? `topic-${topic.id}-master-draft`;
  const job = await jobsRuntime.enqueueWorkflowJob({
    type: JobType.GENERATE_MASTER_DRAFT,
    entityType: JobEntityType.TOPIC_CLUSTER,
    entityId: topic.id,
    topicClusterId: topic.id,
    idempotencyKey,
    triggeredBy: "topics-workbench",
    input: {
      topicClusterId: topic.id,
      voiceProfileId: input.voiceProfileId,
    },
  });

  return {
    jobId: job.jobId,
    status: job.status,
    topicId: topic.id,
    entityType: "TOPIC_CLUSTER",
    entityId: topic.id,
    idempotencyKey: job.idempotencyKey,
  };
}
