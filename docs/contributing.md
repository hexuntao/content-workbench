# 协作约定

## 1. 目标

本文档定义多 thread 并行开发时的最低协作规则。

核心目标：

- 降低冲突
- 保持契约稳定
- 让每个 thread 的输出可被其他 thread 消费

## 2. 基础规范

- TypeScript 使用 strict mode
- 所有函数必须有类型标注
- 禁止 `any`，测试代码除外
- 使用 `Biome`，不使用 Prettier / ESLint
- React 组件优先函数式组件，不使用 `React.FC`
- 导入使用 `@/` 指向 `src/`
- 中文注释，英文变量名

## 3. 并行开发规则

- 先看文档再动共享层
- 不修改不属于自己 thread 的 owner 目录
- 需要修改共享契约时，先更新文档，再改代码
- 不得绕过 domain 层直接改状态
- 不得直接改别的 thread 的 mock 语义

## 4. 共享文件规则

以下文件属于高冲突文件：

- `package.json`
- `prisma/schema.prisma`
- `src/app/layout.tsx`
- `src/server/contracts/*`

修改这些文件时必须：

- 说明修改目的
- 保持改动最小
- 不顺手重构无关内容

## 5. 提交粒度

- 每个提交只做一件事
- 提交信息使用 Conventional Commits
- 不在同一提交里混入格式化、重命名和业务修改

## 6. 自检要求

每次准备交付前：

- 运行 `pnpm lint`
- 运行 `pnpm typecheck`
- 运行本 thread 最小必要测试
- 对修改文件执行 `pnpm biome check --write`

如果仓库尚未完成这些命令的落地，需要在交付说明里明确写出原因。

## 7. 禁止事项

- 不直接提交未解释的 schema 改动
- 不在没有文档同步的情况下改 contract
- 不通过复制粘贴制造第二套状态定义
- 不把第三方 SDK 直接拉进页面层

## 8. 文档优先级

若发生冲突，优先级按以下顺序：

1. `docs/architecture/state-machines.md`
2. `docs/api/*.md`
3. `docs/architecture/adapters.md`
4. `docs/architecture/codebase-layout.md`
5. feature 自己的实现细节
