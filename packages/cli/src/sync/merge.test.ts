import { describe, expect, it } from 'vitest'
import { mergeLayers, type Layer } from './merge.js'
import type { Declarations, ItemPart } from './spec.js'
import type { MarketplaceDeclaration, MarketplaceSource } from './types.js'

const github = (repo: string): MarketplaceSource => ({ source: 'github', repo })

function declarations(origin: string, d: Partial<Omit<Declarations, 'items'>> & { skills?: Omit<ItemPart, 'origin'>[] } = {}): Declarations {
  return {
    marketplaces: d.marketplaces ?? [],
    plugins: d.plugins ?? [],
    items: { skill: (d.skills ?? []).map((s) => ({ ...s, origin })), agent: [], rule: [], workflow: [] },
    mcpServers: d.mcpServers ?? [],
    hooks: d.hooks ?? [],
  }
}
const preset = (id: string, shadows: string[], d: Parameters<typeof declarations>[1]): Layer => ({
  declarations: declarations(id, d),
  presets: [id],
  shadows,
})
const config = (d: Parameters<typeof declarations>[1]): Layer => ({ declarations: declarations('config', d), presets: [null], shadows: ['*'] })
const marketplace = (name: string, repo: string, origin: string, extra: Partial<MarketplaceDeclaration> = {}): MarketplaceDeclaration => ({
  name,
  source: github(repo),
  extras: {},
  origin,
  ...extra,
})

describe('mergeLayers', () => {
  it('lets a child Preset replace its parent\'s marketplace, with a notice', () => {
    const result = mergeLayers([
      preset('parent', [], { marketplaces: [marketplace('acme', 'acme/old', 'parent')] }),
      preset('child', ['parent'], { marketplaces: [marketplace('acme', 'acme/new', 'child')] }),
      config({}),
    ])

    expect(result.declarations).toEqual([marketplace('acme', 'acme/new', 'child')])
    expect(result.notices).toEqual(['child overrides "acme" declared by parent'])
    expect(result.conflicts).toEqual([])
  })

  it('reports peer Presets declaring one marketplace with different sources as a preset-clash', () => {
    const result = mergeLayers([
      preset('a', [], { marketplaces: [marketplace('acme', 'acme/one', 'a')] }),
      preset('b', [], { marketplaces: [marketplace('acme', 'acme/two', 'b')] }),
      config({}),
    ])

    expect(result.declarations).toEqual([])
    expect(result.conflicts).toEqual([{ name: 'acme', reason: 'preset-clash', detail: '"acme" is declared differently by a and b' }])
  })

  it('lets the Config override a marketplace with the same source under another name, and settle a clash on its name', () => {
    const result = mergeLayers([
      preset('a', [], { marketplaces: [marketplace('tools', 'acme/tools', 'a'), marketplace('acme', 'acme/one', 'a')] }),
      preset('b', [], { marketplaces: [marketplace('acme', 'acme/two', 'b')] }),
      config({ marketplaces: [marketplace('mine', 'acme/tools', 'config'), marketplace('acme', 'acme/three', 'config')] }),
    ])

    expect(result.declarations.map((d) => d.name)).toEqual(['mine', 'acme'])
    // Only the name differs, so overriding changes nothing worth a notice.
    expect(result.notices).toEqual([])
    expect(result.conflicts).toEqual([])
  })

  it('refuses a User-scoped plugin whose marketplace is not User-scoped', () => {
    expect(() =>
      mergeLayers([
        config({
          marketplaces: [marketplace('acme', 'acme/plugins', 'config')],
          plugins: [{ id: 'tool@acme', marketplace: 'acme', enabled: true, scope: 'user', origin: 'config' }],
        }),
      ]),
    ).toThrow('config: plugin "tool@acme" has scope "user" but marketplace "acme" is not a User-scoped marketplace')
  })

  it('unions the selections of peer Presets for one source', () => {
    const result = mergeLayers([
      preset('a', [], { skills: [{ source: github('acme/skills'), select: ['tdd'] }] }),
      preset('b', [], { skills: [{ source: github('acme/skills'), select: ['review'] }] }),
      config({}),
    ])

    expect(result.items.skill).toEqual([
      { source: github('acme/skills'), select: ['tdd', 'review'], origin: 'a', presets: ['a', 'b'], shadows: [] },
    ])
  })

  it('reports peers selecting one item at both Scopes as a preset-clash', () => {
    const result = mergeLayers([
      preset('a', [], { skills: [{ source: github('acme/skills'), select: ['tdd'] }] }),
      preset('b', [], { skills: [{ source: github('acme/skills'), select: ['tdd'], scope: 'user' }] }),
      config({}),
    ])

    expect(result.items.skill).toEqual([])
    expect(result.conflicts).toEqual([
      { name: 'acme/skills', reason: 'preset-clash', detail: '"acme/skills" is declared with different scopes by a and b' },
    ])
  })

  it('refuses one origin selecting one item with and without `scope: user`', () => {
    expect(() =>
      mergeLayers([
        config({
          skills: [
            { source: github('acme/skills'), select: ['tdd'] },
            { source: github('acme/skills'), select: ['tdd'], scope: 'user' },
          ],
        }),
      ]),
    ).toThrow('config: "acme/skills" selects the same skills with and without `scope: user`')
  })

  it('keeps MCP server clashes apart from the other conflicts', () => {
    const result = mergeLayers([
      preset('a', [], { mcpServers: [{ name: 'fetch', server: { command: 'uvx' }, origin: 'a' }] }),
      preset('b', [], { mcpServers: [{ name: 'fetch', server: { command: 'npx' }, origin: 'b' }] }),
      config({}),
    ])

    expect(result.mcpServers).toEqual([])
    expect(result.conflicts).toEqual([])
    expect(result.mcpConflicts).toEqual([
      { name: 'fetch', reason: 'preset-clash', detail: 'MCP server "fetch" is declared differently by a and b' },
    ])
  })

  it('takes hooks from the Config only', () => {
    const hook = { name: 'done', group: { event: 'Stop', hooks: [] }, origin: 'config' }
    const result = mergeLayers([preset('a', [], {}), config({ hooks: [hook] })])

    expect(result.hooks).toEqual([hook])
  })

  it('lists notices as marketplaces, plugins, items, then MCP servers', () => {
    const result = mergeLayers([
      preset('p', [], {
        marketplaces: [marketplace('acme', 'acme/old', 'p')],
        plugins: [{ id: 'tool@acme', marketplace: 'acme', enabled: true, scope: 'user', origin: 'p' }],
        skills: [{ source: github('acme/skills'), select: ['tdd'] }],
        mcpServers: [{ name: 'fetch', server: { command: 'uvx' }, origin: 'p' }],
      }),
      config({
        marketplaces: [marketplace('acme', 'acme/new', 'config')],
        plugins: [{ id: 'tool@acme', marketplace: 'acme', enabled: true, origin: 'config' }],
        skills: [{ source: github('acme/skills'), select: ['review'] }],
        mcpServers: [{ name: 'fetch', server: { command: 'npx' }, origin: 'config' }],
      }),
    ])

    expect(result.notices).toEqual([
      'config overrides "acme" declared by p',
      'config overrides plugin "tool@acme" declared by p',
      'config overrides skills from "acme/skills" declared by p',
      'config overrides MCP server "fetch" declared by p',
    ])
  })
})
