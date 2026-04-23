# 适配器接口约定

## 1. 目标

本文档定义所有外部能力接入时必须遵守的内部适配器接口。

目的不是抽象得很漂亮，而是让多个 thread 可以在不依赖真实第三方系统的前提下并行开发。

## 2. 设计原则

- 业务层只依赖内部 adapter contract
- adapter 返回标准化结果，不把第三方原始响应直接透出
- adapter 失败返回结构化错误
- adapter 输入输出尽量稳定、字段尽量少

## 3. Source Collector Adapter

### 用途

- 拉取 RSS、网页、X、公众号等来源内容

### 输入

```ts
type CollectSourceInput = {
  sourceId: string;
  sourceType: "RSS" | "X" | "WEB" | "WECHAT" | "WEIBO" | "V2EX" | "REDDIT" | "MANUAL";
  config: Record<string, unknown>;
  requestedAt: string;
};
```

### 输出

```ts
type CollectSourceOutput = {
  items: Array<{
    externalId?: string;
    title: string;
    url: string;
    author?: string;
    publishedAt?: string;
    rawContent?: string;
    summary?: string;
    metadata?: Record<string, unknown>;
  }>;
  fetchedCount: number;
};
```

### 错误要求

- 网络错误
- 认证错误
- 解析错误
- 限流错误

这些都必须映射到内部错误码，不能只抛原始异常文本。

## 4. LLM Adapter

### 用途

- 生成母稿
- 改写
- 平台包装
- 生成标题、摘要、关键词

### 输入

```ts
type GenerateContentInput = {
  taskType: "GENERATE_MASTER" | "REWRITE" | "PACKAGE_CHANNEL";
  prompt: string;
  context: Record<string, unknown>;
  model?: string;
};
```

### 输出

```ts
type GenerateContentOutput = {
  title?: string;
  summary?: string;
  content: string;
  metadata?: Record<string, unknown>;
};
```

### 约束

- prompt 构造放在 domain 或 prompt builder，不放在 route handler
- adapter 不负责决定是否允许生成
- adapter 必须保留 model、token 用量等可选元信息

## 5. Asset Generator Adapter

### 用途

- 生成封面图提示词
- 生成卡片结构
- 调用图像生成能力

### 输入

```ts
type GenerateAssetInput = {
  assetType: "COVER_IMAGE" | "CARD_IMAGE" | "IMAGE_PROMPT";
  channel?: "WECHAT" | "XHS" | "X_ARTICLE";
  content: string;
  metadata?: Record<string, unknown>;
};
```

### 输出

```ts
type GenerateAssetOutput = {
  promptText?: string;
  files: Array<{
    path: string;
    mimeType?: string;
    fileSize?: number;
  }>;
  metadata?: Record<string, unknown>;
};
```

## 6. Storage Adapter

### 用途

- 上传导出文件
- 保存图片与中间产物

### 输入

```ts
type UploadFileInput = {
  key: string;
  contentType: string;
  body: string | Uint8Array;
};
```

### 输出

```ts
type UploadFileOutput = {
  key: string;
  url?: string;
  size?: number;
};
```

## 7. Channel Draft Adapter

### 用途

- 创建公众号或 X 远端草稿

### 输入

```ts
type CreateRemoteDraftInput = {
  channel: "WECHAT" | "X_ARTICLE";
  title: string;
  summary?: string;
  content: string;
  assets?: Array<{
    path: string;
    mimeType?: string;
  }>;
  accountId?: string;
};
```

### 输出

```ts
type CreateRemoteDraftOutput = {
  draftUrl: string;
  remoteId?: string;
  metadata?: Record<string, unknown>;
};
```

## 8. Adapter 注册建议

建议按 provider 分文件：

- `src/server/adapters/source/rss.ts`
- `src/server/adapters/source/web.ts`
- `src/server/adapters/llm/openai.ts`
- `src/server/adapters/storage/r2.ts`
- `src/server/adapters/channel-draft/wechat.ts`

统一从 facade 暴露：

- `src/server/adapters/source/index.ts`
- `src/server/adapters/llm/index.ts`

## 9. Mock 要求

为了支持并行开发，每类 adapter 都要先有 mock 实现：

- `collectSourceMock`
- `generateContentMock`
- `generateAssetMock`
- `uploadFileMock`
- `createRemoteDraftMock`

前 4 个 thread 可以基于 mock 提前完成页面和 API。

## 10. 不允许的做法

- 页面直接 import 第三方 SDK
- workflow 里散落第三方响应解析
- 不经 adapter 直接把第三方错误透给前端
- adapter 同时负责业务状态流转
