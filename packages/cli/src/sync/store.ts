import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { readJson, writeJson, type Location } from './files.js'
import { sameSource } from './identity.js'
import { sameMcp } from './mcp.js'
import type { PresetPins } from './resolve.js'
import { byKind, ITEM_KINDS } from './types.js'
import type {
  ByKind,
  Claim,
  ItemClaim,
  ItemKind,
  ItemSource,
  ManagedEntry,
  ManagedHook,
  ManagedItem,
  ManagedMcp,
  ManagedPlugin,
  McpClaim,
  PluginClaim,
  Scope,
  SharedClaim,
  SharedItemClaim,
  SharedMcpClaim,
  SharedPluginClaim,
  SourceCatalog,
} from './types.js'

/**
 * A scope's Managed entries: Known marketplace entries, Plugin entries, installs of each item kind, Installed MCP servers and
 * Installed hooks, plus the Source catalogs of each item kind (pinned separately, even when they share a repo).
 */
export type Owned = {
  marketplaces: ManagedEntry[]
  plugins: ManagedPlugin[]
  items: ByKind<ManagedItem[]>
  itemSources: ByKind<SourceCatalog[]>
  mcpServers: ManagedMcp[]
  hooks: ManagedHook[]
}
/** The keys of an item kind in the Lock/State, e.g. `skills`, `skillSources`, `skillClaims`. */
type ItemsKey = `${ItemKind}s`
type SourcesKey = `${ItemKind}Sources`
type ClaimsKey = `${ItemKind}Claims`
const keysOf = (kind: ItemKind) =>
  ({ items: `${kind}s`, sources: `${kind}Sources`, claims: `${kind}Claims` }) as { items: ItemsKey; sources: SourcesKey; claims: ClaimsKey }
/** A Source catalog as recorded in the Lock/State: the names sit under the item kind's key (`skills`, `agents`, …). */
type SourceRecord = { source: ItemSource; commit: string; blocked?: string[] } & { [K in ItemsKey]?: string[] }
type Stored = {
  marketplaces?: ManagedEntry[]
  plugins?: ManagedPlugin[]
  mcpServers?: ManagedMcp[]
  hooks?: ManagedHook[]
} & { [K in ItemsKey]?: ManagedItem[] } & { [K in SourcesKey]?: SourceRecord[] }
type Lock = Stored & { presets?: PresetPins }
type State = Stored & {
  claims?: Claim[]
  pluginClaims?: PluginClaim[]
  mcpClaims?: McpClaim[]
} & { [K in ClaimsKey]?: ItemClaim[] }
/** Used only at the user scope: this Config's claims and the Managed entries it just gave up ownership of. */
export type Sharing = {
  claims: Claim[]
  pluginClaims: PluginClaim[]
  itemClaims: ByKind<ItemClaim[]>
  mcpClaims: McpClaim[]
  released: Owned
}
export const NO_OWNED: Owned = { marketplaces: [], plugins: [], items: byKind(() => []), itemSources: byKind(() => []), mcpServers: [], hooks: [] }
const NO_SHARING: Sharing = { claims: [], pluginClaims: [], itemClaims: byKind(() => []), mcpClaims: [], released: NO_OWNED }

/**
 * Lock (`agent-plugins.lock`: the project scope's Managed entries + Remote preset hashes) and State (local/user scopes) —
 * ADR 0003. The user scope's State lives in home, so it is keyed by Config path and carries each Config's claims, so one
 * repo does not remove an entry another repo still declares.
 */
