import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { readJson, writeJson, type Location } from './files.js'
import { sameSource } from './identity.js'
import { sameMcp } from './mcp.js'
import type { PresetPins } from './resolve.js'
import type {
  Claim,
  ItemClaim,
  ItemSource,
  ManagedEntry,
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
 * Managed entry của một scope: Known marketplace entry, Plugin entry, Bản cài skill, Bản cài agent và Bản cài MCP server, kèm Danh mục nguồn
 * của Nguồn skill và Nguồn agent (ghim riêng, kể cả khi cùng repo).
 */
export type Owned = {
  marketplaces: ManagedEntry[]
  plugins: ManagedPlugin[]
  skills: ManagedItem[]
  skillSources: SourceCatalog[]
  agents: ManagedItem[]
  agentSources: SourceCatalog[]
  mcpServers: ManagedMcp[]
}
/** Danh mục nguồn như ghi trong Lock/State: tên nằm dưới `skills` hoặc `agents`. */
type SkillSourceRecord = { source: ItemSource; commit: string; skills: string[] }
type AgentSourceRecord = { source: ItemSource; commit: string; agents: string[] }
type Stored = {
  marketplaces?: ManagedEntry[]
  plugins?: ManagedPlugin[]
  skillSources?: SkillSourceRecord[]
  skills?: ManagedItem[]
  agentSources?: AgentSourceRecord[]
  agents?: ManagedItem[]
  mcpServers?: ManagedMcp[]
}
type Lock = Stored & { presets?: PresetPins }
type State = Stored & {
  claims?: Claim[]
  pluginClaims?: PluginClaim[]
  skillClaims?: ItemClaim[]
  agentClaims?: ItemClaim[]
  mcpClaims?: McpClaim[]
}
/** Chỉ dùng ở scope user: claim của Config này và các Managed entry nó vừa bỏ sở hữu. */
export type Sharing = {
  claims: Claim[]
  pluginClaims: PluginClaim[]
  skillClaims: ItemClaim[]
  agentClaims: ItemClaim[]
  mcpClaims: McpClaim[]
  released: Owned
}
export const NO_OWNED: Owned = { marketplaces: [], plugins: [], skills: [], skillSources: [], agents: [], agentSources: [], mcpServers: [] }
const NO_SHARING: Sharing = { claims: [], pluginClaims: [], skillClaims: [], agentClaims: [], mcpClaims: [], released: NO_OWNED }

/**
 * Lock (`agent-plugins.lock`: Managed entry của scope project + mã băm Preset từ xa) và State (scope local/user) — ADR 0003.
 * State của scope user nằm trong home nên được chia theo đường dẫn Config, kèm claim của mỗi Config
 * để một repo không gỡ entry mà repo khác vẫn khai báo.
 */
export function createStore({ cwd, homedir }: Location) {
  const lockPath = join(cwd, 'agent-plugins.lock')
  const localStatePath = join(cwd, '.agent-plugins/state.local.json')
  const userStatePath = join(homedir, '.agent-plugins/state.json')
  const configKey = join(cwd, 'agent-plugins.yaml')

  /** Cách mỗi Scope lưu Managed entry của nó. */
  const owners: Record<
    Scope,
    { read(lock: Lock): Promise<State | undefined>; write(owned: Owned, sharing: Sharing): Promise<void> }
  > = {
    project: {
      read: async (lock) => lock,
      write: async () => {}, // nằm trong Lock, ghi cùng mã băm ở `save`
    },
    local: {
      read: async () => readJson<State>(localStatePath),
      write: (owned) => writeJson(localStatePath, compact(ownedFields(owned))),
    },
    user: {
      read: async () => (await readJson<Record<string, State>>(userStatePath))[configKey],
      write: async (owned, { claims, pluginClaims, skillClaims, agentClaims, mcpClaims, released }) => {
        const states = await readJson<Record<string, State>>(userStatePath)
        // Entry vừa bỏ sở hữu được giao cho các Config khác đang claim cùng khai báo, để repo cuối cùng khai báo nó sẽ gỡ nó.
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
          for (const [claimsOf, key] of [[state.skillClaims, 'skills'], [state.agentClaims, 'agents']] as const) {
            for (const claim of claimsOf ?? []) {
              const record = released[key].find((r) => r.name === claim.name && sameSource(r.source, claim.source))
              if (!record || state[key]?.some((m) => m.name === claim.name)) continue
              ;(state[key] ??= []).push({ ...record, origin: claim.origin })
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
          skillClaims,
          agentClaims,
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
    const lock: Lock = compact({ ...stored, skills: strip(stored.skills), agents: strip(stored.agents) })
    if (presets && Object.keys(presets).length) lock.presets = presets
    const empty = Object.keys(lock).length === 0
    // Không tạo Lock rỗng cho repo chưa có; Lock đã có thì làm rỗng để git thấy thay đổi.
    if (empty && !(await readFile(lockPath, 'utf8').then(() => true, () => false))) return
    await writeFile(lockPath, empty ? '' : stringify(lock, { aliasDuplicateObjects: false }))
  }

  /** Claim của các Config khác ở scope user; Config đã bị xoá khỏi đĩa thì bỏ qua. */
  async function sharedClaims() {
    const states = await readJson<Record<string, State>>(userStatePath)
    const shared = {
      marketplaces: [] as SharedClaim[],
      plugins: [] as SharedPluginClaim[],
      skills: [] as SharedItemClaim[],
      agents: [] as SharedItemClaim[],
      mcpServers: [] as SharedMcpClaim[],
    }
    for (const [config, state] of Object.entries(states)) {
      if (config === configKey || !(await access(config).then(() => true, () => false))) continue
      for (const claim of state.claims ?? []) shared.marketplaces.push({ ...claim, config })
      for (const claim of state.pluginClaims ?? []) shared.plugins.push({ ...claim, config })
      for (const claim of state.skillClaims ?? []) shared.skills.push({ ...claim, config })
      for (const claim of state.agentClaims ?? []) shared.agents.push({ ...claim, config })
      for (const claim of state.mcpClaims ?? []) shared.mcpServers.push({ ...claim, config })
    }
    return shared
  }

  async function load(scope: Scope) {
    const lock = await readLock()
    const state = await owners[scope].read(lock)
    const shared = scope === 'user' ? await sharedClaims() : { marketplaces: [], plugins: [], skills: [], agents: [], mcpServers: [] }
    return {
      managed: state?.marketplaces ?? [],
      managedPlugins: state?.plugins ?? [],
      managedSkills: state?.skills ?? [],
      skillCatalogs: (state?.skillSources ?? []).map(({ skills, ...c }) => ({ ...c, names: skills })),
      managedAgents: state?.agents ?? [],
      agentCatalogs: (state?.agentSources ?? []).map(({ agents, ...c }) => ({ ...c, names: agents })),
      managedMcp: state?.mcpServers ?? [],
      pins: lock.presets ?? {},
      shared: shared.marketplaces,
      sharedPlugins: shared.plugins,
      sharedSkills: shared.skills,
      sharedAgents: shared.agents,
      sharedMcp: shared.mcpServers,
    }
  }

  async function save(scope: Scope, owned: Owned, pins: PresetPins, sharing: Sharing = NO_SHARING) {
    const lock = await readLock()
    const project = scope === 'project' ? ownedFields(owned) : lock
    await writeLock({ ...project, presets: pins })
    await owners[scope].write(owned, sharing)
  }

  return { load, save }
}

/** Thứ tự các mục của Lock/State; `commit` trên từng Skill của Lock/State cũ được bỏ (đã chuyển về Danh mục nguồn). */
function ownedFields(owned: Owned): Required<Stored> {
  const items = (list: ManagedItem[]) => list.map(({ commit: _, ...item }) => item)
  return {
    marketplaces: owned.marketplaces,
    plugins: owned.plugins,
    skillSources: owned.skillSources.map(({ names, ...c }) => ({ ...c, skills: names })),
    skills: items(owned.skills),
    agentSources: owned.agentSources.map(({ names, ...c }) => ({ ...c, agents: names })),
    agents: items(owned.agents),
    mcpServers: owned.mcpServers,
  }
}

/** Bỏ các mục rỗng để Lock/State không có key thừa. */
function compact<T extends Record<string, unknown[] | undefined>>(fields: T): Partial<T> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v?.length)) as Partial<T>
}
