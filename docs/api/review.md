# Review API

## 1. 目标

Review API 负责审核队列、审核任务详情、通过/退回决策，以及重新提交审核。

## 2. 资源结构

```json
{
  "id": "rev_123",
  "draftId": "drf_123",
  "reviewerEmail": "editor@example.com",
  "status": "PENDING",
  "checklist": {
    "factsChecked": true,
    "voiceConsistent": false,
    "channelReady": true
  },
  "comments": "第二段仍然偏模板化。",
  "decidedAt": null,
  "createdAt": "2026-04-23T05:00:00.000Z",
  "updatedAt": "2026-04-23T05:10:00.000Z"
}
```

## 3. 接口列表

### 3.1 获取审核队列

`GET /api/review/tasks`

查询参数：

- `status`
- `reviewerEmail`
- `page`
- `pageSize`

### 3.2 创建审核任务

`POST /api/review/tasks`

请求体示例：

```json
{
  "draftId": "drf_123",
  "reviewerEmail": "editor@example.com"
}
```

业务规则：

- 只有 `PACKAGED` 稿件可以创建审核任务
- 创建任务后，稿件状态进入 `IN_REVIEW`
- 同一稿件同一时刻只能有一个 `PENDING` 审核任务

### 3.3 获取审核任务详情

`GET /api/review/tasks/:reviewTaskId`

返回：

- 审核任务
- 稿件信息
- 当前选中版本
- 关联发布包摘要

### 3.4 审核通过

`POST /api/review/tasks/:reviewTaskId/approve`

请求体示例：

```json
{
  "comments": "可以进入发布准备。",
  "checklist": {
    "factsChecked": true,
    "voiceConsistent": true,
    "channelReady": true
  }
}
```

效果：

- `ReviewTask.status -> APPROVED`
- `Draft.status -> APPROVED`

### 3.5 退回修改

`POST /api/review/tasks/:reviewTaskId/request-changes`

请求体示例：

```json
{
  "comments": "需要补充事实依据并重写开头。",
  "checklist": {
    "factsChecked": false,
    "voiceConsistent": false,
    "channelReady": false
  }
}
```

效果：

- `ReviewTask.status -> CHANGES_REQUESTED`
- `Draft.status -> REJECTED`

### 3.6 重新提交审核

`POST /api/review/tasks/:reviewTaskId/resubmit`

请求体示例：

```json
{
  "draftId": "drf_123",
  "newRewriteId": "rw_456"
}
```

处理原则：

- MVP 推荐创建新的 `ReviewTask`
- 原任务保留历史，不直接覆写

## 4. 推荐错误码

- `REVIEW_TASK_NOT_FOUND`
- `REVIEW_TASK_ALREADY_DECIDED`
- `REVIEW_TASK_STATUS_INVALID`
- `DRAFT_NOT_READY_FOR_REVIEW`
- `DRAFT_REVIEW_GATE_VIOLATION`

## 5. 审核门禁

- 没有审核通过的稿件不能进入远端草稿创建
- 审核通过之后若内容再次被修改，必须显式重新送审
- 审核动作必须记录操作者和时间，不能只有布尔字段

## 6. 审核建议清单

MVP 阶段建议先固定这几项：

- 事实是否可信
- 观点是否清晰
- 是否符合作者语气
- 是否符合目标渠道格式
- 是否存在明显 AI 套话

## 7. 实现备注

- `checklist` 先存 `Json`，后续再拆结构化字段
- 审核队列默认按 `createdAt ASC`
- 允许 reviewer 为空，表示“待领取”
