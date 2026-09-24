import { readdir } from 'node:fs/promises'
import { expect, test } from 'vitest'
import { defaultPresetsDir } from './presets-dir.js'

test('points at the Bundled presets shipped with ap', async () => {
  const files = await readdir(defaultPresetsDir())
  expect(files).toEqual(expect.arrayContaining(['base.yaml', 'mcp-servers.yaml']))
})
