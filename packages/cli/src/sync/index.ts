import { join } from 'node:path'
import { AGENTS } from './agents.js'
import { collectItems, type CollectedItems } from './collect-items.js'
import { identifies, knownName, missingMarketplaceConflict, sameSource } from './identity.js'
import { checkMarketplaces, manualPluginsOf, planPlugins, pluginsInUseConflict, type PlannedPluginAction } from './plan-plugins.js'
import type { ItemHandler } from './items.js'
import { normalizeHook, planHooks, readSettingsHooks, writeSettingsHooks, type PlannedHookAction } from './hooks.js'
import { planMcp, unsetVariables, type PlannedMcpAction } from './mcp.js'
import { planItems, type ItemPlan, type PlannedItemAction } from './plan-items.js'
import { planSync, type PlannedAction } from './plan.js'
import { ConflictError, createRegistry, type Exec } from './registry.js'
import { resolveConfig, type Fetch } from './resolve.js'
import { RULES } from './rules.js'
import { createGitFetcher, SKILLS, type FetchedSource, type FetchSkillSource } from './skills.js'
import { createStore, NO_OWNED } from './store.js'
import { byKind, ITEM_KINDS } from './types.js'
import type { ByKind, Claim, Conflict, ItemDeclaration, ItemKind, ItemSource, KnownEntry, ManagedEntry, ManagedItem, ManagedMcp, MarketplaceDeclaration, MarketplaceSource, Scope, SharedItemClaim, SourceCatalog } from './types.js'

export type { Scope } from './types.js'
export type SyncMode = 'apply' | 'dry-run' | 'check'

export type SyncAction = {
  target: 'marketplace' | 'plugin' | ItemKind | 'mcp' | 'hook'
  /** `fetch`: tải một Nguồn skill/Nguồn agent; chỉ có trong báo cáo khi thất bại. */
  kind: PlannedAction['kind'] | PlannedPluginAction['kind'] | PlannedItemAction['kind'] | PlannedMcpAction['kind'] | PlannedHookAction['kind'] | 'fetch'
  /** Tên marketplace, id `name@marketplace` của plugin, hoặc tên Skill/Agent/MCP server/Khai báo hook; null khi chưa biết. */
  name: string | null
  source: MarketplaceSource | null
  status: 'planned' | 'done' | 'failed'
  error?: string
}

export type SyncReport = {
  actions: SyncAction[]
  conflicts: Conflict[]
  notices: string[]
  inSync: boolean
}

/** Báo tiến độ từng action khi apply, vì mỗi action gọi `claude` hoặc `git` và có thể phải clone. */
export type SyncProgress =
  | { phase: 'start'; action: Omit<SyncAction, 'status' | 'error'> }
  | { phase: 'end'; action: SyncAction; ms: number }

type Step =
  | { target: 'marketplace'; action: PlannedAction }
  | { target: 'plugin'; action: PlannedPluginAction }
  | { target: ItemKind; action: PlannedItemAction }
  | { target: 'mcp'; action: PlannedMcpAction }
  | { target: 'hook'; action: PlannedHookAction }

/** Việc đồng bộ Skill hoặc Agent của một Scope: khai báo, trạng thái đã ghi và kế hoạch của loại đó. */
type ItemSync = {
  handler: ItemHandler
  /** Thư mục của loại này ở Scope; null ở scope `local`. */
  dir: string | null
  managed: ManagedItem[]
  catalogs: SourceCatalog[]
  collected: CollectedItems | null
  plan: ItemPlan
}

/** Cách tải và cài của từng loại item. */
const HANDLERS: ByKind<ItemHandler> = { skill: SKILLS, agent: AGENTS, rule: RULES }

const EMPTY_PLAN: ItemPlan = { actions: [], conflicts: [], notices: [], adopted: [], forgotten: [] }

