import {
  DraftStatus,
  DraftType,
  PublishStatus,
  RewriteStrategy,
  TopicStatus,
} from "@prisma/client";
import {
  createDraftRepository,
  createPublishRepository,
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
  packages?: Array<{
    id: string;
    channel: "WECHAT" | "XHS" | "X_ARTICLE";
    status: PublishStatus;
    title: string;
    summary: string;
    content: string;
    exportPath: string | null;
    draftUrl: string | null;
  }>;
};

export const workbenchSeedDraftIds: readonly string[] = [
  "draft_editorial_master",
  "draft_channel_package_ready",
] as const;

const seedDrafts: readonly SeedDraft[] = [
  {
    topicId: "topic_editorial_master",
    topicTitle: "内容团队为什么重新把注意力拉回母稿层",
    topicSummary: "把生成速度重新翻译成编辑判断与包装节奏，而不是继续讨论模型参数。",
    draftId: "draft_editorial_master",
    title: "真正稀缺的不是渠道动作，而是可判断的母稿",
    summary:
      "这篇母稿围绕“内容母版”展开：当工具普遍具备生成能力后，团队真正稀缺的是能承受多轮改写、审核和渠道包装的判断结构。",
    status: DraftStatus.REWRITTEN,
    content: `# 真正稀缺的不是渠道动作，而是可判断的母稿

很多团队以为自己需要的是更快的分发器，真正缺的却是能承受多轮判断的母稿层。只要母稿还是一团未经整理的观点，后面的改写、审核和平台包装就只能不断返工。

## 问题不在“能不能改写”

模型已经把改写变成低门槛动作，真正难的是判断哪一版值得继续走下去。编辑需要一个稳定的基线稿，能够清楚说明这篇内容的主张、论证顺序和证据边界。没有这个基线，改写只是不断重排句子，而不是提高成稿质量。

## 母稿决定后续每一步的成本

当母稿已经把标题、导语、结构与结论整理干净，平台包装就不再像重新写一篇文章。微信长文需要补充上下文，小红书需要压缩为结论更直白的段落，X Article 需要保留观点推进的节奏。它们应该是在同一份判断上做剪裁，而不是在三份不一致的草稿之间反复修补。

## 编辑台真正要控制的是“下一步”

一个成熟的工作台不该把所有按钮平铺给用户，而是要让人一眼看到当前正在阅读哪一版、这版做了什么改变，以及下一步是否应该进入包装。阅读区负责判断，侧栏负责推进流程。这种分工会让页面更像编辑桌面，而不是管理后台。

## 结论

如果团队还在为每个平台各写一份初稿，他们不是缺少渠道技巧，而是缺少一个足够稳定的母稿工作面。先把母稿做对，后面的动作才会变得自然。`,
    rewrites: [
      {
        id: "rewrite_editorial_author_voice",
        strategy: RewriteStrategy.AUTHOR_VOICE,
        title: "先把母稿写稳，包装才不会变成补锅",
        diffSummary: "导语改成更强判断句，删掉模板化铺垫，把“编辑台分工”提前为主线。",
        score: 0.93,
        isSelected: true,
        content: `# 先把母稿写稳，包装才不会变成补锅

内容团队最容易犯的错，是把分发动作当成进度，把母稿质量当成以后再补的事。结果就是每个平台都能发，但每个平台都要重写一遍，最后谁也不真正相信这篇稿子已经成型。

## 改写不是价值，判断才是价值

当改写已经足够便宜，真正值得保留的是那份经过整理的判断。母稿要先把标题、立场、证据边界和结论站稳，改写版本才有比较的意义。否则我们看到的只是三种不同的措辞，而不是三种不同的编辑选择。

## 平台包装应该建立在同一份母稿上

微信要的是展开后的论证，小红书要的是更快进入结论，X Article 要的是更锐利的节奏。但它们都应该从同一份母稿往下拆。这样包装是推进流程，而不是重新开工。

## 一个好的编辑台该怎么分工

主区域负责阅读和判断，侧栏负责版本切换和流程控制。当前版本要清楚，比较信息要节制，下一步动作要明显但不喧宾夺主。这样编辑做的是“决定往哪走”，不是在一堆按钮里找方向。

## 结尾

先把母稿写稳，后面的包装动作才会像顺流而下；否则每一步都像在补锅。`,
      },
      {
        id: "rewrite_editorial_de_ai",
        strategy: RewriteStrategy.DE_AI,
        title: "当所有渠道都能发，母稿反而成了最慢也最值钱的一步",
        diffSummary: "减少抽象词，把“返工”问题写得更具体，结尾收得更克制。",
        score: 0.87,
        content: `# 当所有渠道都能发，母稿反而成了最慢也最值钱的一步

现在的问题从来不是“能不能把文章改成别的平台版本”，而是“有没有一份值得改的母稿”。只要起点不稳，越往后做，返工越多。

## 先有一个能被检验的立场

母稿首先要让人知道这篇内容到底在主张什么、拿什么支撑、结论准备落在哪里。这样改写版本之间的比较才是有效的。

## 包装是压缩和展开，不是重写

同一份母稿拆到不同渠道时，动作应该是压缩、展开、重排重点，而不是把文章重新写一遍。只有这样，包装才是流程里的下一步。`,
      },
      {
        id: "rewrite_editorial_oral",
        strategy: RewriteStrategy.ORAL,
        title: "别急着发，先把母稿这张底稿写明白",
        diffSummary: "语气更口语，开头更直接，但牺牲了一部分结构精度。",
        score: 0.78,
        content: `# 别急着发，先把母稿这张底稿写明白

很多团队看起来动作很多，其实一直在重复做同一件事：把没写稳的内容一遍遍换个平台重说。问题不在平台，问题在底稿。`,
      },
    ],
  },
  {
    topicId: "topic_channel_package_ready",
    topicTitle: "包装动作一旦标准化，审核会从挑错变成判断是否值得发布",
    topicSummary: "重点不是渠道模板，而是让包装输出足够稳定，能直接进入 review。",
    draftId: "draft_channel_package_ready",
    title: "平台包装应该像流程节点，而不是一排工具按钮",
    summary: "这篇稿子已经做过一轮包装，用来展示 package 完成后的状态与渠道产物概览。",
    status: DraftStatus.PACKAGED,
    content: `# 平台包装应该像流程节点，而不是一排工具按钮

当包装区只是几个平铺按钮时，编辑感知不到这是在推进流程。更合理的做法是把包装做成明确的下一步：基于哪一版内容、准备哪些渠道、当前是否已有产物、是否可以送审。`,
    rewrites: [
      {
        id: "rewrite_package_selected",
        strategy: RewriteStrategy.MIXED,
        title: "把包装区做成流程控制台，而不是工具箱",
        diffSummary: "强化流程语义，把渠道动作与审核前置关系说得更清楚。",
        score: 0.89,
        isSelected: true,
        content: `# 把包装区做成流程控制台，而不是工具箱

包装区存在的意义不是提供更多按钮，而是把“基于哪一版内容进入哪些渠道”这件事收敛成一个可判断的下一步。`,
      },
    ],
    packages: [
      {
        id: "package_wechat_ready",
        channel: "WECHAT",
        status: PublishStatus.EXPORTED,
        title: "微信长文包",
        summary: "保留论证展开与段间过渡。",
        content: "mock://wechat-editorial-package",
        exportPath: "mock://exports/wechat/draft_channel_package_ready.md",
        draftUrl: null,
      },
      {
        id: "package_xarticle_ready",
        channel: "X_ARTICLE",
        status: PublishStatus.DRAFT_CREATED,
        title: "X Article 平台稿",
        summary: "导语更短，观点推进更快。",
        content: "mock://x-article-editorial-package",
        exportPath: "mock://exports/x-article/draft_channel_package_ready.md",
        draftUrl: "https://example.com/drafts/x-article-ready",
      },
    ],
  },
];

