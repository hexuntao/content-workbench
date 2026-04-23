# 领域状态机

## 1. 目标

本文档把 MVP 的共享状态流转规则写成显式状态机，供 API、页面、workflow、repository 共用。

如果没有这份文档，不同 thread 很容易对同一状态做出不同解释。

## 2. 总原则

- 状态跳转只能通过 domain use case 完成
- workflow 可以触发状态变化，但不能绕过状态守卫
- 页面只负责展示可执行动作，不直接定义规则
- 所有非法跳转都必须返回稳定错误码

## 3. TopicCluster 状态机

### 状态

- `NEW`
- `SHORTLISTED`
- `IGNORED`
- `IN_PROGRESS`
- `ARCHIVED`

### 触发事件

- `shortlistTopic`
- `ignoreTopic`
- `startTopic`
- `archiveTopic`

### 转移表

| Current | Event | Next | Notes |
|---|---|---|---|
| `NEW` | `shortlistTopic` | `SHORTLISTED` | 编辑加入候选 |
| `NEW` | `ignoreTopic` | `IGNORED` | 忽略 |
| `NEW` | `startTopic` | `IN_PROGRESS` | 进入主链路 |
| `SHORTLISTED` | `ignoreTopic` | `IGNORED` | 可取消候选 |
| `SHORTLISTED` | `startTopic` | `IN_PROGRESS` | 开始写作 |
| `NEW` / `SHORTLISTED` / `IGNORED` / `IN_PROGRESS` | `archiveTopic` | `ARCHIVED` | 归档 |

### 守卫

- `IN_PROGRESS` 选题才能生成母稿
- 已归档选题只读
- 同一选题存在活跃主稿时，不允许再次 `startTopic`

## 4. Draft 状态机

### 状态

- `CREATED`
- `REWRITTEN`
- `PACKAGED`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `READY_TO_PUBLISH`
- `ARCHIVED`

### 触发事件

- `createDraft`
- `completeRewrite`
- `completePackaging`
- `submitForReview`
- `approveDraft`
- `rejectDraft`
- `markReadyToPublish`
- `archiveDraft`

### 转移表

| Current | Event | Next | Notes |
|---|---|---|---|
| none | `createDraft` | `CREATED` | 新建母稿或平台稿 |
| `CREATED` | `completeRewrite` | `REWRITTEN` | 至少一个改写版本完成 |
| `CREATED` / `REWRITTEN` | `completePackaging` | `PACKAGED` | 至少一个渠道发布包准备完成 |
| `PACKAGED` | `submitForReview` | `IN_REVIEW` | 创建审核任务 |
| `IN_REVIEW` | `approveDraft` | `APPROVED` | 审核通过 |
| `IN_REVIEW` | `rejectDraft` | `REJECTED` | 要求修改 |
| `APPROVED` | `markReadyToPublish` | `READY_TO_PUBLISH` | 审核后发布前状态 |
| any non-archived | `archiveDraft` | `ARCHIVED` | 归档 |

### 守卫

- 没有内容主体时不能进入 `CREATED`
- 没有可用发布包时不能进入 `PACKAGED`
- 没有 `PENDING` 审核任务时不能进入 `IN_REVIEW`
- 被 `REJECTED` 后，必须有新的改写或包装动作，才能再次送审
- 未 `APPROVED` 不得创建远端草稿

## 5. ReviewTask 状态机

### 状态

- `PENDING`
- `CHANGES_REQUESTED`
- `APPROVED`

### 触发事件

- `createReviewTask`
- `requestChanges`
- `approveReviewTask`
- `resubmitReview`

### 转移表

| Current | Event | Next | Notes |
|---|---|---|---|
| none | `createReviewTask` | `PENDING` | 进入审核队列 |
| `PENDING` | `requestChanges` | `CHANGES_REQUESTED` | 退回 |
| `PENDING` | `approveReviewTask` | `APPROVED` | 通过 |
| `CHANGES_REQUESTED` | `resubmitReview` | new `PENDING` task | 建议创建新任务，不覆写旧任务 |

### 守卫

- 一个 draft 同时只能有一个活跃 `PENDING` 任务
- 已决议任务不可再次通过或退回
- 重新提交审核应新建任务，保留历史链路

## 6. PublishPackage 状态机

### 状态

- `PENDING`
- `EXPORTED`
- `DRAFT_CREATED`
- `PUBLISHED`
- `FAILED`

### 触发事件

- `createPublishPackage`
- `exportPublishPackage`
- `createRemoteDraft`
- `markPublished`
- `failPublishPackage`
- `retryPublishPackage`

### 转移表

| Current | Event | Next | Notes |
|---|---|---|---|
| none | `createPublishPackage` | `PENDING` | 平台包装完成后建立 |
| `PENDING` / `FAILED` | `exportPublishPackage` | `EXPORTED` | 导出成功 |
| `PENDING` / `EXPORTED` / `FAILED` | `createRemoteDraft` | `DRAFT_CREATED` | 渠道支持时可用 |
| `EXPORTED` / `DRAFT_CREATED` | `markPublished` | `PUBLISHED` | 人工发布后回填 |
| any non-published | `failPublishPackage` | `FAILED` | 外部失败 |
| `FAILED` | `retryPublishPackage` | `PENDING` | 重新进入处理 |

### 守卫

- 未审核通过不能执行 `createRemoteDraft`
- 未有有效导出物时不能标记已发布
- `PUBLISHED` 后不允许静默覆盖 `publishedAt`

## 7. Job 状态机

### 状态

- `QUEUED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `CANCELED`

### 触发事件

- `queueJob`
- `startJob`
- `completeJob`
- `failJob`
- `cancelJob`
- `retryJob`

### 转移表

| Current | Event | Next |
|---|---|---|
| none | `queueJob` | `QUEUED` |
| `QUEUED` | `startJob` | `RUNNING` |
| `RUNNING` | `completeJob` | `SUCCEEDED` |
| `RUNNING` | `failJob` | `FAILED` |
| `QUEUED` / `RUNNING` | `cancelJob` | `CANCELED` |
| `FAILED` | `retryJob` | `QUEUED` |

## 8. 状态机实现建议

- 每个聚合根只暴露有限的 domain action
- route handler 不直接 set status
- workflow 每次完成步骤后调用 domain action 落状态
- 前端展示动作按钮时，依赖服务端返回的能力字段，而不是自行猜测

## 9. 推荐错误码映射

- `TOPIC_STATUS_INVALID`
- `DRAFT_STATUS_INVALID`
- `REVIEW_TASK_STATUS_INVALID`
- `PUBLISH_PACKAGE_STATUS_INVALID`
- `JOB_STATUS_INVALID`
- `REVIEW_REQUIRED_BEFORE_PUBLISH`

## 10. 状态机测试要求

- 每个合法跳转至少一条测试
- 每个非法跳转至少一条测试
- 每个关键门禁至少一条测试
- workflow 测试要验证成功和失败都会落到正确状态
