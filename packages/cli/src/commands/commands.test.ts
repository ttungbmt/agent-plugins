import { readdir } from 'node:fs/promises'
import { expect, test } from 'vitest'
import { COMMANDS } from './index.js'

test('every command file is registered in the command map', async () => {
  const files = await readdir(new URL('.', import.meta.url))
  const commands = files.filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'index.ts').map((f) => f.slice(0, -'.ts'.length))
  expect(Object.keys(COMMANDS).sort()).toEqual(commands.sort())
})
