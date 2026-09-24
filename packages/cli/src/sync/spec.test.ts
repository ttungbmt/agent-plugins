import { describe, expect, it } from 'vitest'
import { ConfigError } from './errors.js'
import { presetRefs, readDeclarations, type McpCatalog, type PresetDocument } from './spec.js'

const at = { origin: 'demo.yaml', dir: '/unused' }
const noCatalog: McpCatalog = async () => {
  throw new Error('catalog not expected')
}
const read = (spec: PresetDocument['spec'], catalog = noCatalog) => readDeclarations({ spec }, at, catalog)

describe('readDeclarations', () => {
  it('names a list entry that is itself a list as "undefined" (ADR 0016 keeps arrays counting as objects here)', async () => {
    await expect(read({ plugins: [['a']] } as never)).rejects.toThrow('demo.yaml: plugin "undefined" must be written as')
  })

  it('returns nothing for an empty spec', async () => {
    expect(await read(undefined)).toEqual({
      marketplaces: [],
      plugins: [],
      items: { skill: [], agent: [], rule: [], workflow: [] },
      mcpServers: [],
      hooks: [],
    })
  })

  it('reads marketplaces in map form, keeping `scope` out of the settings fields', async () => {
    const { marketplaces } = await read({ marketplaces: { acme: { source: { source: 'github', repo: 'acme/plugins' }, autoUpdate: true, scope: 'user' } } })
    expect(marketplaces).toEqual([
      { name: 'acme', source: { source: 'github', repo: 'acme/plugins' }, extras: { autoUpdate: true }, scope: 'user', origin: 'demo.yaml' },
    ])
  })

  it('rejects a marketplace field that settings do not know', async () => {
    await expect(read({ marketplaces: { acme: { source: { source: 'github', repo: 'acme/plugins' }, colour: 'red' } } })).rejects.toThrow(
      'demo.yaml: marketplace "acme" has unknown field "colour"',
    )
  })

  it('reads plugins as a list or a map', async () => {
    const { plugins } = await read({ plugins: { 'a@acme': false, 'b@acme': { enabled: true, scope: 'user' } } })
    expect(plugins).toEqual([
      { id: 'a@acme', marketplace: 'acme', enabled: false, origin: 'demo.yaml' },
      { id: 'b@acme', marketplace: 'acme', enabled: true, scope: 'user', origin: 'demo.yaml' },
    ])
    expect((await read({ plugins: ['c@acme'] })).plugins).toEqual([{ id: 'c@acme', marketplace: 'acme', enabled: true, origin: 'demo.yaml' }])
  })

  it('rejects a plugin field it does not know', async () => {
    await expect(read({ plugins: { 'a@acme': { enabled: true, pin: 'v1' } } })).rejects.toThrow('demo.yaml: plugin "a@acme" has unknown field "pin"')
  })

  it('reads items of every kind, tagged with the origin', async () => {
    const { items } = await read({
      skills: [{ source: 'acme/skills', skills: ['tdd'], scope: 'user' }],
      rules: [{ source: 'acme/rules', exclude: ['web'] }],
    })
    expect(items.skill).toEqual([{ source: { source: 'github', repo: 'acme/skills' }, select: ['tdd'], scope: 'user', origin: 'demo.yaml' }])
    expect(items.rule).toEqual([{ source: { source: 'github', repo: 'acme/rules' }, select: { exclude: ['web'] }, origin: 'demo.yaml' }])
    expect(items.agent).toEqual([])
  })

  it('rejects an item entry key it does not know', async () => {
    await expect(read({ agents: [{ source: 'acme/agents', only: ['x'] }] })).rejects.toThrow('demo.yaml: "acme/agents" has unknown key `only`')
  })

  it('reads MCP servers inline, from the catalog, or dropped', async () => {
    const catalog = async () => ({ fetch: { command: 'uvx', args: ['mcp-server-fetch'] } })
    const { mcpServers } = await read({ mcpServers: { fetch: true, local: { command: 'node', args: ['server.js'] }, old: false } }, catalog)
    expect(mcpServers).toEqual([
      { name: 'fetch', server: { command: 'uvx', args: ['mcp-server-fetch'] }, origin: 'demo.yaml' },
      { name: 'local', server: { command: 'node', args: ['server.js'] }, origin: 'demo.yaml' },
      { name: 'old', server: null, origin: 'demo.yaml' },
    ])
  })

  it('only reads the MCP catalog for a server taken from it', async () => {
    await expect(read({ mcpServers: { local: { command: 'node' } } })).resolves.toBeDefined()
  })

  it('rejects an MCP server missing from the catalog', async () => {
    await expect(read({ mcpServers: { nope: true } }, async () => ({}))).rejects.toThrow('demo.yaml: MCP server "nope" is not in the ap catalog')
  })

  it('reads hooks and drops those set to false', async () => {
    const group = { event: 'Stop', hooks: [{ type: 'command', command: 'echo done' }] }
    const { hooks } = await read({ hooks: { done: group, old: false } })
    expect(hooks).toEqual([{ name: 'done', group, origin: 'demo.yaml' }])
  })

  it('rejects a hook set to true', async () => {
    await expect(read({ hooks: { done: true } })).rejects.toThrow('demo.yaml: hook "done" cannot be true')
  })
})

