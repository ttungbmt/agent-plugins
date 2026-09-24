import { join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { claudeJsonPath, installedPluginsPath, knownMarketplacesPath, readJson, SCOPES, settingsPath, writeJson, type Location } from './files.js'
import { crossScopeConflict, manualEntryConflict, sameInstall, sameSource } from './identity.js'
import type { Conflict, KnownEntry, MarketplaceDeclaration, MarketplaceSource, McpConfig, PluginEntry, Scope, ScopedEntry } from './types.js'

export type Exec = (command: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>

export class ConflictError extends Error {
  constructor(readonly conflict: Conflict) {
    super(conflict.detail)
  }
}

/** Each Scope's Known marketplace entries, Plugin entries and Installed MCP servers; written through the `claude` CLI (ADR 0001, ADR 0006). */
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

  /**
   * Names of the Installed marketplaces (`known_marketplaces.json`). An entry can stay in a scope's settings after its
   * install is gone, and `claude plugin install` only sees what is installed.
   */
  async function listInstalled(): Promise<Set<string>> {
    return new Set(Object.keys(await readJson<Record<string, unknown>>(knownMarketplacesPath(location))))
  }

  /** Entries of the other scopes: they share the install with the scope being synced. */
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

  /** Reinstall an existing entry: `add` its source again so the shared install points back to it, then rewrite the entry as it was. */
  async function reinstall(scope: Scope, entry: KnownEntry) {
    await runMarketplaceCommand('add', sourceArgument(entry.source), '--scope', scope)
    await writeEntry(scope, entry.name, { source: entry.source, ...entry.extras })
  }

  /**
   * Declare a marketplace through `claude plugin marketplace add`. claude resolves the name; if that name overwrites an
   * entry with a different source that `mayReplace` does not allow, or matches the name of another scope's entry with a
   * different source (a Shorthand declaration's name is only known after `add`), the old entry and its install are
   * restored and a ConflictError is thrown. `known` is the name the plan already found in Lock/State or settings: `add`
   * leaves an existing entry unchanged, so the name cannot be read from what `add` changed.
   */
  async function put(
    declaration: MarketplaceDeclaration,
    scope: Scope,
    { mayReplace, known }: { mayReplace: (name: string) => boolean; known?: string | null },
  ): Promise<{ name: string }> {
    const before = await list(scope)
    const elsewhere = await listElsewhere(scope)
    await runMarketplaceCommand('add', sourceArgument(declaration.source), '--scope', scope)
    const after = await list(scope)
    const changed = after.find((e) => !before.some((b) => isDeepStrictEqual(b, e)))
    const name = declaration.name ?? changed?.name ?? known
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

  /** Write the entry exactly as declared: `source` (keeping a relative `path`) and exactly the declared extra fields. */
  async function patch(declaration: MarketplaceDeclaration, name: string, scope: Scope): Promise<void> {
    await writeEntry(scope, name, { source: declaration.source, ...declaration.extras })
  }

  async function remove(name: string, scope: Scope): Promise<void> {
    await runMarketplaceCommand('remove', name, '--scope', scope)
  }

  /**
   * Drop only the Known marketplace entry, for an entry moving to another Scope (ADR 0011): `claude plugin marketplace
   * remove` would also drop the Scope's `*@name` plugin entries, which stay declared.
   */
  async function forget(name: string, scope: Scope): Promise<void> {
    await writeEntry(scope, name, undefined)
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
   * A scope's Plugin entries, plus that scope's Installed plugins (`installed_plugins.json`; `project`/`local` per repo).
   * Does not use `claude plugin list --json`: its `enabled` is merged across every scope and it skips plugins not installed.
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

  /** Run `claude plugin <action> --json`; returns the `failureCode` on failure, treating codes in `accept` as success. */
  async function runPluginCommand(action: string, id: string, scope: Scope, accept: string[] = []) {
    const result = await exec('claude', ['plugin', action, id, '--scope', scope, '--json'])
    if (result.code === 0) return undefined
    const outcome = parseOutcome(result.stdout)
    if (outcome.failureCode && accept.includes(outcome.failureCode)) return outcome.failureCode
    throw new Error(outcome.message ?? (result.stderr.trim() || `claude plugin ${action} ${id} exited with ${result.code}`))
  }

  /** Install and enable; an error (e.g. the plugin needs `-y`) includes the command for the user to run, since `ap` never accepts a marketplace's commands on its own. */
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

  /** `claude plugin disable` cannot create `false` when the scope has no key yet, so `ap` writes it itself. */
  async function disablePlugin(id: string, scope: Scope) {
    await writePlugin(scope, id, false)
  }

  /** Remove the Installed plugin and the scope's key; without an Installed plugin `uninstall` leaves the key, so `ap` deletes it itself. */
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
   * A scope's Installed MCP servers: `.mcp.json` (`project`), or `projects[<cwd>].mcpServers` (`local`) or `mcpServers`
   * (`user`) of `.claude.json`. Reads the files directly since `claude mcp get/list` has no JSON output; writes only
   * through `claude mcp`.
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
   * Names in `.mcp.json` the user has neither approved nor rejected: absent from `enabledMcpjsonServers`/`disabledMcpjsonServers`
   * of `.claude.json` (per repo) and of settings, with `enableAllProjectMcpServers` not on. `ap` never approves on the user's behalf (ADR 0006).
   */
  async function pendingMcp(names: string[]): Promise<string[]> {
    const project = (await readJson<Record<string, any>>(claudeJsonPath(location))).projects?.[location.cwd] ?? {}
    const sources = [project, ...(await Promise.all(SCOPES.map(readSettings)))]
    if (sources.some((s) => s.enableAllProjectMcpServers === true)) return []
    const decided = new Set(sources.flatMap((s) => [...(s.enabledMcpjsonServers ?? []), ...(s.disabledMcpjsonServers ?? [])]))
    return names.filter((n) => !decided.has(n))
  }

  /**
   * MCP server names of the plugins enabled and installed at this scope, read from the Installed plugin's manifests:
   * `.mcp.json` at the plugin root (with or without an `mcpServers` key) and `mcpServers` in `.claude-plugin/plugin.json`
   * (a map, or a path to a file shaped like `.mcp.json`).
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
    listInstalled,
    listElsewhere,
    put,
    patch,
    remove,
    forget,
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

/** Pin a ref using the syntax of `claude plugin marketplace add`: `owner/repo@ref`, `<git-url>#ref`. */
function withRef(base: string, separator: string, ref: unknown): string {
  return typeof ref === 'string' ? `${base}${separator}${ref}` : base
}
