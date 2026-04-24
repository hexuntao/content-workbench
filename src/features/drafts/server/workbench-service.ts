import {
  type ChannelType,
  DraftStatus,
  DraftType,
  JobEntityType,
  JobStatus,
  JobType,
  type RewriteStrategy,
} from "@prisma/client";
import { DraftWorkbenchError, invariant } from "@/features/drafts/server/errors";
import {
  ensureDraftWorkbenchSeed,
  workbenchSeedDraftIds,
} from "@/features/drafts/server/mock-seed";
import type {
  DraftActionJobResponse,
  DraftAssetItem,
  DraftAssetListResponse,
  DraftDirectoryItem,
  DraftPublishPackageItem,
  DraftPublishPackageListResponse,
  DraftReadingPane,
  DraftRewriteComparison,
  DraftRewriteItem,
  DraftRewriteListResponse,
  DraftWorkbenchCapabilities,
  DraftWorkbenchDetail,
  DraftWorkbenchHeader,
  DraftWorkbenchJob,
  DraftWorkbenchNotice,
  PackageDraftInput,
  SelectRewriteInput,
  TriggerRewriteInput,
  WorkbenchJobStatus,
} from "@/features/drafts/types";
import {
  createDraftRepository,
  createJobRepository,
  createPublishRepository,
  type DraftDetail,
  type JobRecord,
  type RewriteSummary,
} from "@/server/repositories";
import { createJobsRuntime } from "@/server/services/jobs/runtime";

const draftRepository = createDraftRepository();
const publishRepository = createPublishRepository();
const jobRepository = createJobRepository();
const jobsRuntime = createJobsRuntime();

const rewriteStrategyLabels: Record<RewriteStrategy, string> = {
  ORAL: "口语化",
  DE_AI: "去模板味",
  AUTHOR_VOICE: "作者语气",
  MIXED: "混合策略",
};

const channelLabels: Record<ChannelType, string> = {
  WECHAT: "微信公众号",
  XHS: "小红书",
  X_ARTICLE: "X Article",
};

const draftStatusLabels: Record<DraftStatus, string> = {
  CREATED: "母稿已建立",
  REWRITTEN: "已完成改写",
  PACKAGED: "已完成包装",
  IN_REVIEW: "审核中",
  APPROVED: "审核通过",
  REJECTED: "已退回",
  READY_TO_PUBLISH: "待发布",
  ARCHIVED: "已归档",
};

const publishStatusLabels: Record<string, string> = {
  PENDING: "待导出",
  EXPORTED: "已导出",
  DRAFT_CREATED: "已建远端草稿",
  PUBLISHED: "已发布",
  FAILED: "执行失败",
};

const draftTypeLabels: Record<DraftType, string> = {
  MASTER: "母稿",
  WECHAT: "微信稿",
  XHS: "小红书稿",
  X_ARTICLE: "X Article 稿",
};

const invalidActionStatuses = new Set<DraftStatus>([
  DraftStatus.ARCHIVED,
  DraftStatus.IN_REVIEW,
  DraftStatus.APPROVED,
  DraftStatus.READY_TO_PUBLISH,
]);

type ErrorDetails = Record<string, string | number | boolean | null | undefined>;

function isRewriteStrategy(value: string): value is RewriteStrategy {
  return value in rewriteStrategyLabels;
}

function isChannelType(value: string): value is ChannelType {
  return value in channelLabels;
}

