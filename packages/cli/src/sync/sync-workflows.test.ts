import { readdir, readFile, readlink, symlink, writeFile } from 'node:fs/promises'
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

/** Nguồn giả: mỗi repo là một chuỗi commit, `publish` thêm commit mới; tải không có commit thì lấy commit mới nhất. */
async function fakeSources(initial: Record<string, Record<string, string>>) {
  const history: Record<string, { commit: string; dir: string }[]> = {}
  const calls: string[] = []
  async function publish(repo: string, files: Record<string, string>) {
    const versions = (history[repo] ??= [])
    versions.push({ commit: `${repo.replace('/', '-')}-${versions.length + 1}`, dir: await makeTree(files) })
  }
  for (const [repo, files] of Object.entries(initial)) await publish(repo, files)
  const fetch = async (source: ItemSource, commit: string | null) => {
    calls.push(source.repo as string)
    const versions = history[source.repo as string]
    if (!versions) throw new Error(`repository ${source.repo} not found`)
    const version = commit ? versions.find((v) => v.commit === commit) : versions.at(-1)
    if (!version) throw new Error(`commit ${commit} not found`)
    return { dir: version.dir, commit: version.commit, cleanup: async () => {} }
  }
  return { fetch, publish, calls }
}

async function setup(files: Record<string, string>, repos: Record<string, Record<string, string>> = { [REPO]: FLOWS }) {
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
  const run = (mode: SyncMode = 'apply', extra: { scope?: Scope; force?: boolean; update?: boolean; cwd?: string } = {}) =>
    sync({ cwd: extra.cwd ?? cwd, scope: extra.scope ?? 'project', mode, force: extra.force, update: extra.update }, deps)
  const read = async (path: string) => readFile(join(cwd, path), 'utf8').catch(() => undefined)
  const lock = async () => parse((await read('agent-plugins.lock')) ?? '') ?? {}
  const files_ = async (dir = join(cwd, '.claude/workflows')) => (await readdir(dir).catch(() => [])).sort()
  const setConfig = (text: string) => writeFile(join(cwd, 'agent-plugins.yaml'), text)
  return { cwd, homedir, sources, run, read, lock, files: files_, setConfig }
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

  it('selects and excludes workflows by meta.name, not file name', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, workflows: [code-review] }]`) })

    expect((await t.run()).actions).toEqual([act('install', 'code-review')])
    expect(await t.files()).toEqual(['code-review.js'])

    await t.setConfig(config(`[{ source: ${REPO}, exclude: [code-review] }]`))
    expect((await t.run()).actions).toEqual([act('install', 'audit'), act('remove', 'code-review')])
    expect(await t.files()).toEqual(['audit.js'])
  })

  it('reports missing-workflow for a selected name the source lacks, and only notes an unknown exclusion', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, workflows: [review] }]`) })

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'review', reason: 'missing-workflow' })])
    expect(await t.files()).toEqual([])

    await t.setConfig(config(`[{ source: ${REPO}, exclude: [review] }]`))
    const excluded = await t.run()
    expect(excluded.conflicts).toEqual([])
    expect(excluded.notices).toEqual(expect.arrayContaining([expect.stringContaining('excludes workflow "review"')]))
  })

  it('rejects a workflow entry with both workflows and exclude', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, workflows: [audit], exclude: [code-review] }]`) })
    await expect(t.run()).rejects.toThrow(`"${REPO}" cannot have both \`workflows\` and \`exclude\``)
  })
})

