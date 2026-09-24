import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { fakeClaude } from './fake-claude.js'
import { claudeJsonPath, readJson } from './files.js'
import { sync, type SyncMode } from './index.js'
import { makeTree } from './test-helpers.js'
import type { Scope } from './types.js'

const FIRECRAWL = { command: 'npx', args: ['-y', 'firecrawl-mcp@3.25.3'], env: { FIRECRAWL_API_KEY: '${FIRECRAWL_API_KEY}' } }
const CATALOG = `kind: McpCatalog
servers:
  firecrawl:
    description: Firecrawl web scraping.
    command: npx
    args: [-y, firecrawl-mcp@3.25.3]
    env: { FIRECRAWL_API_KEY: "\${FIRECRAWL_API_KEY}" }
`

function config(mcpServers: string, presets = '') {
  return `kind: Config\nmetadata: { name: demo }\nspec:${presets}\n  mcpServers: ${mcpServers}\n`
}

async function setup(files: Record<string, string>, opts: { env?: Record<string, string>; homedir?: string; failOn?: string[] } = {}) {
  const cwd = await makeTree({ 'default-presets/mcp-servers.yaml': CATALOG, ...files })
  const homedir = opts.homedir ?? (await makeTree({}))
  const claude = fakeClaude({ cwd, homedir, marketplaces: { 'acme/official': { name: 'official', source: { source: 'github', repo: 'acme/official' } } }, failOn: opts.failOn })
  const deps = {
    exec: claude.exec,
    fetch: async () => {
      throw new Error('offline')
    },
    homedir,
    defaultPresetsDir: join(cwd, 'default-presets'),
    env: opts.env ?? { FIRECRAWL_API_KEY: 'set' },
  }
  const run = (mode: SyncMode = 'apply', extra: { force?: boolean; scope?: Scope } = {}) =>
    sync({ cwd, scope: extra.scope ?? 'project', mode, force: extra.force }, deps)
  const read = async (path: string) => readFile(join(cwd, path), 'utf8').catch(() => undefined)
  const mcpJson = async () => JSON.parse((await read('.mcp.json')) ?? '{}').mcpServers
  const claudeJson = () => readJson<Record<string, any>>(claudeJsonPath({ cwd, homedir }))
  const lock = async () => parse((await read('agent-plugins.lock')) ?? '') ?? {}
  const setConfig = (text: string) => writeFile(join(cwd, 'agent-plugins.yaml'), text)
  const mcpCalls = () => claude.calls.filter((c) => c[1] === 'mcp')
  return { cwd, homedir, claude, run, read, mcpJson, claudeJson, lock, setConfig, mcpCalls }
}

const mcp = (kind: string, name: string, status = 'done') => expect.objectContaining({ target: 'mcp', kind, name, status })

