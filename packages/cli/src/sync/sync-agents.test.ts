import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { findAgents } from './agents.js'
import { fakeClaude } from './fake-claude.js'
import { sync, type SyncMode } from './index.js'
import { makeTree } from './test-helpers.js'
import type { ItemSource, Scope } from './types.js'

const REPO = 'acme/ecc'

const agent = (name: string, body = `${name} v1`, file = name) => ({
  [`agents/${file}.md`]: `---\nname: ${name}\ndescription: ${name} agent\n---\n${body}\n`,
})

function config(agents: string, skills = '') {
  return `kind: Config\nmetadata: { name: demo }\nspec:\n  agents: ${agents}\n${skills ? `  skills: ${skills}\n` : ''}`
}

/** Nguồn giả: mỗi repo là một chuỗi commit, `publish` thêm commit mới; tải không có commit thì lấy commit mới nhất. */
async function fakeSources(initial: Record<string, Record<string, string>>) {
  const history: Record<string, { commit: string; dir: string }[]> = {}
  const calls: [string, string | null][] = []
  async function publish(repo: string, files: Record<string, string>) {
    const versions = (history[repo] ??= [])
    versions.push({ commit: `${repo.replace('/', '-')}-${versions.length + 1}`, dir: await makeTree(files) })
  }
  for (const [repo, files] of Object.entries(initial)) await publish(repo, files)
  const fetch = async (source: ItemSource, commit: string | null) => {
    const repo = source.repo as string
    calls.push([repo, commit])
    const versions = history[repo]
    if (!versions) throw new Error(`repository ${repo} not found`)
    const version = commit ? versions.find((v) => v.commit === commit) : versions.at(-1)
    if (!version) throw new Error(`commit ${commit} not found`)
    return { dir: version.dir, commit: version.commit, cleanup: async () => {} }
  }
  return { fetch, publish, calls }
}

async function setup(
  files: Record<string, string>,
  repos: Record<string, Record<string, string>> = {
    [REPO]: { ...agent('typescript-reviewer'), ...agent('planner'), 'README.md': '# ECC\n' },
  },
) {
  const cwd = await makeTree(files)
  const homedir = await makeTree({})
  const sources = await fakeSources(repos)
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
        : sources.fetch(source, commit),
  }
  const run = (mode: SyncMode = 'apply', extra: { force?: boolean; update?: boolean; scope?: Scope } = {}) =>
    sync({ cwd, scope: extra.scope ?? 'project', mode, force: extra.force, update: extra.update }, deps)
  const read = async (path: string) => readFile(join(cwd, path), 'utf8').catch(() => undefined)
  const lock = async () => parse((await read('agent-plugins.lock')) ?? '') ?? {}
  const installed = async (dir = join(cwd, '.claude/agents')) => (await readdir(dir).catch(() => [])).sort()
  const setConfig = (text: string) => writeFile(join(cwd, 'agent-plugins.yaml'), text)
  return { cwd, homedir, sources, run, read, lock, installed, setConfig }
}

const act = (kind: string, name: string | null, status = 'done') => expect.objectContaining({ target: 'agent', kind, name, status })

