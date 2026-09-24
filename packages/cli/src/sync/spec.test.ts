import { describe, expect, it } from 'vitest'
import { presetRefs, readDeclarations, type McpCatalog, type PresetDocument } from './spec.js'

const at = { origin: 'demo.yaml', dir: '/unused' }
const noCatalog: McpCatalog = async () => {
  throw new Error('catalog not expected')
}
const read = (spec: PresetDocument['spec'], catalog = noCatalog) => readDeclarations({ spec }, at, catalog)

describe('readDeclarations', () => {
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
})