/** Đồng bộ Khai báo marketplace, Khai báo plugin, Khai báo skill, Khai báo agent, Khai báo MCP server và Khai báo hook của Config vào một Scope. */
export async function sync(
  opts: { cwd: string; scope: Scope; mode: SyncMode; force?: boolean; update?: boolean },
  deps: {
    exec: Exec
    fetch: Fetch
    homedir: string
    /** Thư mục config của Claude Code (`CLAUDE_CONFIG_DIR`), mặc định `~/.claude`. */
    claudeDir?: string
    defaultPresetsDir: string
    /** Tải Nguồn skill/Nguồn agent; mặc định dùng `git` qua `exec` (ADR 0005). */
    fetchSkillSource?: FetchSkillSource
    onProgress?: (event: SyncProgress) => void
    /** Môi trường để cảnh báo `${VAR}` chưa đặt trong cấu hình MCP server; mặc định `process.env`. */
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
  const plan = planSync(resolved.declarations, actual, managed, { force, blocked, shared, elsewhere })
  const held = new Set([...resolved.conflicts, ...plan.conflicts].map((c) => c.name))
  const names = resolved.declarations.map((d) => knownName(d, managed, actual))
  const checked = checkMarketplaces(
    resolved.plugins,
    new Set([...names.filter((n): n is string => n !== null), ...held]),
    names.includes(null),
  )
  const pluginPlan = planPlugins(checked.plugins, actualPlugins, managedPlugins, { force, held, shared: sharedPlugins })
  const conflicts = [...resolved.conflicts, ...plan.conflicts, ...checked.conflicts, ...pluginPlan.conflicts]
  const notices = [...resolved.notices, ...checked.notices, ...pluginPlan.notices]

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

  const actualMcp = await registry.listMcp(scope)
  const env = deps.env ?? process.env
  for (const { name, server } of resolved.mcpServers) {
    for (const variable of unsetVariables(server, env)) notices.push(`MCP server "${name}" uses \${${variable}}, which is not set in this environment`)
  }
  const mcpPlan = planMcp(resolved.mcpServers, actualMcp, loaded.managedMcp, {
    force,
    held: new Set(resolved.mcpConflicts.map((c) => c.name)),
    shared: loaded.sharedMcp,
  })
  // Giữ riêng khỏi `conflicts` (vốn dùng chung tên cho marketplace/plugin/Skill/Agent), chỉ gộp vào báo cáo.
  const mcpConflicts = [...resolved.mcpConflicts, ...mcpPlan.conflicts]
  const mcpSettled = (name: string) => !mcpConflicts.some((c) => c.name === name)
  const hookPlan = planHooks(resolved.hooks, await readSettingsHooks(scope, location), loaded.managedHooks)

  // Gỡ marketplace kéo theo mọi Plugin entry của nó: còn Manual plugin entry thì không gỡ.
  const ownedPlugins = new Set([
    ...managedPlugins.map((m) => m.id),
    ...pluginPlan.actions.filter((a) => 'adopt' in a && a.adopt).map((a) => a.id),
  ])
  const removals = plan.actions.filter((a) => {
    if (a.kind !== 'remove' || force) return a.kind === 'remove'
    const manual = manualPluginsOf(a.name, actualPlugins, ownedPlugins)
    if (manual.length) conflicts.push(pluginsInUseConflict(a.name, manual))
    return manual.length === 0
  })
  // Bước hook không chạy riêng từng bước: chúng gộp thành một lần ghi settings (`writeHooks`).
  const steps: Exclude<Step, { target: 'hook' }>[] = [
    ...plan.actions.filter((a) => a.kind !== 'remove').map((action) => ({ target: 'marketplace' as const, action })),
    ...pluginPlan.actions.map((action) => ({ target: 'plugin' as const, action })),
    ...removals.map((action) => ({ target: 'marketplace' as const, action })),
    ...itemRuns.flatMap(({ handler, plan }) => plan.actions.map((action) => ({ target: handler.kind, action }))),
    ...mcpPlan.actions.map((action) => ({ target: 'mcp' as const, action })),
  ]
  const hookSteps: Step[] = hookPlan.actions.map((action) => ({ target: 'hook' as const, action }))

  /** Chạy sau bước plugin (Q8 của ADR 0006): cảnh báo trùng tên với MCP của plugin, và liệt kê server `.mcp.json` chờ duyệt. */
  const mcpNotices = async () => {
    const mine = resolved.mcpServers.filter((d) => mcpSettled(d.name)).map((d) => d.name)
    for (const { plugin, name } of await registry.pluginMcpServers(scope)) {
      if (mine.includes(name)) notices.push(`MCP server "${name}" has the same name as one plugin ${plugin} provides (plugin:${plugin}:${name}); both will run`)
    }
    // Chỉ server đã thật sự có trong `.mcp.json` (ở dry-run: sẽ được thêm) mới chờ duyệt; `add-json` lỗi thì không.
    const present = mode === 'apply' ? await registry.listMcp(scope) : null
    const pending = scope === 'project' ? await registry.pendingMcp(mine.filter((n) => !present || n in present)) : []
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

  const records = new Map(managed.map((m) => [m.name, m]))
  const released = managed.filter((m) => plan.forgotten.includes(m.name))
  for (const name of plan.forgotten) records.delete(name)
  const pluginRecords = new Map(managedPlugins.map((m) => [m.id, m]))
  const releasedPlugins = managedPlugins.filter((m) => pluginPlan.forgotten.includes(m.id))
  for (const id of pluginPlan.forgotten) pluginRecords.delete(id)
  const mcpRecords = new Map(loaded.managedMcp.map((m) => [m.name, m]))
  const releasedMcp = loaded.managedMcp.filter((m) => mcpPlan.forgotten.includes(m.name))
  for (const name of mcpPlan.forgotten) mcpRecords.delete(name)
  const hookRecords = new Map(loaded.managedHooks.map((m) => [m.name, m]))
  for (const name of hookPlan.forgotten) hookRecords.delete(name)
  const failedMarketplaces = new Set<string | null>()
  const itemRecords = byKind((kind) => {
    const { managed, plan } = items[kind]
    const records = new Map(managed.map((m) => [m.name, m]))
    for (const name of plan.forgotten) records.delete(name)
    return records
  })
  // Manual entry khớp đúng khai báo: nhận quản lý, báo một lần duy nhất.
  const adoptedNotice = (what: string) => notices.push(`ap now manages ${what}, which was set up by hand`)
  for (const { name, declaration } of plan.adopted) {
    records.set(name, record(name, declaration))
    adoptedNotice(`"${name}"`)
  }
  for (const { id, enabled, origin } of pluginPlan.adopted) {
    pluginRecords.set(id, { id, enabled, origin })
    adoptedNotice(`"${id}"`)
  }
  for (const { name, server, origin } of mcpPlan.adopted) {
    mcpRecords.set(name, { name, server, origin })
    adoptedNotice(`MCP server "${name}"`)
  }
  for (const kind of ITEM_KINDS) {
    for (const { name, source, sha256, origin } of items[kind].plan.adopted) {
      itemRecords[kind].set(name, { name, source, sha256: sha256!, origin })
      adoptedNotice(`${kind} "${name}"`)
    }
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
          ? await applyMarketplace(step.action)
          : step.target === 'plugin'
            ? await applyPlugin(step.action)
            : step.target === 'mcp'
              ? await applyMcp(step.action)
              : await applyItem(step.target, step.action)
      actions.push({ ...describe(step), name, status: 'done' })
    } catch (error) {
      if (error instanceof ConflictError) conflicts.push(error.conflict)
      if (step.target === 'marketplace') failedMarketplaces.add(step.action.name)
      actions.push({ ...describe(step), status: 'failed', error: (error as Error).message })
    }
    deps.onProgress?.({ phase: 'end', action: actions.at(-1)!, ms: Date.now() - started })
  }
  await writeHooks()
  await Promise.all([...new Set(itemRuns.flatMap((i) => i.collected?.fetched ?? []))].map((f) => f.cleanup()))
  // Managed skill/agent không cần copy lại vẫn nhận nguồn và origin mới nhất; commit của nó nằm ở Danh mục nguồn.
  for (const kind of ITEM_KINDS) {
    for (const { name, source, sha256, origin } of items[kind].collected?.desired ?? []) {
      const record = itemRecords[kind].get(name)
      if (record?.sha256 === sha256) itemRecords[kind].set(name, { name, source, sha256, origin })
    }
  }

  async function applyMarketplace(action: PlannedAction): Promise<string | null> {
    if (action.kind === 'remove') {
      await registry.remove(action.name, scope)
      records.delete(action.name)
      return action.name
    }
    if (action.kind === 'patch') {
      const name = action.name as string
      await registry.patch(action.declaration, name, scope)
      records.set(name, record(name, action.declaration))
      return name
    }
    const mayReplace = (name: string) => force || records.has(name)
    const { name } = await registry.put(action.declaration, scope, { mayReplace })
    records.set(name, record(name, action.declaration))
    return name
  }

  async function applyPlugin(action: PlannedPluginAction): Promise<string> {
    const { id } = action
    if (!('declaration' in action)) {
      await (action.kind === 'uninstall' ? registry.uninstallPlugin(id, scope) : registry.unsetPlugin(id, scope))
      pluginRecords.delete(id)
      return id
    }
    const { marketplace, enabled, origin } = action.declaration
    if (failedMarketplaces.has(marketplace)) throw new Error(`marketplace "${marketplace}" is not ready in ${scope} settings`)
    // Hậu tố chưa khớp tên nào trước khi `add` các marketplace dạng rút gọn: giờ đã biết tên thì kiểm tra lại.
    if (checked.pending.has(id) && !records.has(marketplace) && !actual.some((e) => e.name === marketplace)) {
      if (failedMarketplaces.size) throw new Error(`marketplace "${marketplace}" is not ready in ${scope} settings`)
      throw new ConflictError(missingMarketplaceConflict(action.declaration))
    }
    const run = { install: registry.installPlugin, enable: registry.enablePlugin, disable: registry.disablePlugin }[action.kind]
    await run(id, scope)
    if (action.adopt) {
      if (!pluginRecords.has(id) && actualPlugins.some((e) => e.id === id && e.enabled !== undefined)) adoptedNotice(`"${id}"`)
      pluginRecords.set(id, { id, enabled, origin })
    }
    return id
  }

  async function applyMcp(action: PlannedMcpAction): Promise<string> {
    const { name } = action
    if (action.kind !== 'add') await registry.removeMcp(name, scope)
    if (action.kind === 'remove') {
      mcpRecords.delete(name)
      return name
    }
    const { server, origin } = action.declaration
    await registry.addMcp(name, server, scope)
    mcpRecords.set(name, { name, server, origin })
    return name
  }

  /** Mọi bước hook của Scope là một lần ghi settings (ADR 0007), rồi mới báo tiến độ và ghi nhận từng bước. */
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
          hookRecords.set(name, { name, group: normalizeHook(group), origin })
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
    records.set(name, { name, source, sha256: sha256!, origin })
    return name
  }

  const claims = claimsOf(resolved.declarations, [...records.values()], actual, conflicts)
  const pluginClaims = resolved.plugins
    .filter((p) => !held.has(p.marketplace) && !conflicts.some((c) => c.name === p.id))
    .map(({ id, enabled, origin }) => ({ id, enabled, origin }))
  const itemClaims = byKind((kind) =>
    (items[kind].collected?.desired ?? [])
      .filter((s) => !conflicts.some((c) => c.name === s.name))
      .map(({ name, source, origin }) => ({ name, source, origin })),
  )
  const releasedItems = byKind((kind) => {
    const { managed, plan } = items[kind]
    return managed.filter((m) => plan.forgotten.includes(m.name))
  })
  const mcpClaims: ManagedMcp[] = resolved.mcpServers
    .filter((d) => mcpSettled(d.name))
    .map(({ name, server, origin }) => ({ name, server, origin }))
  await mcpNotices()
  await store.save(
    scope,
    {
      marketplaces: [...records.values()],
      plugins: [...pluginRecords.values()],
      items: byKind((kind) => [...itemRecords[kind].values()]),
      itemSources: byKind((kind) => items[kind].collected?.catalogs ?? items[kind].catalogs),
      mcpServers: [...mcpRecords.values()],
      hooks: [...hookRecords.values()],
    },
    resolved.pins,
    {
      claims,
      pluginClaims,
      itemClaims,
      mcpClaims,
      released: {
        ...NO_OWNED,
        marketplaces: released,
        plugins: releasedPlugins,
        items: releasedItems,
        mcpServers: releasedMcp,
      },
    },
  )
  conflicts.push(...mcpConflicts)
  return {
    actions,
    conflicts,
    notices,
    inSync: conflicts.length === 0 && actions.every((a) => a.status === 'done'),
  }
}

