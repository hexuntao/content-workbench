# ADR-0003: 发布前必须经过人工审核门禁

## Status

Accepted

## Context

产品定位已经明确：`Content Workbench` 不是全自动发帖器，而是“人机协同的内容生产与发布准备平台”。

这意味着系统虽然可以自动完成热点采集、母稿生成、改写、多平台包装和导出准备，但不能把“内容可发”这件事交给默认自动化。

如果没有强制审核门禁，系统会面临以下风险：

- AI 生成内容事实错误直接进入发布阶段
- 作者风格失真但仍然被推向渠道
- 对外平台草稿创建与发布准备缺少责任边界

## Decision

将“人工审核通过”设为发布前的强制门禁：

- 未审核通过的稿件不得创建远端草稿
- 未审核通过的稿件不得被标记为可发布
- 稿件一旦在审核后再次发生内容变化，必须重新送审

审核记录通过 `ReviewTask` 保留历史，而不是只在 `Draft` 上放一个布尔值。

## Consequences

### Positive

- 明确责任边界，降低误发和错误传播风险
- 审核意见可回溯，便于优化 prompt 和工作流
- 更符合产品“人工审核优先”的定位

### Negative

- 主链路速度会慢于全自动方案
- 需要额外建设审核页面和审核状态流转

### Neutral

- 后续如果引入“低风险自动通过”，也必须是在现有门禁之上做策略扩展，而不是删除门禁

## Alternatives Considered

### 仅在高风险渠道开启审核

拒绝原因：

- 会让状态规则变得分裂
- MVP 阶段更需要简单且绝对的约束

### 默认自动通过，只在失败时人工介入

拒绝原因：

- 不符合当前产品定位
- 风险前置不足，容易把错误内容推进到后续阶段

## References

- [内容运营工作台 PRD](/Users/tao/Documents/repo/content-workbench/docs/prd/2026-04-23-content-workbench-prd.md)
- [Review API](/Users/tao/Documents/repo/content-workbench/docs/api/review.md)
- [Publish API](/Users/tao/Documents/repo/content-workbench/docs/api/publish.md)
