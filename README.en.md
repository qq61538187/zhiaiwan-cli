# @zhiaiwan/cli

CLI for creating zhiaiwan ecosystem projects from official templates.

## Install

```bash
pnpm install
pnpm run build
npm link
```

## Usage

```bash
zhiaiwan create
zhiaiwan -v
zhiaiwan --version
```

The command flow:

1. Select a template (arrow keys + Enter)
2. Answer template-specific questions (e.g. project name and package name)
3. Clone template and run template processor (e.g. replace package-name placeholders)

Current option:

- `npm-tools`: clones `https://github.com/qq61538187/zhiaiwan-template-npm-tools.git`

## Development

```bash
pnpm run lint
pnpm run typecheck
pnpm run test:run
pnpm run build
```
