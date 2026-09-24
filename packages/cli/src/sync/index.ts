import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { difference, differenceWith, omit, partition, uniq } from 'es-toolkit'
import { AGENTS } from './agents.js'
import { collectItems, type CollectedItems } from './collect-items.js'
import { identifies, knownName, missingMarketplaceConflict, sameSource } from './identity.js'
import { checkMarketplaces, manualPluginsOf, planPlugins, pluginsInUseConflict, type PlannedPluginAction } from './plan-plugins.js'
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
import { scopeMove, type MovableKind } from './scope-move.js'
import { createStore, NO_OWNED } from './store.js'
import { byKind, ITEM_KINDS } from './types.js'
import { missingDependencyNotices, WORKFLOWS, workflowsSwitchedOff } from './workflows.js'
import type { ByKind, Claim, Conflict, ItemDeclaration, ItemKind, ItemSource, KnownEntry, ManagedEntry, ManagedHook, ManagedItem, ManagedMcp, ManagedPlugin, MarketplaceDeclaration, McpDeclaration, MarketplaceSource, PluginDeclaration, PluginEntry, Scope, SharedItemClaim, SourceCatalog } from './types.js'

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
  const [lifted, declarations] = scope === 'user' ? [[], resolved.declarations] : partition(resolved.declarations, (d) => d.scope === 'user')
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
  const unmatched = difference(resolved.plugins, checked.plugins)
  const desiredPlugins = [...checked.plugins, ...unmatched]
  const pluginHeld = new Set([...held, ...unmatched.map((p) => p.marketplace)])
  const pluginKind: MovableKind<PluginDeclaration, ManagedPlugin, PlannedPluginAction> = {
    key: (x) => x.id,
    plan: (declarations, managed, side) =>
      side === 'user'
        ? planPlugins(declarations, user!.plugins, managed, { force, held: pluginHeld, shared: user!.sharedPlugins })
        : planPlugins(declarations, actualPlugins, managed, { force, held: pluginHeld, shared: sharedPlugins }),
    isRemoval: (a) => a.kind === 'uninstall' || a.kind === 'unset',
    record: ({ id, enabled, origin }) => ({ id, enabled, origin }),
    run: runPlugin,
  }
  // User-scoped plugins (ADR 0012) are planned against the `user` Scope, like User-scoped marketplaces.
  const plugins = scopeMove(pluginKind, desiredPlugins, { scope, managed: managedPlugins }, user && { managed: user.managedPlugins, claims: [] })
  const inUse = new Set(resolved.plugins.map((p) => p.marketplace))
  const conflicts = [
    ...resolved.conflicts,
    ...plan.conflicts,
    ...(user?.plan.conflicts ?? []),
    ...checked.conflicts,
    ...plugins.conflicts,
  ]
  const notices = [...resolved.notices, ...checked.notices, ...plugins.notices]

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
      ? uniq([...declarations.map((d) => handler.namespace!(d.source)), ...managed.map((m) => m.name.split('/')[0]!)])
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
  const mcpHeld = new Set(resolved.mcpConflicts.map((c) => c.name))
  const mcpKind: MovableKind<McpDeclaration, ManagedMcp, PlannedMcpAction> = {
    key: (x) => x.name,
    plan: (declarations, managed, side) =>
      side === 'user'
        ? planMcp(declarations, user!.mcp, managed, { force, held: mcpHeld, shared: user!.sharedMcp })
        : planMcp(declarations, actualMcp, managed, { force, held: mcpHeld, shared: loaded.sharedMcp }),
    isRemoval: (a) => a.kind === 'remove',
    record: ({ name, server, origin }) => ({ name, server, origin }),
    run: runMcp,
  }
  // User-scoped MCP servers (ADR 0014) are planned against the `user` Scope, like User-scoped plugins.
  const mcp = scopeMove(mcpKind, resolved.mcpServers, { scope, managed: loaded.managedMcp }, user && { managed: user.managedMcp, claims: user.mcpClaims })
  for (const name of mcp.plans.user?.forgotten ?? []) {
    if (mcp.declared.user.some((d) => d.name === name) || !user!.sharedMcp.some((c) => c.name === name)) continue
    notices.push(`MCP server "${name}" stays in user settings because another Config declares it; turn it off for this repo with /mcp in Claude Code`)
  }
  // Kept apart from `conflicts` (which shares names across marketplace/plugin/Skill/Agent), merged only into the report.
  const mcpConflicts = [...resolved.mcpConflicts, ...mcp.conflicts]
  const mcpSettled = (name: string) => !mcpConflicts.some((c) => c.name === name)
  const hookPlan = planHooks(resolved.hooks, await readSettingsHooks(scope, location), loaded.managedHooks)

  // Removing a marketplace takes all its Plugin entries with it, so a marketplace with Manual plugin entries is kept.
  const ownedPlugins = new Set([
    ...managedPlugins.map((m) => m.id),
    ...plugins.steps.target.filter((a) => 'adopt' in a && a.adopt).map((a) => a.id),
  ])
  // A name still declared on the other side of this Sync is moving between the targeted Scope and `user` (ADR 0011):
  // only its entry goes, so its plugins stay.
  const moving = new Set(names.filter((n): n is string => n !== null))
  /** The removals of `actions` that may run: not a marketplace still in use, nor one with Manual plugin entries. */
  const gatedRemovals = (actions: PlannedAction[], entries: PluginEntry[], owned: Set<string>) =>
    actions.filter((a) => {
      if (a.kind === 'remove' && inUse.has(a.name) && !moving.has(a.name)) return false
      if (a.kind !== 'remove' || force || moving.has(a.name)) return a.kind === 'remove'
      const manual = manualPluginsOf(a.name, entries, owned)
      if (manual.length) conflicts.push(pluginsInUseConflict(a.name, manual))
      return manual.length === 0
    })
  const removals = gatedRemovals(plan.actions, actualPlugins, ownedPlugins)
  // Hook steps don't run one by one: they are folded into a single settings write (`writeHooks`).
  // Removing a marketplace also drops the `user` Scope's plugins from it; only this Config's User-scoped plugins may go.
  const ownedUserPlugins = new Set([
    ...difference((user?.managedPlugins ?? []).map((m) => m.id), plugins.plans.user?.forgotten ?? []),
    ...(plugins.plans.user?.actions ?? []).filter((a) => 'adopt' in a && a.adopt).map((a) => a.id),
  ])
  const userRemovals = user ? gatedRemovals(user.plan.actions, user.plugins, ownedUserPlugins) : []
  const userSteps = (removing: boolean) =>
    (removing ? userRemovals : (user?.plan.actions ?? []).filter((a) => a.kind !== 'remove'))
      .map((action) => ({ target: 'marketplace' as const, action, scope: 'user' as const }))
  const steps: Exclude<Step, { target: 'hook' }>[] = [
    // User-scope entries first, so the plugins of the targeted Scope find their marketplace (ADR 0011).
    ...userSteps(false),
    ...plan.actions.filter((a) => a.kind !== 'remove').map((action) => ({ target: 'marketplace' as const, action })),
    // A User-scoped plugin is installed or enabled before the targeted Scope's plugins and dropped after them, so a
    // plugin moving between the two Scopes is never missing from both.
    ...plugins.steps.before.map((action) => ({ target: 'plugin' as const, action, scope: 'user' as const })),
    ...plugins.steps.target.map((action) => ({ target: 'plugin' as const, action })),
    ...plugins.steps.after.map((action) => ({ target: 'plugin' as const, action, scope: 'user' as const })),
    ...removals.map((action) => ({ target: 'marketplace' as const, action })),
    ...userSteps(true),
    ...itemRuns.flatMap(({ handler, plan }) => plan.actions.map((action) => ({ target: handler.kind, action }))),
    // A User-scoped MCP server is added before the targeted Scope's servers and removed after them (ADR 0014).
    ...mcp.steps.before.map((action) => ({ target: 'mcp' as const, action, scope: 'user' as const })),
    ...mcp.steps.target.map((action) => ({ target: 'mcp' as const, action })),
    ...mcp.steps.after.map((action) => ({ target: 'mcp' as const, action, scope: 'user' as const })),
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
    const inMcpJson = mcp.declared.target.filter((d) => mcpSettled(d.name)).map((d) => d.name)
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
  const noPlan = { adopted: [], forgotten: [] }
  const records = ledger(managed, byName, plan, (a) => record(a.name, a.declaration))
  const userRecords = ledger(user?.managed ?? [], byName, user?.plan ?? noPlan, (a) => record(a.name, a.declaration))
  const hookRecords = ledger(loaded.managedHooks, byName, { ...hookPlan, adopted: [] }, (m: ManagedHook) => m)
  const toItem = ({ name, source, sha256, origin }: DesiredItem): ManagedItem => ({ name, source, sha256: sha256!, origin })
  const itemRecords = byKind((kind) => ledger(items[kind].managed, byName, items[kind].plan, toItem))
  /** Marketplaces whose step failed, with the Scope they were meant for. */
  const failedMarketplaces = new Map<string | null, Scope>()
  // A Manual entry that matches the declaration exactly: adopt it, reported only once.
  const adoptedNotice = (what: string) => notices.push(`ap now manages ${what}, which was set up by hand`)
  for (const name of [...records.adopted, ...userRecords.adopted, ...plugins.adopted]) {
    adoptedNotice(`"${name}"`)
  }
  for (const name of mcp.adopted) adoptedNotice(`MCP server "${name}"`)
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
            ? await plugins.apply(step.action, step.scope ? 'user' : 'target')
            : step.target === 'mcp'
              ? await mcp.apply(step.action, step.scope ? 'user' : 'target')
              : await applyItem(step.target, step.action)
      actions.push({ ...describe(step), name, status: 'done' })
    } catch (error) {
      if (error instanceof ConflictError) conflicts.push(error.conflict)
      if (step.target === 'marketplace') failedMarketplaces.set(step.action.name, step.scope ?? scope)
      actions.push({ ...describe(step), status: 'failed', error: (error as Error).message })
    }
    deps.onProgress?.({ phase: 'end', action: actions.at(-1)!, ms: Date.now() - started })
  }
  await writeHooks()
  await Promise.all(uniq(itemRuns.flatMap((i) => i.collected?.fetched ?? [])).map((f) => f.cleanup()))
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

  /** Runs a plugin step at `at`: removes it, or installs, enables or disables it once its marketplace is ready. */
  async function runPlugin(action: PlannedPluginAction, at: Scope, owns: (id: string) => boolean): Promise<ManagedPlugin | null> {
    const { id } = action
    if (!('declaration' in action)) {
      await (action.kind === 'uninstall' ? registry.uninstallPlugin(id, at) : registry.unsetPlugin(id, at))
      return null
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
    await run(id, at)
    if (!action.adopt) return null
    const entries = user && at === 'user' ? user.plugins : actualPlugins
    if (!owns(id) && entries.some((e) => e.id === id && e.enabled !== undefined)) adoptedNotice(`"${id}"`)
    return { id, enabled, origin }
  }

  /** Runs an MCP server step at `at`; the CLI has no edit command, so an update is a removal and an add. */
  async function runMcp(action: PlannedMcpAction, at: Scope): Promise<ManagedMcp | null> {
    const { name } = action
    if (action.kind !== 'add') await registry.removeMcp(name, at)
    if (action.kind === 'remove') return null
    const { server, origin } = action.declaration
    await registry.addMcp(name, server, at)
    return { name, server, origin }
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
  const pluginSettled = (p: PluginDeclaration) => !held.has(p.marketplace) && !conflicts.some((c) => c.name === p.id)
  const savedPlugins = plugins.saved('target', pluginSettled)
  const itemClaims = byKind((kind) =>
    differenceWith(items[kind].collected?.desired ?? [], conflicts, (s, c) => s.name === c.name)
      .map(({ name, source, origin }) => ({ name, source, origin })),
  )
  const mcpSettledDeclaration = (d: McpDeclaration) => mcpSettled(d.name)
  const savedMcp = mcp.saved('target', mcpSettledDeclaration)
  await mcpNotices()
  await store.save(
    scope,
    {
      marketplaces: records.values(),
      plugins: savedPlugins.owned,
      items: byKind((kind) => itemRecords[kind].values()),
      itemSources: byKind((kind) => items[kind].collected?.catalogs ?? items[kind].catalogs),
      mcpServers: savedMcp.owned,
      hooks: hookRecords.values(),
    },
    resolved.pins,
    {
      claims,
      pluginClaims: savedPlugins.claims,
      itemClaims,
      mcpClaims: savedMcp.claims,
      released: {
        ...NO_OWNED,
        marketplaces: records.released,
        plugins: savedPlugins.released,
        items: byKind((kind) => itemRecords[kind].released),
        mcpServers: savedMcp.released,
      },
    },
  )
  // A record holding only claims is saved too, so dropping the last User-scoped declaration drops those claims.
  const userPlugins = plugins.saved('user', pluginSettled)
  const userMcp = mcp.saved('user', mcpSettledDeclaration)
  if (user && (user.recorded || lifted.length || plugins.declared.user.length || mcp.declared.user.length)) {
    await store.save(
      'user',
      {
        ...NO_OWNED,
        marketplaces: userRecords.values(),
        plugins: userPlugins.owned,
        mcpServers: userMcp.owned,
      },
      resolved.pins,
      {
        claims: claimsOf(lifted, userRecords.values(), user.actual, conflicts),
        pluginClaims: userPlugins.claims,
        itemClaims: byKind(() => []),
        mcpClaims: userMcp.claims,
        released: { ...NO_OWNED, marketplaces: userRecords.released, plugins: userPlugins.released, mcpServers: userMcp.released },
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
    const key = JSON.stringify([source.source === 'directory' ? source : omit(source, ['path']), commit])
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

