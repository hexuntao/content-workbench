import { type ChannelType, DraftStatus, type DraftType, ReviewStatus } from "@prisma/client";
import { invariant, ReviewWorkbenchError } from "@/features/review/server/errors";
import {
  ensureReviewWorkbenchSeed,
  getSeedRewriteContent,
  reviewWorkbenchTaskIds,
} from "@/features/review/server/mock-seed";
import type {
  ResubmitReviewInput,
  ReviewChecklistItem,
  ReviewChecklistKey,
  ReviewChecklistState,
  ReviewDecisionInput,
  ReviewDetail,
  ReviewHistoryItem,
  ReviewNotice,
  ReviewPackageSummary,
  ReviewQueueItem,
  ReviewQueueLane,
  ReviewQueueSnapshot,
  ReviewTaskApiItem,
  ReviewTaskListResponse,
} from "@/features/review/types";
import { runInTransaction } from "@/server/db";
import {
  createDraftRepository,
  createPublishRepository,
  createReviewRepository,
  type DraftDetail,
  type PublishPackageSummary,
  type ReviewQueueFilters,
  type ReviewTaskDetail,
  type ReviewTaskSummary,
  type RewriteSummary,
} from "@/server/repositories";

const draftRepository = createDraftRepository();
const publishRepository = createPublishRepository();
const reviewRepository = createReviewRepository();