describe('sync mcp servers', () => {
  it('adds an inline server with `claude mcp add-json` and records it in the lock', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`{ docs: { type: http, url: "https://example.com/mcp" } }`) })

    const report = await t.run()

    expect(report.actions).toEqual([mcp('add', 'docs')])
    expect(t.mcpCalls()).toEqual([
      ['claude', 'mcp', 'add-json', 'docs', JSON.stringify({ type: 'http', url: 'https://example.com/mcp' }), '--scope', 'project'],
    ])
    expect(await t.mcpJson()).toEqual({ docs: { type: 'http', url: 'https://example.com/mcp' } })
    expect((await t.lock()).mcpServers).toEqual([
      { name: 'docs', server: { type: 'http', url: 'https://example.com/mcp' }, origin: 'agent-plugins.yaml' },
    ])
    expect(await t.run('check')).toEqual({ actions: [], conflicts: [], notices: [expect.stringContaining('approve')], inSync: true })
  })

  it('takes `true` from the ap catalog without its description and rejects names the catalog does not have', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ firecrawl: true }') })

    expect((await t.run()).actions).toEqual([mcp('add', 'firecrawl')])
    expect(await t.mcpJson()).toEqual({ firecrawl: FIRECRAWL })

    await t.setConfig(config('{ nope: true }'))
    await expect(t.run('dry-run')).rejects.toThrow('MCP server "nope" is not in the ap catalog')
  })

  it('replaces a changed server with remove then add-json, and removes one no longer declared', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp } }') })
    await t.run()

    await t.setConfig(config('{ docs: { command: docs-mcp, args: [--verbose] } }'))
    expect((await t.run()).actions).toEqual([mcp('update', 'docs')])
    expect(t.mcpCalls().slice(-2).map((c) => c.slice(0, 4))).toEqual([
      ['claude', 'mcp', 'remove', 'docs'],
      ['claude', 'mcp', 'add-json', 'docs'],
    ])
    expect(await t.mcpJson()).toEqual({ docs: { command: 'docs-mcp', args: ['--verbose'] } })

    await t.setConfig(config('{}'))
    expect((await t.run()).actions).toEqual([mcp('remove', 'docs')])
    expect(await t.mcpJson()).toEqual({})
    expect((await t.lock()).mcpServers).toBeUndefined()
  })

  it('treats `type: stdio` and empty fields as the same server, so a written server stays in sync', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { type: stdio, command: docs-mcp, args: [], env: {} } }') })
    await t.run()

    expect(await t.mcpJson()).toEqual({ docs: { command: 'docs-mcp' } })
    expect((await t.run('check')).inSync).toBe(true)
  })

  it('leaves a manual server with a different configuration alone unless --force, and adopts one that matches', async () => {
    const t = await setup({
      'agent-plugins.yaml': config('{ docs: { command: docs-mcp }, other: { command: other-mcp } }'),
      '.mcp.json': JSON.stringify({ mcpServers: { docs: { command: 'hand-made' }, other: { type: 'stdio', command: 'other-mcp' } } }),
    })

    const report = await t.run()
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'docs', reason: 'manual-entry' })])
    expect(report.actions).toEqual([])
    expect(report.notices).toContain('ap now manages MCP server "other", which was set up by hand')
    expect((await t.lock()).mcpServers.map((m: { name: string }) => m.name)).toEqual(['other'])

    expect((await t.run('apply', { force: true })).actions).toEqual([mcp('update', 'docs')])
    expect((await t.mcpJson()).docs).toEqual({ command: 'docs-mcp' })
  })

  it('lets a child preset drop or replace an inherited server, and reports peers that disagree', async () => {
    const preset = (name: string, body: string, parent = '') =>
      `kind: Preset\nmetadata: { name: ${name} }\nspec:${parent ? `\n  extends: ./${parent}.yaml` : ''}\n  mcpServers: ${body}\n`
    const t = await setup({
      'parent.yaml': preset('parent', '{ firecrawl: { command: my-firecrawl }, docs: { command: docs-mcp } }'),
      'child.yaml': preset('child', '{ firecrawl: true, docs: false }', 'parent'),
      'agent-plugins.yaml': config('{}', '\n  presets: [./child.yaml]'),
    })

    const report = await t.run()
    expect(report.actions).toEqual([mcp('add', 'firecrawl')])
    expect(await t.mcpJson()).toEqual({ firecrawl: FIRECRAWL })
    expect(report.notices).toContain('child.yaml overrides MCP server "firecrawl" declared by parent.yaml')

    await t.setConfig(config('{}', '\n  presets: [./child.yaml, ./parent.yaml, ./peer.yaml]'))
    await writeFile(join(t.cwd, 'peer.yaml'), preset('peer', '{ firecrawl: { command: other } }'))
    const clash = await t.run()
    expect(clash.conflicts).toEqual([expect.objectContaining({ name: 'firecrawl', reason: 'preset-clash' })])
    expect(clash.actions).toEqual([])
    expect(await t.mcpJson()).toEqual({ firecrawl: FIRECRAWL })
  })

  it('rejects a literal secret and warns about placeholders not set in the environment', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ gh: { type: http, url: "https://x", headers: { Authorization: "Bearer abc" } } }') })
    await expect(t.run('dry-run')).rejects.toThrow('headers.Authorization of MCP server "gh" looks like a secret')

    await t.setConfig(config('{ firecrawl: true, gh: { type: http, url: "https://x", headers: { Authorization: "Bearer ${GH_TOKEN:-none}" } } }'))
    const unset = await setup({ 'agent-plugins.yaml': config('{ firecrawl: true }') }, { env: {} })
    expect((await unset.run('dry-run')).notices).toContain(
      'MCP server "firecrawl" uses ${FIRECRAWL_API_KEY}, which is not set in this environment',
    )
    expect((await t.run('dry-run')).notices.filter((n) => n.includes('not set'))).toEqual([])
  })

  it('writes local and user scope servers into .claude.json', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp } }') })

    await t.run('apply', { scope: 'local' })
    await t.run('apply', { scope: 'user' })

    const claudeJson = await t.claudeJson()
    expect(claudeJson.projects[t.cwd].mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
    expect(claudeJson.mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
    expect(await t.mcpJson()).toBeUndefined()
    expect((await t.run('check', { scope: 'user' })).inSync).toBe(true)
  })

  it('keeps a user-scope server another Config still declares, and clashes when it declares it differently', async () => {
    const homedir = await makeTree({})
    const a = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp } }') }, { homedir })
    const b = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp } }') }, { homedir })
    await a.run('apply', { scope: 'user' })
    await b.run('apply', { scope: 'user' })

    await a.setConfig(config('{}'))
    expect((await a.run('apply', { scope: 'user' })).actions).toEqual([])
    expect((await a.claudeJson()).mcpServers).toEqual({ docs: { command: 'docs-mcp' } })

    await b.setConfig(config('{ docs: { command: other } }'))
    await a.setConfig(config('{ docs: { command: docs-mcp } }'))
    await b.run('apply', { scope: 'user', force: true })
    expect((await a.run('dry-run', { scope: 'user' })).conflicts).toEqual([expect.objectContaining({ name: 'docs', reason: 'shared-clash' })])
  })

  it('warns when a declared server has the name of an MCP server an enabled plugin ships', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ context7: { type: http, url: "https://mcp.context7.com/mcp" } }') })
    const installPath = join(t.homedir, 'plugin-c7')
    await writeFile(join(t.cwd, 'agent-plugins.yaml'), config('{ context7: { type: http, url: "https://mcp.context7.com/mcp" } }'))
    await makeFile(join(installPath, '.mcp.json'), { context7: { type: 'http', url: 'https://mcp.context7.com/mcp' } })
    await makeFile(join(t.cwd, '.claude/settings.json'), { enabledPlugins: { 'context7@official': true } })
    await makeFile(join(t.homedir, '.claude/plugins/installed_plugins.json'), {
      plugins: { 'context7@official': [{ scope: 'project', projectPath: t.cwd, installPath }] },
    })

    expect((await t.run('dry-run')).notices).toContain(
      'MCP server "context7" has the same name as one plugin context7 provides (plugin:context7:context7); both will run',
    )
  })

  it('stops listing project servers as pending once the user approves them', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp } }') })
    expect((await t.run()).notices).toEqual([
      'approve MCP servers "docs" in Claude Code: servers in .mcp.json stay pending until approved, and ap does not approve them',
    ])

    await makeFile(join(t.cwd, '.claude/settings.local.json'), { enabledMcpjsonServers: ['docs'] })
    expect((await t.run('check')).notices).toEqual([])
  })

  it('does not hold back a marketplace because an MCP server of the same name clashes', async () => {
    const preset = (name: string, body: string) => `kind: Preset\nmetadata: { name: ${name} }\nspec:\n  mcpServers: ${body}\n`
    const withMarketplace = `\n  marketplaces:\n    official:\n      source: { source: github, repo: acme/official }`
    const t = await setup({
      'a.yaml': preset('a', '{ official: { command: a } }'),
      'b.yaml': preset('b', '{ official: { command: b } }'),
      'agent-plugins.yaml': `kind: Config\nmetadata: { name: demo }\nspec:${withMarketplace}\n`,
    })
    await t.run()

    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml, ./b.yaml]\n')
    const report = await t.run('dry-run')

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'official', reason: 'preset-clash' })])
    expect(report.actions).toEqual([expect.objectContaining({ target: 'marketplace', kind: 'remove', name: 'official' })])
  })

  it('does not list a server whose add failed as pending approval', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp }, bad: { command: bad } }') }, { failOn: ['bad'] })

    const report = await t.run()

    expect(report.actions).toContainEqual(mcp('add', 'bad', 'failed'))
    expect(report.notices.filter((n) => n.startsWith('approve'))).toEqual([
      'approve MCP servers "docs" in Claude Code: servers in .mcp.json stay pending until approved, and ap does not approve them',
    ])
  })

  it('reports a broken ap catalog instead of calling every name unknown', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ firecrawl: true }'), 'default-presets/mcp-servers.yaml': 'servers: [' })

    await expect(t.run('dry-run')).rejects.toThrow('mcp-servers.yaml')
  })

  it('reads plugin MCP servers from a file that plugin.json points to', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ search: { command: search-mcp } }') })
    const installPath = join(t.homedir, 'plugin-s')
    await makeFile(join(installPath, '.claude-plugin/plugin.json'), { name: 's', mcpServers: './servers.json' })
    await makeFile(join(installPath, 'servers.json'), { mcpServers: { search: { command: 'x' } } })
    await makeFile(join(t.cwd, '.claude/settings.json'), { enabledPlugins: { 's@m': true } })
    await makeFile(join(t.homedir, '.claude/plugins/installed_plugins.json'), {
      plugins: { 's@m': [{ scope: 'project', projectPath: t.cwd, installPath }] },
    })

    expect((await t.run('dry-run')).notices).toContain('MCP server "search" has the same name as one plugin s provides (plugin:s:search); both will run')
  })

  it('reads an empty .mcp.json as having no servers', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ firecrawl: true }'), '.mcp.json': '' })

    expect((await t.run('dry-run')).actions).toEqual([mcp('add', 'firecrawl', 'planned')])
  })

  it('plans without calling claude on dry-run', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ firecrawl: true }') })

    const report = await t.run('dry-run')

    expect(report.actions).toEqual([mcp('add', 'firecrawl', 'planned')])
    expect(t.mcpCalls()).toEqual([])
    expect(await t.mcpJson()).toBeUndefined()
  })
})

