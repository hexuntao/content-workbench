import assert from "node:assert/strict";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  DraftType,
  JobEntityType,
  JobType,
  PrismaClient,
  PublishStatus,
  ReviewStatus,
  RewriteStrategy,
  TopicStatus,
} from "@prisma/client";
import { createDraftRepository } from "./draft-repository.ts";
import { createJobRepository } from "./job-repository.ts";
import { createPublishRepository } from "./publish-repository.ts";
import { createReviewRepository } from "./review-repository.ts";
import { createTopicRepository } from "./topic-repository.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before running repository tests.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const topicRepository = createTopicRepository(prisma);
const draftRepository = createDraftRepository(prisma);
const reviewRepository = createReviewRepository(prisma);
const publishRepository = createPublishRepository(prisma);
const jobRepository = createJobRepository(prisma);

async function resetDatabase(): Promise<void> {
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

test.before(async (): Promise<void> => {
  await resetDatabase();
});

test.beforeEach(async (): Promise<void> => {
  await resetDatabase();
});

test.after(async (): Promise<void> => {
  await resetDatabase();
  await prisma.$disconnect();
});

test("topic repository returns source item counts and active master draft summaries", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "test_topic_1",
    title: "Test Topic",
    keywords: ["agent", "workflow"],
    totalScore: 0.9,
    status: TopicStatus.IN_PROGRESS,
  });

  await prisma.source.create({
    data: {
      id: "test_source_1",
      name: "Test Source",
      type: "RSS",
      config: {
        url: "https://example.com/rss.xml",
      },
      items: {
        create: [
          {
            id: "test_source_item_1",
            title: "Source Item 1",
            url: "https://example.com/posts/1",
            dedupeHash: "dedupe-source-item-1",
          },
          {
            id: "test_source_item_2",
            title: "Source Item 2",
            url: "https://example.com/posts/2",
            dedupeHash: "dedupe-source-item-2",
          },
        ],
      },
    },
  });

  await topicRepository.replaceSourceItems(topic.id, [
    {
      sourceItemId: "test_source_item_1",
      rank: 1,
      reason: "Highest signal",
    },
    {
      sourceItemId: "test_source_item_2",
      rank: 2,
    },
  ]);

  await draftRepository.create({
    id: "test_draft_1",
    topicClusterId: topic.id,
    draftType: DraftType.MASTER,
    title: "Master Draft",
    content: "# Master Draft",
  });

  const listResult = await topicRepository.list({
    status: TopicStatus.IN_PROGRESS,
  });
  const detail = await topicRepository.getById(topic.id);
  const sourceItems = await topicRepository.listSourceItems(topic.id);

  assert.equal(listResult.items.length, 1);
  assert.equal(listResult.items[0]?.sourceItemCount, 2);
  assert.equal(listResult.items[0]?.currentMasterDraft?.id, "test_draft_1");
  assert.equal(detail?.sourceItemCount, 2);
  assert.equal(sourceItems.length, 2);
  assert.equal(sourceItems[0]?.id, "test_source_item_1");
  assert.equal(await topicRepository.countActiveMasterDrafts(topic.id), 1);
});

test("draft repository keeps rewrite selection consistent", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "test_topic_2",
    title: "Rewrite Topic",
    keywords: ["rewrite"],
  });

  const draft = await draftRepository.create({
    id: "test_draft_2",
    topicClusterId: topic.id,
    draftType: DraftType.MASTER,
    title: "Draft For Rewrite",
    content: "# Original",
  });

  await draftRepository.createRewrite({
    id: "test_rewrite_1",
    draftId: draft.id,
    strategy: RewriteStrategy.AUTHOR_VOICE,
    content: "# Rewrite A",
  });

  await draftRepository.createRewrite({
    id: "test_rewrite_2",
    draftId: draft.id,
    strategy: RewriteStrategy.DE_AI,
    content: "# Rewrite B",
    isSelected: true,
  });

  const rewrites = await draftRepository.listRewrites(draft.id);
  const selectedDraft = await draftRepository.selectRewrite(draft.id, "test_rewrite_1");

  assert.equal(rewrites.filter((rewrite) => rewrite.isSelected).length, 1);
  assert.equal(selectedDraft?.currentRewriteId, "test_rewrite_1");

  const updatedRewrites = await draftRepository.listRewrites(draft.id);
  assert.equal(updatedRewrites.filter((rewrite) => rewrite.isSelected).length, 1);
  assert.equal(updatedRewrites.find((rewrite) => rewrite.isSelected)?.id, "test_rewrite_1");
});

test("review and publish repositories expose queue/detail and upsert semantics", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "test_topic_3",
    title: "Review Topic",
    keywords: ["review"],
  });

  const draft = await draftRepository.create({
    id: "test_draft_3",
    topicClusterId: topic.id,
    draftType: DraftType.MASTER,
    status: "PACKAGED",
    title: "Draft Ready For Review",
    content: "# Review Ready",
  });

  await draftRepository.createRewrite({
    id: "test_rewrite_3",
    draftId: draft.id,
    strategy: RewriteStrategy.AUTHOR_VOICE,
    content: "# Review Rewrite",
    isSelected: true,
  });

  const review = await reviewRepository.create({
    id: "test_review_1",
    draftId: draft.id,
    reviewerEmail: "editor@example.com",
    status: ReviewStatus.PENDING,
    checklist: {
      channelReady: true,
    },
  });

  const pending = await reviewRepository.findPendingByDraftId(draft.id);
  const queue = await reviewRepository.list({
    status: ReviewStatus.PENDING,
  });
  const publishPackage = await publishRepository.upsertByDraftAndChannel({
    id: "test_package_1",
    draftId: draft.id,
    channel: "WECHAT",
    status: PublishStatus.EXPORTED,
    title: "WeChat Package",
    exportPath: "exports/test-package",
  });
  const updatedPublishPackage = await publishRepository.upsertByDraftAndChannel({
    draftId: draft.id,
    channel: "WECHAT",
    status: PublishStatus.DRAFT_CREATED,
    draftUrl: "https://example.com/draft/1",
  });
  const published = await publishRepository.upsertPublicationRecord({
    publishPackageId: publishPackage.id,
    channel: "WECHAT",
    publishedUrl: "https://example.com/published/1",
    publishedAt: new Date("2026-04-23T08:00:00.000Z"),
    notes: "manual publish",
  });

  assert.equal(review.currentRewrite?.id, "test_rewrite_3");
  assert.equal(pending?.id, "test_review_1");
  assert.equal(queue.items.length, 1);
  assert.equal(updatedPublishPackage.id, publishPackage.id);
  assert.equal(updatedPublishPackage.status, PublishStatus.DRAFT_CREATED);
  assert.equal(published.publication?.publishedUrl, "https://example.com/published/1");
});

test("job repository supports idempotency lookups for active jobs", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "test_topic_4",
    title: "Job Topic",
    keywords: ["jobs"],
  });

  await jobRepository.create({
    id: "test_job_1",
    type: JobType.GENERATE_MASTER_DRAFT,
    entityType: JobEntityType.TOPIC_CLUSTER,
    entityId: topic.id,
    topicClusterId: topic.id,
    status: "QUEUED",
    idempotencyKey: "job-topic-4-master-v1",
  });

  const activeJob = await jobRepository.findActiveByIdempotencyKey("job-topic-4-master-v1");
  const list = await jobRepository.list({
    entityType: JobEntityType.TOPIC_CLUSTER,
    entityId: topic.id,
  });

  assert.equal(activeJob?.id, "test_job_1");
  assert.equal(list.items.length, 1);
});
