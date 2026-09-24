import { isDeepStrictEqual } from 'node:util'
import { readJson, settingsPath, writeJson, type Location } from './files.js'
import type { HookDeclaration, HookGroup, ManagedHook, Scope } from './types.js'

/** Khoá `hooks` của settings: event → các nhóm matcher. Nhóm của người dùng có thể có bất cứ gì, nên để mờ. */
export type SettingsHooks = Record<string, unknown>

export type PlannedHookAction =
  | { kind: 'add' | 'update'; name: string; declaration: HookDeclaration }
  | { kind: 'remove'; name: string }

export type HookPlan = {
  actions: PlannedHookAction[]
  /** Managed hook không còn được khai báo và đã không còn trong settings: chỉ cần xoá khỏi Lock/State. */
  forgotten: string[]
}

/** Field bắt buộc của từng loại handler (docs/research/hooks.md §1). */
const REQUIRED: Record<string, string[]> = {
  command: ['command'],
  http: ['url'],
  mcp_tool: ['server', 'tool'],
  prompt: ['prompt'],
  agent: ['prompt'],
}
const GROUP_KEYS = ['event', 'matcher', 'hooks']

/** Kiểm tra một nhóm matcher của Khai báo hook. Trả về thông báo lỗi, hoặc null khi hợp lệ. */
export function checkHook(name: string, group: Record<string, unknown>): string | null {
  const unknown = Object.keys(group).find((k) => !GROUP_KEYS.includes(k))
  if (unknown) return `hook "${name}" has unknown key \`${unknown}\`; a hook has only event, matcher and hooks`
  if (typeof group.event !== 'string' || !group.event) return `hook "${name}" needs an \`event\` string`
  if (group.matcher !== undefined && typeof group.matcher !== 'string') return `\`matcher\` of hook "${name}" must be a string`
  if (!Array.isArray(group.hooks) || group.hooks.length === 0) return `hook "${name}" needs a non-empty \`hooks\` list of handlers`
  for (const [i, handler] of group.hooks.entries()) {
    const at = `handler ${i + 1} of hook "${name}"`
    const type = handler && typeof handler === 'object' && !Array.isArray(handler) ? (handler as Record<string, unknown>).type : undefined
    const required = typeof type === 'string' && Object.hasOwn(REQUIRED, type) ? REQUIRED[type]! : null
    if (!required) {
      return `${at} needs a \`type\`: ${Object.keys(REQUIRED).join(', ').replace(/, (?=[^,]*$)/, ' or ')}`
    }
    const missing = required.find((field) => typeof (handler as Record<string, unknown>)[field] !== 'string')
    if (missing) return `${at} (${type}) needs \`${missing}\``
  }
  return null
}

/** Dạng chuẩn để so và để ghi vào Lock/State: `matcher` rỗng, `"*"` hay vắng mặt đều là khớp mọi thứ nên được bỏ. */
export function normalizeHook({ event, matcher, hooks, ...rest }: HookGroup): HookGroup {
  return { event, ...(matcher === undefined || matcher === '' || matcher === '*' ? {} : { matcher }), hooks, ...rest }
}

/** Hai nhóm có cùng nội dung không: so theo giá trị sâu, không theo thứ tự khoá. */
export function sameHook(a: HookGroup, b: HookGroup): boolean {
  return isDeepStrictEqual(normalizeHook(a), normalizeHook(b))
}

/** Vị trí nhóm trong settings khớp đúng một Managed hook, hoặc -1. */
function locate(hooks: SettingsHooks, record: ManagedHook): number {
  return groupsOf(hooks, record.group.event).findIndex(
    (g) => g !== null && typeof g === 'object' && !Array.isArray(g) && sameHook({ event: record.group.event, ...(g as Omit<HookGroup, 'event'>) }, record.group),
  )
}

function groupsOf(hooks: SettingsHooks, event: string): unknown[] {
  const groups = hooks[event]
  return Array.isArray(groups) ? groups : []
}

