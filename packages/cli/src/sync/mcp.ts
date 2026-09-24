import { isDeepStrictEqual } from 'node:util'
import { manualEntryConflict, sharedClashConflict } from './identity.js'
import type { Conflict, ManagedMcp, McpConfig, McpDeclaration, SharedMcpClaim } from './types.js'

export type PlannedMcpAction =
  /** `update`: the CLI has no edit command, so it is `remove` then `add-json`. */
  | { kind: 'add' | 'update'; name: string; declaration: McpDeclaration }
  | { kind: 'remove'; name: string }

export type McpPlan = {
  actions: PlannedMcpAction[]
  conflicts: Conflict[]
  /** A Manual entry that matches the declaration exactly, no action needed: adopt it. */
  adopted: McpDeclaration[]
  /** A Managed MCP server that only needs removing from Lock/State: gone from the config, or another Config claims that exact config (handover). */
  forgotten: string[]
}

/**
 * Canonical config for comparing and writing: drops `type: stdio` (the default) and empty `args`/`env`/`headers`,
 * since Claude Code and users may write the same server either way.
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
 * Validates an inline config (ADR 0006): a transport Claude Code accepts, and secrets in `env`/`headers` written
 * only as `${VAR}`. Returns an error message, or null when valid.
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

/** `${VAR}` variables (without `:-default`) the config uses but the current environment has not set. */
export function unsetVariables(config: McpConfig, env: Record<string, string | undefined>): string[] {
  const missing = new Set<string>()
  for (const [, name, fallback] of JSON.stringify(config).matchAll(PLACEHOLDER)) {
    if (fallback === undefined && env[name!] === undefined) missing.add(name!)
  }
  return [...missing]
}

/**
 * Computes the steps that bring a scope's Installed MCP servers in line with the declarations, using the same ownership
 * rules as plugins (ADR 0003). `held` is the names in conflict between Presets: their Managed entries are kept as is.
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
    // An exact match with the declaration is adopted; if another Config claims it, the handover rules handle it.
    else if (!isManaged && !opts.shared?.some((c) => c.name === name)) adopted.push(declaration)
  }

  const forgotten: string[] = []
  for (const record of managed) {
    if (claimed.has(record.name)) continue
    // Handover only works to a Config claiming this exact config (see `store`); a claim with a different config is removed, and that Config adds its own back.
    const stillClaimed = opts.shared?.some((c) => c.name === record.name && sameMcp(c.server, record.server))
    if (stillClaimed || actual[record.name] === undefined) forgotten.push(record.name)
    else actions.push({ kind: 'remove', name: record.name })
  }

  return { actions, conflicts, adopted, forgotten }
}
