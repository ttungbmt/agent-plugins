import { isDeepStrictEqual } from 'node:util'
import { crossScopeConflict, knownName, manualEntryConflict, sameInstall, sameSource, sharedClashConflict } from './identity.js'
import type { Conflict, KnownEntry, ManagedEntry, MarketplaceDeclaration, ScopedEntry, SharedClaim } from './types.js'

export type PlannedAction =
  | { kind: 'add' | 'readd' | 'patch'; name: string | null; declaration: MarketplaceDeclaration }
  | { kind: 'remove'; name: string }

export type Plan = {
  actions: PlannedAction[]
  conflicts: Conflict[]
  /** Manual entry khớp đúng khai báo: nhận quản lý mà không cần sửa settings. */
  adopted: Array<{ name: string; declaration: MarketplaceDeclaration }>
  /**
   * Managed entry không còn được khai báo mà không cần gỡ khỏi settings, vì nó đã không còn ở đó
   * hoặc Config khác vẫn claim nó: chỉ cần xoá khỏi Lock/State.
   */
  forgotten: string[]
}

/**
 * Tính các bước đưa settings của một scope về khớp khai báo, theo luật sở hữu của ADR 0003.
 * `blocked` là các tên đang vướng xung đột khai báo: Managed entry của chúng được giữ nguyên.
 * `shared` là claim của các Config khác ở scope user: tên còn được claim thì không bị gỡ,
 * và khai báo khác claim đó là xung đột, `--force` cũng không vượt qua để hai Config không ghi đè nhau mãi.
 * `elsewhere` là entry ở các scope khác: Claude Code chỉ cài một marketplace mỗi tên cho cả máy, nên cùng tên
 * mà khác source thì `add` sẽ thay bản cài của scope kia — xung đột, `--force` không vượt qua.
 */
export function planSync(
  desired: MarketplaceDeclaration[],
  actual: KnownEntry[],
  managed: ManagedEntry[],
  opts: { force: boolean; blocked?: string[]; shared?: SharedClaim[]; elsewhere?: { cwd: string; entries: ScopedEntry[] } },
): Plan {
  const actions: PlannedAction[] = []
  const conflicts: Conflict[] = []
  const adopted: Plan['adopted'] = []
  const claimed = new Set(opts.blocked)

  for (const declaration of desired) {
    // Dạng rút gọn chưa biết tên: nhận ra qua source trong Lock/State, rồi trong settings.
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
    } else if (isManaged || opts.force) {
      // Managed entry phải khớp đúng khai báo, kể cả khi một field phụ bị bỏ đi.
      if (!isDeepStrictEqual(entry.extras, declaration.extras)) actions.push({ kind: 'patch', name, declaration })
    } else if (!isDeepStrictEqual(pick(entry.extras, declaration.extras), declaration.extras)) {
      conflicts.push(manualEntryConflict(entry.name, 'different fields'))
    } else if (isDeepStrictEqual(entry.extras, declaration.extras) && !opts.shared?.some((c) => c.name === entry.name)) {
      // Có thêm field chưa khai báo thì để nguyên: nhận quản lý sẽ gỡ chúng. Config khác đang claim thì để luật bàn giao xử lý.
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

function pick(fields: Record<string, unknown>, like: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(like).filter((k) => k in fields).map((k) => [k, fields[k]]))
}
