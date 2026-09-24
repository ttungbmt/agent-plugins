import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AGENTS } from './agents.js'
import { collectItems, type CollectedItems } from './collect-items.js'
import { identifies, knownName, missingMarketplaceConflict, sameSource } from './identity.js'
import { checkMarketplaces, manualPluginsOf, planPlugins, pluginsInUseConflict, type PlannedPluginAction, type PluginPlan } from './plan-plugins.js'
import type { Location } from './files.js'
import type { ItemHandler } from './items.js'
import { normalizeHook, planHooks, readSettingsHooks, writeSettingsHooks, type PlannedHookAction } from './hooks.js'
import { planMcp, unsetVariables, type PlannedMcpAction } from './mcp.js'
import { planItems, type DesiredItem, type ItemPlan, type PlannedItemAction } from './plan-items.js'
import { planSync, type PlannedAction } from './plan.js'
import { ConflictError, createRegistry, type Exec } from './registry.js'
import { resolveConfig, type Fetch } from './resolve.js'
import { RULES } from './rules.js'
import { createGitFetcher, SKILLS, type FetchedSource, type FetchSkillSource } from './skills.js'
import { ledger } from './ledger.js'
import { createStore, NO_OWNED } from './store.js'
import { byKind, ITEM_KINDS } from './types.js'
import { missingDependencyNotices, WORKFLOWS, workflowsSwitchedOff } from './workflows.js'
import type { ByKind, Claim, Conflict, ItemDeclaration, ItemKind, ItemSource, KnownEntry, ManagedEntry, ManagedHook, ManagedItem, ManagedMcp, ManagedPlugin, MarketplaceDeclaration, McpDeclaration, MarketplaceSource, PluginDeclaration, Scope, SharedItemClaim, SourceCatalog } from './types.js'

export type { Scope } from './types.js'
export type SyncMode = 'apply' | 'dry-run' | 'check'

export type SyncAction = {
  target: 'marketplace' | 'plugin' | ItemKind | 'mcp' | 'hook'
  /** `fetch`: fetching a Skill source/Agent source; appears in the report only on failure. */
  kind: PlannedAction['kind'] | PlannedPluginAction['kind'] | PlannedItemAction['kind'] | PlannedMcpAction['kind'] | PlannedHookAction['kind'] | 'fetch'
  /** Marketplace name, plugin id `name@marketplace`, or Skill/Agent/MCP server/Hook declaration name; null when unknown. */
  name: string | null
  source: MarketplaceSource | null
  status: 'planned' | 'done' | 'failed'
  error?: string
  /** Set only for an action outside the targeted Scope: a User-scoped marketplace, plugin or MCP server (ADR 0011, 0012, 0014). */
  scope?: 'user'
}

export type SyncReport = {
  actions: SyncAction[]
  conflicts: Conflict[]
  notices: string[]
  inSync: boolean
}

/** Reports progress per action during apply, since each action calls `claude` or `git` and may need to clone. */
export type SyncProgress =
  | { phase: 'start'; action: Omit<SyncAction, 'status' | 'error'> }
  | { phase: 'end'; action: SyncAction; ms: number }

type Step =
  /** `scope` is set only for a User-scoped marketplace, plugin or MCP server synced outside the targeted Scope (ADR 0011, 0012, 0014). */
  | { target: 'marketplace'; action: PlannedAction; scope?: 'user' }
  | { target: 'plugin'; action: PlannedPluginAction; scope?: 'user' }
  | { target: ItemKind; action: PlannedItemAction }
  | { target: 'mcp'; action: PlannedMcpAction; scope?: 'user' }
  | { target: 'hook'; action: PlannedHookAction }

/** Syncing Skills or Agents for one Scope: the declarations, the recorded state and the plan for that kind. */
type ItemSync = {
  handler: ItemHandler
  /** This kind's directory in the Scope; null for the `local` scope. */
  dir: string | null
  managed: ManagedItem[]
  catalogs: SourceCatalog[]
  collected: CollectedItems | null
  plan: ItemPlan
}

/** How each kind of item is fetched and installed. */
const HANDLERS: ByKind<ItemHandler> = { skill: SKILLS, agent: AGENTS, rule: RULES, workflow: WORKFLOWS }

const EMPTY_PLAN: ItemPlan = { actions: [], conflicts: [], notices: [], adopted: [], forgotten: [] }

