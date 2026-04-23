# ADR-0002: 以 Draft 作为统一内容聚合根

## Status

Accepted

## Context

系统中的内容会经历多个阶段：

- 从选题生成母稿
- 从母稿生成多轮改写版本
- 从选中版本生成多平台稿件
- 进入审核和发布准备

如果母稿、平台稿、改写稿分别设计成完全独立的顶层实体，MVP 会很快遇到这些问题：

- 状态流转分散，审核门禁难以统一
- 同一选题下内容关系不容易追踪
- 平台包装和发布包很难明确挂在哪个主体上

PRD 已经把 `Draft` 定位为“母稿或平台稿都统一放在 Draft，只用 draftType 区分”。现在需要把这件事正式定为架构决策。

## Decision

以 `Draft` 作为统一内容聚合根：

- `MASTER`、`WECHAT`、`XHS`、`X_ARTICLE` 都是 `Draft`
- 改写版本通过 `RewriteVersion` 挂在 `Draft` 下
- 审核任务、素材、发布包都围绕 `Draft` 建立关系

MVP 阶段不再引入第二个“内容主表”。

## Consequences

### Positive

- 状态和权限判断集中
- 容易追踪“一个选题最终产出了哪些内容”
- 审核与发布准备可复用同一套主键和关联关系
- Prisma schema 更稳定，减少早期返工

### Negative

- `Draft` 语义会偏宽，需要通过 `draftType` 明确边界
- 平台稿与母稿共表后，部分字段对不同类型的含义会不同

### Neutral

- 后续若发现平台稿需要大量独有字段，可以通过附属表或 `metadata` 扩展
- `currentRewriteId` 等字段需要在实现时补上明确 relation 设计

## Alternatives Considered

### 母稿表与平台稿表分离

拒绝原因：

- MVP 阶段收益不高，复杂度显著上升
- 审核、素材、发布包都要额外处理跨实体关系

### 只有 RewriteVersion 没有 Draft 主体

拒绝原因：

- 无法清晰表达当前正式内容与历史改写的区别
- 审核和发布准备缺少稳定挂载点

## References

- [MVP 数据模型与 Prisma Schema 草案](/Users/tao/Documents/repo/content-workbench/docs/prd/2026-04-23-mvp-data-model-and-prisma.md)
- [Drafts API](/Users/tao/Documents/repo/content-workbench/docs/api/drafts.md)
