import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface TemplateAnswers {
  projectName: string
  packageName: string
}

export interface TemplateProcessorContext {
  targetDir: string
  answers: TemplateAnswers
}

export type TemplateProcessor = (ctx: TemplateProcessorContext) => Promise<void>
const TEMPLATE_PACKAGE_NAME = '@zhiaiwan/template-npm-tools'

export interface ProjectTemplate {
  id: string
  label: string
  repo: string
  description: string
  questions: TemplateQuestion[]
  processor: TemplateProcessor
}

export interface TemplateQuestion {
  key: 'projectName' | 'packageName'
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

async function replacePackageNameInProject(
  targetDir: string,
  fromName: string,
  toName: string,
): Promise<void> {
  const entries = await readdir(targetDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const fullPath = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      await replacePackageNameInProject(fullPath, fromName, toName)
      continue
    }
    const raw = await readFile(fullPath, 'utf-8')
    if (!raw.includes(fromName)) continue
    const next = raw.split(fromName).join(toName)
    await writeFile(fullPath, next, 'utf-8')
  }
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
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
      await replacePackageNameInProject(
        ctx.targetDir,
        TEMPLATE_PACKAGE_NAME,
        ctx.answers.packageName,
      )
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
