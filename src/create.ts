import { spawn } from 'node:child_process'
import { access, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { input, select } from '@inquirer/prompts'
import type { ProjectTemplate, TemplateAnswers } from './templates.js'
import {
  findTemplateById,
  PROJECT_TEMPLATES,
  toValidPackageName,
  toValidProjectName,
} from './templates.js'

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function isDirEmpty(targetPath: string): Promise<boolean> {
  const files = await readdir(targetPath)
  return files.length === 0
}

function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Command failed: ${command} ${args.join(' ')}`))
    })
  })
}

function printTemplateList(templates: ProjectTemplate[]): void {
  if (!templates.length) {
    throw new Error('未找到可用模板。')
  }
}

export async function selectTemplate(): Promise<ProjectTemplate> {
  printTemplateList(PROJECT_TEMPLATES)
  const templateId = await select({
    message: '请选择模板（方向键选择，回车确认）',
    choices: PROJECT_TEMPLATES.map((item) => ({
      name: `${item.label} - ${item.description}`,
      value: item.id,
    })),
    loop: false,
  })
  const selected = findTemplateById(templateId)
  if (!selected) {
    throw new Error('模板选择无效，请重试。')
  }
  return selected
}

export async function askTemplateQuestions(
  template: ProjectTemplate,
  presetProjectName?: string,
): Promise<TemplateAnswers> {
  const answers: Partial<TemplateAnswers> = {
    projectName: presetProjectName?.trim(),
  }

  for (const question of template.questions) {
    if (question.key === 'projectName' && answers.projectName) continue
    const answer = await input({
      message: `${question.label}:`,
      validate: (value) => {
        const result = value.trim()
        if (question.required && !result) return `${question.label}不能为空。`
        if (!result) return true
        return question.validate?.(result, answers) ?? true
      },
    })
    answers[question.key] = answer.trim()
  }

  return {
    projectName: toValidProjectName(answers.projectName ?? ''),
    packageName: toValidPackageName(answers.packageName ?? ''),
  }
}

export async function createFromTemplate(
  templateId: string,
  answers: TemplateAnswers,
  cwd = process.cwd(),
): Promise<void> {
  const targetDir = path.resolve(cwd, toValidProjectName(answers.projectName))
  const exists = await pathExists(targetDir)
  if (exists && !(await isDirEmpty(targetDir))) {
    throw new Error(`目标目录已存在且非空: ${targetDir}`)
  }

  const template = findTemplateById(templateId)
  if (!template) {
    throw new Error(`不支持的模板: ${templateId}`)
  }
  const finalTemplate = template

  console.log(`\n开始创建项目: ${answers.projectName}`)
  console.log(`模板: ${finalTemplate.label}`)
  console.log(`仓库: ${finalTemplate.repo}\n`)

  await runCommand('git', ['clone', '--depth', '1', finalTemplate.repo, targetDir], cwd)
  await rm(path.join(targetDir, '.git'), { recursive: true, force: true })
  await finalTemplate.processor({
    targetDir,
    answers: {
      ...answers,
      packageName: toValidPackageName(answers.packageName),
    },
  })
}