describe('sync agents', () => {
  it('copies the selected agent file into .claude/agents and pins its source in the lock', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, agents: [typescript-reviewer] }]`) })

    const report = await t.run()

    expect(report).toMatchObject({ conflicts: [], inSync: true })
    expect(report.actions).toEqual([act('install', 'typescript-reviewer')])
    expect(await t.installed()).toEqual(['typescript-reviewer.md'])
    expect(await t.read('.claude/agents/typescript-reviewer.md')).toContain('typescript-reviewer v1')
    const lock = await t.lock()
    expect(lock.agentSources).toEqual([
      { source: { source: 'github', repo: REPO }, commit: 'acme-ecc-1', agents: ['planner', 'typescript-reviewer'] },
    ])
    expect(lock.agents).toEqual([
      expect.objectContaining({ name: 'typescript-reviewer', source: { source: 'github', repo: REPO }, origin: 'agent-plugins.yaml' }),
    ])
    expect(await t.run('check')).toMatchObject({ actions: [], inSync: true })
  })

  it('installs every agent of a bare source, skipping markdown files without a name', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    await t.run()

    expect(await t.installed()).toEqual(['planner.md', 'typescript-reviewer.md'])
  })

  it('names the installed file after the frontmatter name, not the source file', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) }, { [REPO]: agent('reviewer', 'x', 'code-review') })

    await t.run()

    expect(await t.installed()).toEqual(['reviewer.md'])
  })

  it('removes agents that are no longer declared and keeps the rest in sync after --update', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()

    await t.setConfig(config(`[{ source: ${REPO}, exclude: [planner] }]`))
    expect((await t.run()).actions).toEqual([act('remove', 'planner')])
    expect(await t.installed()).toEqual(['typescript-reviewer.md'])

    await t.sources.publish(REPO, { ...agent('typescript-reviewer', 'v2'), ...agent('planner') })
    expect((await t.run('apply', { update: true })).actions).toEqual([act('update', 'typescript-reviewer')])
    expect(await t.read('.claude/agents/typescript-reviewer.md')).toContain('v2')
    expect((await t.lock()).agentSources).toEqual([expect.objectContaining({ commit: 'acme-ecc-2' })])
  })

  it('reports an agent edited on disk until --force', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, agents: [planner] }]`) })
    await t.run()
    await writeFile(join(t.cwd, '.claude/agents/planner.md'), 'my edits')
    await t.setConfig(config(`[{ source: ${REPO}, agents: [typescript-reviewer] }]`))

    const report = await t.run()
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'planner', reason: 'modified-agent' })])
    expect(await t.read('.claude/agents/planner.md')).toBe('my edits')

    await t.run('apply', { force: true })
    expect(await t.installed()).toEqual(['typescript-reviewer.md'])
  })

  it('adopts a hand-copied agent with the same content and refuses a different one', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`[${REPO}]`),
      ...Object.fromEntries(Object.entries(agent('planner')).map(([, v]) => ['.claude/agents/planner.md', v])),
      '.claude/agents/typescript-reviewer.md': 'mine',
    })

    const report = await t.run()

    expect(report.notices).toContain('ap now manages agent "planner", which was set up by hand')
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'typescript-reviewer', reason: 'manual-entry' })])
    expect(await t.read('.claude/agents/typescript-reviewer.md')).toBe('mine')
    expect((await t.lock()).agents.map((a: { name: string }) => a.name)).toEqual(['planner'])
  })

  it('reports a selected agent the source does not have', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, agents: [ghost] }]`) })

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'ghost', reason: 'missing-agent' })])
  })

  it('fetches a repo declared as both a skill and an agent source once, pinning each separately', async () => {
    const t = await setup(
      { 'agent-plugins.yaml': config(`[${REPO}]`, `[${REPO}]`) },
      { [REPO]: { ...agent('planner'), 'skills/pdf/SKILL.md': '---\nname: pdf\n---\n' } },
    )

    await t.run()

    expect(t.sources.calls).toEqual([[REPO, null]])
    expect(await t.installed()).toEqual(['planner.md'])
    expect(await t.installed(join(t.cwd, '.claude/skills'))).toEqual(['pdf'])
    const lock = await t.lock()
    expect(lock.skillSources).toEqual([expect.objectContaining({ commit: 'acme-ecc-1', skills: ['pdf'] })])
    expect(lock.agentSources).toEqual([expect.objectContaining({ commit: 'acme-ecc-1', agents: ['planner'] })])
  })

  it('plans without fetching, then installs into the user agents directory', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    const dry = await t.run('dry-run', { scope: 'user' })
    expect(dry.actions).toEqual([expect.objectContaining({ target: 'agent', kind: 'install', name: null, status: 'planned' })])
    expect(t.sources.calls).toEqual([])

    await t.run('apply', { scope: 'user' })
    expect(await t.installed(join(t.homedir, '.claude/agents'))).toEqual(['planner.md', 'typescript-reviewer.md'])
    expect(await t.installed()).toEqual([])
  })

  it('skips agents in local scope with a notice', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    const report = await t.run('apply', { scope: 'local' })

    expect(report.actions).toEqual([])
    expect(report.notices).toContain('agents are not synced in local scope: Claude Code has no local agents directory')
  })

  it('merges agent declarations from presets like skills', async () => {
    const t = await setup({
      'agent-plugins.yaml': `kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml, ./b.yaml]\n`,
      'a.yaml': `kind: Preset\nmetadata: { name: a }\nspec:\n  agents: [{ source: ${REPO}, agents: [planner] }]\n`,
      'b.yaml': `kind: Preset\nmetadata: { name: b }\nspec:\n  agents: [{ source: ${REPO}, agents: [typescript-reviewer] }]\n`,
    })

    await t.run()

    expect(await t.installed()).toEqual(['planner.md', 'typescript-reviewer.md'])
  })
})

describe('agent sources', () => {
  it('reads agents from the declared path of a repo, which is part of its identity', async () => {
    const t = await setup(
      { 'agent-plugins.yaml': config(`[{ source: ${REPO}, path: claude/agents }]`) },
      { [REPO]: { ...agent('planner'), 'claude/agents/ops.md': 'ops without frontmatter' } },
    )

    await t.run()

    expect(await t.installed()).toEqual(['ops.md'])
    expect((await t.lock()).agentSources).toEqual([
      expect.objectContaining({ source: { source: 'github', repo: REPO, path: 'claude/agents' }, agents: ['ops'] }),
    ])
  })

  it('prefers agents/*.md, then .claude/agents/*.md, then top-level files', async () => {
    const names = async (files: Record<string, string>, explicit = false) =>
      (await findAgents(await makeTree(files), explicit)).map((a) => a.name)
    const named = (name: string) => `---\nname: ${name}\n---\n`

    expect(await names({ 'agents/a.md': named('a'), '.claude/agents/b.md': named('b'), 'c.md': named('c') })).toEqual(['a'])
    expect(await names({ '.claude/agents/b.md': named('b'), 'c.md': named('c') })).toEqual(['b'])
    expect(await names({ 'README.md': '# hi', 'CLAUDE.md': 'x', 'c.md': named('c'), 'nested/d.md': named('d') })).toEqual(['c'])
    expect(await names({ 'agents/README.md': '# hi', 'c.md': named('c') })).toEqual(['c'])
  })

  it('takes a nameless file as an agent named after the file when the source declares a path', async () => {
    const root = await makeTree({ 'loose.md': 'no frontmatter', 'tidy.md': '---\nname: tidy\ndescription: a: b\n---\n' })
    expect((await findAgents(root, true)).map((a) => a.name)).toEqual(['loose', 'tidy'])
    expect((await findAgents(root, false)).map((a) => a.name)).toEqual(['tidy'])
  })

  it('installs from a local directory source', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[./my-agents]`), 'my-agents/helper.md': 'plain helper' })

    await t.run()

    expect(await t.read('.claude/agents/helper.md')).toBe('plain helper')
  })
})
