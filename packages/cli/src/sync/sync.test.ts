import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { fakeClaude } from './fake-claude.js'
import { sync, type SyncProgress } from './index.js'
import { makeTree } from './test-helpers.js'

const OFFICIAL = {
  name: 'claude-plugins-official',
  source: { source: 'github', repo: 'anthropics/claude-plugins-official' },
}
const FORK = { name: OFFICIAL.name, source: { source: 'git', url: 'https://example.com/fork.git' } }

async function setup(files: Record<string, string>, failOn?: string[]) {
  const cwd = await makeTree(files)
  const homedir = await makeTree({})
  const claude = fakeClaude({ cwd, homedir, marketplaces: { 'anthropics/claude-plugins-official': OFFICIAL, [FORK.source.url]: FORK }, failOn })
  const deps = {
    exec: claude.exec,
    fetch: async () => {
      throw new Error('offline')
    },
    homedir,
    defaultPresetsDir: join(cwd, 'default-presets'),
  }
  const read = async (path: string) => readFile(join(cwd, path), 'utf8').catch(() => undefined)
  const settings = async (path = '.claude/settings.json') => JSON.parse((await read(path)) ?? '{}')
  return { cwd, homedir, claude, deps, read, settings }
}

const CONFIG = `
kind: Config
metadata: { name: demo }
spec:
  marketplaces: [anthropics/claude-plugins-official]
`

