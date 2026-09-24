import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { fakeClaude } from './fake-claude.js'
import { sync, type SyncMode } from './index.js'
import { makeTree } from './test-helpers.js'
import type { Scope } from './types.js'

const OFFICIAL = {
  name: 'claude-plugins-official',
  source: { source: 'github', repo: 'anthropics/claude-plugins-official' },
}
const C7 = 'context7@claude-plugins-official'
const LSP = 'lsp@claude-plugins-official'

function config(plugins: string, marketplaces = `
  marketplaces:
    claude-plugins-official:
      source: { source: github, repo: anthropics/claude-plugins-official }`) {
  return `kind: Config\nmetadata: { name: demo }\nspec:${marketplaces}\n  plugins: ${plugins}\n`
}

async function setup(files: Record<string, string>, fake: { failOn?: string[]; confirm?: string[] } = {}, homedir?: string) {
  const cwd = await makeTree(files)
  homedir ??= await makeTree({})
  const claude = fakeClaude({ cwd, homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL }, ...fake })
  const deps = {
    exec: claude.exec,
    fetch: async () => {
      throw new Error('offline')
    },
    homedir,
    defaultPresetsDir: join(cwd, 'default-presets'),
  }
  const run = (mode: SyncMode = 'apply', extra: { force?: boolean; scope?: Scope } = {}) =>
    sync({ cwd, scope: extra.scope ?? 'project', mode, force: extra.force }, deps)
  const read = async (path: string) => readFile(join(cwd, path), 'utf8').catch(() => undefined)
  const settings = async (path = '.claude/settings.json') => JSON.parse((await read(path)) ?? '{}')
  const enabled = async () => (await settings()).enabledPlugins
  const lock = async () => parse((await read('agent-plugins.lock')) ?? '') ?? {}
  const setConfig = (text: string) => writeFile(join(cwd, 'agent-plugins.yaml'), text)
  const installedAt = async (id: string) => ((await claude.installs())[id] ?? []).map((r) => r.scope)
  const pluginCalls = () => claude.calls.filter((c) => c[2] !== 'marketplace')
  return { cwd, homedir, claude, deps, run, read, settings, enabled, lock, setConfig, installedAt, pluginCalls }
}

const plugin = (kind: string, name: string, status = 'done') => expect.objectContaining({ target: 'plugin', kind, name, status })

