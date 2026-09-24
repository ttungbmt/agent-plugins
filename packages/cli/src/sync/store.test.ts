import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStore, NO_OWNED, type Owned, type Sharing } from './store.js'
import { makeTree } from './test-helpers.js'
import { byKind } from './types.js'
import type { Claim } from './types.js'

const source = (repo: string) => ({ source: 'github' as const, repo })
const claim = (name: string): Claim => ({ name, source: source(`acme/${name}`), extras: {}, origin: 'base' })
const owning = (...names: string[]): Owned => ({
  ...NO_OWNED,
  marketplaces: names.map((name) => ({ name, source: source(`acme/${name}`), origin: 'base' })),
})
const claiming = (...names: string[]): Sharing => ({
  claims: names.map(claim),
  pluginClaims: [],
  itemClaims: byKind(() => []),
  mcpClaims: [],
  released: NO_OWNED,
})

async function repoAndHome() {
  const root = await makeTree({ 'repo/agent-plugins.yaml': 'kind: Config\n', 'home/.keep': '' })
  return { cwd: join(root, 'repo'), homedir: join(root, 'home') }
}

describe('user-scope State of one Config', () => {
  it('keeps the record of a project Sync and of a user Sync apart', async () => {
    const store = createStore(await repoAndHome())

    await store.save('user', owning('pinned'), {}, claiming('pinned'), { target: 'project' })
    await store.save('user', owning('personal'), {}, claiming('personal'))

    expect((await store.load('user', { target: 'project' })).managed.map((e) => e.name)).toEqual(['pinned'])
    expect((await store.load('user')).managed.map((e) => e.name)).toEqual(['personal'])
  })

  it('counts the record for the other targeted Scope as a shared claim, named by its Config path', async () => {
    const location = await repoAndHome()
    const store = createStore(location)

    await store.save('user', owning('pinned'), {}, claiming('pinned'), { target: 'project' })

    expect((await store.load('user')).shared).toEqual([{ ...claim('pinned'), config: join(location.cwd, 'agent-plugins.yaml') }])
  })

  it('ignores the records of a Config deleted from disk', async () => {
    const location = await repoAndHome()
    await createStore(location).save('user', owning('pinned'), {}, claiming('pinned'), { target: 'project' })
    const other = await makeTree({ 'agent-plugins.yaml': 'kind: Config\n' })

    expect((await createStore({ cwd: other, homedir: location.homedir }).load('user')).shared).toHaveLength(1)
    await rm(location.cwd, { recursive: true })
    expect((await createStore({ cwd: other, homedir: location.homedir }).load('user')).shared).toEqual([])
  })

  it('hands an entry released by one record to the other record still claiming it', async () => {
    const store = createStore(await repoAndHome())
    await store.save('user', NO_OWNED, {}, claiming('pinned'))
    await store.save('user', owning('pinned'), {}, claiming('pinned'), { target: 'project' })

    await store.save('user', NO_OWNED, {}, { ...claiming(), released: owning('pinned') }, { target: 'project' })

    expect((await store.load('user')).managed.map((e) => e.name)).toEqual(['pinned'])
    expect((await store.load('user', { target: 'project' })).managed).toEqual([])
  })

  it('leaves the Lock to the project Sync when saving its user-scope record', async () => {
    const store = createStore(await repoAndHome())
    await store.save('project', NO_OWNED, { 'https://x/team.yaml': 'abc123' })

    await store.save('user', owning('pinned'), {}, claiming('pinned'), { target: 'project' })

    expect((await store.load('project')).pins).toEqual({ 'https://x/team.yaml': 'abc123' })
  })
})
