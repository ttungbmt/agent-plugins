import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { fakeClaude } from './fake-claude.js'
import { sync, type SyncMode } from './index.js'
import { makeTree } from './test-helpers.js'
import type { ItemSource, Scope } from './types.js'

const REPO = 'acme/flows'
const SOURCE = { source: 'github', repo: REPO }

const script = (name: string, body = `await agent('${name}')`) => `export const meta = { name: '${name}', description: '${name}' }\n${body}\n`

/** Nguồn kiểu communitytools: script có `meta.name` khác tên file, kèm các file không phải Workflow. */
const FLOWS = {
  'workflows/review.js': script('code-review'),
  'workflows/audit.js': script('audit'),
  'workflows/README.md': '# How to install\n',
  'workflows/audit.test.js': script('audit-test'),
  'workflows/_template.js': script('template'),
  'workflows/lib/helpers.js': script('helpers'),
  'workflows/no-meta.js': `await agent('x')\n`,
  'workflows/ci.yml': 'on: push\n',
  '.claude/workflows/own.js': script('own'),
}

function config(workflows: string) {
  return `kind: Config\nmetadata: { name: demo }\nspec:\n  workflows: ${workflows}\n`
}

/** Nguồn giả: mỗi repo là một chuỗi commit; tải không có commit thì lấy commit mới nhất. */
async function fakeSources(initial: Record<string, Record<string, string>>) {
  const history: Record<string, { commit: string; dir: string }[]> = {}
  for (const [repo, files] of Object.entries(initial)) history[repo] = [{ commit: `${repo.replace('/', '-')}-1`, dir: await makeTree(files) }]
  return async (source: ItemSource, commit: string | null) => {
    const versions = history[source.repo as string]
    if (!versions) throw new Error(`repository ${source.repo} not found`)
    const version = commit ? versions.find((v) => v.commit === commit) : versions.at(-1)
    if (!version) throw new Error(`commit ${commit} not found`)
    return { dir: version.dir, commit: version.commit, cleanup: async () => {} }
  }
}

async function setup(files: Record<string, string>, repos: Record<string, Record<string, string>> = { [REPO]: FLOWS }) {
  const cwd = await makeTree(files)
  const homedir = await makeTree({})
  const fetchSource = await fakeSources(repos)
  const claude = fakeClaude({ cwd, homedir, marketplaces: {} })
  const deps = {
    exec: claude.exec,
    fetch: async () => {
      throw new Error('offline')
    },
    homedir,
    defaultPresetsDir: join(cwd, 'default-presets'),
    fetchSkillSource: (source: ItemSource, commit: string | null) =>
      source.source === 'directory'
        ? Promise.resolve({ dir: resolve(cwd, source.path as string), commit: null, cleanup: async () => {} })
        : fetchSource(source, commit),
  }
  const run = (mode: SyncMode = 'apply', extra: { scope?: Scope } = {}) => sync({ cwd, scope: extra.scope ?? 'project', mode }, deps)
  const read = async (path: string) => readFile(join(cwd, path), 'utf8').catch(() => undefined)
  const lock = async () => parse((await read('agent-plugins.lock')) ?? '') ?? {}
  const files_ = async (dir = join(cwd, '.claude/workflows')) => (await readdir(dir).catch(() => [])).sort()
  const setConfig = (text: string) => writeFile(join(cwd, 'agent-plugins.yaml'), text)
  return { cwd, homedir, run, read, lock, files: files_, setConfig }
}

const act = (kind: string, name: string | null, status = 'done') => expect.objectContaining({ target: 'workflow', kind, name, status })

describe('sync workflows', () => {
  it('copies every workflow of a bare source flat, as <meta.name>.js', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    const report = await t.run()

    expect(report).toMatchObject({ conflicts: [], inSync: true })
    expect(report.actions).toEqual([act('install', 'audit'), act('install', 'code-review')])
    expect(await t.files()).toEqual(['audit.js', 'code-review.js'])
    expect(await t.read('.claude/workflows/code-review.js')).toBe(FLOWS['workflows/review.js'])
    const lock = await t.lock()
    expect(lock.workflowSources).toEqual([{ source: SOURCE, commit: 'acme-flows-1', workflows: ['audit', 'code-review'] }])
    expect(lock.workflows.map((w: { name: string }) => w.name)).toEqual(['audit', 'code-review'])
    expect(lock.workflows[0]).toMatchObject({ source: SOURCE, origin: 'agent-plugins.yaml', sha256: expect.any(String) })
    expect(await t.run('check')).toMatchObject({ actions: [], inSync: true })
  })

  it('never writes Workflow permissions into settings', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    expect((await t.read('.claude/settings.json')) ?? '').not.toMatch(/Workflow/)
  })

  it('refuses a source without workflows/ unless `path` points at them', async () => {
    const repo = { '.claude/workflows/safe-pr.js': script('safe-pr'), '.claude/workflows/lib/x.mjs': 'export {}\n' }
    const t = await setup({ 'agent-plugins.yaml': config('[acme/tools]') }, { 'acme/tools': repo })

    const report = await t.run()

    expect(report.inSync).toBe(false)
    expect(report.actions).toEqual([expect.objectContaining({ target: 'workflow', kind: 'fetch', status: 'failed', error: expect.stringContaining('`path`') })])
    expect(await t.files()).toEqual([])

    await t.setConfig(config('[{ source: acme/tools, path: .claude/workflows }]'))
    expect((await t.run()).actions).toEqual([act('install', 'safe-pr')])
    expect(await t.files()).toEqual(['safe-pr.js'])
  })

  it('fails a source whose scripts share a meta.name', async () => {
    const repo = { 'workflows/a.js': script('same'), 'workflows/b.js': script('same') }
    const t = await setup({ 'agent-plugins.yaml': config('[acme/dup]') }, { 'acme/dup': repo })

    const report = await t.run()

    expect(report.actions).toEqual([expect.objectContaining({ target: 'workflow', kind: 'fetch', status: 'failed', error: expect.stringContaining('same') })])
    expect(await t.files()).toEqual([])
  })

  it('reads a local directory source as its workflows folder', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('[./team-flows]'), 'team-flows/ship.js': script('ship') })
    expect((await t.run()).actions).toEqual([act('install', 'ship')])
    expect(await t.files()).toEqual(['ship.js'])
  })

  it('removes workflows no longer declared and leaves user files alone', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`), '.claude/workflows/mine.js': script('mine') })
    await t.run()

    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    const report = await t.run()

    expect(report.actions).toEqual([act('remove', 'audit'), act('remove', 'code-review')])
    expect(await t.files()).toEqual(['mine.js'])
  })

  it('skips local scope with a notice and installs user scope into the Claude config dir', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    const local = await t.run('apply', { scope: 'local' })
    expect(local.notices).toEqual(expect.arrayContaining([expect.stringContaining('workflows are not synced in local scope')]))
    expect(await t.files()).toEqual([])

    await t.run('apply', { scope: 'user' })
    expect(await t.files(join(t.homedir, '.claude/workflows'))).toEqual(['audit.js', 'code-review.js'])
  })
})
