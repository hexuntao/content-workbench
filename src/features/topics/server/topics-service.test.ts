import assert from "node:assert/strict";
import test from "node:test";
import { DraftType, TopicStatus } from "@prisma/client";
import {
  generateMasterDraft,
  listTopics,
  shortlistTopic,
  startTopic,
} from "@/features/topics/server/topics-service";
import { prisma } from "@/server/db/client";
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
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
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

test("topics service updates shortlist and start status through persisted topics", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "topic_service_start",
    title: "Topic Service Start",
    keywords: ["workflow"],
    status: TopicStatus.NEW,
  });

  const shortlisted = await shortlistTopic(topic.id);
  const started = await startTopic(topic.id);
  const list = await listTopics({
    status: TopicStatus.IN_PROGRESS,
  });

  assert.equal(shortlisted.status, TopicStatus.SHORTLISTED);
  assert.equal(started.status, TopicStatus.IN_PROGRESS);
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0]?.id, topic.id);
});

test("generateMasterDraft enqueues workflow and creates a persisted master draft", async (): Promise<void> => {
  const topic = await topicRepository.create({
    id: "topic_service_generate",
    title: "Topic Service Generate",
    summary: "Generate a master draft from this topic.",
    keywords: ["master", "draft"],
    status: TopicStatus.IN_PROGRESS,
  });

  const response = await generateMasterDraft(topic.id, {
    voiceProfileId: "default",
    idempotencyKey: "topic-service-generate-master",
  });

  assert.equal(response.status, "QUEUED");

  await wait(250);

  const drafts = await draftRepository.listByTopicId(topic.id);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0]?.draftType, DraftType.MASTER);
});
