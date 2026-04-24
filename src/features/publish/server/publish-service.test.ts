import assert from "node:assert/strict";
import test from "node:test";

import { PublishWorkbenchError } from "@/features/publish/server/errors";
import {
  createRemoteDraftForPackage,
  exportPublishPackage,
  getPublishDetail,
  markPackagePublished,
} from "@/features/publish/server/publish-service";
import { prisma } from "@/server/db/client";

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

test("exportPublishPackage queues a job and eventually writes exportPath", async (): Promise<void> => {
  const response = await exportPublishPackage("package_publish_ready_wechat");

  assert.equal(response.status, "QUEUED");

  await wait(1100);

  const detail = await getPublishDetail("package_publish_ready_wechat");
  assert.equal(detail.package.status, "EXPORTED");
  assert.notEqual(detail.stages[0]?.artifactValue, null);
});

test("createRemoteDraftForPackage blocks packages that have not passed review gate", async (): Promise<void> => {
  await assert.rejects(
    async (): Promise<void> => {
      await createRemoteDraftForPackage("package_signal_x_article", "default");
    },
    (error: unknown): boolean => {
      assert.equal(error instanceof PublishWorkbenchError, true);
      assert.equal((error as PublishWorkbenchError).code, "REVIEW_REQUIRED_BEFORE_PUBLISH");
      return true;
    },
  );
});

test("markPackagePublished blocks packages that have not passed review gate", async (): Promise<void> => {
  await assert.rejects(
    async (): Promise<void> => {
      await markPackagePublished("package_signal_x_article", {
        publishedUrl: "https://example.com/published/x-article/not-ready",
        publishedAt: "2026-04-23T09:05:00.000Z",
        notes: "不应绕过审核门禁。",
      });
    },
    (error: unknown): boolean => {
      assert.equal(error instanceof PublishWorkbenchError, true);
      assert.equal((error as PublishWorkbenchError).code, "REVIEW_REQUIRED_BEFORE_PUBLISH");
      return true;
    },
  );
});

test("markPackagePublished writes publication evidence once export exists", async (): Promise<void> => {
  const detail = await markPackagePublished("package_publish_ready_x_article", {
    publishedUrl: "https://example.com/published/x-article/final",
    publishedAt: "2026-04-23T09:00:00.000Z",
    notes: "从 X Article 后台手动发布。",
  });

  assert.equal(detail.package.status, "PUBLISHED");
  assert.equal(detail.publication?.publishedUrl, "https://example.com/published/x-article/final");
});
