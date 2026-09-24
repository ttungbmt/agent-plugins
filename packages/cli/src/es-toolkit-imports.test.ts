import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

/** es-toolkit functions whose behaviour differs from the code they would replace; ADR 0016 says why for each. */
const BANNED_FUNCTIONS = [
  'isEqual',
  'compact',
  'groupBy',
  'sortBy',
  'orderBy',
  'kebabCase',
  'memoize',
  'mapAsync',
  'filterAsync',
  'forEachAsync',
  'reduceAsync',
  'flatMapAsync',
]
const BANNED_PATHS = ['es-toolkit/server', 'es-toolkit/compat']

const src = fileURLToPath(new URL('.', import.meta.url))
const sources = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
  .sort()

// `import { a, b as c } from 'es-toolkit'`, `export { a } from 'es-toolkit/array'` and `import 'es-toolkit/server'`.
const ES_TOOLKIT_IMPORT = /\b(?:import|export)\s+(?:(?:type\s+)?([^'";]*?)\s+from\s+)?['"](es-toolkit(?:\/[^'"]*)?)['"]/g

function importedNames(clause: string): string[] {
  const named = /\{([^}]*)\}/.exec(clause)?.[1] ?? ''
  return named
    .split(',')
    .map((specifier) => specifier.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!)
    .filter(Boolean)
}

it('imports no banned es-toolkit function or entry point', () => {
  const violations = sources.flatMap((file) =>
    [...readFileSync(join(src, file), 'utf8').matchAll(ES_TOOLKIT_IMPORT)].flatMap(([statement, clause = '', path]) => {
      const banned = BANNED_PATHS.includes(path!) ? [path!] : importedNames(clause).filter((name) => BANNED_FUNCTIONS.includes(name))
      return banned.map((what) => `src/${file}: \`${what}\` is banned by ADR 0016, in \`${statement.replace(/\s+/g, ' ')}\``)
    }),
  )
  expect(violations).toEqual([])
})
