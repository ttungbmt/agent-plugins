import { lstat, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { fakeClaude } from './fake-claude.js'
import { sync, type SyncMode } from './index.js'
import { makeTree } from './test-helpers.js'
import type { ItemSource, Scope } from './types.js'

const REPO = 'acme/ECC'
const SOURCE = { source: 'github', repo: REPO }

/** An ECC-style rule set: `common` and `web` groups, relative links between groups, plus files that are not Rules. */
const ECC = {
  'rules/common/coding-style.md': '# Common coding style\n',
  'rules/common/testing.md': '# Common testing\n',
  'rules/web/coding-style.md': '---\npaths: ["**/*.tsx"]\n---\nSee [common](../common/coding-style.md).\n',
  'rules/README.md': '# How to install\n',
  'rules/web/Readme.md': '# Web rules\n',
  '.claude/rules/internal.md': '# Rules of the ECC repo itself\n',
  'CHANGELOG.md': '# Changelog\n',
}

function config(rules: string) {
  return `kind: Config\nmetadata: { name: demo }\nspec:\n  rules: ${rules}\n`
}

/** Fake source: each repo is a chain of commits and `publish` adds one; fetching without a commit takes the latest. */
async function fakeSources(initial: Record<string, Record<string, string>>) {
  const history: Record<string, { commit: string; dir: string }[]> = {}
  async function publish(repo: string, files: Record<string, string>) {
    const versions = (history[repo] ??= [])
    versions.push({ commit: `${repo.replace('/', '-')}-${versions.length + 1}`, dir: await makeTree(files) })
  }
  for (const [repo, files] of Object.entries(initial)) await publish(repo, files)
  const fetch = async (source: ItemSource, commit: string | null) => {
    const versions = history[source.repo as string]
    if (!versions) throw new Error(`repository ${source.repo} not found`)
    const version = commit ? versions.find((v) => v.commit === commit) : versions.at(-1)
    if (!version) throw new Error(`commit ${commit} not found`)
    return { dir: version.dir, commit: version.commit, cleanup: async () => {} }
  }
  return { fetch, publish }
}

async function setup(files: Record<string, string>, repos: Record<string, Record<string, string>> = { [REPO]: ECC }) {
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
  /** Every file under `dir`, as sorted relative paths. */
  const tree = async (dir = join(cwd, '.claude/rules')) =>
    (await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []))
      .filter((e) => e.isFile())
      .map((e) => relative(dir, join(e.parentPath, e.name)))
      .sort()
  const setConfig = (text: string) => writeFile(join(cwd, 'agent-plugins.yaml'), text)
  return { cwd, homedir, sources, run, read, lock, tree, setConfig }
}

const act = (kind: string, name: string | null, status = 'done') => expect.objectContaining({ target: 'rule', kind, name, status })

describe('sync rules', () => {
  it('copies every rule of a bare source into its namespace, keeping the folder layout', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    const report = await t.run()

    expect(report).toMatchObject({ conflicts: [], inSync: true })
    expect(report.actions).toEqual([
      act('install', 'ecc/common/coding-style'),
      act('install', 'ecc/common/testing'),
      act('install', 'ecc/web/coding-style'),
    ])
    expect(await t.tree()).toEqual(['ecc/common/coding-style.md', 'ecc/common/testing.md', 'ecc/web/coding-style.md'])
    expect(await t.read('.claude/rules/ecc/web/coding-style.md')).toBe(ECC['rules/web/coding-style.md'])
    const lock = await t.lock()
    expect(lock.ruleSources).toEqual([
      { source: SOURCE, commit: 'acme-ECC-1', rules: ['common/coding-style', 'common/testing', 'web/coding-style'] },
    ])
    expect(lock.rules.map((r: { name: string }) => r.name)).toEqual(['ecc/common/coding-style', 'ecc/common/testing', 'ecc/web/coding-style'])
    expect(lock.rules[0]).toMatchObject({ source: SOURCE, origin: 'agent-plugins.yaml', sha256: expect.any(String) })
    expect(await t.run('check')).toMatchObject({ actions: [], inSync: true })
  })

  it('refuses a source without rules/ unless `path` points at its rules', async () => {
    const flat = { 'claude/rules/security.md': '# Security\n', 'CONTRIBUTING.md': '# Contributing\n' }
    const t = await setup({ 'agent-plugins.yaml': config('[acme/toolkit]') }, { 'acme/toolkit': flat })

    const report = await t.run()

    expect(report.inSync).toBe(false)
    expect(report.actions).toEqual([expect.objectContaining({ target: 'rule', kind: 'fetch', status: 'failed', error: expect.stringContaining('`path`') })])
    expect(await t.tree()).toEqual([])

    await t.setConfig(config('[{ source: acme/toolkit, path: claude/rules }]'))
    expect((await t.run()).actions).toEqual([act('install', 'toolkit/security')])
    expect(await t.tree()).toEqual(['toolkit/security.md'])
  })

  it('reads a local directory source as its rules folder', async () => {
    const t = await setup({
      'agent-plugins.yaml': config('[./team-rules]'),
      'team-rules/api.md': '# API\n',
      'team-rules/README.md': '# About\n',
    })

    await t.run()

    expect(await t.tree()).toEqual(['team-rules/api.md'])
  })

  it('removes rules that are no longer declared, drops the empty namespace and leaves user files alone', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`[${REPO}]`),
      '.claude/rules/mine.md': '# Mine\n',
      '.claude/rules/team/style.md': '# Team\n',
    })
    await t.run()

    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    const report = await t.run()

    expect(report.actions).toEqual([
      act('remove', 'ecc/common/coding-style'),
      act('remove', 'ecc/common/testing'),
      act('remove', 'ecc/web/coding-style'),
    ])
    expect(await t.tree()).toEqual(['mine.md', 'team/style.md'])
    expect(await readdir(join(t.cwd, '.claude/rules'))).not.toContain('ecc')
    expect((await t.lock()).rules).toBeUndefined()
  })

  it('skips rules in local scope and installs them under the Claude config dir in user scope', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })

    const local = await t.run('apply', { scope: 'local' })
    expect(local.notices).toContain('rules are not synced in local scope: Claude Code has no local rules directory')
    expect(await t.tree()).toEqual([])

    await t.run('apply', { scope: 'user' })
    expect(await t.tree(join(t.homedir, '.claude/rules'))).toEqual([
      'ecc/common/coding-style.md',
      'ecc/common/testing.md',
      'ecc/web/coding-style.md',
    ])
  })

  it('only looks inside declared or managed namespaces', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await mkdir(join(t.cwd, '.claude/rules/other'), { recursive: true })
    await writeFile(join(t.cwd, '.claude/rules/other/common.md'), '# Not ours\n')

    expect((await t.run()).conflicts).toEqual([])
    expect(await t.tree()).toContain('other/common.md')
  })
})

