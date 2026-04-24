import assert from "node:assert/strict";
import test from "node:test";

import { DraftStatus, ReviewStatus } from "@prisma/client";
import {
  approveReviewTask,
  getReviewDetail,
  requestChangesForReviewTask,
  resubmitReviewTask,
} from "@/features/review/server/review-service";
import { prisma } from "@/server/db/client";
import { createDraftRepository, createReviewRepository } from "@/server/repositories";

const draftRepository = createDraftRepository();
const reviewRepository = createReviewRepository();

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

test("approveReviewTask marks the task approved and the draft ready to publish", async (): Promise<void> => {
  const detail = await approveReviewTask("review_task_signal", {
    comments: "判断成立，可以进入发布准备。",
    checklist: {
      factsChecked: true,
      argumentClear: true,
      voiceConsistent: true,
      channelReady: true,
      aiClicheFree: true,
    },
  });

  assert.equal(detail.task.status, ReviewStatus.APPROVED);
  assert.equal(detail.draft.status, DraftStatus.READY_TO_PUBLISH);

  const storedDraft = await draftRepository.getById("draft_review_signal");
  assert.equal(storedDraft?.status, DraftStatus.READY_TO_PUBLISH);
});

test("requestChangesForReviewTask moves the draft back to rejected", async (): Promise<void> => {
  const detail = await requestChangesForReviewTask("review_task_signal", {
    comments: "导语与结尾仍需压缩，请修订后重提。",
    checklist: {
      factsChecked: true,
      argumentClear: true,
      voiceConsistent: false,
      channelReady: false,
      aiClicheFree: false,
    },
  });

  assert.equal(detail.task.status, ReviewStatus.CHANGES_REQUESTED);
  assert.equal(detail.draft.status, DraftStatus.REJECTED);

  const storedDraft = await draftRepository.getById("draft_review_signal");
  assert.equal(storedDraft?.status, DraftStatus.REJECTED);
});

test("resubmitReviewTask creates a new pending task and preserves the old history item", async (): Promise<void> => {
  const detail = await resubmitReviewTask("review_task_revision", {
    draftId: "draft_review_revision",
    newRewriteId: "rewrite_review_revision_resubmitted",
  });

  assert.equal(detail.task.status, ReviewStatus.PENDING);
  assert.equal(detail.draft.status, DraftStatus.IN_REVIEW);
  assert.notEqual(detail.task.id, "review_task_revision");

  const history = await reviewRepository.listByDraftId("draft_review_revision");
  assert.equal(
    history.some((item) => item.id === "review_task_revision"),
    true,
  );
  assert.equal(
    history.some((item) => item.id === detail.task.id),
    true,
  );

  const previousTask = await getReviewDetail("review_task_revision");
  assert.equal(previousTask.task.status, ReviewStatus.CHANGES_REQUESTED);
});
