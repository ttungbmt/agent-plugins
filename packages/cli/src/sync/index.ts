import { join } from 'node:path'
import { identifies, sameSource } from './identity.js'
import { planSync, type PlannedAction } from './plan.js'
import { ConflictError, createRegistry, type Exec } from './registry.js'
import { resolveConfig, type Fetch } from './resolve.js'
import { createStore } from './store.js'
import type { Claim, Conflict, KnownEntry, ManagedEntry, MarketplaceDeclaration, MarketplaceSource, Scope } from './types.js'

export type { Scope } from './types.js'
export type SyncMode = 'apply' | 'dry-run' | 'check'

export type SyncReport = {
  actions: Array<{
    kind: PlannedAction['kind']
    name: string | null
    source: MarketplaceSource | null
    status: 'planned' | 'done' | 'failed'
    error?: string
  }>
  conflicts: Conflict[]
  notices: string[]
  inSync: boolean
}

/** Đồng bộ Khai báo marketplace của Config vào `extraKnownMarketplaces` của một Scope. */
export async function sync(
  opts: { cwd: string; scope: Scope; mode: SyncMode; force?: boolean; update?: boolean },
  deps: { exec: Exec; fetch: Fetch; homedir: string; defaultPresetsDir: string },
): Promise<SyncReport> {
  const { cwd, scope, mode } = opts
  const location = { cwd, homedir: deps.homedir }
  const registry = createRegistry({ exec: deps.exec, ...location })
  const store = createStore(location)

  const { managed, pins, shared } = await store.load(scope)
  const resolved = await resolveConfig(join(cwd, 'agent-plugins.yaml'), {
    fetch: deps.fetch,
    pins,
    update: opts.update ?? false,
    cacheDir: join(cwd, '.agent-plugins/cache'),
    writeCache: mode === 'apply',
    defaultPresetsDir: deps.defaultPresetsDir,
  })
  const actual = await registry.list(scope)
  const blocked = resolved.conflicts.map((c) => c.name)
  const elsewhere = { cwd, entries: await registry.listElsewhere(scope) }
  const plan = planSync(resolved.declarations, actual, managed, { force: opts.force ?? false, blocked, shared, elsewhere })
  const conflicts = [...resolved.conflicts, ...plan.conflicts]

  if (mode !== 'apply') {
    const actions = plan.actions.map((a) => ({ ...describe(a), status: 'planned' as const }))
    return { actions, conflicts, notices: resolved.notices, inSync: actions.length === 0 && conflicts.length === 0 }
  }

  const records = new Map(managed.map((m) => [m.name, m]))
  const released = managed.filter((m) => plan.forgotten.includes(m.name))
  for (const name of plan.forgotten) records.delete(name)
  const actions: SyncReport['actions'] = []
  for (const action of plan.actions) {
    try {
      if (action.kind === 'remove') {
        await registry.remove(action.name, scope)
        records.delete(action.name)
        actions.push({ ...describe(action), status: 'done' })
      } else if (action.kind === 'patch') {
        const name = action.name as string
        await registry.patch(action.declaration, name, scope)
        records.set(name, record(name, action.declaration))
        actions.push({ ...describe(action), status: 'done' })
      } else {
        const mayReplace = (name: string) => opts.force === true || records.has(name)
        const { name } = await registry.put(action.declaration, scope, { mayReplace })
        records.set(name, record(name, action.declaration))
        actions.push({ ...describe(action), name, status: 'done' })
      }
    } catch (error) {
      if (error instanceof ConflictError) conflicts.push(error.conflict)
      actions.push({ ...describe(action), status: 'failed', error: (error as Error).message })
    }
  }

  const claims = claimsOf(resolved.declarations, [...records.values()], actual, conflicts)
  await store.save(scope, [...records.values()], resolved.pins, { claims, released })
  return {
    actions,
    conflicts,
    notices: resolved.notices,
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

function describe(action: PlannedAction) {
  return action.kind === 'remove'
    ? { kind: action.kind, name: action.name, source: null }
    : { kind: action.kind, name: action.name, source: action.declaration.source }
}

function record(name: string, declaration: MarketplaceDeclaration): ManagedEntry {
  return { name, source: declaration.source, origin: declaration.origin }
}