function formatTimestamp(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function getOpeningExcerpt(content: string): string {
  const excerpt = content
    .replaceAll(/^#+\s+/gm, "")
    .split(/\n{2,}/)
    .map((segment: string) => segment.trim())
    .find((segment: string) => segment.length > 0);

  return excerpt ?? "";
}

function summarizeStructure(content: string): string {
  const headings = content
    .split("\n")
    .filter((line: string) => line.startsWith("## "))
    .map((line: string) => line.replace("## ", "").trim());

  if (headings.length === 0) {
    return "结构保持单线推进，强调判断连续性。";
  }

  return `结构改成 ${headings.slice(0, 2).join(" / ")}。`;
}

function summarizeClosing(content: string): string {
  const segments = content
    .split(/\n{2,}/)
    .map((segment: string) => segment.trim())
    .filter((segment: string) => segment.length > 0);

  const closing = segments.at(-1);

  return closing ? `结尾收束为：${closing}` : "结尾保持开放判断。";
}

function buildRewriteComparison(rewrite: RewriteSummary, content: string): DraftRewriteComparison {
  return {
    openingShift: rewrite.diffSummary ?? "导语做了轻度重排。",
    structureShift: summarizeStructure(content),
    closeShift: summarizeClosing(content),
  };
}

function buildReadingPane(
  label: string,
  title: string,
  summary: string | null,
  content: string,
  contentFormat: string,
): DraftReadingPane {
  return {
    label,
    title,
    summary,
    content,
    contentFormat,
    openingExcerpt: getOpeningExcerpt(content),
  };
}

function mapRewriteItem(rewrite: RewriteSummary, content: string): DraftRewriteItem {
  const title = rewrite.title ?? "未命名改写版本";

  return {
    id: rewrite.id,
    strategy: rewrite.strategy,
    strategyLabel: rewriteStrategyLabels[rewrite.strategy as RewriteStrategy] ?? rewrite.strategy,
    title,
    diffSummary: rewrite.diffSummary ?? "这版改写主要收紧了开头和段落重心。",
    score: rewrite.score,
    scoreLabel: rewrite.score ? `${Math.round(rewrite.score * 100)} / 100` : "未评分",
    isSelected: rewrite.isSelected,
    createdAt: rewrite.createdAt.toISOString(),
    openingExcerpt: getOpeningExcerpt(content),
    comparison: buildRewriteComparison(rewrite, content),
  };
}

function mapPackageItem(input: {
  id: string;
  channel: string;
  status: string;
  exportPath: string | null;
  draftUrl: string | null;
  updatedAt: Date;
}): DraftPublishPackageItem {
  const channel = input.channel as ChannelType;

  return {
    id: input.id,
    channel: input.channel,
    channelLabel: channelLabels[channel] ?? input.channel,
    status: input.status,
    statusLabel: publishStatusLabels[input.status] ?? input.status,
    exportPath: input.exportPath,
    draftUrl: input.draftUrl,
    updatedAt: input.updatedAt.toISOString(),
  };
}

function mapJob(job: JobRecord): DraftWorkbenchJob {
  const label =
    job.type === JobType.REWRITE_DRAFT
      ? "改写任务"
      : job.type === JobType.PACKAGE_DRAFT
        ? "平台包装任务"
        : "后台任务";

  return {
    id: job.id,
    type: job.type,
    status: job.status as WorkbenchJobStatus,
    label,
    startedAt: formatTimestamp(job.startedAt),
    finishedAt: formatTimestamp(job.finishedAt),
    updatedAt: job.updatedAt.toISOString(),
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
  };
}

function mapJobResponse(job: JobRecord, draftId: string): DraftActionJobResponse {
  return {
    jobId: job.id,
    status: job.status as WorkbenchJobStatus,
    draftId,
    entityType: "DRAFT",
    entityId: draftId,
  };
}

function mapHeader(draft: DraftDetail): DraftWorkbenchHeader {
  return {
    id: draft.id,
    topicClusterId: draft.topicClusterId,
    draftType: draft.draftType,
    draftTypeLabel: draftTypeLabels[draft.draftType],
    status: draft.status,
    statusLabel: draftStatusLabels[draft.status],
    title: draft.title,
    summary: draft.summary,
    version: draft.version,
    currentRewriteId: draft.currentRewriteId,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

function requireValue<T>(
  value: T | null,
  code: string,
  message: string,
  status: number,
  details?: ErrorDetails,
): T {
  if (value === null) {
    throw new DraftWorkbenchError(code, message, status, details);
  }

  return value;
}

async function listJobsForDraft(draftId: string): Promise<JobRecord[]> {
  const result = await jobRepository.list({
    entityType: JobEntityType.DRAFT,
    entityId: draftId,
    pageSize: 20,
  });

  return result.items;
}

function getDisabledReason(
  draft: DraftDetail,
  activeJobs: JobRecord[],
  action: "rewrite" | "package",
): string | null {
  if (draft.draftType !== DraftType.MASTER && action === "rewrite") {
    return "只有母稿允许触发标准改写流程。";
  }

  if (invalidActionStatuses.has(draft.status)) {
    return "当前状态不允许继续推进该动作。";
  }

  if (
    activeJobs.some(
      (job: JobRecord) =>
        job.type === (action === "rewrite" ? JobType.REWRITE_DRAFT : JobType.PACKAGE_DRAFT) &&
        (job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING),
    )
  ) {
    return action === "rewrite" ? "已有改写任务在运行。" : "已有包装任务在运行。";
  }

  return null;
}

function buildCapabilities(draft: DraftDetail, jobs: JobRecord[]): DraftWorkbenchCapabilities {
  const rewriteDisabledReason = getDisabledReason(draft, jobs, "rewrite");
  const packageDisabledReason = getDisabledReason(draft, jobs, "package");

  return {
    canTriggerRewrite: rewriteDisabledReason === null,
    canSelectRewrite: true,
    canPackage: packageDisabledReason === null,
    disabledReason: packageDisabledReason ?? rewriteDisabledReason,
  };
}

function buildNotices(
  detail: DraftDetail,
  selectedRewrite: DraftRewriteItem | null,
  jobs: JobRecord[],
): DraftWorkbenchNotice[] {
  const notices: DraftWorkbenchNotice[] = [];
  const latestJob = jobs[0];

  if (selectedRewrite) {
    notices.push({
      tone: "info",
      title: "当前阅读的是已选改写版本",
      description: `当前版本来自 ${selectedRewrite.strategyLabel}，适合继续判断是否进入平台包装。`,
    });
  } else {
    notices.push({
      tone: "warning",
      title: "当前仍在阅读母稿基线",
      description: "你还没有选中改写版本；包装时会默认回退到母稿正文。",
    });
  }

  if (detail.publishPackages.length > 0) {
    notices.push({
      tone: "success",
      title: "包装产物已存在",
      description:
        "侧栏流程区会继续显示最近的渠道状态，重复触发会更新当前渠道包而不是新增第二套资源。",
    });
  }

  if (latestJob?.status === JobStatus.FAILED) {
    notices.push({
      tone: "danger",
      title: "最近一次任务失败",
      description: latestJob.errorMessage ?? "请查看错误码后重试。",
    });
  }

  return notices;
}

function mapDirectoryItem(draft: DraftDetail): DraftDirectoryItem {
  return {
    id: draft.id,
    title: draft.title,
    summary: draft.summary,
    status: draft.status,
    statusLabel: draftStatusLabels[draft.status],
    draftTypeLabel: draftTypeLabels[draft.draftType],
    version: draft.version,
    updatedAt: draft.updatedAt.toISOString(),
    currentRewriteLabel: draft.currentRewrite
      ? `${rewriteStrategyLabels[draft.currentRewrite.strategy as RewriteStrategy]} / 当前选择`
      : "母稿正文",
  };
}

export async function getDraftDirectoryItems(): Promise<DraftDirectoryItem[]> {
  await ensureDraftWorkbenchSeed();

  const drafts = await Promise.all(
    workbenchSeedDraftIds.map(async (draftId: string) => draftRepository.getById(draftId)),
  );

  return drafts
    .filter((draft: DraftDetail | null): draft is DraftDetail => draft !== null)
    .sort(
      (left: DraftDetail, right: DraftDetail) =>
        right.updatedAt.getTime() - left.updatedAt.getTime(),
    )
    .map(mapDirectoryItem);
}

export async function getDefaultDraftId(): Promise<string | null> {
  const drafts = await getDraftDirectoryItems();
  return drafts[0]?.id ?? null;
}

export async function getDraftWorkbenchDetail(draftId: string): Promise<DraftWorkbenchDetail> {
  await ensureDraftWorkbenchSeed();
  const jobs = await listJobsForDraft(draftId);
  const draft = requireValue(
    await draftRepository.getById(draftId),
    "DRAFT_NOT_FOUND",
    "Draft not found.",
    404,
    {
      draftId,
    },
  );

  const rewrites = await draftRepository.listRewrites(draft.id);
  const packages = await publishRepository.listByDraftId(draft.id);
  const selectedRewriteSummary =
    rewrites.find((rewrite: RewriteSummary) => rewrite.isSelected) ??
    rewrites.find((rewrite: RewriteSummary) => rewrite.id === draft.currentRewriteId) ??
    null;

  const rewriteItems = rewrites.map((rewrite: RewriteSummary) =>
    mapRewriteItem(rewrite, rewrite.content),
  );

  const selectedRewrite =
    rewriteItems.find((rewrite: DraftRewriteItem) => rewrite.isSelected) ?? null;
  const activeContent = selectedRewriteSummary?.content ?? draft.content;
  const activeTitle = selectedRewriteSummary?.title ?? draft.title;
  const activeSummary = selectedRewriteSummary?.diffSummary ?? draft.summary;
  const recentJobs = jobs.map(mapJob);
  const capabilities = buildCapabilities(draft, jobs);

  return {
    draft: mapHeader(draft),
    readingPane: buildReadingPane(
      selectedRewrite ? "当前选择版本" : "当前阅读版本",
      activeTitle,
      activeSummary,
      activeContent,
      draft.contentFormat,
    ),
    basePane: buildReadingPane(
      "母稿基线",
      draft.title,
      draft.summary,
      draft.content,
      draft.contentFormat,
    ),
    selectedRewrite,
    rewrites: rewriteItems,
    packages: packages.map(mapPackageItem),
    activeJobs: recentJobs.filter(
      (job: DraftWorkbenchJob) =>
        job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING,
    ),
    latestJob: recentJobs[0] ?? null,
    capabilities,
    notices: buildNotices(draft, selectedRewrite, jobs),
  };
}

function mapAssetItem(asset: {
  id: string;
  type: string;
  path: string;
  mimeType: string | null;
  fileSize: number | null;
  promptText: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DraftAssetItem {
  return {
    id: asset.id,
    type: asset.type,
    path: asset.path,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    promptText: asset.promptText,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export async function listDraftRewrites(draftId: string): Promise<DraftRewriteListResponse> {
  await ensureDraftWorkbenchSeed();
  requireValue(await draftRepository.getById(draftId), "DRAFT_NOT_FOUND", "Draft not found.", 404, {
    draftId,
  });

  const rewrites = await draftRepository.listRewrites(draftId);

  return {
    items: rewrites.map((rewrite: RewriteSummary) => mapRewriteItem(rewrite, rewrite.content)),
  };
}

export async function listDraftAssets(draftId: string): Promise<DraftAssetListResponse> {
  await ensureDraftWorkbenchSeed();
  requireValue(await draftRepository.getById(draftId), "DRAFT_NOT_FOUND", "Draft not found.", 404, {
    draftId,
  });

  const assets = await draftRepository.listAssets(draftId);

  return {
    items: assets.map(mapAssetItem),
  };
}

export async function listDraftPublishPackages(
  draftId: string,
): Promise<DraftPublishPackageListResponse> {
  await ensureDraftWorkbenchSeed();
  requireValue(await draftRepository.getById(draftId), "DRAFT_NOT_FOUND", "Draft not found.", 404, {
    draftId,
  });

  const packages = await publishRepository.listByDraftId(draftId);

  return {
    items: packages.map(mapPackageItem),
  };
}

function toSortedUniqueStrategies(strategies: string[]): RewriteStrategy[] {
  const filtered = strategies.filter(isRewriteStrategy);
  const unique = Array.from(new Set(filtered));
  return unique.sort();
}

function toSortedUniqueChannels(channels: string[]): ChannelType[] {
  const filtered = channels.filter(isChannelType);
  const unique = Array.from(new Set(filtered));
  return unique.sort();
}

export async function triggerRewriteJob(
  draftId: string,
  input: TriggerRewriteInput,
): Promise<DraftActionJobResponse> {
  await ensureDraftWorkbenchSeed();
  const draft = requireValue(
    await draftRepository.getById(draftId),
    "DRAFT_NOT_FOUND",
    "Draft not found.",
    404,
    {
      draftId,
    },
  );
  invariant(
    draft.draftType === DraftType.MASTER,
    "DRAFT_TYPE_NOT_SUPPORTED",
    "Only master drafts support rewrite.",
    409,
    {
      draftId,
      draftType: draft.draftType,
    },
  );
  invariant(
    !invalidActionStatuses.has(draft.status),
    "DRAFT_STATUS_INVALID",
    "Draft is not in a valid state for rewrite.",
    409,
    {
      draftId,
      currentStatus: draft.status,
    },
  );

  const strategies = toSortedUniqueStrategies(input.strategies);
  invariant(
    strategies.length === input.strategies.length,
    "INVALID_REQUEST_BODY",
    "Rewrite strategies must be valid and unique.",
    400,
    {
      draftId,
    },
  );
  invariant(
    strategies.length > 0,
    "INVALID_REQUEST_BODY",
    "At least one rewrite strategy is required.",
    400,
    {
      draftId,
    },
  );

  const idempotencyKey = `rewrite:${draft.id}:${strategies.join("+")}:${input.voiceProfileId ?? "default"}`;
  const activeJob = await jobRepository.findActiveByIdempotencyKey(idempotencyKey);

  if (activeJob) {
    return mapJobResponse(activeJob, draft.id);
  }

  const job = await jobsRuntime.enqueueWorkflowJob({
    type: JobType.REWRITE_DRAFT,
    entityType: JobEntityType.DRAFT,
    entityId: draft.id,
    draftId: draft.id,
    topicClusterId: draft.topicClusterId,
    idempotencyKey,
    triggeredBy: "draft-workbench",
    input: {
      strategies,
      voiceProfileId: input.voiceProfileId ?? null,
    },
  });

  return {
    jobId: job.jobId,
    status: job.status as WorkbenchJobStatus,
    draftId: draft.id,
    entityType: "DRAFT",
    entityId: draft.id,
  };
}

export async function selectRewriteVersion(
  draftId: string,
  input: SelectRewriteInput,
): Promise<DraftWorkbenchDetail> {
  await ensureDraftWorkbenchSeed();
  const draft = requireValue(
    await draftRepository.getById(draftId),
    "DRAFT_NOT_FOUND",
    "Draft not found.",
    404,
    {
      draftId,
    },
  );
  invariant(input.rewriteId.length > 0, "INVALID_REQUEST_BODY", "rewriteId is required.", 400, {
    draftId,
  });

  const rewrites = await draftRepository.listRewrites(draft.id);
  const rewrite = rewrites.find((item: RewriteSummary) => item.id === input.rewriteId) ?? null;
  invariant(
    Boolean(rewrite),
    "REWRITE_DOES_NOT_BELONG_TO_DRAFT",
    "Rewrite does not belong to draft.",
    404,
    {
      draftId,
      rewriteId: input.rewriteId,
    },
  );

  const updatedDraft = requireValue(
    await draftRepository.selectRewrite(draft.id, input.rewriteId),
    "REWRITE_DOES_NOT_BELONG_TO_DRAFT",
    "Rewrite does not belong to draft.",
    404,
    {
      draftId,
      rewriteId: input.rewriteId,
    },
  );

  return getDraftWorkbenchDetail(updatedDraft.id);
}

export async function triggerPackagingJob(
  draftId: string,
  input: PackageDraftInput,
): Promise<DraftActionJobResponse> {
  await ensureDraftWorkbenchSeed();
  const draft = requireValue(
    await draftRepository.getById(draftId),
    "DRAFT_NOT_FOUND",
    "Draft not found.",
    404,
    {
      draftId,
    },
  );
  invariant(
    !invalidActionStatuses.has(draft.status),
    "DRAFT_STATUS_INVALID",
    "Draft is not in a valid state for packaging.",
    409,
    {
      draftId,
      currentStatus: draft.status,
    },
  );

  const channels = toSortedUniqueChannels(input.channels);
  invariant(
    input.channels.length > 0,
    "INVALID_REQUEST_BODY",
    "At least one packaging channel is required.",
    400,
    {
      draftId,
    },
  );
  invariant(
    channels.length > 0,
    "INVALID_REQUEST_BODY",
    "At least one packaging channel is required.",
    400,
    {
      draftId,
    },
  );
  invariant(
    input.channels.filter(isChannelType).length === input.channels.length,
    "INVALID_REQUEST_BODY",
    "Packaging channels must be valid.",
    400,
    {
      draftId,
    },
  );
  invariant(
    channels.length === input.channels.length,
    "PACKAGE_CHANNEL_DUPLICATED",
    "Duplicate channels are not allowed.",
    409,
    {
      draftId,
    },
  );

  const rewrites = await draftRepository.listRewrites(draft.id);
  const selectedRewriteId =
    input.rewriteId ??
    rewrites.find((rewrite: RewriteSummary) => rewrite.isSelected)?.id ??
    draft.currentRewriteId;

  if (selectedRewriteId) {
    invariant(
      rewrites.some((rewrite: RewriteSummary) => rewrite.id === selectedRewriteId),
      "REWRITE_DOES_NOT_BELONG_TO_DRAFT",
      "Rewrite does not belong to draft.",
      404,
      {
        draftId,
        rewriteId: selectedRewriteId,
      },
    );
  }

  const idempotencyKey = `package:${draft.id}:${selectedRewriteId ?? "base"}:${channels.join("+")}`;
  const activeJob = await jobRepository.findActiveByIdempotencyKey(idempotencyKey);

  if (activeJob) {
    return mapJobResponse(activeJob, draft.id);
  }

  const job = await jobsRuntime.enqueueWorkflowJob({
    type: JobType.PACKAGE_DRAFT,
    entityType: JobEntityType.DRAFT,
    entityId: draft.id,
    draftId: draft.id,
    topicClusterId: draft.topicClusterId,
    idempotencyKey,
    triggeredBy: "draft-workbench",
    input: {
      channels,
      rewriteId: selectedRewriteId ?? null,
    },
  });

  return {
    jobId: job.jobId,
    status: job.status as WorkbenchJobStatus,
    draftId: draft.id,
    entityType: "DRAFT",
    entityId: draft.id,
  };
}
