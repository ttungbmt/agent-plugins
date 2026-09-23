import { join } from 'node:path'
import { readJson, SCOPES, settingsPath, writeJson, type Location } from './files.js'
import type { Exec } from './registry.js'
import type { MarketplaceSource, Scope } from './types.js'

/**
 * Giả lập `claude plugin marketplace add|remove`: ghi `extraKnownMarketplaces` như CLI thật —
 * key là tên trong marketplace.json (tra ở `marketplaces`), chỉ ghi `source`, `directory` thành đường dẫn tuyệt đối.
 * Bản cài dùng chung cả máy theo tên (`known_marketplaces.json`): `add` thay bản cài, `remove` chỉ xoá bản cài
 * khi không scope nào còn khai báo tên đó — đúng như `claude` 2.1 đo được.
 */
export function fakeClaude(opts: Location & {
  marketplaces: Record<string, { name: string; source: MarketplaceSource }>
  failOn?: string[]
}) {
  const calls: string[][] = []
  const installPath = join(opts.homedir, '.claude/plugins/known_marketplaces.json')
  const installed = () => readJson<Record<string, { source: MarketplaceSource }>>(installPath)
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
      await writeJson(path, settings)
      await writeJson(installPath, { ...(await installed()), [marketplace.name]: { source: marketplace.source } })
    } else {
      delete known[target!]
      await writeJson(path, settings)
      const declared = await Promise.all(
        SCOPES.map(async (s) => target! in ((await readJson<Record<string, any>>(settingsPath(s, opts))).extraKnownMarketplaces ?? {})),
      )
      if (!declared.includes(true)) {
        const { [target!]: _, ...rest } = await installed()
        await writeJson(installPath, rest)
      }
    }

    return { code: 0, stdout: '', stderr: '' }
  }
  return { exec, calls, installed }
}