export function createStore({ cwd, homedir }: Location) {
  const lockPath = join(cwd, 'agent-plugins.lock')
  const localStatePath = join(cwd, '.agent-plugins/state.local.json')
  const userStatePath = join(homedir, '.agent-plugins/state.json')
  const configPath = join(cwd, 'agent-plugins.yaml')
  /**
   * The user-scope State key of this Config's record for a Sync targeting `target`: the Config path for a `user` Sync,
   * so State written before ADR 0011 still loads, and `<Config path>#<scope>` for a Sync that reaches `user` only through
   * User-scoped marketplaces.
   */
  const recordKey = (target: Scope) => (target === 'user' ? configPath : `${configPath}#${target}`)

  /** How each Scope stores its Managed entries. */
  const owners: Record<
    Scope,
    {
      read(lock: Lock, target: Scope): Promise<State | undefined>
      write(owned: Owned, sharing: Sharing, target: Scope): Promise<void>
    }
  > = {
    project: {
      read: async (lock) => lock,
      write: async () => {}, // lives in the Lock, written along with the hashes in `save`
    },
    local: {
      read: async () => readJson<State>(localStatePath),
      write: (owned) => writeJson(localStatePath, compact(ownedFields(owned))),
    },
    user: {
      read: async (_, target) => (await readJson<Record<string, State>>(userStatePath))[recordKey(target)],
      write: async (owned, { claims, pluginClaims, itemClaims, mcpClaims, released }, target) => {
        const states = await readJson<Record<string, State>>(userStatePath)
        const configKey = recordKey(target)
        // Hand entries just released to the other Configs claiming the same declaration, so the last repo declaring it removes it.
        for (const [key, state] of Object.entries(states)) {
          if (key === configKey) continue
          for (const claim of state.claims ?? []) {
            const record = released.marketplaces.find((r) => r.name === claim.name && sameSource(r.source, claim.source))
            if (!record || state.marketplaces?.some((m) => m.name === claim.name)) continue
            ;(state.marketplaces ??= []).push({ name: claim.name, source: claim.source, origin: claim.origin })
          }
          for (const claim of state.pluginClaims ?? []) {
            const record = released.plugins.find((r) => r.id === claim.id && r.enabled === claim.enabled)
            if (!record || state.plugins?.some((m) => m.id === claim.id)) continue
            ;(state.plugins ??= []).push({ id: claim.id, enabled: claim.enabled, origin: claim.origin })
          }
          for (const kind of ITEM_KINDS) {
            const key = keysOf(kind)
            for (const claim of state[key.claims] ?? []) {
              const record = released.items[kind].find((r) => r.name === claim.name && sameSource(r.source, claim.source))
              if (!record || state[key.items]?.some((m) => m.name === claim.name)) continue
              ;(state[key.items] ??= []).push({ ...record, origin: claim.origin })
            }
          }
          for (const claim of state.mcpClaims ?? []) {
            const record = released.mcpServers.find((r) => r.name === claim.name && sameMcp(r.server, claim.server))
            if (!record || state.mcpServers?.some((m) => m.name === claim.name)) continue
            ;(state.mcpServers ??= []).push({ ...record, origin: claim.origin })
          }
        }
        const state = compact({
          ...ownedFields(owned),
          claims,
          pluginClaims,
          ...Object.fromEntries(ITEM_KINDS.map((kind) => [keysOf(kind).claims, itemClaims[kind]])),
          mcpClaims,
        })
        if (Object.keys(state).length) states[configKey] = state
        else delete states[configKey]
        await writeJson(userStatePath, states)
      },
    },
  }

  async function readLock(): Promise<Lock> {
    return (parse(await readFile(lockPath, 'utf8').catch(() => '')) as Lock | null) ?? {}
  }

  async function writeLock({ presets, ...stored }: Lock) {
    const strip = (list?: ManagedItem[]) => list?.map(({ commit: _, ...item }) => item)
    const lock: Lock = compact({ ...stored, ...Object.fromEntries(ITEM_KINDS.map((kind) => [keysOf(kind).items, strip(stored[keysOf(kind).items])])) })
    if (presets && Object.keys(presets).length) lock.presets = presets
    const empty = Object.keys(lock).length === 0
    // Don't create an empty Lock for a repo that has none; empty an existing Lock so git sees the change.
    if (empty && !(await readFile(lockPath, 'utf8').then(() => true, () => false))) return
    await writeFile(lockPath, empty ? '' : stringify(lock, { aliasDuplicateObjects: false }))
  }

  /**
   * Claims of the other records at the user scope, including this Config's record for another targeted Scope; Configs
   * deleted from disk are skipped.
   */
  async function sharedClaims(target: Scope) {
    const states = await readJson<Record<string, State>>(userStatePath)
    const shared = noShared()
    for (const [key, state] of Object.entries(states)) {
      const config = configPathOf(key)
      if (key === recordKey(target) || !(await access(config).then(() => true, () => false))) continue
      for (const claim of state.claims ?? []) shared.marketplaces.push({ ...claim, config })
      for (const claim of state.pluginClaims ?? []) shared.plugins.push({ ...claim, config })
      for (const kind of ITEM_KINDS) {
        for (const claim of state[keysOf(kind).claims] ?? []) shared.items[kind].push({ ...claim, config })
      }
      for (const claim of state.mcpClaims ?? []) shared.mcpServers.push({ ...claim, config })
    }
    return shared
  }

  /** `target` is the Scope the Sync targets; it differs from `scope` only for User-scoped marketplaces (ADR 0011). */
  async function load(scope: Scope, { target = scope }: { target?: Scope } = {}) {
    const lock = await readLock()
    const state = await owners[scope].read(lock, target)
    const shared = scope === 'user' ? await sharedClaims(target) : noShared()
    return {
      managed: state?.marketplaces ?? [],
      managedPlugins: state?.plugins ?? [],
      managedItems: byKind((kind) => state?.[keysOf(kind).items] ?? []),
      itemCatalogs: byKind((kind) =>
        (state?.[keysOf(kind).sources] ?? []).map(({ source, commit, [keysOf(kind).items]: names, blocked }): SourceCatalog => ({ source, commit, names: names!, ...(blocked ? { blocked } : {}) })),
      ),
      managedMcp: state?.mcpServers ?? [],
      managedHooks: state?.hooks ?? [],
      pins: lock.presets ?? {},
      shared: shared.marketplaces,
      sharedPlugins: shared.plugins,
      sharedItems: shared.items,
      sharedMcp: shared.mcpServers,
    }
  }

  async function save(
    scope: Scope,
    owned: Owned,
    pins: PresetPins,
    sharing: Sharing = NO_SHARING,
    { target = scope }: { target?: Scope } = {},
  ) {
    // The Sync's own save writes the Lock; the user-scope record of a User-scoped marketplace leaves it alone.
    if (scope === target) {
      const lock = await readLock()
      const project = scope === 'project' ? ownedFields(owned) : lock
      await writeLock({ ...project, presets: pins })
    }
    await owners[scope].write(owned, sharing, target)
  }

  return { load, save }
}

