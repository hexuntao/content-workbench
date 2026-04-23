import {
  ChannelType,
  DraftStatus,
  DraftType,
  PublishStatus,
  ReviewStatus,
  RewriteStrategy,
  TopicStatus,
} from "@prisma/client";
import {
  createDraftRepository,
  createPublishRepository,
  createReviewRepository,
  createTopicRepository,
} from "@/server/repositories";

type SeedRewrite = {
  id: string;
  strategy: RewriteStrategy;
  title: string;
  content: string;
  diffSummary: string;
  score: number;
  isSelected?: boolean;
};

type SeedPackage = {
  id: string;
  channel: ChannelType;
  status: PublishStatus;
  title: string;
  summary: string;
  content: string;
  exportPath: string | null;
  draftUrl: string | null;
};

type SeedReviewTask = {
  id: string;
  reviewerEmail: string | null;
  status: ReviewStatus;
  checklist: Record<string, boolean>;
  comments: string;
  decidedAt: Date | null;
};

type SeedDraft = {
  topicId: string;
  topicTitle: string;
  topicSummary: string;
  draftId: string;
  title: string;
  summary: string;
  content: string;
  status: DraftStatus;
  rewrites: SeedRewrite[];
  packages: SeedPackage[];
  reviewTasks: SeedReviewTask[];
  postDecisionRewrite?: SeedRewrite;
  postDecisionStatus?: DraftStatus;
};

export const reviewWorkbenchTaskIds: readonly string[] = [
  "review_task_signal",
  "review_task_revision",
  "review_task_publish_ready",
  "review_task_published_archive",
] as const;

export const publishWorkbenchPackageIds: readonly string[] = [
  "package_signal_wechat",
  "package_signal_x_article",
  "package_revision_wechat",
  "package_publish_ready_wechat",
  "package_publish_ready_x_article",
  "package_publish_ready_xhs",
  "package_published_wechat",
] as const;

