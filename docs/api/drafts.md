# Drafts API

## 1. 目标

Drafts API 负责母稿、改写版本、平台包装和关联素材的读取与生成动作。

## 2. 资源结构

```json
{
  "id": "drf_123",
  "topicClusterId": "clu_123",
  "draftType": "MASTER",
  "status": "REWRITTEN",
  "title": "内容标题",
  "summary": "内容摘要",
  "content": "# 正文",
  "contentFormat": "markdown",
  "version": 1,
  "currentRewriteId": "rw_123",
  "createdAt": "2026-04-23T03:00:00.000Z",
  "updatedAt": "2026-04-23T03:10:00.000Z"
}
```

## 3. 接口列表

### 3.1 获取稿件详情

`GET /api/drafts/:draftId`

返回：

- `Draft`
- 当前选中改写版本摘要
- 审核状态概览
- 渠道发布包概览

### 3.2 获取稿件改写版本

`GET /api/drafts/:draftId/rewrites`

响应示例：

```json
{
  "items": [
    {
      "id": "rw_123",
      "strategy": "AUTHOR_VOICE",
      "title": "更像作者语气的标题",
      "diffSummary": "减少模板化开头，加入个人判断",
      "score": 0.91,
      "isSelected": true,
      "createdAt": "2026-04-23T03:08:00.000Z"
    }
  ]
}
```

### 3.3 触发改写

`POST /api/drafts/:draftId/rewrites`

请求体示例：

```json
{
  "strategies": ["ORAL", "DE_AI", "AUTHOR_VOICE"],
  "voiceProfileId": "default"
}
```

响应示例：

```json
{
  "jobId": "job_456",
  "status": "QUEUED",
  "draftId": "drf_123"
}
```

业务规则：

- 只有 `MASTER` 稿件允许触发标准改写流程
- 已归档稿件不能再触发改写
- 若策略为空，返回校验错误

### 3.4 选择改写版本

`POST /api/drafts/:draftId/select-rewrite`

请求体示例：

```json
{
  "rewriteId": "rw_123"
}
```

效果：

- 更新 `currentRewriteId`
- 保证同一 `Draft` 只有一个 `RewriteVersion.isSelected = true`

### 3.5 获取稿件关联素材

`GET /api/drafts/:draftId/assets`

用途：

- 查看封面提示词
- 查看生成图片
- 查看导出物路径

### 3.6 触发平台包装

`POST /api/drafts/:draftId/package`

请求体示例：

```json
{
  "channels": ["WECHAT", "XHS", "X_ARTICLE"],
  "rewriteId": "rw_123"
}
```

响应示例：

```json
{
  "jobId": "job_789",
  "status": "QUEUED",
  "draftId": "drf_123"
}
```

业务规则：

- 没有选中版本时，可回退到原始 `Draft.content`
- 平台包装完成后，稿件状态推进到 `PACKAGED`
- 同一渠道重复触发时，默认更新当前发布包而不是创建新逻辑资源

### 3.7 获取稿件发布包概览

`GET /api/drafts/:draftId/publish-packages`

返回：

- 渠道
- 状态
- 导出路径
- 草稿链接
- 最近更新时间

## 4. 推荐错误码

- `DRAFT_NOT_FOUND`
- `DRAFT_STATUS_INVALID`
- `DRAFT_TYPE_NOT_SUPPORTED`
- `REWRITE_NOT_FOUND`
- `REWRITE_DOES_NOT_BELONG_TO_DRAFT`
- `PACKAGE_CHANNEL_DUPLICATED`

## 5. 状态守卫

- `CREATED` 可直接进入改写或包装，但建议先完成改写
- `PACKAGED` 之后才能发起正式审核
- `REJECTED` 之后若要重新送审，必须先新增版本或重新包装

## 6. 实现备注

- 平台包装最好接受显式 `rewriteId`，不要依赖前端隐式选择
- `contentFormat` MVP 阶段允许 `markdown`、`html`
- 生成标题、摘要、关键词可作为 Draft 的派生字段，不必另建实体
