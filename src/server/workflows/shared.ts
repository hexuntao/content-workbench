import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  ChannelType,
  DraftStatus,
  DraftType,
  JobType,
  PublishStatus,
  RewriteStrategy,
  SourceStatus,
} from "@prisma/client";
import { createRemoteDraft } from "@/server/adapters/channel-draft";
import { generateContent } from "@/server/adapters/llm";
import { collectSource } from "@/server/adapters/source";
import { uploadFile } from "@/server/adapters/storage";
import { prisma } from "@/server/db";
import {
  createDraftRepository,
  createPublishRepository,
  createTopicRepository,
  type DraftDetail,
  type JobRecord,
  type PublishPackageDetail,
  type TopicDetail,
} from "@/server/repositories";
import {
  assertPublishPackageCanCreateRemoteDraft,
  assertPublishPackageCanExport,
  assertTopicCanGenerateMaster,
  reduceDraftStatusAfterPackaging,
  reduceDraftStatusAfterRewrite,
} from "@/server/services/jobs/domain-guards";
import { JobsServiceError } from "@/server/services/jobs/errors";
import type {
  CreateRemoteDraftWorkflowInput,
  CreateRemoteDraftWorkflowOutput,
  ExportPublishPackageWorkflowInput,
  ExportPublishPackageWorkflowOutput,
  GenerateMasterDraftWorkflowInput,
  GenerateMasterDraftWorkflowOutput,
  IngestionWorkflowInput,
  IngestionWorkflowOutput,
  PackageDraftWorkflowInput,
  PackageDraftWorkflowOutput,
  RewriteDraftWorkflowInput,
  RewriteDraftWorkflowOutput,
  WorkflowOutput,
} from "@/server/workflows/contracts";

const draftRepository = createDraftRepository();
const topicRepository = createTopicRepository();
const publishRepository = createPublishRepository();

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toInputJsonValue(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function readString(value: Prisma.JsonValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNullableString(value: Prisma.JsonValue | undefined): string | null | undefined {
  if (value === null) {
    return null;
  }

  return typeof value === "string" ? value : undefined;
}

function readStringArray(value: Prisma.JsonValue | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item: Prisma.JsonValue): item is string => typeof item === "string");
}

function parseRewriteStrategies(values: string[]): RewriteStrategy[] {
  return values.filter((value: string): value is RewriteStrategy =>
    Object.values(RewriteStrategy).includes(value as RewriteStrategy),
  );
}

function parseChannels(values: string[]): ChannelType[] {
  return values.filter((value: string): value is ChannelType =>
    Object.values(ChannelType).includes(value as ChannelType),
  );
}

function getJobInput(job: JobRecord): Prisma.JsonObject {
  if (!isJsonObject(job.input)) {
    throw new JobsServiceError("INVALID_REQUEST_BODY", "Job input is invalid.", 400, {
      jobId: job.id,
      jobType: job.type,
    });
  }

  return job.input;
}

function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = "";
    return url.toString();
  } catch {
    return input;
  }
}

function buildSourceItemHash(item: {
  title: string;
  summary?: string;
  rawContent?: string;
}): string {
  return crypto
    .createHash("sha256")
    .update(`${item.title}\n${item.summary ?? ""}\n${item.rawContent ?? ""}`)
    .digest("hex");
}

async function getTopicOrThrow(topicId: string): Promise<TopicDetail> {
  const topic = await topicRepository.getById(topicId);

  if (topic === null) {
    throw new JobsServiceError("TOPIC_NOT_FOUND", "Topic not found.", 404, {
      topicId,
    });
  }

  return topic;
}

async function getDraftOrThrow(draftId: string): Promise<DraftDetail> {
  const draft = await draftRepository.getById(draftId);

  if (draft === null) {
    throw new JobsServiceError("DRAFT_NOT_FOUND", "Draft not found.", 404, {
      draftId,
    });
  }

  return draft;
}

async function getPublishPackageOrThrow(publishPackageId: string): Promise<PublishPackageDetail> {
  const publishPackage = await publishRepository.getById(publishPackageId);

  if (publishPackage === null) {
    throw new JobsServiceError("PUBLISH_PACKAGE_NOT_FOUND", "Publish package not found.", 404, {
      publishPackageId,
    });
  }

  return publishPackage;
}

async function readRewriteContent(rewriteId: string): Promise<{
  id: string;
  title: string | null;
  content: string;
} | null> {
  return prisma.rewriteVersion.findUnique({
    where: {
      id: rewriteId,
    },
    select: {
      id: true,
      title: true,
      content: true,
    },
  });
}

function buildMasterPrompt(topic: TopicDetail, sourceSummaries: string[]): string {
  const summaryBlock =
    sourceSummaries.length > 0 ? sourceSummaries.join("\n- ") : "No source summary.";
  return `Write a master draft for topic "${topic.title}".\n\nSignals:\n- ${summaryBlock}`;
}

