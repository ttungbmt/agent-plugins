import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { defaultPresetsDir } from '../presets-dir.js'
import { resolveConfig } from './resolve.js'
import { CONFIG_SPEC_KEYS, PRESET_SPEC_KEYS } from './spec.js'
import { makeTree } from './test-helpers.js'

const repo = new URL('../../../../', import.meta.url)
const schemas = new URL('schemas/', repo)
type Schema = { properties: { spec: { properties: Record<string, unknown> } } }
const readSchema = (file: string) => JSON.parse(readFileSync(fileURLToPath(new URL(file, schemas)), 'utf8')) as Schema
const specOf = (file: string) => readSchema(file).properties.spec.properties

/**
 * `spec` keys the parser reads but whose schema is still owed by an open ticket. Whoever writes that schema deletes
 * the entry here; the test fails while a closed gap is still listed, so this list only shrinks.
 */
const KNOWN_GAPS = [
  { schema: 'preset.schema.json', key: 'rules', owner: '.scratch/rules/issues/10-schema-preset-docs.md' },
  { schema: 'config.schema.json', key: 'rules', owner: '.scratch/rules/issues/10-schema-preset-docs.md' },
  { schema: 'config.schema.json', key: 'hooks', owner: '.scratch/hooks/issues/03-hooks-in-presets.md' },
]

// A new `spec.*` key touches the parser in spec.ts and both schemas; this names whichever one was missed.
describe.each([
  { schema: 'preset.schema.json', accepted: PRESET_SPEC_KEYS },
  { schema: 'config.schema.json', accepted: CONFIG_SPEC_KEYS },
])('$schema', ({ schema, accepted }) => {
  const declared = Object.keys(specOf(schema))
  const gaps = KNOWN_GAPS.filter((gap) => gap.schema === schema).map((gap) => gap.key)

  it('declares no `spec` key the parser rejects', () => {
    const extra = declared.filter((key) => !accepted.includes(key))
    expect(extra.map((key) => `spec.${key} is in ${schema} but not in spec.ts`)).toEqual([])
  })

  it('declares every `spec` key the parser reads', () => {
    const missing = accepted.filter((key) => !declared.includes(key) && !gaps.includes(key))
    expect(missing.map((key) => `spec.${key} is read by spec.ts but missing from ${schema}`)).toEqual([])
  })

  it('lists no known gap that is already closed', () => {
    const closed = KNOWN_GAPS.filter((gap) => gap.schema === schema && declared.includes(gap.key))
    expect(closed.map((gap) => `spec.${gap.key} is now in ${schema}; remove its KNOWN_GAPS entry (${gap.owner})`)).toEqual([])
  })
})

describe('config.schema.json', () => {
  it('reuses the Preset definition of every `spec` key both documents take', () => {
    const preset = specOf('preset.schema.json')
    const config = specOf('config.schema.json')
    const drifted = Object.keys(config)
      .filter((key) => key in preset)
      .filter((key) => (config[key] as { $ref?: string }).$ref !== `preset.schema.json#/properties/spec/properties/${key}`)
    expect(drifted.map((key) => `spec.${key} in config.schema.json must be a $ref to the same key in preset.schema.json`)).toEqual([])
  })
})

const ajv = new Ajv2020({ strict: false, logger: false, allErrors: true })
ajv.addSchema(readSchema('preset.schema.json'), 'preset.schema.json')
const validators = { Config: ajv.compile(readSchema('config.schema.json')), Preset: ajv.getSchema('preset.schema.json')! }
type Document = { kind: 'Config' | 'Preset'; spec?: Record<string, unknown> | null }

/** Schema errors of a document, or null when it uses a key whose schema is still a known gap. */
function schemaErrors(doc: Document) {
  const schema = doc.kind === 'Config' ? 'config.schema.json' : 'preset.schema.json'
  const gap = KNOWN_GAPS.find((g) => g.schema === schema && doc.spec && g.key in doc.spec)
  if (gap) return null
  const validate = validators[doc.kind]
  validate(doc)
  return (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`)
}

const resolveCtx = (root: string) => ({
  fetch: async () => {
    throw new Error('network not expected')
  },
  pins: {},
  update: false,
  cacheDir: join(root, '.agent-plugins/cache'),
  writeCache: false,
  defaultPresetsDir: defaultPresetsDir(),
})

// Sample Configs and the Presets they load, checked by both validators; a drift below the key level shows up as one
// side accepting what the other rejects.
describe('the shape corpus', () => {
  const configs = ['agent-plugins.yaml', ...['ideaverse-os', 'mealops', 'opscli'].map((name) => `examples/${name}/agent-plugins.yaml`)]
  const presets = [
    'agent-plugins.preset.yaml',
    ...['ideaverse-os', 'mealops', 'opscli'].map((name) => `examples/${name}/agent-plugins.preset.yaml`),
    'packages/cli/presets/base.yaml',
  ]
  const load = (path: string) => parse(readFileSync(fileURLToPath(new URL(path, repo)), 'utf8')) as Document

  it.each(configs)('the parser accepts %s and the Presets it loads', async (path) => {
    const file = fileURLToPath(new URL(path, repo))
    await expect(resolveConfig(file, resolveCtx(join(file, '..')))).resolves.toBeDefined()
  })

  it.each([...configs, ...presets])('the schema accepts %s, unless it uses a known gap', (path) => {
    const errors = schemaErrors(load(path))
    if (errors) expect(errors).toEqual([])
  })

  const config = (spec: string) => `kind: Config\nmetadata: { name: demo }\nspec:\n${spec}`
  it.each([
    ['a non-list item kind', '  skills: acme/kit\n'],
    ['an unknown field on an item entry', '  skills:\n    - { source: acme/kit, scopes: user }\n'],
    ['a plugin value that is not true, false or { enabled, scope }', '  plugins:\n    tdd@acme: yes please\n'],
    ['an MCP server scope other than user', '  mcpServers:\n    kit: { command: kit, scope: global }\n'],
    ['an unknown spec key', '  skils: [acme/kit]\n'],
  ])('both reject %s', async (_, spec) => {
    const text = config(spec)
    expect(schemaErrors(parse(text) as Document)).not.toEqual([])
    const root = await makeTree({ 'agent-plugins.yaml': text })
    await expect(resolveConfig(join(root, 'agent-plugins.yaml'), resolveCtx(root))).rejects.toThrow()
  })
})
