# 内容运营工作台 MVP

## 数据模型与 Prisma Schema 草案

### 1. 设计目标

MVP 的数据模型只服务一条主链路：

`热点采集 -> 选题聚类 -> 内容生成 -> 改写 -> 平台包装 -> 审核 -> 发布准备 -> 回填记录`

设计原则：

- 先支持单工作区、单创作者或小团队
- 所有状态可追踪、可回溯
- 保留原始内容，不覆盖历史版本
- 数据结构优先服务工作流，不提前抽象成复杂 CMS

### 2. 核心实体

#### 2.1 Source

采集源配置，例如 RSS、X、网页、公众号搜索配置。

关键用途：

- 定时任务知道去哪里抓
- 不同源使用不同采集器
- 支持启停、优先级、分类

#### 2.2 SourceItem

一次采集到的原始内容项，是全系统最底层事实记录。

关键用途：

- 保存原始标题、链接、摘要、正文、作者、发布时间
- 用于去重、聚类、回溯
- 后续所有选题都能回链到原始素材

#### 2.3 TopicCluster

多个相近 SourceItem 聚成一个可写选题。

关键用途：

- 给编辑展示“今天值得写什么”
- 保存热度、相关性、可写性打分
- 支持收藏、忽略、开始写作

#### 2.4 Draft

草稿主表。母稿、平台稿都统一放在 Draft，只用 `draftType` 区分。

关键用途：

- 管理内容生命周期
- 支持一个选题产生多种稿件
- 保持统一状态流转

#### 2.5 RewriteVersion

改写版本表，用于存储口语化改写、去 AI 味、作者风格版。

关键用途：

- 不覆盖原稿
- 支持版本对比
- 支持审核时回看不同策略效果

#### 2.6 Asset

图片、封面、卡片提示词、导出包都归为资产。

关键用途：

- 统一管理文件路径和元信息
- 让草稿和发布包都能引用同一套素材

#### 2.7 ReviewTask

审核任务表，是人工审核节点的核心。

关键用途：

- 保存审核状态、审核人、审核意见
- 支持退回、通过、再次提交

#### 2.8 PublishPackage

每个渠道一份发布准备包。

关键用途：

- 保存公众号/小红书/X 的最终发布材料
- 记录是否已生成草稿或导出文件

#### 2.9 PublicationRecord

人工发布后的最终记录。

关键用途：

- 回填平台链接
- 记录发布时间
- 给后续复盘和归档用

### 3. 状态设计

#### 3.1 TopicCluster.status

- `NEW`
- `SHORTLISTED`
- `IGNORED`
- `IN_PROGRESS`
- `ARCHIVED`

#### 3.2 Draft.status

- `CREATED`
- `REWRITTEN`
- `PACKAGED`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `READY_TO_PUBLISH`
- `ARCHIVED`

#### 3.3 ReviewTask.status

- `PENDING`
- `CHANGES_REQUESTED`
- `APPROVED`

#### 3.4 PublishPackage.status

- `PENDING`
- `EXPORTED`
- `DRAFT_CREATED`
- `PUBLISHED`
- `FAILED`

### 4. 表关系

- `Source` 1 对多 `SourceItem`
- `TopicCluster` 多对多 `SourceItem`
- `TopicCluster` 1 对多 `Draft`
- `Draft` 1 对多 `RewriteVersion`
- `Draft` 1 对多 `Asset`
- `Draft` 1 对多 `ReviewTask`
- `Draft` 1 对多 `PublishPackage`
- `PublishPackage` 1 对 0/1 `PublicationRecord`

### 5. Prisma Schema 草案

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SourceType {
  RSS
  X
  WEB
  WECHAT
  WEIBO
  V2EX
  REDDIT
  MANUAL
}

enum SourceStatus {
  ACTIVE
  PAUSED
  ERROR
}

enum TopicStatus {
  NEW
  SHORTLISTED
  IGNORED
  IN_PROGRESS
  ARCHIVED
}

enum DraftType {
  MASTER
  WECHAT
  XHS
  X_ARTICLE
}

enum DraftStatus {
  CREATED
  REWRITTEN
  PACKAGED
  IN_REVIEW
  APPROVED
  REJECTED
  READY_TO_PUBLISH
  ARCHIVED
}

enum RewriteStrategy {
  ORAL
  DE_AI
  AUTHOR_VOICE
  MIXED
}

enum ReviewStatus {
  PENDING
  CHANGES_REQUESTED
  APPROVED
}

enum AssetType {
  COVER_IMAGE
  CARD_IMAGE
  IMAGE_PROMPT
  ATTACHMENT
  EXPORT_BUNDLE
}

enum ChannelType {
  WECHAT
  XHS
  X_ARTICLE
}

enum PublishStatus {
  PENDING
  EXPORTED
  DRAFT_CREATED
  PUBLISHED
  FAILED
}

model Source {
  id          String       @id @default(cuid())
  name        String
  type        SourceType
  status      SourceStatus @default(ACTIVE)
  config      Json
  priority    Int          @default(0)
  lastRunAt   DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  items       SourceItem[]

  @@index([type, status])
}