/** The Config path of a user-scope State key, dropping the `#<scope>` of a record for another targeted Scope. */
function configPathOf(key: string): string {
  return key.replace(/#(project|local)$/, '')
}

function noShared() {
  return {
    marketplaces: [] as SharedClaim[],
    plugins: [] as SharedPluginClaim[],
    items: byKind((): SharedItemClaim[] => []),
    mcpServers: [] as SharedMcpClaim[],
  }
}

/** The field order of the Lock/State; the per-Skill `commit` of an old Lock/State is dropped (it moved to the Source catalog). */
function ownedFields(owned: Owned): Stored {
  const items = (list: ManagedItem[]) => list.map(({ commit: _, ...item }) => item)
  return {
    marketplaces: owned.marketplaces,
    plugins: owned.plugins,
    ...Object.fromEntries(
      ITEM_KINDS.flatMap((kind) => [
        [keysOf(kind).sources, owned.itemSources[kind].map(({ names, ...c }) => ({ ...c, [keysOf(kind).items]: names }))],
        [keysOf(kind).items, items(owned.items[kind])],
      ]),
    ),
    mcpServers: owned.mcpServers,
    hooks: owned.hooks,
  }
}

/** Drop empty fields so the Lock/State has no stray keys. */
function compact<T extends Record<string, unknown[] | undefined>>(fields: T): Partial<T> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v?.length)) as Partial<T>
}