describe('readDeclarations: inputs the hand-written parser let through or crashed on (ADR 0015)', () => {
  const github = { source: 'github', repo: 'acme/plugins' }

  it.each([
    ['a null marketplace entry', { marketplaces: { acme: null } }, 'demo.yaml: marketplace "acme" must be { source, autoUpdate, scope }'],
    ['a marketplace with no source', { marketplaces: { acme: { autoUpdate: true } } }, 'demo.yaml: marketplace "acme" needs a `source` map with a `source` type'],
    ['a marketplace whose source is a string', { marketplaces: { acme: { source: 'acme/x' } } }, 'demo.yaml: marketplace "acme" needs a `source` map with a `source` type'],
    ['a non-boolean autoUpdate', { marketplaces: { acme: { source: github, autoUpdate: 'yes' } } }, 'demo.yaml: `autoUpdate` of marketplace "acme" must be true or false'],
    ['marketplaces as a string', { marketplaces: 'x' }, 'demo.yaml: `marketplaces` must be a list of sources or a map of names to { source }'],
    ['a null item entry', { skills: [null] }, 'demo.yaml: each skill entry needs a `source` string'],
    ['a spec that is not a map', 'oops', 'demo.yaml: `spec` must be a map'],
    ['plugins: false', { plugins: false }, 'demo.yaml: `plugins` must be a list of name@marketplace or a map of them'],
    ['plugins as a string', { plugins: 'foo@bar' }, 'demo.yaml: `plugins` must be a list of name@marketplace or a map of them'],
  ])('rejects %s', async (_, spec, message) => {
    await expect(read(spec as PresetDocument['spec'])).rejects.toThrow(message)
  })

  it('reports a mistyped field as unknown before the field it was meant to be', async () => {
    await expect(read({ plugins: { 'a@acme': { enable: true } } })).rejects.toThrow('demo.yaml: plugin "a@acme" has unknown field "enable"')
  })

  it('reports shape errors in section order', async () => {
    await expect(read({ marketplaces: { m: { source: github, colour: 1 } }, plugins: { 'a@acme': { enable: true } } })).rejects.toThrow(
      'demo.yaml: marketplace "m" has unknown field "colour"',
    )
  })

  it('names the handler and field a hook is missing', async () => {
    await expect(read({ hooks: { h: { event: 'Stop', hooks: [{ type: 'command', command: 'x' }, { type: 'command' }] } } })).rejects.toThrow(
      'demo.yaml: handler 2 of hook "h" (command) needs `command`',
    )
    await expect(read({ hooks: { h: { event: 'Stop', hooks: [null] } } })).rejects.toThrow(
      'demo.yaml: handler 1 of hook "h" needs a `type`: command, http, mcp_tool, prompt or agent',
    )
    await expect(read({ hooks: { h: { event: 'Stop', hooks: [], when: 1 } } })).rejects.toThrow(
      'demo.yaml: hook "h" has unknown key `when`; a hook has only event, matcher and hooks',
    )
  })

  it('keeps a hook group exactly as written, handler field order included', async () => {
    const group = { hooks: [{ timeout: 5, command: 'echo done', type: 'command' }], event: 'Stop' }
    const { hooks } = await read({ hooks: { done: group } })
    expect(JSON.stringify(hooks[0]!.group)).toBe(JSON.stringify(group))
  })

  // zod/mini loads no locale, so a schema node without a message of its own would surface as "Invalid input".
  it.each([
    { marketplaces: { acme: 1 } },
    { marketplaces: [1] },
    { plugins: { 'a@acme': 'yes' } },
    { plugins: ['nope'] },
    { plugins: { 'a@acme': { enabled: true, scope: 'project' } } },
    { skills: { a: 1 } },
    { skills: [1] },
    { skills: [{ source: 'acme/skills', skills: 'tdd' }] },
    { skills: [{ source: 'acme/skills', path: 1 }] },
    { rules: [{ source: 'acme/rules', rules: [] }] },
    { mcpServers: ['a'] },
    { mcpServers: { a: 1 } },
    { mcpServers: { a: { scope: 'project' } } },
    { hooks: [] },
    { hooks: { h: 1 } },
    { hooks: { h: { event: '', hooks: [] } } },
    { hooks: { h: { event: 'Stop', matcher: 1, hooks: [{ type: 'command', command: 'x' }] } } },
    { hooks: { h: { event: 'Stop', hooks: [{ type: 'shell' }] } } },
  ])('never reports "Invalid input" (%j)', async (spec) => {
    const error = await read(spec as PresetDocument['spec']).then(() => null, (e: Error) => e)
    expect(error?.message).toMatch(/^demo\.yaml: /)
    expect(error?.message).not.toContain('Invalid input')
  })
})

