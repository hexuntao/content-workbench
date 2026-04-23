import {
  ChannelType,
  DraftStatus,
  DraftType,
  JobEntityType,
  JobStatus,
  JobType,
  type Prisma,
  PublishStatus,
  RewriteStrategy,
} from "@prisma/client";
import { DraftWorkbenchError, invariant } from "@/features/drafts/server/errors";
import {
  ensureDraftWorkbenchSeed,
  workbenchSeedDraftIds,
} from "@/features/drafts/server/mock-seed";
import type {
  DraftActionJobResponse,
  DraftDirectoryItem,
  DraftPublishPackageItem,
  DraftReadingPane,
  DraftRewriteComparison,
  DraftRewriteItem,
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

const draftRepository = createDraftRepository();
const publishRepository = createPublishRepository();
const jobRepository = createJobRepository();

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

type RewriteJobPayload = {
  strategies: RewriteStrategy[];
  voiceProfileId: string | null;
};

type PackageJobPayload = {
  channels: ChannelType[];
  rewriteId: string | null;
};

type JobOutputPayload = {
  appliedAt?: string;
  createdRewriteIds?: string[];
  createdPackageIds?: string[];
  summary?: string;
};

type ErrorDetails = Record<string, string | number | boolean | null | undefined>;

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function parseRewriteJobPayload(job: JobRecord): RewriteJobPayload {
  const input = isJsonObject(job.input) ? job.input : {};
  const strategies = Array.isArray(input.strategies)
    ? input.strategies
        .filter((value: Prisma.JsonValue): value is string => typeof value === "string")
        .filter(isRewriteStrategy)
    : [];
  const voiceProfileId = typeof input.voiceProfileId === "string" ? input.voiceProfileId : null;

  return {
    strategies,
    voiceProfileId,
  };
}

function parsePackageJobPayload(job: JobRecord): PackageJobPayload {
  const input = isJsonObject(job.input) ? job.input : {};
  const channels = Array.isArray(input.channels)
    ? input.channels
        .filter((value: Prisma.JsonValue): value is string => typeof value === "string")
        .filter(isChannelType)
    : [];
  const rewriteId = typeof input.rewriteId === "string" ? input.rewriteId : null;

  return {
    channels,
    rewriteId,
  };
}

function parseJobOutput(job: JobRecord): JobOutputPayload {
  const output = isJsonObject(job.output) ? job.output : {};
  const createdRewriteIds = Array.isArray(output.createdRewriteIds)
    ? output.createdRewriteIds.filter(
        (value: Prisma.JsonValue): value is string => typeof value === "string",
      )
    : undefined;
  const createdPackageIds = Array.isArray(output.createdPackageIds)
    ? output.createdPackageIds.filter(
        (value: Prisma.JsonValue): value is string => typeof value === "string",
      )
    : undefined;

  return {
    appliedAt: typeof output.appliedAt === "string" ? output.appliedAt : undefined,
    createdRewriteIds,
    createdPackageIds,
    summary: typeof output.summary === "string" ? output.summary : undefined,
  };
}

async function listJobsForDraft(draftId: string): Promise<JobRecord[]> {
  const result = await jobRepository.list({
    entityType: JobEntityType.DRAFT,
    entityId: draftId,
    pageSize: 20,
  });

  return result.items;
}

function buildMockRewriteContent(baseDraft: DraftDetail, strategy: RewriteStrategy): string {
  const voiceSentence =
    strategy === RewriteStrategy.AUTHOR_VOICE
      ? "这一版把判断提前，用更像主笔手记的方式收紧导语。"
      : strategy === RewriteStrategy.DE_AI
        ? "这一版删掉泛泛铺垫，把句子压成更直接的结论。"
        : strategy === RewriteStrategy.ORAL
          ? "这一版把表达换成更口头的推进方式。"
          : "这一版混合了节奏收紧和观点前置两种处理。";

  return `# ${baseDraft.title}

${voiceSentence}

## 编辑判断

${baseDraft.summary ?? "这份母稿继续围绕编辑判断与内容工作流展开。"}

## 结构调整

这次 mock 改写保留原文主张，但会把重点更早抬出来，让读者更快知道为什么要继续读下去。

## 下一步

如果这版成为当前选择，平台包装就应该直接基于这一版展开，而不是再回到原始母稿重复整理。`;
}

function getMockRewriteTitle(baseDraft: DraftDetail, strategy: RewriteStrategy): string {
  if (strategy === RewriteStrategy.AUTHOR_VOICE) {
    return `${baseDraft.title}：把判断提前的一版`;
  }

  if (strategy === RewriteStrategy.DE_AI) {
    return `${baseDraft.title}：去模板味的一版`;
  }

  if (strategy === RewriteStrategy.ORAL) {
    return `${baseDraft.title}：更口语的一版`;
  }

  return `${baseDraft.title}：混合重写的一版`;
}

function getMockRewriteSummary(strategy: RewriteStrategy): string {
  if (strategy === RewriteStrategy.AUTHOR_VOICE) {
    return "把主张前置，语气更像编辑判断稿。";
  }

  if (strategy === RewriteStrategy.DE_AI) {
    return "减少模板化衔接，把句子压得更直接。";
  }

  if (strategy === RewriteStrategy.ORAL) {
    return "提高口语密度，适合更轻的阅读节奏。";
  }

  return "混合处理结构和语气，适合做中间版本。";
}

function getMockRewriteScore(strategy: RewriteStrategy): number {
  if (strategy === RewriteStrategy.AUTHOR_VOICE) {
    return 0.92;
  }

  if (strategy === RewriteStrategy.DE_AI) {
    return 0.88;
  }

  if (strategy === RewriteStrategy.ORAL) {
    return 0.81;
  }

  return 0.86;
}

function getMockPackageSummary(channel: ChannelType): string {
  if (channel === ChannelType.WECHAT) {
    return "保留论证展开与段落承接，适合长文发布。";
  }

  if (channel === ChannelType.XHS) {
    return "压缩成更快进入结论的节奏，强调可扫读性。";
  }

  return "保留观点推进，但缩短导语与中段转场。";
}

function buildMockPackageContent(
  draft: DraftDetail,
  selectedRewrite: RewriteSummary | null,
  channel: ChannelType,
): string {
  const title = selectedRewrite?.title ?? draft.title;
  const opening = selectedRewrite
    ? "这份包装基于当前选中的改写版本。"
    : "这份包装直接使用母稿正文作为基线。";

  return `# ${title}

${opening}

## 渠道

${channelLabels[channel]}

## 包装说明

${getMockPackageSummary(channel)}`;
}

function reduceDraftStatusAfterRewrite(currentStatus: DraftStatus): DraftStatus {
  if (currentStatus === DraftStatus.CREATED || currentStatus === DraftStatus.REJECTED) {
    return DraftStatus.REWRITTEN;
  }

  if (currentStatus === DraftStatus.REWRITTEN || currentStatus === DraftStatus.PACKAGED) {
    return currentStatus;
  }

  throw new DraftWorkbenchError(
    "DRAFT_STATUS_INVALID",
    "Draft is not in a valid state for rewrite.",
    409,
    {
      currentStatus,
      action: "completeRewrite",
    },
  );
}

function reduceDraftStatusAfterPackaging(currentStatus: DraftStatus): DraftStatus {
  if (
    currentStatus === DraftStatus.CREATED ||
    currentStatus === DraftStatus.REWRITTEN ||
    currentStatus === DraftStatus.PACKAGED
  ) {
    return DraftStatus.PACKAGED;
  }

  throw new DraftWorkbenchError(
    "DRAFT_STATUS_INVALID",
    "Draft is not in a valid state for packaging.",
    409,
    {
      currentStatus,
      action: "completePackaging",
    },
  );
}

async function applyRewriteJob(job: JobRecord): Promise<JobOutputPayload> {
  const draft = requireValue(
    await draftRepository.getById(job.entityId),
    "DRAFT_NOT_FOUND",
    "Draft not found.",
    404,
    {
      draftId: job.entityId,
    },
  );

  const payload = parseRewriteJobPayload(job);
  const existingRewrites = await draftRepository.listRewrites(draft.id);
  const existingIds = new Set(existingRewrites.map((rewrite: RewriteSummary) => rewrite.id));
  const createdRewriteIds: string[] = [];

  for (const strategy of payload.strategies) {
    const rewriteId = `${job.id}_${strategy.toLowerCase()}`;

    if (existingIds.has(rewriteId)) {
      createdRewriteIds.push(rewriteId);
      continue;
    }

    await draftRepository.createRewrite({
      id: rewriteId,
      draftId: draft.id,
      strategy,
      title: getMockRewriteTitle(draft, strategy),
      content: buildMockRewriteContent(draft, strategy),
      diffSummary: getMockRewriteSummary(strategy),
      score: getMockRewriteScore(strategy),
      isSelected: false,
      metadata: {
        mockedBy: "thread-4",
        voiceProfileId: payload.voiceProfileId,
      },
    });
    createdRewriteIds.push(rewriteId);
  }

  const updatedDraft = requireValue(
    await draftRepository.getById(draft.id),
    "DRAFT_NOT_FOUND",
    "Draft not found.",
    404,
    {
      draftId: draft.id,
    },
  );

  if (!updatedDraft.currentRewriteId && createdRewriteIds[0]) {
    await draftRepository.selectRewrite(updatedDraft.id, createdRewriteIds[0]);
  }

  const nextStatus = reduceDraftStatusAfterRewrite(updatedDraft.status);

  if (nextStatus !== updatedDraft.status) {
    await draftRepository.update(updatedDraft.id, {
      status: nextStatus,
    });
  }

  return {
    appliedAt: new Date().toISOString(),
    createdRewriteIds,
    summary: `Created ${createdRewriteIds.length} rewrite version(s).`,
  };
}

async function applyPackageJob(job: JobRecord): Promise<JobOutputPayload> {
  const draft = requireValue(
    await draftRepository.getById(job.entityId),
    "DRAFT_NOT_FOUND",
    "Draft not found.",
    404,
    {
      draftId: job.entityId,
    },
  );

  const payload = parsePackageJobPayload(job);
  const rewrites = await draftRepository.listRewrites(draft.id);
  const explicitRewrite = payload.rewriteId
    ? (rewrites.find((rewrite: RewriteSummary) => rewrite.id === payload.rewriteId) ?? null)
    : null;
  const selectedRewrite =
    explicitRewrite ?? rewrites.find((rewrite: RewriteSummary) => rewrite.isSelected) ?? null;
  const createdPackageIds: string[] = [];

  for (const channel of payload.channels) {
    const publishPackage = await publishRepository.upsertByDraftAndChannel({
      draftId: draft.id,
      channel,
      status:
        channel === ChannelType.X_ARTICLE ? PublishStatus.DRAFT_CREATED : PublishStatus.EXPORTED,
      title: selectedRewrite?.title ?? draft.title,
      summary: getMockPackageSummary(channel),
      content: buildMockPackageContent(draft, selectedRewrite, channel),
      contentFormat: "markdown",
      exportPath: `mock://exports/${channel.toLowerCase()}/${draft.id}.md`,
      draftUrl:
        channel === ChannelType.X_ARTICLE
          ? `https://example.com/remote-draft/${draft.id}/${channel.toLowerCase()}`
          : null,
      metadata: {
        mockedBy: "thread-4",
        sourceRewriteId: selectedRewrite?.id ?? null,
      },
    });

    createdPackageIds.push(publishPackage.id);
  }

  const nextStatus = reduceDraftStatusAfterPackaging(draft.status);

  if (nextStatus !== draft.status) {
    await draftRepository.update(draft.id, {
      status: nextStatus,
    });
  }

  return {
    appliedAt: new Date().toISOString(),
    createdPackageIds,
    summary: `Packaged ${createdPackageIds.length} channel output(s).`,
  };
}

async function advanceMockJob(job: JobRecord): Promise<JobRecord> {
  if (
    job.status === JobStatus.FAILED ||
    job.status === JobStatus.CANCELED ||
    job.status === JobStatus.SUCCEEDED
  ) {
    return job;
  }

  const elapsedMs = Date.now() - job.createdAt.getTime();
  let currentJob = job;

  if (currentJob.status === JobStatus.QUEUED && elapsedMs >= 250) {
    currentJob = await jobRepository.update(currentJob.id, {
      status: JobStatus.RUNNING,
      startedAt: currentJob.startedAt ?? new Date(),
    });
  }

  if (
    (currentJob.status === JobStatus.RUNNING || currentJob.status === JobStatus.QUEUED) &&
    elapsedMs >= 1200
  ) {
    const output = parseJobOutput(currentJob);
    const appliedOutput =
      output.appliedAt !== undefined
        ? output
        : currentJob.type === JobType.REWRITE_DRAFT
          ? await applyRewriteJob(currentJob)
          : currentJob.type === JobType.PACKAGE_DRAFT
            ? await applyPackageJob(currentJob)
            : {
                appliedAt: new Date().toISOString(),
                summary: "Mock job completed.",
              };

    currentJob = await jobRepository.update(currentJob.id, {
      status: JobStatus.SUCCEEDED,
      startedAt: currentJob.startedAt ?? new Date(),
      finishedAt: new Date(),
      output: appliedOutput,
      errorCode: null,
      errorMessage: null,
    });
  }

  return currentJob;
}

async function syncDraftJobs(draftId: string): Promise<JobRecord[]> {
  const jobs = await listJobsForDraft(draftId);
  const synced: JobRecord[] = [];

  for (const job of jobs) {
    synced.push(await advanceMockJob(job));
  }

  return synced;
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
  const syncedJobs = await syncDraftJobs(draftId);
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
    mapRewriteItem(rewrite, buildMockRewriteContent(draft, rewrite.strategy as RewriteStrategy)),
  );

  const selectedRewrite =
    rewriteItems.find((rewrite: DraftRewriteItem) => rewrite.isSelected) ?? null;
  const activeContent = selectedRewriteSummary
    ? buildMockRewriteContent(draft, selectedRewriteSummary.strategy as RewriteStrategy)
    : draft.content;
  const activeTitle = selectedRewriteSummary?.title ?? draft.title;
  const activeSummary = selectedRewriteSummary?.diffSummary ?? draft.summary;
  const recentJobs = syncedJobs.map(mapJob);
  const capabilities = buildCapabilities(draft, syncedJobs);

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
    notices: buildNotices(draft, selectedRewrite, syncedJobs),
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
  await syncDraftJobs(draftId);
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

  const job = await jobRepository.create({
    id: `job_${crypto.randomUUID()}`,
    type: JobType.REWRITE_DRAFT,
    status: JobStatus.QUEUED,
    entityType: JobEntityType.DRAFT,
    entityId: draft.id,
    draftId: draft.id,
    topicClusterId: draft.topicClusterId,
    idempotencyKey,
    triggeredBy: "thread-4-mock",
    input: {
      strategies,
      voiceProfileId: input.voiceProfileId ?? null,
    },
  });

  return mapJobResponse(job, draft.id);
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
  await syncDraftJobs(draftId);
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

  const job = await jobRepository.create({
    id: `job_${crypto.randomUUID()}`,
    type: JobType.PACKAGE_DRAFT,
    status: JobStatus.QUEUED,
    entityType: JobEntityType.DRAFT,
    entityId: draft.id,
    draftId: draft.id,
    topicClusterId: draft.topicClusterId,
    idempotencyKey,
    triggeredBy: "thread-4-mock",
    input: {
      channels,
      rewriteId: selectedRewriteId ?? null,
    },
  });

  return mapJobResponse(job, draft.id);
}
