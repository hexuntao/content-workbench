import assert from "node:assert/strict";
import test from "node:test";

import { DraftStatus, DraftType, RewriteStrategy, TopicStatus } from "@prisma/client";
import { DraftWorkbenchError } from "@/features/drafts/server/errors";
import {
  getDraftWorkbenchDetail,
  selectRewriteVersion,
  triggerPackagingJob,
  triggerRewriteJob,
} from "@/features/drafts/server/workbench-service";
import { prisma } from "@/server/db";
import { createDraftRepository, createTopicRepository } from "@/server/repositories";

const topicRepository = createTopicRepository();
const draftRepository = createDraftRepository();

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

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve: () => void) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
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

test("triggerRewriteJob queues a job and materializes rewrite versions after sync", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "thread4_topic_rewrite",
    title: "Thread 4 Rewrite",
    keywords: ["rewrite"],
    status: TopicStatus.IN_PROGRESS,
  });
  const draft = await draftRepository.create({
    id: "thread4_draft_rewrite",
    topicClusterId: topic.id,
    draftType: DraftType.MASTER,
    status: DraftStatus.CREATED,
    title: "Thread 4 Rewrite Draft",
    content: "# Original",
  });

  const response = await triggerRewriteJob(draft.id, {
    strategies: ["AUTHOR_VOICE", "DE_AI"],
    voiceProfileId: "default",
  });

  assert.equal(response.status, "QUEUED");

  await wait(1350);

  const detail = await getDraftWorkbenchDetail(draft.id);

  assert.equal(detail.draft.status, DraftStatus.REWRITTEN);
  assert.equal(detail.latestJob?.status, "SUCCEEDED");
  assert.equal(detail.rewrites.length >= 2, true);
  assert.equal(
    detail.rewrites.some((rewrite) => rewrite.strategy === RewriteStrategy.AUTHOR_VOICE),
    true,
  );
});

test("selectRewriteVersion updates the current selection and reading pane", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "thread4_topic_select",
    title: "Thread 4 Select",
    keywords: ["select"],
    status: TopicStatus.IN_PROGRESS,
  });
  const draft = await draftRepository.create({
    id: "thread4_draft_select",
    topicClusterId: topic.id,
    draftType: DraftType.MASTER,
    status: DraftStatus.REWRITTEN,
    title: "Thread 4 Select Draft",
    content: "# Base",
  });

  await draftRepository.createRewrite({
    id: "thread4_rewrite_a",
    draftId: draft.id,
    strategy: RewriteStrategy.AUTHOR_VOICE,
    title: "Rewrite A",
    content: "# Rewrite A",
    diffSummary: "A",
    score: 0.9,
    isSelected: true,
  });
  await draftRepository.createRewrite({
    id: "thread4_rewrite_b",
    draftId: draft.id,
    strategy: RewriteStrategy.DE_AI,
    title: "Rewrite B",
    content: "# Rewrite B",
    diffSummary: "B",
    score: 0.82,
    isSelected: false,
  });

  const detail = await selectRewriteVersion(draft.id, {
    rewriteId: "thread4_rewrite_b",
  });

  assert.equal(detail.draft.currentRewriteId, "thread4_rewrite_b");
  assert.equal(detail.selectedRewrite?.id, "thread4_rewrite_b");
  assert.equal(detail.readingPane.title, "Rewrite B");
});

test("triggerPackagingJob rejects archived drafts with a stable state error", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "thread4_topic_archived",
    title: "Thread 4 Archived",
    keywords: ["package"],
    status: TopicStatus.IN_PROGRESS,
  });
  const draft = await draftRepository.create({
    id: "thread4_draft_archived",
    topicClusterId: topic.id,
    draftType: DraftType.MASTER,
    status: DraftStatus.ARCHIVED,
    title: "Archived Draft",
    content: "# Archived",
  });

  await assert.rejects(
    async (): Promise<void> => {
      await triggerPackagingJob(draft.id, {
        channels: ["WECHAT"],
        rewriteId: null,
      });
    },
    (error: unknown): boolean => {
      assert.equal(error instanceof DraftWorkbenchError, true);
      assert.equal((error as DraftWorkbenchError).code, "DRAFT_STATUS_INVALID");
      return true;
    },
  );
});
