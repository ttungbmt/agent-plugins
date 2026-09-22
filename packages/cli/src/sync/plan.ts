import { isDeepStrictEqual } from 'node:util'
import { identifies, manualEntryConflict, sameSource } from './identity.js'
import type { Conflict, KnownEntry, ManagedEntry, MarketplaceDeclaration } from './types.js'

export type PlannedAction =
  | { kind: 'add' | 'readd' | 'patch'; name: string | null; declaration: MarketplaceDeclaration }
  | { kind: 'remove'; name: string }

export type Plan = {
  actions: PlannedAction[]
  conflicts: Conflict[]
  /** Managed entry không còn được khai báo và cũng không còn trong settings: chỉ cần xoá khỏi Lock/State. */
  forgotten: string[]
}

/**
 * Tính các bước đưa settings của một scope về khớp khai báo, theo luật sở hữu của ADR 0003.
 * `blocked` là các tên đang vướng xung đột khai báo: Managed entry của chúng được giữ nguyên.
 */
export function planSync(
  desired: MarketplaceDeclaration[],
  actual: KnownEntry[],
  managed: ManagedEntry[],
  opts: { force: boolean; blocked?: string[] },
): Plan {
  const actions: PlannedAction[] = []
  const conflicts: Conflict[] = []
  const claimed = new Set(opts.blocked)

  for (const declaration of desired) {
    // Dạng rút gọn chưa biết tên: nhận ra qua source trong Lock/State, rồi trong settings.
    const name =
      declaration.name ??
      managed.find((m) => identifies(declaration, m))?.name ??
      actual.find((e) => sameSource(e.source, declaration.source))?.name ??
      null
    if (name) claimed.add(name)

    const entry = actual.find((e) => e.name === name)
    const isManaged = managed.some((m) => m.name === name)

    if (!entry) {
      actions.push({ kind: isManaged ? 'readd' : 'add', name, declaration })
    } else if (!sameSource(entry.source, declaration.source)) {
      if (isManaged || opts.force) actions.push({ kind: 'add', name, declaration })
      else conflicts.push(manualEntryConflict(entry.name))
    } else if (isManaged || opts.force) {
      // Managed entry phải khớp đúng khai báo, kể cả khi một field phụ bị bỏ đi.
      if (!isDeepStrictEqual(entry.extras, declaration.extras)) actions.push({ kind: 'patch', name, declaration })
    } else if (!isDeepStrictEqual(pick(entry.extras, declaration.extras), declaration.extras)) {
      conflicts.push(manualEntryConflict(entry.name, 'different fields'))
    }
  }

  const forgotten: string[] = []
  for (const record of managed) {
    if (claimed.has(record.name)) continue
    if (actual.some((e) => e.name === record.name)) actions.push({ kind: 'remove', name: record.name })
    else forgotten.push(record.name)
  }

  return { actions, conflicts, forgotten }
}

function pick(fields: Record<string, unknown>, like: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(like).filter((k) => k in fields).map((k) => [k, fields[k]]))
}
