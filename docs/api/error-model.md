# API 错误模型

## 1. 目标

本文档定义所有 API 的统一错误响应格式，避免不同 thread 返回不同风格的错误结构。

## 2. 响应结构

```json
{
  "error": {
    "code": "DRAFT_STATUS_INVALID",
    "message": "Draft is not in a valid state for this action.",
    "details": {
      "draftId": "drf_123",
      "currentStatus": "CREATED",
      "expectedStatus": "PACKAGED"
    },
    "requestId": "req_123"
  }
}
```

## 3. 字段约束

- `code`
  稳定、机器可读，用于前端分支判断
- `message`
  面向人类的简短描述
- `details`
  可选，用于定位上下文
- `requestId`
  用于日志关联

## 4. 设计原则

- 错误码稳定，message 可调整
- 前端逻辑依赖 `code`，不要依赖 message
- 未知错误统一映射，不直接暴露内部异常
- 验证错误和业务错误分开

## 5. 错误类别

### 5.1 Validation

- `VALIDATION_ERROR`
- `INVALID_QUERY_PARAMS`
- `INVALID_REQUEST_BODY`

### 5.2 Not Found

- `TOPIC_NOT_FOUND`
- `DRAFT_NOT_FOUND`
- `REVIEW_TASK_NOT_FOUND`
- `PUBLISH_PACKAGE_NOT_FOUND`
- `JOB_NOT_FOUND`

### 5.3 State Violation

- `TOPIC_STATUS_INVALID`
- `DRAFT_STATUS_INVALID`
- `REVIEW_TASK_STATUS_INVALID`
- `PUBLISH_PACKAGE_STATUS_INVALID`
- `JOB_STATUS_INVALID`

### 5.4 Domain Guard

- `TOPIC_ALREADY_HAS_ACTIVE_MASTER_DRAFT`
- `REVIEW_REQUIRED_BEFORE_PUBLISH`
- `CHANNEL_DRAFT_NOT_SUPPORTED`
- `IDEMPOTENT_REQUEST_REPLAYED`

### 5.5 External Dependency

- `SOURCE_FETCH_FAILED`
- `LLM_REQUEST_FAILED`
- `ASSET_UPLOAD_FAILED`
- `REMOTE_DRAFT_CREATION_FAILED`

### 5.6 Internal

- `INTERNAL_SERVER_ERROR`
- `UNEXPECTED_WORKFLOW_FAILURE`

## 6. HTTP 状态码映射

| Error Type | HTTP Status |
|---|---|
| Validation | `400` |
| Not Found | `404` |
| State Violation | `409` |
| Domain Guard | `409` |
| External Dependency | `502` 或 `503` |
| Internal | `500` |

## 7. 前端处理建议

- `404` 显示资源不存在
- `409` 显示当前状态不允许该动作
- `502/503` 显示“外部服务暂时不可用，可稍后重试”
- `500` 显示通用错误和 `requestId`

## 8. 与日志的关系

- API 返回给前端的是压缩后的错误
- 详细异常堆栈只写日志
- `requestId` 必须同时存在于日志上下文中
