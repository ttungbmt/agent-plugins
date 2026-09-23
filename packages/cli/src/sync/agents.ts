import { createHash } from 'node:crypto'
import { copyFile, mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { claudeDir, type Location } from './files.js'
import { frontmatterName, ITEM_NAME, type FoundItem, type InstalledItem, type ItemHandler } from './items.js'
import type { Scope } from './types.js'

export const AGENTS: ItemHandler = {
  kind: 'agent',
  dir: agentsDir,
  find: (root, source) => findAgents(root, typeof source.path === 'string'),
  list: listInstalledAgents,
  install: installAgent,
  remove: removeAgent,
}

/** Thư mục agents Claude Code đọc cho từng Scope; scope `local` không có thư mục riêng. */
export function agentsDir(scope: Scope, location: Location): string | null {
  if (scope === 'local') return null
  return scope === 'project' ? join(location.cwd, '.claude/agents') : join(claudeDir(location), 'agents')
}

/**
 * Tìm Agent trong một nguồn đã tải, không đệ quy, dừng ở chỗ đầu tiên có Agent: `agents/*.md` → `.claude/agents/*.md`
 * → `*.md`. Chỉ file có `name` trong frontmatter là Agent (để bỏ `README.md`, `CLAUDE.md`…); riêng khi nguồn khai báo
 * `path` (`explicit`), file thiếu `name` vẫn là Agent, tên lấy từ tên file.
 */
export async function findAgents(root: string, explicit: boolean): Promise<FoundItem[]> {
  for (const dir of [join(root, 'agents'), join(root, '.claude/agents'), root]) {
    const files = (await readdir(dir, { withFileTypes: true }).catch(() => []))
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name)
      .sort()
    const agents: FoundItem[] = []
    for (const file of files) {
      const path = join(dir, file)
      const text = await readFile(path)
      const name = frontmatterName(text.toString('utf8')) ?? (explicit ? basename(file, '.md') : undefined)
      if (name === undefined) continue
      if (!ITEM_NAME.test(name)) throw new Error(`agent at ${path} has an invalid name "${name}"`)
      agents.push({ name, path, sha256: hash(text) })
    }
    if (agents.length) return agents
  }
  return []
}

/** Bản cài agent của một thư mục agents: mỗi file `<name>.md`; file là symlink thì băm nội dung nó trỏ tới. */
export async function listInstalledAgents(dir: string): Promise<InstalledItem[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const agents: InstalledItem[] = []
  for (const entry of entries) {
    if ((!entry.isFile() && !entry.isSymbolicLink()) || !entry.name.endsWith('.md')) continue
    const sha256 = await readFile(join(dir, entry.name)).then(hash, () => '')
    agents.push({ name: basename(entry.name, '.md'), symlink: entry.isSymbolicLink(), sha256 })
  }
  return agents
}

/** Copy đúng file Agent vào `<dir>/<name>.md`, không kéo theo file nào khác nó nhắc tới. */
export async function installAgent(from: string, dir: string, name: string): Promise<void> {
  const target = join(dir, `${name}.md`)
  await rm(target, { force: true })
  await mkdir(dir, { recursive: true })
  await copyFile(from, target)
}

export async function removeAgent(dir: string, name: string): Promise<void> {
  await rm(join(dir, `${name}.md`), { force: true })
}

function hash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}
