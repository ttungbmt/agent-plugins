import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fakeClaude } from './fake-claude.js'
import { readJson, settingsPath } from './files.js'
import { sync } from './index.js'
import { makeTree } from './test-helpers.js'

/** User-scoped marketplaces (ADR 0011): synced to the `user` Scope whatever Scope the Sync targets. */

const OFFICIAL = {
  name: 'claude-plugins-official',
  source: { source: 'github' as const, repo: 'anthropics/claude-plugins-official' },
}

const config = (entry = 'scope: user', plugins = '') => `
kind: Config
metadata: { name: demo }
spec:
  marketplaces:
    claude-plugins-official:
      source: { source: github, repo: anthropics/claude-plugins-official }
      ${entry}
${plugins}`

async function setup(files: Record<string, string>, failOn?: string[]) {
  const cwd = await makeTree(files)
  const homedir = await makeTree({})
  const claude = fakeClaude({ cwd, homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL }, failOn })
  const deps = {
    exec: claude.exec,
    fetch: async () => {
      throw new Error('offline')
    },
    homedir,
    defaultPresetsDir: join(cwd, 'default-presets'),
  }
  const settings = (scope: 'project' | 'local' | 'user') => readJson<Record<string, any>>(settingsPath(scope, { cwd, homedir }))
  const lock = () => readFile(join(cwd, 'agent-plugins.lock'), 'utf8').catch(() => '')
  return { cwd, homedir, claude, deps, settings, lock }
}

