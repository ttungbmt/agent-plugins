import { join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { claudeJsonPath, installedPluginsPath, readJson, SCOPES, settingsPath, writeJson, type Location } from './files.js'
import { crossScopeConflict, manualEntryConflict, sameInstall, sameSource } from './identity.js'
import type { Conflict, KnownEntry, MarketplaceDeclaration, MarketplaceSource, McpConfig, PluginEntry, Scope, ScopedEntry } from './types.js'

export type Exec = (command: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>

export class ConflictError extends Error {
  constructor(readonly conflict: Conflict) {
    super(conflict.detail)
  }
}

/** Known marketplace entry, Plugin entry và Bản cài MCP server của từng Scope; ghi qua CLI `claude` (ADR 0001, ADR 0006). */
export function createRegistry({ exec, ...location }: { exec: Exec } & Location) {
  const readSettings = (scope: Scope) => readJson<Record<string, any>>(settingsPath(scope, location))

  async function runMarketplaceCommand(...args: string[]) {
    const result = await exec('claude', ['plugin', 'marketplace', ...args])
    if (result.code !== 0) throw new Error(result.stderr.trim() || `claude ${args.join(' ')} exited with ${result.code}`)
  }

  async function list(scope: Scope): Promise<KnownEntry[]> {
    const known = (await readSettings(scope)).extraKnownMarketplaces ?? {}
    return Object.entries(known).map(([name, { source, ...extras }]: [string, any]) => ({ name, source, extras }))
  }

  /** Entry của các scope còn lại: chúng dùng chung bản cài với scope đang sync. */
  async function listElsewhere(scope: Scope): Promise<ScopedEntry[]> {
    const others = SCOPES.filter((s) => s !== scope)
    return (await Promise.all(others.map(async (s) => (await list(s)).map((e) => ({ ...e, scope: s }))))).flat()
  }

  async function writeEntry(scope: Scope, name: string, entry: Record<string, unknown> | undefined) {
    const settings = await readSettings(scope)
    const { [name]: _, ...rest } = settings.extraKnownMarketplaces ?? {}
    settings.extraKnownMarketplaces = entry ? { ...rest, [name]: entry } : rest
    await writeJson(settingsPath(scope, location), settings)
  }

  /** Cài lại một entry có sẵn: `add` lại nguồn của nó để bản cài chung trỏ về đó, rồi ghi lại entry nguyên dạng. */
  async function reinstall(scope: Scope, entry: KnownEntry) {
    await runMarketplaceCommand('add', sourceArgument(entry.source), '--scope', scope)
    await writeEntry(scope, entry.name, { source: entry.source, ...entry.extras })
  }

  /**
   * Khai báo marketplace qua `claude plugin marketplace add`. Tên do claude resolve; nếu tên đó đè lên
   * một entry khác source mà `mayReplace` không cho phép, hoặc trùng tên khác source với entry của scope khác
   * (dạng rút gọn chỉ biết tên sau `add`), entry cũ và bản cài của nó được khôi phục rồi ném ConflictError.
   */
  async function put(
    declaration: MarketplaceDeclaration,
    scope: Scope,
    { mayReplace }: { mayReplace: (name: string) => boolean },
  ): Promise<{ name: string }> {
    const before = await list(scope)
    const elsewhere = await listElsewhere(scope)
    await runMarketplaceCommand('add', sourceArgument(declaration.source), '--scope', scope)
    const after = await list(scope)
    const changed = after.find((e) => !before.some((b) => isDeepStrictEqual(b, e)))
    const name = declaration.name ?? changed?.name
    if (!name) throw new Error(`claude did not declare a marketplace for ${sourceArgument(declaration.source)}`)

    const previous = before.find((b) => b.name === name)
    const other = elsewhere.find((e) => e.name === name && !sameInstall(e.source, declaration.source, location.cwd))
    if (other) {
      await writeEntry(scope, name, previous && { source: previous.source, ...previous.extras })
      await reinstall(other.scope, other)
      throw new ConflictError(crossScopeConflict(name, other.scope))
    }
    if (previous && !sameSource(previous.source, declaration.source) && !mayReplace(name)) {
      await reinstall(scope, previous)
      throw new ConflictError(manualEntryConflict(name))
    }
    await patch(declaration, name, scope)
    return { name }
  }

  /** Ghi entry đúng như khai báo: `source` (giữ `path` tương đối) và đúng các field phụ đã khai báo. */
  async function patch(declaration: MarketplaceDeclaration, name: string, scope: Scope): Promise<void> {
    await writeEntry(scope, name, { source: declaration.source, ...declaration.extras })
  }

  async function remove(name: string, scope: Scope): Promise<void> {
    await runMarketplaceCommand('remove', name, '--scope', scope)
  }

  function sourceArgument(source: MarketplaceSource): string {
    switch (source.source) {
      case 'github':
        return withRef(source.repo as string, '@', source.ref)
      case 'git':
        return withRef(source.url as string, '#', source.ref)
      case 'url':
        return source.url as string
      case 'directory':
      case 'file':
        return resolve(location.cwd, source.path as string)
      default:
        throw new Error(`unsupported marketplace source "${source.source}"`)
    }
  }

  /**
   * Plugin entry của một scope, kèm Bản cài plugin của scope đó (`installed_plugins.json`; `project`/`local` theo repo).
   * Không dùng `claude plugin list --json`: `enabled` ở đó là giá trị đã gộp mọi scope và plugin chưa cài bị bỏ qua.
   */
  async function listPlugins(scope: Scope): Promise<PluginEntry[]> {
    const enabled: Record<string, unknown> = (await readSettings(scope)).enabledPlugins ?? {}
    const records =
      (await readJson<{ plugins?: Record<string, Array<{ scope: string; projectPath?: string }>> }>(installedPluginsPath(location)))
        .plugins ?? {}
    const installed = Object.keys(records).filter((id) =>
      records[id]!.some((r) => r.scope === scope && (scope === 'user' || r.projectPath === location.cwd)),
    )
    const ids = [...new Set([...Object.keys(enabled), ...installed])]
    return ids.map((id) => ({
      id,
      enabled: typeof enabled[id] === 'boolean' ? (enabled[id] as boolean) : undefined,
      installed: installed.includes(id),
    }))
  }

  /** Chạy `claude plugin <action> --json`; trả về `failureCode` khi lỗi, các code nằm trong `accept` coi như thành công. */
  async function runPluginCommand(action: string, id: string, scope: Scope, accept: string[] = []) {
    const result = await exec('claude', ['plugin', action, id, '--scope', scope, '--json'])
    if (result.code === 0) return undefined
    const outcome = parseOutcome(result.stdout)
    if (outcome.failureCode && accept.includes(outcome.failureCode)) return outcome.failureCode
    throw new Error(outcome.message ?? (result.stderr.trim() || `claude plugin ${action} ${id} exited with ${result.code}`))
  }

  /** Cài và bật; lỗi (vd. plugin cần `-y`) kèm lệnh để người dùng tự chạy, vì `ap` không tự chấp nhận lệnh của marketplace. */
  async function installPlugin(id: string, scope: Scope) {
    try {
      await runPluginCommand('install', id, scope)
    } catch (error) {
      throw new Error(`${(error as Error).message}; to install it by hand, run \`claude plugin install ${id} --scope ${scope}\``)
    }
  }

  async function enablePlugin(id: string, scope: Scope) {
    await runPluginCommand('enable', id, scope, ['already_in_goal_state'])
  }

  /** `claude plugin disable` không tạo được `false` khi scope chưa có khoá, nên `ap` tự ghi. */
  async function disablePlugin(id: string, scope: Scope) {
    await writePlugin(scope, id, false)
  }

  /** Gỡ Bản cài và khoá của scope; không có Bản cài thì `uninstall` để lại khoá, nên `ap` tự xoá. */
  async function uninstallPlugin(id: string, scope: Scope) {
    const code = await runPluginCommand('uninstall', id, scope, ['not_installed_at_scope'])
    if (code) await writePlugin(scope, id, undefined)
  }

  async function unsetPlugin(id: string, scope: Scope) {
    await writePlugin(scope, id, undefined)
  }

  async function writePlugin(scope: Scope, id: string, value: boolean | undefined) {
    const settings = await readSettings(scope)
    const { [id]: _, ...rest } = settings.enabledPlugins ?? {}
    settings.enabledPlugins = value === undefined ? rest : { ...rest, [id]: value }
    await writeJson(settingsPath(scope, location), settings)
  }

  /**
   * Bản cài MCP server của một scope: `.mcp.json` (`project`), `projects[<cwd>].mcpServers` (`local`) hoặc `mcpServers`
   * (`user`) của `.claude.json`. Đọc thẳng file vì `claude mcp get/list` không có output JSON; chỉ ghi qua `claude mcp`.
   */
  async function listMcp(scope: Scope): Promise<Record<string, McpConfig>> {
    if (scope === 'project') return (await readJson<Record<string, any>>(join(location.cwd, '.mcp.json'))).mcpServers ?? {}
    const claudeJson = await readJson<Record<string, any>>(claudeJsonPath(location))
    return (scope === 'user' ? claudeJson.mcpServers : claudeJson.projects?.[location.cwd]?.mcpServers) ?? {}
  }

  async function runMcpCommand(...args: string[]) {
    const result = await exec('claude', ['mcp', ...args])
    if (result.code !== 0) throw new Error(result.stderr.trim() || `claude mcp ${args[0]} exited with ${result.code}`)
  }

  async function addMcp(name: string, server: McpConfig, scope: Scope) {
    await runMcpCommand('add-json', name, JSON.stringify(server), '--scope', scope)
  }

  async function removeMcp(name: string, scope: Scope) {
    await runMcpCommand('remove', name, '--scope', scope)
  }

  /**
   * Các tên trong `.mcp.json` người dùng chưa duyệt hay từ chối: không có trong `enabledMcpjsonServers`/`disabledMcpjsonServers`
   * của `.claude.json` (theo repo) hay của settings, và không bật `enableAllProjectMcpServers`. `ap` không duyệt thay (ADR 0006).
   */
  async function pendingMcp(names: string[]): Promise<string[]> {
    const project = (await readJson<Record<string, any>>(claudeJsonPath(location))).projects?.[location.cwd] ?? {}
    const sources = [project, ...(await Promise.all(SCOPES.map(readSettings)))]
    if (sources.some((s) => s.enableAllProjectMcpServers === true)) return []
    const decided = new Set(sources.flatMap((s) => [...(s.enabledMcpjsonServers ?? []), ...(s.disabledMcpjsonServers ?? [])]))
    return names.filter((n) => !decided.has(n))
  }

  /**
   * Tên MCP server của các plugin đang bật và đã cài ở scope này, đọc từ manifest của Bản cài plugin:
   * `.mcp.json` ở gốc plugin (có hoặc không có khoá `mcpServers`) và `mcpServers` của `.claude-plugin/plugin.json`
   * (map, hoặc đường dẫn tới một file cùng dạng với `.mcp.json`).
   */
  async function pluginMcpServers(scope: Scope): Promise<Array<{ plugin: string; name: string }>> {
    const enabled: Record<string, unknown> = (await readSettings(scope)).enabledPlugins ?? {}
    const records =
      (await readJson<{ plugins?: Record<string, Array<{ scope: string; projectPath?: string; installPath?: string }>> }>(
        installedPluginsPath(location),
      )).plugins ?? {}
    const found: Array<{ plugin: string; name: string }> = []
    for (const [id, installs] of Object.entries(records)) {
      if (enabled[id] !== true) continue
      const install = installs.find((r) => r.scope === scope && (scope === 'user' || r.projectPath === location.cwd))
      if (!install?.installPath) continue
      const serversIn = (file: Record<string, any>) => file.mcpServers ?? file
      const manifest = await readJson<Record<string, any>>(join(install.installPath, '.claude-plugin/plugin.json'))
      const declared = manifest.mcpServers
      const [mcpJson, linked] = await Promise.all([
        readJson<Record<string, any>>(join(install.installPath, '.mcp.json')),
        typeof declared === 'string' ? readJson<Record<string, any>>(resolve(install.installPath, declared)) : {},
      ])
      const servers = {
        ...serversIn(mcpJson),
        ...serversIn(linked),
        ...(declared && typeof declared === 'object' ? declared : {}),
      }
      for (const name of Object.keys(servers)) found.push({ plugin: id.split('@')[0]!, name })
    }
    return found
  }

  return {
    listMcp,
    addMcp,
    removeMcp,
    pendingMcp,
    pluginMcpServers,
    list,
    listElsewhere,
    put,
    patch,
    remove,
    listPlugins,
    installPlugin,
    enablePlugin,
    disablePlugin,
    uninstallPlugin,
    unsetPlugin,
  }
}

function parseOutcome(stdout: string): { failureCode?: string; message?: string } {
  try {
    return JSON.parse(stdout.trim().split('\n').at(-1) ?? '')
  } catch {
    return {}
  }
}

/** Ghim ref theo cú pháp của `claude plugin marketplace add`: `owner/repo@ref`, `<git-url>#ref`. */
function withRef(base: string, separator: string, ref: unknown): string {
  return typeof ref === 'string' ? `${base}${separator}${ref}` : base
}
