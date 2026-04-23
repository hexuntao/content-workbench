# Content Workbench API 文档

## 范围

本文档索引覆盖 MVP 主链路所需的 API 契约，目标是先稳定资源模型和状态变化，再进入具体实现。

## 文档列表

- [Topics API](/Users/tao/Documents/repo/content-workbench/docs/api/topics.md)
- [Drafts API](/Users/tao/Documents/repo/content-workbench/docs/api/drafts.md)
- [Review API](/Users/tao/Documents/repo/content-workbench/docs/api/review.md)
- [Publish API](/Users/tao/Documents/repo/content-workbench/docs/api/publish.md)
- [Jobs API](/Users/tao/Documents/repo/content-workbench/docs/api/jobs.md)
- [错误模型](/Users/tao/Documents/repo/content-workbench/docs/api/error-model.md)

## 统一约定

- 所有时间字段使用 ISO 8601 UTC 字符串
- 所有写接口都返回最新资源快照或异步任务信息
- 异步接口统一返回 `jobId`
- 业务错误返回稳定的 `errorCode`
- 列表接口统一支持 `cursor` 或 `page` 方案，MVP 可先用 `page`
- 认证方式暂定服务端会话或后续接入统一登录，不在本文展开

## 资源命名

- `Topic`
- `SourceItem`
- `Draft`
- `RewriteVersion`
- `ReviewTask`
- `PublishPackage`
- `PublicationRecord`
- `Job`

## 状态守卫

- 未进入 `IN_PROGRESS` 的选题不能生成母稿
- 未审核通过的稿件不能创建远端草稿
- 未生成发布包的渠道不能回填发布记录
