import { readFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { parse } from 'yaml'
import { ConfigError } from './errors.js'
import { mergeLayers, type Layer, type Merged } from './merge.js'
import { presetLoader, type PresetPins, type ResolveContext } from './preset-loader.js'
import { presetRefs, readDeclarations, type PresetDocument } from './spec.js'
import { byKind } from './types.js'
import type { MarketplaceSource } from './types.js'

export type { Fetch, PresetPins, ResolveContext } from './preset-loader.js'

export type ResolvedConfig = Merged & {
  /** Hashes of every Remote preset used this run, to write back to the Lock. */
  pins: PresetPins
}

/** Resolve a Config into its set of Marketplace declarations, per docs/design/ap-sync.md. */
export async function resolveConfig(configPath: string, ctx: ResolveContext): Promise<ResolvedConfig> {
  const configLabel = basename(configPath)
  const text = await readFile(configPath, 'utf8').catch(() => {
    throw new ConfigError(`${configLabel} not found; run \`ap init\` to create one`)
  })
  const config = parse(text) as PresetDocument
  const refs = presetRefs(config, 'Config', configLabel)
  const root = dirname(configPath)
  const loader = presetLoader(ctx, root)

  const layers: Layer[] = []
  for await (const preset of loader.presets(refs)) {
    // A Preset's `spec.hooks` is rejected by `presetRefs` until hooks ticket 03 (.scratch/hooks/issues/03-hooks-in-presets.md).
    const declared = await readDeclarations(preset.doc, { origin: preset.label, dir: preset.dir }, loader.mcpCatalog)
    const rebase = <D extends { source: MarketplaceSource }>(d: D) => ({ ...d, source: preset.rebase(d.source) })
    const declarations = { ...declared, marketplaces: declared.marketplaces.map(rebase), items: byKind((kind) => declared.items[kind].map(rebase)) }
    layers.push({ declarations, presets: [preset.id], shadows: preset.shadows })
  }
  const declared = await readDeclarations(config, { origin: configLabel, dir: root }, loader.mcpCatalog)
  layers.push({ declarations: declared, presets: [null], shadows: ['*'] })
  return { ...mergeLayers(layers), pins: loader.pins() }
}
