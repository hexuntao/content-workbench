import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before running Prisma seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function clearDatabase(): Promise<void> {
  await prisma.publicationRecord.deleteMany();
  await prisma.job.deleteMany();
  await prisma.publishPackage.deleteMany();
  await prisma.reviewTask.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.rewriteVersion.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.topicClusterSourceItem.deleteMany();
  await prisma.topicCluster.deleteMany();
  await prisma.sourceItem.deleteMany();
  await prisma.source.deleteMany();
}

async function seedSources(): Promise<void> {
  await prisma.source.create({
    data: {
      id: "seed_source_ai_rss",
      name: "AI Weekly RSS",
      type: "RSS",
      config: {
        feedUrl: "https://example.com/rss/ai-weekly.xml",
        category: "ai",
      },
      priority: 10,
      items: {
        create: [
          {
            id: "seed_source_item_1",
            sourceExternalId: "rss-ai-001",
            title: "DeepSeek 新版本推动 AI 内容生产再次降本",
            url: "https://example.com/posts/deepseek-cost",
            author: "Analyst A",
            publishedAt: new Date("2026-04-23T01:00:00.000Z"),
            rawContent: "raw article body",
            normalizedContent: "normalized article body",
            summary: "讨论模型价格变化和内容生产效率。",
            dedupeHash: "dedupe-deepseek-cost",
            metadata: {
              channel: "rss",
            },
          },
          {
            id: "seed_source_item_2",
            sourceExternalId: "rss-ai-002",
            title: "AI Agent 工作流正在重写内容团队协作方式",
            url: "https://example.com/posts/agent-workflow",
            author: "Analyst B",
            publishedAt: new Date("2026-04-23T02:00:00.000Z"),
            rawContent: "raw article body",
            normalizedContent: "normalized article body",
            summary: "强调 agent workflow 对内容团队节奏的影响。",
            dedupeHash: "dedupe-agent-workflow",
            metadata: {
              channel: "rss",
            },
          },
          {
            id: "seed_source_item_3",
            sourceExternalId: "rss-ai-003",
            title: "小红书内容包装策略开始更偏向系列化叙事",
            url: "https://example.com/posts/xhs-storytelling",
            author: "Analyst C",
            publishedAt: new Date("2026-04-23T03:00:00.000Z"),
            rawContent: "raw article body",
            normalizedContent: "normalized article body",
            summary: "讨论系列卡片和封面风格的一致性。",
            dedupeHash: "dedupe-xhs-storytelling",
            metadata: {
              channel: "rss",
            },
          },
        ],
      },
    },
  });
}