/**
 * Tính các bước đưa khoá `hooks` của một Scope về khớp khai báo. Mỗi Khai báo hook là một nhóm matcher riêng;
 * Managed hook được nhận ra bằng nội dung đã ghi trong Lock/State, vì settings không có định danh cho Hook.
 * Managed hook khai báo không đổi mà không còn trong settings thì để yên: chưa phân biệt được bị xoá tay (thêm lại)
 * với bị sửa tay (thêm lại sẽ chạy trùng).
 */
export function planHooks(desired: HookDeclaration[], actual: SettingsHooks, managed: ManagedHook[]): HookPlan {
  const actions: PlannedHookAction[] = []
  for (const declaration of desired) {
    const { name } = declaration
    const record = managed.find((m) => m.name === name)
    if (!record) actions.push({ kind: 'add', name, declaration })
    else if (!sameHook(record.group, declaration.group)) actions.push({ kind: 'update', name, declaration })
  }

  const forgotten: string[] = []
  for (const record of managed) {
    if (desired.some((d) => d.name === record.name)) continue
    if (locate(actual, record) === -1) forgotten.push(record.name)
    else actions.push({ kind: 'remove', name: record.name })
  }
  return { actions, forgotten }
}

/**
 * Áp các bước lên khoá `hooks`, trả về khoá mới (null khi không còn nhóm nào): thêm vào cuối mảng của event, `update`
 * thay đúng vị trí (đổi event thì chuyển sang cuối mảng của event mới), `remove` gỡ nhóm. Mảng event rỗng bị xoá;
 * mọi nhóm khác giữ nguyên.
 */
export function nextHooks(hooks: SettingsHooks, actions: PlannedHookAction[], managed: ManagedHook[]): SettingsHooks | null {
  const next: SettingsHooks = { ...hooks }
  const groups = (event: string) => (next[event] = [...groupsOf(next, event)]) as unknown[]
  for (const action of actions) {
    const record = managed.find((m) => m.name === action.name)
    const at = record ? locate(next, record) : -1
    if (action.kind === 'remove') {
      if (at !== -1) groups(record!.group.event).splice(at, 1)
      continue
    }
    const { event } = action.declaration.group
    const written = settingsGroup(action.declaration.group)
    if (at !== -1 && record!.group.event === event) {
      groups(event)[at] = written
      continue
    }
    if (at !== -1) groups(record!.group.event).splice(at, 1)
    groups(event).push(written)
  }
  for (const [event, value] of Object.entries(next)) if (Array.isArray(value) && value.length === 0) delete next[event]
  return Object.keys(next).length ? next : null
}

/** Nhóm như ghi vào settings: đúng như người dùng viết, bỏ `event` vì nó là khoá chứa nhóm. */
function settingsGroup({ event: _, ...group }: HookGroup) {
  return group
}

/** Khoá `hooks` trong settings của Scope. */
export async function readSettingsHooks(scope: Scope, location: Location): Promise<SettingsHooks> {
  return hooksOf(await readJson(settingsPath(scope, location)))
}

/** Áp mọi bước hook của một Scope trong một lần ghi, đọc lại settings ngay trước khi ghi để giữ mọi khoá khác. */
export async function writeSettingsHooks(scope: Scope, location: Location, actions: PlannedHookAction[], managed: ManagedHook[]) {
  const path = settingsPath(scope, location)
  const settings = await readJson<Record<string, unknown>>(path)
  const hooks = nextHooks(hooksOf(settings), actions, managed)
  if (hooks) settings.hooks = hooks
  else delete settings.hooks
  await writeJson(path, settings)
}

function hooksOf({ hooks }: { hooks?: unknown }): SettingsHooks {
  return hooks && typeof hooks === 'object' && !Array.isArray(hooks) ? (hooks as SettingsHooks) : {}
}