model SourceItem {
  id                String      @id @default(cuid())
  sourceId          String
  sourceExternalId  String?
  title             String
  url               String
  author            String?
  publishedAt       DateTime?
  fetchedAt         DateTime    @default(now())
  rawContent        String?
  normalizedContent String?
  summary           String?
  language          String?     @default("zh-CN")
  engagementScore   Float?      @default(0)
  dedupeHash        String
  metadata          Json?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  source            Source      @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  topicLinks        TopicClusterSourceItem[]

  @@unique([sourceId, url])
  @@index([publishedAt])
  @@index([dedupeHash])
}

model TopicCluster {
  id               String      @id @default(cuid())
  title            String
  summary          String?
  keywords         String[]
  theme            String?
  trendScore       Float       @default(0)
  relevanceScore   Float       @default(0)
  editorialScore   Float       @default(0)
  totalScore       Float       @default(0)
  recommendedAngle String?
  status           TopicStatus @default(NEW)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  sourceLinks      TopicClusterSourceItem[]
  drafts           Draft[]

  @@index([status, totalScore])
}

model TopicClusterSourceItem {
  topicClusterId String
  sourceItemId   String
  rank           Int       @default(0)
  reason         String?

  topicCluster   TopicCluster @relation(fields: [topicClusterId], references: [id], onDelete: Cascade)
  sourceItem     SourceItem   @relation(fields: [sourceItemId], references: [id], onDelete: Cascade)

  @@id([topicClusterId, sourceItemId])
  @@index([sourceItemId])
}

model Draft {
  id                 String       @id @default(cuid())
  topicClusterId     String
  draftType          DraftType
  status             DraftStatus  @default(CREATED)
  title              String
  summary            String?
  content            String
  contentFormat      String       @default("markdown")
  version            Int          @default(1)
  currentRewriteId   String?
  metadata           Json?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  topicCluster       TopicCluster @relation(fields: [topicClusterId], references: [id], onDelete: Cascade)
  rewrites           RewriteVersion[]
  assets             Asset[]
  reviews            ReviewTask[]
  publishPackages    PublishPackage[]

  @@index([topicClusterId, draftType])
  @@index([status])
}

model RewriteVersion {
  id              String          @id @default(cuid())
  draftId         String
  strategy        RewriteStrategy
  title           String?
  content         String
  diffSummary     String?
  score           Float?
  isSelected      Boolean         @default(false)
  metadata        Json?
  createdAt       DateTime        @default(now())

  draft           Draft           @relation(fields: [draftId], references: [id], onDelete: Cascade)

  @@index([draftId, strategy])
}

model Asset {
  id              String      @id @default(cuid())
  draftId         String
  type            AssetType
  path            String
  mimeType        String?
  fileSize        Int?
  promptText      String?
  metadata        Json?
  createdAt       DateTime    @default(now())

  draft           Draft       @relation(fields: [draftId], references: [id], onDelete: Cascade)

  @@index([draftId, type])
}

model ReviewTask {
  id              String       @id @default(cuid())
  draftId         String
  reviewerEmail   String?
  status          ReviewStatus @default(PENDING)
  checklist       Json?
  comments        String?
  decidedAt       DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  draft           Draft        @relation(fields: [draftId], references: [id], onDelete: Cascade)

  @@index([draftId, status])
}

model PublishPackage {
  id              String        @id @default(cuid())
  draftId         String
  channel         ChannelType
  status          PublishStatus @default(PENDING)
  title           String?
  summary         String?
  content         String?
  exportPath      String?
  draftUrl        String?
  metadata        Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  draft           Draft         @relation(fields: [draftId], references: [id], onDelete: Cascade)
  publication     PublicationRecord?

  @@unique([draftId, channel])
  @@index([status, channel])
}

model PublicationRecord {
  id                String         @id @default(cuid())
  publishPackageId  String         @unique
  channel           ChannelType
  publishedUrl      String?
  publishedAt       DateTime?
  notes             String?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  publishPackage    PublishPackage @relation(fields: [publishPackageId], references: [id], onDelete: Cascade)
}
```

### 6. 第一阶段建议补充但不立刻落表的内容

先不急着做：

- 多组织与多工作区
- 复杂 RBAC 权限
- 评论协作线程
- 向量表单独拆库
- 成本计费与模型调用明细

这些在 MVP 之后再加更合理。

### 7. MVP 查询场景

你后面最常用的查询大概是：

- 查今天推荐的选题
- 查某个选题的所有原始素材
- 查某篇母稿的所有改写版本
- 查某篇稿件是否审核通过
- 查某个渠道的发布包是否已生成
- 查哪些内容还没回填发布链接

所以当前索引设计已经优先覆盖这些场景。

### 8. 工程建议

- `content` 仍以 `String` 先存 PostgreSQL，MVP 足够
- embedding 建议第二阶段再接 `pgvector`
- `metadata/config/checklist` 这类先用 `Json`，避免过早拆碎
- 不要让 `TopicCluster` 直接承载太多编辑动作，编辑动作应发生在 `Draft`

