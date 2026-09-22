import {execFileSync} from 'node:child_process'
import {chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync} from 'node:fs'
import {basename, join, resolve} from 'node:path'

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
 * The Claude Code plugin layout, and how each slot shapes a Component on disk.
 *
 * A skill is a DIRECTORY carrying SKILL.md plus its supporting files; an agent
 * or a command is a single flat .md. `sourcePath` therefore points at whichever
 * of the two a Component actually is, and build.js has to tell them apart.
 */
const LAYOUTS = [
  {dir: 'skills', entry: 'SKILL.md', type: 'skill'},
  {dir: 'agents', type: 'agent'},
  {dir: 'commands', type: 'command'},
]

/** Package-level activation surfaces Policy can forbid (ADR 0010 D5). */
const EXECUTABLES = [
  {key: 'hooks', path: 'hooks', type: 'hook'},
  {key: 'mcpServers', path: '.mcp.json', type: 'mcp'},
  {key: 'lspServers', type: 'lsp'},
]

/** `name:` from the frontmatter, falling back to the path — never the body. */
function parseComponent(raw, fallbackName) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  const frontmatter = match ? match[1] : ''
  return {
    body: match ? raw.slice(match[0].length) : raw,
    name: frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? fallbackName,
    // The exact bytes on disk. build.js digests these rather than re-reading,
    // which keeps computeVersion pure and works for a flat agent .md as well
    // as a skill directory.
    raw,
  }
}

function add(components, entry, packageId) {
  const existing = components.get(entry.name)
  if (existing) {
    // catalog-spec.md:1396 — discovery fails on a collision rather than
    // overwriting. Unreachable until ADR 0013 D2 made types real, because
    // everything used to be a skill in one flat namespace.
    throw new Error(
      `DUPLICATE_COMPONENT: "${entry.name}" is both ${existing.type} and ${entry.type} in ${packageId}`,
    )
  }

  components.set(entry.name, entry)
}

/**
 * Read the Components a Package actually ships.
 *
 * Two strategies, declared per Package, with no fallback between them
 * (ADR 0013 D1):
 *
 *   manifest    the upstream plugin manifest enumerates them. mattpocock/skills
 *               carries 38 SKILL.md and ships 25, so its tree is not its
 *               shipping list.
 *   convention  the documented plugin layout is the list. Five of the six
 *               reference ecosystems in README.md carry no component arrays at
 *               all — superpowers, frontend-design, code-simplifier,
 *               security-guidance and wshobson/agents.
 *
 * Reading a manifest that enumerates nothing is an error, not an empty result:
 * that case used to install an empty projection and report success.
 */
export function readComponents(pkg, snapshotDir) {
  const strategy = pkg.spec.discovery?.strategy
  if (strategy === 'manifest') return fromManifest(pkg, snapshotDir)
  if (strategy === 'convention') return fromConvention(pkg, snapshotDir)
  throw new Error(`package "${pkg.metadata.id}" has no spec.discovery.strategy`)
}

function fromManifest(pkg, snapshotDir) {
  const manifestRel = pkg.spec.discovery?.manifest
  if (!manifestRel) {
    throw new Error(`package "${pkg.metadata.id}" has no spec.discovery.manifest`)
  }

  const manifest = JSON.parse(readFileSync(join(snapshotDir, manifestRel), 'utf8'))
  const components = new Map()
  let enumerated = false

  for (const {dir, entry, type} of LAYOUTS) {
    const listed = manifest[dir]
    if (!Array.isArray(listed)) continue
    enumerated = true

    for (const rel of listed) {
      const path = entry ? join(snapshotDir, rel, entry) : join(snapshotDir, rel)
      const fallback = basename(rel, '.md')
      add(components, {...parseComponent(readFileSync(path, 'utf8'), fallback), sourcePath: rel, type}, pkg.metadata.id)
    }
  }

  if (!enumerated) {
    throw new Error(
      `DISCOVERY_EMPTY: "${manifestRel}" of ${pkg.metadata.id} enumerates no components ` +
        '(use spec.discovery.strategy: convention if the upstream discovers by layout)',
    )
  }

  const executables = new Set(EXECUTABLES.filter((e) => manifest[e.key]).map((e) => e.type))
  return {components, executables, upstreamVersion: manifest.version ?? '0.0.0'}
}

function fromConvention(pkg, snapshotDir) {
  const components = new Map()

  for (const {dir, entry, type} of LAYOUTS) {
    const root = join(snapshotDir, dir)
    if (!existsSync(root)) continue

    for (const item of readdirSync(root, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      // A skill is `skills/<name>/SKILL.md`; an agent is `agents/<name>.md`.
      // Anything of the wrong shape is supporting material, not a Component.
      const relative = entry ? join(dir, item.name) : join(dir, item.name)
      const path = entry ? join(root, item.name, entry) : join(root, item.name)
      if (entry ? !item.isDirectory() || !existsSync(path) : !item.isFile() || !item.name.endsWith('.md')) continue

      const fallback = entry ? item.name : basename(item.name, '.md')
      add(
        components,
        {...parseComponent(readFileSync(path, 'utf8'), fallback), sourcePath: relative, type},
        pkg.metadata.id,
      )
    }
  }

  const executables = new Set(
    EXECUTABLES.filter((e) => e.path && existsSync(join(snapshotDir, e.path))).map((e) => e.type),
  )

  // The manifest is not the shipping list here, but it still carries a version.
  const manifestRel = pkg.spec.discovery?.manifest ?? '.claude-plugin/plugin.json'
  const manifestPath = join(snapshotDir, manifestRel)
  const version = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, 'utf8')).version ?? '0.0.0')
    : '0.0.0'

  return {components, executables, upstreamVersion: version}
}
