# Jobs API

## 1. 目标

Jobs API 为所有异步流程提供统一的任务模型，让 Topics、Drafts、Review、Publish、Workflows 可以共享同一套状态查询和失败展示方式。

## 2. 适用范围

以下动作统一走 job：

- 热点采集
- 聚类与打分
- 母稿生成
- 改写
- 平台包装
- 素材生成
- 导出发布包
- 创建远端草稿

## 3. 资源结构

```json
{
  "id": "job_123",
  "type": "GENERATE_MASTER_DRAFT",
  "status": "RUNNING",
  "entityType": "DRAFT",
  "entityId": "drf_123",
  "idempotencyKey": "topic-clu_123-master-v1",
  "triggeredBy": "user@example.com",
  "input": {},
  "output": null,
  "errorCode": null,
  "errorMessage": null,
  "startedAt": "2026-04-23T03:00:00.000Z",
  "finishedAt": null,
  "createdAt": "2026-04-23T02:59:59.000Z",
  "updatedAt": "2026-04-23T03:00:01.000Z"
}
```

## 4. Job 类型

- `INGEST_SOURCE`
- `CLUSTER_TOPICS`
- `GENERATE_MASTER_DRAFT`
- `REWRITE_DRAFT`
- `PACKAGE_DRAFT`
- `GENERATE_ASSETS`
- `EXPORT_PUBLISH_PACKAGE`
- `CREATE_REMOTE_DRAFT`

## 5. Job 状态

- `QUEUED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `CANCELED`

状态机定义以 [领域状态机](/Users/tao/Documents/repo/content-workbench/docs/architecture/state-machines.md) 为准。

## 6. 接口列表

### 6.1 获取任务详情

`GET /api/jobs/:jobId`

用途：

- 详情页轮询
- 展示失败原因
- 查看输入输出摘要

### 6.2 按实体查询任务

`GET /api/jobs`

查询参数：

- `entityType`
- `entityId`
- `type`
- `status`
- `page`
- `pageSize`

### 6.3 重试任务

`POST /api/jobs/:jobId/retry`

业务规则：

- 只有 `FAILED` 任务允许重试
- 重试应创建新执行轮次或新 job 记录，不能覆盖原始失败审计

响应示例：

```json
{
  "jobId": "job_456",
  "status": "QUEUED",
  "retriesJobId": "job_123"
}
```

### 6.4 取消任务

`POST /api/jobs/:jobId/cancel`

业务规则：

- 仅允许 `QUEUED` 或可中断 `RUNNING` 任务取消
- 取消必须显式记录原因

## 7. 统一异步响应

所有触发异步动作的 API 都返回统一结构：

```json
{
  "jobId": "job_123",
  "status": "QUEUED"
}
```

可选附加字段：

- `entityType`
- `entityId`
- `idempotencyKey`

## 8. 幂等规则

- 用户触发类 job 应支持 `idempotencyKey`
- 相同幂等键在未完成前，返回已有活动 job
- 是否复用已成功 job，按具体动作决定，但必须显式

## 9. 前端消费建议

- 列表页只展示最近任务摘要
- 详情页按 `jobId` 轮询
- `FAILED` 时展示 `errorCode` + 简短说明，不展示内部堆栈
- 长流程页面应展示最后更新时间和最近步骤

## 10. 推荐错误码

- `JOB_NOT_FOUND`
- `JOB_STATUS_INVALID`
- `JOB_RETRY_NOT_ALLOWED`
- `JOB_CANCEL_NOT_ALLOWED`
- `JOB_IDEMPOTENCY_CONFLICT`
