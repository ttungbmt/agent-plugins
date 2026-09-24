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
/**
 * Only `sync/guards.ts` may import `isPlainObject`; everything else goes through `isRecord`, which narrows without
 * `any`.
 */
const GUARDED: Record<string, string> = { isPlainObject: 'sync/guards.ts' }

const src = fileURLToPath(new URL('.', import.meta.url))
const sources = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
  .sort()

// `import { a, b as c } from 'es-toolkit'`, `export { a } from 'es-toolkit/array'` and `import 'es-toolkit/server'`.
const ES_TOOLKIT_IMPORT =
  /\b(?:import|export)\s+(?:(?:type\s+)?([^'";]*?)\s+from\s+)?['"](es-toolkit(?:\/[^'"]*)?)['"]/g

function importedNames(clause: string): string[] {
  const named = /\{([^}]*)\}/.exec(clause)?.[1] ?? ''
  return named
    .split(',')
    .map((specifier) => specifier.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]!)
    .filter(Boolean)
}

function violationsOf(file: string, path: string, clause: string): string[] {
  // Subpaths include `es-toolkit/server` and `es-toolkit/compat`; a namespace import hides which names are used.
  if (path !== 'es-toolkit') return [path]
  if (clause.includes('*')) return ['* (namespace import)']
  const guardedElsewhere = (name: string) => name in GUARDED && GUARDED[name] !== file
  return importedNames(clause).filter((name) => BANNED_FUNCTIONS.includes(name) || guardedElsewhere(name))
}

it('imports no banned es-toolkit function or entry point', () => {
  const violations = sources.flatMap((file) =>
    [...readFileSync(join(src, file), 'utf8').matchAll(ES_TOOLKIT_IMPORT)].flatMap(([statement, clause = '', path]) =>
      violationsOf(file.split('\\').join('/'), path!, clause).map(
        (what) => `src/${file}: \`${what}\` is banned by ADR 0016, in \`${statement.replace(/\s+/g, ' ')}\``,
      ),
    ),
  )
  expect(violations).toEqual([])
})
