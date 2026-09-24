import { createHash } from 'node:crypto'
import { copyFile, lstat, mkdir, readdir, readFile, rm, rmdir } from 'node:fs/promises'
import { basename, dirname, join, posix, relative } from 'node:path'
import { claudeDir, type Location } from './files.js'
import { ITEM_NAME, type FoundItem, type InstalledItem, type ItemHandler } from './items.js'
import type { ItemSource, Scope } from './types.js'

export const RULES: ItemHandler = {
  kind: 'rule',
  dir: rulesDir,
  find: findRules,
  namespace: defaultNamespace,
  list: listInstalledRules,
  install: installRule,
  remove: removeRule,
}

/** Thư mục rules Claude Code đọc cho từng Scope; scope `local` không có thư mục riêng. */
export function rulesDir(scope: Scope, location: Location): string | null {
  if (scope === 'local') return null
  return scope === 'project' ? join(location.cwd, '.claude/rules') : join(claudeDir(location), 'rules')
}

/** Namespace mặc định: tên repo (`github`), tên cuối URL bỏ `.git` (`git`) hoặc tên thư mục (`directory`), viết thường. */
export function defaultNamespace(source: ItemSource): string {
  const where = String(source.source === 'github' ? source.repo : source.source === 'git' ? source.url : source.path)
  const name = basename(where.replace(/\/+$/, '').replace(/\.git$/, '')).toLowerCase()
  if (!ITEM_NAME.test(name)) throw new Error(`cannot name a rules namespace after "${where}"`)
  return name
}

/**
 * Tìm Rule trong một nguồn đã tải (ADR 0009): mọi `*.md` đệ quy dưới gốc rules, bỏ `README.md` ở mọi cấp và thư mục
 * bắt đầu bằng `.`. Gốc rules của nguồn `github`/`git` là `path` khi có khai báo, còn không thì `rules/` (không dò
 * `.claude/rules/` hay gốc repo). Nguồn `directory` là thư mục người dùng tự chỉ ra, nên dùng `rules/` của nó nếu có,
 * còn không thì chính nó.
 */
export async function findRules(root: string, source: ItemSource): Promise<FoundItem[]> {
  const explicit = source.source === 'directory' || typeof source.path === 'string'
  const nested = join(root, 'rules')
  const base = !explicit || (source.source === 'directory' && (await isDir(nested))) ? nested : root
  if (!(await isDir(base))) throw new Error(`no rules/ directory in the source; declare \`path\` to point at its rules`)
  const rules: FoundItem[] = []
  for (const path of await markdownFiles(base)) {
    const name = relative(base, path).split(/[\\/]/).join('/').replace(/\.md$/, '')
    if (!name.split('/').every((segment) => ITEM_NAME.test(segment))) throw new Error(`rule at ${path} has an invalid path "${name}"`)
    rules.push({ name, path, sha256: hash(await readFile(path)) })
  }
  return rules
}

/**
 * Bản cài rule trong các Namespace cho trước, định danh `<namespace>/<đường dẫn>`. File ngoài các Namespace đó (của
 * người dùng) không được liệt kê; file là symlink thì băm nội dung nó trỏ tới. Namespace là symlink (vd. người dùng
 * `ln -s` tới bản checkout của mình) là một Bản cài symlink tên `<namespace>`, không liệt kê gì bên trong, để mọi Rule
 * dưới nó là Manual entry và `ap` không ghi xuyên qua link.
 */
export async function listInstalledRules(dir: string, namespaces: string[]): Promise<InstalledItem[]> {
  const rules: InstalledItem[] = []
  for (const namespace of namespaces) {
    const root = join(dir, namespace)
    if (await isSymlink(root)) {
      rules.push({ name: namespace, symlink: true, sha256: '' })
      continue
    }
    if (!(await isDir(root))) continue
    for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
      if ((!entry.isFile() && !entry.isSymbolicLink()) || !entry.name.endsWith('.md')) continue
      const path = join(entry.parentPath, entry.name)
      const name = posix.join(namespace, ...relative(root, path).split(/[\\/]/)).replace(/\.md$/, '')
      rules.push({ name, symlink: entry.isSymbolicLink(), sha256: await readFile(path).then(hash, () => '') })
    }
  }
  return rules
}

/**
 * Copy đúng file Rule vào `<dir>/<namespace>/<đường dẫn>.md`, giữ cấu trúc thư mục để link tương đối vẫn đúng.
 * Namespace là symlink (chỉ tới đây khi `--force`) thì chỉ gỡ link, không đụng thứ nó trỏ tới.
 */
export async function installRule(from: string, dir: string, name: string): Promise<void> {
  const namespace = join(dir, name.split('/')[0]!)
  if (await isSymlink(namespace)) await rm(namespace)
  const target = join(dir, `${name}.md`)
  await rm(target, { force: true })
  await mkdir(dirname(target), { recursive: true })
  await copyFile(from, target)
}

/** Gỡ file Rule, rồi các thư mục cha đã rỗng tới hết Namespace. */
export async function removeRule(dir: string, name: string): Promise<void> {
  const target = join(dir, `${name}.md`)
  await rm(target, { force: true })
  for (let parent = dirname(target); parent !== dir; parent = dirname(parent)) {
    if (!(await rmdir(parent).then(() => true, () => false))) break
  }
}

async function markdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)))
    else if (entry.isFile() && entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') files.push(path)
  }
  return files.sort()
}

async function isSymlink(path: string): Promise<boolean> {
  return lstat(path).then((s) => s.isSymbolicLink(), () => false)
}

async function isDir(path: string): Promise<boolean> {
  return lstat(path).then((s) => s.isDirectory(), () => false)
}

function hash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}