describe('sync', () => {
  it('declares a marketplace in project settings through claude and records it in the lock', async () => {
    const t = await setup({ 'agent-plugins.yaml': CONFIG })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.inSync).toBe(true)
    expect(report.actions).toEqual([
      expect.objectContaining({ kind: 'add', name: 'claude-plugins-official', status: 'done' }),
    ])
    expect(t.claude.calls).toEqual([
      ['claude', 'plugin', 'marketplace', 'add', 'anthropics/claude-plugins-official', '--scope', 'project'],
    ])
    expect(await t.settings()).toEqual({ extraKnownMarketplaces: { 'claude-plugins-official': { source: OFFICIAL.source } } })
    expect(parse((await t.read('agent-plugins.lock'))!)).toEqual({
      marketplaces: [{ name: 'claude-plugins-official', source: OFFICIAL.source, origin: 'agent-plugins.yaml' }],
    })
  })
  it('only reports the plan in dry-run and check modes, without calling claude or writing files', async () => {
    const t = await setup({ 'agent-plugins.yaml': CONFIG })

    for (const mode of ['dry-run', 'check'] as const) {
      const report = await sync({ cwd: t.cwd, scope: 'project', mode }, t.deps)
      expect(report.inSync).toBe(false)
      expect(report.actions).toEqual([expect.objectContaining({ kind: 'add', status: 'planned' })])
    }
    expect(t.claude.calls).toEqual([])
    expect(await t.read('.claude/settings.json')).toBeUndefined()
    expect(await t.read('agent-plugins.lock')).toBeUndefined()
  })

  it('removes a marketplace it declared once it is dropped from the Config', async () => {
    const t = await setup({ 'agent-plugins.yaml': CONFIG })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await import('node:fs/promises').then((fs) =>
      fs.writeFile(join(t.cwd, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: demo }\nspec: {}\n'),
    )

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([expect.objectContaining({ kind: 'remove', name: 'claude-plugins-official', status: 'done' })])
    expect(await t.settings()).toEqual({ extraKnownMarketplaces: {} })
    expect(await t.read('agent-plugins.lock')).toBe('')
  })

  it('reports progress around each claude call while applying', async () => {
    const t = await setup({ 'agent-plugins.yaml': CONFIG })
    const events: string[] = []
    const onProgress = (e: SyncProgress) => events.push(`${e.phase} ${e.action.kind} ${'status' in e.action ? e.action.status : ''}`.trim())

    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, { ...t.deps, onProgress })
    await writeFile(join(t.cwd, '.claude/settings.json'), '{}')
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, { ...t.deps, onProgress })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'dry-run' }, { ...t.deps, onProgress })

    expect(events).toEqual(['start add', 'end add done', 'start readd', 'end readd done'])
  })

  it('is in sync on a second run', async () => {
    const t = await setup({ 'agent-plugins.yaml': CONFIG })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'check' }, t.deps)

    expect(report).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
  })
  it('restores a manual entry that claude overwrote while adding a shorthand declaration', async () => {
    const fork = { source: { source: 'git', url: 'https://example.com/fork.git' } }
    const t = await setup({
      'agent-plugins.yaml': CONFIG,
      '.claude/settings.json': JSON.stringify({ extraKnownMarketplaces: { 'claude-plugins-official': fork } }),
    })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.inSync).toBe(false)
    expect(report.actions).toEqual([expect.objectContaining({ kind: 'add', status: 'failed' })])
    expect(report.conflicts).toEqual([
      { name: 'claude-plugins-official', reason: 'manual-entry', detail: expect.stringContaining('--force') },
    ])
    expect(await t.settings()).toEqual({ extraKnownMarketplaces: { 'claude-plugins-official': fork } })
    expect(await t.claude.installed()).toEqual({ 'claude-plugins-official': fork })
    expect(await t.read('agent-plugins.lock')).toBeUndefined()
  })
  it('writes extra fields and keeps directory paths relative after claude adds the marketplace', async () => {
    const t = await setup({
      'agent-plugins.yaml': `
kind: Config
metadata: { name: demo }
spec:
  marketplaces:
    local-mk:
      source: { source: directory, path: ./local-mk }
      autoUpdate: true
`,
    })
    const claude = fakeClaude({
      cwd: t.cwd,
      homedir: t.homedir,
      marketplaces: { [join(t.cwd, 'local-mk')]: { name: 'local-mk', source: { source: 'directory', path: join(t.cwd, 'local-mk') } } },
    })

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, { ...t.deps, exec: claude.exec })

    expect(report.inSync).toBe(true)
    expect(await t.settings()).toEqual({
      extraKnownMarketplaces: { 'local-mk': { source: { source: 'directory', path: './local-mk' }, autoUpdate: true } },
    })
  })

  it('patches extra fields on an existing managed entry without calling claude', async () => {
    const t = await setup({ 'agent-plugins.yaml': CONFIG })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    await import('node:fs/promises').then((fs) =>
      fs.writeFile(
        join(t.cwd, 'agent-plugins.yaml'),
        `kind: Config
metadata: { name: demo }
spec:
  marketplaces:
    claude-plugins-official:
      source: { source: github, repo: anthropics/claude-plugins-official }
      autoUpdate: true
`,
      ),
    )
    t.claude.calls.length = 0

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([expect.objectContaining({ kind: 'patch', status: 'done' })])
    expect(t.claude.calls).toEqual([])
    expect(await t.settings()).toEqual({
      extraKnownMarketplaces: { 'claude-plugins-official': { source: OFFICIAL.source, autoUpdate: true } },
    })
  })
  it('keeps going when one marketplace fails and records only the ones that succeeded', async () => {
    const t = await setup(
      {
        'agent-plugins.yaml': `
kind: Config
metadata: { name: demo }
spec:
  marketplaces: [acme/broken, anthropics/claude-plugins-official]
`,
      },
      ['acme/broken'],
    )

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.inSync).toBe(false)
    expect(report.actions).toEqual([
      expect.objectContaining({ status: 'failed', error: 'failed to add acme/broken' }),
      expect.objectContaining({ name: 'claude-plugins-official', status: 'done' }),
    ])
    expect(parse((await t.read('agent-plugins.lock'))!).marketplaces.map((m: { name: string }) => m.name)).toEqual([
      'claude-plugins-official',
    ])
  })

  it('forgets a managed entry that is neither declared nor in settings any more', async () => {
    const t = await setup({ 'agent-plugins.yaml': CONFIG })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    const fs = await import('node:fs/promises')
    await fs.writeFile(join(t.cwd, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    await fs.writeFile(join(t.cwd, '.claude/settings.json'), '{}')

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
    expect(await t.read('agent-plugins.lock')).toBe('')
  })
  it('keeps local-scope ownership in an uncommitted state file', async () => {
    const t = await setup({ 'agent-plugins.yaml': CONFIG })

    await sync({ cwd: t.cwd, scope: 'local', mode: 'apply' }, t.deps)

    expect(await t.settings('.claude/settings.local.json')).toEqual({
      extraKnownMarketplaces: { 'claude-plugins-official': { source: OFFICIAL.source } },
    })
    expect(JSON.parse((await t.read('.agent-plugins/state.local.json'))!)).toEqual({
      marketplaces: [{ name: 'claude-plugins-official', source: OFFICIAL.source, origin: 'agent-plugins.yaml' }],
    })
    expect(await t.read('agent-plugins.lock')).toBeUndefined()
  })

  it('tracks user-scope ownership per Config, so another repo does not remove it', async () => {
    const a = await setup({ 'agent-plugins.yaml': CONFIG })
    const b = await makeTree({ 'agent-plugins.yaml': 'kind: Config\nmetadata: { name: other }\nspec: {}\n' })
    const bClaude = fakeClaude({ cwd: b, homedir: a.homedir, marketplaces: {} })

    await sync({ cwd: a.cwd, scope: 'user', mode: 'apply' }, a.deps)
    const report = await sync({ cwd: b, scope: 'user', mode: 'apply' }, { ...a.deps, exec: bClaude.exec })

    expect(report.actions).toEqual([])
    expect(JSON.parse(await readFile(join(a.homedir, '.claude/settings.json'), 'utf8'))).toEqual({
      extraKnownMarketplaces: { 'claude-plugins-official': { source: OFFICIAL.source } },
    })
    expect(Object.keys(JSON.parse(await readFile(join(a.homedir, '.agent-plugins/state.json'), 'utf8')))).toEqual([
      join(a.cwd, 'agent-plugins.yaml'),
    ])
  })
  it('keeps a user-scope marketplace while another repo still declares it, then hands it over', async () => {
    const fs = await import('node:fs/promises')
    const a = await setup({ 'agent-plugins.yaml': CONFIG })
    const b = await makeTree({ 'agent-plugins.yaml': CONFIG })
    const bDeps = { ...a.deps, exec: fakeClaude({ cwd: b, homedir: a.homedir, marketplaces: {} }).exec }
    const userSettings = async () => JSON.parse(await readFile(join(a.homedir, '.claude/settings.json'), 'utf8'))
    const drop = (cwd: string) => fs.writeFile(join(cwd, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: demo }\nspec: {}\n')

    await sync({ cwd: a.cwd, scope: 'user', mode: 'apply' }, a.deps)
    await sync({ cwd: b, scope: 'user', mode: 'apply' }, bDeps)
    await drop(a.cwd)
    const aReport = await sync({ cwd: a.cwd, scope: 'user', mode: 'apply' }, a.deps)

    expect(aReport.actions).toEqual([])
    expect(Object.keys((await userSettings()).extraKnownMarketplaces)).toEqual(['claude-plugins-official'])

    await drop(b)
    const bReport = await sync({ cwd: b, scope: 'user', mode: 'apply' }, bDeps)

    expect(bReport.actions).toEqual([expect.objectContaining({ kind: 'remove', name: 'claude-plugins-official', status: 'done' })])
    expect((await userSettings()).extraKnownMarketplaces).toEqual({})
  })

  it('refuses to fight another repo over a user-scope marketplace declared differently', async () => {
    const a = await setup({ 'agent-plugins.yaml': CONFIG })
    const b = await makeTree({
      'agent-plugins.yaml': `kind: Config
metadata: { name: other }
spec:
  marketplaces:
    claude-plugins-official:
      source: { source: github, repo: anthropics/claude-plugins-official }
      autoUpdate: true
`,
    })
    const bDeps = { ...a.deps, exec: fakeClaude({ cwd: b, homedir: a.homedir, marketplaces: {} }).exec }

    await sync({ cwd: a.cwd, scope: 'user', mode: 'apply' }, a.deps)
    const report = await sync({ cwd: b, scope: 'user', mode: 'apply', force: true }, bDeps)

    expect(report.inSync).toBe(false)
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'claude-plugins-official', reason: 'shared-clash' })])
    expect(JSON.parse(await readFile(join(a.homedir, '.claude/settings.json'), 'utf8'))).toEqual({
      extraKnownMarketplaces: { 'claude-plugins-official': { source: OFFICIAL.source } },
    })
  })

  describe('with a marketplace added by hand in user settings', () => {
    /** Như `claude plugin marketplace add <fork> --scope user`: khai báo ở user và bản cài chung trỏ vào fork. */
    async function withManualUserFork(config: string) {
      const t = await setup({ 'agent-plugins.yaml': config })
      await t.claude.exec('claude', ['plugin', 'marketplace', 'add', FORK.source.url, '--scope', 'user'])
      t.claude.calls.length = 0
      const userSettings = async () => JSON.parse(await readFile(join(t.homedir, '.claude/settings.json'), 'utf8'))
      return { ...t, userSettings }
    }

    it('refuses to declare the same name from another source in project scope, even with --force', async () => {
      const t = await withManualUserFork(`kind: Config
metadata: { name: demo }
spec:
  marketplaces:
    claude-plugins-official: { source: { source: github, repo: anthropics/claude-plugins-official } }
`)

      const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply', force: true }, t.deps)

      expect(report.conflicts).toEqual([
        { name: 'claude-plugins-official', reason: 'cross-scope', detail: expect.stringContaining('user settings') },
      ])
      expect(t.claude.calls).toEqual([])
      expect(await t.claude.installed()).toEqual({ 'claude-plugins-official': { source: FORK.source } })
    })

    it('restores the shared install when a shorthand declaration turns out to clash', async () => {
      const t = await withManualUserFork(CONFIG)

      const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

      expect(report.actions).toEqual([expect.objectContaining({ kind: 'add', status: 'failed' })])
      expect(report.conflicts).toEqual([expect.objectContaining({ name: 'claude-plugins-official', reason: 'cross-scope' })])
      expect(await t.settings()).toEqual({ extraKnownMarketplaces: {} })
      expect(await t.userSettings()).toEqual({ extraKnownMarketplaces: { 'claude-plugins-official': { source: FORK.source } } })
      expect(await t.claude.installed()).toEqual({ 'claude-plugins-official': { source: FORK.source } })
      expect(await t.read('agent-plugins.lock')).toBeUndefined()
    })

    it('shares it when the project declares the same source, and keeps it installed after the project drops it', async () => {
      const t = await withManualUserFork(`kind: Config
metadata: { name: demo }
spec:
  marketplaces:
    claude-plugins-official: { source: { source: git, url: "https://example.com/fork.git" } }
`)
      await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
      const fs = await import('node:fs/promises')
      await fs.writeFile(join(t.cwd, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: demo }\nspec: {}\n')

      const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

      expect(report.actions).toEqual([expect.objectContaining({ kind: 'remove', status: 'done' })])
      expect(await t.userSettings()).toEqual({ extraKnownMarketplaces: { 'claude-plugins-official': { source: FORK.source } } })
      expect(await t.claude.installed()).toEqual({ 'claude-plugins-official': { source: FORK.source } })
    })
  })

  it('keeps a managed entry installed while two presets clash over it', async () => {
    const preset = (name: string, repo: string) =>
      `kind: Preset\nmetadata: { name: ${name} }\nspec:\n  marketplaces:\n    claude-plugins-official: { source: { source: github, repo: ${repo} } }\n`
    const t = await setup({
      'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml]\n',
      'a.yaml': preset('a', 'anthropics/claude-plugins-official'),
      'b.yaml': preset('b', 'someone/fork'),
    })
    await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)
    const fs = await import('node:fs/promises')
    await fs.writeFile(join(t.cwd, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml, ./b.yaml]\n')

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'apply' }, t.deps)

    expect(report.actions).toEqual([])
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'claude-plugins-official', reason: 'preset-clash' })])
    expect(Object.keys((await t.settings()).extraKnownMarketplaces)).toEqual(['claude-plugins-official'])
    expect(parse((await t.read('agent-plugins.lock'))!).marketplaces).toHaveLength(1)
  })
  it('neither calls claude nor caches remote presets in dry-run, and reports override notices', async () => {
    const url = 'https://example.com/team.yaml'
    const t = await setup({
      'agent-plugins.yaml': `kind: Config\nmetadata: { name: demo }\nspec:\n  presets: ["${url}"]\n  marketplaces:\n    m: { source: { source: git, url: "https://x/mine.git" } }\n`,
    })
    const fetch = async () => 'kind: Preset\nmetadata: { name: team }\nspec:\n  marketplaces:\n    m: { source: { source: git, url: "https://x/m.git" } }\n'

    const report = await sync({ cwd: t.cwd, scope: 'project', mode: 'dry-run' }, { ...t.deps, fetch })

    expect(report.notices).toEqual([`agent-plugins.yaml overrides "m" declared by ${url}`])
    expect(t.claude.calls).toEqual([])
    const fs = await import('node:fs/promises')
    await expect(fs.stat(join(t.cwd, '.agent-plugins'))).rejects.toThrow()
  })
})
