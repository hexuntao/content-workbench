# 代码结构与模块边界

## 1. 目标

本文档定义 `Content Workbench` 的目标代码布局，用于支持多 thread 并行开发。

核心原则：

- 路由与 UI 按 feature 组织
- 业务规则集中在 server/domain，不散落在页面组件中
- 外部系统调用集中在 adapters
- 长耗时任务集中在 workflows
- Prisma 只通过 repositories 访问

## 2. 推荐目录结构

```text
src/
  app/
    (dashboard)/
      topics/
      drafts/
      review/
      publish/
      settings/
    api/
      topics/
      drafts/
      review/
      publish/
      jobs/
    layout.tsx
    page.tsx
    error.tsx
    not-found.tsx
  components/
    ui/
    layout/
  features/
    topics/
      components/
      server/
      schemas/
      types.ts
    drafts/
      components/
      server/
      schemas/
      types.ts
    review/
      components/
      server/
      schemas/
      types.ts
    publish/
      components/
      server/
      schemas/
      types.ts
  server/
    adapters/
      source/
      llm/
      storage/
      channel-draft/
    contracts/
    db/
    domain/
      topics/
      drafts/
      review/
      publish/
      jobs/
    repositories/
    services/
    workflows/
  lib/
    env/
    logger/
    utils/
  styles/
  types/
prisma/
  schema.prisma
  migrations/
docs/
```

## 3. 分层职责

### 3.1 `src/app/`

负责：

- Next.js 路由入口
- 页面组合
- route handlers
- 页面级 loading / error / empty state

不负责：

- 直接写业务状态流转
- 直接调用 Prisma

### 3.2 `src/features/`

负责：

- 与单个业务域强相关的页面组件
- 该 feature 的表单 schema、view model、server-side orchestration

推荐方式：

- `topics` 只关心 topics 的展示和交互
- `drafts` 不应直接 import `review` 组件

### 3.3 `src/server/domain/`

负责：

- 业务规则
- 状态机校验
- 核心用例
- 幂等规则和门禁判断

这是最重要的共享层，必须由文档约束，不允许随意放杂项工具。

### 3.4 `src/server/repositories/`

负责：

- 封装 Prisma 查询
- 返回明确的领域数据结构

不负责：

- 决定状态跳转是否合法
- 拼接页面展示字符串

### 3.5 `src/server/adapters/`

负责：

- 对接 RSS、网页抓取、LLM、对象存储、渠道草稿能力
- 把不稳定第三方接口收敛为稳定内部接口

### 3.6 `src/server/workflows/`

负责：

- `Trigger.dev` 任务定义
- 任务级重试
- 步骤编排

不负责：

- 替代 domain 层做状态判断

## 4. 允许依赖方向

只允许以下方向：

- `app -> features`
- `app -> server`
- `features -> server`
- `server/domain -> repositories`
- `server/domain -> adapters`
- `server/workflows -> domain`
- `server/workflows -> adapters`

不允许：

- `repositories -> features`
- `adapters -> app`
- `features/topics -> features/drafts` 的深层反向依赖
- 页面组件直接 import Prisma client

## 5. 命名与文件边界

- 使用 `@/` 指向 `src/`
- Feature 内部类型优先写在 feature 自己目录中
- 跨 feature 的共享契约放在 `src/server/contracts/`
- 避免建立巨型 `utils.ts`
- 避免建立全局 barrel 导致循环依赖

## 6. 目录 owner 建议

- `src/app/`：Thread 1 先建壳，后续按路由段分配
- `src/features/topics/`：Thread 3
- `src/features/drafts/`：Thread 4
- `src/features/review/`：Thread 5
- `src/features/publish/`：Thread 5
- `src/server/adapters/`：Thread 6
- `src/server/workflows/`：Thread 6
- `prisma/`：Thread 2

## 7. 共享契约目录

建议优先创建以下共享文件，但保持体积小：

- `src/server/contracts/jobs.ts`
- `src/server/contracts/errors.ts`
- `src/server/contracts/topics.ts`
- `src/server/contracts/drafts.ts`
- `src/server/contracts/review.ts`
- `src/server/contracts/publish.ts`

这些文件的目标不是放全部逻辑，而是稳定输入输出结构，减少并行开发中的漂移。

## 8. 反模式

以下做法会显著降低并行开发效率：

- 在 `app/` 目录里直接堆全部业务逻辑
- 每个 feature 自己私有一套状态定义
- workflow 直接拼 Prisma 查询和业务判断
- adapter 直接返回第三方原始响应给页面
- 多个 thread 同时改一个全局 `types.ts`

## 9. 建仓顺序建议

1. Thread 1 先建目录壳与基础配置
2. Thread 2 建 Prisma 与 repository 基础
3. Thread 1 或指定 owner 建 `contracts/`
4. 各 feature thread 按目录归属实现
5. Thread 6 再把 workflow 与 adapter 接到稳定契约上
