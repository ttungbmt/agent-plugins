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
  it('rejects a marketplace list item that is not a source string', async () => {
    await expect(
      resolveIn({
        'agent-plugins.yaml': `
kind: Config
metadata: { name: demo }
spec:
  marketplaces:
    - source: anthropics/claude-plugins-official
      scope: global
`,
      }),
    ).rejects.toThrow(/agent-plugins\.yaml: `marketplaces` list items must be source strings.*name: \{ source \}/)
  })

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
  extends: [./common.yaml]
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
        'a.yaml': 'kind: Preset\nmetadata: { name: a }\nspec:\n  extends: [./b.yaml]\n',
        'b.yaml': 'kind: Preset\nmetadata: { name: b }\nspec:\n  extends: ./a.yaml\n',
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
      [REMOTE]: 'kind: Preset\nmetadata: { name: remote }\nspec:\n  extends: ./common.yaml\n  marketplaces: [acme/remote-plugins]\n',
      [COMMON]: 'kind: Preset\nmetadata: { name: common }\nspec: {}\n',
    }
    const REMOTE_SHA = '91d9d5d164c29225cc85b920b5243a74205ffc4ab0329c4b78dbcd26a0134f3e'
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
  describe('plugins', () => {
    const OFFICIAL_MAP = `
  marketplaces:
    claude-plugins-official:
      source: { source: github, repo: anthropics/claude-plugins-official }`

    it('merges plugin declarations parent first, then child, then Config, the later value winning', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': `
kind: Config
metadata: { name: demo }
spec:
  presets: [./team.yaml]
  plugins:
    lsp@claude-plugins-official: true
`,
        'team.yaml': `
kind: Preset
metadata: { name: team }
spec:
  extends: base
  plugins:
    context7@claude-plugins-official: false
    lsp@claude-plugins-official: false
`,
        'default-presets/base.yaml': `
kind: Preset
metadata: { name: base }
spec:${OFFICIAL_MAP}
  plugins: [context7@claude-plugins-official, review@claude-plugins-official]
`,
      })

      expect(result.conflicts).toEqual([])
      expect(result.plugins).toEqual([
        { id: 'context7@claude-plugins-official', marketplace: 'claude-plugins-official', enabled: false, origin: 'team.yaml' },
        { id: 'review@claude-plugins-official', marketplace: 'claude-plugins-official', enabled: true, origin: 'base' },
        { id: 'lsp@claude-plugins-official', marketplace: 'claude-plugins-official', enabled: true, origin: 'agent-plugins.yaml' },
      ])
    })

    it('keeps a plugin whose marketplace is declared but clashing, so sync can hold it', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': `
kind: Config
metadata: { name: demo }
spec:
  presets: [./a.yaml, ./b.yaml]
  plugins: [context7@mkt]
`,
        'a.yaml': 'kind: Preset\nmetadata: { name: a }\nspec:\n  marketplaces:\n    mkt: { source: { source: github, repo: a/mkt } }\n',
        'b.yaml': 'kind: Preset\nmetadata: { name: b }\nspec:\n  marketplaces:\n    mkt: { source: { source: github, repo: b/mkt } }\n',
      })

      expect(result.conflicts.map((c) => c.reason)).toEqual(['preset-clash'])
      expect(result.plugins.map((p) => p.id)).toEqual(['context7@mkt'])
    })

    it('rejects a plugin reference without an @marketplace suffix', async () => {
      await expect(
        resolveIn({ 'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  plugins: [context7]\n' }),
      ).rejects.toThrow(/context7.*name@marketplace/)
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

    it('reads a shorthand path relative to the preset that declares it, like the map form', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  presets: [./presets/team.yaml]\n',
        'presets/team.yaml': 'kind: Preset\nmetadata: { name: team }\nspec:\n  marketplaces:\n    - ./mk/\n',
        'presets/mk/.claude-plugin/marketplace.json': '{}',
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
  describe('preset inheritance (extends)', () => {
    const cfg = (presets: string) => `kind: Config\nmetadata: { name: demo }\nspec:\n  presets: ${presets}\n`
    const preset = (name: string, body: string) => `kind: Preset\nmetadata: { name: ${name} }\nspec:\n${body}`
    const official = (repo: string, extra = '') =>
      `  marketplaces:\n    claude-plugins-official: { source: { source: github, repo: ${repo} }${extra} }\n`

    it('lets a local preset extend a default preset by bare name', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': cfg('[./team.yaml]'),
        'team.yaml': preset('team', '  extends: base\n  marketplaces: [acme/team]\n'),
        'default-presets/base.yaml': preset('base', official('anthropics/claude-plugins-official')),
      })

      expect(result.declarations.map((d) => d.origin)).toEqual(['base', 'team.yaml'])
    })

    it('rejects `presets` in a Preset and `extends` in a Config', async () => {
      await expect(
        resolveIn({ 'agent-plugins.yaml': cfg('[./team.yaml]'), 'team.yaml': preset('team', '  presets: [base]\n') }),
      ).rejects.toThrow(/team\.yaml: a Preset inherits with `spec\.extends`/)
      await expect(
        resolveIn({ 'agent-plugins.yaml': 'kind: Config\nmetadata: { name: demo }\nspec:\n  extends: base\n' }),
      ).rejects.toThrow(/agent-plugins\.yaml: a Config selects presets with `spec\.presets`/)
    })

    it('lets a child preset replace a parent declaration entirely, with a notice', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': cfg('[./child.yaml]'),
        'child.yaml': preset('child', '  extends: ./parent.yaml\n' + official('anthropics/claude-plugins-official')),
        'parent.yaml': preset('parent', official('anthropics/claude-plugins-official', ', autoUpdate: true')),
      })

      expect(result.conflicts).toEqual([])
      expect(result.declarations).toEqual([
        expect.objectContaining({ name: 'claude-plugins-official', extras: {}, origin: 'child.yaml' }),
      ])
      expect(result.notices).toEqual(['child.yaml overrides "claude-plugins-official" declared by parent.yaml'])
    })

    it('loads a shared parent once and still lets every preset that extends it override it', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': cfg('[./x.yaml, ./y.yaml]'),
        'x.yaml': preset('x', '  extends: ./base.yaml\n'),
        'y.yaml': preset('y', '  extends: ./base.yaml\n' + official('someone/fork')),
        'base.yaml': preset('base', official('anthropics/claude-plugins-official')),
      })

      expect(result.conflicts).toEqual([])
      expect(result.declarations).toEqual([
        expect.objectContaining({ source: { source: 'github', repo: 'someone/fork' }, origin: 'y.yaml' }),
      ])
    })

    it('still reports a clash between presets that do not extend one another', async () => {
      const result = await resolveIn({
        'agent-plugins.yaml': cfg('[./x.yaml, ./y.yaml]'),
        'x.yaml': preset('x', '  extends: ./base.yaml\n' + official('acme/one')),
        'y.yaml': preset('y', '  extends: ./base.yaml\n' + official('acme/two')),
        'base.yaml': preset('base', official('anthropics/claude-plugins-official')),
      })

      expect(result.declarations).toEqual([])
      expect(result.conflicts).toEqual([expect.objectContaining({ name: 'claude-plugins-official', reason: 'preset-clash' })])
    })
  })

  describe('hooks', () => {
    const cfg = (hooks: string) => ({ 'agent-plugins.yaml': `kind: Config\nmetadata: { name: demo }\nspec:\n  hooks: ${hooks}\n` })

    it('reads a map of named hook groups, keeping handlers as written and dropping `false`', async () => {
      const result = await resolveIn(
        cfg(`{ fmt: { event: PostToolUse, matcher: "Edit|Write", hooks: [{ type: command, command: prettier, x: 1 }] }, gone: false }`),
      )

      expect(result.hooks).toEqual([
        {
          name: 'fmt',
          group: { event: 'PostToolUse', matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'prettier', x: 1 }] },
          origin: 'agent-plugins.yaml',
        },
      ])
    })

    it('accepts every handler type with its required fields', async () => {
      const result = await resolveIn(
        cfg(`{ all: { event: Stop, hooks: [
          { type: command, command: a },
          { type: http, url: "https://x" },
          { type: mcp_tool, server: s, tool: t },
          { type: prompt, prompt: p },
          { type: agent, prompt: p } ] } }`),
      )

      expect(result.hooks[0]!.group.hooks).toHaveLength(5)
    })

    it.each([
      ['[a]', '`hooks` must be a map of hook names'],
      ['{ fmt: true }', 'hook "fmt" cannot be true: ap has no hook catalog yet'],
      ['{ fmt: { hooks: [{ type: command, command: a }] } }', 'hook "fmt" needs an `event` string'],
      ['{ fmt: { event: Stop } }', 'hook "fmt" needs a non-empty `hooks` list of handlers'],
      ['{ fmt: { event: Stop, hooks: [] } }', 'hook "fmt" needs a non-empty `hooks` list of handlers'],
      ['{ fmt: { event: Stop, matcher: 1, hooks: [{ type: command, command: a }] } }', '`matcher` of hook "fmt" must be a string'],
      ['{ fmt: { event: Stop, hooks: [{ type: command, command: a }], name: x } }', 'hook "fmt" has unknown key `name`'],
      ['{ fmt: { event: Stop, hooks: [{ command: a }] } }', 'handler 1 of hook "fmt" needs a `type`: command, http, mcp_tool, prompt or agent'],
      ['{ fmt: { event: Stop, hooks: [{ type: shell, command: a }] } }', 'handler 1 of hook "fmt" needs a `type`: command, http, mcp_tool, prompt or agent'],
      ['{ fmt: { event: Stop, hooks: [{ type: command, command: a }, { type: http }] } }', 'handler 2 of hook "fmt" (http) needs `url`'],
      ['{ fmt: { event: Stop, hooks: [{ type: mcp_tool, server: s }] } }', 'handler 1 of hook "fmt" (mcp_tool) needs `tool`'],
      ['{ fmt: { event: Stop, hooks: [{ type: agent }] } }', 'handler 1 of hook "fmt" (agent) needs `prompt`'],
    ])('rejects %s', async (hooks, message) => {
      await expect(resolveIn(cfg(hooks))).rejects.toThrow(`agent-plugins.yaml: ${message}`)
    })
  })

  describe('spec.rules', () => {
    const cfg = (rules: string) => ({ 'agent-plugins.yaml': `kind: Config\nmetadata: { name: demo }\nspec:\n  rules: ${rules}\n` })

    it('reads a bare source, a selection of paths and an exclusion', async () => {
      const result = await resolveIn(
        cfg('[acme/ECC, { source: acme/toolkit, path: claude/rules, rules: [security, web] }, { source: acme/other, exclude: [python] }]'),
      )

      expect(result.items.rule.map(({ source, select }) => ({ source, select }))).toEqual([
        { source: { source: 'github', repo: 'acme/ECC' }, select: { exclude: [] } },
        { source: { source: 'github', repo: 'acme/toolkit', path: 'claude/rules' }, select: ['security', 'web'] },
        { source: { source: 'github', repo: 'acme/other' }, select: { exclude: ['python'] } },
      ])
    })

    it.each([
      ['acme/ECC', '`rules` must be a list of rule sources'],
      ['[{ source: acme/ECC, rules: [common], exclude: [web] }]', '"acme/ECC" cannot have both `rules` and `exclude`'],
      ['[{ source: acme/ECC, rules: [] }]', '`rules` of "acme/ECC" must be a non-empty list of rule names'],
      ['[{ source: acme/ECC, exclude: [] }]', '`exclude` of "acme/ECC" must be a non-empty list of rule names'],
      ['[{ source: acme/ECC, path: ../rules }]', '`path` of "acme/ECC" must be a relative path inside the source'],
    ])('rejects %s', async (rules, message) => {
      await expect(resolveIn(cfg(rules))).rejects.toThrow(`agent-plugins.yaml: ${message}`)
    })
  })
})
