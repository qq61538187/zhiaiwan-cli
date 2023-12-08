#!/usr/bin/env node

const { program } = require('commander')
const logs = require('../utils/log-utils')

logs.g('欢迎使用只爱玩前端脚手架工具来创建你的项目!')

program.version(require('../package').version)
  .usage('<command> [arguments]')

program.command('create <projectName>')
  .description('创建只爱玩脚手架的项目模版')
  .alias('c')
  .action((projectName) => {
    logs.g('create project'+ projectName)
  })
program.parse(process.argv)

if (!program.args.length) {
  program.help()
}

