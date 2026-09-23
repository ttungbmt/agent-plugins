import { describe, expect, it } from 'vitest'
import { planSync } from './plan.js'
import type { MarketplaceDeclaration } from './types.js'

const official: MarketplaceDeclaration = {
  name: 'claude-plugins-official',
  source: { source: 'github', repo: 'anthropics/claude-plugins-official' },
  extras: {},
  origin: 'base',
}

describe('planSync', () => {
  it('adds a declared marketplace that is not in settings', () => {
    const plan = planSync([official], [], [], { force: false })

    expect(plan.conflicts).toEqual([])
    expect(plan.actions).toEqual([{ kind: 'add', name: 'claude-plugins-official', declaration: official }])
  })
  it('does nothing when a managed entry already matches its declaration', () => {
    const plan = planSync(
      [official],
      [{ name: official.name!, source: official.source, extras: {} }],
      [{ name: official.name!, source: official.source, origin: 'base' }],
      { force: false },
    )

    expect(plan).toEqual({ actions: [], conflicts: [], forgotten: [] })
  })
  it('removes a managed entry that is no longer declared', () => {
    const plan = planSync(
      [],
      [{ name: official.name!, source: official.source, extras: {} }],
      [{ name: official.name!, source: official.source, origin: 'base' }],
      { force: false },
    )

    expect(plan).toEqual({ actions: [{ kind: 'remove', name: 'claude-plugins-official' }], conflicts: [], forgotten: [] })
  })

  it('never removes a manual entry', () => {
    const manual = { name: 'my-own', source: { source: 'git', url: 'https://example.com/x.git' }, extras: {} }

    expect(planSync([], [manual], [], { force: false })).toEqual({ actions: [], conflicts: [], forgotten: [] })
  })
  describe('when a manual entry has the same name but a different source', () => {
    const manual = { name: official.name!, source: { source: 'git', url: 'https://example.com/fork.git' }, extras: {} }

    it('reports a conflict and leaves the entry alone', () => {
      const plan = planSync([official], [manual], [], { force: false })

      expect(plan.actions).toEqual([])
      expect(plan.conflicts).toEqual([
        { name: 'claude-plugins-official', reason: 'manual-entry', detail: expect.any(String) },
      ])
    })

    it('overwrites it with --force', () => {
      const plan = planSync([official], [manual], [], { force: true })

      expect(plan).toEqual({ actions: [{ kind: 'add', name: 'claude-plugins-official', declaration: official }], conflicts: [], forgotten: [] })
    })
  })
  it('re-adds a managed entry that was deleted from settings by hand', () => {
    const plan = planSync([official], [], [{ name: official.name!, source: official.source, origin: 'base' }], {
      force: false,
    })

    expect(plan).toEqual({ actions: [{ kind: 'readd', name: 'claude-plugins-official', declaration: official }], conflicts: [], forgotten: [] })
  })

  it('patches extra fields when the source already matches', () => {
    const declared = { ...official, extras: { autoUpdate: true } }
    const plan = planSync(
      [declared],
      [{ name: official.name!, source: official.source, extras: {} }],
      [{ name: official.name!, source: official.source, origin: 'base' }],
      { force: false },
    )

    expect(plan).toEqual({ actions: [{ kind: 'patch', name: 'claude-plugins-official', declaration: declared }], conflicts: [], forgotten: [] })
  })
  describe('review fixes', () => {
    const shorthand: MarketplaceDeclaration = { ...official, name: null }
    const managedOfficial = { name: official.name!, source: official.source, origin: 'base' }
    const entry = (extras: Record<string, unknown> = {}) => ({ name: official.name!, source: official.source, extras })

    it('reports the name known from the Lock for a shorthand declaration', () => {
      const plan = planSync([shorthand], [], [managedOfficial], { force: false })

      expect(plan.actions).toEqual([{ kind: 'readd', name: 'claude-plugins-official', declaration: shorthand }])
    })

    it('treats a shorthand declaration as satisfied by a manual entry with the same source', () => {
      expect(planSync([shorthand], [entry()], [], { force: false })).toEqual({ actions: [], conflicts: [], forgotten: [] })
    })

    it('does not patch a manual entry whose extra fields differ, unless forced', () => {
      const declared = { ...official, extras: { autoUpdate: true } }

      const plan = planSync([declared], [entry()], [], { force: false })
      expect(plan.actions).toEqual([])
      expect(plan.conflicts).toEqual([{ name: 'claude-plugins-official', reason: 'manual-entry', detail: expect.any(String) }])

      const forced = planSync([declared], [entry()], [], { force: true })
      expect(forced.actions).toEqual([{ kind: 'patch', name: 'claude-plugins-official', declaration: declared }])
    })

    it('patches a managed entry when an extra field was dropped from the declaration', () => {
      const plan = planSync([official], [entry({ autoUpdate: true })], [managedOfficial], { force: false })

      expect(plan.actions).toEqual([{ kind: 'patch', name: 'claude-plugins-official', declaration: official }])
    })

    it('leaves a managed entry alone while its declaration is blocked by a conflict', () => {
      const plan = planSync([], [entry()], [managedOfficial], { force: false, blocked: ['claude-plugins-official'] })

      expect(plan).toEqual({ actions: [], conflicts: [], forgotten: [] })
    })

    it('only forgets a managed entry that another Config still claims', () => {
      const shared = [{ ...official, name: official.name!, config: '/other/agent-plugins.yaml' }]

      expect(planSync([], [entry()], [managedOfficial], { force: false, shared })).toEqual({
        actions: [],
        conflicts: [],
        forgotten: ['claude-plugins-official'],
      })
    })

    it('reports a clash with another Config that declares the name differently, even with --force', () => {
      const shared = [{ ...official, name: official.name!, extras: { autoUpdate: true }, config: '/other/agent-plugins.yaml' }]

      const plan = planSync([official], [entry({ autoUpdate: true })], [managedOfficial], { force: true, shared })

      expect(plan).toEqual({
        actions: [],
        conflicts: [{ name: 'claude-plugins-official', reason: 'shared-clash', detail: expect.stringContaining('/other/agent-plugins.yaml') }],
        forgotten: [],
      })
    })

    it('reports a clash with another scope that has the name from a different source, even with --force', () => {
      const elsewhere = { cwd: '/repo', entries: [{ name: official.name!, source: { source: 'git', url: 'https://x/fork.git' }, extras: {}, scope: 'user' as const }] }

      expect(planSync([official], [], [], { force: true, elsewhere })).toEqual({
        actions: [],
        conflicts: [{ name: 'claude-plugins-official', reason: 'cross-scope', detail: expect.stringContaining('user settings') }],
        forgotten: [],
      })
    })

    it('compares directory sources of other scopes as absolute paths', () => {
      const local: MarketplaceDeclaration = { name: 'local-mk', source: { source: 'directory', path: './local-mk' }, extras: {}, origin: 'base' }
      const elsewhere = { cwd: '/repo', entries: [{ name: 'local-mk', source: { source: 'directory', path: '/repo/local-mk' }, extras: {}, scope: 'user' as const }] }

      expect(planSync([local], [], [], { force: false, elsewhere })).toEqual({
        actions: [{ kind: 'add', name: 'local-mk', declaration: local }],
        conflicts: [],
        forgotten: [],
      })
    })

    it('forgets a managed entry that is neither declared nor in settings', () => {
      expect(planSync([], [], [managedOfficial], { force: false })).toEqual({
        actions: [],
        conflicts: [],
        forgotten: ['claude-plugins-official'],
      })
    })
  })
})
