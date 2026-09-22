import { execFile } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command, Flags } from '@oclif/core'
import { SCOPES } from '../sync/files.js'
import { sync, type SyncReport } from '../sync/index.js'
import type { Exec } from '../sync/registry.js'
import { ConfigError } from '../sync/resolve.js'

export default class Sync extends Command {
  static override description = 'Sync marketplaces declared in agent-plugins.yaml into Claude Code extraKnownMarketplaces'

  static override flags = {
    scope: Flags.option({ options: SCOPES, default: 'project' as const, description: 'settings scope to write' })(),
    'dry-run': Flags.boolean({ description: 'print the plan without changing anything', exclusive: ['check'] }),
    check: Flags.boolean({ description: 'exit non-zero if settings are out of sync', exclusive: ['dry-run'] }),
    force: Flags.boolean({ description: 'overwrite manual entries with the same name' }),
    update: Flags.boolean({ description: 'accept changed content of remote presets' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Sync)
    const mode = flags['dry-run'] ? 'dry-run' : flags.check ? 'check' : 'apply'

    let report: SyncReport
    try {
      report = await sync(
        { cwd: process.cwd(), scope: flags.scope, mode, force: flags.force, update: flags.update },
        { exec, fetch: fetchText, homedir: homedir(), defaultPresetsDir: defaultPresetsDir() },
      )
    } catch (error) {
      if (error instanceof ConfigError) this.error(error.message, { exit: 2 })
      throw error
    }

    for (const a of report.actions) {
      const target = a.name ?? (a.source ? JSON.stringify(a.source) : '?')
      this.log(`${a.status.padEnd(7)} ${a.kind.padEnd(6)} ${target}${a.error ? ` — ${a.error}` : ''}`)
    }
    for (const n of report.notices) this.log(`note    ${n}`)
    for (const c of report.conflicts) this.logToStderr(`conflict ${c.name}: ${c.detail}`)
    if (report.inSync && report.actions.length === 0) this.log('marketplaces are in sync')
    // dry-run chỉ báo lỗi khi có xung đột; check và apply báo lỗi khi còn lệch.
    if (mode === 'dry-run' ? report.conflicts.length > 0 : !report.inSync) this.exit(1)
  }
}

const exec: Exec = (command, args) =>
  new Promise((resolve) => {
    execFile(command, args, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : 127) : 0
      resolve({ code, stdout, stderr: stderr || (error && !stderr ? error.message : '') })
    })
  })

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

function defaultPresetsDir(): string {
  return dirname(fileURLToPath(import.meta.resolve('presets/package.json')))
}