async function seedTopicsAndDrafts(): Promise<void> {
  await prisma.topicCluster.create({
    data: {
      id: "seed_topic_deepseek",
      title: "DeepSeek 新版本的生态影响",
      summary: "多个来源都在讨论模型能力和价格变化。",
      keywords: ["DeepSeek", "模型", "定价"],
      theme: "AI 工具",
      trendScore: 0.82,
      relevanceScore: 0.74,
      editorialScore: 0.88,
      totalScore: 0.81,
      recommendedAngle: "从内容生产效率而不是参数对比切入",
      status: "IN_PROGRESS",
      metadata: {
        scoreBreakdown: {
          novelty: 0.8,
          editorialFit: 0.88,
        },
      },
      sourceLinks: {
        create: [
          {
            sourceItemId: "seed_source_item_1",
            rank: 1,
            reason: "信息密度最高",
          },
          {
            sourceItemId: "seed_source_item_2",
            rank: 2,
            reason: "补充工作流视角",
          },
        ],
      },
      drafts: {
        create: [
          {
            id: "seed_draft_master_1",
            draftType: "MASTER",
            status: "READY_TO_PUBLISH",
            title: "DeepSeek 新版本正在改写内容团队的生产曲线",
            summary: "从成本、工作流和内容协作三个维度分析新模型影响。",
            content: "# DeepSeek 新版本\\n\\n内容团队正在重新计算效率边界。",
            contentFormat: "markdown",
            version: 2,
            metadata: {
              voiceProfileId: "default",
            },
            rewrites: {
              create: [
                {
                  id: "seed_rewrite_1",
                  strategy: "AUTHOR_VOICE",
                  title: "更像作者语气的版本",
                  content: "# 更像作者语气的版本\\n\\n这次变化不是参数升级，而是执行成本重估。",
                  diffSummary: "减少模板化开头，加入个人判断。",
                  score: 0.91,
                  isSelected: true,
                },
                {
                  id: "seed_rewrite_2",
                  strategy: "DE_AI",
                  title: "去 AI 味版本",
                  content: "# 去 AI 味版本\\n\\n团队真正关心的是可复制的产能。",
                  diffSummary: "压缩套话并提升事实密度。",
                  score: 0.83,
                },
              ],
            },
            assets: {
              create: [
                {
                  id: "seed_asset_cover_1",
                  type: "COVER_IMAGE",
                  path: "assets/covers/deepseek-cover.png",
                  mimeType: "image/png",
                  metadata: {
                    width: 1600,
                    height: 900,
                  },
                },
              ],
            },
            reviews: {
              create: [
                {
                  id: "seed_review_approved_1",
                  reviewerEmail: "editor@example.com",
                  status: "APPROVED",
                  checklist: {
                    factsChecked: true,
                    voiceConsistent: true,
                    channelReady: true,
                  },
                  comments: "可以进入发布准备。",
                  decidedAt: new Date("2026-04-23T05:10:00.000Z"),
                },
              ],
            },
            publishPackages: {
              create: [
                {
                  id: "seed_package_wechat_1",
                  channel: "WECHAT",
                  status: "PUBLISHED",
                  title: "DeepSeek 新版本如何重排内容团队的生产曲线",
                  summary: "公众号长文版本。",
                  content: "<h1>DeepSeek 新版本</h1><p>内容团队正在重算效率。</p>",
                  contentFormat: "html",
                  exportPath: "exports/wechat/seed_package_wechat_1/",
                  draftUrl: "https://mp.weixin.qq.com/draft/seed_package_wechat_1",
                  metadata: {
                    rewriteId: "seed_rewrite_1",
                  },
                  publication: {
                    create: {
                      id: "seed_publication_wechat_1",
                      channel: "WECHAT",
                      publishedUrl: "https://mp.weixin.qq.com/s/example",
                      publishedAt: new Date("2026-04-23T07:00:00.000Z"),
                      notes: "手动从公众号后台发布。",
                    },
                  },
                },
                {
                  id: "seed_package_xhs_1",
                  channel: "XHS",
                  status: "EXPORTED",
                  title: "DeepSeek 让内容团队的效率公式变了",
                  summary: "小红书图文文案版本。",
                  content: "封面文案 + 9 张卡片脚本",
                  contentFormat: "markdown",
                  exportPath: "exports/xhs/seed_package_xhs_1/",
                  metadata: {
                    rewriteId: "seed_rewrite_1",
                  },
                },
              ],
            },
          },
        ],
      },
      jobs: {
        create: [
          {
            id: "seed_job_generate_master_1",
            type: "GENERATE_MASTER_DRAFT",
            status: "SUCCEEDED",
            entityType: "DRAFT",
            entityId: "seed_draft_master_1",
            draftId: "seed_draft_master_1",
            idempotencyKey: "topic-seed_topic_deepseek-master-v1",
            triggeredBy: "editor@example.com",
            input: {
              voiceProfileId: "default",
            },
            output: {
              draftId: "seed_draft_master_1",
            },
            startedAt: new Date("2026-04-23T03:00:00.000Z"),
            finishedAt: new Date("2026-04-23T03:03:00.000Z"),
          },
        ],
      },
    },
  });

  await prisma.draft.update({
    where: {
      id: "seed_draft_master_1",
    },
    data: {
      currentRewriteId: "seed_rewrite_1",
    },
  });

  await prisma.topicCluster.create({
    data: {
      id: "seed_topic_agents",
      title: "AI Agent 工作流如何改变内容团队协作",
      summary: "编辑流转、任务分发和审核链路都在被重写。",
      keywords: ["AI Agent", "工作流", "协作"],
      theme: "内容团队",
      trendScore: 0.79,
      relevanceScore: 0.84,
      editorialScore: 0.8,
      totalScore: 0.81,
      recommendedAngle: "强调任务编排和人工审核的再分工",
      status: "SHORTLISTED",
      sourceLinks: {
        create: [
          {
            sourceItemId: "seed_source_item_2",
            rank: 1,
            reason: "直接描述团队协作变化",
          },
        ],
      },
    },
  });

  await prisma.topicCluster.create({
    data: {
      id: "seed_topic_xhs",
      title: "小红书系列化叙事适合哪些内容形态",
      summary: "更适合连续更新和可视化表达强的主题。",
      keywords: ["小红书", "包装", "系列化"],
      theme: "渠道包装",
      trendScore: 0.7,
      relevanceScore: 0.76,
      editorialScore: 0.75,
      totalScore: 0.74,
      recommendedAngle: "从内容资产复用视角切入",
      status: "NEW",
      sourceLinks: {
        create: [
          {
            sourceItemId: "seed_source_item_3",
            rank: 1,
            reason: "直接讨论系列化包装趋势",
          },
        ],
      },
      drafts: {
        create: [
          {
            id: "seed_draft_master_2",
            draftType: "MASTER",
            status: "PACKAGED",
            title: "系列化叙事为什么更适合小红书内容团队",
            summary: "从选题、封面到资产复用的角度解释原因。",
            content: "# 系列化叙事\\n\\n适合高频主题内容。",
            contentFormat: "markdown",
            publishPackages: {
              create: [
                {
                  id: "seed_package_x_article_1",
                  channel: "X_ARTICLE",
                  status: "PENDING",
                  title: "Series-first packaging for social channels",
                  summary: "Long-form article packaging.",
                  content: "# Series-first packaging",
                  contentFormat: "markdown",
                },
              ],
            },
            reviews: {
              create: [
                {
                  id: "seed_review_pending_1",
                  reviewerEmail: null,
                  status: "PENDING",
                  checklist: {
                    factsChecked: false,
                    voiceConsistent: false,
                    channelReady: true,
                  },
                  comments: "待领取审核。",
                },
              ],
            },
          },
        ],
      },
    },
  });
}

async function main(): Promise<void> {
  await clearDatabase();
  await seedSources();
  await seedTopicsAndDrafts();
}

main()
  .then(async (): Promise<void> => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown): Promise<void> => {
    console.error("Seeding failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