describe('a User-scoped marketplace in a project Sync', () => {
  it('is declared in user settings, not in project settings or the Lock', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    const again = await sync({ cwd: t.cwd, scope: 'project', mode: 'check' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(t.claude.calls).toEqual([
      ['claude', 'plugin', 'marketplace', 'add', 'anthropics/claude-plugins-official', '--scope', 'user'],
    ])
    expect((await t.settings('user')).extraKnownMarketplaces).toEqual({ [OFFICIAL.name]: { source: OFFICIAL.source } })
    expect((await t.settings('project')).extraKnownMarketplaces).toBeUndefined()
    expect(await t.lock()).not.toContain(OFFICIAL.name)
    expect(again.inSync).toBe(true)
  })

  it('lets plugins at the project Scope use it', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('scope: user', '  plugins:\n    commit-commands@claude-plugins-official: true\n') })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(t.claude.calls.at(-1)).toEqual(['claude', 'plugin', 'install', 'commit-commands@claude-plugins-official', '--scope', 'project', '--json'])
    expect((await t.settings('project')).enabledPlugins).toEqual({ 'commit-commands@claude-plugins-official': true })
  })

  it('patches its settings fields in user settings', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), config('scope: user\n      autoUpdate: true'))

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([expect.objectContaining({ kind: 'patch', name: OFFICIAL.name, scope: 'user', status: 'done' })])
    expect((await t.settings('user')).extraKnownMarketplaces).toEqual({
      [OFFICIAL.name]: { source: OFFICIAL.source, autoUpdate: true },
    })
  })

  it('is removed from user settings once no Config declares it', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: demo }\nspec: {}\n')

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([expect.objectContaining({ kind: 'remove', name: OFFICIAL.name, scope: 'user', status: 'done' })])
    expect((await t.settings('user')).extraKnownMarketplaces).toEqual({})
  })

  it('stays in user settings while another Config still declares it', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })
    const other = await makeTree({ 'agent-plugins.yaml': config() })
    const otherClaude = fakeClaude({ cwd: other, homedir: t.homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL } })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await sync({ cwd: other, scope: 'project', mode: 'apply' }, { ...t.deps, exec: otherClaude.exec })
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: demo }\nspec: {}\n')

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(other, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: other }\nspec: {}\n')
    const last = await sync({ cwd: other, scope: 'project', mode: 'apply' }, { ...t.deps, exec: otherClaude.exec })

    expect(report.actions).toEqual([])
    expect(last.actions).toEqual([expect.objectContaining({ kind: 'remove', name: OFFICIAL.name, scope: 'user', status: 'done' })])
  })

  it('is kept in user settings while plugins at the user Scope use it, unless forced', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    const path = settingsPath('user', { cwd: t.cwd, homedir: t.homedir })
    await writeFile(path, JSON.stringify({ ...(await t.settings('user')), enabledPlugins: { 'hookify@claude-plugins-official': true } }))
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: demo }\nspec: {}\n')

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([])
    expect(report.conflicts).toEqual([expect.objectContaining({ name: OFFICIAL.name, reason: 'manual-entry' })])
    expect((await t.settings('user')).extraKnownMarketplaces).toHaveProperty(OFFICIAL.name)
    const forced = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply', force: true }, t.deps)
    expect(forced.actions).toEqual([expect.objectContaining({ kind: 'remove', scope: 'user', status: 'done' })])
  })

  it('is kept, with its project plugins, while plugins still declare it', async () => {
    const plugins = '  plugins:\n    commit-commands@claude-plugins-official: true\n'
    const t = await setup({ 'agent-plugins.yaml': config('scope: user', plugins) })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), `kind: Config\nmetadata: { name: demo }\nspec:\n${plugins}`)

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([expect.objectContaining({ reason: 'missing-marketplace' })])
    expect(report.actions).toEqual([])
    expect((await t.settings('project')).enabledPlugins).toEqual({ 'commit-commands@claude-plugins-official': true })
    expect((await t.settings('user')).extraKnownMarketplaces).toHaveProperty(OFFICIAL.name)
  })

  it('is planned with its Scope in dry-run and check, without calling claude', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })

    for (const mode of ['dry-run', 'check'] as const) {
      const report = await sync({ cwd: t.cwd, scope: 'project', mode }, t.deps)
      expect(report.inSync).toBe(false)
      expect(report.actions).toEqual([
        { target: 'marketplace', kind: 'add', name: OFFICIAL.name, source: OFFICIAL.source, scope: 'user', status: 'planned' },
      ])
    }
    expect(t.claude.calls).toEqual([])
    expect(await t.settings('user')).toEqual({})
  })

  it('fails its plugins as not ready when adding it to user settings fails', async () => {
    const t = await setup(
      { 'agent-plugins.yaml': config('scope: user', '  plugins:\n    commit-commands@claude-plugins-official: true\n') },
      ['anthropics/claude-plugins-official'],
    )

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([
      expect.objectContaining({ target: 'marketplace', kind: 'add', scope: 'user', status: 'failed' }),
      expect.objectContaining({
        target: 'plugin',
        status: 'failed',
        error: 'marketplace "claude-plugins-official" is not ready in user settings',
      }),
    ])
  })
})

describe('a User-scoped marketplace outside a project Sync', () => {
  it('is declared in user settings by a local Sync', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })

    await sync({ cwd: t.cwd, scope: 'local', mode: 'apply' }, t.deps)

    expect(t.claude.calls).toEqual([
      ['claude', 'plugin', 'marketplace', 'add', 'anthropics/claude-plugins-official', '--scope', 'user'],
    ])
    expect((await t.settings('local')).extraKnownMarketplaces).toBeUndefined()
    expect((await sync({ cwd: t.cwd, scope: 'local', mode: 'check' }, t.deps)).inSync).toBe(true)
  })

  it('is an ordinary declaration in a user Sync', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })

    const report = await sync({ cwd: t.cwd, scope: 'user', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([
      { target: 'marketplace', kind: 'add', name: OFFICIAL.name, source: OFFICIAL.source, status: 'done' },
    ])
    expect((await t.settings('user')).extraKnownMarketplaces).toEqual({ [OFFICIAL.name]: { source: OFFICIAL.source } })
  })
})