/** Syncs the Config's Marketplace, Plugin, Skill, Agent, MCP server and Hook declarations into one Scope. */
export async function sync(
  opts: { cwd: string; scope: Scope; mode: SyncMode; force?: boolean; update?: boolean },
  deps: {
    exec: Exec
    fetch: Fetch
    homedir: string
    /** Claude Code's config directory (`CLAUDE_CONFIG_DIR`), `~/.claude` by default. */
    claudeDir?: string
    defaultPresetsDir: string
    /** Fetches a Skill source/Agent source; defaults to `git` via `exec` (ADR 0005). */
    fetchSkillSource?: FetchSkillSource
    onProgress?: (event: SyncProgress) => void
    /** Environment used to warn about unset `${VAR}` in MCP server configs; defaults to `process.env`. */
    env?: Record<string, string | undefined>
  },
): Promise<SyncReport> {
  const { cwd, scope, mode } = opts
  const force = opts.force ?? false
  const location = { cwd, homedir: deps.homedir, claudeDir: deps.claudeDir }
  const registry = createRegistry({ exec: deps.exec, ...location })
  const store = createStore(location)

  const loaded = await store.load(scope)
  const { managed, managedPlugins, pins, shared, sharedPlugins } = loaded
  const resolved = await resolveConfig(join(cwd, 'agent-plugins.yaml'), {
    fetch: deps.fetch,
    pins,
    update: opts.update ?? false,
    cacheDir: join(cwd, '.agent-plugins/cache'),
    writeCache: mode === 'apply',
    defaultPresetsDir: deps.defaultPresetsDir,
  })
  const actual = await registry.list(scope)
  const actualPlugins = await registry.listPlugins(scope)
  const blocked = resolved.conflicts.map((c) => c.name)
  const elsewhere = { cwd, entries: await registry.listElsewhere(scope) }
  const installed = await registry.listInstalled()
  // User-scoped marketplaces (ADR 0011) are planned against the `user` Scope, with this Config's record for the
  // targeted Scope; a `user` Sync plans them like any other declaration.
  const lifted = scope === 'user' ? [] : resolved.declarations.filter((d) => d.scope === 'user')
  const declarations = resolved.declarations.filter((d) => !lifted.includes(d))
  const user = scope === 'user' ? null : await planUserScoped()
  const plan = planSync(declarations, actual, managed, { force, blocked, shared, elsewhere, installed })
  const held = new Set([...resolved.conflicts, ...plan.conflicts, ...(user?.plan.conflicts ?? [])].map((c) => c.name))
  const names = [
    ...declarations.map((d) => knownName(d, managed, actual)),
    ...lifted.map((d) => knownName(d, user!.managed, user!.actual)),
  ]
  const checked = checkMarketplaces(
    resolved.plugins,
    new Set([...names.filter((n): n is string => n !== null), ...held]),
    names.includes(null),
  )
  // A plugin whose marketplace is no longer declared is held like any conflict: its Managed entry stays, and so does the
  // marketplace it still uses (see `inUse`), until both are dropped from the declarations.
  const unmatched = resolved.plugins.filter((p) => !checked.plugins.includes(p))
  const desiredPlugins = [...checked.plugins, ...unmatched]
  // User-scoped plugins (ADR 0012) are planned against the `user` Scope, like User-scoped marketplaces.
  const liftedPlugins = scope === 'user' ? [] : desiredPlugins.filter((p) => p.scope === 'user')
  const pluginHeld = new Set([...held, ...unmatched.map((p) => p.marketplace)])
  const pluginPlan = planPlugins(
    desiredPlugins.filter((p) => !liftedPlugins.includes(p)),
    actualPlugins,
    managedPlugins,
    { force, held: pluginHeld, shared: sharedPlugins },
  )
  const userPluginPlan =
    user &&
    planPlugins(liftedPlugins, user.plugins, user.managedPlugins, { force, held: pluginHeld, shared: user.sharedPlugins })
  // A plugin moving between the targeted Scope and `user` stays at the old Scope while the new one has a conflict (ADR 0012).
  const conflictedAt = (plan: PluginPlan | null) => new Set(plan?.conflicts.map((c) => c.name))
  const [targetConflicts, userConflicts] = [conflictedAt(pluginPlan), conflictedAt(userPluginPlan)]
  const isRemoval = (a: PlannedPluginAction) => a.kind === 'uninstall' || a.kind === 'unset'
  const targetPluginActions = pluginPlan.actions.filter((a) => !(isRemoval(a) && userConflicts.has(a.id)))
  const inUse = new Set(resolved.plugins.map((p) => p.marketplace))
  const conflicts = [
    ...resolved.conflicts,
    ...plan.conflicts,
    ...(user?.plan.conflicts ?? []),
    ...checked.conflicts,
    ...pluginPlan.conflicts,
    ...(userPluginPlan?.conflicts ?? []),
  ]
  const notices = [...resolved.notices, ...checked.notices, ...pluginPlan.notices, ...(userPluginPlan?.notices ?? [])]

  const fetchSource = mode === 'apply' ? sharedFetcher(deps.fetchSkillSource ?? createGitFetcher(deps.exec, cwd)) : null
  const blockedSources = new Set(resolved.conflicts.filter((c) => c.reason === 'preset-clash').map((c) => c.name))
  const syncItems = async (
    handler: ItemHandler,
    declarations: ItemDeclaration[],
    managed: ManagedItem[],
    catalogs: SourceCatalog[],
    shared: SharedItemClaim[],
  ): Promise<ItemSync> => {
    const { kind } = handler
    const dir = handler.dir(scope, location)
    const run: ItemSync = { handler, dir, managed, catalogs, collected: null, plan: EMPTY_PLAN }
    if (!dir) {
      if (declarations.length) notices.push(`${kind}s are not synced in local scope: Claude Code has no local ${kind}s directory`)
      return run
    }
    const namespaces = handler.namespace
      ? [...new Set([...declarations.map((d) => handler.namespace!(d.source)), ...managed.map((m) => m.name.split('/')[0]!)])]
      : []
    const installed = await handler.list(dir, namespaces)
    for (const { name, files } of installed) {
      if (files && files.length > 1) notices.push(`${kind} "${name}" is defined by ${files.join(', ')} in ${dir}; Claude Code runs only one of them`)
    }
    run.collected = await collectItems(handler, declarations, managed, {
      catalogs,
      installed,
      force,
      fetch: fetchSource,
      update: opts.update ?? false,
      blocked: blockedSources,
      onFetch: deps.onProgress && ((source, run) => reportFetch(kind, source, run, deps.onProgress!)),
    })
    run.plan = planItems(kind, run.collected.desired, installed, managed, { force, held: run.collected.held, shared })
    conflicts.push(...run.collected.conflicts, ...run.plan.conflicts)
    notices.push(...run.collected.notices, ...run.plan.notices)
    return run
  }
  const items = {} as ByKind<ItemSync>
  for (const kind of ITEM_KINDS) {
    items[kind] = await syncItems(HANDLERS[kind], resolved.items[kind], loaded.managedItems[kind], loaded.itemCatalogs[kind], loaded.sharedItems[kind])
  }
  const itemRuns = ITEM_KINDS.map((kind) => items[kind])
  notices.push(...(await workflowDependencies(items, location)))
  if (resolved.items.workflow.length) {
    const off = await workflowsSwitchedOff(location, deps.env ?? process.env)
    if (off) notices.push(`workflows are switched off (${off}); installed workflows will not run until they are turned on`)
  }

  const actualMcp = await registry.listMcp(scope)
  const env = deps.env ?? process.env
  for (const { name, server } of resolved.mcpServers) {
    for (const variable of unsetVariables(server, env)) notices.push(`MCP server "${name}" uses \${${variable}}, which is not set in this environment`)
  }
  // User-scoped MCP servers (ADR 0014) are planned against the `user` Scope, like User-scoped plugins.
  const liftedMcp = scope === 'user' ? [] : resolved.mcpServers.filter((d) => d.scope === 'user')
  const targetMcp = resolved.mcpServers.filter((d) => !liftedMcp.includes(d))
  const mcpHeld = new Set(resolved.mcpConflicts.map((c) => c.name))
  const mcpPlan = planMcp(targetMcp, actualMcp, loaded.managedMcp, { force, held: mcpHeld, shared: loaded.sharedMcp })
  const userMcpPlan = user && planMcp(liftedMcp, user.mcp, user.managedMcp, { force, held: mcpHeld, shared: user.sharedMcp })
  for (const name of userMcpPlan?.forgotten ?? []) {
    if (liftedMcp.some((d) => d.name === name) || !user!.sharedMcp.some((c) => c.name === name)) continue
    notices.push(`MCP server "${name}" stays in user settings because another Config declares it; turn it off for this repo with /mcp in Claude Code`)
  }
  // Kept apart from `conflicts` (which shares names across marketplace/plugin/Skill/Agent), merged only into the report.
  const mcpConflicts = [...resolved.mcpConflicts, ...mcpPlan.conflicts, ...(userMcpPlan?.conflicts ?? [])]
  const mcpSettled = (name: string) => !mcpConflicts.some((c) => c.name === name)
  const hookPlan = planHooks(resolved.hooks, await readSettingsHooks(scope, location), loaded.managedHooks)

  // Removing a marketplace takes all its Plugin entries with it, so a marketplace with Manual plugin entries is kept.
  const ownedPlugins = new Set([
    ...managedPlugins.map((m) => m.id),
    ...targetPluginActions.filter((a) => 'adopt' in a && a.adopt).map((a) => a.id),
  ])
  // A name still declared on the other side of this Sync is moving between the targeted Scope and `user` (ADR 0011):
  // only its entry goes, so its plugins stay.
  const moving = new Set(names.filter((n): n is string => n !== null))
  const removals = plan.actions.filter((a) => {
    if (a.kind === 'remove' && inUse.has(a.name) && !moving.has(a.name)) return false
    if (a.kind !== 'remove' || force || moving.has(a.name)) return a.kind === 'remove'
    const manual = manualPluginsOf(a.name, actualPlugins, ownedPlugins)
    if (manual.length) conflicts.push(pluginsInUseConflict(a.name, manual))
    return manual.length === 0
  })
  // Hook steps don't run one by one: they are folded into a single settings write (`writeHooks`).
  // Removing a marketplace also drops the `user` Scope's plugins from it; only this Config's User-scoped plugins may go.
  const ownedUserPlugins = new Set([
    ...(user?.managedPlugins ?? []).map((m) => m.id).filter((id) => !userPluginPlan?.forgotten.includes(id)),
    ...(userPluginPlan?.actions ?? []).filter((a) => 'adopt' in a && a.adopt).map((a) => a.id),
  ])
  const userRemovals = (user?.plan.actions ?? []).filter((a) => {
    if (a.kind === 'remove' && inUse.has(a.name) && !moving.has(a.name)) return false
    if (a.kind !== 'remove' || force || moving.has(a.name)) return a.kind === 'remove'
    const manual = manualPluginsOf(a.name, user!.plugins, ownedUserPlugins)
    if (manual.length) conflicts.push(pluginsInUseConflict(a.name, manual))
    return manual.length === 0
  })
  const userSteps = (removing: boolean) =>
    (removing ? userRemovals : (user?.plan.actions ?? []).filter((a) => a.kind !== 'remove'))
      .map((action) => ({ target: 'marketplace' as const, action, scope: 'user' as const }))
  // A User-scoped plugin is installed or enabled before the targeted Scope's plugins and dropped after them, so a plugin
  // moving between the two Scopes is never missing from both.
  const userPluginSteps = (removing: boolean) =>
    (userPluginPlan?.actions ?? [])
      .filter((a) => isRemoval(a) === removing && !(removing && targetConflicts.has(a.id)))
      .map((action) => ({ target: 'plugin' as const, action, scope: 'user' as const }))
  // A User-scoped MCP server is added before the targeted Scope's servers and removed after them, and a server moving
  // between the two Scopes stays at the old one while the new one has a conflict (ADR 0014).
  const [targetMcpConflicts, userMcpConflicts] = [mcpPlan, userMcpPlan].map((p) => new Set(p?.conflicts.map((c) => c.name)))
  const userMcpSteps = (removing: boolean) =>
    (userMcpPlan?.actions ?? [])
      .filter((a) => (a.kind === 'remove') === removing && !(removing && targetMcpConflicts!.has(a.name)))
      .map((action) => ({ target: 'mcp' as const, action, scope: 'user' as const }))
  const steps: Exclude<Step, { target: 'hook' }>[] = [
    // User-scope entries first, so the plugins of the targeted Scope find their marketplace (ADR 0011).
    ...userSteps(false),
    ...plan.actions.filter((a) => a.kind !== 'remove').map((action) => ({ target: 'marketplace' as const, action })),
    ...userPluginSteps(false),
    ...targetPluginActions.map((action) => ({ target: 'plugin' as const, action })),
    ...userPluginSteps(true),
    ...removals.map((action) => ({ target: 'marketplace' as const, action })),
    ...userSteps(true),
    ...itemRuns.flatMap(({ handler, plan }) => plan.actions.map((action) => ({ target: handler.kind, action }))),
    ...userMcpSteps(false),
    ...mcpPlan.actions
      .filter((a) => !(a.kind === 'remove' && userMcpConflicts!.has(a.name)))
      .map((action) => ({ target: 'mcp' as const, action })),
    ...userMcpSteps(true),
  ]
  const hookSteps: Step[] = hookPlan.actions.map((action) => ({ target: 'hook' as const, action }))

  /** Runs after the plugin step (Q8 of ADR 0006): warns about name clashes with plugin MCP servers, and lists `.mcp.json` servers awaiting approval. */
  const mcpNotices = async () => {
    const mine = resolved.mcpServers.filter((d) => mcpSettled(d.name)).map((d) => d.name)
    for (const { plugin, name } of await registry.pluginMcpServers(scope)) {
      if (mine.includes(name)) notices.push(`MCP server "${name}" has the same name as one plugin ${plugin} provides (plugin:${plugin}:${name}); both will run`)
    }
    // Only servers actually in `.mcp.json` (in dry-run: about to be added) await approval; not when `add-json` failed.
    // User-scoped MCP servers live in `~/.claude.json`, which has no approval step.
    const inMcpJson = targetMcp.filter((d) => mcpSettled(d.name)).map((d) => d.name)
    const present = mode === 'apply' ? await registry.listMcp(scope) : null
    const pending = scope === 'project' ? await registry.pendingMcp(inMcpJson.filter((n) => !present || n in present)) : []
    if (pending.length) {
      notices.push(`approve MCP servers ${pending.map((n) => `"${n}"`).join(', ')} in Claude Code: servers in .mcp.json stay pending until approved, and ap does not approve them`)
    }
  }

  if (mode !== 'apply') {
    const actions: SyncAction[] = [
      ...[...steps, ...hookSteps].map((step) => ({ ...describe(step), status: 'planned' as const })),
      ...itemRuns.flatMap(({ handler, collected }) =>
        (collected?.unknown ?? []).map((source) => ({ target: handler.kind, kind: 'install' as const, name: null, source, status: 'planned' as const })),
      ),
    ]
    await mcpNotices()
    conflicts.push(...mcpConflicts)
    return { actions, conflicts, notices, inSync: actions.length === 0 && conflicts.length === 0 }
  }

  const byName = (m: { name: string }) => m.name
  const byId = (m: { id: string }) => m.id
  const noPlan = { adopted: [], forgotten: [] }
  const toPlugin = ({ id, enabled, origin }: PluginDeclaration): ManagedPlugin => ({ id, enabled, origin })
  const toMcp = ({ name, server, origin }: McpDeclaration): ManagedMcp => ({ name, server, origin })
  const records = ledger(managed, byName, plan, (a) => record(a.name, a.declaration))
  const userRecords = ledger(user?.managed ?? [], byName, user?.plan ?? noPlan, (a) => record(a.name, a.declaration))
  const pluginRecords = ledger(managedPlugins, byId, pluginPlan, toPlugin)
  const userPluginRecords = ledger(user?.managedPlugins ?? [], byId, userPluginPlan ?? noPlan, toPlugin)
  const mcpRecords = ledger(loaded.managedMcp, byName, mcpPlan, toMcp)
  const userMcpRecords = ledger(user?.managedMcp ?? [], byName, userMcpPlan ?? noPlan, toMcp)
  const hookRecords = ledger(loaded.managedHooks, byName, { ...hookPlan, adopted: [] }, (m: ManagedHook) => m)
  const toItem = ({ name, source, sha256, origin }: DesiredItem): ManagedItem => ({ name, source, sha256: sha256!, origin })
  const itemRecords = byKind((kind) => ledger(items[kind].managed, byName, items[kind].plan, toItem))
  /** Marketplaces whose step failed, with the Scope they were meant for. */
  const failedMarketplaces = new Map<string | null, Scope>()
  /** Plugins whose install/enable/disable failed, with their Scope; one moving there keeps its old Scope (ADR 0012). */
  const failedPlugins = new Map<string, Scope>()
  /** MCP servers whose add/update failed, with their Scope; one moving there keeps its old Scope (ADR 0014). */
  const failedMcp = new Map<string, Scope>()
  // A Manual entry that matches the declaration exactly: adopt it, reported only once.
  const adoptedNotice = (what: string) => notices.push(`ap now manages ${what}, which was set up by hand`)
  for (const name of [...records.adopted, ...userRecords.adopted, ...pluginRecords.adopted, ...userPluginRecords.adopted]) {
    adoptedNotice(`"${name}"`)
  }
  for (const name of [...mcpRecords.adopted, ...userMcpRecords.adopted]) adoptedNotice(`MCP server "${name}"`)
  for (const kind of ITEM_KINDS) {
    for (const name of itemRecords[kind].adopted) adoptedNotice(`${kind} "${name}"`)
  }

  const actions: SyncReport['actions'] = itemRuns.flatMap(({ handler, collected }) =>
    (collected?.failures ?? []).map(({ source, error }) => ({
      target: handler.kind,
      kind: 'fetch' as const,
      name: null,
      source,
      status: 'failed' as const,
      error,
    })),
  )
  for (const step of steps) {
    const started = Date.now()
    deps.onProgress?.({ phase: 'start', action: describe(step) })
    try {
      const name =
        step.target === 'marketplace'
          ? await applyMarketplace(step.action, step.scope)
          : step.target === 'plugin'
            ? await applyPlugin(step.action, step.scope)
            : step.target === 'mcp'
              ? await applyMcp(step.action, step.scope)
              : await applyItem(step.target, step.action)
      actions.push({ ...describe(step), name, status: 'done' })
    } catch (error) {
      if (error instanceof ConflictError) conflicts.push(error.conflict)
      if (step.target === 'marketplace') failedMarketplaces.set(step.action.name, step.scope ?? scope)
      if (step.target === 'plugin' && 'declaration' in step.action) failedPlugins.set(step.action.id, step.scope ?? scope)
      if (step.target === 'mcp' && step.action.kind !== 'remove') failedMcp.set(step.action.name, step.scope ?? scope)
      actions.push({ ...describe(step), status: 'failed', error: (error as Error).message })
    }
    deps.onProgress?.({ phase: 'end', action: actions.at(-1)!, ms: Date.now() - started })
  }
  await writeHooks()
  await Promise.all([...new Set(itemRuns.flatMap((i) => i.collected?.fetched ?? []))].map((f) => f.cleanup()))
  // Managed skills/agents that need no re-copy still get the latest source and origin; their commit lives in the Source catalog.
  for (const kind of ITEM_KINDS) {
    for (const { name, source, sha256, origin } of items[kind].collected?.desired ?? []) {
      const record = itemRecords[kind].get(name)
      if (record?.sha256 === sha256) itemRecords[kind].set({ name, source, sha256, origin })
    }
  }

  /** `at` is set for a User-scoped marketplace, which lives in the `user` Scope and its own records. */
  async function applyMarketplace(action: PlannedAction, at?: 'user'): Promise<string | null> {
    const [target, owned] = at ? [at, userRecords] : [scope, records]
    if (action.kind === 'remove') {
      await (moving.has(action.name) ? registry.forget(action.name, target) : registry.remove(action.name, target))
      owned.delete(action.name)
      return action.name
    }
    if (action.kind === 'patch') {
      const name = action.name as string
      await registry.patch(action.declaration, name, target)
      owned.set(record(name, action.declaration))
      return name
    }
    const mayReplace = (name: string) => force || owned.has(name)
    const { name } = await registry.put(action.declaration, target, { mayReplace, known: action.name })
    owned.set(record(name, action.declaration))
    return name
  }

  /** `at` is set for a User-scoped plugin, which lives in the `user` Scope and its own records. */
  async function applyPlugin(action: PlannedPluginAction, at?: 'user'): Promise<string> {
    const { id } = action
    const [target, owned, entries] = at ? [at, userPluginRecords, user!.plugins] : [scope, pluginRecords, actualPlugins]
    if (!('declaration' in action)) {
      const pluginFailedAt = failedPlugins.get(id)
      if (pluginFailedAt) throw new Error(`"${id}" is kept here until it is set up in ${pluginFailedAt} settings`)
      await (action.kind === 'uninstall' ? registry.uninstallPlugin(id, target) : registry.unsetPlugin(id, target))
      owned.delete(id)
      return id
    }
    const { marketplace, enabled, origin } = action.declaration
    const failedAt = failedMarketplaces.get(marketplace)
    if (failedAt) throw new Error(`marketplace "${marketplace}" is not ready in ${failedAt} settings`)
    // `@marketplace` suffixes that matched no name before Shorthand declarations were `add`ed: check again now that
    // the names are known.
    const known = records.has(marketplace) || userRecords.has(marketplace) || actual.some((e) => e.name === marketplace)
    if (checked.pending.has(id) && !known) {
      if (failedMarketplaces.size) throw new Error(`marketplace "${marketplace}" is not ready in ${scope} settings`)
      throw new ConflictError(missingMarketplaceConflict(action.declaration))
    }
    const run = { install: registry.installPlugin, enable: registry.enablePlugin, disable: registry.disablePlugin }[action.kind]
    await run(id, target)
    if (action.adopt) {
      if (!owned.has(id) && entries.some((e) => e.id === id && e.enabled !== undefined)) adoptedNotice(`"${id}"`)
      owned.set({ id, enabled, origin })
    }
    return id
  }

  /** `at` is set for a User-scoped MCP server, which lives in the `user` Scope and its own records. */
  async function applyMcp(action: PlannedMcpAction, at?: 'user'): Promise<string> {
    const { name } = action
    const [target, owned] = at ? [at, userMcpRecords] : [scope, mcpRecords]
    const failedAt = failedMcp.get(name)
    if (action.kind === 'remove' && failedAt && failedAt !== target) throw new Error(`"${name}" is kept here until it is set up in ${failedAt} settings`)
    if (action.kind !== 'add') await registry.removeMcp(name, target)
    if (action.kind === 'remove') {
      owned.delete(name)
      return name
    }
    const { server, origin } = action.declaration
    await registry.addMcp(name, server, target)
    owned.set({ name, server, origin })
    return name
  }

  /** All hook steps of a Scope are one settings write (ADR 0007), then progress is reported and each step recorded. */
  async function writeHooks() {
    if (!hookPlan.actions.length) return
    let error: Error | undefined
    await writeSettingsHooks(scope, location, hookPlan.actions, loaded.managedHooks).catch((e: Error) => (error = e))
    for (const action of hookPlan.actions) {
      const step: Step = { target: 'hook', action }
      deps.onProgress?.({ phase: 'start', action: describe(step) })
      if (error) actions.push({ ...describe(step), status: 'failed', error: error.message })
      else {
        if (action.kind === 'remove') hookRecords.delete(action.name)
        else {
          const { name, group, origin } = action.declaration
          hookRecords.set({ name, group: normalizeHook(group), origin })
        }
        actions.push({ ...describe(step), status: 'done' })
      }
      deps.onProgress?.({ phase: 'end', action: actions.at(-1)!, ms: 0 })
    }
  }

  async function applyItem(kind: ItemKind, action: PlannedItemAction): Promise<string> {
    const { handler, dir } = items[kind]
    const records = itemRecords[kind]
    const { name } = action
    if (action.kind === 'remove') {
      await handler.remove(dir!, name)
      records.delete(name)
      return name
    }
    const { source, sha256, from, origin } = action.desired
    await handler.install(from!, dir!, name)
    records.set({ name, source, sha256: sha256!, origin })
    return name
  }

  const claims = claimsOf(declarations, records.values(), actual, conflicts)
  const claimsOfPlugins = (plugins: PluginDeclaration[]) =>
    plugins
      .filter((p) => !held.has(p.marketplace) && !conflicts.some((c) => c.name === p.id))
      .map(({ id, enabled, origin }) => ({ id, enabled, origin }))
  const pluginClaims = claimsOfPlugins(resolved.plugins.filter((p) => !liftedPlugins.includes(p)))
  const itemClaims = byKind((kind) =>
    (items[kind].collected?.desired ?? [])
      .filter((s) => !conflicts.some((c) => c.name === s.name))
      .map(({ name, source, origin }) => ({ name, source, origin })),
  )
  const claimsOfMcp = (servers: McpDeclaration[]): ManagedMcp[] =>
    servers.filter((d) => mcpSettled(d.name)).map(({ name, server, origin }) => ({ name, server, origin }))
  const mcpClaims = claimsOfMcp(targetMcp)
  await mcpNotices()
  await store.save(
    scope,
    {
      marketplaces: records.values(),
      plugins: pluginRecords.values(),
      items: byKind((kind) => itemRecords[kind].values()),
      itemSources: byKind((kind) => items[kind].collected?.catalogs ?? items[kind].catalogs),
      mcpServers: mcpRecords.values(),
      hooks: hookRecords.values(),
    },
    resolved.pins,
    {
      claims,
      pluginClaims,
      itemClaims,
      mcpClaims,
      released: {
        ...NO_OWNED,
        marketplaces: records.released,
        plugins: pluginRecords.released,
        items: byKind((kind) => itemRecords[kind].released),
        mcpServers: mcpRecords.released,
      },
    },
  )
  // A record holding only claims is saved too, so dropping the last User-scoped declaration drops those claims.
  // A plugin moving back from `user` keeps this Config's claim there until the targeted Scope has it (ADR 0012).
  const movingBack = (user?.managedPlugins ?? [])
    .filter((m) => !liftedPlugins.some((p) => p.id === m.id))
    .filter((m) => failedPlugins.get(m.id) === scope || targetConflicts.has(m.id))
    .map(({ id, enabled, origin }) => ({ id, enabled, origin }))
  // An MCP server moving back from `user` keeps this Config's claim there until the targeted Scope has it (ADR 0014).
  const movingBackMcp = [...(user?.managedMcp ?? []), ...(user?.mcpClaims ?? [])]
    .filter((m, i, all) => all.findIndex((o) => o.name === m.name) === i && !liftedMcp.some((d) => d.name === m.name))
    .filter((m) => failedMcp.get(m.name) === scope || targetMcpConflicts!.has(m.name))
    .map(({ name, server, origin }) => ({ name, server, origin }))
  if (user && (user.recorded || lifted.length || liftedPlugins.length || liftedMcp.length)) {
    await store.save(
      'user',
      {
        ...NO_OWNED,
        marketplaces: userRecords.values(),
        plugins: userPluginRecords.values(),
        mcpServers: userMcpRecords.values(),
      },
      resolved.pins,
      {
        claims: claimsOf(lifted, userRecords.values(), user.actual, conflicts),
        pluginClaims: [...claimsOfPlugins(liftedPlugins), ...movingBack],
        itemClaims: byKind(() => []),
        mcpClaims: [...claimsOfMcp(liftedMcp), ...movingBackMcp],
        released: { ...NO_OWNED, marketplaces: userRecords.released, plugins: userPluginRecords.released, mcpServers: userMcpRecords.released },
      },
      { target: scope },
    )
  }
  conflicts.push(...mcpConflicts)
  return {
    actions,
    conflicts,
    notices,
    inSync: conflicts.length === 0 && actions.every((a) => a.status === 'done'),
  }

  /**
   * Plans the User-scoped marketplaces against the `user` Scope's settings, this Config's record there and the claims of
   * the rest; returns what the User-scoped plugins and MCP servers are planned against too.
   */
  async function planUserScoped() {
    const loaded = await store.load('user', { target: scope })
    const { recorded, managed, shared, managedPlugins, sharedPlugins, managedMcp, sharedMcp, mcpClaims } = loaded
    const actual = await registry.list('user')
    const elsewhere = { cwd, entries: await registry.listElsewhere('user') }
    const plan = planSync(lifted, actual, managed, { force, blocked, shared, elsewhere, installed })
    const plugins = await registry.listPlugins('user')
    const mcp = await registry.listMcp('user')
    return { recorded, managed, actual, plan, plugins, managedPlugins, sharedPlugins, mcp, managedMcp, sharedMcp, mcpClaims }
  }
}