describe('sync workflows ownership', () => {
  const REVIEW = FLOWS['workflows/review.js']
  const only = (names: string[]) => config(`[{ source: ${REPO}, workflows: [${names.join(', ')}] }]`)

  it('adopts a hand-copied workflow with the same meta.name and content, whatever its file name', async () => {
    const t = await setup({ 'agent-plugins.yaml': only(['code-review']), '.claude/workflows/foo.js': REVIEW })

    const report = await t.run()

    expect(report.actions).toEqual([])
    expect(report.notices).toEqual(expect.arrayContaining(['ap now manages workflow "code-review", which was set up by hand']))
    expect((await t.lock()).workflows.map((w: { name: string }) => w.name)).toEqual(['code-review'])

    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    expect((await t.run()).actions).toEqual([act('remove', 'code-review')])
    expect(await t.files()).toEqual([])
  })

  it('refuses a hand-written workflow with the same meta.name but other content until --force', async () => {
    const mine = script('code-review', `await agent('my own review')`)
    const t = await setup({ 'agent-plugins.yaml': only(['code-review']), '.claude/workflows/foo.js': mine })

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'code-review', reason: 'manual-entry' })])
    expect(await t.read('.claude/workflows/foo.js')).toBe(mine)

    expect((await t.run('apply', { force: true })).actions).toEqual([act('install', 'code-review')])
    expect(await t.files()).toEqual(['code-review.js'])
    expect(await t.read('.claude/workflows/code-review.js')).toBe(REVIEW)
  })

  it('reports modified-workflow for an edited managed workflow, on update and on removal', async () => {
    const t = await setup({ 'agent-plugins.yaml': only(['code-review', 'audit']) })
    await t.run()
    const edited = `${REVIEW}// tweak\n`
    await writeFile(join(t.cwd, '.claude/workflows/code-review.js'), edited)

    expect((await t.run()).conflicts).toEqual([expect.objectContaining({ name: 'code-review', reason: 'modified-workflow' })])

    await t.setConfig(only(['audit']))
    const report = await t.run()
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'code-review', reason: 'modified-workflow' })])
    expect(await t.read('.claude/workflows/code-review.js')).toBe(edited)

    expect((await t.run('apply', { force: true })).actions).toEqual([act('remove', 'code-review')])
    expect(await t.files()).toEqual(['audit.js'])
  })

  it('warns when two hand-written files share a meta.name', async () => {
    const t = await setup({
      'agent-plugins.yaml': config('[]'),
      '.claude/workflows/a.js': script('twin'),
      '.claude/workflows/b.js': script('twin', `await agent('other')`),
    })

    const report = await t.run()

    expect(report.notices).toEqual(expect.arrayContaining([expect.stringMatching(/"twin".*a\.js.*b\.js/)]))
    expect(await t.files()).toEqual(['a.js', 'b.js'])
  })

  it('treats a symlinked workflow as manual and only unlinks it with --force', async () => {
    const outside = await makeTree({ 'review.js': script('code-review', `await agent('linked')`) })
    const t = await setup({ 'agent-plugins.yaml': only(['code-review']), '.claude/workflows/.keep': '' })
    await symlink(join(outside, 'review.js'), join(t.cwd, '.claude/workflows/code-review.js'))

    expect((await t.run()).conflicts).toEqual([expect.objectContaining({ name: 'code-review', reason: 'manual-entry' })])

    await t.run('apply', { force: true })
    expect(await readlink(join(t.cwd, '.claude/workflows/code-review.js')).catch(() => 'not a link')).toBe('not a link')
    expect(await t.read('.claude/workflows/code-review.js')).toBe(REVIEW)
    expect(await readFile(join(outside, 'review.js'), 'utf8')).toContain('linked')
  })

  it('leaves files without a valid meta alone', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`), '.claude/workflows/notes.js': 'const x = 1\n' })
    await t.run()
    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    await t.run()
    expect(await t.files()).toEqual(['notes.js'])
  })
})


describe('sync workflows dependencies', () => {
  const BOUND = { 'workflows/orch.js': script('orch-review', `await agent('x', { agentType: 'ecc:code-reviewer' })`), 'workflows/plain.js': script('plain') }

  it('skips a plugin-bound workflow when installing all, and refuses it when selected by name', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('[acme/ecc]') }, { 'acme/ecc': BOUND })

    const report = await t.run()

    expect(report.actions).toEqual([act('install', 'plain')])
    expect(report.notices).toEqual(expect.arrayContaining([expect.stringMatching(/orch-review.*ecc:code-reviewer/)]))
    expect((await t.lock()).workflowSources).toEqual([
      { source: { source: 'github', repo: 'acme/ecc' }, commit: 'acme-ecc-1', workflows: ['orch-review', 'plain'], blocked: ['orch-review'] },
    ])
    expect(await t.run('check')).toMatchObject({ actions: [], inSync: true })

    await t.setConfig(config('[{ source: acme/ecc, workflows: [orch-review] }]'))
    const selected = await t.run()
    expect(selected.conflicts).toEqual([expect.objectContaining({ name: 'orch-review', reason: 'plugin-workflow' })])
    expect(await t.files()).toEqual([])
  })

  it('warns about agent types and workflows a workflow calls that are not there', async () => {
    const calls = script(
      'ship',
      `await agent('a', { agentType: 'code-reviewer' })\nawait agent('b', { agentType: 'general-purpose' })\nawait workflow('content-guard')\nawait workflow('plain')`,
    )
    const repo = { 'workflows/ship.js': calls, 'workflows/plain.js': script('plain') }
    const t = await setup({ 'agent-plugins.yaml': config('[acme/ship]') }, { 'acme/ship': repo })

    const report = await t.run()

    const deps = report.notices.filter((n) => n.startsWith('workflow "ship"'))
    expect(deps).toEqual([expect.stringContaining('agent "code-reviewer"'), expect.stringContaining('workflow "content-guard"')])

    await writeFile(join(t.cwd, '.claude/workflows/guard.js'), script('content-guard'))
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(t.cwd, '.claude/agents'), { recursive: true })
    await writeFile(join(t.cwd, '.claude/agents/code-reviewer.md'), '---\nname: code-reviewer\n---\n')
    expect((await t.run()).notices.filter((n) => n.startsWith('workflow "ship"'))).toEqual([])
  })
})

describe('sync workflows pinning and sharing', () => {
  it('keeps the pinned commit until --update', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    const v2 = script('audit', `await agent('audit v2')`)
    await t.sources.publish(REPO, { ...FLOWS, 'workflows/audit.js': v2 })

    expect((await t.run()).actions).toEqual([])
    expect(await t.read('.claude/workflows/audit.js')).toBe(FLOWS['workflows/audit.js'])

    expect((await t.run('apply', { update: true })).actions).toEqual([act('update', 'audit')])
    expect(await t.read('.claude/workflows/audit.js')).toBe(v2)
    expect((await t.lock()).workflowSources[0].commit).toBe('acme-flows-2')
  })

  it('fetches a repo once for agents and workflows, and not again when nothing changed', async () => {
    const repo = { ...FLOWS, 'agents/helper.md': '---\nname: helper\n---\nHelp\n' }
    const both = `kind: Config\nmetadata: { name: demo }\nspec:\n  agents: [${REPO}]\n  workflows: [${REPO}]\n`
    const t = await setup({ 'agent-plugins.yaml': both }, { [REPO]: repo })

    await t.run()
    expect(t.sources.calls).toEqual([REPO])

    await t.run()
    expect(await t.run('check')).toMatchObject({ inSync: true })
    expect(t.sources.calls).toEqual([REPO])
  })

  it('keeps a user-scope workflow another Config still claims', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    const other = await makeTree({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, workflows: [audit] }]`) })
    const userFiles = () => t.files(join(t.homedir, '.claude/workflows'))

    await t.run('apply', { scope: 'user' })
    await t.run('apply', { scope: 'user', cwd: other })

    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    await t.run('apply', { scope: 'user' })
    expect(await userFiles()).toEqual(['audit.js'])

    await writeFile(join(other, 'agent-plugins.yaml'), 'kind: Config\nmetadata: { name: other }\nspec: {}\n')
    await t.run('apply', { scope: 'user', cwd: other })
    expect(await userFiles()).toEqual([])
  })
})


