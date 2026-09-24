import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Bundled preset directory: `presets/` at the root of the `ap` package (ADR 0008).
 * Walks up from the running file to the nearest `package.json`, so it works for `src/`, `dist/` and the bundle alike.
 */
export function defaultPresetsDir(from: string = import.meta.url): string {
  let dir = dirname(fileURLToPath(from))
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir)
    if (parent === dir) throw new Error(`cannot find the package root of ${from}`)
    dir = parent
  }
  return join(dir, 'presets')
}
