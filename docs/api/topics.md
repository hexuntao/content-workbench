# Topics API

## 1. 目标

Topics API 负责选题池浏览、筛选、状态流转，以及从选题触发母稿生成。

## 2. 资源结构

```json
{
  "id": "clu_123",
  "title": "DeepSeek 新版本的生态影响",
  "summary": "多个来源都在讨论模型能力和价格变化。",
  "keywords": ["DeepSeek", "模型", "定价"],
  "theme": "AI 工具",
  "trendScore": 0.82,
  "relevanceScore": 0.74,
  "editorialScore": 0.88,
  "totalScore": 0.81,
  "recommendedAngle": "从内容生产效率而不是参数对比切入",
  "status": "SHORTLISTED",
  "sourceItemCount": 6,
  "createdAt": "2026-04-23T01:00:00.000Z",
  "updatedAt": "2026-04-23T02:00:00.000Z"
}
```

## 3. 接口列表

### 3.1 获取选题列表

`GET /api/topics`

查询参数：

- `status`
- `theme`
- `keyword`
- `page`
- `pageSize`
- `sortBy`

响应示例：

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

### 3.2 获取选题详情

`GET /api/topics/:topicId`

返回：

- 选题主信息
- 评分明细
- 来源数量
- 当前关联稿件摘要

### 3.3 获取选题关联素材

`GET /api/topics/:topicId/source-items`

用途：

- 在 Draft 生成前查看原始素材
- 审核时回看来源上下文

响应示例：

```json
{
  "items": [
    {
      "id": "src_123",
      "title": "原始文章标题",
      "url": "https://example.com/post",
      "author": "作者名",
      "publishedAt": "2026-04-23T00:00:00.000Z",
      "summary": "摘要",
      "rank": 1,
      "reason": "信息密度最高"
    }
  ]
}
```

### 3.4 收藏选题

`POST /api/topics/:topicId/shortlist`

效果：

- `NEW -> SHORTLISTED`

响应示例：

```json
{
  "id": "clu_123",
  "status": "SHORTLISTED"
}
```

### 3.5 忽略选题

`POST /api/topics/:topicId/ignore`

效果：

- `NEW/SHORTLISTED -> IGNORED`

请求体示例：

```json
{
  "reason": "与本周选题重复"
}
```

### 3.6 开始写作

`POST /api/topics/:topicId/start`

效果：

- `NEW/SHORTLISTED -> IN_PROGRESS`

业务规则：

- 已归档选题不能再开始写作
- 同一选题已存在活跃主稿时，接口返回冲突错误

### 3.7 从选题生成母稿

`POST /api/topics/:topicId/generate-master-draft`

请求体示例：

```json
{
  "voiceProfileId": "default",
  "idempotencyKey": "topic-clu_123-master-v1"
}
```

响应示例：

```json
{
  "jobId": "job_123",
  "status": "QUEUED",
  "topicId": "clu_123"
}
```

业务规则：

- 只有 `IN_PROGRESS` 选题可以调用
- 调用成功不代表 Draft 已完成，只代表工作流已入队
- 若检测到相同幂等键，返回已有任务信息

## 4. 业务错误

- `TOPIC_NOT_FOUND`
- `TOPIC_STATUS_INVALID`
- `TOPIC_ALREADY_HAS_ACTIVE_MASTER_DRAFT`
- `TOPIC_ALREADY_IGNORED`
- `IDEMPOTENT_REQUEST_REPLAYED`

## 5. 状态守卫

- `IGNORED` 选题不能直接生成母稿
- `ARCHIVED` 选题只能查看，不能再触发写操作
- 开始写作不是可选装饰动作，而是进入主链路的显式门槛

## 6. 实现备注

- 列表页优先按 `totalScore DESC, updatedAt DESC` 排序
- 评分明细建议先存在 `metadata`，MVP 不强制拆字段
- 后续若引入向量召回，保留 `GET /api/topics/recommendations` 扩展位