describe('sync workflows from presets', () => {
  const withPresets = (workflows: string, presets: string) =>
    `kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [${presets}]\n  workflows: ${workflows}\n`
  const preset = (name: string, workflows: string) => `kind: Preset\nmetadata: { name: ${name} }\nspec:\n  workflows: ${workflows}\n`

  it('lets the Config narrow the workflows a preset declares', async () => {
    const t = await setup({ 'agent-plugins.yaml': withPresets(`[{ source: ${REPO}, workflows: [audit] }]`, './team.yaml'), 'team.yaml': preset('team', `[${REPO}]`) })

    const report = await t.run()

    expect(report.actions).toEqual([act('install', 'audit')])
    expect(report.notices).toEqual(expect.arrayContaining([expect.stringContaining(`agent-plugins.yaml overrides workflows from "${REPO}"`)]))
  })

  it('merges sibling presets on one source and reports a clash between two refs', async () => {
    const t = await setup({
      'agent-plugins.yaml': withPresets('[]', './a.yaml, ./b.yaml'),
      'a.yaml': preset('a', `[{ source: ${REPO}, workflows: [audit] }]`),
      'b.yaml': preset('b', `[{ source: ${REPO}, workflows: [code-review] }]`),
    })
    expect((await t.run()).actions).toEqual([act('install', 'audit'), act('install', 'code-review')])

    await t.setConfig(withPresets('[]', './a.yaml, ./c.yaml'))
    await writeFile(join(t.cwd, 'c.yaml'), preset('c', `[{ source: ${REPO}@v2, workflows: [code-review] }]`))
    expect((await t.run()).conflicts).toEqual([expect.objectContaining({ reason: 'preset-clash' })])
  })
})
