# ADR-0001: 采用模块化单体与 Trigger.dev 工作流编排

## Status

Accepted

## Context

`Content Workbench` 的 MVP 目标是在较小团队配置下，尽快打通“采集 -> 选题 -> 生成 -> 改写 -> 审核 -> 发布准备”的完整链路。

系统同时具备两类明显不同的任务：

- 用户触发的同步交互，例如查看 Topics、审核通过、回填发布链接
- 处理时间不稳定的异步任务，例如热点采集、模型改写、图片生成、导出发布包

如果一开始拆成多个服务，团队会提前承担以下成本：

- 服务间协议和部署复杂度
- 跨服务事务和状态一致性问题
- 日志、排障、权限边界的额外治理成本

MVP 阶段的核心风险不是吞吐量，而是状态错误、流程断裂和失败不可恢复。

## Decision

采用“模块化单体 + Trigger.dev 工作流编排”的方案：

- Web UI、API、领域逻辑、数据访问保留在一个 `Next.js` 代码库中
- 所有长耗时动作放入 `Trigger.dev`
- 外部依赖通过适配器层接入，而不是直接散落在页面或接口中

## Consequences

### Positive

- 架构简单，便于快速推进 MVP
- 同一个代码库中更容易维护状态流转规则
- 工作流任务可重试，适合不稳定的外部依赖
- 调试路径更短，适合当前团队规模

### Negative

- Web 请求和后台任务会共享部分运行环境
- 模块边界如果不自觉维护，单体容易变成“大泥球”
- 后续拆分服务时需要补更明确的接口边界

### Neutral

- 需要在代码层面主动维持 `api/domain/adapter/workflow` 的分层纪律
- 观测和日志规范必须尽早建立，否则单体调试优势会迅速消失

## Alternatives Considered

### 微服务方案

拒绝原因：

- 对 MVP 明显过重
- 会把精力消耗在平台工程而不是产品主链路

### 纯同步 API 方案

拒绝原因：

- 采集、生成、导出都依赖慢任务和外部系统
- 难以处理重试、超时和任务状态展示

## References

- [系统架构总览](/Users/tao/Documents/repo/content-workbench/docs/architecture/overview.md)
- [MVP 实施计划与迭代拆解](/Users/tao/Documents/repo/content-workbench/docs/prd/2026-04-23-mvp-implementation-plan.md)
