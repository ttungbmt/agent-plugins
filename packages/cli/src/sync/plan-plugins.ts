import { manualEntryConflict, missingMarketplaceConflict, sharedClashConflict } from './identity.js'
import type { Conflict, ManagedPlugin, PluginDeclaration, PluginEntry, SharedPluginClaim } from './types.js'

export type PlannedPluginAction =
  /** `adopt` false: chỉ cài cho một Manual entry đã khớp, không nhận sở hữu nó. */
  | { kind: 'install' | 'enable' | 'disable'; id: string; declaration: PluginDeclaration; adopt: boolean }
  | { kind: 'uninstall' | 'unset'; id: string }

export type PluginPlan = {
  actions: PlannedPluginAction[]
  conflicts: Conflict[]
  notices: string[]
  /** Manual entry khớp đúng khai báo, không cần action: nhận quản lý. */
  adopted: PluginDeclaration[]
  /** Managed plugin entry chỉ cần xoá khỏi Lock/State: đã biến khỏi settings, hoặc Config khác vẫn claim nó. */
  forgotten: string[]
}

/**
 * Tính các bước đưa Plugin entry và Bản cài plugin của một scope về khớp khai báo, cùng luật sở hữu với marketplace (ADR 0003).
 * `held` là các marketplace đang xung đột: plugin của chúng được giữ nguyên.
 * `shared` là claim của các Config khác ở scope user.
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
    if (opts.held?.has(declaration.marketplace)) continue

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
      // Khớp đúng khai báo thì nhận quản lý; Config khác đang claim thì để luật bàn giao xử lý.
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
 * Kiểm tra hậu tố `@marketplace` với tên các marketplace đã khai báo (`names`: dạng map, và dạng rút gọn đã biết tên).
 * Còn khai báo rút gọn chưa biết tên (`unnamed`, vd. máy mới chưa `add`) thì plugin không khớp tên nào được để `pending`:
 * vẫn lập kế hoạch, và chỉ kiểm tra lại sau khi `add` xong.
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
 * `claude plugin marketplace remove` xoá mọi khoá `*@<marketplace>` của scope. Còn Manual plugin entry dùng
 * marketplace đó thì không gỡ nó (xung đột `manual-entry`), trừ khi `--force`.
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
