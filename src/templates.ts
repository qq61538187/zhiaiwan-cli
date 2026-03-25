import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface TemplateAnswers {
  projectName: string
  packageName: string
  displayName?: string
  serverPort?: string
  /** vsce-server：配置/命令段 ID 前缀，落地为 `${prefix}Extension` 以替换模板中的 nodeServerExtension */
  extensionSectionPrefix?: string
}

export interface TemplateProcessorContext {
  targetDir: string
  answers: TemplateAnswers
}

export type TemplateProcessor = (ctx: TemplateProcessorContext) => Promise<void>
const TEMPLATE_PACKAGE_NAME = '@zhiaiwan/template-npm-tools'
const TEMPLATE_VSCE_SERVER_PACKAGE_NAME = 'zhiaiwan-template-vsce-server'

export interface ProjectTemplate {
  id: string
  label: string
  repo: string
  description: string
  questions: TemplateQuestion[]
  processor: TemplateProcessor
}

export interface TemplateQuestion {
  key: 'projectName' | 'packageName' | 'displayName' | 'serverPort' | 'extensionSectionPrefix'
  label: string
  required: boolean
  validate?: (value: string, answers: Partial<TemplateAnswers>) => true | string
}

export function toValidProjectName(input: string): string {
  const name = input.trim()
  if (!name) throw new Error('项目名不能为空。')
  if (name.includes(' ')) throw new Error('项目名不能包含空格。')
  return name
}

export function isValidPackageName(input: string): boolean {
  const value = input.trim()
  if (!value || value.includes(' ')) return false
  if (value.startsWith('@')) {
    return /^@[a-z0-9][a-z0-9-_]*\/[a-z0-9][a-z0-9-._]*$/i.test(value)
  }
  return /^[a-z0-9][a-z0-9-._]*$/i.test(value)
}

export function toValidPackageName(input: string): string {
  const value = input.trim()
  if (!isValidPackageName(value)) {
    throw new Error('包名格式无效。示例: @zhiaiwan/template-npm-tools')
  }
  return value
}

export function toValidDisplayName(input: string): string {
  const value = input.trim()
  if (!value) {
    throw new Error('显示名不能为空。')
  }
  return value
}

export function toValidServerPort(input: string): string {
  const value = input.trim()
  const port = Number(value)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('端口必须是 1-65535 的整数。')
  }
  return value
}

/** 与 VS Code contributes.configuration / commands 段名常见约束对齐，避免生成非法键 */
export function toValidExtensionSectionPrefix(input: string): string {
  const value = input.trim()
  if (!value) {
    throw new Error('扩展段 ID 前缀不能为空。')
  }
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
    throw new Error('扩展段 ID 前缀需以字母开头，仅含字母与数字（示例: acme、myTeam1）。')
  }
  return value
}

