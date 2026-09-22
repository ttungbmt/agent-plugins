import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Scope } from './types.js'

export const SCOPES = ['project', 'local', 'user'] as const satisfies readonly Scope[]

/** Thư mục repo (chứa Config) và thư mục home: đủ để định vị mọi file `ap` đọc/ghi. */
export type Location = { cwd: string; homedir: string }

/** File settings của Claude Code cho từng Scope. */
export function settingsPath(scope: Scope, { cwd, homedir }: Location): string {
  return {
    project: join(cwd, '.claude/settings.json'),
    local: join(cwd, '.claude/settings.local.json'),
    user: join(homedir, '.claude/settings.json'),
  }[scope]
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8').catch(() => '{}'))
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + '\n')
}