const seedDrafts: readonly SeedDraft[] = [
  {
    topicId: "topic_review_signal",
    topicTitle: "审核台需要让编辑先做判断，而不是先填字段",
    topicSummary: "这条稿件用于展示待决策中的主审核任务。",
    draftId: "draft_review_signal",
    title: "把审核页做成决策台，而不是一张审批清单",
    summary: "当前版本已经完成包装，等待主编做通过或退回决定。",
    status: DraftStatus.IN_REVIEW,
    content: `# 把审核页做成决策台，而不是一张审批清单

审核的价值不在于填完一串布尔字段，而在于有人对这篇内容承担判断责任。页面应该先让编辑读到内容主体，再看到 checklist、历史上下文与决策动作。

## 审核页应该先把“这篇稿值不值得放行”说清楚

如果主区域被表单和状态块切碎，编辑做的就不再是判断，而是在处理 UI 杂音。更合理的结构是：左侧负责完整阅读，中间负责 checklist 和批注，右侧负责最终决策。

## 决策动作必须有重量

Approve 和 Request changes 不能长得像两个同级按钮。通过代表内容进入发布准备，退回代表整个链路回到修改阶段。视觉上必须有主次，也必须让风险感清楚可见。`,
    rewrites: [
      {
        id: "rewrite_review_signal_selected",
        strategy: RewriteStrategy.AUTHOR_VOICE,
        title: "让审核动作回到编辑判断，而不是流程勾选",
        content: `# 让审核动作回到编辑判断，而不是流程勾选

编辑审核真正稀缺的不是“有人点了通过”，而是有人愿意对内容质量负责。工作台要把这种责任感摆在台面上。

## 先读内容，再做判断

主区域必须完整承载当前待审版本，中间保留 checklist 和批注，右侧只留下最终动作。流程感来自结构，而不是说明文字。

## 决策区应该像签发台

Approve 是放行，Request changes 是退回。它们的视觉强度、位置和文案都要明确表达后果。`,
        diffSummary: "导语更像主编口吻，把判断责任提前到第一页。",
        score: 0.94,
        isSelected: true,
      },
    ],
    packages: [
      {
        id: "package_signal_wechat",
        channel: ChannelType.WECHAT,
        status: PublishStatus.EXPORTED,
        title: "微信长文包",
        summary: "导出产物已准备，等待审核放行。",
        content: "mock://review-signal-wechat",
        exportPath: "mock://exports/review-signal/wechat.md",
        draftUrl: null,
      },
      {
        id: "package_signal_x_article",
        channel: ChannelType.X_ARTICLE,
        status: PublishStatus.PENDING,
        title: "X Article 平台稿",
        summary: "待审核通过后再进入远端动作。",
        content: "mock://review-signal-x-article",
        exportPath: null,
        draftUrl: null,
      },
    ],
    reviewTasks: [
      {
        id: "review_task_signal",
        reviewerEmail: "editorial-desk@example.com",
        status: ReviewStatus.PENDING,
        checklist: {
          factsChecked: true,
          argumentClear: true,
          voiceConsistent: false,
          channelReady: true,
          aiClicheFree: false,
        },
        comments: "结构成立，但导语还缺一点作者判断，AI 套话也没完全清干净。",
        decidedAt: null,
      },
    ],
  },
  {
    topicId: "topic_review_revision",
    topicTitle: "退回后的上下文不能在下一次送审时消失",
    topicSummary: "这条稿件用于展示 changes requested 后的重提场景。",
    draftId: "draft_review_revision",
    title: "重提审核时必须保留上一轮退回语境",
    summary: "上轮审核指出开头缺乏事实依据，作者已补写并重新包装。",
    status: DraftStatus.PACKAGED,
    content: `# 重提审核时必须保留上一轮退回语境

如果页面把退回记录当成日志 dump，编辑下一轮审核时就只能重新猜测问题出在哪里。历史必须被整理成上下文，而不是原始流水。

## 被退回的不是任务，而是判断

上一轮审核为什么退回、这轮改了什么、哪些问题已经关闭，应该被压成清晰的上下文块。`,
    rewrites: [
      {
        id: "rewrite_review_revision_initial",
        strategy: RewriteStrategy.MIXED,
        title: "初版：历史仍像日志",
        content: "# 初版：历史仍像日志\n\n页面把退回上下文淹没在长列表里。",
        diffSummary: "初版只说明问题，没有给出足够的上下文结构。",
        score: 0.78,
        isSelected: true,
      },
    ],
    packages: [
      {
        id: "package_revision_wechat",
        channel: ChannelType.WECHAT,
        status: PublishStatus.FAILED,
        title: "修订后的微信包",
        summary: "上次导出失败，但正文和结构已经按退回意见调整。",
        content: "mock://review-revision-wechat",
        exportPath: null,
        draftUrl: null,
      },
    ],
    reviewTasks: [
      {
        id: "review_task_revision",
        reviewerEmail: "quality-bar@example.com",
        status: ReviewStatus.CHANGES_REQUESTED,
        checklist: {
          factsChecked: false,
          argumentClear: true,
          voiceConsistent: false,
          channelReady: false,
          aiClicheFree: false,
        },
        comments: "开头没有足够事实依据，结尾仍然有模板化收束，需要重写再送审。",
        decidedAt: new Date("2026-04-21T10:30:00.000Z"),
      },
    ],
    postDecisionRewrite: {
      id: "rewrite_review_revision_resubmitted",
      strategy: RewriteStrategy.DE_AI,
      title: "补完事实依据后的送审版",
      content: `# 补完事实依据后的送审版

这版先补足事实依据，再把上一轮退回问题压缩成可读的上下文说明。

## 编辑不该重新猜

退回意见应该成为下一轮审核的起点，而不是被埋到日志底部。`,
      diffSummary: "重写开头并收掉模板化结尾，准备重新进入审核。",
      score: 0.9,
      isSelected: true,
    },
    postDecisionStatus: DraftStatus.PACKAGED,
  },
  {
    topicId: "topic_publish_ready",
    topicTitle: "审核通过后的发布准备台应该清楚表达每个渠道下一步",
    topicSummary: "这条稿件给发布页提供 READY_TO_PUBLISH 的 package 状态。",
    draftId: "draft_publish_ready",
    title: "发布准备台的重点是下一步动作，而不是字段堆叠",
    summary: "用于展示 export / remote draft / published 三段式推进。",
    status: DraftStatus.READY_TO_PUBLISH,
    content: `# 发布准备台的重点是下一步动作，而不是字段堆叠

发布阶段最怕的是把“已导出、已建草稿、已发布”压成几段普通文案。页面应该让编辑一眼看出每个渠道停在哪一步、下一步能不能做、失败后从哪里恢复。`,
    rewrites: [
      {
        id: "rewrite_publish_ready_selected",
        strategy: RewriteStrategy.AUTHOR_VOICE,
        title: "让渠道动作像发版面板，而不是详情页附录",
        content: `# 让渠道动作像发版面板，而不是详情页附录

渠道卡片应该同时承担状态显示、动作入口和证据回填三个职责。`,
        diffSummary: "把渠道动作压成状态面板语言，更适合发布阶段阅读。",
        score: 0.91,
        isSelected: true,
      },
    ],
    packages: [
      {
        id: "package_publish_ready_wechat",
        channel: ChannelType.WECHAT,
        status: PublishStatus.PENDING,
        title: "微信正式发布包",
        summary: "尚未导出，准备作为主要发版渠道。",
        content: "mock://publish-ready-wechat",
        exportPath: null,
        draftUrl: null,
      },
      {
        id: "package_publish_ready_x_article",
        channel: ChannelType.X_ARTICLE,
        status: PublishStatus.EXPORTED,
        title: "X Article 发布包",
        summary: "导出已完成，可继续创建远端草稿。",
        content: "mock://publish-ready-x-article",
        exportPath: "mock://exports/publish-ready/x-article.md",
        draftUrl: null,
      },
      {
        id: "package_publish_ready_xhs",
        channel: ChannelType.XHS,
        status: PublishStatus.FAILED,
        title: "小红书图片清单",
        summary: "最近一次导出失败，允许重试。",
        content: "mock://publish-ready-xhs",
        exportPath: null,
        draftUrl: null,
      },
    ],
    reviewTasks: [
      {
        id: "review_task_publish_ready",
        reviewerEmail: "release-desk@example.com",
        status: ReviewStatus.APPROVED,
        checklist: {
          factsChecked: true,
          argumentClear: true,
          voiceConsistent: true,
          channelReady: true,
          aiClicheFree: true,
        },
        comments: "内容判断完整，可以进入发布准备。",
        decidedAt: new Date("2026-04-22T08:15:00.000Z"),
      },
    ],
  },
  {
    topicId: "topic_published_archive",
    topicTitle: "已发布状态需要有清楚但克制的完成感",
    topicSummary: "这条稿件用于展示已发布渠道。",
    draftId: "draft_published_archive",
    title: "发布结束后仍需要保留证据而不是把页面清空",
    summary: "用来展示 publishedUrl 回填后的完成态。",
    status: DraftStatus.READY_TO_PUBLISH,
    content: `# 发布结束后仍需要保留证据而不是把页面清空

发布完成不代表信息消失。导出路径、远端草稿地址和最终发布链接应该被整理成可追踪的证据区。`,
    rewrites: [
      {
        id: "rewrite_published_archive_selected",
        strategy: RewriteStrategy.MIXED,
        title: "发布完成后的证据视图",
        content: "# 发布完成后的证据视图\n\n完成态应该保留可追踪证据。",
        diffSummary: "更强调发布证据与后续追踪。",
        score: 0.88,
        isSelected: true,
      },
    ],
    packages: [
      {
        id: "package_published_wechat",
        channel: ChannelType.WECHAT,
        status: PublishStatus.PUBLISHED,
        title: "已发布微信稿",
        summary: "已从人工后台发布并完成回填。",
        content: "mock://published-wechat",
        exportPath: "mock://exports/published/wechat.md",
        draftUrl: "https://example.com/drafts/wechat/published-archive",
      },
    ],
    reviewTasks: [
      {
        id: "review_task_published_archive",
        reviewerEmail: "archive-desk@example.com",
        status: ReviewStatus.APPROVED,
        checklist: {
          factsChecked: true,
          argumentClear: true,
          voiceConsistent: true,
          channelReady: true,
          aiClicheFree: true,
        },
        comments: "允许作为已发布样例保留在发布面板。",
        decidedAt: new Date("2026-04-22T12:00:00.000Z"),
      },
    ],
  },
] as const;