describe('moving an entry between the targeted Scope and user', () => {
  const PLUGINS = '  plugins:\n    commit-commands@claude-plugins-official: true\n'

  it('moves a project entry to user settings, adding it there first and keeping the project plugins', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('autoUpdate: true', PLUGINS) })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), config('autoUpdate: true\n      scope: user', PLUGINS))

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(report.actions.map((a) => [a.kind, a.name, a.scope ?? 'project', a.status])).toEqual([
      ['add', OFFICIAL.name, 'user', 'done'],
      ['remove', OFFICIAL.name, 'project', 'done'],
    ])
    expect((await t.settings('project')).extraKnownMarketplaces).toEqual({})
    expect((await t.settings('project')).enabledPlugins).toEqual({ 'commit-commands@claude-plugins-official': true })
    expect(await t.lock()).not.toContain('marketplaces:')
    expect((await sync({ cwd: t.cwd, scope: 'project', mode: 'check' }, t.deps)).inSync).toBe(true)
  })

  it('moves a User-scoped entry back to the project, adding it there first', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('scope: user', PLUGINS) })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), config('', PLUGINS))

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(report.actions.map((a) => [a.kind, a.name, a.scope ?? 'project', a.status])).toEqual([
      ['add', OFFICIAL.name, 'project', 'done'],
      ['remove', OFFICIAL.name, 'user', 'done'],
    ])
    expect((await t.settings('user')).extraKnownMarketplaces).toEqual({})
    expect((await t.settings('project')).extraKnownMarketplaces).toEqual({ [OFFICIAL.name]: { source: OFFICIAL.source } })
    expect((await sync({ cwd: t.cwd, scope: 'project', mode: 'check' }, t.deps)).inSync).toBe(true)
  })

  it('leaves the user entry to another Config still declaring it when moving back to the project', async () => {
    const t = await setup({ 'agent-plugins.yaml': config() })
    const other = await makeTree({ 'agent-plugins.yaml': config() })
    const otherClaude = fakeClaude({ cwd: other, homedir: t.homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL } })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await sync({ cwd: other, scope: 'project', mode: 'apply' }, { ...t.deps, exec: otherClaude.exec })
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), config(''))

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(report.actions.map((a) => [a.kind, a.scope ?? 'project'])).toEqual([['add', 'project']])
    expect((await t.settings('user')).extraKnownMarketplaces).toEqual({ [OFFICIAL.name]: { source: OFFICIAL.source } })
  })

  it('still reports a cross-scope conflict against a project entry with another source', async () => {
    const fork = { source: 'git', url: 'https://example.com/fork.git' }
    const t = await setup({
      'agent-plugins.yaml': config(),
      '.claude/settings.json': JSON.stringify({ extraKnownMarketplaces: { [OFFICIAL.name]: { source: fork } } }),
    })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'dry-run' }, t.deps)

    expect(report.conflicts).toEqual([expect.objectContaining({ name: OFFICIAL.name, reason: 'cross-scope' })])
    expect(report.actions).toEqual([])
  })
})

