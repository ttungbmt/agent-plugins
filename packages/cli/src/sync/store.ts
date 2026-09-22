import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { readJson, writeJson, type Location } from './files.js'
import type { PresetPins } from './resolve.js'
import type { ManagedEntry, Scope } from './types.js'

type Lock = { marketplaces?: ManagedEntry[]; presets?: PresetPins }
type State = { marketplaces?: ManagedEntry[] }

/**
 * Lock (`agent-plugins.lock`: Managed entry của scope project + mã băm Preset từ xa) và State (scope local/user) — ADR 0003.
 * State của scope user nằm trong home nên được chia theo đường dẫn Config.
 */
export function createStore({ cwd, homedir }: Location) {
  const lockPath = join(cwd, 'agent-plugins.lock')
  const localStatePath = join(cwd, '.agent-plugins/state.local.json')
  const userStatePath = join(homedir, '.agent-plugins/state.json')
  const configKey = join(cwd, 'agent-plugins.yaml')

  /** Cách mỗi Scope lưu Managed entry của nó. */
  const owners: Record<Scope, { read(lock: Lock): Promise<ManagedEntry[] | undefined>; write(entries: ManagedEntry[]): Promise<void> }> = {
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
      write: async (entries) => {
        const states = await readJson<Record<string, State>>(userStatePath)
        if (entries.length) states[configKey] = { marketplaces: entries }
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

  async function load(scope: Scope): Promise<{ managed: ManagedEntry[]; pins: PresetPins }> {
    const lock = await readLock()
    return { managed: (await owners[scope].read(lock)) ?? [], pins: lock.presets ?? {} }
  }

  async function save(scope: Scope, managed: ManagedEntry[], pins: PresetPins) {
    const lock = await readLock()
    await writeLock({ marketplaces: scope === 'project' ? managed : lock.marketplaces, presets: pins })
    await owners[scope].write(managed)
  }

  return { load, save }
}
