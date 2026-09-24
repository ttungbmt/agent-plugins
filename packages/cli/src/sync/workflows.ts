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

/** Bản cài workflow: mọi `*.js` ngay trong thư mục có `meta.name` hợp lệ, định danh bằng `meta.name`. */
export async function listInstalledWorkflows(dir: string): Promise<InstalledItem[]> {
  const workflows: InstalledItem[] = []
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if ((!entry.isFile() && !entry.isSymbolicLink()) || !entry.name.endsWith('.js')) continue
    const text = await readFile(join(dir, entry.name)).catch(() => undefined)
    const name = text && workflowName(text.toString('utf8'))
    if (name === undefined || !text) continue
    workflows.push({ name, symlink: entry.isSymbolicLink(), sha256: hash(text) })
  }
  return workflows
}

/** Copy đúng file Workflow vào `<dir>/<meta.name>.js`; tên file trong nguồn không được giữ. */
export async function installWorkflow(from: string, dir: string, name: string): Promise<void> {
  const target = join(dir, `${name}.js`)
  await rm(target, { force: true })
  await mkdir(dir, { recursive: true })
  await copyFile(from, target)
}

export async function removeWorkflow(dir: string, name: string): Promise<void> {
  await rm(join(dir, `${name}.js`), { force: true })
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