/** User-scoped plugins (ADR 0012): installed, enabled and removed at the `user` Scope whatever Scope the Sync targets. */
describe('a User-scoped plugin', () => {
  const CS = 'commit-commands@claude-plugins-official'
  const userPlugin = (value = '{ enabled: true, scope: user }') => config('scope: user', `  plugins:\n    ${CS}: ${value}\n`)
  const empty = 'kind: Config\nmetadata: { name: demo }\nspec: {}\n'
  const userState = async (homedir: string) => readJson<Record<string, any>>(join(homedir, '.agent-plugins/state.json'))
  const writeUserSettings = async (t: { cwd: string; homedir: string }, settings: object) => {
    const path = settingsPath('user', t)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify(settings))
  }

  it.each(['project', 'local'] as const)('is installed in user settings by a %s Sync, not in the Lock', async (scope) => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })

    const report = await sync({ cwd: t.cwd, scope, mode: 'apply' }, t.deps)
    const again = await sync({ cwd: t.cwd, scope, mode: 'check' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(report.actions).toEqual([
      expect.objectContaining({ target: 'marketplace', kind: 'add', scope: 'user', status: 'done' }),
      expect.objectContaining({ target: 'plugin', kind: 'install', name: CS, scope: 'user', status: 'done' }),
    ])
    expect(t.claude.calls.at(-1)).toEqual(['claude', 'plugin', 'install', CS, '--scope', 'user', '--json'])
    expect((await t.settings('user')).enabledPlugins).toEqual({ [CS]: true })
    expect((await t.settings(scope)).enabledPlugins).toBeUndefined()
    expect(await t.lock()).not.toContain(CS)
    const record = (await userState(t.homedir))[`${join(t.cwd, 'agent-plugins.yaml')}#${scope}`]
    expect(record.plugins).toEqual([{ id: CS, enabled: true, origin: 'agent-plugins.yaml' }])
    expect(record.pluginClaims).toEqual([{ id: CS, enabled: true, origin: 'agent-plugins.yaml' }])
    expect(again.inSync).toBe(true)
  })

  it('is an ordinary declaration in a user Sync', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })

    const report = await sync({ cwd: t.cwd, scope: 'user', mode: 'apply' }, t.deps)

    expect(report.actions.map(({ target, kind, scope }) => ({ target, kind, scope }))).toEqual([
      { target: 'marketplace', kind: 'add', scope: undefined },
      { target: 'plugin', kind: 'install', scope: undefined },
    ])
    expect((await t.settings('user')).enabledPlugins).toEqual({ [CS]: true })
  })

  it('is planned with its Scope in dry-run and check, without calling claude', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })

    for (const mode of ['dry-run', 'check'] as const) {
      const report = await sync({ cwd: t.cwd, scope: 'project', mode }, t.deps)
      expect(report.inSync).toBe(false)
      expect(report.actions.at(-1)).toEqual({
        target: 'plugin',
        kind: 'install',
        name: CS,
        source: null,
        scope: 'user',
        status: 'planned',
      })
    }
    expect(t.claude.calls).toEqual([])
  })

  it('is uninstalled from user settings once no Config declares it, before its marketplace is removed', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), empty)

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(report.actions.map(({ target, kind, scope }) => [target, kind, scope])).toEqual([
      ['plugin', 'uninstall', 'user'],
      ['marketplace', 'remove', 'user'],
    ])
    expect((await t.settings('user')).enabledPlugins).toEqual({})
  })

  it('stays in user settings while another Config still declares it', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })
    const other = await makeTree({ 'agent-plugins.yaml': userPlugin() })
    const otherDeps = {
      ...t.deps,
      exec: fakeClaude({ cwd: other, homedir: t.homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL } }).exec,
    }
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await sync({ cwd: other, scope: 'project', mode: 'apply' }, otherDeps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), empty)

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(other, 'agent-plugins.yaml'), empty)
    const last = await sync({ cwd: other, scope: 'project', mode: 'apply' }, otherDeps)

    expect(report.actions).toEqual([])
    expect(last.actions.map(({ target, kind }) => [target, kind])).toEqual([
      ['plugin', 'uninstall'],
      ['marketplace', 'remove'],
    ])
  })

  it('drops the claim of a Config that only claimed it, so the owner removes it right away', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })
    const other = await makeTree({ 'agent-plugins.yaml': userPlugin() })
    const otherDeps = {
      ...t.deps,
      exec: fakeClaude({ cwd: other, homedir: t.homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL } }).exec,
    }
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await sync({ cwd: other, scope: 'project', mode: 'apply' }, otherDeps)
    await writeFile(join(other, 'agent-plugins.yaml'), empty)
    await sync({ cwd: other, scope: 'project', mode: 'apply' }, otherDeps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), empty)

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(Object.keys(await userState(t.homedir))).toEqual([])
    expect(report.actions.map(({ target, kind }) => [target, kind])).toEqual([
      ['plugin', 'uninstall'],
      ['marketplace', 'remove'],
    ])
  })

  it('is opted out by one Config while another Config keeps it in user settings', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })
    const other = await makeTree({ 'agent-plugins.yaml': userPlugin() })
    const otherDeps = {
      ...t.deps,
      exec: fakeClaude({ cwd: other, homedir: t.homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL } }).exec,
    }
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await sync({ cwd: other, scope: 'project', mode: 'apply' }, otherDeps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), userPlugin('false'))

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect((await t.settings('project')).enabledPlugins).toEqual({ [CS]: false })
    expect((await t.settings('user')).enabledPlugins).toEqual({ [CS]: true })
    const state = await userState(t.homedir)
    expect(state[`${join(t.cwd, 'agent-plugins.yaml')}#project`].pluginClaims).toBeUndefined()
    expect(state[`${join(other, 'agent-plugins.yaml')}#project`].plugins).toEqual([
      { id: CS, enabled: true, origin: 'agent-plugins.yaml' },
    ])
  })

  it('adopts a matching Manual entry in user settings', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })
    await writeUserSettings(t, { enabledPlugins: { [CS]: true } })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(report.notices).toContain(`ap now manages "${CS}", which was set up by hand`)
  })

  it('refuses to flip a Manual entry in user settings unless forced', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })
    await writeUserSettings(t, { enabledPlugins: { [CS]: false } })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([expect.objectContaining({ name: CS, reason: 'manual-entry' })])
    expect((await t.settings('user')).enabledPlugins).toEqual({ [CS]: false })
  })

  it('is opted out by a Config redeclaring it false, which drops the user claim', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), userPlugin('false'))

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect((await t.settings('project')).enabledPlugins).toEqual({ [CS]: false })
    expect((await t.settings('user')).enabledPlugins).toEqual({})
    const record = (await userState(t.homedir))[`${join(t.cwd, 'agent-plugins.yaml')}#project`]
    expect(record.pluginClaims).toBeUndefined()
  })

  it('fails as not ready when adding its marketplace to user settings fails', async () => {
    const t = await setup({ 'agent-plugins.yaml': userPlugin() }, ['anthropics/claude-plugins-official'])

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([
      expect.objectContaining({ target: 'marketplace', kind: 'add', scope: 'user', status: 'failed' }),
      expect.objectContaining({
        target: 'plugin',
        scope: 'user',
        status: 'failed',
        error: 'marketplace "claude-plugins-official" is not ready in user settings',
      }),
    ])
  })
})

