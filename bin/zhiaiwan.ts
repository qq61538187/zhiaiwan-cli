#!/usr/bin/env node
import { runCli } from '../src/cli.js'

runCli().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\n[zhiaiwan-cli] ${message}\n`)
  process.exit(1)
})