/** Tên Config này khai báo và đã khớp được; tên đang xung đột không được claim để Config khác không bị chặn theo. */
function claimsOf(declarations: MarketplaceDeclaration[], owned: ManagedEntry[], actual: KnownEntry[], conflicts: Conflict[]): Claim[] {
  return declarations.flatMap((d) => {
    const name =
      d.name ?? owned.find((m) => identifies(d, m))?.name ?? actual.find((e) => sameSource(e.source, d.source))?.name
    if (!name || conflicts.some((c) => c.name === name)) return []
    return [{ name, source: d.source, extras: d.extras, origin: d.origin }]
  })
}

/**
 * Mỗi nguồn (bỏ `path`, vì `path` chỉ chọn thư mục bên trong) chỉ được tải một lần cho mỗi commit trong một lần sync,
 * để Nguồn skill và Nguồn agent cùng repo không phải clone hai lần.
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

/** Tải nguồn cũng là một bước chậm (clone), nên báo tiến độ như một action. */
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
  if (step.target === 'plugin') return { target: step.target, kind: step.action.kind, name: step.action.id, source: null }
  if (step.target === 'mcp' || step.target === 'hook') return { target: step.target, kind: step.action.kind, name: step.action.name, source: null }
  if (step.target === 'marketplace') {
    const { target, action } = step
    return action.kind === 'remove'
      ? { target, kind: action.kind, name: action.name, source: null }
      : { target, kind: action.kind, name: action.name, source: action.declaration.source }
  }
  const { target, action } = step
  return { target, kind: action.kind, name: action.name, source: action.kind === 'remove' ? null : action.desired.source }
}

function record(name: string, declaration: MarketplaceDeclaration): ManagedEntry {
  return { name, source: declaration.source, origin: declaration.origin }
}