/** Adding or dropping `scope: user` on a Managed plugin (ADR 0012): the new Scope first, then the old one. */
describe('moving a plugin between the targeted Scope and user', () => {
  const CS = 'commit-commands@claude-plugins-official'
  const withPlugin = (value: string) => config('scope: user', `  plugins:\n    ${CS}: ${value}\n`)
  const atUser = withPlugin('{ enabled: true, scope: user }')
  const atTarget = withPlugin('true')
  const claudeAt = (cwd: string, homedir: string, failOn?: string[]) =>
    fakeClaude({ cwd, homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL }, failOn })
  const userRecord = async (t: { cwd: string; homedir: string }) =>
    (await readJson<Record<string, any>>(join(t.homedir, '.agent-plugins/state.json')))[`${join(t.cwd, 'agent-plugins.yaml')}#project`]
  const steps = (report: { actions: { target: string; kind: string; scope?: string; status: string }[] }) =>
    report.actions.filter((a) => a.target === 'plugin').map((a) => [a.kind, a.scope ?? 'target', a.status])

  it.each(['project', 'local'] as const)('moves a %s plugin to user settings, installing it there first', async (scope) => {
    const t = await setup({ 'agent-plugins.yaml': atTarget })
    await sync({ cwd: t.cwd, scope, mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), atUser)

    const report = await sync({ cwd: t.cwd, scope, mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(steps(report)).toEqual([
      ['install', 'user', 'done'],
      ['uninstall', 'target', 'done'],
    ])
    expect((await t.settings(scope)).enabledPlugins).toEqual({})
    expect((await t.settings('user')).enabledPlugins).toEqual({ [CS]: true })
    expect(await t.lock()).not.toContain(CS)
    expect(await readFile(join(t.cwd, '.agent-plugins/state.local.json'), 'utf8').catch(() => '')).not.toContain(CS)
    expect((await sync({ cwd: t.cwd, scope, mode: 'check' }, t.deps)).inSync).toBe(true)
  })

  it('moves a User-scoped plugin back to the project, installing it there first', async () => {
    const t = await setup({ 'agent-plugins.yaml': atUser })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), atTarget)

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([])
    expect(steps(report)).toEqual([
      ['install', 'target', 'done'],
      ['uninstall', 'user', 'done'],
    ])
    expect((await t.settings('project')).enabledPlugins).toEqual({ [CS]: true })
    expect((await t.settings('user')).enabledPlugins).toEqual({})
    expect(await t.lock()).toContain(CS)
    expect((await sync({ cwd: t.cwd, scope: 'project', mode: 'check' }, t.deps)).inSync).toBe(true)
  })

  it('only drops its user claim when moving back while another Config still claims it', async () => {
    const t = await setup({ 'agent-plugins.yaml': atUser })
    const other = await makeTree({ 'agent-plugins.yaml': atUser })
    const otherDeps = { ...t.deps, exec: claudeAt(other, t.homedir).exec }
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await sync({ cwd: other, scope: 'project', mode: 'apply' }, otherDeps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), atTarget)

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(steps(report)).toEqual([['install', 'target', 'done']])
    expect((await t.settings('user')).enabledPlugins).toEqual({ [CS]: true })
    expect((await t.settings('project')).enabledPlugins).toEqual({ [CS]: true })
    expect((await userRecord(t)).pluginClaims).toBeUndefined()
  })

  it('keeps its user claim when installing back at the project fails while another Config claims it', async () => {
    const t = await setup({ 'agent-plugins.yaml': atUser })
    const other = await makeTree({ 'agent-plugins.yaml': atUser })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await sync({ cwd: other, scope: 'project', mode: 'apply' }, { ...t.deps, exec: claudeAt(other, t.homedir).exec })
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), atTarget)

    const failing = { ...t.deps, exec: claudeAt(t.cwd, t.homedir, [CS]).exec }
    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, failing)

    expect(steps(report)).toEqual([['install', 'target', 'failed']])
    expect((await userRecord(t)).pluginClaims).toEqual([{ id: CS, enabled: true, origin: 'agent-plugins.yaml' }])
  })

  it('leaves the old Scope untouched while the new one has a conflict', async () => {
    const t = await setup({ 'agent-plugins.yaml': atTarget })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), atUser)
    const path = settingsPath('user', { cwd: t.cwd, homedir: t.homedir })
    await writeFile(path, JSON.stringify({ ...(await t.settings('user')), enabledPlugins: { [CS]: false } }))

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.conflicts).toEqual([expect.objectContaining({ name: CS, reason: 'manual-entry' })])
    expect(steps(report)).toEqual([])
    expect((await t.settings('project')).enabledPlugins).toEqual({ [CS]: true })
    expect(await t.lock()).toContain(CS)
  })

  it('leaves the old Scope untouched when installing at the new one fails', async () => {
    const t = await setup({ 'agent-plugins.yaml': atTarget })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), atUser)
    const failing = claudeAt(t.cwd, t.homedir, [CS])

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, { ...t.deps, exec: failing.exec })

    expect(steps(report)).toEqual([
      ['install', 'user', 'failed'],
      ['uninstall', 'target', 'failed'],
    ])
    expect(report.actions.at(-1)?.error).toBe(`"${CS}" is kept here until it is set up in user settings`)
    expect((await t.settings('project')).enabledPlugins).toEqual({ [CS]: true })
    expect(await t.lock()).toContain(CS)
  })

  it('leaves the user Scope untouched when installing back at the project fails', async () => {
    const t = await setup({ 'agent-plugins.yaml': atUser })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), atTarget)
    const failing = claudeAt(t.cwd, t.homedir, [CS])

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, { ...t.deps, exec: failing.exec })

    expect(steps(report)).toEqual([
      ['install', 'target', 'failed'],
      ['uninstall', 'user', 'failed'],
    ])
    expect(report.actions.at(-1)?.error).toBe(`"${CS}" is kept here until it is set up in project settings`)
    expect((await t.settings('user')).enabledPlugins).toEqual({ [CS]: true })
    const again = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    expect(steps(again)).toEqual([
      ['install', 'target', 'done'],
      ['uninstall', 'user', 'done'],
    ])
  })
})