async function makeFile(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value))
}

/** User-scoped MCP servers (ADR 0014): synced to the `user` Scope whatever Scope the Sync targets. */
describe('a User-scoped MCP server', () => {
  const userMcp = (kind: string, name: string, status = 'done') => expect.objectContaining({ target: 'mcp', kind, name, status, scope: 'user' })
  const userAdd = (name: string, server: object) => ['claude', 'mcp', 'add-json', name, JSON.stringify(server), '--scope', 'user']

  it('is added to user settings by a project Sync, not to .mcp.json or the Lock', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ firecrawl: { scope: user } }') })

    const report = await t.run()

    expect(report.conflicts).toEqual([])
    expect(report.actions).toEqual([userMcp('add', 'firecrawl')])
    expect(t.mcpCalls()).toEqual([userAdd('firecrawl', FIRECRAWL)])
    expect((await t.claudeJson()).mcpServers).toEqual({ firecrawl: FIRECRAWL })
    expect(await t.mcpJson()).toBeUndefined()
    expect(JSON.stringify(await t.lock())).not.toContain('firecrawl')
    expect(report.notices.filter((n) => n.includes('approve'))).toEqual([])
    expect((await t.run('check')).inSync).toBe(true)
  })

  it('strips `scope` from an inline server before writing it', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user } }') })

    await t.run()

    expect(t.mcpCalls()).toEqual([userAdd('docs', { command: 'docs-mcp' })])
  })

  it('is added to user settings by a local Sync', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user } }') })

    await t.run('apply', { scope: 'local' })

    const claudeJson = await t.claudeJson()
    expect(claudeJson.mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
    expect(claudeJson.projects?.[t.cwd]?.mcpServers).toBeUndefined()
  })

  it('is an ordinary declaration in a user Sync', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user } }') })

    const report = await t.run('apply', { scope: 'user' })

    expect(report.actions).toEqual([mcp('add', 'docs')])
    expect(report.actions[0]).not.toHaveProperty('scope')
    expect((await t.claudeJson()).mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
  })

  it('is planned with its Scope in dry-run and check, without calling claude', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user }, here: { command: here-mcp } }') })

    const dry = await t.run('dry-run')
    const check = await t.run('check')

    expect(dry.actions).toEqual([userMcp('add', 'docs', 'planned'), mcp('add', 'here', 'planned')])
    expect(dry.actions[1]).not.toHaveProperty('scope')
    expect(check.inSync).toBe(false)
    expect(t.claude.calls).toEqual([])
  })

  it('reports drift in user settings on check', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user } }') })
    await t.run()
    const path = claudeJsonPath({ cwd: t.cwd, homedir: t.homedir })
    const json = await t.claudeJson()
    await writeFile(path, JSON.stringify({ ...json, mcpServers: { docs: { command: 'edited' } } }))

    const check = await t.run('check')

    expect(check.inSync).toBe(false)
    expect(check.actions).toEqual([userMcp('update', 'docs', 'planned')])
  })

  it('is removed from user settings once no Config declares it', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user } }') })
    await t.run()
    await t.setConfig(config('{}'))

    const report = await t.run()

    expect(report.actions).toEqual([userMcp('remove', 'docs')])
    expect((await t.claudeJson()).mcpServers).toEqual({})
  })

  it('stays in user settings while another Config declares it, with a hint to turn it off here', async () => {
    const homedir = await makeTree({})
    const a = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user } }') }, { homedir })
    const b = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user } }') }, { homedir })
    await a.run()
    await b.run()
    await a.setConfig(config('{ docs: false }'))

    const report = await a.run()

    expect(report.actions).toEqual([])
    expect((await a.claudeJson()).mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
    expect(report.notices).toContain('MCP server "docs" stays in user settings because another Config declares it; turn it off for this repo with /mcp in Claude Code')
    await b.setConfig(config('{}'))
    expect((await b.run()).actions).toEqual([userMcp('remove', 'docs')])
  })

  it('clashes with another Config declaring it differently at the user Scope', async () => {
    const homedir = await makeTree({})
    const a = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user } }') }, { homedir })
    const b = await setup({ 'agent-plugins.yaml': config('{ docs: { command: other, scope: user } }') }, { homedir })
    await a.run()

    const report = await b.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'docs', reason: 'shared-clash' })])
    expect((await b.claudeJson()).mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
  })

  it('adopts a matching Manual entry in user settings and conflicts with a different one unless forced', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('{ docs: { command: docs-mcp, scope: user }, other: { command: mine, scope: user } }') })
    const path = claudeJsonPath({ cwd: t.cwd, homedir: t.homedir })
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify({ mcpServers: { docs: { command: 'docs-mcp' }, other: { command: 'theirs' } } }))

    const report = await t.run()
    const forced = await t.run('apply', { force: true })

    expect(report.notices).toContain('ap now manages MCP server "docs", which was set up by hand')
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'other', reason: 'manual-entry' })])
    expect(forced.actions).toEqual([userMcp('update', 'other')])
    expect((await t.run('check')).inSync).toBe(true)
  })
})