function buildRewritePrompt(draft: DraftDetail, strategy: RewriteStrategy): string {
  return `Rewrite the following draft with strategy ${strategy}.\n\n${draft.content}`;
}

function buildPackagePrompt(input: {
  title: string;
  summary: string | null;
  content: string;
  channel: ChannelType;
}): string {
  return `Package this draft for channel ${input.channel}.\n\nTitle: ${input.title}\nSummary: ${
    input.summary ?? ""
  }\n\n${input.content}`;
}

export function parseWorkflowInput(
  job: JobRecord,
):
  | IngestionWorkflowInput
  | GenerateMasterDraftWorkflowInput
  | RewriteDraftWorkflowInput
  | PackageDraftWorkflowInput
  | ExportPublishPackageWorkflowInput
  | CreateRemoteDraftWorkflowInput {
  const input = getJobInput(job);

  if (job.type === JobType.INGEST_SOURCE) {
    return {
      sourceId: readString(input.sourceId) ?? job.entityId,
    };
  }

  if (job.type === JobType.GENERATE_MASTER_DRAFT) {
    return {
      topicClusterId: readString(input.topicClusterId) ?? job.entityId,
      model: readString(input.model),
    };
  }

  if (job.type === JobType.REWRITE_DRAFT) {
    const strategies = parseRewriteStrategies(readStringArray(input.strategies));

    if (strategies.length === 0) {
      throw new JobsServiceError("INVALID_REQUEST_BODY", "Rewrite strategies are required.", 400, {
        jobId: job.id,
      });
    }

    return {
      draftId: readString(input.draftId) ?? job.entityId,
      strategies,
      voiceProfileId: readNullableString(input.voiceProfileId),
      model: readString(input.model),
    };
  }

  if (job.type === JobType.PACKAGE_DRAFT) {
    const channels = parseChannels(readStringArray(input.channels));

    if (channels.length === 0) {
      throw new JobsServiceError("INVALID_REQUEST_BODY", "Packaging channels are required.", 400, {
        jobId: job.id,
      });
    }

    return {
      draftId: readString(input.draftId) ?? job.entityId,
      channels,
      rewriteId: readNullableString(input.rewriteId),
      model: readString(input.model),
    };
  }

  if (job.type === JobType.EXPORT_PUBLISH_PACKAGE) {
    return {
      publishPackageId: readString(input.publishPackageId) ?? job.entityId,
    };
  }

  if (job.type === JobType.CREATE_REMOTE_DRAFT) {
    return {
      publishPackageId: readString(input.publishPackageId) ?? job.entityId,
      channelAccountId: readNullableString(input.channelAccountId),
    };
  }

  throw new JobsServiceError(
    "UNEXPECTED_WORKFLOW_FAILURE",
    "No workflow is registered for this job type.",
    500,
    {
      jobId: job.id,
      jobType: job.type,
    },
  );
}

