# Publish API

## 1. 目标

Publish API 负责发布包导出、远端草稿创建，以及人工发布后的记录回填。

## 2. 资源结构

```json
{
  "id": "pkg_123",
  "draftId": "drf_123",
  "channel": "WECHAT",
  "status": "EXPORTED",
  "title": "公众号标题",
  "summary": "公众号摘要",
  "content": "<h1>HTML</h1>",
  "exportPath": "exports/wechat/pkg_123/",
  "draftUrl": null,
  "createdAt": "2026-04-23T06:00:00.000Z",
  "updatedAt": "2026-04-23T06:05:00.000Z"
}
```

## 3. 接口列表

### 3.1 获取发布包列表

`GET /api/publish/packages`

查询参数：

- `status`
- `channel`
- `draftId`
- `page`
- `pageSize`

### 3.2 获取发布包详情

`GET /api/publish/packages/:publishPackageId`

返回：

- 发布包内容
- 关联素材
- 导出路径
- 远端草稿链接
- 最终发布记录

### 3.3 导出发布包

`POST /api/publish/packages/:publishPackageId/export`

响应示例：

```json
{
  "jobId": "job_export_123",
  "status": "QUEUED",
  "publishPackageId": "pkg_123"
}
```

效果：

- 工作流生成 Markdown、HTML、图片清单等产物
- 成功后 `PublishPackage.status -> EXPORTED`

### 3.4 创建远端草稿

`POST /api/publish/packages/:publishPackageId/create-remote-draft`

请求体示例：

```json
{
  "channelAccountId": "default"
}
```

业务规则：

- 只有审核通过的稿件可调用
- 只有支持草稿接入的渠道可调用
- 若渠道未实现草稿能力，返回显式错误，不做静默忽略

成功后：

- 写入 `draftUrl`
- `PublishPackage.status -> DRAFT_CREATED`

### 3.5 回填最终发布记录

`POST /api/publish/packages/:publishPackageId/mark-published`

请求体示例：

```json
{
  "publishedUrl": "https://example.com/published-post",
  "publishedAt": "2026-04-23T07:00:00.000Z",
  "notes": "手动从公众号后台发布"
}
```

效果：

- 创建或更新 `PublicationRecord`
- `PublishPackage.status -> PUBLISHED`
- 相关稿件可同步进入已完成视图

## 4. 推荐错误码

- `PUBLISH_PACKAGE_NOT_FOUND`
- `PUBLISH_PACKAGE_STATUS_INVALID`
- `PUBLISH_REVIEW_REQUIRED`
- `CHANNEL_DRAFT_NOT_SUPPORTED`
- `REMOTE_DRAFT_CREATION_FAILED`
- `PUBLICATION_RECORD_INVALID`

## 5. 渠道行为约束

### WECHAT

- 允许导出 `Markdown` 和 `HTML`
- 允许接入草稿创建能力

### XHS

- 优先导出文案和图片清单
- MVP 不强依赖远端草稿能力

### X_ARTICLE

- 允许导出 Markdown
- 允许接入远端草稿能力

## 6. 状态守卫

- `FAILED` 状态允许重试导出或重新创建草稿
- `PUBLISHED` 后仍允许补充 `notes`，但不能覆盖历史 `publishedAt` 而不记录原因
- `mark-published` 不是审核替代动作，只能发生在发布阶段

## 7. 实现备注

- 导出动作应把产物路径稳定写回数据库，避免前端自行拼路径
- 若远端草稿重复创建，需要以幂等方式返回已有 `draftUrl`
- 未来若需要保留历史发布包版本，可在 `PublishPackage` 上增加 `version`
