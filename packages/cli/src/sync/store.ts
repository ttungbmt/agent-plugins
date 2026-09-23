import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { readJson, writeJson, type Location } from './files.js'
import { sameSource } from './identity.js'
import type { PresetPins } from './resolve.js'
import type { Claim, ManagedEntry, Scope, SharedClaim } from './types.js'

type Lock = { marketplaces?: ManagedEntry[]; presets?: PresetPins }
type State = { marketplaces?: ManagedEntry[]; claims?: Claim[] }
/** Chỉ dùng ở scope user: claim của Config này và các Managed entry nó vừa bỏ sở hữu. */
type Sharing = { claims: Claim[]; released: ManagedEntry[] }

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
    { read(lock: Lock): Promise<ManagedEntry[] | undefined>; write(entries: ManagedEntry[], sharing: Sharing): Promise<void> }
  > = {
    project: {
      read: async (lock) => lock.marketplaces,
      write: async () => {}, // nằm trong Lock, ghi cùng mã băm ở `save`
    },
    local: {
      read: async () => (await readJson<State>(localStatePath)).marketplaces,
      write: (entries) => writeJson(localStatePath, { marketplaces: entries }),
    },
    user: {
      read: async () => (await readJson<Record<string, State>>(userStatePath))[configKey]?.marketplaces,
      write: async (entries, { claims, released }) => {
        const states = await readJson<Record<string, State>>(userStatePath)
        // Entry vừa bỏ sở hữu được giao cho các Config khác đang claim cùng source, để repo cuối cùng khai báo nó sẽ gỡ nó.
        for (const [key, state] of Object.entries(states)) {
          if (key === configKey) continue
          for (const claim of state.claims ?? []) {
            const record = released.find((r) => r.name === claim.name && sameSource(r.source, claim.source))
            if (!record || state.marketplaces?.some((m) => m.name === claim.name)) continue
            ;(state.marketplaces ??= []).push({ name: claim.name, source: claim.source, origin: claim.origin })
          }
        }
        const state: State = {}
        if (entries.length) state.marketplaces = entries
        if (claims.length) state.claims = claims
        if (Object.keys(state).length) states[configKey] = state
        else delete states[configKey]
        await writeJson(userStatePath, states)
      },
    },
  }

  async function readLock(): Promise<Lock> {
    return (parse(await readFile(lockPath, 'utf8').catch(() => '')) as Lock | null) ?? {}
  }

  async function writeLock({ marketplaces, presets }: Lock) {
    const lock: Lock = {}
    if (marketplaces?.length) lock.marketplaces = marketplaces
    if (presets && Object.keys(presets).length) lock.presets = presets
    const empty = Object.keys(lock).length === 0
    // Không tạo Lock rỗng cho repo chưa có; Lock đã có thì làm rỗng để git thấy thay đổi.
    if (empty && !(await readFile(lockPath, 'utf8').then(() => true, () => false))) return
    await writeFile(lockPath, empty ? '' : stringify(lock))
  }

  /** Claim của các Config khác ở scope user; Config đã bị xoá khỏi đĩa thì bỏ qua. */
  async function sharedClaims(): Promise<SharedClaim[]> {
    const states = await readJson<Record<string, State>>(userStatePath)
    const shared: SharedClaim[] = []
    for (const [config, state] of Object.entries(states)) {
      if (config === configKey || !(await access(config).then(() => true, () => false))) continue
      for (const claim of state.claims ?? []) shared.push({ ...claim, config })
    }
    return shared
  }

  async function load(scope: Scope): Promise<{ managed: ManagedEntry[]; pins: PresetPins; shared: SharedClaim[] }> {
    const lock = await readLock()
    return {
      managed: (await owners[scope].read(lock)) ?? [],
      pins: lock.presets ?? {},
      shared: scope === 'user' ? await sharedClaims() : [],
    }
  }

  async function save(scope: Scope, managed: ManagedEntry[], pins: PresetPins, sharing: Sharing = { claims: [], released: [] }) {
    const lock = await readLock()
    await writeLock({ marketplaces: scope === 'project' ? managed : lock.marketplaces, presets: pins })
    await owners[scope].write(managed, sharing)
  }

  return { load, save }
}