const rewriteContentIndex = new Map<string, string>(
  seedDrafts.flatMap((draft: SeedDraft): Array<[string, string]> => {
    const pairs = draft.rewrites.map((rewrite: SeedRewrite): [string, string] => [
      rewrite.id,
      rewrite.content,
    ]);

    if (draft.postDecisionRewrite) {
      pairs.push([draft.postDecisionRewrite.id, draft.postDecisionRewrite.content]);
    }

    return pairs;
  }),
);

function getTopicRepository(): ReturnType<typeof createTopicRepository> {
  return createTopicRepository();
}

function getDraftRepository(): ReturnType<typeof createDraftRepository> {
  return createDraftRepository();
}

function getPublishRepository(): ReturnType<typeof createPublishRepository> {
  return createPublishRepository();
}

function getReviewRepository(): ReturnType<typeof createReviewRepository> {
  return createReviewRepository();
}

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve: () => void) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

async function ensureRewriteSeed(draftId: string, rewrite: SeedRewrite): Promise<void> {
  const draftRepository = getDraftRepository();
  const rewrites = await draftRepository.listRewrites(draftId);
  const existing = rewrites.find((item) => item.id === rewrite.id) ?? null;

  if (!existing) {
    await draftRepository.createRewrite({
      id: rewrite.id,
      draftId,
      strategy: rewrite.strategy,
      title: rewrite.title,
      content: rewrite.content,
      diffSummary: rewrite.diffSummary,
      score: rewrite.score,
      isSelected: rewrite.isSelected ?? false,
      metadata: {
        mockedBy: "thread-5",
      },
    });
  }

  if (rewrite.isSelected) {
    await draftRepository.selectRewrite(draftId, rewrite.id);
  }
}

