import { join } from 'node:path'
import { claudeDir, claudeJsonPath, installedPluginsPath, readJson, SCOPES, settingsPath, writeJson, type Location } from './files.js'
import type { Exec } from './registry.js'
import type { MarketplaceSource, Scope } from './types.js'

type InstallRecord = { scope: Scope; projectPath?: string }

/**
 * Giả lập `claude plugin marketplace add|remove` và `claude plugin install|enable|uninstall` như CLI thật (2.1.280):
 * - `marketplace add` ghi `extraKnownMarketplaces` — key là tên trong marketplace.json (tra ở `marketplaces`),
 *   chỉ ghi `source`, `directory` thành đường dẫn tuyệt đối. Bản cài dùng chung cả máy theo tên
 *   (`known_marketplaces.json`): `add` thay bản cài, `remove` chỉ xoá bản cài khi không scope nào còn khai báo tên đó.
 * - `marketplace remove X --scope S` xoá luôn mọi khoá `*@X` trong `enabledPlugins` của S và Bản cài của chúng.
 * - `install` cài theo scope và ghi `true`; `enable` chỉ ghi `true`, báo `already_in_goal_state` nếu đã `true`;
 *   `uninstall` xoá khoá và Bản cài của scope đó, báo `not_installed_at_scope` nếu scope không có Bản cài.
 * - `mcp add-json <name> <json> --scope S` ghi nguyên văn vào `.mcp.json` (`project`), `projects[<cwd>].mcpServers` (`local`)
 *   hoặc `mcpServers` (`user`) của `.claude.json`; lỗi nếu tên đã có ở scope đó. `mcp remove` lỗi nếu chưa có.
 * `confirm` là các plugin cần `-y` (nguồn `command`), `install` của chúng luôn lỗi.
 */
export function fakeClaude(opts: Location & {
  marketplaces: Record<string, { name: string; source: MarketplaceSource }>
  failOn?: string[]
  confirm?: string[]
}) {
  const calls: string[][] = []
  const knownPath = join(claudeDir(opts), 'plugins/known_marketplaces.json')
  const installed = () => readJson<Record<string, { source: MarketplaceSource }>>(knownPath)
  const pluginsPath = installedPluginsPath(opts)
  const installs = async () => (await readJson<{ plugins?: Record<string, InstallRecord[]> }>(pluginsPath)).plugins ?? {}
  const saveInstalls = (plugins: Record<string, InstallRecord[]>) => writeJson(pluginsPath, { version: 2, plugins })
  const record = (scope: Scope): InstallRecord => (scope === 'user' ? { scope } : { scope, projectPath: opts.cwd })
  const atScope = (scope: Scope) => (r: InstallRecord) => r.scope === scope && (scope === 'user' || r.projectPath === opts.cwd)

  const ok = { code: 0, stdout: '', stderr: '' }
  const failure = (code: string, message: string) => ({
    code: 1,
    stdout: JSON.stringify({ outcome: 'failed', failureCode: code, message }),
    stderr: `✘ ${message}`,
  })

  async function settingsOf(scope: Scope) {
    const path = settingsPath(scope, opts)
    const settings = await readJson<Record<string, any>>(path)
    return { settings, save: () => writeJson(path, settings) }
  }

  async function marketplace(action: string, target: string, scope: Scope) {
    const { settings, save } = await settingsOf(scope)
    const known = (settings.extraKnownMarketplaces ??= {})

    if (action === 'add') {
      const marketplace = opts.marketplaces[target]
      if (!marketplace) return { code: 1, stdout: '', stderr: `no marketplace at ${target}` }
      known[marketplace.name] = { source: marketplace.source }
      await save()
      await writeJson(knownPath, { ...(await installed()), [marketplace.name]: { source: marketplace.source } })
      return ok
    }

    delete known[target]
    const plugins = await installs()
    for (const id of Object.keys(settings.enabledPlugins ?? {})) {
      if (!id.endsWith(`@${target}`)) continue
      delete settings.enabledPlugins[id]
      plugins[id] = (plugins[id] ?? []).filter((r) => !atScope(scope)(r))
    }
    await save()
    await saveInstalls(plugins)
    const declared = await Promise.all(
      SCOPES.map(async (s) => target in ((await readJson<Record<string, any>>(settingsPath(s, opts))).extraKnownMarketplaces ?? {})),
    )
    if (!declared.includes(true)) {
      const { [target]: _, ...rest } = await installed()
      await writeJson(knownPath, rest)
    }
    return ok
  }

  async function plugin(action: string, id: string, scope: Scope) {
    const { settings, save } = await settingsOf(scope)
    const enabled = (settings.enabledPlugins ??= {})
    const plugins = await installs()
    const records = plugins[id] ?? []

    if (action === 'install') {
      if (opts.confirm?.includes(id)) return failure('confirmation_required', `${id} runs a marketplace-declared command; pass -y`)
      if (!(id.split('@')[1]! in (await installed()))) return failure('not_found', `plugin ${id} not found`)
      if (!records.some(atScope(scope))) plugins[id] = [...records, record(scope)]
      enabled[id] = true
      await saveInstalls(plugins)
    } else if (action === 'enable') {
      if (enabled[id] === true) return failure('already_in_goal_state', `${id} is already enabled`)
      enabled[id] = true
    } else {
      if (!records.some(atScope(scope))) return failure('not_installed_at_scope', `${id} is not installed at scope ${scope}`)
      plugins[id] = records.filter((r) => !atScope(scope)(r))
      delete enabled[id]
      await saveInstalls(plugins)
    }
    await save()
    return { ...ok, stdout: JSON.stringify({ outcome: 'ok', pluginId: id, scope }) }
  }

  async function mcp(action: string, name: string, json: string | undefined, scope: Scope) {
    const path = scope === 'project' ? join(opts.cwd, '.mcp.json') : claudeJsonPath(opts)
    const file = await readJson<Record<string, any>>(path)
    const holder = scope === 'local' ? ((file.projects ??= {})[opts.cwd] ??= {}) : file
    const servers: Record<string, unknown> = (holder.mcpServers ??= {})
    if (action === 'add-json') {
      if (name in servers) return { code: 1, stdout: '', stderr: `MCP server ${name} already exists in ${scope} config` }
      servers[name] = JSON.parse(json!)
    } else {
      if (!(name in servers)) return { code: 1, stdout: '', stderr: `No MCP server found with name: ${name}` }
      delete servers[name]
    }
    await writeJson(path, file)
    return ok
  }

  const exec: Exec = async (command, args) => {
    calls.push([command, ...args])
    if (args[0] === 'mcp') {
      const scope = args[args.indexOf('--scope') + 1] as Scope
      if (opts.failOn?.includes(args[2]!)) return { code: 1, stdout: '', stderr: `failed to ${args[1]} ${args[2]}` }
      return mcp(args[1]!, args[2]!, args[1] === 'add-json' ? args[3] : undefined, scope)
    }
    const isMarketplace = args[1] === 'marketplace'
    const [action, target] = isMarketplace ? args.slice(2) : args.slice(1)
    const scope = args[args.indexOf('--scope') + 1] as Scope
    if (opts.failOn?.includes(target!)) return { code: 1, stdout: '', stderr: `failed to ${action} ${target}` }
    return isMarketplace ? marketplace(action!, target!, scope) : plugin(action!, target!, scope)
  }
  return { exec, calls, installed, installs }
}
