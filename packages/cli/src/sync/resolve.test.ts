import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from './resolve.js'
import { makeTree } from './test-helpers.js'

const noFetch = async () => {
  throw new Error('network not expected')
}

async function resolveIn(files: Record<string, string>, extra: Partial<Parameters<typeof resolveConfig>[1]> = {}) {
  const root = await makeTree(files)
  return resolveConfig(join(root, 'agent-plugins.yaml'), {
    fetch: noFetch,
    pins: {},
    update: false,
    cacheDir: join(root, '.agent-plugins/cache'),
    defaultPresetsDir: join(root, 'default-presets'),
    ...extra,
  })
}

describe('resolveConfig', () => {
  it('reads marketplaces declared as a map in the Config', async () => {
    const result = await resolveIn({
      'agent-plugins.yaml': `
kind: Config
metadata: { name: demo }
spec:
  marketplaces:
    claude-plugins-official:
      source: { source: github, repo: anthropics/claude-plugins-official }
      autoUpdate: true
`,
    })

    expect(result.conflicts).toEqual([])
    expect(result.declarations).toEqual([
      {
        name: 'claude-plugins-official',
        source: { source: 'github', repo: 'anthropics/claude-plugins-official' },
        extras: { autoUpdate: true },
        origin: 'agent-plugins.yaml',
      },
    ])
  })
  it('resolves a built-in preset by bare name and normalises owner/repo shorthand', async () => {
    const result = await resolveIn({
      'agent-plugins.yaml': `
kind: Config
metadata: { name: demo }
spec:
  presets: [base]
`,
      'default-presets/base.yaml': `
kind: Preset
metadata: { name: base }
spec:
  marketplaces:
    - anthropics/claude-plugins-official
`,
    })

    expect(result.declarations).toEqual([
      {
        name: null,
        source: { source: 'github', repo: 'anthropics/claude-plugins-official' },
        extras: {},
        origin: 'base',
      },
    ])
  })

  it('rejects a built-in preset whose metadata.name differs from its file name', async () => {
    await expect(
      resolveIn({
        'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [base]\n',
        'default-presets/base.yaml': 'kind: Preset\nmetadata: { name: agent-plugins }\nspec: {}\n',
      }),
    ).rejects.toThrow(/metadata\.name "agent-plugins".*"base"/)
  })

  it('rejects an unknown built-in preset', async () => {
    await expect(
      resolveIn({ 'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [nope]\n' }),
    ).rejects.toThrow(/unknown preset "nope"/)
  })
  it('resolves local presets relative to the file that references them, parents first', async () => {
    const result = await resolveIn({
      'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./presets/team.yaml]\n',
      'presets/team.yaml': `
kind: Preset
metadata: { name: team }
spec:
  presets: [./common.yaml]
  marketplaces: [acme/team-plugins]
`,
      'presets/common.yaml': 'kind: Preset\nmetadata: { name: common }\nspec:\n  marketplaces: [acme/common-plugins]\n',
    })

    expect(result.declarations.map((d) => [d.source.repo, d.origin])).toEqual([
      ['acme/common-plugins', 'presets/common.yaml'],
      ['acme/team-plugins', 'presets/team.yaml'],
    ])
  })

  it('rejects a cycle between presets', async () => {
    await expect(
      resolveIn({
        'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml]\n',
        'a.yaml': 'kind: Preset\nmetadata: { name: a }\nspec:\n  presets: [./b.yaml]\n',
        'b.yaml': 'kind: Preset\nmetadata: { name: b }\nspec:\n  presets: [./a.yaml]\n',
      }),
    ).rejects.toThrow(/cycle: a.yaml -> b.yaml -> a.yaml/)
  })
  describe('when the same marketplace is declared twice', () => {
    const preset = (name: string, url: string) =>
      `kind: Preset\nmetadata: { name: ${name} }\nspec:\n  marketplaces:\n    shared: { source: { source: git, url: "${url}" } }\n`

    it('merges identical declarations from two presets', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml, ./b.yaml]\n',
        'a.yaml': preset('a', 'https://x/shared.git'),
        'b.yaml': preset('b', 'https://x/shared.git'),
      })

      expect(result.conflicts).toEqual([])
      expect(result.declarations).toHaveLength(1)
    })

    it('reports a preset clash when two presets disagree on the source', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml, ./b.yaml]\n',
        'a.yaml': preset('a', 'https://x/one.git'),
        'b.yaml': preset('b', 'https://x/two.git'),
      })

      expect(result.declarations).toEqual([])
      expect(result.conflicts).toEqual([{ name: 'shared', reason: 'preset-clash', detail: expect.stringMatching(/a\.yaml.*b\.yaml/) }])
    })

    it('lets the Config override a preset', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': `
kind: Config
metadata: { name: demo }
spec:
  presets: [./a.yaml]
  marketplaces:
    shared: { source: { source: git, url: "https://x/mine.git" } }
`,
        'a.yaml': preset('a', 'https://x/one.git'),
      })

      expect(result.conflicts).toEqual([])
      expect(result.declarations).toEqual([
        expect.objectContaining({ name: 'shared', source: { source: 'git', url: 'https://x/mine.git' }, origin: 'agent-plugins.yaml' }),
      ])
    })
  })
  describe('remote presets', () => {
    const REMOTE = 'https://example.com/presets/remote.yaml'
    const COMMON = 'https://example.com/presets/common.yaml'
    const pages: Record<string, string> = {
      [REMOTE]: 'kind: Preset\nmetadata: { name: remote }\nspec:\n  presets: [./common.yaml]\n  marketplaces: [acme/remote-plugins]\n',
      [COMMON]: 'kind: Preset\nmetadata: { name: common }\nspec: {}\n',
    }
    const REMOTE_SHA = 'b548644c1903f470154a600ca5836e112263beb50a04b5d4c927e02ccd11d3a2'
    const COMMON_SHA = '5011e0f7e395af515ec308a72e1ed87403daa593ac89d48fdc25394461275c14'
    const web = async (url: string) => {
      const page = pages[url]
      if (page === undefined) throw new Error(`404 ${url}`)
      return page
    }
    const config = `kind: Config\nmetadata: { name: demo }\nspec:\n  presets: ["${REMOTE}"]\n`

    it('fetches presets over https, resolving relative references against the URL, and pins their content', async () => {
      const result = await resolveIn({ 'agent-plugins.yaml': config }, { fetch: web })

      expect(result.declarations).toEqual([
        { name: null, source: { source: 'github', repo: 'acme/remote-plugins' }, extras: {}, origin: REMOTE },
      ])
      expect(result.pins).toEqual({ [REMOTE]: REMOTE_SHA, [COMMON]: COMMON_SHA })
    })

    it('refuses a remote preset whose content changed since it was pinned', async () => {
      await expect(
        resolveIn({ 'agent-plugins.yaml': config }, { fetch: web, pins: { [REMOTE]: 'deadbeef', [COMMON]: COMMON_SHA } }),
      ).rejects.toThrow(/remote.yaml changed.*--update/)
    })

    it('accepts changed content with --update', async () => {
      const result = await resolveIn(
        { 'agent-plugins.yaml': config },
        { fetch: web, pins: { [REMOTE]: 'deadbeef' }, update: true },
      )

      expect(result.pins[REMOTE]).toBe(REMOTE_SHA)
    })

    it('falls back to the cache when offline', async () => {
      const root = await makeTree({ 'agent-plugins.yaml': config })
      const ctx = {
        pins: {},
        update: false,
        cacheDir: join(root, '.agent-plugins/cache'),
        defaultPresetsDir: join(root, 'default-presets'),
      }
      const online = await resolveConfig(join(root, 'agent-plugins.yaml'), { ...ctx, fetch: web })

      const offline = await resolveConfig(join(root, 'agent-plugins.yaml'), { ...ctx, pins: online.pins, fetch: noFetch })

      expect(offline.declarations).toEqual(online.declarations)
    })
  })
  it('asks for `ap init` when there is no Config', async () => {
    await expect(resolveIn({})).rejects.toThrow(/agent-plugins.yaml not found.*ap init/)
  })
  describe('review fixes', () => {
    const CONFIG_HEAD = 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml]\n'

    it('merges the extra fields of identical-source declarations from two presets, later preset first', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./a.yaml, ./b.yaml]\n',
        'a.yaml': 'kind: Preset\nmetadata: { name: a }\nspec:\n  marketplaces:\n    m: { source: { source: git, url: "https://x/m.git" }, autoUpdate: false }\n',
        'b.yaml': 'kind: Preset\nmetadata: { name: b }\nspec:\n  marketplaces:\n    m: { source: { source: git, url: "https://x/m.git" }, autoUpdate: true }\n',
      })

      expect(result.conflicts).toEqual([])
      expect(result.declarations).toEqual([expect.objectContaining({ name: 'm', extras: { autoUpdate: true } })])
    })

    it('tells when the Config overrides a preset declaration', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': CONFIG_HEAD + '  marketplaces:\n    m: { source: { source: git, url: "https://x/mine.git" } }\n',
        'a.yaml': 'kind: Preset\nmetadata: { name: a }\nspec:\n  marketplaces:\n    m: { source: { source: git, url: "https://x/m.git" } }\n',
      })

      expect(result.notices).toEqual(['agent-plugins.yaml overrides "m" declared by a.yaml'])
    })

    it('lets a Config declaration override a preset shorthand with the same source', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml':
          CONFIG_HEAD + '  marketplaces:\n    official: { source: { source: github, repo: acme/official }, autoUpdate: true }\n',
        'a.yaml': 'kind: Preset\nmetadata: { name: a }\nspec:\n  marketplaces: [acme/official]\n',
      })

      expect(result.declarations).toEqual([expect.objectContaining({ name: 'official', origin: 'agent-plugins.yaml' })])
    })

    it('lets a Config shorthand override the same shorthand from a preset', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': CONFIG_HEAD + '  marketplaces: [acme/official]\n',
        'a.yaml': 'kind: Preset\nmetadata: { name: a }\nspec:\n  marketplaces: [acme/official]\n',
      })

      expect(result.declarations).toEqual([expect.objectContaining({ name: null, origin: 'agent-plugins.yaml' })])
    })

    it('rebases directory paths declared in a local preset onto the Config directory', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./presets/team.yaml]\n',
        'presets/team.yaml': 'kind: Preset\nmetadata: { name: team }\nspec:\n  marketplaces:\n    mk: { source: { source: directory, path: ./mk } }\n',
      })

      expect(result.declarations[0]!.source).toEqual({ source: 'directory', path: './presets/mk' })
    })

    it('rejects a relative directory path in a remote preset', async () => {
      const url = 'https://example.com/p.yaml'
      const page = 'kind: Preset\nmetadata: { name: p }\nspec:\n  marketplaces:\n    mk: { source: { source: directory, path: ./mk } }\n'
      await expect(
        resolveIn(
          { 'agent-plugins.yaml': `kind: Config\nmetadata: { name: demo }\nspec:\n  presets: ["${url}"]\n` },
          { fetch: async () => page },
        ),
      ).rejects.toThrow(/relative path "\.\/mk".*remote preset/)
    })
  })
})
