import { execFileSync } from 'node:child_process'
import { mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { fakeClaude } from './fake-claude.js'
import { sync, type SyncMode } from './index.js'
import { createGitFetcher, findSkills } from './skills.js'
import { makeTree } from './test-helpers.js'
import type { Scope, SkillSource } from './types.js'

const REPO = 'acme/skills'
const OTHER = 'other/skills'

const skill = (name: string, body = `${name} v1`) => ({ [`skills/${name}/SKILL.md`]: `---\nname: ${name}\n---\n${body}\n` })

function config(skills: string, presets = '') {
  return `kind: Config\nmetadata: { name: demo }\nspec:${presets}\n  skills: ${skills}\n`
}

/**
 * Nguồn skill giả: mỗi repo là một chuỗi commit, `publish` thêm commit mới. Tải không có commit thì lấy commit mới nhất,
 * như `git clone --depth 1`.
 */
async function fakeSources(initial: Record<string, Record<string, string>>) {
  const history: Record<string, { commit: string; dir: string }[]> = {}
  const calls: [string, string | null][] = []
  async function publish(repo: string, files: Record<string, string>) {
    const versions = (history[repo] ??= [])
    versions.push({ commit: `${repo.replace('/', '-')}-${versions.length + 1}`, dir: await makeTree(files) })
  }
  for (const [repo, files] of Object.entries(initial)) await publish(repo, files)
  const fetch = async (source: SkillSource, commit: string | null) => {
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
  repos: Record<string, Record<string, string>> = { [REPO]: { ...skill('pdf'), ...skill('docx') } },
  shared?: { homedir: string; sources: Awaited<ReturnType<typeof fakeSources>> },
) {
  const cwd = await makeTree(files)
  const homedir = shared?.homedir ?? (await makeTree({}))
  const sources = shared?.sources ?? (await fakeSources(repos))
  const claude = fakeClaude({ cwd, homedir, marketplaces: {} })
  const deps = {
    exec: claude.exec,
    fetch: async () => {
      throw new Error('offline')
    },
    homedir,
    defaultPresetsDir: join(cwd, 'default-presets'),
    fetchSkillSource: sources.fetch,
  }
  const run = (mode: SyncMode = 'apply', extra: { force?: boolean; update?: boolean; scope?: Scope } = {}) =>
    sync({ cwd, scope: extra.scope ?? 'project', mode, force: extra.force, update: extra.update }, deps)
  const read = async (path: string) => readFile(join(cwd, path), 'utf8').catch(() => undefined)
  const lock = async () => parse((await read('agent-plugins.lock')) ?? '') ?? {}
  const installed = async (dir = join(cwd, '.claude/skills')) => (await readdir(dir).catch(() => [])).sort()
  const setConfig = (text: string) => writeFile(join(cwd, 'agent-plugins.yaml'), text)
  return { cwd, homedir, sources, run, read, lock, installed, setConfig }
}

const act = (kind: string, name: string | null, status = 'done') => expect.objectContaining({ target: 'skill', kind, name, status })

describe('sync skills', () => {
  it('copies every skill of a source into .claude/skills and pins its commit and skill names in the lock', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    const report = await t.run()

    expect(report).toMatchObject({ conflicts: [], inSync: true })
    expect(report.actions).toEqual([act('install', 'docx'), act('install', 'pdf')])
    expect(await t.installed()).toEqual(['docx', 'pdf'])
    expect(await t.read('.claude/skills/pdf/SKILL.md')).toContain('pdf v1')
    expect(await t.lock()).toMatchObject({
      skillSources: [{ source: { source: 'github', repo: REPO }, commit: 'acme-skills-1', skills: ['docx', 'pdf'] }],
      skills: [
        { name: 'docx', source: { source: 'github', repo: REPO }, sha256: expect.any(String), origin: 'agent-plugins.yaml' },
        { name: 'pdf', source: { source: 'github', repo: REPO }, sha256: expect.any(String), origin: 'agent-plugins.yaml' },
      ],
    })
    t.sources.calls.length = 0
    expect(await t.run('check')).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
    expect(await t.run()).toEqual({ actions: [], conflicts: [], notices: [], inSync: true })
    expect(t.sources.calls).toEqual([])
  })

  it('finds skills under the `path` of a source, which is part of the source in the lock', async () => {
    const nested = { 'claude/skills/jira/SKILL.md': '---\nname: jira\n---\n', 'claude/skills/lint/SKILL.md': 'x' }
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, path: ./claude/skills/, skills: [jira] }]`) }, { [REPO]: nested })

    expect(await t.run()).toMatchObject({ conflicts: [], inSync: true })

    expect(await t.installed()).toEqual(['jira'])
    const source = { source: 'github', repo: REPO, path: 'claude/skills' }
    expect(await t.lock()).toMatchObject({
      skillSources: [{ source, commit: 'acme-skills-1', skills: ['jira', 'lint'] }],
      skills: [{ name: 'jira', source }],
    })
    expect(await t.run('check')).toMatchObject({ actions: [], inSync: true })

    await t.setConfig(config(`[{ source: ${REPO}, path: claude/skills }]`))
    await t.run()
    expect(await t.installed()).toEqual(['jira', 'lint'])
  })

  it('rejects a `path` that leaves the source', async () => {
    for (const path of ['../x', '/abs', 'a/../../b']) {
      const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, path: "${path}" }]`) })
      await expect(t.run()).rejects.toThrow(/`path` of "acme\/skills" must be a relative path inside the source/)
    }
  })

  it('installs only the selected skills, and reports a selected skill the source lacks', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, skills: [pdf, xlsx] }]`) })

    const report = await t.run()

    expect(report.actions).toEqual([act('install', 'pdf')])
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'xlsx', reason: 'missing-skill' })])
    expect(await t.installed()).toEqual(['pdf'])
  })

  it('plans an unknown source offline and needs no network for --dry-run', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}, { source: ${OTHER}, skills: [lint] }]`) })

    const report = await t.run('dry-run')

    expect(report.actions).toEqual([
      act('install', 'lint', 'planned'),
      expect.objectContaining({ target: 'skill', kind: 'install', name: null, source: { source: 'github', repo: REPO } }),
    ])
    expect(t.sources.calls).toEqual([])
    expect(await t.installed()).toEqual([])
  })

  it('stays on the pinned commit until --update, and reinstalls it for a teammate who just cloned', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    await t.sources.publish(REPO, { ...skill('pdf', 'pdf v2'), ...skill('docx') })

    expect((await t.run()).actions).toEqual([])
    expect(await t.read('.claude/skills/pdf/SKILL.md')).toContain('pdf v1')

    await rm(join(t.cwd, '.claude/skills'), { recursive: true })
    expect((await t.run('check')).actions).toEqual([act('install', 'docx', 'planned'), act('install', 'pdf', 'planned')])
    await t.run()
    expect(t.sources.calls.at(-1)).toEqual([REPO, 'acme-skills-1'])
    expect(await t.read('.claude/skills/pdf/SKILL.md')).toContain('pdf v1')

    const updated = await t.run('apply', { update: true })
    expect(updated.actions).toEqual([act('update', 'pdf')])
    expect(await t.read('.claude/skills/pdf/SKILL.md')).toContain('pdf v2')
    expect((await t.lock()).skillSources).toEqual([expect.objectContaining({ commit: 'acme-skills-2' })])
  })

  it('sees every skill of a source offline once its skill names are pinned, even ones it never installed', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, skills: [pdf] }]`) })
    await t.run()
    await t.setConfig(config(`[${REPO}]`))
    t.sources.calls.length = 0

    expect((await t.run('check')).actions).toEqual([act('install', 'docx', 'planned')])
    expect(t.sources.calls).toEqual([])
    expect((await t.run()).actions).toEqual([act('install', 'docx')])
    expect(t.sources.calls).toEqual([[REPO, 'acme-skills-1']])
  })

  it('fetches a pinned source again only when the lock cannot tell what to install', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    t.sources.calls.length = 0

    await writeFile(join(t.cwd, '.claude/skills/pdf/SKILL.md'), 'my notes')
    expect((await t.run()).conflicts).toEqual([expect.objectContaining({ name: 'pdf', reason: 'modified-skill' })])
    expect(t.sources.calls).toEqual([])
    expect((await t.run('apply', { force: true })).actions).toEqual([act('update', 'pdf')])
    expect(await t.read('.claude/skills/pdf/SKILL.md')).toContain('pdf v1')
    expect(t.sources.calls).toEqual([[REPO, 'acme-skills-1']])

    await t.setConfig(config(`[${REPO}@main]`))
    await t.run()
    expect(t.sources.calls.at(-1)).toEqual([REPO, null])
  })

  it('upgrades a lock that pinned the commit on each skill', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    await t.sources.publish(REPO, { ...skill('pdf', 'pdf v2'), ...skill('docx') })
    const { skillSources: _, skills } = await t.lock()
    await writeFile(
      join(t.cwd, 'agent-plugins.lock'),
      stringify({ skills: skills.map((s: object) => ({ ...s, commit: 'acme-skills-1' })) }),
    )
    t.sources.calls.length = 0

    expect(await t.run()).toMatchObject({ actions: [], inSync: true })
    expect(t.sources.calls).toEqual([[REPO, 'acme-skills-1']])
    const lock = await t.lock()
    expect(lock.skillSources).toEqual([expect.objectContaining({ commit: 'acme-skills-1', skills: ['docx', 'pdf'] })])
    expect(lock.skills.every((s: object) => !('commit' in s))).toBe(true)
    await t.run()
    expect(t.sources.calls).toHaveLength(1)
  })

  it('removes a managed skill that is no longer declared', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    await t.setConfig(config(`[{ source: ${REPO}, skills: [pdf] }]`))

    expect((await t.run()).actions).toEqual([act('remove', 'docx')])
    expect(await t.installed()).toEqual(['pdf'])
    expect((await t.lock()).skills.map((s: { name: string }) => s.name)).toEqual(['pdf'])
  })

  it('refuses to overwrite or remove a managed skill edited on disk, unless --force', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    await writeFile(join(t.cwd, '.claude/skills/pdf/SKILL.md'), 'my notes')
    await t.sources.publish(REPO, { ...skill('pdf', 'pdf v2'), ...skill('docx') })

    const report = await t.run('apply', { update: true })
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'pdf', reason: 'modified-skill' })])
    expect(await t.read('.claude/skills/pdf/SKILL.md')).toBe('my notes')

    await t.setConfig(config(`[{ source: ${REPO}, skills: [docx] }]`))
    expect((await t.run()).conflicts).toEqual([expect.objectContaining({ name: 'pdf', reason: 'modified-skill' })])
    expect(await t.installed()).toEqual(['docx', 'pdf'])

    expect((await t.run('apply', { force: true })).actions).toEqual([act('remove', 'pdf')])
    expect(await t.installed()).toEqual(['docx'])
  })

  it('adopts a matching hand-made skill once, and refuses a different one unless --force', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`[${REPO}]`),
      '.claude/skills/pdf/SKILL.md': '---\nname: pdf\n---\npdf v1\n',
      '.claude/skills/docx/SKILL.md': 'mine',
    })

    const report = await t.run()

    expect(report.actions).toEqual([])
    expect(report.notices).toEqual([expect.stringContaining('now manages skill "pdf"')])
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'docx', reason: 'manual-entry' })])
    expect((await t.lock()).skills.map((s: { name: string }) => s.name)).toEqual(['pdf'])

    const forced = await t.run('apply', { force: true })
    expect(forced.actions).toEqual([act('install', 'docx')])
    expect(forced.notices).toEqual([])
    expect((await t.lock()).skills.map((s: { name: string }) => s.name).sort()).toEqual(['docx', 'pdf'])
  })

  it('treats a symlinked skill as a manual entry', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, skills: [pdf] }]`), '.agents/skills/pdf/SKILL.md': 'other tool' })
    await mkdir(join(t.cwd, '.claude/skills'), { recursive: true })
    await symlink('../../.agents/skills/pdf', join(t.cwd, '.claude/skills/pdf'))

    expect((await t.run()).conflicts).toEqual([expect.objectContaining({ name: 'pdf', reason: 'manual-entry' })])

    await t.run('apply', { force: true })
    expect(await t.read('.claude/skills/pdf/SKILL.md')).toContain('pdf v1')
    expect(await t.read('.agents/skills/pdf/SKILL.md')).toBe('other tool')
  })

  it('lets the Config narrow the skills a preset selects from the same source', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`[{ source: ${REPO}, skills: [pdf] }]`, '\n  presets: [./team.yaml]'),
      'team.yaml': `kind: Preset\nmetadata: { name: team }\nspec:\n  skills: [${REPO}]\n`,
    })

    const report = await t.run()

    expect(report.actions).toEqual([act('install', 'pdf')])
    expect(report.notices).toEqual([expect.stringContaining('agent-plugins.yaml overrides skills from "acme/skills"')])
  })

  it('merges sibling presets on one source and reports a skill name two sources both provide', async () => {
    const t = await setup(
      {
        'agent-plugins.yaml': config('[]', '\n  presets: [./a.yaml, ./b.yaml, ./c.yaml]'),
        'a.yaml': `kind: Preset\nmetadata: { name: a }\nspec:\n  skills: [{ source: ${REPO}, skills: [pdf] }]\n`,
        'b.yaml': `kind: Preset\nmetadata: { name: b }\nspec:\n  skills: [{ source: ${REPO}, skills: [docx] }]\n`,
        'c.yaml': `kind: Preset\nmetadata: { name: c }\nspec:\n  skills: [${OTHER}]\n`,
      },
      { [REPO]: { ...skill('pdf'), ...skill('docx') }, [OTHER]: skill('pdf', 'other pdf') },
    )

    const report = await t.run()

    expect(report.actions).toEqual([act('install', 'docx')])
    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'pdf', reason: 'preset-clash' })])
  })

  it('installs every skill but the excluded ones, and warns about an excluded skill the source lacks', async () => {
    const t = await setup(
      { 'agent-plugins.yaml': config(`[{ source: ${REPO}, exclude: [docx, xlsx] }]`) },
      { [REPO]: { ...skill('pdf'), ...skill('docx'), ...skill('lint') } },
    )

    const report = await t.run()

    expect(report).toMatchObject({ conflicts: [], inSync: true })
    expect(report.actions).toEqual([act('install', 'lint'), act('install', 'pdf')])
    expect(report.notices).toEqual([expect.stringContaining('excludes skill "xlsx" but acme/skills has no such skill')])
    expect(await t.installed()).toEqual(['lint', 'pdf'])

    await t.sources.publish(REPO, { ...skill('pdf'), ...skill('docx'), ...skill('lint'), ...skill('new') })
    expect((await t.run('apply', { update: true })).actions).toEqual([act('install', 'new')])
  })

  it('plans the removal of a newly excluded skill offline', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    await t.setConfig(config(`[{ source: ${REPO}, exclude: [docx] }]`))
    t.sources.calls.length = 0

    expect((await t.run('check')).actions).toEqual([act('remove', 'docx', 'planned')])
    expect(t.sources.calls).toEqual([])
  })

  it('merges sibling presets that exclude skills as a union of what each installs', async () => {
    const preset = (name: string, entry: string) => `kind: Preset\nmetadata: { name: ${name} }\nspec:\n  skills: [${entry}]\n`
    const repos = { [REPO]: { ...skill('pdf'), ...skill('docx'), ...skill('lint') } }
    const run = async (a: string, b: string) => {
      const t = await setup(
        { 'agent-plugins.yaml': config('[]', '\n  presets: [./a.yaml, ./b.yaml]'), 'a.yaml': preset('a', a), 'b.yaml': preset('b', b) },
        repos,
      )
      await t.run()
      return t.installed()
    }

    expect(await run(`{ source: ${REPO}, exclude: [pdf, docx] }`, `{ source: ${REPO}, exclude: [docx] }`)).toEqual(['lint', 'pdf'])
    expect(await run(`{ source: ${REPO}, exclude: [pdf, docx] }`, `{ source: ${REPO}, skills: [pdf] }`)).toEqual(['lint', 'pdf'])
    expect(await run(`{ source: ${REPO}, exclude: [pdf] }`, REPO)).toEqual(['docx', 'lint', 'pdf'])
  })

  it('lets the Config exclude skills a preset installs', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`[{ source: ${REPO}, exclude: [docx] }]`, '\n  presets: [./team.yaml]'),
      'team.yaml': `kind: Preset\nmetadata: { name: team }\nspec:\n  skills: [${REPO}]\n`,
    })

    expect((await t.run()).actions).toEqual([act('install', 'pdf')])
  })

  it('rejects a skill entry with both skills and exclude', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, skills: [pdf], exclude: [docx] }]`) })

    await expect(t.run()).rejects.toThrow('"acme/skills" cannot have both `skills` and `exclude`')
  })

  it('rejects a skill source that is not a repository or a directory', async () => {
    const t = await setup({ 'agent-plugins.yaml': config('[https://example.com/skills.json]') })

    await expect(t.run()).rejects.toThrow('skill source "https://example.com/skills.json" must be owner/repo, a git URL or a directory')
  })

  it('skips skills in local scope', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    const report = await t.run('apply', { scope: 'local' })

    expect(report.actions).toEqual([])
    expect(report.notices).toEqual([expect.stringContaining('not synced in local scope')])
  })

  it('keeps a user-scope skill while another repo still declares it, then hands it over', async () => {
    const a = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, skills: [pdf] }]`) })
    const b = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, skills: [pdf] }]`) }, undefined, a)
    const userSkills = () => a.installed(join(a.homedir, '.claude/skills'))

    expect((await a.run('apply', { scope: 'user' })).actions).toEqual([act('install', 'pdf')])
    expect(await b.run('apply', { scope: 'user' })).toMatchObject({ actions: [], conflicts: [], notices: [] })

    await a.setConfig(config('[]'))
    expect((await a.run('apply', { scope: 'user' })).actions).toEqual([])
    expect(await userSkills()).toEqual(['pdf'])

    await b.setConfig(config('[]'))
    expect((await b.run('apply', { scope: 'user' })).actions).toEqual([act('remove', 'pdf')])
    expect(await userSkills()).toEqual([])
  })

  it('refuses to fight another repo over a user-scope skill from a different source', async () => {
    const a = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, skills: [pdf] }]`) }, {
      [REPO]: skill('pdf'),
      [OTHER]: skill('pdf', 'other pdf'),
    })
    const b = await setup({ 'agent-plugins.yaml': config(`[${OTHER}]`) }, undefined, a)
    await a.run('apply', { scope: 'user' })

    const report = await b.run('apply', { scope: 'user', force: true })

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'pdf', reason: 'shared-clash' })])
  })

  it('reports a source that cannot be fetched and keeps its installed skills', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}, missing/repo]`) })

    const report = await t.run()

    expect(report.inSync).toBe(false)
    expect(report.actions).toContainEqual(
      expect.objectContaining({ target: 'skill', kind: 'fetch', status: 'failed', error: 'repository missing/repo not found' }),
    )
    expect(await t.installed()).toEqual(['docx', 'pdf'])
  })
})

describe('skill sources', () => {
  it('finds a single skill at the root, named by its frontmatter or else the source', async () => {
    expect(await findSkills(await makeTree({ 'SKILL.md': '---\nname: solo\n---\n' }), 'repo')).toEqual([
      expect.objectContaining({ name: 'solo' }),
    ])
    expect(await findSkills(await makeTree({ 'SKILL.md': 'no frontmatter' }), 'repo')).toEqual([expect.objectContaining({ name: 'repo' })])
  })

  it('reads the name of a skill whose frontmatter is not valid YAML, as Claude Code does', async () => {
    const root = await makeTree({
      'skills/loose/SKILL.md': '---\nname: loose\ndescription: Use when: anything goes\n---\n',
      'skills/nameless/SKILL.md': '---\ndescription: a: b\n---\n',
      ...skill('pdf'),
    })
    expect((await findSkills(root, 'repo')).map((s) => s.name)).toEqual(['loose', 'nameless', 'pdf'])
  })

  it('prefers skills/*/SKILL.md over top-level folders', async () => {
    const root = await makeTree({ ...skill('pdf'), 'docs/SKILL.md': 'x', 'misc/README.md': 'x' })
    expect((await findSkills(root, 'repo')).map((s) => s.name)).toEqual(['pdf'])
    const flat = await makeTree({ 'lint/SKILL.md': 'x', '.hidden/SKILL.md': 'x' })
    expect((await findSkills(flat, 'repo')).map((s) => s.name)).toEqual(['lint'])
  })

  it('clones a git source at its latest commit, then fetches exactly the pinned one', async () => {
    const repo = await makeTree(skill('pdf'))
    const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim()
    git('init', '-q')
    git('add', '.')
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'v1')
    git('config', 'uploadpack.allowAnySHA1InWant', 'true')
    const first = git('rev-parse', 'HEAD')
    await writeFile(join(repo, 'skills/pdf/SKILL.md'), '---\nname: pdf\n---\nv2\n')
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', 'v2')

    const exec = async (command: string, args: string[]) => {
      try {
        return { code: 0, stdout: execFileSync(command, args, { encoding: 'utf8', stdio: 'pipe' }), stderr: '' }
      } catch (error) {
        return { code: 1, stdout: '', stderr: String((error as { stderr?: string }).stderr) }
      }
    }
    const fetch = createGitFetcher(exec, repo)
    const source = { source: 'git', url: `file://${repo}` }

    const latest = await fetch(source, null)
    expect(latest.commit).toBe(git('rev-parse', 'HEAD'))
    expect(await readFile(join(latest.dir, 'skills/pdf/SKILL.md'), 'utf8')).toContain('v2')
    await latest.cleanup()

    const pinned = await fetch(source, first)
    expect(pinned.commit).toBe(first)
    expect(await readFile(join(pinned.dir, 'skills/pdf/SKILL.md'), 'utf8')).toContain('pdf v1')
    await pinned.cleanup()
  })
})
