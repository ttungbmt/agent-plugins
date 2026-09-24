import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { presetLoader, type ResolveContext } from './preset-loader.js'
import { makeTree } from './test-helpers.js'

const noFetch = async () => {
  throw new Error('network not expected')
}
const preset = (name: string, extend: string[] = []) => `kind: Preset\nmetadata: { name: ${name} }\nspec:\n  extends: ${JSON.stringify(extend)}\n`

async function loaderIn(files: Record<string, string>, extra: Partial<ResolveContext> = {}) {
  const root = await makeTree(files)
  const ctx = { fetch: noFetch, pins: {}, update: false, cacheDir: join(root, 'cache'), defaultPresetsDir: join(root, 'bundled'), ...extra }
  return { root, loader: presetLoader(ctx, root) }
}
async function all<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of iterable) items.push(item)
  return items
}

describe('presetLoader', () => {
  it('yields parents before children, a shared parent once, with each Preset\'s extends tree', async () => {
    const { loader } = await loaderIn({
      'base.yaml': preset('base'),
      'web.yaml': preset('web', ['./base.yaml']),
      'api.yaml': preset('api', ['./base.yaml']),
    })

    const presets = await all(loader.presets(['./web.yaml', './api.yaml']))

    expect(presets.map((p) => [p.label, p.shadows.map((s) => s.split('/').at(-1))])).toEqual([
      ['base.yaml', []],
      ['web.yaml', ['base.yaml']],
      ['api.yaml', ['base.yaml']],
    ])
  })

  it('yields each Preset before loading the next one', async () => {
    const { loader } = await loaderIn({ 'a.yaml': preset('a') })
    const seen: string[] = []

    await expect(
      (async () => {
        for await (const p of loader.presets(['./a.yaml', './missing.yaml'])) seen.push(p.label)
      })(),
    ).rejects.toThrow('preset file not found: missing.yaml')
    expect(seen).toEqual(['a.yaml'])
  })

  it('throws on a cycle, naming its chain', async () => {
    const { loader } = await loaderIn({ 'a.yaml': preset('a', ['./b.yaml']), 'b.yaml': preset('b', ['./a.yaml']) })

    await expect(all(loader.presets(['./a.yaml']))).rejects.toThrow('preset cycle: a.yaml -> b.yaml -> a.yaml')
  })

  it('resolves a relative ref inside a Remote preset against its URL, and pins every Remote preset', async () => {
    const pages: Record<string, string> = {
      'https://example.com/p/remote.yaml': preset('remote', ['./common.yaml']),
      'https://example.com/p/common.yaml': preset('common'),
    }
    const { loader } = await loaderIn({}, { fetch: async (url) => pages[url]! })

    const presets = await all(loader.presets(['https://example.com/p/remote.yaml']))

    expect(presets.map((p) => p.id)).toEqual(['https://example.com/p/common.yaml', 'https://example.com/p/remote.yaml'])
    const sha = (text: string) => createHash('sha256').update(text).digest('hex')
    expect(loader.pins()).toEqual(Object.fromEntries(Object.entries(pages).map(([url, text]) => [url, sha(text)])))
  })

  it('rebases a relative path onto the Config directory, and refuses one in a Remote preset', async () => {
    const { loader } = await loaderIn({ 'presets/team.yaml': preset('team') }, { fetch: async () => preset('remote') })
    const [local, remote] = await all(loader.presets(['./presets/team.yaml', 'https://example.com/remote.yaml']))

    expect(local!.rebase({ source: 'directory', path: './skills' })).toEqual({ source: 'directory', path: './presets/skills' })
    expect(() => remote!.rebase({ source: 'directory', path: './skills' })).toThrow(
      'relative path "./skills" cannot be used in remote preset https://example.com/remote.yaml',
    )
  })

  it('reads a missing MCP catalog as empty', async () => {
    const { loader } = await loaderIn({})

    expect(await loader.mcpCatalog()).toEqual({})
  })
})
