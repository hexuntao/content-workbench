import {
  ChannelType,
  DraftStatus,
  JobEntityType,
  JobStatus,
  JobType,
  PublishStatus,
  type ReviewStatus,
} from "@prisma/client";
import { invariant, PublishWorkbenchError } from "@/features/publish/server/errors";
import type {
  PublishActionJobResponse,
  PublishBoardItem,
  PublishBoardLane,
  PublishBoardSnapshot,
  PublishCapabilitySet,
  PublishDetail,
  PublishJobItem,
  PublishNotice,
  PublishPackageApiItem,
  PublishPackageListResponse,
  PublishStage,
} from "@/features/publish/types";
import {
  ensureReviewWorkbenchSeed,
  publishWorkbenchPackageIds,
} from "@/features/review/server/mock-seed";
import { runInTransaction } from "@/server/db";
import {
  createDraftRepository,
  createJobRepository,
  createPublishRepository,
  type DraftDetail,
  type JobRecord,
  type PublishPackageDetail,
  type PublishPackageFilters,
  type PublishPackageSummary,
} from "@/server/repositories";
import { createJobsRuntime } from "@/server/services/jobs/runtime";

const draftRepository = createDraftRepository();
const publishRepository = createPublishRepository();
const jobRepository = createJobRepository();
const jobsRuntime = createJobsRuntime();

const channelLabels: Record<ChannelType, string> = {
  WECHAT: "微信公众号",
  XHS: "小红书",
  X_ARTICLE: "X Article",
};

const publishStatusLabels: Record<PublishStatus, string> = {
  PENDING: "待导出",
  EXPORTED: "已导出",
  DRAFT_CREATED: "已建远端草稿",
  PUBLISHED: "已发布",
  FAILED: "执行失败",
};

const draftStatusLabels: Record<DraftStatus, string> = {
  CREATED: "母稿已建立",
  REWRITTEN: "已改写",
  PACKAGED: "已包装",
  IN_REVIEW: "审核中",
  APPROVED: "审核通过",
  REJECTED: "已退回修改",
  READY_TO_PUBLISH: "待发布",
  ARCHIVED: "已归档",
};

const reviewStatusLabels: Record<ReviewStatus, string> = {
  PENDING: "待决策",
  CHANGES_REQUESTED: "已退回",
  APPROVED: "已通过",
};

type PublishListInput = {
  status?: string | null;
  channel?: string | null;
  draftId?: string | null;
  page?: number;
  pageSize?: number;
};

type PublishRecordInput = {
  publishedUrl: string;
  publishedAt: string;
  notes: string | null;
};

function formatDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function isChannelType(value: string): value is ChannelType {
  return value in channelLabels;
}

function isPublishStatus(value: string): value is PublishStatus {
  return value in publishStatusLabels;
}

function isChannelDraftSupported(channel: ChannelType): boolean {
  return channel === ChannelType.WECHAT || channel === ChannelType.X_ARTICLE;
}

function buildJobItem(job: JobRecord): PublishJobItem {
  return {
    id: job.id,
    label:
      job.type === JobType.EXPORT_PUBLISH_PACKAGE
        ? "导出任务"
        : job.type === JobType.CREATE_REMOTE_DRAFT
          ? "远端草稿任务"
          : "后台任务",
    status: job.status,
    updatedAt: job.updatedAt.toISOString(),
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
  };
}

function buildReviewGate(draft: DraftDetail): {
  state: "locked" | "ready" | "done";
  label: string;
} {
  if (draft.status === DraftStatus.READY_TO_PUBLISH) {
    return {
      state: "ready",
      label: "门禁已打开",
    };
  }

  if (draft.status === DraftStatus.ARCHIVED) {
    return {
      state: "done",
      label: "归档完成",
    };
  }

  return {
    state: "locked",
    label: draft.status === DraftStatus.APPROVED ? "等待进入待发布阶段" : "审核门禁未过",
  };
}

function getNextActionLabel(publishPackage: PublishPackageDetail, draft: DraftDetail): string {
  if (publishPackage.status === PublishStatus.PUBLISHED) {
    return "已完成回填";
  }

  if (publishPackage.status === PublishStatus.FAILED) {
    return "先重试导出";
  }

  if (publishPackage.status === PublishStatus.PENDING) {
    return "先生成导出物";
  }

  if (publishPackage.status === PublishStatus.EXPORTED) {
    return draft.status === DraftStatus.READY_TO_PUBLISH ? "可创建远端草稿" : "等待门禁解锁";
  }

  return "等待人工发布后回填";
}

