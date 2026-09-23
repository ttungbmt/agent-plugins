import { isDeepStrictEqual } from 'node:util'
import { manualEntryConflict, sharedClashConflict } from './identity.js'
import type { Conflict, ManagedMcp, McpConfig, McpDeclaration, SharedMcpClaim } from './types.js'

export type PlannedMcpAction =
  /** `update`: CLI không có lệnh sửa, nên là `remove` rồi `add-json`. */
  | { kind: 'add' | 'update'; name: string; declaration: McpDeclaration }
  | { kind: 'remove'; name: string }

export type McpPlan = {
  actions: PlannedMcpAction[]
  conflicts: Conflict[]
  /** Manual entry khớp đúng khai báo, không cần action: nhận quản lý. */
  adopted: McpDeclaration[]
  /** Managed MCP server chỉ cần xoá khỏi Lock/State: đã biến khỏi cấu hình, hoặc Config khác claim đúng cấu hình đó (bàn giao). */
  forgotten: string[]
}

/**
 * Cấu hình dạng chuẩn để so và để ghi: bỏ `type: stdio` (mặc định) và `args`/`env`/`headers` rỗng,
 * vì Claude Code và người dùng có thể viết cùng một server theo cả hai cách.
 */
export function normalizeMcp(config: McpConfig): McpConfig {
  const out: McpConfig = {}
  for (const [key, value] of Object.entries(config)) {
    if (key === 'type' && value === 'stdio') continue
    if (Array.isArray(value) && value.length === 0) continue
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) continue
    out[key] = value
  }
  return out
}

export function sameMcp(a: McpConfig | null, b: McpConfig | null): boolean {
  if (a === null || b === null) return a === b
  return isDeepStrictEqual(normalizeMcp(a), normalizeMcp(b))
}

const SECRET_KEY = /key|token|secret|password|auth|credential/i
const PLACEHOLDER = /\$\{([A-Za-z_][A-Za-z0-9_]*)(:-[^}]*)?\}/g

/**
 * Kiểm tra một cấu hình inline (ADR 0006): đúng transport Claude Code nhận, và secret trong `env`/`headers`
 * chỉ được viết dạng `${VAR}`. Trả về thông báo lỗi, hoặc null khi hợp lệ.
 */
export function checkMcp(name: string, config: McpConfig): string | null {
  const type = config.type ?? 'stdio'
  if (type === 'stdio') {
    if (typeof config.command !== 'string') return `MCP server "${name}" needs a \`command\``
  } else if (type === 'http' || type === 'sse') {
    if (typeof config.url !== 'string') return `MCP server "${name}" needs a \`url\``
  } else {
    return `MCP server "${name}" has unsupported type "${String(type)}"; use stdio, http or sse`
  }
  for (const field of ['env', 'headers'] as const) {
    for (const [key, value] of Object.entries((config[field] as Record<string, unknown> | undefined) ?? {})) {
      if (typeof value === 'string' && SECRET_KEY.test(key) && !value.includes('${')) {
        return `${field}.${key} of MCP server "${name}" looks like a secret; write it as \${${key.toUpperCase().replace(/\W/g, '_')}}`
      }
    }
  }
  return null
}

/** Biến `${VAR}` (không có `:-default`) mà cấu hình dùng nhưng môi trường hiện tại chưa đặt. */
export function unsetVariables(config: McpConfig, env: Record<string, string | undefined>): string[] {
  const missing = new Set<string>()
  for (const [, name, fallback] of JSON.stringify(config).matchAll(PLACEHOLDER)) {
    if (fallback === undefined && env[name!] === undefined) missing.add(name!)
  }
  return [...missing]
}

/**
 * Tính các bước đưa Bản cài MCP server của một scope về khớp khai báo, cùng luật sở hữu với plugin (ADR 0003).
 * `held` là các tên đang xung đột giữa các Preset: Managed entry của chúng được giữ nguyên.
 */
export function planMcp(
  desired: McpDeclaration[],
  actual: Record<string, McpConfig>,
  managed: ManagedMcp[],
  opts: { force: boolean; held?: Set<string>; shared?: SharedMcpClaim[] },
): McpPlan {
  const actions: PlannedMcpAction[] = []
  const conflicts: Conflict[] = []
  const adopted: McpDeclaration[] = []
  const claimed = new Set<string>(opts.held)

  for (const declaration of desired) {
    const { name, server } = declaration
    claimed.add(name)
    const clash = opts.shared?.find((c) => c.name === name && !sameMcp(c.server, server))
    if (clash) {
      conflicts.push(sharedClashConflict(name, clash.config))
      continue
    }

    const entry = actual[name]
    const isManaged = managed.some((m) => m.name === name)
    const same = entry !== undefined && sameMcp(entry, server)
    if (entry !== undefined && !isManaged && !same && !opts.force) {
      conflicts.push(manualEntryConflict(name, 'a different configuration'))
      continue
    }

    if (entry === undefined) actions.push({ kind: 'add', name, declaration })
    else if (!same) actions.push({ kind: 'update', name, declaration })
    // Khớp đúng khai báo thì nhận quản lý; Config khác đang claim thì để luật bàn giao xử lý.
    else if (!isManaged && !opts.shared?.some((c) => c.name === name)) adopted.push(declaration)
  }

  const forgotten: string[] = []
  for (const record of managed) {
    if (claimed.has(record.name)) continue
    // Chỉ bàn giao được cho Config claim đúng cấu hình này (xem `store`); claim khác cấu hình thì gỡ, Config đó sẽ thêm lại bản của nó.
    const stillClaimed = opts.shared?.some((c) => c.name === record.name && sameMcp(c.server, record.server))
    if (stillClaimed || actual[record.name] === undefined) forgotten.push(record.name)
    else actions.push({ kind: 'remove', name: record.name })
  }

  return { actions, conflicts, adopted, forgotten }
}
