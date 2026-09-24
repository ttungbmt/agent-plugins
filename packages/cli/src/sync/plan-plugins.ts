import { manualEntryConflict, missingMarketplaceConflict, sharedClashConflict } from './identity.js'
import type { Conflict, ManagedPlugin, PluginDeclaration, PluginEntry, SharedPluginClaim } from './types.js'

export type PlannedPluginAction =
  /** `adopt` false: only install for a Manual entry that already matches, without taking ownership of it. */
  | { kind: 'install' | 'enable' | 'disable'; id: string; declaration: PluginDeclaration; adopt: boolean }
  | { kind: 'uninstall' | 'unset'; id: string }

export type PluginPlan = {
  actions: PlannedPluginAction[]
  conflicts: Conflict[]
  notices: string[]
  /** Manual entry that matches its declaration exactly and needs no action: adopted. */
  adopted: PluginDeclaration[]
  /** Managed plugin entry to drop from Lock/State only: gone from settings, or another Config still claims it. */
  forgotten: string[]
}

/**
 * Compute the steps that bring one scope's Plugin entries and Installed plugins in line with the declarations, under the
 * same ownership rules as marketplaces (ADR 0003).
 * `held` holds the marketplaces and plugins in conflict: those plugins are left untouched.
 * `shared` holds other Configs' claims at the user scope.
 */
export function planPlugins(
  desired: PluginDeclaration[],
  actual: PluginEntry[],
  managed: ManagedPlugin[],
  opts: { force: boolean; held?: Set<string>; shared?: SharedPluginClaim[] },
): PluginPlan {
  const actions: PlannedPluginAction[] = []
  const conflicts: Conflict[] = []
  const notices: string[] = []
  const adopted: PluginDeclaration[] = []
  const claimed = new Set<string>()

  for (const declaration of desired) {
    const { id, enabled } = declaration
    claimed.add(id)
    if (opts.held?.has(declaration.marketplace) || opts.held?.has(id)) continue

    const clash = opts.shared?.find((c) => c.id === id && c.enabled !== enabled)
    if (clash) {
      conflicts.push(sharedClashConflict(id, clash.config))
      continue
    }

    const entry = actual.find((e) => e.id === id)
    const isManaged = managed.some((m) => m.id === id)
    const value = entry?.enabled
    let adopt = true
    if (value !== undefined && !isManaged) {
      if (value !== enabled && !opts.force) {
        conflicts.push(manualEntryConflict(id, `the value ${value}`))
        continue
      }
      // An exact match with the declaration is adopted; if another Config claims it, the handover rule deals with it.
      if (value === enabled && opts.shared?.some((c) => c.id === id)) adopt = false
    }

    const installed = entry?.installed ?? false
    if (enabled && !installed) actions.push({ kind: 'install', id, declaration, adopt })
    else if (enabled && value !== true) actions.push({ kind: 'enable', id, declaration, adopt })
    else if (!enabled && value !== false) actions.push({ kind: 'disable', id, declaration, adopt })
    else if (!isManaged && adopt) adopted.push(declaration)
  }

  const forgotten: string[] = []
  for (const record of managed) {
    if (claimed.has(record.id)) continue
    const entry = actual.find((e) => e.id === record.id)
    const stillClaimed = opts.shared?.some((c) => c.id === record.id)
    if (stillClaimed || !entry) forgotten.push(record.id)
    else actions.push({ kind: entry.installed ? 'uninstall' : 'unset', id: record.id })
  }

  return { actions, conflicts, notices, adopted, forgotten }
}

/**
 * Check the `@marketplace` suffix against the declared marketplace names (`names`: map form, plus Shorthand declarations
 * whose name is known). While some Shorthand declarations have no known name yet (`unnamed`, e.g. a fresh machine before
 * `add`), a plugin matching no name is left `pending`: it is still planned, and only checked again once `add` is done.
 */
export function checkMarketplaces(plugins: PluginDeclaration[], names: Set<string>, unnamed: boolean) {
  const pending = new Set<string>()
  const conflicts: Conflict[] = []
  const notices: string[] = []
  const valid = plugins.filter((plugin) => {
    if (names.has(plugin.marketplace)) return true
    if (!unnamed) {
      conflicts.push(missingMarketplaceConflict(plugin))
      return false
    }
    pending.add(plugin.id)
    notices.push(`"${plugin.id}" uses marketplace "${plugin.marketplace}", whose name is only known after adding the shorthand marketplaces; ap checks it then`)
    return true
  })
  return { plugins: valid, pending, conflicts, notices }
}

/**
 * `claude plugin marketplace remove` deletes every `*@<marketplace>` key at the scope. While a Manual plugin entry still
 * uses that marketplace, the marketplace is not removed (a `manual-entry` conflict) unless `--force`.
 */
export function manualPluginsOf(marketplace: string, actual: PluginEntry[], owned: Set<string>): string[] {
  return actual.filter((e) => e.enabled !== undefined && e.id.endsWith(`@${marketplace}`) && !owned.has(e.id)).map((e) => e.id)
}

export function pluginsInUseConflict(marketplace: string, ids: string[]): Conflict {
  return {
    name: marketplace,
    reason: 'manual-entry',
    detail: `removing marketplace "${marketplace}" would also remove manual plugin entries ${ids.join(', ')}; remove them first or use --force`,
  }
}
