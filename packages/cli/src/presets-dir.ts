import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Thư mục Preset mặc định: `presets/` ở gốc package `ap`, do bước build copy vào (ADR 0008).
 * Đi ngược lên từ file đang chạy tới `package.json` gần nhất, nên đúng cho cả `src/`, `dist/` lẫn bản bundle.
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
