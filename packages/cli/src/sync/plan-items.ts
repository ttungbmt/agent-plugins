import { manualEntryConflict, sameSource, sharedClashConflict } from './identity.js'
import type { InstalledItem } from './items.js'
import type { Conflict, ItemKind, ItemSource, ManagedItem, SharedItemClaim } from './types.js'

/**
 * Một Skill/Agent cần có ở scope. `sha256`/`from` là null ở `--dry-run`/`--check` khi chưa biết nội dung
 * (nguồn chưa từng tải, hoặc nguồn đã đổi so với Lock/State).
 */
export type DesiredItem = {
  name: string
  source: ItemSource
  sha256: string | null
  /** Thư mục Skill hoặc file Agent trong nguồn đã tải, để copy. */
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
  /** Bản tự cài tay có nội dung khớp nguồn: nhận quản lý. */
  adopted: DesiredItem[]
  /** Managed skill/agent chỉ cần xoá khỏi Lock/State: đã biến khỏi đĩa, bị thay bằng symlink, hoặc Config khác vẫn claim nó. */
  forgotten: string[]
}

/**
 * Tính các bước đưa Bản cài skill (hoặc Bản cài agent) của một scope về khớp khai báo, cùng luật sở hữu với marketplace
 * (ADR 0003, 0005). `held` là tên đang xung đột hoặc thuộc nguồn chưa tải được: Bản cài của chúng được giữ nguyên.
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
  /** Bản cài cùng tên, hoặc thư mục symlink chứa nó (Namespace của Rule là symlink, ADR 0009). */
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

    // Manual entry: thư mục người dùng tự tạo, hoặc symlink do công cụ khác tạo.
    if (opts.shared?.some((c) => c.name === name)) continue
    if (item.sha256 === null) {
      notices.push(`${kind} "${name}" already exists and is not managed by ap; run \`ap sync\` to compare it with its source`)
    } else if (entry.sha256 === item.sha256) {
      // Symlink thuộc công cụ khác: khớp thì để nguyên, không nhận quản lý.
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
