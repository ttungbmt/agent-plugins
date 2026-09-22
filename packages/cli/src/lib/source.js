import {execFileSync} from 'node:child_process'
import {chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync} from 'node:fs'
import {join, resolve} from 'node:path'

import {addRoot, forceRemove} from './store.js'

/**
 * Fetch an immutable snapshot of a Package source into the shared store.
 *
 * Keyed by <pkg>@<sha>, so the same bytes are fetched once per machine rather
 * than once per project. Existing snapshots are reused without touching the
 * network — the ref pins the content, so there is nothing to refresh.
 *
 * ADR 0010 D7 — "Thư mục snapshot ... được đặt tên theo digest/SHA và bất biến."
 */
export function ensureSnapshot(pkg, storeDir, projectRoot) {
  const {ref, type, url} = pkg.spec.source

  if (type !== 'git') {
    throw new Error(`SOURCE_TYPE_UNSUPPORTED: "${type}" (V1 supports git only)`)
  }

  if (!/^[0-9a-f]{40}$/.test(ref)) {
    // security-model.md:839-845 — main/latest/HEAD are not lockable.
    throw new Error(`SOURCE_REF_NOT_IMMUTABLE: "${ref}" is not a 40-char commit SHA`)
  }

  const key = `${pkg.metadata.id}@${ref}`
  const dir = resolve(storeDir, key)

  if (existsSync(join(dir, '.git'))) {
    // Re-freeze on reuse: a snapshot that was unfrozen by hand (or by an
    // interrupted prune) must not stay writable, or one project's stray write
    // corrupts every project linking into it.
    if ((statSync(dir).mode & 0o222) !== 0) makeReadOnly(dir)
    addRoot(key, projectRoot)
    return {cached: true, dir, key}
  }

  // Clone into a private temp dir, then move it into place in one step. Two
  // projects syncing the same sha concurrently would otherwise be able to read
  // a half-written tree.
  mkdirSync(storeDir, {recursive: true})
  const staging = `${dir}.tmp-${process.pid}`
  forceRemove(staging)
  mkdirSync(staging, {recursive: true})

  try {
    const git = (...args) => execFileSync('git', args, {cwd: staging, stdio: 'pipe'})

    git('init', '-q', '.')
    git('remote', 'add', 'origin', url)
    git('fetch', '-q', '--depth', '1', 'origin', ref)
    git('checkout', '-q', 'FETCH_HEAD')

    const head = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: staging, encoding: 'utf8'}).trim()
    if (head !== ref) {
      throw new Error(`SOURCE_INTEGRITY_MISMATCH: expected ${ref}, checked out ${head}`)
    }

    try {
      // Read-only, after Go's module cache and the Nix store: the snapshot is
      // immutable by its key, and projects link into it, so an accidental write
      // here would corrupt every project sharing it.
      makeReadOnly(staging)
      renameSync(staging, dir)
    } catch (error) {
      // Someone else won the race and the snapshot already exists. Their copy
      // is byte-identical to ours, so drop ours. Anything else is a real
      // failure and must keep its cause — swallowing it hid a chmod bug once.
      if (!existsSync(join(dir, '.git'))) {
        throw new Error(`SOURCE_STORE_WRITE_FAILED: ${dir}`, {cause: error})
      }
    }
  } finally {
    forceRemove(staging)
  }

  addRoot(key, projectRoot)
  return {cached: false, dir, key}
}

/**
 * Freeze a snapshot. Read-only, after Go's module cache and the Nix store:
 * the tree is immutable by its key and projects link into it, so an accidental
 * write here would corrupt every project sharing it.
 */
function makeReadOnly(path) {
  const walk = (dir) => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const full = join(dir, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        walk(full)
        chmodSync(full, 0o555)
      } else {
        chmodSync(full, 0o444)
      }
    }
  }

  walk(path)
  chmodSync(path, 0o555)
}

/**
 * Read the Components a Package actually ships.
 *
 * We read the upstream plugin manifest rather than globbing the tree:
 * mattpocock/skills carries 38 SKILL.md but ships only 25.
 */
export function readComponents(pkg, snapshotDir) {
  const manifestRel = pkg.spec.discovery?.manifest
  if (!manifestRel) {
    throw new Error(`package "${pkg.metadata.id}" has no spec.discovery.manifest`)
  }

  const manifest = JSON.parse(readFileSync(join(snapshotDir, manifestRel), 'utf8'))
  const components = new Map()

  for (const rel of manifest.skills ?? []) {
    const skillPath = join(snapshotDir, rel, 'SKILL.md')
    const raw = readFileSync(skillPath, 'utf8')
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)
    const frontmatter = match ? match[1] : ''
    const body = match ? raw.slice(match[0].length) : raw
    const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? rel.split('/').pop()

    components.set(name, {body, name, sourcePath: rel, type: 'skill'})
  }

  return {components, upstreamVersion: manifest.version ?? '0.0.0'}
}
