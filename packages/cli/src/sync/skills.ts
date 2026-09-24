import { createHash } from 'node:crypto'
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, readlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative, resolve } from 'node:path'
import { claudeDir, type Location } from './files.js'
import type { Exec } from './registry.js'
import { frontmatterName, ITEM_NAME, type FoundItem, type InstalledItem, type ItemHandler } from './items.js'
import type { ItemSource, Scope } from './types.js'

/** A source fetched into a directory: `commit` is the checked-out commit, `null` for a `directory` source. */
export type FetchedSource = { dir: string; commit: string | null; cleanup(): Promise<void> }
/** Fetch a Skill source or Agent source at its pinned `commit` if any, otherwise at its `ref` (or the default branch). */
export type FetchSkillSource = (source: ItemSource, commit: string | null) => Promise<FetchedSource>

export const SKILLS: ItemHandler = {
  kind: 'skill',
  dir: skillsDir,
  find: (root, source) => findSkills(root, sourceBasename(source)),
  list: listInstalledSkills,
  install: installSkill,
  remove: removeSkill,
}

/** Skills directory Claude Code reads for each Scope; the `local` scope has no directory of its own. */
export function skillsDir(scope: Scope, location: Location): string | null {
  if (scope === 'local') return null
  return scope === 'project' ? join(location.cwd, '.claude/skills') : join(claudeDir(location), 'skills')
}

/** Fetch a source with `git` (ADR 0005): a shallow clone at `ref`, or a shallow fetch of exactly the pinned commit. */
export function createGitFetcher(exec: Exec, cwd: string): FetchSkillSource {
  async function git(...args: string[]) {
    const result = await exec('git', args)
    if (result.code !== 0) throw new Error(result.stderr.trim() || `git ${args[0]} exited with ${result.code}`)
    return result.stdout.trim()
  }

  return async (source, commit) => {
    if (source.source === 'directory') return { dir: resolve(cwd, source.path as string), commit: null, cleanup: async () => {} }
    const url = source.source === 'github' ? `https://github.com/${source.repo}.git` : (source.url as string)
    const dir = await mkdtemp(join(tmpdir(), 'ap-skills-'))
    const cleanup = () => rm(dir, { recursive: true, force: true })
    try {
      if (commit) {
        await git('init', '-q', dir)
        await git('-C', dir, 'fetch', '-q', '--depth', '1', url, commit)
        await git('-C', dir, 'checkout', '-q', 'FETCH_HEAD')
      } else {
        const ref = typeof source.ref === 'string' ? ['--branch', source.ref] : []
        await git('clone', '-q', '--depth', '1', ...ref, url, dir)
      }
      return { dir, commit: await git('-C', dir, 'rev-parse', 'HEAD'), cleanup }
    } catch (error) {
      await cleanup()
      throw error
    }
  }
}

/**
 * Find the Skills in a fetched source, stopping at the first place that has any: `SKILL.md` at the root →
 * `skills/*\/SKILL.md` → `*\/SKILL.md`.
 * The name comes from `name` in the frontmatter, falling back to the directory name (`fallback` for a Skill at the root).
 */
export async function findSkills(root: string, fallback: string): Promise<FoundItem[]> {
  if (await isFile(join(root, 'SKILL.md'))) return [await found(root, fallback)]
  for (const parent of [join(root, 'skills'), root]) {
    const dirs = (await readdir(parent, { withFileTypes: true }).catch(() => []))
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => join(parent, e.name))
    const skills = []
    for (const dir of dirs.sort()) if (await isFile(join(dir, 'SKILL.md'))) skills.push(await found(dir, basename(dir)))
    if (skills.length) return skills
  }
  return []
}

async function found(dir: string, fallback: string): Promise<FoundItem> {
  const name = frontmatterName(await readFile(join(dir, 'SKILL.md'), 'utf8')) ?? fallback
  if (!ITEM_NAME.test(name)) throw new Error(`skill at ${dir} has an invalid name "${name}"`)
  return { name, path: dir, sha256: await hashDir(dir) }
}

/** Directory holding the Skills/Agents in a fetched source: the source root, or the `path` of a `github`/`git` source. */
export function sourceRoot(fetched: FetchedSource, source: ItemSource): string {
  return source.source !== 'directory' && typeof source.path === 'string' ? join(fetched.dir, source.path) : fetched.dir
}

/** Fallback name for a Skill at the root of its containing directory: the `path` directory, repo or source directory name. */
export function sourceBasename(source: ItemSource): string {
  const where = String(source.source === 'directory' ? source.path : (source.path ?? source.repo ?? source.url))
  return basename(where.replace(/\.git$/, '').replace(/\/+$/, ''))
}

/** Installed skills in a skills directory; a symlinked directory hashes the content it points to. */
export async function listInstalledSkills(dir: string): Promise<InstalledItem[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const skills: InstalledItem[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    const path = join(dir, entry.name)
    skills.push({ name: entry.name, symlink: entry.isSymbolicLink(), sha256: await hashDir(path).catch(() => '') })
  }
  return skills
}

export async function installSkill(from: string, dir: string, name: string): Promise<void> {
  const target = join(dir, name)
  await rm(target, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  await cp(from, target, { recursive: true, filter: (src) => basename(src) !== '.git' })
}

export async function removeSkill(dir: string, name: string): Promise<void> {
  await rm(join(dir, name), { recursive: true, force: true })
}

/** sha256 of a directory's content: the relative path and content of every file (skipping `.git`), in a fixed order. */
export async function hashDir(root: string): Promise<string> {
  const hash = createHash('sha256')
  const base = await realDir(root)
  const walk = async (dir: string) => {
    const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))
    for (const entry of entries) {
      if (entry.name === '.git') continue
      const path = join(dir, entry.name)
      const rel = relative(base, path)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isSymbolicLink()) hash.update(`link\0${rel}\0${await readlink(path)}\0`)
      else hash.update(`file\0${rel}\0`).update(await readFile(path)).update('\0')
    }
  }
  await walk(base)
  return hash.digest('hex')
}

async function realDir(path: string): Promise<string> {
  const info = await lstat(path)
  return info.isSymbolicLink() ? resolve(join(path, '..'), await readlink(path)) : path
}

async function isFile(path: string): Promise<boolean> {
  return lstat(path).then((s) => s.isFile(), () => false)
}
