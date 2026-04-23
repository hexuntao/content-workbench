-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('RSS', 'X', 'WEB', 'WECHAT', 'WEIBO', 'V2EX', 'REDDIT', 'MANUAL');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('NEW', 'SHORTLISTED', 'IGNORED', 'IN_PROGRESS', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DraftType" AS ENUM ('MASTER', 'WECHAT', 'XHS', 'X_ARTICLE');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('CREATED', 'REWRITTEN', 'PACKAGED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'READY_TO_PUBLISH', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RewriteStrategy" AS ENUM ('ORAL', 'DE_AI', 'AUTHOR_VOICE', 'MIXED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'CHANGES_REQUESTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('COVER_IMAGE', 'CARD_IMAGE', 'IMAGE_PROMPT', 'ATTACHMENT', 'EXPORT_BUNDLE');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('WECHAT', 'XHS', 'X_ARTICLE');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'EXPORTED', 'DRAFT_CREATED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('INGEST_SOURCE', 'CLUSTER_TOPICS', 'GENERATE_MASTER_DRAFT', 'REWRITE_DRAFT', 'PACKAGE_DRAFT', 'GENERATE_ASSETS', 'EXPORT_PUBLISH_PACKAGE', 'CREATE_REMOTE_DRAFT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "JobEntityType" AS ENUM ('SOURCE', 'TOPIC_CLUSTER', 'DRAFT', 'REVIEW_TASK', 'PUBLISH_PACKAGE');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceItem" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceExternalId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawContent" TEXT,
    "normalizedContent" TEXT,
    "summary" TEXT,
    "language" TEXT DEFAULT 'zh-CN',
    "engagementScore" DOUBLE PRECISION DEFAULT 0,
    "dedupeHash" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicCluster" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "keywords" TEXT[],
    "theme" TEXT,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "editorialScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedAngle" TEXT,
    "status" "TopicStatus" NOT NULL DEFAULT 'NEW',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicClusterSourceItem" (
    "topicClusterId" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,

    CONSTRAINT "TopicClusterSourceItem_pkey" PRIMARY KEY ("topicClusterId","sourceItemId")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "topicClusterId" TEXT NOT NULL,
    "draftType" "DraftType" NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'CREATED',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "contentFormat" TEXT NOT NULL DEFAULT 'markdown',
    "version" INTEGER NOT NULL DEFAULT 1,
    "currentRewriteId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewriteVersion" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "strategy" "RewriteStrategy" NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "diffSummary" TEXT,
    "score" DOUBLE PRECISION,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewriteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "promptText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTask" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "reviewerEmail" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "checklist" JSONB,
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishPackage" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "summary" TEXT,
    "content" TEXT,
    "contentFormat" TEXT,
    "exportPath" TEXT,
    "draftUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationRecord" (
    "id" TEXT NOT NULL,
    "publishPackageId" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "publishedUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "entityType" "JobEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "topicClusterId" TEXT,
    "draftId" TEXT,
    "reviewTaskId" TEXT,
    "publishPackageId" TEXT,
    "idempotencyKey" TEXT,
    "triggeredBy" TEXT,
    "input" JSONB,
    "output" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "retriesJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Source_type_status_idx" ON "Source"("type", "status");

-- CreateIndex
CREATE INDEX "Source_status_priority_idx" ON "Source"("status", "priority");

-- CreateIndex
CREATE INDEX "SourceItem_publishedAt_idx" ON "SourceItem"("publishedAt");

-- CreateIndex
CREATE INDEX "SourceItem_dedupeHash_idx" ON "SourceItem"("dedupeHash");

-- CreateIndex
CREATE UNIQUE INDEX "SourceItem_sourceId_url_key" ON "SourceItem"("sourceId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "SourceItem_sourceId_sourceExternalId_key" ON "SourceItem"("sourceId", "sourceExternalId");

-- CreateIndex
CREATE INDEX "TopicCluster_status_totalScore_updatedAt_idx" ON "TopicCluster"("status", "totalScore", "updatedAt");

-- CreateIndex
CREATE INDEX "TopicCluster_theme_status_idx" ON "TopicCluster"("theme", "status");

-- CreateIndex
CREATE INDEX "TopicClusterSourceItem_sourceItemId_idx" ON "TopicClusterSourceItem"("sourceItemId");

-- CreateIndex
CREATE INDEX "TopicClusterSourceItem_topicClusterId_rank_idx" ON "TopicClusterSourceItem"("topicClusterId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Draft_currentRewriteId_key" ON "Draft"("currentRewriteId");

-- CreateIndex
CREATE INDEX "Draft_topicClusterId_draftType_idx" ON "Draft"("topicClusterId", "draftType");

-- CreateIndex
CREATE INDEX "Draft_status_updatedAt_idx" ON "Draft"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "RewriteVersion_draftId_strategy_idx" ON "RewriteVersion"("draftId", "strategy");

-- CreateIndex
CREATE INDEX "RewriteVersion_draftId_createdAt_idx" ON "RewriteVersion"("draftId", "createdAt");

-- CreateIndex
CREATE INDEX "Asset_draftId_type_idx" ON "Asset"("draftId", "type");

-- CreateIndex
CREATE INDEX "ReviewTask_draftId_status_idx" ON "ReviewTask"("draftId", "status");

-- CreateIndex
CREATE INDEX "ReviewTask_status_createdAt_idx" ON "ReviewTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewTask_reviewerEmail_status_idx" ON "ReviewTask"("reviewerEmail", "status");

-- CreateIndex
CREATE INDEX "PublishPackage_status_channel_idx" ON "PublishPackage"("status", "channel");

-- CreateIndex
CREATE INDEX "PublishPackage_draftId_status_idx" ON "PublishPackage"("draftId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PublishPackage_draftId_channel_key" ON "PublishPackage"("draftId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationRecord_publishPackageId_key" ON "PublicationRecord"("publishPackageId");

-- CreateIndex
CREATE INDEX "Job_entityType_entityId_createdAt_idx" ON "Job"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "Job_type_status_createdAt_idx" ON "Job"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_idempotencyKey_idx" ON "Job"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "SourceItem" ADD CONSTRAINT "SourceItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicClusterSourceItem" ADD CONSTRAINT "TopicClusterSourceItem_topicClusterId_fkey" FOREIGN KEY ("topicClusterId") REFERENCES "TopicCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicClusterSourceItem" ADD CONSTRAINT "TopicClusterSourceItem_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_topicClusterId_fkey" FOREIGN KEY ("topicClusterId") REFERENCES "TopicCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_currentRewriteId_fkey" FOREIGN KEY ("currentRewriteId") REFERENCES "RewriteVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewriteVersion" ADD CONSTRAINT "RewriteVersion_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishPackage" ADD CONSTRAINT "PublishPackage_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationRecord" ADD CONSTRAINT "PublicationRecord_publishPackageId_fkey" FOREIGN KEY ("publishPackageId") REFERENCES "PublishPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_topicClusterId_fkey" FOREIGN KEY ("topicClusterId") REFERENCES "TopicCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_reviewTaskId_fkey" FOREIGN KEY ("reviewTaskId") REFERENCES "ReviewTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_publishPackageId_fkey" FOREIGN KEY ("publishPackageId") REFERENCES "PublishPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_retriesJobId_fkey" FOREIGN KEY ("retriesJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