function mapPublishBoardItem(
  publishPackage: PublishPackageDetail,
  draft: DraftDetail,
): PublishBoardItem {
  const channel = publishPackage.channel as ChannelType;
  const gate = buildReviewGate(draft);

  return {
    id: publishPackage.id,
    draftId: publishPackage.draftId,
    title: publishPackage.title ?? draft.title,
    summary: publishPackage.summary ?? draft.summary,
    channel: publishPackage.channel,
    channelLabel: channelLabels[channel] ?? publishPackage.channel,
    status: publishPackage.status,
    statusLabel: publishStatusLabels[publishPackage.status],
    reviewGate: gate.state,
    reviewGateLabel: gate.label,
    nextActionLabel: getNextActionLabel(publishPackage, draft),
    updatedAt: publishPackage.updatedAt.toISOString(),
    exportPath: publishPackage.exportPath,
    draftUrl: publishPackage.draftUrl,
    publishedUrl: publishPackage.publication?.publishedUrl ?? null,
  };
}

function mapPublishLane(
  id: string,
  title: string,
  description: string,
  items: PublishBoardItem[],
): PublishBoardLane {
  return {
    id,
    title,
    description,
    items,
  };
}

function mapPublishPackageApiItem(item: PublishPackageSummary): PublishPackageApiItem {
  return {
    id: item.id,
    draftId: item.draftId,
    channel: item.channel,
    status: item.status,
    title: item.title,
    summary: item.summary,
    exportPath: item.exportPath,
    draftUrl: item.draftUrl,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function parsePublishFilters(input: PublishListInput): PublishPackageFilters {
  const filters: PublishPackageFilters = {
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 20,
  };

  if (input.status && isPublishStatus(input.status)) {
    filters.status = input.status;
  }

  if (input.channel && isChannelType(input.channel)) {
    filters.channel = input.channel;
  }

  if (input.draftId) {
    filters.draftId = input.draftId;
  }

  return filters;
}

async function listJobsForPackage(publishPackageId: string): Promise<JobRecord[]> {
  const result = await jobRepository.list({
    entityType: JobEntityType.PUBLISH_PACKAGE,
    entityId: publishPackageId,
    pageSize: 20,
  });

  return result.items;
}

async function ensurePublishSeed(): Promise<void> {
  await ensureReviewWorkbenchSeed();

  const publishedPackage = await publishRepository.getById("package_published_wechat");

  if (publishedPackage?.publication === null) {
    await publishRepository.upsertPublicationRecord({
      publishPackageId: "package_published_wechat",
      channel: ChannelType.WECHAT,
      publishedUrl: "https://example.com/published/wechat/archive-proof",
      publishedAt: new Date("2026-04-23T07:00:00.000Z"),
      notes: "手动从公众号后台发布。",
    });
  }
}

async function getDraftOrThrow(draftId: string): Promise<DraftDetail> {
  const draft = await draftRepository.getById(draftId);

  if (draft === null) {
    throw new PublishWorkbenchError("DRAFT_NOT_FOUND", "Draft not found.", 404, {
      draftId,
    });
  }

  return draft;
}

async function getPackageOrThrow(publishPackageId: string): Promise<PublishPackageDetail> {
  const publishPackage = await publishRepository.getById(publishPackageId);

  if (publishPackage === null) {
    throw new PublishWorkbenchError(
      "PUBLISH_PACKAGE_NOT_FOUND",
      "Publish package not found.",
      404,
      {
        publishPackageId,
      },
    );
  }

  return publishPackage;
}

function assertCanExport(publishPackage: PublishPackageDetail, hasActiveJob: boolean): void {
  invariant(
    publishPackage.status === PublishStatus.PENDING ||
      publishPackage.status === PublishStatus.FAILED,
    "PUBLISH_PACKAGE_STATUS_INVALID",
    "Package is not in a valid state for export.",
    409,
    {
      publishPackageId: publishPackage.id,
      currentStatus: publishPackage.status,
    },
  );
  invariant(
    !hasActiveJob,
    "JOB_IDEMPOTENCY_CONFLICT",
    "An export job is already active for this package.",
    409,
    {
      publishPackageId: publishPackage.id,
    },
  );
}

function assertCanCreateRemoteDraft(
  publishPackage: PublishPackageDetail,
  draft: DraftDetail,
  hasActiveJob: boolean,
): void {
  const channel = publishPackage.channel as ChannelType;

  invariant(
    isChannelDraftSupported(channel),
    "CHANNEL_DRAFT_NOT_SUPPORTED",
    "This channel does not support remote draft creation.",
    409,
    {
      publishPackageId: publishPackage.id,
      channel: publishPackage.channel,
    },
  );
  invariant(
    draft.status === DraftStatus.READY_TO_PUBLISH,
    "REVIEW_REQUIRED_BEFORE_PUBLISH",
    "Draft must be approved and marked ready to publish before creating a remote draft.",
    409,
    {
      draftId: draft.id,
      currentStatus: draft.status,
    },
  );
  invariant(
    publishPackage.status !== PublishStatus.PUBLISHED,
    "PUBLISH_PACKAGE_STATUS_INVALID",
    "Published package cannot create a remote draft.",
    409,
    {
      publishPackageId: publishPackage.id,
      currentStatus: publishPackage.status,
    },
  );
  invariant(
    !hasActiveJob,
    "JOB_IDEMPOTENCY_CONFLICT",
    "A remote draft job is already active for this package.",
    409,
    {
      publishPackageId: publishPackage.id,
    },
  );
}

function assertCanMarkPublished(
  publishPackage: PublishPackageDetail,
  draft: DraftDetail,
  existingPublication: PublishPackageDetail["publication"],
  input: PublishRecordInput,
): void {
  const publishedAt = existingPublication?.publishedAt ?? null;

  invariant(
    publishPackage.status === PublishStatus.PUBLISHED ||
      draft.status === DraftStatus.READY_TO_PUBLISH,
    "REVIEW_REQUIRED_BEFORE_PUBLISH",
    "Draft must be approved and marked ready to publish before recording publication.",
    409,
    {
      draftId: draft.id,
      currentStatus: draft.status,
    },
  );

  invariant(
    publishPackage.exportPath !== null || publishPackage.status === PublishStatus.PUBLISHED,
    "PUBLISH_PACKAGE_STATUS_INVALID",
    "Package must have a valid export before it can be marked published.",
    409,
    {
      publishPackageId: publishPackage.id,
      currentStatus: publishPackage.status,
    },
  );

  if (
    publishPackage.status === PublishStatus.PUBLISHED &&
    publishedAt !== null &&
    publishedAt.toISOString() !== input.publishedAt
  ) {
    throw new PublishWorkbenchError(
      "PUBLICATION_RECORD_INVALID",
      "Published timestamp cannot be silently overwritten.",
      409,
      {
        publishPackageId: publishPackage.id,
        currentPublishedAt: publishedAt.toISOString(),
        nextPublishedAt: input.publishedAt,
      },
    );
  }
}

function buildStages(detail: PublishPackageDetail): PublishStage[] {
  const exportState: PublishStage["state"] =
    detail.status === PublishStatus.FAILED
      ? "failed"
      : detail.status === PublishStatus.EXPORTED ||
          detail.status === PublishStatus.DRAFT_CREATED ||
          detail.status === PublishStatus.PUBLISHED
        ? "done"
        : "active";
  const remoteDraftState: PublishStage["state"] =
    detail.status === PublishStatus.DRAFT_CREATED || detail.status === PublishStatus.PUBLISHED
      ? "done"
      : detail.status === PublishStatus.EXPORTED
        ? "active"
        : detail.status === PublishStatus.FAILED
          ? "failed"
          : "locked";
  const publishedState: PublishStage["state"] =
    detail.status === PublishStatus.PUBLISHED ? "done" : "locked";

  return [
    {
      key: "export",
      label: "1. Export",
      state: exportState,
      description: "先稳定生成导出物，再把路径写回发布包。",
      artifactLabel: "exportPath",
      artifactValue: detail.exportPath,
    },
    {
      key: "remote-draft",
      label: "2. Remote Draft",
      state: remoteDraftState,
      description: "只有渠道支持且审核门禁打开时，才允许创建远端草稿。",
      artifactLabel: "draftUrl",
      artifactValue: detail.draftUrl,
    },
    {
      key: "published",
      label: "3. Mark Published",
      state: publishedState,
      description: "人工发布完成后回填最终链接，形成完整审计证据。",
      artifactLabel: "publishedUrl",
      artifactValue: detail.publication?.publishedUrl ?? null,
    },
  ];
}

function buildCapabilities(
  detail: PublishPackageDetail,
  draft: DraftDetail,
  jobs: JobRecord[],
): PublishCapabilitySet {
  const exportActive = jobs.some(
    (job: JobRecord) =>
      job.type === JobType.EXPORT_PUBLISH_PACKAGE &&
      (job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING),
  );
  const remoteDraftActive = jobs.some(
    (job: JobRecord) =>
      job.type === JobType.CREATE_REMOTE_DRAFT &&
      (job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING),
  );

  const canExport =
    (detail.status === PublishStatus.PENDING || detail.status === PublishStatus.FAILED) &&
    !exportActive;
  const canCreateRemoteDraft =
    isChannelDraftSupported(detail.channel as ChannelType) &&
    draft.status === DraftStatus.READY_TO_PUBLISH &&
    detail.status !== PublishStatus.PUBLISHED &&
    !remoteDraftActive;
  const canMarkPublished =
    (detail.exportPath !== null || detail.status === PublishStatus.PUBLISHED) &&
    (draft.status === DraftStatus.READY_TO_PUBLISH || detail.status === PublishStatus.PUBLISHED);

  return {
    canExport,
    canCreateRemoteDraft,
    canMarkPublished,
    exportDisabledReason: canExport
      ? null
      : exportActive
        ? "已有导出任务在执行。"
        : "只有待导出或失败的发布包允许重新导出。",
    remoteDraftDisabledReason: canCreateRemoteDraft
      ? null
      : !isChannelDraftSupported(detail.channel as ChannelType)
        ? "当前渠道没有接入远端草稿能力。"
        : draft.status !== DraftStatus.READY_TO_PUBLISH
          ? "审核门禁未完全打开，暂时不能创建远端草稿。"
          : remoteDraftActive
            ? "已有远端草稿任务在执行。"
            : "当前状态不允许创建远端草稿。",
    markPublishedDisabledReason: canMarkPublished ? null : "没有有效导出物前，不应回填已发布记录。",
  };
}

function buildNotices(
  detail: PublishPackageDetail,
  draft: DraftDetail,
  capabilities: PublishCapabilitySet,
): PublishNotice[] {
  const notices: PublishNotice[] = [];

  if (draft.status !== DraftStatus.READY_TO_PUBLISH) {
    notices.push({
      tone: "warning",
      title: "审核门禁仍在生效",
      description: "当前稿件尚未进入待发布阶段，因此远端草稿动作会被清楚地锁住。",
    });
  } else {
    notices.push({
      tone: "success",
      title: "渠道门禁已打开",
      description: "这条稿件已经进入待发布阶段，远端草稿能力可以按渠道支持情况继续推进。",
    });
  }

  if (!isChannelDraftSupported(detail.channel as ChannelType)) {
    notices.push({
      tone: "info",
      title: "当前渠道只支持导出与回填",
      description: "小红书在 MVP 阶段不接入远端草稿，因此页面会明确标出能力缺口，而不是静默隐藏。",
    });
  }

  if (detail.status === PublishStatus.FAILED) {
    notices.push({
      tone: "danger",
      title: "上一次发布动作失败",
      description: "失败状态允许重试，但不会伪装成中间成功态。",
    });
  }

  if (capabilities.canMarkPublished) {
    notices.push({
      tone: "success",
      title: "已具备发布回填条件",
      description: "导出路径已经稳定存在，人工发布完成后可以直接写回最终链接。",
    });
  }

  return notices;
}

async function buildPublishDetail(publishPackageId: string): Promise<PublishDetail> {
  await ensurePublishSeed();
  const jobs = await listJobsForPackage(publishPackageId);
  const detail = await getPackageOrThrow(publishPackageId);
  const draft = await getDraftOrThrow(detail.draftId);
  const capabilities = buildCapabilities(detail, draft, jobs);

  return {
    package: {
      id: detail.id,
      draftId: detail.draftId,
      channel: detail.channel,
      channelLabel: channelLabels[detail.channel as ChannelType] ?? detail.channel,
      title: detail.title ?? draft.title,
      summary: detail.summary ?? draft.summary,
      status: detail.status,
      statusLabel: publishStatusLabels[detail.status],
      content: detail.content ?? "",
      contentFormat: detail.contentFormat ?? "markdown",
      updatedAt: detail.updatedAt.toISOString(),
    },
    draft: {
      id: draft.id,
      title: draft.title,
      status: draft.status,
      statusLabel: draftStatusLabels[draft.status],
      reviewStatus: draft.latestReview?.status ?? null,
      reviewStatusLabel: draft.latestReview
        ? reviewStatusLabels[draft.latestReview.status as ReviewStatus]
        : null,
    },
    stages: buildStages(detail),
    capabilities,
    notices: buildNotices(detail, draft, capabilities),
    latestJob: jobs[0] ? buildJobItem(jobs[0]) : null,
    jobs: jobs.map(buildJobItem),
    publication: detail.publication
      ? {
          publishedUrl: detail.publication.publishedUrl,
          publishedAt: formatDate(detail.publication.publishedAt),
          notes: detail.publication.notes,
        }
      : null,
  };
}

export async function listPublishPackages(
  input: PublishListInput = {},
): Promise<PublishPackageListResponse> {
  await ensurePublishSeed();
  const filters = parsePublishFilters(input);
  const result = await publishRepository.list(filters);

  return {
    items: result.items.map(mapPublishPackageApiItem),
    page: result.pagination.page,
    pageSize: result.pagination.pageSize,
    total: result.pagination.total,
    pageCount: Math.max(
      1,
      Math.ceil(result.pagination.total / Math.max(result.pagination.pageSize, 1)),
    ),
  };
}

export async function getDefaultPublishPackageId(): Promise<string | null> {
  await ensurePublishSeed();

  for (const publishPackageId of publishWorkbenchPackageIds) {
    const publishPackage = await publishRepository.getById(publishPackageId);
    if (publishPackage && publishPackage.status !== PublishStatus.PUBLISHED) {
      return publishPackage.id;
    }
  }

  return publishWorkbenchPackageIds[0] ?? null;
}

export async function getPublishBoardSnapshot(): Promise<PublishBoardSnapshot> {
  await ensurePublishSeed();
  const items = await Promise.all(
    publishWorkbenchPackageIds.map(
      async (publishPackageId: string): Promise<PublishBoardItem | null> => {
        const publishPackage = await publishRepository.getById(publishPackageId);

        if (publishPackage === null) {
          return null;
        }

        const draft = await getDraftOrThrow(publishPackage.draftId);
        return mapPublishBoardItem(publishPackage, draft);
      },
    ),
  );

  const resolvedItems = items.filter(
    (item: PublishBoardItem | null): item is PublishBoardItem => item !== null,
  );
  const blockedItems = resolvedItems.filter(
    (item: PublishBoardItem) => item.reviewGate === "locked",
  );
  const readyItems = resolvedItems.filter(
    (item: PublishBoardItem) =>
      item.reviewGate !== "locked" && item.status !== PublishStatus.PUBLISHED,
  );
  const completedItems = resolvedItems.filter(
    (item: PublishBoardItem) => item.status === PublishStatus.PUBLISHED,
  );

  return {
    featuredPackageId: readyItems[0]?.id ?? blockedItems[0]?.id ?? resolvedItems[0]?.id ?? null,
    metrics: [
      {
        label: "可推进渠道",
        value: String(readyItems.length),
        hint: "审核门禁已打开，可继续做导出、远端草稿或发布回填。",
      },
      {
        label: "门禁关闭",
        value: String(blockedItems.length),
        hint: "这些渠道仍被审核状态挡住，不会在 UI 上伪装成可点。",
      },
      {
        label: "已完成回填",
        value: String(completedItems.length),
        hint: "已经形成 export / draft / published 的完整证据链。",
      },
    ],
    lanes: [
      mapPublishLane(
        "ready",
        "准备发版",
        "这些渠道已经具备继续推进的条件，页面重点展示下一步该做什么。",
        readyItems,
      ),
      mapPublishLane(
        "blocked",
        "门禁锁定",
        "这些渠道还不能创建远端草稿，原因会直接写在状态面板上，而不是埋在错误文案里。",
        blockedItems,
      ),
      mapPublishLane(
        "completed",
        "已完成回填",
        "完成态保留证据，不把 exportPath、draftUrl、publishedUrl 淹没成一堆字段。",
        completedItems,
      ),
    ],
  };
}

export async function getPublishDetail(publishPackageId: string): Promise<PublishDetail> {
  return buildPublishDetail(publishPackageId);
}

function buildIdempotencyKey(action: "export" | "remote-draft", publishPackageId: string): string {
  return `${publishPackageId}:${action}`;
}

export async function exportPublishPackage(
  publishPackageId: string,
): Promise<PublishActionJobResponse> {
  await ensurePublishSeed();
  const publishPackage = await getPackageOrThrow(publishPackageId);
  const activeJob = await jobRepository.findActiveByIdempotencyKey(
    buildIdempotencyKey("export", publishPackageId),
  );

  assertCanExport(publishPackage, activeJob !== null);

  const createdJob = activeJob
    ? {
        jobId: activeJob.id,
        status: activeJob.status,
      }
    : await jobsRuntime.enqueueWorkflowJob({
        type: JobType.EXPORT_PUBLISH_PACKAGE,
        entityType: JobEntityType.PUBLISH_PACKAGE,
        entityId: publishPackage.id,
        publishPackageId: publishPackage.id,
        draftId: publishPackage.draftId,
        idempotencyKey: buildIdempotencyKey("export", publishPackage.id),
        triggeredBy: "publish-workbench",
        input: {
          publishPackageId: publishPackage.id,
          channel: publishPackage.channel,
        },
      });

  return {
    jobId: createdJob.jobId,
    status: createdJob.status as PublishActionJobResponse["status"],
    publishPackageId: publishPackage.id,
    entityType: "PUBLISH_PACKAGE",
    entityId: publishPackage.id,
  };
}

export async function createRemoteDraftForPackage(
  publishPackageId: string,
  _channelAccountId: string | null,
): Promise<PublishActionJobResponse> {
  await ensurePublishSeed();
  const publishPackage = await getPackageOrThrow(publishPackageId);
  const draft = await getDraftOrThrow(publishPackage.draftId);
  const activeJob = await jobRepository.findActiveByIdempotencyKey(
    buildIdempotencyKey("remote-draft", publishPackageId),
  );

  assertCanCreateRemoteDraft(publishPackage, draft, activeJob !== null);

  const createdJob = activeJob
    ? {
        jobId: activeJob.id,
        status: activeJob.status,
      }
    : await jobsRuntime.enqueueWorkflowJob({
        type: JobType.CREATE_REMOTE_DRAFT,
        entityType: JobEntityType.PUBLISH_PACKAGE,
        entityId: publishPackage.id,
        publishPackageId: publishPackage.id,
        draftId: publishPackage.draftId,
        idempotencyKey: buildIdempotencyKey("remote-draft", publishPackage.id),
        triggeredBy: "publish-workbench",
        input: {
          publishPackageId: publishPackage.id,
          channel: publishPackage.channel,
          channelAccountId: _channelAccountId,
        },
      });

  return {
    jobId: createdJob.jobId,
    status: createdJob.status as PublishActionJobResponse["status"],
    publishPackageId: publishPackage.id,
    entityType: "PUBLISH_PACKAGE",
    entityId: publishPackage.id,
  };
}

export async function markPackagePublished(
  publishPackageId: string,
  input: PublishRecordInput,
): Promise<PublishDetail> {
  await ensurePublishSeed();

  const detail = await runInTransaction(async (tx) => {
    const publishTx = createPublishRepository(tx);
    const publishPackage = await publishTx.getById(publishPackageId);

    if (publishPackage === null) {
      throw new PublishWorkbenchError(
        "PUBLISH_PACKAGE_NOT_FOUND",
        "Publish package not found.",
        404,
        {
          publishPackageId,
        },
      );
    }

    const draft = await createDraftRepository(tx).getById(publishPackage.draftId);

    if (draft === null) {
      throw new PublishWorkbenchError("DRAFT_NOT_FOUND", "Draft not found.", 404, {
        draftId: publishPackage.draftId,
      });
    }

    assertCanMarkPublished(publishPackage, draft, publishPackage.publication, input);

    const updatedPackage = await publishTx.update(publishPackage.id, {
      status: PublishStatus.PUBLISHED,
    });

    await publishTx.upsertPublicationRecord({
      publishPackageId: publishPackage.id,
      channel: publishPackage.channel as ChannelType,
      publishedUrl: input.publishedUrl,
      publishedAt: new Date(input.publishedAt),
      notes: input.notes,
    });

    return updatedPackage.id;
  });

  return buildPublishDetail(detail);
}
