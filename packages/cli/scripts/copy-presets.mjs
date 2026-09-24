// Copy the Bundled presets from the `presets` package into this package's `presets/`, so the dev build and the
// Release tarball read presets from the same place (ADR 0008).
import { cp, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = dirname(fileURLToPath(import.meta.resolve('presets/package.json')))
const target = fileURLToPath(new URL('../presets/', import.meta.url))

await rm(target, { recursive: true, force: true })
for (const file of await readdir(source)) {
  if (file.endsWith('.yaml')) await cp(join(source, file), join(target, file))
}
