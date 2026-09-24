import { createHash } from 'node:crypto'
import { copyFile, lstat, mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { claudeDir, type Location } from './files.js'
import type { FoundItem, InstalledItem, ItemHandler } from './items.js'
import type { ItemSource, Scope } from './types.js'
import { workflowName } from './workflow-meta.js'

export const WORKFLOWS: ItemHandler = {
  kind: 'workflow',
  dir: workflowsDir,
  find: findWorkflows,
  list: listInstalledWorkflows,
  install: installWorkflow,
  remove: removeWorkflow,
}

/** Thư mục workflows Claude Code đọc cho từng Scope; scope `local` không có thư mục riêng. */
export function workflowsDir(scope: Scope, location: Location): string | null {
  if (scope === 'local') return null
  return scope === 'project' ? join(location.cwd, '.claude/workflows') : join(claudeDir(location), 'workflows')
}

/**
 * Tìm Workflow trong một nguồn đã tải (ADR 0010): file `*.js` ngay trong gốc workflows (không đệ quy, vì Claude Code
 * không tìm trong thư mục con), bỏ `*.test.*` và `_*`, và chỉ nhận file có `meta` literal với `name` hợp lệ. Gốc của
 * nguồn `github`/`git` là `path` khi có khai báo, còn không thì `workflows/` (không dò `.claude/workflows/`, nơi repo
 * nguồn để workflow của chính nó). Nguồn `directory` dùng `workflows/` của nó nếu có, còn không thì chính nó.
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
    workflows.push({ name, path, sha256: hash(text) })
  }
  return workflows.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Bản cài workflow: mọi `*.js` ngay trong thư mục có `meta.name` hợp lệ, định danh bằng `meta.name` (ADR 0010), nên
 * file người dùng tự đặt tên khác vẫn khớp được khai báo. Nhiều file cùng tên gộp thành một Bản cài; file dùng làm Bản
 * cài là `<name>.js` nếu có, còn không thì file đầu tiên theo tên.
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
 * Ghi file Workflow thành `<dir>/<meta.name>.js`. Bản cài cũ mang tên này mà khác tên file (đã nhận quản lý, hoặc bị
 * thay bằng `--force`) bị gỡ, để chỉ còn một file; symlink chỉ bị gỡ link. File cùng tên khác không bị đụng tới.
 */
export async function installWorkflow(from: string, dir: string, name: string): Promise<void> {
  const current = await installedFile(dir, name)
  if (current) await rm(join(dir, current), { force: true })
  const target = join(dir, `${name}.js`)
  await rm(target, { force: true })
  await mkdir(dir, { recursive: true })
  await copyFile(from, target)
}

/** Gỡ đúng file là Bản cài của `name`, dù tên file là gì. */
export async function removeWorkflow(dir: string, name: string): Promise<void> {
  const current = await installedFile(dir, name)
  if (current) await rm(join(dir, current), { force: true })
}

async function installedFile(dir: string, name: string): Promise<string | undefined> {
  return (await listInstalledWorkflows(dir)).find((w) => w.name === name)?.files?.[0]
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