export async function ensureReviewWorkbenchSeed(): Promise<void> {
  const topicRepository = getTopicRepository();
  const draftRepository = getDraftRepository();
  const publishRepository = getPublishRepository();
  const reviewRepository = getReviewRepository();

  for (const seedDraft of seedDrafts) {
    const topic = await topicRepository.getById(seedDraft.topicId);

    if (!topic) {
      await topicRepository.create({
        id: seedDraft.topicId,
        title: seedDraft.topicTitle,
        summary: seedDraft.topicSummary,
        keywords: ["review", "publish", "editorial"],
        status: TopicStatus.IN_PROGRESS,
        totalScore: 0.84,
        editorialScore: 0.9,
        relevanceScore: 0.82,
        trendScore: 0.76,
        recommendedAngle: "强调审核判断与发布状态面板的关系。",
      });
    }

    const draft = await draftRepository.getById(seedDraft.draftId);
    const createdDraft = draft === null;

    if (createdDraft) {
      await draftRepository.create({
        id: seedDraft.draftId,
        topicClusterId: seedDraft.topicId,
        draftType: DraftType.MASTER,
        status: seedDraft.status,
        title: seedDraft.title,
        summary: seedDraft.summary,
        content: seedDraft.content,
      });
    }

    for (const rewrite of seedDraft.rewrites) {
      await ensureRewriteSeed(seedDraft.draftId, rewrite);
    }

    for (const publishPackage of seedDraft.packages) {
      const existingPackage = await publishRepository.getById(publishPackage.id);

      if (existingPackage === null) {
        await publishRepository.upsertByDraftAndChannel({
          id: publishPackage.id,
          draftId: seedDraft.draftId,
          channel: publishPackage.channel,
          status: publishPackage.status,
          title: publishPackage.title,
          summary: publishPackage.summary,
          content: publishPackage.content,
          contentFormat: "markdown",
          exportPath: publishPackage.exportPath,
          draftUrl: publishPackage.draftUrl,
          metadata: {
            mockedBy: "thread-5",
          },
        });
      }
    }

    const existingReviewTasks = await reviewRepository.listByDraftId(seedDraft.draftId);

    for (const reviewTask of seedDraft.reviewTasks) {
      const exists = existingReviewTasks.some((item) => item.id === reviewTask.id);

      if (!exists) {
        await reviewRepository.create({
          id: reviewTask.id,
          draftId: seedDraft.draftId,
          reviewerEmail: reviewTask.reviewerEmail,
          status: reviewTask.status,
          checklist: reviewTask.checklist,
          comments: reviewTask.comments,
          decidedAt: reviewTask.decidedAt,
        });
      }
    }

    if (seedDraft.postDecisionRewrite) {
      const revisionTask = seedDraft.reviewTasks[0];
      const postDecisionRewriteExists = (
        await draftRepository.listRewrites(seedDraft.draftId)
      ).some((item) => item.id === seedDraft.postDecisionRewrite?.id);

      if (createdDraft && !postDecisionRewriteExists) {
        await draftRepository.update(seedDraft.draftId, {
          status: DraftStatus.REJECTED,
        });
        await wait(15);
        await ensureRewriteSeed(seedDraft.draftId, seedDraft.postDecisionRewrite);

        if (seedDraft.postDecisionStatus) {
          await draftRepository.update(seedDraft.draftId, {
            status: seedDraft.postDecisionStatus,
          });
        }

        if (revisionTask?.decidedAt) {
          await publishRepository.update("package_revision_wechat", {
            status: PublishStatus.FAILED,
            summary: "已按退回意见更新内容，等待重新导出或重新送审。",
          });
        }
      }
    } else if (createdDraft) {
      await draftRepository.update(seedDraft.draftId, {
        status: seedDraft.status,
      });
    }
  }
}

export function getSeedRewriteContent(rewriteId: string | null): string | null {
  if (rewriteId === null) {
    return null;
  }

  return rewriteContentIndex.get(rewriteId) ?? null;
}