describe('sync rules selection', () => {
  const FULL = { ...ECC, 'rules/python/coding-style.md': '# Python\n', 'rules/security.md': '# Security\n' }
  const names = async (t: Awaited<ReturnType<typeof setup>>) => (await t.lock()).rules.map((r: { name: string }) => r.name)

  it('selects every rule under a folder, and single rules by path', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, rules: [common, web/coding-style, security] }]`) }, { [REPO]: FULL })

    expect((await t.run()).conflicts).toEqual([])

    expect(await t.tree()).toEqual(['ecc/common/coding-style.md', 'ecc/common/testing.md', 'ecc/security.md', 'ecc/web/coding-style.md'])
    expect(await names(t)).toEqual(['ecc/common/coding-style', 'ecc/common/testing', 'ecc/web/coding-style', 'ecc/security'])
    expect((await t.lock()).ruleSources[0].rules).toEqual([
      'common/coding-style',
      'common/testing',
      'python/coding-style',
      'security',
      'web/coding-style',
    ])
  })

  it('excludes folders and single rules', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, exclude: [python, common/testing] }]`) }, { [REPO]: FULL })

    await t.run()

    expect(await t.tree()).toEqual(['ecc/common/coding-style.md', 'ecc/security.md', 'ecc/web/coding-style.md'])
  })

  it('reports a selected path the source does not have, and only notes an excluded one', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[{ source: ${REPO}, rules: [common, rust] }]`) })

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'ecc/rust', reason: 'missing-rule' })])
    expect(await t.tree()).toEqual(['ecc/common/coding-style.md', 'ecc/common/testing.md'])

    await t.setConfig(config(`[{ source: ${REPO}, exclude: [rust] }]`))
    const excluded = await t.run()
    expect(excluded.conflicts).toEqual([])
    expect(excluded.notices).toContain(`agent-plugins.yaml excludes rule "rust" but ${REPO} has no such rule`)
  })

  it('removes rules that fall out of a narrowed selection, and plans it without fetching', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) }, { [REPO]: FULL })
    await t.run()

    await t.setConfig(config(`[{ source: ${REPO}, rules: [web] }]`))
    expect((await t.run('check')).actions).toEqual([
      act('remove', 'ecc/common/coding-style', 'planned'),
      act('remove', 'ecc/common/testing', 'planned'),
      act('remove', 'ecc/python/coding-style', 'planned'),
      act('remove', 'ecc/security', 'planned'),
    ])
    await t.run()

    expect(await t.tree()).toEqual(['ecc/web/coding-style.md'])
  })
})

describe('sync rules ownership', () => {
  const put = async (root: string, path: string, content: string) => {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), content)
  }

  it('adopts a hand-copied rule with the same content and reports it once', async () => {
    const t = await setup({
      'agent-plugins.yaml': config(`[${REPO}]`),
      '.claude/rules/ecc/common/testing.md': ECC['rules/common/testing.md'],
    })

    const report = await t.run()

    expect(report.conflicts).toEqual([])
    expect(report.actions).toEqual([act('install', 'ecc/common/coding-style'), act('install', 'ecc/web/coding-style')])
    expect(report.notices).toContain('ap now manages rule "ecc/common/testing", which was set up by hand')
    expect((await t.lock()).rules.map((r: { name: string }) => r.name)).toContain('ecc/common/testing')
    expect((await t.run()).notices).not.toContain('ap now manages rule "ecc/common/testing", which was set up by hand')
  })

  it('keeps a hand-written rule at the same path until --force', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`), '.claude/rules/ecc/common/testing.md': '# My testing\n' })

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'ecc/common/testing', reason: 'manual-entry' })])
    expect(await t.read('.claude/rules/ecc/common/testing.md')).toBe('# My testing\n')

    expect((await t.run('apply', { force: true })).actions).toEqual([act('install', 'ecc/common/testing')])
    expect(await t.read('.claude/rules/ecc/common/testing.md')).toBe(ECC['rules/common/testing.md'])
  })

  it('reports a managed rule edited on disk, on update and on removal, until --force', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    await put(t.cwd, '.claude/rules/ecc/common/testing.md', '# Edited\n')

    await t.sources.publish(REPO, { ...ECC, 'rules/common/testing.md': '# Testing v2\n' })
    const update = await t.run('apply', { update: true })
    expect(update.conflicts).toEqual([expect.objectContaining({ name: 'ecc/common/testing', reason: 'modified-rule' })])
    expect(await t.read('.claude/rules/ecc/common/testing.md')).toBe('# Edited\n')

    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    const removal = await t.run()
    expect(removal.conflicts).toEqual([expect.objectContaining({ name: 'ecc/common/testing', reason: 'modified-rule' })])
    expect(await t.read('.claude/rules/ecc/common/testing.md')).toBe('# Edited\n')

    expect((await t.run('apply', { force: true })).actions).toContainEqual(act('remove', 'ecc/common/testing'))
    expect(await t.tree()).toEqual([])
  })

  it('never touches a file the user added inside the namespace', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`), '.claude/rules/ecc/web/mine.md': '# Mine\n' })

    expect((await t.run()).conflicts).toEqual([])
    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    await t.run()

    expect(await t.tree()).toEqual(['ecc/web/mine.md'])
  })

  it('treats a symlinked namespace as a manual entry and never writes through it', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    const checkout = await makeTree({ 'common/testing.md': ECC['rules/common/testing.md'], 'notes.md': '# Notes\n' })
    await mkdir(join(t.cwd, '.claude/rules'), { recursive: true })
    await symlink(checkout, join(t.cwd, '.claude/rules/ecc'))

    const report = await t.run()

    expect(report.actions).toEqual([])
    expect(report.conflicts.map((c) => [c.name, c.reason])).toEqual([
      ['ecc/common/coding-style', 'manual-entry'],
      ['ecc/common/testing', 'manual-entry'],
      ['ecc/web/coding-style', 'manual-entry'],
    ])
    expect(report.conflicts[0]!.detail).toContain('symlinked namespace')
    expect(await t.tree(checkout)).toEqual(['common/testing.md', 'notes.md'])

    await t.run('apply', { force: true })
    expect((await lstat(join(t.cwd, '.claude/rules/ecc'))).isSymbolicLink()).toBe(false)
    expect(await t.tree()).toEqual(['ecc/common/coding-style.md', 'ecc/common/testing.md', 'ecc/web/coding-style.md'])
    expect(await t.tree(checkout)).toEqual(['common/testing.md', 'notes.md'])
  })

  it('forgets managed rules whose namespace was replaced by a symlink, without deleting through it', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    await t.run()
    const checkout = await makeTree({ 'common/testing.md': '# My fork\n' })
    await rm(join(t.cwd, '.claude/rules/ecc'), { recursive: true })
    await symlink(checkout, join(t.cwd, '.claude/rules/ecc'))

    await t.setConfig('kind: Config\nmetadata: { name: demo }\nspec: {}\n')
    const report = await t.run()

    expect(report).toMatchObject({ actions: [], conflicts: [] })
    expect((await t.lock()).rules).toBeUndefined()
    expect(await t.tree(checkout)).toEqual(['common/testing.md'])
  })

  it('leaves a symlinked rule file alone when it matches, and reports it when it differs', async () => {
    const t = await setup({ 'agent-plugins.yaml': config(`[${REPO}]`) })
    const same = await makeTree({ 'testing.md': ECC['rules/common/testing.md'] })
    const other = await makeTree({ 'style.md': '# Other style\n' })
    await mkdir(join(t.cwd, '.claude/rules/ecc/common'), { recursive: true })
    await symlink(join(same, 'testing.md'), join(t.cwd, '.claude/rules/ecc/common/testing.md'))
    await symlink(join(other, 'style.md'), join(t.cwd, '.claude/rules/ecc/common/coding-style.md'))

    const report = await t.run()

    expect(report.conflicts).toEqual([expect.objectContaining({ name: 'ecc/common/coding-style', reason: 'manual-entry' })])
    expect(report.actions).toEqual([act('install', 'ecc/web/coding-style')])
    expect((await t.lock()).rules.map((r: { name: string }) => r.name)).toEqual(['ecc/web/coding-style'])
    expect(await readFile(join(other, 'style.md'), 'utf8')).toBe('# Other style\n')
  })
})