describe('moving an MCP server between the targeted Scope and user', () => {
  const userMcp = (kind: string, name: string, status = 'done') => expect.objectContaining({ target: 'mcp', kind, name, status, scope: 'user' })
  const calls = (t: { mcpCalls: () => string[][] }) => t.mcpCalls().map((c) => [c[2], c.at(-1)])
  const atUser = config('{ docs: { command: docs-mcp, scope: user } }')
  const atTarget = config('{ docs: { command: docs-mcp } }')
  /** Syncs `t` with a `claude` whose MCP commands for `docs` fail. */
  const failingRun = (t: { cwd: string; homedir: string }) =>
    sync(
      { cwd: t.cwd, scope: 'project', mode: 'apply' },
      {
        exec: fakeClaude({ cwd: t.cwd, homedir: t.homedir, marketplaces: {}, failOn: ['docs'] }).exec,
        fetch: async () => {
          throw new Error('offline')
        },
        homedir: t.homedir,
        defaultPresetsDir: join(t.cwd, 'default-presets'),
        env: {},
      },
    )
  const userRecord = async (t: { cwd: string; homedir: string }) =>
    (await readJson<Record<string, any>>(join(t.homedir, '.agent-plugins/state.json')))[`${join(t.cwd, 'agent-plugins.yaml')}#project`]

  it('adds a project server to user settings first, then removes it from .mcp.json and the Lock', async () => {
    const t = await setup({ 'agent-plugins.yaml': atTarget })
    await t.run()
    t.claude.calls.length = 0
    await t.setConfig(atUser)

    const report = await t.run()

    expect(report.actions).toEqual([userMcp('add', 'docs'), mcp('remove', 'docs')])
    expect(calls(t)).toEqual([['add-json', 'user'], ['remove', 'project']])
    expect((await t.claudeJson()).mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
    expect(await t.mcpJson()).toEqual({})
    expect(JSON.stringify(await t.lock())).not.toContain('docs')
    expect((await t.run('check')).inSync).toBe(true)
  })

  it('adds a User-scoped server back to .mcp.json first, then removes it from user settings', async () => {
    const t = await setup({ 'agent-plugins.yaml': atUser })
    await t.run()
    t.claude.calls.length = 0
    await t.setConfig(atTarget)

    const report = await t.run()

    expect(calls(t)).toEqual([['add-json', 'project'], ['remove', 'user']])
    expect(report.conflicts).toEqual([])
    expect(await t.mcpJson()).toEqual({ docs: { command: 'docs-mcp' } })
    expect((await t.claudeJson()).mcpServers).toEqual({})
    expect((await t.run('check')).inSync).toBe(true)
  })

  it('only drops its user claim when moving back while another Config still declares it', async () => {
    const homedir = await makeTree({})
    const a = await setup({ 'agent-plugins.yaml': atUser }, { homedir })
    const b = await setup({ 'agent-plugins.yaml': atUser }, { homedir })
    await a.run()
    await b.run()
    await a.setConfig(atTarget)

    await a.run()

    expect(await a.mcpJson()).toEqual({ docs: { command: 'docs-mcp' } })
    expect((await a.claudeJson()).mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
    await b.setConfig(config('{}'))
    expect((await b.run()).actions).toEqual([userMcp('remove', 'docs')])
  })

  it('leaves .mcp.json and the Lock untouched when adding to user settings fails', async () => {
    const t = await setup({ 'agent-plugins.yaml': atTarget })
    await t.run()
    await t.setConfig(atUser)

    const report = await failingRun(t)

    expect(report.actions).toEqual([userMcp('add', 'docs', 'failed'), mcp('remove', 'docs', 'failed')])
    expect(report.actions[1]!.error).toBe('"docs" is kept here until it is set up in user settings')
    expect(await t.mcpJson()).toEqual({ docs: { command: 'docs-mcp' } })
    expect(JSON.stringify(await t.lock())).toContain('docs')
  })

  it('leaves .mcp.json untouched while user settings have a conflicting Manual entry', async () => {
    const t = await setup({ 'agent-plugins.yaml': atTarget })
    await t.run()
    const path = claudeJsonPath({ cwd: t.cwd, homedir: t.homedir })
    await writeFile(path, JSON.stringify({ ...(await t.claudeJson()), mcpServers: { docs: { command: 'theirs' } } }))
    await t.setConfig(atUser)
    t.claude.calls.length = 0

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'docs', reason: 'manual-entry' })])
    expect(t.mcpCalls()).toEqual([])
    expect(await t.mcpJson()).toEqual({ docs: { command: 'docs-mcp' } })
  })

  it('leaves user settings and its user claim untouched when adding back to .mcp.json fails', async () => {
    const homedir = await makeTree({})
    const t = await setup({ 'agent-plugins.yaml': atUser }, { homedir })
    const other = await setup({ 'agent-plugins.yaml': atUser }, { homedir })
    await t.run()
    await other.run()
    await t.setConfig(atTarget)

    const report = await failingRun(t)

    expect(report.actions).toEqual([mcp('add', 'docs', 'failed')])
    expect((await t.claudeJson()).mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
    expect((await userRecord(t)).mcpClaims).toEqual([{ name: 'docs', server: { command: 'docs-mcp' }, origin: 'agent-plugins.yaml' }])
  })

  it('leaves the user Scope untouched when adding back to .mcp.json fails', async () => {
    const t = await setup({ 'agent-plugins.yaml': atUser })
    await t.run()
    await t.setConfig(atTarget)

    const report = await failingRun(t)

    expect(report.actions).toEqual([mcp('add', 'docs', 'failed'), userMcp('remove', 'docs', 'failed')])
    expect((await t.claudeJson()).mcpServers).toEqual({ docs: { command: 'docs-mcp' } })
    expect((await t.run('check')).inSync).toBe(false)
  })
})