describe('readDeclarations: every error of a file (ADR 0015)', () => {
  const messages = (spec: PresetDocument['spec'], catalog = noCatalog) =>
    read(spec, catalog).then(
      () => [],
      (e: ConfigError) => e.messages,
    )

  it('reports every shape error, entries in file order and each entry\'s unknown keys first', async () => {
    expect(
      await messages({
        marketplaces: { m: { source: { source: 'github', repo: 'acme/plugins' }, colour: 'red' } },
        plugins: { 'a@acme': { enable: true } },
        hooks: { h: true },
      }),
    ).toEqual([
      'demo.yaml: marketplace "m" has unknown field "colour"',
      'demo.yaml: plugin "a@acme" has unknown field "enable"',
      'demo.yaml: plugin "a@acme" must set `enabled` to true or false',
      'demo.yaml: hook "h" cannot be true: ap has no hook catalog yet; declare the hook inline',
    ])
  })

  it('reports only the shape errors while there are any, not the semantic ones', async () => {
    expect(await messages({ skills: ['not a source!'], hooks: { h: true } })).toEqual([
      'demo.yaml: hook "h" cannot be true: ap has no hook catalog yet; declare the hook inline',
    ])
  })

  it('reports every semantic error in entry order, however long each check takes', async () => {
    // `./missing` fails only after an async `stat`; the next entry fails at once, yet is still reported second.
    expect(await messages({ skills: ['./missing', 'not a source!'], mcpServers: { nope: true } }, async () => ({}))).toEqual([
      'demo.yaml: skill path "./missing" does not exist',
      'demo.yaml: unrecognised skill source "not a source!"; try owner/repo, https://..., git@host:path or ./path',
      'demo.yaml: MCP server "nope" is not in the ap catalog; declare its configuration inline',
    ])
  })

  it('keeps one error as one message', async () => {
    const error = await read({ plugins: ['nope'] }).catch((e: ConfigError) => e)
    expect(error).toBeInstanceOf(ConfigError)
    expect((error as ConfigError).message).toBe('demo.yaml: plugin "nope" must be written as name@marketplace')
  })
})

describe('presetRefs', () => {
  it('takes `spec.presets` from a Config and `spec.extends` from a Preset, as one ref or a list', () => {
    expect(presetRefs({ spec: { presets: 'base' } }, 'Config', 'c.yaml')).toEqual(['base'])
    expect(presetRefs({ spec: { extends: ['a', 'b'] } }, 'Preset', 'p.yaml')).toEqual(['a', 'b'])
    expect(presetRefs({}, 'Config', 'c.yaml')).toEqual([])
  })

  it('rejects the key that belongs to the other kind', () => {
    expect(() => presetRefs({ spec: { extends: 'base' } }, 'Config', 'c.yaml')).toThrow('c.yaml: a Config selects presets with `spec.presets`')
    expect(() => presetRefs({ spec: { presets: 'base' } }, 'Preset', 'p.yaml')).toThrow('p.yaml: a Preset inherits with `spec.extends`')
  })

  it('rejects `spec.hooks` in a Preset', () => {
    expect(() => presetRefs({ spec: { hooks: {} } }, 'Preset', 'p.yaml')).toThrow('p.yaml: unknown key `spec.hooks`')
  })

  it('reads a `spec` written as a list by its indexes, so the first one is an unknown key', () => {
    expect(() => presetRefs({ spec: ['a'] } as PresetDocument, 'Config', 'c.yaml')).toThrow(
      "c.yaml: unknown key `spec.0`; a Config's spec takes presets, ",
    )
  })

  it('rejects a reference that is not a string', () => {
    expect(() => presetRefs({ spec: { presets: [1] } }, 'Config', 'c.yaml')).toThrow('c.yaml: `spec.presets` must be a preset reference or a list of them')
    expect(() => presetRefs({ spec: { extends: { a: 1 } } }, 'Preset', 'p.yaml')).toThrow('p.yaml: `spec.extends` must be a preset reference or a list of them')
  })
})