/** Names this Config declares and has matched; conflicting names are not claimed, so other Configs are not blocked by them. */
function claimsOf(declarations: MarketplaceDeclaration[], owned: ManagedEntry[], actual: KnownEntry[], conflicts: Conflict[]): Claim[] {
  return declarations.flatMap((d) => {
    const name =
      d.name ?? owned.find((m) => identifies(d, m))?.name ?? actual.find((e) => sameSource(e.source, d.source))?.name
    if (!name || conflicts.some((c) => c.name === name)) return []
    return [{ name, source: d.source, extras: d.extras, origin: d.origin }]
  })
}

/**
 * Each source (ignoring `path`, which only picks a directory inside it) is fetched only once per commit in a sync,
 * so a Skill source and an Agent source from the same repo are not cloned twice.
 */
function sharedFetcher(fetch: FetchSkillSource): FetchSkillSource {
  const fetches = new Map<string, Promise<FetchedSource>>()
  return (source, commit) => {
    const { path: _, ...repo } = source
    const key = JSON.stringify([source.source === 'directory' ? source : repo, commit])
    if (!fetches.has(key)) fetches.set(key, fetch(source, commit))
    return fetches.get(key)!
  }
}

/** Fetching a source is also a slow step (clone), so progress is reported as for an action. */
async function reportFetch(kind: ItemKind, source: ItemSource, run: () => Promise<void>, onProgress: (event: SyncProgress) => void) {
  const action = { target: kind, kind: 'fetch' as const, name: null, source }
  const started = Date.now()
  onProgress({ phase: 'start', action })
  try {
    await run()
    onProgress({ phase: 'end', action: { ...action, status: 'done' }, ms: Date.now() - started })
  } catch (error) {
    onProgress({ phase: 'end', action: { ...action, status: 'failed', error: (error as Error).message }, ms: Date.now() - started })
    throw error
  }
}

