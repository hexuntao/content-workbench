# Content Workbench Docs

## 目录

- [产品需求文档](/Users/tao/Documents/repo/content-workbench/docs/prd/2026-04-23-content-workbench-prd.md)
- [MVP 数据模型与 Prisma Schema 草案](/Users/tao/Documents/repo/content-workbench/docs/prd/2026-04-23-mvp-data-model-and-prisma.md)
- [MVP 实施计划与迭代拆解](/Users/tao/Documents/repo/content-workbench/docs/prd/2026-04-23-mvp-implementation-plan.md)
- [并行开发工作流拆分](/Users/tao/Documents/repo/content-workbench/docs/plans/parallel-workstreams.md)
- [系统架构总览](/Users/tao/Documents/repo/content-workbench/docs/architecture/overview.md)
- [代码结构与模块边界](/Users/tao/Documents/repo/content-workbench/docs/architecture/codebase-layout.md)
- [领域状态机](/Users/tao/Documents/repo/content-workbench/docs/architecture/state-machines.md)
- [适配器接口约定](/Users/tao/Documents/repo/content-workbench/docs/architecture/adapters.md)
- [API 文档索引](/Users/tao/Documents/repo/content-workbench/docs/api/README.md)
- [ADR 索引](/Users/tao/Documents/repo/content-workbench/docs/adr/README.md)
- [协作约定](/Users/tao/Documents/repo/content-workbench/docs/contributing.md)
- [数据库迁移约定](/Users/tao/Documents/repo/content-workbench/docs/db/migrations.md)
- [测试策略](/Users/tao/Documents/repo/content-workbench/docs/testing/strategy.md)
- [本地开发 Runbook](/Users/tao/Documents/repo/content-workbench/docs/runbooks/local-dev.md)
- [热点采集 Runbook](/Users/tao/Documents/repo/content-workbench/docs/runbooks/ingestion.md)

## 说明

当前文档围绕 `Content Workbench` 的 MVP 展开，先覆盖：

- 产品定位与范围
- 核心工作流
- 数据模型与状态设计
- 实施计划与迭代拆解
- 并行开发切片与线程边界
- 系统边界与模块职责
- 代码结构与模块归属
- 领域状态机与共享规则
- 适配器与异步任务契约
- 主链路 API 契约
- 核心架构决策记录
- 协作、迁移、测试规范
- 本地开发运行手册
- 热点采集运行手册

## 目录结构

- `docs/prd/`
  产品、数据模型、实施计划
- `docs/plans/`
  并行开发切片、执行顺序、线程边界
- `docs/architecture/`
  高层架构、代码布局、状态约束、适配器边界
- `docs/api/`
  Topics、Drafts、Review、Publish、Jobs、错误模型契约
- `docs/adr/`
  关键架构决策记录
- `docs/db/`
  数据库迁移、schema 协作规则
- `docs/testing/`
  测试分层、完成定义、联调策略
- `docs/runbooks/`
  本地开发、运维与排障手册
- `docs/contributing.md`
  多线程协作规范
