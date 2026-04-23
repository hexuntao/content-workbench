# 数据库迁移约定

## 1. 目标

本文档定义 Prisma schema、migration、seed 在多 thread 并行开发中的协作规则。

数据库层是当前项目最容易产生冲突的共享面，因此默认串行管理。

## 2. 所有权

- `prisma/schema.prisma` 默认由 Thread 2 拥有
- `prisma/migrations/` 默认由 Thread 2 生成和整理
- 其他 thread 如需新增字段，先提需求，再由 schema owner 合并

## 3. 规则

- 不允许多个 thread 同时修改 Prisma 主 schema
- 不允许手写与 schema 不一致的 migration
- migration 文件一旦生成，不随意重写历史
- feature thread 需要字段时，先更新文档和 contract

## 4. 推荐流程

1. 需求 thread 提出模型变更
2. 更新相关文档
3. Thread 2 修改 `schema.prisma`
4. 生成 migration
5. 更新 repository contract
6. 下游 thread 再接入字段

## 5. Seed 约定

建议维护：

- `topics` 演示数据
- `drafts` 演示数据
- `review` 演示数据
- `publish` 演示数据

目的：

- 支持页面 thread 独立开发
- 支持流程测试快速准备数据

## 6. 本地常用动作

目标命令建议：

- `pnpm prisma generate`
- `pnpm prisma migrate dev`
- `pnpm prisma migrate reset`
- `pnpm prisma db seed`

## 7. 风险提示

以下情况应视为高风险：

- 修改 enum 导致历史状态失配
- 修改唯一索引导致幂等语义变化
- 修改外键删除策略影响审计链路

这些改动必须同步更新：

- 数据模型文档
- 状态机文档
- repository 测试