const reviewStatusLabels: Record<ReviewStatus, string> = {
  PENDING: "待决策",
  CHANGES_REQUESTED: "已退回",
  APPROVED: "已通过",
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

const draftTypeLabels: Record<DraftType, string> = {
  MASTER: "母稿",
  WECHAT: "微信稿",
  XHS: "小红书稿",
  X_ARTICLE: "X Article 稿",
};

const channelLabels: Record<ChannelType, string> = {
  WECHAT: "微信公众号",
  XHS: "小红书",
  X_ARTICLE: "X Article",
};

const publishStatusLabels: Record<string, string> = {
  PENDING: "待导出",
  EXPORTED: "已导出",
  DRAFT_CREATED: "已建远端草稿",
  PUBLISHED: "已发布",
  FAILED: "执行失败",
};

const checklistDefinitions: Array<{
  key: ReviewChecklistKey;
  label: string;
  description: string;
}> = [
  {
    key: "factsChecked",
    label: "事实可信",
    description: "核心论据、数据和引用边界已经核对。",
  },
  {
    key: "argumentClear",
    label: "观点清晰",
    description: "主张、结构和结论关系清楚，没有虚浮转场。",
  },
  {
    key: "voiceConsistent",
    label: "作者语气一致",
    description: "读起来像作者本人，而不是自动生成的折中稿。",
  },
  {
    key: "channelReady",
    label: "渠道格式可发布",
    description: "标题、摘要、段落节奏和平台包装已到位。",
  },
  {
    key: "aiClicheFree",
    label: "无明显 AI 套话",
    description: "模板化开头、空泛收束和机械承接已清理。",
  },
] as const;

type ReviewListInput = {
  status?: string | null;
  reviewerEmail?: string | null;
  page?: number;
  pageSize?: number;
};

function isReviewStatus(value: string): value is ReviewStatus {
  return value in reviewStatusLabels;
}

function formatDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function normalizeChecklist(
  checklist: Partial<ReviewChecklistState> | null | undefined,
): ReviewChecklistState {
  return {
    factsChecked: checklist?.factsChecked ?? false,
    argumentClear: checklist?.argumentClear ?? false,
    voiceConsistent: checklist?.voiceConsistent ?? false,
    channelReady: checklist?.channelReady ?? false,
    aiClicheFree: checklist?.aiClicheFree ?? false,
  };
}

function mapChecklistItems(checklist: ReviewChecklistState): ReviewChecklistItem[] {
  return checklistDefinitions.map(
    (definition: {
      key: ReviewChecklistKey;
      label: string;
      description: string;
    }): ReviewChecklistItem => ({
      key: definition.key,
      label: definition.label,
      description: definition.description,
      checked: checklist[definition.key],
    }),
  );
}

function getChecklistCompletionLabel(checklist: ReviewChecklistState): string {
  const completedCount = Object.values(checklist).filter(Boolean).length;
  return `${completedCount} / ${checklistDefinitions.length} 项已满足`;
}

function summarizeDecisionFocus(task: ReviewTaskDetail): string {
  const checklist = normalizeChecklist(task.checklist as Partial<ReviewChecklistState> | null);

  if (task.status === ReviewStatus.CHANGES_REQUESTED) {
    return "核对作者是否真正关闭上一轮退回问题。";
  }

  if (!checklist.voiceConsistent || !checklist.aiClicheFree) {
    return "重点判断作者语气与 AI 套话是否已经收口。";
  }

  if (!checklist.channelReady) {
    return "重点确认渠道包装是否已经达到发布线。";
  }

  return "这条稿件已经接近放行，重点看最后一轮判断是否成立。";
}

function getPriorityBand(task: ReviewTaskDetail): "critical" | "active" | "resolved" {
  if (task.status === ReviewStatus.PENDING) {
    return "critical";
  }

  if (task.status === ReviewStatus.CHANGES_REQUESTED) {
    return "active";
  }

  return "resolved";
}

function getPriorityLabel(task: ReviewTaskDetail): string {
  if (task.status === ReviewStatus.PENDING) {
    return task.reviewerEmail ? "等待签发" : "待领取";
  }

  if (task.status === ReviewStatus.CHANGES_REQUESTED) {
    return "等待重提";
  }

  return "已决议";
}

function getQueueLabel(task: ReviewTaskDetail): string {
  if (task.status === ReviewStatus.PENDING) {
    return task.reviewerEmail ? "今日待判" : "待分配";
  }

  if (task.status === ReviewStatus.CHANGES_REQUESTED) {
    return "修订返回";
  }

  return "已放行";
}

function mapQueueItem(
  task: ReviewTaskDetail,
  draft: DraftDetail,
  historyCount: number,
): ReviewQueueItem {
  return {
    id: task.id,
    draftId: draft.id,
    title: draft.title,
    summary: draft.summary,
    reviewerEmail: task.reviewerEmail,
    status: task.status,
    statusLabel: reviewStatusLabels[task.status],
    priorityBand: getPriorityBand(task),
    priorityLabel: getPriorityLabel(task),
    queueLabel: getQueueLabel(task),
    decisionFocus: summarizeDecisionFocus(task),
    channelCount: task.publishPackages.length,
    historyCount,
    currentRewriteTitle: task.currentRewrite?.title ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

async function getDraftDetailOrThrow(draftId: string): Promise<DraftDetail> {
  const draft = await draftRepository.getById(draftId);

  if (draft === null) {
    throw new ReviewWorkbenchError("DRAFT_NOT_FOUND", "Draft not found.", 404, {
      draftId,
    });
  }

  return draft;
}

async function getReviewTaskOrThrow(reviewTaskId: string): Promise<ReviewTaskDetail> {
  const reviewTask = await reviewRepository.getById(reviewTaskId);

  if (reviewTask === null) {
    throw new ReviewWorkbenchError("REVIEW_TASK_NOT_FOUND", "Review task not found.", 404, {
      reviewTaskId,
    });
  }

  return reviewTask;
}

async function listHistoryItems(draftId: string): Promise<ReviewHistoryItem[]> {
  const items = await reviewRepository.listByDraftId(draftId);

  return items.map(
    (item: ReviewTaskSummary): ReviewHistoryItem => ({
      id: item.id,
      status: item.status,
      statusLabel: reviewStatusLabels[item.status],
      reviewerEmail: item.reviewerEmail,
      comments: item.comments,
      createdAt: item.createdAt.toISOString(),
      decidedAt: formatDate(item.decidedAt),
      contextNote:
        item.status === ReviewStatus.CHANGES_REQUESTED
          ? "上一轮退回意见必须在重新送审时继续可见。"
          : item.status === ReviewStatus.APPROVED
            ? "这轮判断已经放行，不应被后续动作静默覆盖。"
            : "当前审核仍在进行中，尚未形成正式结论。",
    }),
  );
}

function mapPublishPackageSummary(item: {
  id: string;
  channel: string;
  status: string;
}): ReviewPackageSummary {
  const channel = item.channel as ChannelType;

  return {
    id: item.id,
    channel: item.channel,
    channelLabel: channelLabels[channel] ?? item.channel,
    status: item.status,
    statusLabel: publishStatusLabels[item.status] ?? item.status,
  };
}

function buildNotices(
  task: ReviewTaskDetail,
  draft: DraftDetail,
  checklist: ReviewChecklistState,
): ReviewNotice[] {
  const notices: ReviewNotice[] = [];

  if (task.status === ReviewStatus.PENDING) {
    notices.push({
      tone: "warning",
      title: "当前仍在审核门内",
      description: "在这里做出的通过或退回决定会直接影响后续发布动作是否解锁。",
    });
  }

  if (task.status === ReviewStatus.CHANGES_REQUESTED) {
    notices.push({
      tone: "info",
      title: "这是一条带历史语境的重提任务",
      description: "上一轮退回意见已经保留为上下文，重新送审不应把它清空成一条普通日志。",
    });
  }

  if (task.publishPackages.length > 0) {
    notices.push({
      tone: "success",
      title: "发布包摘要已经接入审核面板",
      description: "编辑可以在决策前直接看到渠道准备状态，不需要切换到其他工作区再猜测影响范围。",
    });
  }

  if (!checklist.channelReady || draft.status === DraftStatus.REJECTED) {
    notices.push({
      tone: "danger",
      title: "当前不应推进到发布准备",
      description: "只要渠道准备和内容判断没有同时过线，发布动作就必须继续被门禁挡住。",
    });
  }

  return notices;
}

function buildCapabilities(
  task: ReviewTaskDetail,
  draft: DraftDetail,
  canResubmit: boolean,
): ReviewDetail["capabilities"] {
  if (task.status === ReviewStatus.PENDING) {
    return {
      canApprove: true,
      canRequestChanges: true,
      canResubmit: false,
      disabledReason: null,
    };
  }

  if (task.status === ReviewStatus.CHANGES_REQUESTED) {
    return {
      canApprove: false,
      canRequestChanges: false,
      canResubmit,
      disabledReason: canResubmit
        ? null
        : "被退回后的稿件必须先有新的改写或包装动作，才能再次送审。",
    };
  }

  return {
    canApprove: false,
    canRequestChanges: false,
    canResubmit: false,
    disabledReason:
      draft.status === DraftStatus.APPROVED
        ? "这轮审核已经完成，不应在详情页再次改写结论。"
        : "当前任务已完成。",
  };
}

function buildDecisionPanel(task: ReviewTaskDetail): ReviewDetail["decision"] {
  if (task.status === ReviewStatus.PENDING) {
    return {
      primaryLabel: "Approve / 放行进入发布准备",
      secondaryLabel: "Request Changes / 退回作者修订",
      riskLabel: "这一步会改变主链路状态",
      guidance: "先确认判断是否成立，再决定放行还是把稿件退回到修改阶段。",
    };
  }

  if (task.status === ReviewStatus.CHANGES_REQUESTED) {
    return {
      primaryLabel: "Resubmit / 创建新一轮审核",
      secondaryLabel: "上一轮已退回",
      riskLabel: "不会覆盖历史任务，只会新建新的待审任务",
      guidance: "只有当新的改写或包装动作已经落地，才应该重新送审。",
    };
  }

  return {
    primaryLabel: "Decision Locked",
    secondaryLabel: "本轮结论已经归档",
    riskLabel: "已决议任务不可再次通过或退回",
    guidance: "如需新一轮审核，应基于新的内容变更创建新的审核任务。",
  };
}

async function canResubmitReview(
  task: ReviewTaskDetail,
  draft: DraftDetail,
  explicitRewriteId: string | null = null,
): Promise<boolean> {
  if (task.status !== ReviewStatus.CHANGES_REQUESTED || task.decidedAt === null) {
    return false;
  }

  const decidedAt = task.decidedAt;
  const rewrites = await draftRepository.listRewrites(draft.id);
  const packages = await publishRepository.listByDraftId(draft.id);

  if (explicitRewriteId !== null) {
    const explicitRewrite = rewrites.find((item: RewriteSummary) => item.id === explicitRewriteId);
    if (explicitRewrite !== undefined) {
      return explicitRewrite.updatedAt.getTime() > decidedAt.getTime();
    }
  }

  const hasRewriteAfterDecision = rewrites.some(
    (item: RewriteSummary) => item.updatedAt.getTime() > decidedAt.getTime(),
  );
  const hasPackageAfterDecision = packages.some(
    (item: PublishPackageSummary) => item.updatedAt.getTime() > decidedAt.getTime(),
  );

  return hasRewriteAfterDecision || hasPackageAfterDecision || draft.updatedAt > decidedAt;
}

function mapReviewTaskApiItem(task: ReviewTaskSummary): ReviewTaskApiItem {
  return {
    id: task.id,
    draftId: task.draftId,
    reviewerEmail: task.reviewerEmail,
    status: task.status,
    checklist: normalizeChecklist(task.checklist as Partial<ReviewChecklistState> | null),
    comments: task.comments,
    decidedAt: formatDate(task.decidedAt),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    draft: {
      id: task.draft.id,
      title: task.draft.title,
      status: task.draft.status,
      currentRewriteId: task.draft.currentRewriteId,
    },
  };
}

function mapReviewLane(
  id: string,
  title: string,
  description: string,
  items: ReviewQueueItem[],
): ReviewQueueLane {
  return {
    id,
    title,
    description,
    count: items.length,
    items,
  };
}

function parseReviewFilters(input: ReviewListInput): ReviewQueueFilters {
  const filters: ReviewQueueFilters = {
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 20,
  };

  if (input.status && isReviewStatus(input.status)) {
    filters.status = input.status;
  }

  if (input.reviewerEmail) {
    filters.reviewerEmail = input.reviewerEmail;
  }

  return filters;
}

function assertReviewCreationAllowed(
  draft: DraftDetail,
  pendingTask: ReviewTaskSummary | null,
): void {
  invariant(
    draft.status === DraftStatus.PACKAGED,
    "DRAFT_NOT_READY_FOR_REVIEW",
    "Only packaged drafts can enter review.",
    409,
    {
      draftId: draft.id,
      currentStatus: draft.status,
    },
  );
  invariant(
    pendingTask === null,
    "DRAFT_REVIEW_GATE_VIOLATION",
    "Draft already has an active pending review task.",
    409,
    {
      draftId: draft.id,
      pendingReviewTaskId: pendingTask?.id,
    },
  );
}

function assertPendingReviewTask(task: ReviewTaskDetail): void {
  invariant(
    task.status === ReviewStatus.PENDING,
    "REVIEW_TASK_ALREADY_DECIDED",
    "Only pending review tasks can be decided.",
    409,
    {
      reviewTaskId: task.id,
      currentStatus: task.status,
    },
  );
}

function assertDraftInReview(task: ReviewTaskDetail, draft: DraftDetail): void {
  invariant(
    task.draftId === draft.id,
    "DRAFT_REVIEW_GATE_VIOLATION",
    "Review task does not match draft.",
    409,
    {
      reviewTaskId: task.id,
      draftId: draft.id,
    },
  );
}

async function buildReviewDetail(task: ReviewTaskDetail): Promise<ReviewDetail> {
  const draft = await getDraftDetailOrThrow(task.draftId);
  const checklist = normalizeChecklist(task.checklist as Partial<ReviewChecklistState> | null);
  const history = await listHistoryItems(task.draftId);
  const resubmitAllowed = await canResubmitReview(task, draft);

  return {
    task: {
      id: task.id,
      draftId: task.draftId,
      reviewerEmail: task.reviewerEmail,
      status: task.status,
      statusLabel: reviewStatusLabels[task.status],
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      decidedAt: formatDate(task.decidedAt),
    },
    draft: {
      id: draft.id,
      title: draft.currentRewrite?.title ?? draft.title,
      summary: draft.summary,
      status: draft.status,
      statusLabel: draftStatusLabels[draft.status],
      draftTypeLabel: draftTypeLabels[draft.draftType],
      currentRewriteId: draft.currentRewriteId,
      currentRewriteTitle: task.currentRewrite?.title ?? draft.currentRewrite?.title ?? null,
      content: getSeedRewriteContent(draft.currentRewriteId) ?? draft.content,
      contentFormat: draft.contentFormat,
      selectedLabel: draft.currentRewrite ? "当前选中送审版本" : "母稿基线",
    },
    checklist: {
      completionLabel: getChecklistCompletionLabel(checklist),
      items: mapChecklistItems(checklist),
    },
    comments: task.comments,
    publishPackages: task.publishPackages.map(mapPublishPackageSummary),
    history,
    capabilities: buildCapabilities(task, draft, resubmitAllowed),
    decision: buildDecisionPanel(task),
    notices: buildNotices(task, draft, checklist),
  };
}

export async function listReviewTasks(
  input: ReviewListInput = {},
): Promise<ReviewTaskListResponse> {
  await ensureReviewWorkbenchSeed();
  const filters = parseReviewFilters(input);
  const result = await reviewRepository.list(filters);

  return {
    items: result.items.map(mapReviewTaskApiItem),
    page: result.pagination.page,
    pageSize: result.pagination.pageSize,
    total: result.pagination.total,
    pageCount: Math.max(
      1,
      Math.ceil(result.pagination.total / Math.max(result.pagination.pageSize, 1)),
    ),
  };
}

export async function getDefaultReviewTaskId(): Promise<string | null> {
  await ensureReviewWorkbenchSeed();

  for (const reviewTaskId of reviewWorkbenchTaskIds) {
    const task = await reviewRepository.getById(reviewTaskId);
    if (task?.status === ReviewStatus.PENDING) {
      return task.id;
    }
  }

  return reviewWorkbenchTaskIds[0] ?? null;
}

export async function getReviewQueueSnapshot(): Promise<ReviewQueueSnapshot> {
  await ensureReviewWorkbenchSeed();
  const tasks = await Promise.all(
    reviewWorkbenchTaskIds.map(
      async (reviewTaskId: string): Promise<ReviewTaskDetail | null> =>
        reviewRepository.getById(reviewTaskId),
    ),
  );

  const resolvedTasks = tasks.filter(
    (task: ReviewTaskDetail | null): task is ReviewTaskDetail => task !== null,
  );
  const queueItems = await Promise.all(
    resolvedTasks.map(async (task: ReviewTaskDetail): Promise<ReviewQueueItem> => {
      const draft = await getDraftDetailOrThrow(task.draftId);
      const history = await reviewRepository.listByDraftId(task.draftId);
      return mapQueueItem(task, draft, history.length);
    }),
  );

  const pendingItems = queueItems.filter(
    (item: ReviewQueueItem) => item.status === ReviewStatus.PENDING,
  );
  const changesRequestedItems = queueItems.filter(
    (item: ReviewQueueItem) => item.status === ReviewStatus.CHANGES_REQUESTED,
  );
  const approvedItems = queueItems.filter(
    (item: ReviewQueueItem) => item.status === ReviewStatus.APPROVED,
  );

  return {
    featuredTaskId: pendingItems[0]?.id ?? queueItems[0]?.id ?? null,
    totals: {
      pending: pendingItems.length,
      changesRequested: changesRequestedItems.length,
      approved: approvedItems.length,
    },
    metrics: [
      {
        label: "待判任务",
        value: String(pendingItems.length),
        hint: "需要主编做通过或退回判断的任务数。",
      },
      {
        label: "重提准备",
        value: String(changesRequestedItems.length),
        hint: "上一轮已退回，等待新版本重新送审。",
      },
      {
        label: "放行样本",
        value: String(approvedItems.length),
        hint: "用于给发布准备台提供已通过的历史案例。",
      },
    ],
    lanes: [
      mapReviewLane(
        "pending",
        "待判队列",
        "优先处理仍在门禁内的稿件，先做判断，再决定是否允许进入发布准备。",
        pendingItems,
      ),
      mapReviewLane(
        "changes-requested",
        "修订返回",
        "这些任务保留了上一轮退回语境，只有新的改写或包装动作出现后才该重提。",
        changesRequestedItems,
      ),
      mapReviewLane(
        "approved",
        "已放行上下文",
        "保留通过记录，给发布阶段提供稳定审计链路，而不是把历史清成一句已完成。",
        approvedItems,
      ),
    ],
  };
}

export async function getReviewDetail(reviewTaskId: string): Promise<ReviewDetail> {
  await ensureReviewWorkbenchSeed();
  const task = await getReviewTaskOrThrow(reviewTaskId);
  return buildReviewDetail(task);
}

export async function createReviewTask(input: {
  draftId: string;
  reviewerEmail: string | null;
}): Promise<ReviewDetail> {
  await ensureReviewWorkbenchSeed();

  const detail = await runInTransaction(async (tx) => {
    const draftTx = createDraftRepository(tx);
    const reviewTx = createReviewRepository(tx);
    const draft = await draftTx.getById(input.draftId);

    if (draft === null) {
      throw new ReviewWorkbenchError("DRAFT_NOT_FOUND", "Draft not found.", 404, {
        draftId: input.draftId,
      });
    }

    const pendingTask = await reviewTx.findPendingByDraftId(draft.id);
    assertReviewCreationAllowed(draft, pendingTask);

    const created = await reviewTx.create({
      draftId: draft.id,
      reviewerEmail: input.reviewerEmail,
      status: ReviewStatus.PENDING,
      comments: null,
      checklist: normalizeChecklist(null),
      decidedAt: null,
    });

    await draftTx.update(draft.id, {
      status: DraftStatus.IN_REVIEW,
    });

    return created;
  });

  return buildReviewDetail(detail);
}

export async function approveReviewTask(
  reviewTaskId: string,
  input: ReviewDecisionInput,
): Promise<ReviewDetail> {
  await ensureReviewWorkbenchSeed();

  const updatedTask = await runInTransaction(async (tx) => {
    const draftTx = createDraftRepository(tx);
    const reviewTx = createReviewRepository(tx);
    const task = await reviewTx.getById(reviewTaskId);

    if (task === null) {
      throw new ReviewWorkbenchError("REVIEW_TASK_NOT_FOUND", "Review task not found.", 404, {
        reviewTaskId,
      });
    }

    const draft = await draftTx.getById(task.draftId);

    if (draft === null) {
      throw new ReviewWorkbenchError("DRAFT_NOT_FOUND", "Draft not found.", 404, {
        draftId: task.draftId,
      });
    }

    assertPendingReviewTask(task);
    assertDraftInReview(task, draft);

    const nextTask = await reviewTx.update(reviewTaskId, {
      status: ReviewStatus.APPROVED,
      comments: input.comments,
      checklist: input.checklist,
      decidedAt: new Date(),
    });

    await draftTx.update(draft.id, {
      status: DraftStatus.APPROVED,
    });

    return nextTask;
  });

  return buildReviewDetail(updatedTask);
}

export async function requestChangesForReviewTask(
  reviewTaskId: string,
  input: ReviewDecisionInput,
): Promise<ReviewDetail> {
  await ensureReviewWorkbenchSeed();

  const updatedTask = await runInTransaction(async (tx) => {
    const draftTx = createDraftRepository(tx);
    const reviewTx = createReviewRepository(tx);
    const task = await reviewTx.getById(reviewTaskId);

    if (task === null) {
      throw new ReviewWorkbenchError("REVIEW_TASK_NOT_FOUND", "Review task not found.", 404, {
        reviewTaskId,
      });
    }

    const draft = await draftTx.getById(task.draftId);

    if (draft === null) {
      throw new ReviewWorkbenchError("DRAFT_NOT_FOUND", "Draft not found.", 404, {
        draftId: task.draftId,
      });
    }

    assertPendingReviewTask(task);
    assertDraftInReview(task, draft);

    const nextTask = await reviewTx.update(reviewTaskId, {
      status: ReviewStatus.CHANGES_REQUESTED,
      comments: input.comments,
      checklist: input.checklist,
      decidedAt: new Date(),
    });

    await draftTx.update(draft.id, {
      status: DraftStatus.REJECTED,
    });

    return nextTask;
  });

  return buildReviewDetail(updatedTask);
}

export async function resubmitReviewTask(
  reviewTaskId: string,
  input: ResubmitReviewInput,
): Promise<ReviewDetail> {
  await ensureReviewWorkbenchSeed();

  const detail = await runInTransaction(async (tx) => {
    const draftTx = createDraftRepository(tx);
    const reviewTx = createReviewRepository(tx);
    const task = await reviewTx.getById(reviewTaskId);

    if (task === null) {
      throw new ReviewWorkbenchError("REVIEW_TASK_NOT_FOUND", "Review task not found.", 404, {
        reviewTaskId,
      });
    }

    invariant(
      task.status === ReviewStatus.CHANGES_REQUESTED,
      "REVIEW_TASK_STATUS_INVALID",
      "Only changes-requested tasks can be resubmitted.",
      409,
      {
        reviewTaskId,
        currentStatus: task.status,
      },
    );

    const draft = await draftTx.getById(input.draftId);

    if (draft === null) {
      throw new ReviewWorkbenchError("DRAFT_NOT_FOUND", "Draft not found.", 404, {
        draftId: input.draftId,
      });
    }

    invariant(
      draft.id === task.draftId,
      "DRAFT_REVIEW_GATE_VIOLATION",
      "Resubmit draft does not match review task.",
      409,
      {
        reviewTaskId,
        draftId: input.draftId,
      },
    );

    const pendingTask = await reviewTx.findPendingByDraftId(draft.id);
    invariant(
      pendingTask === null,
      "DRAFT_REVIEW_GATE_VIOLATION",
      "Draft already has an active pending review task.",
      409,
      {
        draftId: draft.id,
        pendingReviewTaskId: pendingTask?.id,
      },
    );

    const allowed = await canResubmitReview(task, draft, input.newRewriteId);
    invariant(
      allowed,
      "DRAFT_REVIEW_GATE_VIOLATION",
      "Draft must have a new rewrite or packaging action before resubmission.",
      409,
      {
        draftId: draft.id,
        reviewTaskId: task.id,
      },
    );

    if (input.newRewriteId !== null) {
      await draftTx.selectRewrite(draft.id, input.newRewriteId);
    }

    const nextTask = await reviewTx.create({
      draftId: draft.id,
      reviewerEmail: task.reviewerEmail,
      status: ReviewStatus.PENDING,
      comments: task.comments,
      checklist: task.checklist ?? normalizeChecklist(null),
      decidedAt: null,
    });

    await draftTx.update(draft.id, {
      status: DraftStatus.IN_REVIEW,
    });

    return nextTask;
  });

  return buildReviewDetail(detail);
}