function describe(step: Step): Omit<SyncAction, 'status' | 'error'> {
  if (step.target === 'plugin') {
    const at = step.scope ? { scope: step.scope } : {}
    return { target: step.target, kind: step.action.kind, name: step.action.id, source: null, ...at }
  }
  if (step.target === 'mcp') {
    const at = step.scope ? { scope: step.scope } : {}
    return { target: step.target, kind: step.action.kind, name: step.action.name, source: null, ...at }
  }
  if (step.target === 'hook') return { target: step.target, kind: step.action.kind, name: step.action.name, source: null }
  if (step.target === 'marketplace') {
    const { target, action } = step
    const at = step.scope ? { scope: step.scope } : {}
    return action.kind === 'remove'
      ? { target, kind: action.kind, name: action.name, source: null, ...at }
      : { target, kind: action.kind, name: action.name, source: action.declaration.source, ...at }
  }
  const { target, action } = step
  return { target, kind: action.kind, name: action.name, source: action.kind === 'remove' ? null : action.desired.source }
}

function record(name: string, declaration: MarketplaceDeclaration): ManagedEntry {
  return { name, source: declaration.source, origin: declaration.origin }
}

/**
 * Warns about missing dependencies of the Workflows the Scope will have. Agents and Workflows in the `user` scope also run
 * in a project, so things installed in either directory count.
 */
async function workflowDependencies(items: ByKind<ItemSync>, location: Location): Promise<string[]> {
  const { workflow, agent } = items
  if (!workflow.dir || !workflow.collected?.desired.length) return []
  const installedIn = async (handler: ItemHandler) => {
    const dirs = (['project', 'user'] as const).map((s) => handler.dir(s, location)).filter((d): d is string => d !== null)
    return (await Promise.all(dirs.map((d) => handler.list(d, [])))).flat()
  }
  const installedWorkflows = await installedIn(WORKFLOWS)
  const scripts: { name: string; text: string }[] = []
  for (const { name, from } of workflow.collected.desired) {
    const file = from ?? join(workflow.dir, installedWorkflows.find((w) => w.name === name)?.files?.[0] ?? `${name}.js`)
    const text = await readFile(file, 'utf8').catch(() => undefined)
    if (text !== undefined) scripts.push({ name, text })
  }
  return missingDependencyNotices(scripts, {
    agents: [...(agent.collected?.desired ?? []).map((a) => a.name), ...(await installedIn(AGENTS)).map((a) => a.name)],
    workflows: installedWorkflows.map((w) => w.name),
  })
}

