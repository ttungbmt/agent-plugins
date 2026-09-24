import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { Command, Flags } from '@oclif/core'
import { Listr, ListrLogger, PRESET_TIMER, ProcessOutput } from 'listr2'
import { defaultPresetsDir } from '../presets-dir.js'
import { SCOPES } from '../sync/files.js'
import { sync, type SyncProgress, type SyncReport } from '../sync/index.js'
import type { Exec } from '../sync/registry.js'
import { ConfigError, describeItemSource } from '../sync/resolve.js'

export default class Sync extends Command {
  static override description = 'Sync marketplaces, plugins, skills, agents and MCP servers declared in agent-plugins.yaml into Claude Code'

  static override flags = {
    scope: Flags.option({ options: SCOPES, default: 'project' as const, description: 'settings scope to write' })(),
    'dry-run': Flags.boolean({ description: 'print the plan without changing anything', exclusive: ['check'] }),
    check: Flags.boolean({ description: 'exit non-zero if settings are out of sync', exclusive: ['dry-run'] }),
    force: Flags.boolean({ description: 'overwrite manual entries with the same name, plugin id, skill, agent or MCP server name, and skills or agents edited on disk' }),
    update: Flags.boolean({ description: 'accept changed content of remote presets and fetch the latest commit of skill and agent sources' }),
    verbose: Flags.boolean({ description: 'stream output of the underlying claude and git commands' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Sync)
    const mode = flags['dry-run'] ? 'dry-run' : flags.check ? 'check' : 'apply'

    const progress = createProgress({ plain: flags.verbose || !process.stderr.isTTY })
    let report: SyncReport
    try {
      report = await sync(
        { cwd: process.cwd(), scope: flags.scope, mode, force: flags.force, update: flags.update },
        {
          exec: createExec({ stream: flags.verbose }),
          fetch: fetchText,
          homedir: homedir(),
          claudeDir: process.env.CLAUDE_CONFIG_DIR || undefined,
          defaultPresetsDir: defaultPresetsDir(),
          onProgress: progress.onProgress,
        },
      )
    } catch (error) {
      await progress.done()
      if (error instanceof ConfigError) this.error(error.message, { exit: 2 })
      throw error
    }
    await progress.done()

    for (const a of report.actions) {
      this.log(`${a.status.padEnd(7)} ${a.kind.padEnd(9)} ${target(a)}${a.error ? ` — ${a.error}` : ''}`)
    }
    for (const n of report.notices) this.log(`note    ${n}`)
    for (const c of report.conflicts) this.logToStderr(`conflict ${c.name}: ${c.detail}`)
    if (report.inSync && report.actions.length === 0) this.log('marketplaces, plugins, skills, agents and MCP servers are in sync')
    // dry-run chỉ báo lỗi khi có xung đột; check và apply báo lỗi khi còn lệch.
    if (mode === 'dry-run' ? report.conflicts.length > 0 : !report.inSync) this.exit(1)
  }
}

function target(a: SyncProgress['action']): string {
  if ((a.target === 'skill' || a.target === 'agent') && !a.name && a.source) return `${a.target}s from ${describeItemSource(a.source)}`
  if (a.target === 'mcp') return `MCP server ${a.name}`
  return a.name ?? (a.source ? JSON.stringify(a.source) : '?')
}

/**
 * Hiện tiến độ bằng listr2 trên stderr để stdout vẫn chỉ có bảng tổng kết.
 * Các action chạy tuần tự nên mỗi action là một Listr một-task, chạy nối tiếp nhau.
 * `plain` dùng renderer simple (không vẽ lại dòng) khi không có TTY hoặc output của `claude` được stream ra.
 */
function createProgress({ plain }: { plain: boolean }) {
  let settle: ((error?: string) => void) | undefined
  let running: Promise<unknown> = Promise.resolve()
  const logger = new ListrLogger({ useIcons: true, processOutput: new ProcessOutput(process.stderr, process.stderr) })

  const onProgress = (event: SyncProgress): void => {
    if (event.phase === 'end') {
      settle?.(event.action.status === 'failed' ? (event.action.error ?? 'failed') : undefined)
      return
    }
    const finished = new Promise<void>((resolve, reject) => {
      settle = (error) => (error === undefined ? resolve() : reject(new Error(error)))
    })
    const list = new Listr([{ title: `${event.action.kind.padEnd(9)} ${target(event.action)}`, task: () => finished }], {
      exitOnError: false,
      renderer: 'default',
      rendererOptions: { timer: PRESET_TIMER, collapseErrors: false, logger },
      fallbackRenderer: 'simple',
      fallbackRendererOptions: { timer: PRESET_TIMER, logger },
      fallbackRendererCondition: plain,
    })
    // Lỗi của action đã có trong báo cáo; listr chỉ cần hiện ✖.
    running = running.then(() => list.run()).catch(() => {})
  }

  return { onProgress, done: () => running }
}

/** Chạy `claude`; `stream` chuyển tiếp output của nó ra stderr (vd. tiến độ clone), vẫn gom stderr để báo lỗi. */
function createExec({ stream }: { stream: boolean }): Exec {
  return (command, args) =>
    new Promise((resolve) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => {
        stdout += chunk
        if (stream) process.stderr.write(chunk)
      })
      child.stderr.on('data', (chunk) => {
        stderr += chunk
        if (stream) process.stderr.write(chunk)
      })
      child.on('error', (error) => resolve({ code: 127, stdout, stderr: stderr || error.message }))
      child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
    })
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}
