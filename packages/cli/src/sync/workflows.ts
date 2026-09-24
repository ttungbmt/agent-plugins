import { createHash } from 'node:crypto'
import { copyFile, lstat, mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { claudeDir, readJson, settingsPath, type Location } from './files.js'
import type { FoundItem, InstalledItem, ItemHandler } from './items.js'
import type { ItemSource, Scope } from './types.js'
import { isPluginBound, workflowName, workflowRefs } from './workflow-meta.js'

export const WORKFLOWS: ItemHandler = {
  kind: 'workflow',
  dir: workflowsDir,
  find: findWorkflows,
  list: listInstalledWorkflows,
  install: installWorkflow,
  remove: removeWorkflow,
}

/** The workflows directory Claude Code reads for each Scope; the `local` scope has no directory of its own. */
export function workflowsDir(scope: Scope, location: Location): string | null {
  if (scope === 'local') return null
  return scope === 'project' ? join(location.cwd, '.claude/workflows') : join(claudeDir(location), 'workflows')
}

/**
 * Finds Workflows in a fetched source (ADR 0010): `*.js` files directly in the workflows root (not recursive, since Claude
 * Code does not look in subdirectories), skipping `*.test.*` and `_*`, and only accepting files with a literal `meta` with a
 * valid `name`. The root of a `github`/`git` source is `path` when declared, otherwise `workflows/` (`.claude/workflows/`,
 * where the source repo keeps its own workflows, is not searched). A `directory` source uses its `workflows/` if present,
 * otherwise itself.
 */
export async function findWorkflows(root: string, source: ItemSource): Promise<FoundItem[]> {
  const explicit = source.source === 'directory' || typeof source.path === 'string'
  const nested = join(root, 'workflows')
  const base = !explicit || (source.source === 'directory' && (await isDir(nested))) ? nested : root
  if (!(await isDir(base))) throw new Error(`no workflows/ directory in the source; declare \`path\` to point at its workflows`)
  const workflows: FoundItem[] = []
  for (const entry of await readdir(base, { withFileTypes: true })) {
    if (!entry.isFile() || !isCandidate(entry.name)) continue
    const path = join(base, entry.name)
    const text = await readFile(path)
    const name = workflowName(text.toString('utf8'))
    if (name === undefined) continue
    const twin = workflows.find((w) => w.name === name)
    if (twin) throw new Error(`workflows at ${twin.path} and ${path} share the name "${name}"`)
    const refs = workflowRefs(text.toString('utf8'))
    const found: FoundItem = { name, path, sha256: hash(text) }
    if (isPluginBound(refs)) found.blocked = `it calls ${refs.agentTypes.filter((t) => t.includes(':')).join(', ')}`
    workflows.push(found)
  }
  return workflows.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Installed workflows: every `*.js` directly in the directory with a valid `meta.name`, identified by `meta.name` (ADR
 * 0010), so a file the user named differently still matches its declaration. Several files with the same name merge into
 * one Installed workflow; the file used as the Installed workflow is `<name>.js` if present, otherwise the first by name.
 */
export async function listInstalledWorkflows(dir: string): Promise<InstalledItem[]> {
  const byName = new Map<string, { file: string; symlink: boolean; sha256: string }[]>()
  const entries = (await readdir(dir, { withFileTypes: true }).catch(() => [])).sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    if ((!entry.isFile() && !entry.isSymbolicLink()) || !entry.name.endsWith('.js')) continue
    const text = await readFile(join(dir, entry.name)).catch(() => undefined)
    const name = text && workflowName(text.toString('utf8'))
    if (!text || name === undefined) continue
    const files = byName.get(name) ?? []
    const file = { file: entry.name, symlink: entry.isSymbolicLink(), sha256: hash(text) }
    if (entry.name === `${name}.js`) files.unshift(file)
    else files.push(file)
    byName.set(name, files)
  }
  return [...byName].map(([name, [first, ...rest]]) => ({
    name,
    symlink: first!.symlink,
    sha256: first!.sha256,
    files: [first!.file, ...rest.map((f) => f.file)],
  }))
}

/**
 * Writes a Workflow file as `<dir>/<meta.name>.js`. An older Installed workflow with this name but a different file name
 * (adopted, or replaced with `--force`) is removed so only one file remains; a symlink is only unlinked. Other files with
 * the same name are left alone.
 */
export async function installWorkflow(from: string, dir: string, name: string): Promise<void> {
  const current = await installedFile(dir, name)
  if (current) await rm(join(dir, current), { force: true })
  const target = join(dir, `${name}.js`)
  await rm(target, { force: true })
  await mkdir(dir, { recursive: true })
  await copyFile(from, target)
}

/** Removes exactly the files that are the Installed workflow of `name`, whatever their file names. */
export async function removeWorkflow(dir: string, name: string): Promise<void> {
  const current = await installedFile(dir, name)
  if (current) await rm(join(dir, current), { force: true })
}

async function installedFile(dir: string, name: string): Promise<string | undefined> {
  return (await listInstalledWorkflows(dir)).find((w) => w.name === name)?.files?.[0]
}

/**
 * Built-in Claude Code agents that need no install (per the Agent tool's `subagent_type` list in Claude Code 2.1.x; not yet
 * checked against the docs). An `agentType` pointing to them is never treated as missing.
 */
export const BUILTIN_AGENTS = ['claude', 'claude-code-guide', 'Explore', 'general-purpose', 'Plan', 'statusline-setup']

/**
 * Warns about Workflows that call an unprefixed `agentType` or `workflow('<name>')` the Scope will not have (ADR 0010).
 * Only warns, never installs; names built at runtime are not detected. `scripts` is the content of the Workflows the Scope
 * will have.
 */
export function missingDependencyNotices(
  scripts: { name: string; text: string }[],
  known: { agents: Iterable<string>; workflows: Iterable<string> },
): string[] {
  const agents = new Set([...BUILTIN_AGENTS, ...known.agents])
  const workflows = new Set([...known.workflows, ...scripts.map((s) => s.name)])
  const notices: string[] = []
  for (const { name, text } of scripts) {
    const refs = workflowRefs(text)
    for (const type of refs.agentTypes.filter((t) => !t.includes(':') && !agents.has(t))) {
      notices.push(`workflow "${name}" uses agent "${type}", which is neither declared nor installed; it may fail when run`)
    }
    for (const called of refs.workflows.filter((w) => !workflows.has(w))) {
      notices.push(`workflow "${name}" calls workflow "${called}", which is neither declared nor installed; it may fail when run`)
    }
  }
  return notices
}

/**
 * Why Claude Code will not run any workflow, or `undefined`: `CLAUDE_CODE_DISABLE_WORKFLOWS`, or
 * `disableWorkflows: true` / `enableWorkflows: false` in the highest-priority settings file that sets the key (local > project
 * > user). The per-plan default can't be inferred (Pro has it off), so a missing key counts as enabled.
 */
export async function workflowsSwitchedOff(location: Location, env: NodeJS.ProcessEnv): Promise<string | undefined> {
  const flag = env.CLAUDE_CODE_DISABLE_WORKFLOWS
  if (flag && !['0', 'false'].includes(flag.toLowerCase())) return 'CLAUDE_CODE_DISABLE_WORKFLOWS is set'
  const layers = await Promise.all(
    (['local', 'project', 'user'] as const).map(async (scope) => ({
      path: settingsPath(scope, location),
      settings: await readJson<Record<string, unknown>>(settingsPath(scope, location)).catch(() => ({}) as Record<string, unknown>),
    })),
  )
  for (const key of ['disableWorkflows', 'enableWorkflows'] as const) {
    const layer = layers.find((l) => typeof l.settings?.[key] === 'boolean')
    if (layer && layer.settings[key] === (key === 'disableWorkflows')) return `${layer.path} sets ${key}: ${layer.settings[key]}`
  }
  return undefined
}

function isCandidate(file: string): boolean {
  return file.endsWith('.js') && !file.startsWith('_') && !/\.test\.[^.]+$/.test(file)
}

async function isDir(path: string): Promise<boolean> {
  return lstat(path).then((s) => s.isDirectory(), () => false)
}

function hash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}
