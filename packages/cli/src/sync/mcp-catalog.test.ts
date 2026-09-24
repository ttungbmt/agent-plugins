import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { parseDocument } from 'yaml'
import { checkMcp } from './mcp.js'
import type { McpConfig } from './types.js'

const packages = new URL('../../../', import.meta.url)
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, packages)), 'utf8')

// The MCP catalog shipped with `ap`: over 100 hand-edited entries, so it checks itself instead of waiting for a sync.
describe('the shipped MCP catalog', () => {
  const document = parseDocument(read('presets/mcp-servers.yaml'), { uniqueKeys: true })
  const catalog = document.toJS() as { servers: Record<string, McpConfig> }

  it('is valid YAML without duplicate names', () => {
    expect(document.errors.map((e) => e.message)).toEqual([])
  })

  it('matches mcp-catalog.schema.json', () => {
    const ajv = new Ajv2020({ strict: false, logger: false, allErrors: true })
    ajv.addSchema(JSON.parse(read('schemas/schemas/preset.schema.json')), 'preset.schema.json')
    const validate = ajv.compile(JSON.parse(read('schemas/schemas/mcp-catalog.schema.json')))
    validate(catalog)
    expect(validate.errors ?? []).toEqual([])
  })

  it('passes the inline checks, secrets included', () => {
    const errors = Object.entries(catalog.servers).map(([name, { description: _, ...server }]) => checkMcp(name, server))
    expect(errors.filter(Boolean)).toEqual([])
  })
})
