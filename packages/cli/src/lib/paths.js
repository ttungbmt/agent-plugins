import {existsSync} from 'node:fs'
import {homedir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

/**
 * The distribution root: the agent-plugins repository that owns
 * catalog/, presets/, roles/ and policies/.
 *
 * The CLI ships inside that repository, so we walk up from our own
 * location. AGENT_PLUGINS_ROOT overrides, which is what tests use.
 */
export function distributionRoot() {
  if (process.env.AGENT_PLUGINS_ROOT) {
    return resolve(process.env.AGENT_PLUGINS_ROOT)
  }

  let dir = dirname(fileURLToPath(import.meta.url))
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'catalog')) && existsSync(join(dir, 'roles'))) {
      return dir
    }

    dir = dirname(dir)
  }

  throw new Error('distribution root not found: no ancestor directory contains catalog/ and roles/')
}

/**
 * The consumer project: the nearest ancestor of cwd holding agent-plugins.yaml.
 * manifest-spec.md:111 — "The default location is the consumer repository root."
 */
export function projectRoot(from = process.cwd()) {
  let dir = resolve(from)
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'agent-plugins.yaml'))) return dir
    dir = dirname(dir)
  }

  throw new Error('agent-plugins.yaml not found in this directory or any parent')
}

/** Everything generated lives under .agent-plugins/ and is gitignored. */
export function projectPaths(root) {
  const managed = join(root, '.agent-plugins')
  return {
    root,
    managed,
    marketplace: join(managed, 'marketplace'),
    state: join(managed, 'state'),
    receipt: join(managed, 'state', 'claude-code.json'),
    lock: join(root, 'agent-plugins.lock'),
    manifest: join(root, 'agent-plugins.yaml'),
  }
}

/**
 * Claude Code's machine-global marketplace register.
 *
 * It is keyed by marketplace name across every project on the machine, which
 * is why marketplace names must be unique per project. Honours
 * CLAUDE_CONFIG_DIR when the user has set one.
 */
export function knownMarketplacesPath() {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
  return join(configDir, 'plugins', 'known_marketplaces.json')
}

/**
 * Machine-wide store for immutable source snapshots.
 *
 * <pkg>@<sha> is the same bytes in every project, so keeping a copy per project
 * multiplies it by the number of projects for nothing. This is a pure cache:
 * deleting it and running `ap sync` reproduces it exactly, because everything
 * is pinned by SHA in agent-plugins.lock.
 */
export function sourceStore() {
  return join(cacheRoot(), 'sources')
}

/** GC roots: one symlink per project that needs a snapshot. */
export function storeRoots() {
  return join(cacheRoot(), 'roots')
}

function cacheRoot() {
  if (process.env.AGENT_PLUGINS_CACHE) return resolve(process.env.AGENT_PLUGINS_CACHE)
  if (process.env.XDG_CACHE_HOME) return join(resolve(process.env.XDG_CACHE_HOME), 'agent-plugins')
  return join(homedir(), '.cache', 'agent-plugins')
}
