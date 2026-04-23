# 本地开发 Runbook

## 1. 目标

本文档定义仓库进入可开发状态后的本地启动和排障基线。

当前仓库还没有代码实现，本 runbook 用于约束目标形态。

## 2. 目标依赖

- Node.js `22.x`
- `pnpm`
- PostgreSQL
- 可选对象存储本地替代方案

## 3. 首次启动流程

1. 安装依赖
2. 复制环境变量模板
3. 启动数据库
4. 执行 Prisma 生成和迁移
5. 导入 seed 数据
6. 启动 Web 应用
7. 启动 workflow worker

## 4. 目标命令

后续仓库应至少提供：

- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm prisma migrate dev`
- `pnpm prisma db seed`

## 5. 环境变量建议

至少包括：

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `TRIGGER_SECRET_KEY`
- `STORAGE_BUCKET`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `OPENAI_API_KEY` 或等价模型密钥

## 6. 本地排障

### Web 启不来

检查：

- 依赖是否安装完成
- `.env` 是否存在
- 端口是否被占用

### Prisma 报错

检查：

- PostgreSQL 是否已启动
- `DATABASE_URL` 是否正确
- migration 是否与 schema 一致

### Workflow 不执行

检查：

- worker 是否启动
- `Trigger.dev` 配置是否完整
- job 是否被成功入队

## 7. 本地开发最小成功标准

- Topics 页面能打开
- 至少一条 mock 数据能展示
- 至少一个异步 job 能从触发走到完成
- `lint` 和 `typecheck` 可运行

## 8. 后续补充项

代码落地后需要补齐：

- 实际启动命令
- worker 启动方式
- Docker 或本地数据库脚本
- 常见错误截图与处理
