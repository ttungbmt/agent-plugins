import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { promisify } from 'node:util'
import { beforeAll, expect, test } from 'vitest'
import { defaultPresetsDir } from './presets-dir.js'

beforeAll(async () => {
  await promisify(execFile)('node', [new URL('../scripts/copy-presets.mjs', import.meta.url).pathname])
})

test('build copies every default preset into the directory ap reads', async () => {
  const files = await readdir(defaultPresetsDir())
  expect(files).toEqual(expect.arrayContaining(['base.yaml', 'agent-plugins.yaml', 'mcp-servers.yaml']))
})
