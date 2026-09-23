import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Scope } from './types.js'

export const SCOPES = ['project', 'local', 'user'] as const satisfies readonly Scope[]

/**
 * Thư mục repo (chứa Config) và thư mục home: đủ để định vị mọi file `ap` đọc/ghi.
 * `claudeDir` là thư mục config của Claude Code (`CLAUDE_CONFIG_DIR`), mặc định `~/.claude`.
 */
export type Location = { cwd: string; homedir: string; claudeDir?: string }

export function claudeDir({ homedir, claudeDir }: Location): string {
  return claudeDir ?? join(homedir, '.claude')
}

/** Nơi Claude Code ghi Bản cài plugin của mọi scope trên máy. */
export function installedPluginsPath(location: Location): string {
  return join(claudeDir(location), 'plugins/installed_plugins.json')
}

/**
 * `.claude.json` của Claude Code: chứa MCP server của scope `user` (`mcpServers`) và `local` (`projects[<cwd>].mcpServers`).
 * Nằm trong `CLAUDE_CONFIG_DIR` khi biến này được đặt, còn không thì ở home (không phải `~/.claude`).
 */
export function claudeJsonPath({ homedir, claudeDir }: Location): string {
  return join(claudeDir ?? homedir, '.claude.json')
}

/** File settings của Claude Code cho từng Scope. */
export function settingsPath(scope: Scope, location: Location): string {
  return {
    project: join(location.cwd, '.claude/settings.json'),
    local: join(location.cwd, '.claude/settings.local.json'),
    user: join(claudeDir(location), 'settings.json'),
  }[scope]
}

export async function readJson<T>(path: string): Promise<T> {
  // File rỗng (vd. `.mcp.json` vừa tạo tay) được đọc như file không có gì.
  const text = await readFile(path, 'utf8').catch(() => '')
  return JSON.parse(text.trim() || '{}')
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + '\n')
}