async function replaceTextInProject(
  targetDir: string,
  fromText: string,
  toText: string,
): Promise<void> {
  if (!fromText || fromText === toText) return
  const entries = await readdir(targetDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue
    const fullPath = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      await replaceTextInProject(fullPath, fromText, toText)
      continue
    }
    if (entry.name.endsWith('.vsix')) continue
    const raw = await readFile(fullPath, 'utf-8')
    if (!raw.includes(fromText)) continue
    const next = raw.split(fromText).join(toText)
    await writeFile(fullPath, next, 'utf-8')
  }
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'vsce-server',
    label: 'vsce-server',
    repo: 'https://github.com/qq61538187/zhiaiwan-template-vsce-server.git',
    description: 'VSCode/Cursor extension with embedded Node server skeleton',
    processor: async (ctx) => {
      const sectionPrefix = ctx.answers.extensionSectionPrefix
      if (!sectionPrefix) {
        throw new Error('缺少扩展段 ID 前缀，无法生成唯一命令/配置键。')
      }
      const extensionSectionId = `${sectionPrefix}Extension`
      await replaceTextInProject(ctx.targetDir, 'nodeServerExtension', extensionSectionId)

      const packageJsonPath = path.join(ctx.targetDir, 'package.json')
      const raw = await readFile(packageJsonPath, 'utf-8')
      const pkg = JSON.parse(raw) as {
        name?: string
        displayName?: string
        contributes?: {
          configuration?: {
            properties?: Record<string, { type?: string; default?: number; description?: string }>
          }
        }
      }
      const portPropertyKey = `${extensionSectionId}.port`
      const originalConfig = {
        name: typeof pkg.name === 'string' ? pkg.name : TEMPLATE_VSCE_SERVER_PACKAGE_NAME,
        displayName: typeof pkg.displayName === 'string' ? pkg.displayName : undefined,
        serverPort: pkg.contributes?.configuration?.properties?.[portPropertyKey]?.default,
      }

      pkg.name = ctx.answers.packageName
      if (ctx.answers.displayName) {
        pkg.displayName = ctx.answers.displayName
      }
      if (ctx.answers.serverPort) {
        const properties = pkg.contributes?.configuration?.properties
        const portConfig = properties?.[portPropertyKey]
        if (portConfig) {
          portConfig.default = Number(ctx.answers.serverPort)
        }
      }
      await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8')

      await replaceTextInProject(ctx.targetDir, originalConfig.name, ctx.answers.packageName)
      if (ctx.answers.displayName && originalConfig.displayName) {
        await replaceTextInProject(
          ctx.targetDir,
          originalConfig.displayName,
          ctx.answers.displayName,
        )
      }
      if (
        ctx.answers.serverPort &&
        typeof originalConfig.serverPort === 'number' &&
        Number.isInteger(originalConfig.serverPort)
      ) {
        await replaceTextInProject(
          ctx.targetDir,
          String(originalConfig.serverPort),
          ctx.answers.serverPort,
        )
      }
    },
    questions: [
      {
        key: 'projectName',
        label: '请输入项目名',
        required: true,
        validate: (value) => {
          try {
            toValidProjectName(value)
            return true
          } catch (error) {
            return error instanceof Error ? error.message : '项目名格式无效。'
          }
        },
      },
      {
        key: 'packageName',
        label: `请输入包名 (如: ${TEMPLATE_VSCE_SERVER_PACKAGE_NAME})`,
        required: true,
        validate: (value) =>
          isValidPackageName(value)
            ? true
            : `包名格式无效。示例: ${TEMPLATE_VSCE_SERVER_PACKAGE_NAME}`,
      },
      {
        key: 'displayName',
        label: '请输入扩展显示名 (如: My VSCE Server)',
        required: true,
        validate: (value) => {
          try {
            toValidDisplayName(value)
            return true
          } catch (error) {
            return error instanceof Error ? error.message : '显示名格式无效。'
          }
        },
      },
      {
        key: 'serverPort',
        label: '请输入默认服务端口 (如: 3510)',
        required: true,
        validate: (value) => {
          try {
            toValidServerPort(value)
            return true
          } catch (error) {
            return error instanceof Error ? error.message : '端口格式无效。'
          }
        },
      },
      {
        key: 'extensionSectionPrefix',
        label:
          '请输入扩展命令/配置段 ID 前缀（不含 Extension；将生成 前缀+Extension 并全局替换 nodeServerExtension，避免与同机其他模板插件冲突）',
        required: true,
        validate: (value) => {
          try {
            toValidExtensionSectionPrefix(value)
            return true
          } catch (error) {
            return error instanceof Error ? error.message : '扩展段 ID 前缀无效。'
          }
        },
      },
    ],
  },
  {
    id: 'npm-tools',
    label: 'npm-tools',
    repo: 'https://github.com/qq61538187/zhiaiwan-template-npm-tools.git',
    description: 'TypeScript + Vite + Vitest + Husky + Changesets skeleton',
    processor: async (ctx) => {
      const packageJsonPath = path.join(ctx.targetDir, 'package.json')
      const raw = await readFile(packageJsonPath, 'utf-8')
      const pkg = JSON.parse(raw) as Record<string, unknown>
      pkg.name = ctx.answers.packageName
      await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8')
      await replaceTextInProject(ctx.targetDir, TEMPLATE_PACKAGE_NAME, ctx.answers.packageName)
    },
    questions: [
      {
        key: 'projectName',
        label: '请输入项目名',
        required: true,
        validate: (value) => {
          try {
            toValidProjectName(value)
            return true
          } catch (error) {
            return error instanceof Error ? error.message : '项目名格式无效。'
          }
        },
      },
      {
        key: 'packageName',
        label: '请输入包名 (如: @zhiaiwan/template-npm-tools)',
        required: true,
        validate: (value) =>
          isValidPackageName(value) ? true : '包名格式无效。示例: @zhiaiwan/template-npm-tools',
      },
    ],
  },
]

export function findTemplateById(templateId: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((item) => item.id === templateId)
}
