import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { askTemplateQuestions, createFromTemplate, selectTemplate } from './create.js'

async function readCliVersion(): Promise<string> {
  const packageJsonUrl = new URL('../../package.json', import.meta.url)
  const raw = await readFile(packageJsonUrl, 'utf-8')
  const pkg = JSON.parse(raw) as { version?: string }
  return pkg.version ?? '0.0.0'
}

function printHelp(): void {
  console.log(`
zhiaiwan-cli

用法:
  zhiaiwan create
  zhiaiwan -v | --version

示例:
  zhiaiwan create
  zhiaiwan --version
`)
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const command = argv[0]
  if (command === '-v' || command === '--version') {
    console.log(await readCliVersion())
    return
  }

  if (!command || command === '-h' || command === '--help') {
    printHelp()
    return
  }

  if (command !== 'create') {
    throw new Error(`未知命令: ${command}`)
  }

  if (argv.length > 1) {
    throw new Error('仅支持交互模式，请使用: zhiaiwan create')
  }

  const template = await selectTemplate()
  const answers = await askTemplateQuestions(template)
  await createFromTemplate(template.id, answers)
}
