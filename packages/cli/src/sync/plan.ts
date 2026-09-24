import { isDeepStrictEqual } from 'node:util'
import { pick } from 'es-toolkit'
import { crossScopeConflict, knownName, manualEntryConflict, sameInstall, sameSource, sharedClashConflict } from './identity.js'
import type { Conflict, KnownEntry, ManagedEntry, MarketplaceDeclaration, ScopedEntry, SharedClaim } from './types.js'

export type PlannedAction =
  | { kind: 'add' | 'readd' | 'patch'; name: string | null; declaration: MarketplaceDeclaration }
  | { kind: 'remove'; name: string }

export type Plan = {
  actions: PlannedAction[]
  conflicts: Conflict[]
  /** Manual entry that matches its declaration exactly: adopted without touching settings. */
  adopted: Array<{ name: string; declaration: MarketplaceDeclaration }>
  /**
   * Managed entry no longer declared that needs no removal from settings, because it is already gone from there
   * or another Config still claims it: it only has to be dropped from Lock/State.
   */
  forgotten: string[]
}

/**
 * Compute the steps that bring one scope's settings in line with the declarations, under the ownership rules of ADR 0003.
 * `blocked` holds names caught in a declaration conflict: their Managed entries are left untouched.
 * `shared` holds other Configs' claims at the user scope: a name that is still claimed is not removed, and a different
 * declaration of that claim is a conflict even `--force` does not override, so two Configs never keep overwriting each other.
 * `elsewhere` holds entries at other scopes: Claude Code installs only one marketplace per name for the whole machine, so
 * the same name with a different source would make `add` replace the other scope's install — a conflict `--force` does
 * not override.
 * `installed` holds the names of the Installed marketplaces: a Managed entry whose install is gone is added again, or
 * `claude plugin install` cannot find its plugins. Left out, every entry in settings counts as installed.
 */
export function planSync(
  desired: MarketplaceDeclaration[],
  actual: KnownEntry[],
  managed: ManagedEntry[],
  opts: { force: boolean; blocked?: string[]; shared?: SharedClaim[]; elsewhere?: { cwd: string; entries: ScopedEntry[] }; installed?: Set<string> },
): Plan {
  const actions: PlannedAction[] = []
  const conflicts: Conflict[] = []
  const adopted: Plan['adopted'] = []
  const claimed = new Set(opts.blocked)

  for (const declaration of desired) {
    // A Shorthand declaration whose name is not known yet: recognize it by source in Lock/State, then in settings.
    const name = knownName(declaration, managed, actual)
    if (name) claimed.add(name)

    const clash = opts.shared?.find((c) => c.name === name && !sameDeclaration(c, declaration))
    if (clash) {
      conflicts.push(sharedClashConflict(clash.name, clash.config))
      continue
    }
    const other = opts.elsewhere?.entries.find(
      (e) => e.name === name && !sameInstall(e.source, declaration.source, opts.elsewhere!.cwd),
    )
    if (other) {
      conflicts.push(crossScopeConflict(other.name, other.scope))
      continue
    }

    const entry = actual.find((e) => e.name === name)
    const isManaged = managed.some((m) => m.name === name)

    if (!entry) {
      actions.push({ kind: isManaged ? 'readd' : 'add', name, declaration })
    } else if (!sameSource(entry.source, declaration.source)) {
      if (isManaged || opts.force) actions.push({ kind: 'add', name, declaration })
      else conflicts.push(manualEntryConflict(entry.name))
    } else if ((isManaged || opts.force) && opts.installed && !opts.installed.has(entry.name)) {
      actions.push({ kind: isManaged ? 'readd' : 'add', name, declaration })
    } else if (isManaged || opts.force) {
      // A Managed entry must match its declaration exactly, even when an optional field was dropped.
      if (!isDeepStrictEqual(entry.extras, declaration.extras)) actions.push({ kind: 'patch', name, declaration })
    } else if (!isDeepStrictEqual(pick(entry.extras, Object.keys(declaration.extras)), declaration.extras)) {
      conflicts.push(manualEntryConflict(entry.name, 'different fields'))
    } else if (isDeepStrictEqual(entry.extras, declaration.extras) && !opts.shared?.some((c) => c.name === entry.name)) {
      // Extra undeclared fields are left alone: adopting will remove them. If another Config claims it, the handover
      // rule deals with it.
      adopted.push({ name: entry.name, declaration })
    }
  }

  const forgotten: string[] = []
  for (const record of managed) {
    if (claimed.has(record.name)) continue
    const stillClaimed = opts.shared?.some((c) => c.name === record.name)
    if (!stillClaimed && actual.some((e) => e.name === record.name)) actions.push({ kind: 'remove', name: record.name })
    else forgotten.push(record.name)
  }

  return { actions, conflicts, adopted, forgotten }
}

function sameDeclaration(claim: SharedClaim, declaration: MarketplaceDeclaration) {
  return sameSource(claim.source, declaration.source) && isDeepStrictEqual(claim.extras, declaration.extras)
}
