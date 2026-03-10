# @zhiaiwan/cli

用于创建智爱玩生态项目的命令行工具。

## 安装

```bash
pnpm install
pnpm run build
npm link
```

## 用法

```bash
zhiaiwan create
zhiaiwan -v
zhiaiwan --version
```

执行后流程：

1. 先选择要创建的模板（支持方向键选择，回车确认）
2. 再按该模板的问题逐项填写（如：项目名、包名）
3. 拉取模板后执行模板处理器（例如替换项目中的包名占位符）

当前支持：

- `npm-tools`: 拉取 `https://github.com/qq61538187/zhiaiwan-template-npm-tools.git`

## 开发命令

```bash
pnpm run lint
pnpm run typecheck
pnpm run test:run
pnpm run build
```
