import { readJson, settingsPath, writeJson, type Location } from './files.js'
import type { Exec } from './registry.js'
import type { MarketplaceSource, Scope } from './types.js'

/**
 * Giả lập `claude plugin marketplace add|remove`: ghi `extraKnownMarketplaces` như CLI thật —
 * key là tên trong marketplace.json (tra ở `marketplaces`), chỉ ghi `source`, `directory` thành đường dẫn tuyệt đối.
 */
export function fakeClaude(opts: Location & {
  marketplaces: Record<string, { name: string; source: MarketplaceSource }>
  failOn?: string[]
}) {
  const calls: string[][] = []
  const exec: Exec = async (command, args) => {
    calls.push([command, ...args])
    const [, , action, target, , scope] = args
    if (opts.failOn?.includes(target!)) return { code: 1, stdout: '', stderr: `failed to add ${target}` }

    const path = settingsPath(scope as Scope, opts)
    const settings = await readJson<Record<string, any>>(path)
    const known = (settings.extraKnownMarketplaces ??= {})

    if (action === 'add') {
      const marketplace = opts.marketplaces[target!]
      if (!marketplace) return { code: 1, stdout: '', stderr: `no marketplace at ${target}` }
      known[marketplace.name] = { source: marketplace.source }
    } else {
      delete known[target!]
    }

    await writeJson(path, settings)
    return { code: 0, stdout: '', stderr: '' }
  }
  return { exec, calls }
}
