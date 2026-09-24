import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Scope } from './types.js'

export const SCOPES = ['project', 'local', 'user'] as const satisfies readonly Scope[]

/**
 * The repo directory (holding the Config) and the home directory: enough to locate every file `ap` reads or writes.
 * `claudeDir` is Claude Code's config directory (`CLAUDE_CONFIG_DIR`), defaulting to `~/.claude`.
 */
export type Location = { cwd: string; homedir: string; claudeDir?: string }

export function claudeDir({ homedir, claudeDir }: Location): string {
  return claudeDir ?? join(homedir, '.claude')
}

/** Where Claude Code records the Installed plugins of every scope on the machine. */
export function installedPluginsPath(location: Location): string {
  return join(claudeDir(location), 'plugins/installed_plugins.json')
}

/**
 * Claude Code's `.claude.json`: holds the MCP servers of the `user` scope (`mcpServers`) and the `local` scope
 * (`projects[<cwd>].mcpServers`). Lives in `CLAUDE_CONFIG_DIR` when that variable is set, otherwise in home (not
 * `~/.claude`).
 */
export function claudeJsonPath({ homedir, claudeDir }: Location): string {
  return join(claudeDir ?? homedir, '.claude.json')
}

/** Claude Code's settings file for each Scope. */
export function settingsPath(scope: Scope, location: Location): string {
  return {
    project: join(location.cwd, '.claude/settings.json'),
    local: join(location.cwd, '.claude/settings.local.json'),
    user: join(claudeDir(location), 'settings.json'),
  }[scope]
}

export async function readJson<T>(path: string): Promise<T> {
  // An empty file (e.g. a freshly hand-created `.mcp.json`) is read as an empty object.
  const text = await readFile(path, 'utf8').catch(() => '')
  return JSON.parse(text.trim() || '{}')
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + '\n')
}
