# 测试策略

## 1. 目标

本文档定义 MVP 阶段的测试分层、覆盖重点和各 thread 的完成定义。

并行开发时，测试不是“最后一起补”，而是线程边界的一部分。

## 2. 测试分层

### 2.1 单元测试

覆盖对象：

- domain 状态机
- score / dedupe 纯函数
- prompt builder
- adapter 响应映射

要求：

- 快速
- 无网络
- 无真实数据库依赖

### 2.2 集成测试

覆盖对象：

- route handler + repository
- workflow step + adapter mock
- Prisma query 与事务边界

要求：

- 使用测试数据库
- 外部依赖使用 mock adapter

### 2.3 流程测试

覆盖对象：

- `Topics -> Draft -> Review -> Publish` 主链路
- 失败重试与状态回滚

要求：

- 验证状态机与跨模块衔接
- 至少覆盖 happy path 和 1 条关键失败路径

## 3. MVP 必测清单

- 采集去重不重复落库
- Topics 状态流转正确
- 母稿生成后能创建 Draft
- 改写完成后能正确选择版本
- 未审核通过不能创建远端草稿
- 发布记录回填后状态正确

## 4. Thread 级完成定义

### Thread 1

- 项目可启动
- `lint`、`typecheck`、测试命令存在
- 至少有 1 条基础渲染测试或 smoke test

### Thread 2

- Prisma schema 校验通过
- 迁移可执行
- repository 至少有查询和写入集成测试

### Thread 3

- Topics API 状态动作覆盖
- Topics 页面至少有列表加载和动作触发测试

### Thread 4

- Draft 改写触发与版本切换测试
- 平台包装入口测试

### Thread 5

- 审核通过/退回/重提测试
- 发布包导出和回填记录测试

### Thread 6

- ingestion job 测试
- generate / rewrite / package / export workflow 测试
- adapter mock 和真实实现映射测试

## 5. Mock 策略

- 外部平台一律通过 adapter mock
- workflow 测试默认不打真实网络
- 页面测试不依赖真实 `Trigger.dev`
- 图像生成和草稿创建只验证 contract，不验证第三方实际成功率

## 6. 不建议的做法

- 用 e2e 替代所有单测和集成测试
- 在页面测试里隐式依赖真实数据库
- 每个 thread 自己发明测试风格
- 为了让测试通过而绕开 domain guard

## 7. 推荐命令目标

后续仓库应至少具备这些命令：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`

## 8. 联调前检查

进入跨 thread 联调前，至少确认：

- API contract 已对齐
- 错误码已对齐
- 关键状态机测试已存在
- mock adapter 已具备