function getTopicRepository() {
  return createTopicRepository();
}

function getDraftRepository() {
  return createDraftRepository();
}

function getPublishRepository() {
  return createPublishRepository();
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function ensureDraftWorkbenchSeed(): Promise<void> {
  const topicRepository = getTopicRepository();
  const draftRepository = getDraftRepository();
  const publishRepository = getPublishRepository();

  for (const seedDraft of seedDrafts) {
    const topic = await topicRepository.getById(seedDraft.topicId);

    if (!topic) {
      try {
        await topicRepository.create({
          id: seedDraft.topicId,
          title: seedDraft.topicTitle,
          summary: seedDraft.topicSummary,
          keywords: ["content", "editorial", "workflow"],
          status: TopicStatus.IN_PROGRESS,
          totalScore: 0.86,
          editorialScore: 0.92,
          relevanceScore: 0.84,
          trendScore: 0.81,
          recommendedAngle: "从编辑决策与流程控制切入，而不是平台技巧。",
        });
      } catch (error: unknown) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    const existingDraft = await draftRepository.getById(seedDraft.draftId);

    if (!existingDraft) {
      try {
        await draftRepository.create({
          id: seedDraft.draftId,
          topicClusterId: seedDraft.topicId,
          draftType: DraftType.MASTER,
          status: seedDraft.status,
          title: seedDraft.title,
          summary: seedDraft.summary,
          content: seedDraft.content,
        });
      } catch (error: unknown) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    const existingRewrites = await draftRepository.listRewrites(seedDraft.draftId);

    if (existingRewrites.length === 0) {
      for (const rewrite of seedDraft.rewrites) {
        try {
          await draftRepository.createRewrite({
            id: rewrite.id,
            draftId: seedDraft.draftId,
            strategy: rewrite.strategy,
            title: rewrite.title,
            content: rewrite.content,
            diffSummary: rewrite.diffSummary,
            score: rewrite.score,
            isSelected: rewrite.isSelected ?? false,
          });
        } catch (error: unknown) {
          if (!isUniqueConstraintError(error)) {
            throw error;
          }
        }
      }
    }

    if (seedDraft.packages) {
      for (const publishPackage of seedDraft.packages) {
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
        });
      }
    }
  }
}
