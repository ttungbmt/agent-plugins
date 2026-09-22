import {createHash} from 'node:crypto'
import {chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, symlinkSync, unlinkSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {parse} from 'yaml'

import {sourceStore, storeRoots} from './paths.js'

/**
 * Garbage-collection roots for the shared snapshot store, after Nix.
 *
 * A root is a symlink `roots/<pkg>@<sha>/<hash>` pointing at the project that
 * needs that snapshot. Nothing else records the relationship.
 *
 * This replaces an index.json with a `usedBy` array, which had two defects a
 * registry file always has:
 *   - creating an entry was read-modify-write with no lock, so two concurrent
 *     syncs lost one another's writes;
 *   - a project deleted without `ap clean` left a stale entry until prune.
 *
 * A symlink has neither problem. Creating and removing one is atomic, and a
 * deleted project leaves a *dangling* symlink — a state the filesystem reports
 * and cannot get wrong.
 */

const rootId = (projectRoot) => createHash('sha256').update(resolve(projectRoot)).digest('hex').slice(0, 16)

export function addRoot(key, projectRoot) {
  const dir = join(storeRoots(), key)
  mkdirSync(dir, {recursive: true})

  const link = join(dir, rootId(projectRoot))
  try {
    symlinkSync(resolve(projectRoot), link)
  } catch (error) {
    // EEXIST simply means this project already claimed the snapshot.
    if (error.code !== 'EEXIST') throw error
  }
}

export function removeRoot(key, projectRoot) {
  const link = join(storeRoots(), key, rootId(projectRoot))
  try {
    unlinkSync(link)
    return true
  } catch {
    return false
  }
}

/** Does this project still pin exactly this <pkg>@<sha>? */
function projectStillUses(projectRoot, key) {
  const lockPath = join(projectRoot, 'agent-plugins.lock')
  if (!existsSync(lockPath)) return false

  let lock
  try {
    lock = parse(readFileSync(lockPath, 'utf8'))
  } catch {
    return false
  }

  return (lock?.spec?.packages ?? []).some((pkg) => `${pkg.id}@${pkg.source?.ref}` === key)
}

/**
 * Live roots for one snapshot, plus the dead ones and why they died.
 * A root is dead if its target is gone, or the project no longer pins this sha.
 */
function classifyRoots(key) {
  const dir = join(storeRoots(), key)
  const live = []
  const dead = []

  let entries = []
  try {
    entries = readdirSync(dir)
  } catch {
    return {dead, live}
  }

  for (const entry of entries) {
    const link = join(dir, entry)
    let target
    try {
      target = readlinkSync(link)
    } catch {
      continue
    }

    if (!existsSync(target)) dead.push({link, reason: 'project gone', target})
    else if (projectStillUses(target, key)) live.push(target)
    else dead.push({link, reason: 'lock no longer pins this sha', target})
  }

  return {dead, live}
}

/** Disk usage the way `du` reports it: allocated blocks, not apparent size. */
function directorySize(path) {
  let total = 0
  const walk = (dir) => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const full = join(dir, entry.name)
      if (entry.isSymbolicLink()) continue
      total += statSync(full).blocks * 512
      if (entry.isDirectory()) walk(full)
    }
  }

  try {
    walk(path)
  } catch {
    // partially removed tree; report what we counted
  }

  return total
}

/**
 * The store is chmod a-w, so directories must be made writable again before
 * their entries can be unlinked.
 */
export function forceRemove(path) {
  const restore = (dir) => {
    try {
      chmodSync(dir, 0o755)
      for (const entry of readdirSync(dir, {withFileTypes: true})) {
        if (entry.isDirectory() && !entry.isSymbolicLink()) restore(join(dir, entry.name))
      }
    } catch {
      // best effort
    }
  }

  if (existsSync(path) && lstatSync(path).isDirectory()) restore(path)
  rmSync(path, {force: true, recursive: true})
}

/** Remove snapshots with no live root left. */
export function pruneStore({dryRun = false} = {}) {
  const store = sourceStore()
  const roots = storeRoots()
  const removed = []
  const kept = []

  const keys = new Set()
  for (const dir of [store, roots]) {
    try {
      for (const entry of readdirSync(dir, {withFileTypes: true})) {
        if (entry.isDirectory()) keys.add(entry.name)
      }
    } catch {
      // store not created yet
    }
  }

  for (const key of keys) {
    const {dead, live} = classifyRoots(key)

    if (!dryRun) {
      for (const root of dead) {
        try {
          unlinkSync(root.link)
        } catch {
          // already gone
        }
      }
    }

    if (live.length > 0) {
      kept.push({dead, key, usedBy: live})
      continue
    }

    const dir = join(store, key)
    removed.push({bytes: existsSync(dir) ? directorySize(dir) : 0, dead, key})

    if (!dryRun) {
      forceRemove(dir)
      forceRemove(join(roots, key))
    }
  }

  return {kept, removed, store}
}