describe('sync plugins', () => {
  it('installs a declared plugin after adding its marketplace and records it in the lock', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })

    const report = await t.run()

    expect(report.inSync).toBe(true)
    expect(report.actions).toEqual([
      expect.objectContaining({ target: 'marketplace', kind: 'add', name: 'claude-plugins-official' }),
      plugin('install', C7),
    ])
    expect(t.pluginCalls()).toEqual([['claude', 'plugin', 'install', C7, '--scope', 'project', '--json']])
    expect(await t.enabled()).toEqual({ [C7]: true })
    expect(await t.installedAt(C7)).toEqual(['project'])
    expect((await t.lock()).plugins).toEqual([{ id: C7, enabled: true, origin: 'agent-plugins.yaml' }])
    expect(await t.run('check')).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
  })

  it('re-adds a marketplace still in settings but gone from the machine-wide install, then installs its plugins', async () => {
    // Shorthand, as in the `base` Preset: its name comes from Lock/State, since `add` leaves settings unchanged.
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`, '\n  marketplaces: [anthropics/claude-plugins-official]') })
    await t.run()
    // Another scope's `marketplace remove` (or a wiped `~/.claude/plugins`) drops the shared install, not this scope's entry.
    const knownPath = join(t.homedir, '.claude/plugins/known_marketplaces.json')
    await writeFile(knownPath, '{}')
    await writeFile(join(t.homedir, '.claude/plugins/installed_plugins.json'), '{"version":2,"plugins":{}}')

    const report = await t.run()

    expect(report.inSync).toBe(true)
    expect(report.actions).toEqual([
      expect.objectContaining({ target: 'marketplace', kind: 'readd', name: 'claude-plugins-official', status: 'done' }),
      plugin('install', C7),
    ])
    expect(Object.keys(await t.claude.installed())).toEqual(['claude-plugins-official'])
    expect(await t.installedAt(C7)).toEqual(['project'])
    expect(await t.run('check')).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
  })

  it('writes a declared false itself, without installing the plugin', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${C7}: false }`) })

    const report = await t.run()

    expect(report.actions).toContainEqual(plugin('disable', C7))
    expect(t.pluginCalls()).toEqual([])
    expect(await t.enabled()).toEqual({ [C7]: false })
    expect(await t.installedAt(C7)).toEqual([])
    expect((await t.lock()).plugins).toEqual([{ id: C7, enabled: false, origin: 'agent-plugins.yaml' }])
  })

  it('disables a managed plugin keeping its install, and re-enables it without reinstalling', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })
    await t.run()

    await t.setConfig(config(`{ ${C7}: false }`))
    expect((await t.run()).actions).toEqual([plugin('disable', C7)])
    expect(await t.enabled()).toEqual({ [C7]: false })
    expect(await t.installedAt(C7)).toEqual(['project'])

    await t.setConfig(config(`{ ${C7}: true }`))
    expect((await t.run()).actions).toEqual([plugin('enable', C7)])
    expect(t.pluginCalls().at(-1)).toEqual(['claude', 'plugin', 'enable', C7, '--scope', 'project', '--json'])
    expect(await t.enabled()).toEqual({ [C7]: true })
  })

  it('uninstalls a dropped plugin it installed, and unsets a dropped false it wrote', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${C7}: true, ${LSP}: false }`) })
    await t.run()
    await t.setConfig(config('{}'))

    const report = await t.run()

    expect(report.actions).toEqual([plugin('uninstall', C7), plugin('unset', LSP)])
    expect(t.pluginCalls().at(-1)).toEqual(['claude', 'plugin', 'uninstall', C7, '--scope', 'project', '--json'])
    expect(await t.enabled()).toEqual({})
    expect(await t.installedAt(C7)).toEqual([])
    expect((await t.lock()).plugins).toBeUndefined()
  })

  it('installs a plugin that settings already enable but this machine lacks, as after a fresh clone', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })
    await t.run()
    await writeFile(join(t.homedir, '.claude/plugins/installed_plugins.json'), '{}')

    const check = await t.run('check')
    expect(check.inSync).toBe(false)
    expect(check.actions).toEqual([plugin('install', C7, 'planned')])

    expect((await t.run()).actions).toEqual([plugin('install', C7)])
    expect(await t.installedAt(C7)).toEqual(['project'])
  })

  it('adopts a matching manual entry once, installing it if this machine lacks it', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`{ ${C7}: true, ${LSP}: false }`),
      '.claude/settings.json': JSON.stringify({ enabledPlugins: { [C7]: true, [LSP]: false } }),
    })

    const report = await t.run()

    expect(report.actions).toEqual([expect.objectContaining({ target: 'marketplace' }), plugin('install', C7)])
    expect(report.notices).toEqual([expect.stringContaining(`now manages "${LSP}"`), expect.stringContaining(`now manages "${C7}"`)])
    expect((await t.lock()).plugins).toEqual([
      { id: LSP, enabled: false, origin: 'agent-plugins.yaml' },
      { id: C7, enabled: true, origin: 'agent-plugins.yaml' },
    ])
    expect(await t.run('check')).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
    expect((await t.run()).notices).toEqual([])

    await t.setConfig(config('{}'))
    expect((await t.run()).actions).toEqual([plugin('unset', LSP), plugin('uninstall', C7)])
  })

  it('refuses to flip a manual entry unless forced, then manages it', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`{ ${C7}: false }`),
      '.claude/settings.json': JSON.stringify({ enabledPlugins: { [C7]: true } }),
    })

    const report = await t.run()
    expect(report.conflicts).toEqual([{ name: C7, reason: 'manual-entry', detail: expect.stringContaining('--force') }])
    expect(await t.enabled()).toEqual({ [C7]: true })

    const forced = await t.run('apply', { force: true })
    expect(forced.actions).toEqual([plugin('disable', C7)])
    expect(await t.enabled()).toEqual({ [C7]: false })
    expect((await t.lock()).plugins).toEqual([{ id: C7, enabled: false, origin: 'agent-plugins.yaml' }])
  })

  it('fails the plugins of a marketplace that failed to add, and keeps their managed entries', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })
    await t.run()
    await writeFile(join(t.cwd, '.claude/settings.json'), '{}')
    const failing = fakeClaude({ cwd: t.cwd, homedir: t.homedir, marketplaces: {}, failOn: ['anthropics/claude-plugins-official'] })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, { ...t.deps, exec: failing.exec })

    expect(report.actions).toEqual([
      expect.objectContaining({ target: 'marketplace', kind: 'readd', status: 'failed' }),
      expect.objectContaining({ target: 'plugin', kind: 'enable', name: C7, status: 'failed', error: expect.stringContaining('claude-plugins-official') }),
    ])
    expect(failing.calls.filter((c) => c[2] !== 'marketplace')).toEqual([])
    expect((await t.lock()).plugins).toEqual([{ id: C7, enabled: true, origin: 'agent-plugins.yaml' }])
  })

  it('holds the plugins of a clashing marketplace', async () => {
    const preset = (name: string, repo: string) =>
      `kind: Preset\nmetadata: { name: ${name} }\nspec:\n  marketplaces:\n    claude-plugins-official: { source: { source: github, repo: ${repo} } }\n`
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })
    await t.run()
    await writeFile(join(t.cwd, 'a.yaml'), preset('a', 'anthropics/claude-plugins-official'))
    await writeFile(join(t.cwd, 'b.yaml'), preset('b', 'someone/fork'))
    await t.setConfig(`kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml, ./b.yaml]\n  plugins: [${C7}]\n`)

    const report = await t.run()

    expect(report.actions).toEqual([])
    expect(await t.enabled()).toEqual({ [C7]: true })
    expect((await t.lock()).plugins).toHaveLength(1)
  })

  it('holds a plugin whose Presets clash on its scope', async () => {
    const preset = (name: string, value: string) => `kind: Preset\nmetadata: { name: ${name} }\nspec:\n  plugins: { ${C7}: ${value} }\n`
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })
    await t.run()
    await writeFile(join(t.cwd, 'a.yaml'), preset('a', '{ enabled: true, scope: user }'))
    await writeFile(join(t.cwd, 'b.yaml'), preset('b', 'false'))
    await t.setConfig(
      `kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml, ./b.yaml]\n  marketplaces:\n    claude-plugins-official:\n      source: { source: github, repo: anthropics/claude-plugins-official }\n      scope: user\n`,
    )

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: C7, reason: 'preset-clash' })])
    expect(report.actions.filter((a) => a.target === 'plugin')).toEqual([])
    expect(await t.enabled()).toEqual({ [C7]: true })
    expect((await t.lock()).plugins).toHaveLength(1)
  })

  it('does not remove a marketplace that manual plugin entries still use, unless forced', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{}') })
    await t.run()
    const settings = await t.settings()
    await writeFile(join(t.cwd, '.claude/settings.json'), JSON.stringify({ ...settings, enabledPlugins: { [LSP]: true } }))
    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')

    const report = await t.run()
    expect(report.actions).toEqual([])
    expect(report.conflicts).toEqual([
      { name: 'claude-plugins-official', reason: 'manual-entry', detail: expect.stringContaining(LSP) },
    ])
    expect(Object.keys((await t.settings()).extraKnownMarketplaces)).toEqual(['claude-plugins-official'])
    expect((await t.lock()).marketplaces).toHaveLength(1)

    const forced = await t.run('apply', { force: true })
    expect(forced.actions).toEqual([expect.objectContaining({ target: 'marketplace', kind: 'remove', status: 'done' })])
    expect(await t.enabled()).toEqual({})
  })

  it('uninstalls managed plugins before removing their marketplace', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })
    await t.run()
    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')

    const report = await t.run()

    expect(report.actions).toEqual([plugin('uninstall', C7), expect.objectContaining({ target: 'marketplace', kind: 'remove' })])
    expect(await t.lock()).toEqual({})
  })

  describe('with a shorthand marketplace', () => {
    const SHORTHAND = `
  marketplaces: [anthropics/claude-plugins-official]`

    it('plans the plugin before the marketplace name is known, then checks it after adding', async () => {
      const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`, SHORTHAND) })

      const plan = await t.run('dry-run')
      expect(plan.conflicts).toEqual([])
      expect(plan.actions).toEqual([expect.objectContaining({ target: 'marketplace', kind: 'add' }), plugin('install', C7, 'planned')])
      expect(plan.notices).toEqual([expect.stringContaining(C7)])

      const report = await t.run()
      expect(report.inSync).toBe(true)
      expect(report.actions).toEqual([
        expect.objectContaining({ target: 'marketplace', kind: 'add', name: 'claude-plugins-official' }),
        plugin('install', C7),
      ])
      expect(await t.enabled()).toEqual({ [C7]: true })
      expect(await t.run('check')).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
    })

    it('fails a plugin whose suffix matches no marketplace once the shorthand is added', async () => {
      const t = await setup({ 'agent-plugins.yaml': config('[context7@typo]', SHORTHAND) })

      expect((await t.run('dry-run')).conflicts).toEqual([])
      const report = await t.run()

      expect(report.inSync).toBe(false)
      expect(report.actions).toContainEqual(expect.objectContaining({ kind: 'install', name: 'context7@typo', status: 'failed' }))
      expect(report.conflicts).toEqual([expect.objectContaining({ name: 'context7@typo', reason: 'missing-marketplace' })])
      expect(t.pluginCalls()).toEqual([])
    })

    it('reports a wrong suffix up front once the shorthand name is known', async () => {
      const t = await setup({ 'agent-plugins.yaml': config('{}', SHORTHAND) })
      await t.run()
      await t.setConfig(config('[context7@typo]', SHORTHAND))

      const report = await t.run('dry-run')

      expect(report.actions).toEqual([])
      expect(report.conflicts).toEqual([expect.objectContaining({ name: 'context7@typo', reason: 'missing-marketplace' })])
    })
  })

  it('reports a plugin whose marketplace is not declared at all', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('[context7@typo]') })

    const report = await t.run('dry-run')

    expect(report.conflicts).toEqual([
      {
        name: 'context7@typo',
        reason: 'missing-marketplace',
        detail: expect.stringContaining('"typo"'),
        group: expect.objectContaining({ title: expect.stringContaining('marketplace "typo"'), item: 'context7' }),
      },
    ])
    expect(report.actions.filter((a) => a.target === 'plugin')).toEqual([])
  })

  it('keeps a marketplace and its plugins while plugins still declare it', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${C7}: true }`) })
    await t.run()
    await t.setConfig(config(`{ ${C7}: true }`, ''))

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: C7, reason: 'missing-marketplace' })])
    expect(report.actions).toEqual([])
    expect(await t.enabled()).toEqual({ [C7]: true })
    expect((await t.settings()).extraKnownMarketplaces).toHaveProperty(OFFICIAL.name)
  })

  it('removes a marketplace and its plugins once neither is declared', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ ${C7}: true }`) })
    await t.run()
    await t.setConfig(config('{}', ''))

    const report = await t.run()

    expect(report.conflicts).toEqual([])
    expect(report.actions.map((a) => [a.kind, a.name])).toEqual([
      ['uninstall', C7],
      ['remove', OFFICIAL.name],
    ])
  })

  it('reports a plugin that needs confirmation as failed, with the command to run by hand', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) }, { confirm: [C7] })

    const report = await t.run()

    expect(report.actions).toContainEqual(
      expect.objectContaining({ kind: 'install', status: 'failed', error: expect.stringContaining(`claude plugin install ${C7} --scope project`) }),
    )
    expect((await t.lock()).plugins).toBeUndefined()
  })

  it('keeps a user-scope plugin while another repo still declares it, then hands it over', async () => {
    const a = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })
    const b = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) }, {}, a.homedir)
    const userEnabled = async () => JSON.parse(await readFile(join(a.homedir, '.claude/settings.json'), 'utf8')).enabledPlugins

    await a.run('apply', { scope: 'user' })
    await b.run('apply', { scope: 'user' })
    await a.setConfig(config('{}'))
    expect((await a.run('apply', { scope: 'user' })).actions).toEqual([])
    expect(await userEnabled()).toEqual({ [C7]: true })

    await b.setConfig(config('{}'))
    expect((await b.run('apply', { scope: 'user' })).actions).toEqual([plugin('uninstall', C7)])
    expect(await userEnabled()).toEqual({})
  })

  it('refuses to fight another repo over a user-scope plugin declared differently', async () => {
    const a = await setup({ 'agent-plugins.yaml': config(`[${C7}]`) })
    const b = await setup({ 'agent-plugins.yaml': config(`{ ${C7}: false }`) }, {}, a.homedir)

    await a.run('apply', { scope: 'user' })
    const report = await b.run('apply', { scope: 'user', force: true })

    expect(report.conflicts).toEqual([expect.objectContaining({ name: C7, reason: 'shared-clash' })])
    expect(report.actions.filter((x) => x.target === 'plugin')).toEqual([])
  })
})
