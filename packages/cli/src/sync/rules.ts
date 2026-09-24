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

/** Rules directory Claude Code reads for each Scope; the `local` scope has no directory of its own. */
export function rulesDir(scope: Scope, location: Location): string | null {
  if (scope === 'local') return null
  return scope === 'project' ? join(location.cwd, '.claude/rules') : join(claudeDir(location), 'rules')
}

/** Default Namespace: the repo name (`github`), last URL segment sans `.git` (`git`) or directory name (`directory`), lowercased. */
export function defaultNamespace(source: ItemSource): string {
  const where = String(source.source === 'github' ? source.repo : source.source === 'git' ? source.url : source.path)
  const name = basename(where.replace(/\/+$/, '').replace(/\.git$/, '')).toLowerCase()
  if (!ITEM_NAME.test(name)) throw new Error(`cannot name a rules namespace after "${where}"`)
  return name
}

/**
 * Find the Rules in a fetched source (ADR 0009): every `*.md` recursively under the rules root, skipping `README.md` at
 * every level and directories starting with `.`. The rules root of a `github`/`git` source is `path` when declared,
 * otherwise `rules/` (without probing `.claude/rules/` or the repo root). A `directory` source is a directory the user
 * points at directly, so its `rules/` is used if present, otherwise the directory itself.
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
 * Installed rules in the given Namespaces, identified as `<namespace>/<path>`. Files outside those Namespaces (the
 * user's own) are not listed; a symlinked file hashes the content it points to. A Namespace that is a symlink (e.g. the
 * user ran `ln -s` to their own checkout) is one symlinked Installed rule named `<namespace>`, with nothing listed inside,
 * so every Rule beneath it is a Manual entry and `ap` never writes through the link.
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
 * Copy exactly the Rule file to `<dir>/<namespace>/<path>.md`, keeping the directory structure so relative links still work.
 * If the Namespace is a symlink (only reached with `--force`), only the link is removed, never what it points to.
 */
export async function installRule(from: string, dir: string, name: string): Promise<void> {
  const namespace = join(dir, name.split('/')[0]!)
  if (await isSymlink(namespace)) await rm(namespace)
  const target = join(dir, `${name}.md`)
  await rm(target, { force: true })
  await mkdir(dirname(target), { recursive: true })
  await copyFile(from, target)
}

/** Remove a Rule file, then its now-empty parent directories up to the Namespace. */
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
