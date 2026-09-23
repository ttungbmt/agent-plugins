import { createHash } from 'node:crypto'
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, readlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative, resolve } from 'node:path'
import { claudeDir, type Location } from './files.js'
import type { Exec } from './registry.js'
import { frontmatterName, ITEM_NAME, type FoundItem, type InstalledItem, type ItemHandler } from './items.js'
import type { ItemSource, Scope } from './types.js'

/** Nguồn đã tải về một thư mục: `commit` là commit đã checkout, `null` với nguồn `directory`. */
export type FetchedSource = { dir: string; commit: string | null; cleanup(): Promise<void> }
/** Tải một Nguồn skill/Nguồn agent, ở đúng `commit` khi đã ghim, còn không thì ở `ref` của nó (hoặc nhánh mặc định). */
export type FetchSkillSource = (source: ItemSource, commit: string | null) => Promise<FetchedSource>

export const SKILLS: ItemHandler = {
  kind: 'skill',
  dir: skillsDir,
  find: (root, source) => findSkills(root, sourceBasename(source)),
  list: listInstalledSkills,
  install: installSkill,
  remove: removeSkill,
}

/** Thư mục skills Claude Code đọc cho từng Scope; scope `local` không có thư mục riêng. */
export function skillsDir(scope: Scope, location: Location): string | null {
  if (scope === 'local') return null
  return scope === 'project' ? join(location.cwd, '.claude/skills') : join(claudeDir(location), 'skills')
}

/** Tải nguồn bằng `git` (ADR 0005): clone nông ở `ref`, hoặc fetch nông đúng commit đã ghim. */
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
 * Tìm Skill trong một nguồn đã tải, dừng ở chỗ đầu tiên có Skill: `SKILL.md` ở gốc → `skills/*\/SKILL.md` → `*\/SKILL.md`.
 * Tên lấy từ `name` trong frontmatter, thiếu thì là tên thư mục (`fallback` cho Skill ở gốc).
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

/** Thư mục chứa Skill/Agent trong một nguồn đã tải: gốc nguồn, hoặc `path` của nguồn `github`/`git`. */
export function sourceRoot(fetched: FetchedSource, source: ItemSource): string {
  return source.source !== 'directory' && typeof source.path === 'string' ? join(fetched.dir, source.path) : fetched.dir
}

/** Tên dự phòng cho Skill ở gốc thư mục chứa Skill: tên thư mục `path`, repo hoặc thư mục nguồn. */
export function sourceBasename(source: ItemSource): string {
  const where = String(source.source === 'directory' ? source.path : (source.path ?? source.repo ?? source.url))
  return basename(where.replace(/\.git$/, '').replace(/\/+$/, ''))
}

/** Bản cài skill của một thư mục skills; thư mục là symlink thì băm nội dung nó trỏ tới. */
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

/** sha256 nội dung một thư mục: đường dẫn tương đối và nội dung mọi file (bỏ `.git`), theo thứ tự cố định. */
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
