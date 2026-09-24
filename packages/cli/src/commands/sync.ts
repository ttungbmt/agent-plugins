import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { styleText } from 'node:util'
import { Command, Flags } from '@oclif/core'
import { formatConflicts, type Style } from '../format-conflicts.js'
import { formatReport } from '../format-report.js'
import { defaultPresetsDir } from '../presets-dir.js'
import { SCOPES } from '../sync/files.js'
import { sync, type SyncProgress, type SyncReport } from '../sync/index.js'
import type { Exec } from '../sync/registry.js'
import { ConfigError, describeItemSource } from '../sync/resolve.js'
import { ITEM_KINDS, type ItemKind } from '../sync/types.js'

export default class Sync extends Command {
  static override description = 'Sync marketplaces, plugins, skills, agents, rules, workflows, MCP servers and hooks declared in agent-plugins.yaml into Claude Code'

  static override flags = {
    scope: Flags.option({ options: SCOPES, default: 'project' as const, description: 'settings scope to write' })(),
    'dry-run': Flags.boolean({ description: 'print the plan without changing anything', exclusive: ['check'] }),
    check: Flags.boolean({ description: 'exit non-zero if settings are out of sync', exclusive: ['dry-run'] }),
    force: Flags.boolean({ description: 'overwrite manual entries with the same name, plugin id, skill, agent, rule, workflow or MCP server name, and skills, agents, rules or workflows edited on disk' }),
    update: Flags.boolean({ description: 'accept changed content of remote presets and fetch the latest commit of skill, agent, rule and workflow sources' }),
    verbose: Flags.boolean({ description: 'stream output of the underlying claude and git commands' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Sync)
    const mode = flags['dry-run'] ? 'dry-run' : flags.check ? 'check' : 'apply'

    const progress = createProgress({ live: process.stderr.isTTY && !flags.verbose, announce: flags.verbose })
    const started = Date.now()
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
      progress.done()
      if (error instanceof ConfigError) this.error(error.message, { exit: 2 })
      throw error
    }
    progress.done()

    const style: Style = (format, text) => styleText(format, text, { stream: process.stdout })
    if (report.actions.length > 0) {
      this.log(formatReport(report, { scope: flags.scope, style, elapsedMs: mode === 'apply' ? Date.now() - started : undefined }))
    }
    for (const n of report.notices) this.log(`${style('yellow', '!')} ${n}`)
    if (report.conflicts.length > 0) this.logToStderr(formatConflicts(report.conflicts, (format, text) => styleText(format, text, { stream: process.stderr })))
    if (report.inSync && report.actions.length === 0) this.log('marketplaces, plugins, skills, agents, rules, workflows, MCP servers and hooks are in sync')
    // dry-run only fails on conflicts; check and apply fail while anything is still out of sync.
    if (mode === 'dry-run' ? report.conflicts.length > 0 : !report.inSync) this.exit(1)
  }
}

/** What an action is about, with its Scope when it lies outside the targeted one (a User-scoped marketplace). */
function target(a: SyncProgress['action']): string {
  return a.scope ? `${subject(a)} (${a.scope})` : subject(a)
}

function subject(a: SyncProgress['action']): string {
  if (ITEM_KINDS.includes(a.target as ItemKind) && !a.name && a.source) return `${a.target}s from ${describeItemSource(a.source)}`
  if (a.target === 'mcp') return `MCP server ${a.name}`
  if (a.target === 'hook') return `hook ${a.name}`
  return a.name ?? (a.source ? JSON.stringify(a.source) : '?')
}

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/**
 * Shows the running action on stderr so stdout carries only the report. `live` redraws one spinner line in place and
 * clears it when the Sync ends; `announce` prints one line per action instead, to head the streamed `claude` output.
 */
function createProgress({ live, announce }: { live: boolean; announce: boolean }) {
  let title = ''
  let frame = 0
  const spinner = () => styleText('cyan', SPINNER[frame++ % SPINNER.length]!, { stream: process.stderr })
  const draw = () => process.stderr.write(`\r\x1b[2K${spinner()} ${title}`)
  const timer = live ? setInterval(() => title && draw(), 80) : undefined

  const onProgress = (event: SyncProgress): void => {
    if (event.phase === 'end') return
    title = `${event.action.kind} ${target(event.action)}`
    if (live) draw()
    if (announce) process.stderr.write(`→ ${title}\n`)
  }

  const done = () => {
    clearInterval(timer)
    if (live && title) process.stderr.write('\r\x1b[2K')
  }

  return { onProgress, done }
}

/** Run `claude`; `stream` forwards its output to stderr (e.g. clone progress) while still collecting stderr for errors. */
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
