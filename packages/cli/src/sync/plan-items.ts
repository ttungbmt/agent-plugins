import { manualEntryConflict, sameSource, sharedClashConflict } from './identity.js'
import type { InstalledItem } from './items.js'
import type { Conflict, ItemKind, ItemSource, ManagedItem, SharedItemClaim } from './types.js'

/**
 * A Skill/Agent that must exist at the scope. `sha256`/`from` are null under `--dry-run`/`--check` when the content is
 * not known yet (the source was never fetched, or it changed since Lock/State).
 */
export type DesiredItem = {
  name: string
  source: ItemSource
  sha256: string | null
  /** The Skill directory or Agent file in the fetched source, to copy. */
  from: string | null
  origin: string
}

export type PlannedItemAction =
  | { kind: 'install' | 'update'; name: string; desired: DesiredItem }
  | { kind: 'remove'; name: string }

export type ItemPlan = {
  actions: PlannedItemAction[]
  conflicts: Conflict[]
  notices: string[]
  /** A hand-installed copy whose content matches the source: adopted. */
  adopted: DesiredItem[]
  /** Managed skill/agent to drop from Lock/State only: gone from disk, replaced by a symlink, or claimed by another Config. */
  forgotten: string[]
}

/**
 * Compute the steps that bring one scope's Installed skills (or Installed agents) in line with the declarations, under the
 * same ownership rules as marketplaces (ADR 0003, 0005). `held` holds names in conflict or from a source that could not be
 * fetched: their installs are left untouched.
 */
export function planItems(
  kind: ItemKind,
  desired: DesiredItem[],
  installed: InstalledItem[],
  managed: ManagedItem[],
  opts: { force: boolean; held?: Set<string>; shared?: SharedItemClaim[] },
): ItemPlan {
  const actions: PlannedItemAction[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  const adopted: DesiredItem[] = []
  /** An install with the same name, or the symlinked directory containing it (a Rule Namespace that is a symlink, ADR 0009). */
  const entryOf = (name: string) =>
    installed.find((e) => e.name === name) ?? installed.find((e) => e.symlink && name.startsWith(`${e.name}/`))

  for (const item of desired) {
    const { name } = item
    const clash = opts.shared?.find((c) => c.name === name && !sameSource(c.source, item.source))
    if (clash) {
      conflicts.push(sharedClashConflict(name, clash.config))
      continue
    }

    const entry = entryOf(name)
    const record = managed.find((m) => m.name === name)
    if (!entry) {
      actions.push({ kind: 'install', name, desired: item })
      continue
    }

    if (record && !entry.symlink) {
      if (entry.sha256 !== record.sha256 && entry.sha256 !== item.sha256 && !opts.force) {
        conflicts.push(modifiedConflict(kind, name))
        continue
      }
      const wanted = sameSource(record.source, item.source) ? (item.sha256 ?? record.sha256) : item.sha256
      if (entry.sha256 !== wanted || record.sha256 !== wanted) actions.push({ kind: 'update', name, desired: item })
      continue
    }

    // Manual entry: a directory the user created by hand, or a symlink created by another tool.
    if (opts.shared?.some((c) => c.name === name)) continue
    if (item.sha256 === null) {
      notices.push(`${kind} "${name}" already exists and is not managed by ap; run \`ap sync\` to compare it with its source`)
    } else if (entry.sha256 === item.sha256) {
      // A symlink owned by another tool: left alone if it matches, never adopted.
      if (!entry.symlink) adopted.push(item)
    } else if (opts.force) {
      actions.push({ kind: 'install', name, desired: item })
    } else {
      const why = entry.name !== name ? `a symlinked namespace "${entry.name}"` : entry.symlink ? `a symlinked ${kind}` : `different ${kind} content`
      conflicts.push(manualEntryConflict(name, why))
    }
  }

  const forgotten: string[] = []
  for (const record of managed) {
    if (desired.some((d) => d.name === record.name) || opts.held?.has(record.name)) continue
    const entry = entryOf(record.name)
    if (!entry || entry.symlink || opts.shared?.some((c) => c.name === record.name)) forgotten.push(record.name)
    else if (entry.sha256 !== record.sha256 && !opts.force) conflicts.push(modifiedConflict(kind, record.name))
    else actions.push({ kind: 'remove', name: record.name })
  }

  return { actions, conflicts, notices, adopted, forgotten }
}

function modifiedConflict(kind: ItemKind, name: string): Conflict {
  return {
    name,
    reason: `modified-${kind}`,
    detail: `${kind} "${name}" was changed on disk since ap installed it; use --force to overwrite your changes`,
  }
}