export async function runIngestionWorkflow(
  input: IngestionWorkflowInput,
): Promise<IngestionWorkflowOutput> {
  const source = await prisma.source.findUnique({
    where: {
      id: input.sourceId,
    },
    select: {
      id: true,
      type: true,
      config: true,
    },
  });

  if (source === null) {
    throw new JobsServiceError("SOURCE_NOT_FOUND", "Source not found.", 404, {
      sourceId: input.sourceId,
    });
  }

  const config = isJsonObject(source.config) ? source.config : {};
  const collected = await collectSource({
    sourceId: source.id,
    sourceType: source.type,
    config,
    requestedAt: new Date().toISOString(),
  });

  let insertedCount = 0;
  let dedupedCount = 0;

  for (const item of collected.items) {
    const normalizedUrl = normalizeUrl(item.url);
    const existing = await prisma.sourceItem.findUnique({
      where: {
        sourceId_url: {
          sourceId: source.id,
          url: normalizedUrl,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      dedupedCount += 1;
    } else {
      insertedCount += 1;
    }

    await prisma.sourceItem.upsert({
      where: {
        sourceId_url: {
          sourceId: source.id,
          url: normalizedUrl,
        },
      },
      update: {
        sourceExternalId: item.externalId,
        title: item.title,
        author: item.author,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        rawContent: item.rawContent,
        normalizedContent: item.rawContent,
        summary: item.summary,
        dedupeHash: buildSourceItemHash(item),
        metadata: toInputJsonValue(item.metadata),
      },
      create: {
        sourceId: source.id,
        sourceExternalId: item.externalId,
        title: item.title,
        url: normalizedUrl,
        author: item.author,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        rawContent: item.rawContent,
        normalizedContent: item.rawContent,
        summary: item.summary,
        dedupeHash: buildSourceItemHash(item),
        metadata: toInputJsonValue(item.metadata),
      },
    });
  }

  await prisma.source.update({
    where: {
      id: source.id,
    },
    data: {
      status: SourceStatus.ACTIVE,
      lastRunAt: new Date(),
    },
  });

  return {
    sourceId: source.id,
    fetchedCount: collected.fetchedCount,
    insertedCount,
    dedupedCount,
  };
}

export async function runGenerateMasterDraftWorkflow(
  input: GenerateMasterDraftWorkflowInput,
): Promise<GenerateMasterDraftWorkflowOutput> {
  const topic = await getTopicOrThrow(input.topicClusterId);
  const activeMasterDraftCount = await topicRepository.countActiveMasterDrafts(topic.id);
  assertTopicCanGenerateMaster(topic.status, activeMasterDraftCount, topic.id);

  const sourceItems = await topicRepository.listSourceItems(topic.id);
  const generated = await generateContent({
    taskType: "GENERATE_MASTER",
    prompt: buildMasterPrompt(
      topic,
      sourceItems.map((item) => item.summary ?? item.title),
    ),
    context: {
      topicTitle: topic.title,
      topicSummary: topic.summary,
      sourceItemIds: sourceItems.map((item) => item.id),
    },
    model: input.model,
  });

  const draft = await draftRepository.create({
    topicClusterId: topic.id,
    draftType: DraftType.MASTER,
    status: DraftStatus.CREATED,
    title: generated.title ?? topic.title,
    summary: generated.summary ?? topic.summary,
    content: generated.content,
    metadata: toInputJsonValue({
      generation: generated.metadata ?? null,
    }),
  });

  return {
    topicClusterId: topic.id,
    draftId: draft.id,
    title: draft.title,
    summary: draft.summary ?? undefined,
  };
}

export async function runRewriteDraftWorkflow(
  input: RewriteDraftWorkflowInput,
): Promise<RewriteDraftWorkflowOutput> {
  const draft = await getDraftOrThrow(input.draftId);
  const nextStatus = reduceDraftStatusAfterRewrite(draft.status, draft.id);
  const rewriteIds: string[] = [];

  for (const strategy of input.strategies) {
    const generated = await generateContent({
      taskType: "REWRITE",
      prompt: buildRewritePrompt(draft, strategy),
      context: {
        baseTitle: draft.title,
        strategy,
        voiceProfileId: input.voiceProfileId ?? null,
      },
      model: input.model,
    });

    const rewrite = await draftRepository.createRewrite({
      draftId: draft.id,
      strategy,
      title: generated.title ?? `${draft.title} ${strategy}`,
      content: generated.content,
      diffSummary: generated.summary ?? null,
      score: null,
      isSelected: rewriteIds.length === 0 && draft.currentRewriteId === null,
      metadata: toInputJsonValue(generated.metadata),
    });

    rewriteIds.push(rewrite.id);
  }

  const selectedRewriteId = rewriteIds[0] ?? draft.currentRewriteId;

  if (selectedRewriteId) {
    await draftRepository.selectRewrite(draft.id, selectedRewriteId);
  }

  const updatedDraft = await draftRepository.update(draft.id, {
    status: nextStatus,
  });

  return {
    draftId: draft.id,
    rewriteIds,
    selectedRewriteId: updatedDraft.currentRewriteId,
    draftStatus: updatedDraft.status,
  };
}

export async function runPackageDraftWorkflow(
  input: PackageDraftWorkflowInput,
): Promise<PackageDraftWorkflowOutput> {
  const draft = await getDraftOrThrow(input.draftId);
  const nextStatus = reduceDraftStatusAfterPackaging(draft.status, draft.id);
  const rewriteRecord = input.rewriteId
    ? await readRewriteContent(input.rewriteId)
    : draft.currentRewriteId
      ? await readRewriteContent(draft.currentRewriteId)
      : null;

  if (input.rewriteId && rewriteRecord === null) {
    throw new JobsServiceError(
      "REWRITE_DOES_NOT_BELONG_TO_DRAFT",
      "Rewrite does not belong to draft.",
      404,
      {
        draftId: draft.id,
        rewriteId: input.rewriteId,
      },
    );
  }

  const packageIds: string[] = [];
  const content = rewriteRecord?.content ?? draft.content;
  const title = rewriteRecord?.title ?? draft.title;

  for (const channel of input.channels) {
    const generated = await generateContent({
      taskType: "PACKAGE_CHANNEL",
      prompt: buildPackagePrompt({
        title,
        summary: draft.summary,
        content,
        channel,
      }),
      context: {
        channel,
        baseTitle: title,
        rewriteId: rewriteRecord?.id ?? null,
      },
      model: input.model,
    });

    const publishPackage = await publishRepository.upsertByDraftAndChannel({
      draftId: draft.id,
      channel,
      status: PublishStatus.PENDING,
      title: generated.title ?? title,
      summary: generated.summary ?? draft.summary,
      content: generated.content,
      contentFormat: draft.contentFormat,
      metadata: toInputJsonValue(generated.metadata),
    });

    packageIds.push(publishPackage.id);
  }

  const updatedDraft = await draftRepository.update(draft.id, {
    status: nextStatus,
  });

  return {
    draftId: draft.id,
    packageIds,
    draftStatus: updatedDraft.status,
  };
}

export async function runExportPublishPackageWorkflow(
  input: ExportPublishPackageWorkflowInput,
): Promise<ExportPublishPackageWorkflowOutput> {
  const publishPackage = await getPublishPackageOrThrow(input.publishPackageId);
  assertPublishPackageCanExport(publishPackage.status, publishPackage.id);

  if (publishPackage.content === null || publishPackage.contentFormat === null) {
    throw new JobsServiceError(
      "PUBLISH_PACKAGE_STATUS_INVALID",
      "Publish package must contain content before export.",
      409,
      {
        publishPackageId: publishPackage.id,
      },
    );
  }

  const extension = publishPackage.contentFormat === "markdown" ? "md" : "txt";
  const key = `publish-packages/${publishPackage.channel.toLowerCase()}/${publishPackage.id}.${extension}`;
  const uploaded = await uploadFile({
    key,
    contentType: "text/markdown; charset=utf-8",
    body: publishPackage.content,
  });

  await publishRepository.update(publishPackage.id, {
    status: PublishStatus.EXPORTED,
    exportPath: uploaded.key,
  });

  return {
    publishPackageId: publishPackage.id,
    key: uploaded.key,
    url: uploaded.url,
  };
}

export async function runCreateRemoteDraftWorkflow(
  input: CreateRemoteDraftWorkflowInput,
): Promise<CreateRemoteDraftWorkflowOutput> {
  const publishPackage = await getPublishPackageOrThrow(input.publishPackageId);
  const draft = await getDraftOrThrow(publishPackage.draftId);
  assertPublishPackageCanCreateRemoteDraft({
    channel: publishPackage.channel as ChannelType,
    publishStatus: publishPackage.status,
    publishPackageId: publishPackage.id,
    draftId: draft.id,
    draftStatus: draft.status,
  });

  if (publishPackage.content === null) {
    throw new JobsServiceError(
      "PUBLISH_PACKAGE_STATUS_INVALID",
      "Publish package must contain content before remote draft creation.",
      409,
      {
        publishPackageId: publishPackage.id,
      },
    );
  }

  const remoteDraft = await createRemoteDraft({
    channel: publishPackage.channel as Extract<ChannelType, "WECHAT" | "X_ARTICLE">,
    title: publishPackage.title ?? draft.title,
    summary: publishPackage.summary ?? draft.summary ?? undefined,
    content: publishPackage.content,
    accountId: input.channelAccountId ?? undefined,
  });

  await publishRepository.update(publishPackage.id, {
    status: PublishStatus.DRAFT_CREATED,
    draftUrl: remoteDraft.draftUrl,
    metadata: toInputJsonValue(remoteDraft.metadata),
  });

  return {
    publishPackageId: publishPackage.id,
    draftUrl: remoteDraft.draftUrl,
    remoteId: remoteDraft.remoteId,
  };
}

export async function runWorkflowForJob(job: JobRecord): Promise<WorkflowOutput> {
  const input = parseWorkflowInput(job);

  if (job.type === JobType.INGEST_SOURCE) {
    return runIngestionWorkflow(input as IngestionWorkflowInput);
  }

  if (job.type === JobType.GENERATE_MASTER_DRAFT) {
    return runGenerateMasterDraftWorkflow(input as GenerateMasterDraftWorkflowInput);
  }

  if (job.type === JobType.REWRITE_DRAFT) {
    return runRewriteDraftWorkflow(input as RewriteDraftWorkflowInput);
  }

  if (job.type === JobType.PACKAGE_DRAFT) {
    return runPackageDraftWorkflow(input as PackageDraftWorkflowInput);
  }

  if (job.type === JobType.EXPORT_PUBLISH_PACKAGE) {
    return runExportPublishPackageWorkflow(input as ExportPublishPackageWorkflowInput);
  }

  if (job.type === JobType.CREATE_REMOTE_DRAFT) {
    return runCreateRemoteDraftWorkflow(input as CreateRemoteDraftWorkflowInput);
  }

  throw new JobsServiceError("UNEXPECTED_WORKFLOW_FAILURE", "Unsupported workflow job type.", 500, {
    jobId: job.id,
    jobType: job.type,
  });
}
