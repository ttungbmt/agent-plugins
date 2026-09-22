import {execFileSync} from 'node:child_process'
import {existsSync, readFileSync, rmSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'

import {knownMarketplacesPath} from './paths.js'

/**
 * Drive the Claude Code plugin CLI.
 *
 * `--scope local` with a `directory`-source marketplace keeps everything in the
 * project: both the marketplace registration and the enablement land in
 * .claude/settings.local.json, and ~/.claude is not written to at all.
 * Measured on Claude Code 2.1.278 — after a sync, `grep -rl <marketplace-name>
 * ~/.claude` finds nothing, and known_marketplaces.json, installed_plugins.json
 * and cache/ are all untouched.
 *
 * The runtime then loads straight from the marketplace directory, with no cache
 * copy in between: removing a skill from the generated plugin.json without
 * touching its version makes the next session drop that skill.
 *
 * That is only true for this combination. A default (`user`) scope install of
 * the same directory marketplace does copy into
 * ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/ and is served from
 * there, keyed by the version string.
 *
 * `local` rather than `project`: `--scope project` writes an absolute path into
 * .claude/settings.json, which is committed and therefore unshareable. `local`
 * writes .claude/settings.local.json, which git already ignores.
 */
function claude(args, {cwd}) {
  return execFileSync('claude', args, {cwd, encoding: 'utf8', stdio: 'pipe'})
}

/**
 * MARKETPLACE_NAME_CONFLICT (ADR 0010 D9).
 *
 * Two local-scope projects cannot collide with each other, because each keeps
 * its own register in .claude/settings.local.json. What this guards against is
 * a machine-wide marketplace of the same name, in known_marketplaces.json,
 * which a local registration would then be ambiguous against. Our names carry a
 * hash of the absolute project path, so a hit here means a real collision or a
 * moved project — either way, refuse rather than overwrite.
 */
export function assertMarketplaceNameFree(name, marketplaceDir) {
  const storePath = knownMarketplacesPath()
  if (!existsSync(storePath)) return

  let store
  try {
    store = JSON.parse(readFileSync(storePath, 'utf8'))
  } catch {
    return // unreadable store is the runtime's problem, not ours
  }

  const existing = store[name]
  if (!existing) return

  const claimed = existing.installLocation ?? existing.source?.path
  if (claimed && resolve(claimed) !== resolve(marketplaceDir)) {
    throw new Error(
      `MARKETPLACE_NAME_CONFLICT: "${name}" is already registered to ${claimed}. ` +
        'Refusing to overwrite it. Run `ap clean` in that project, or move this one.',
    )
  }
}

/**
 * What Claude Code currently believes about this project.
 *
 * Reading this file costs about a millisecond; asking the `claude` CLI the same
 * question costs ~400 ms per invocation. So we read it and spawn nothing unless
 * something actually has to change.
 */
export function readLocalSettings(projectRootDir) {
  const path = join(projectRootDir, '.claude', 'settings.local.json')
  if (!existsSync(path)) return {}

  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

/**
 * Install the projection, running only the steps that are actually missing.
 *
 * Each `claude plugin` invocation costs ~400 ms, and a sync that changes
 * nothing used to pay for three of them to reproduce the state it already had.
 */
export function installProjection({force = false, marketplace, marketplaceName, packageId, projectRootDir, version}) {
  assertMarketplaceNameFree(marketplaceName, marketplace)

  const id = `${packageId}@${marketplaceName}`
  const settings = readLocalSettings(projectRootDir)
  const registered = settings.extraKnownMarketplaces?.[marketplaceName]?.source?.path
  const enabled = settings.enabledPlugins?.[id] === true

  const needsMarketplace = force || resolve(registered ?? '') !== resolve(marketplace)
  const versionChanged = force || version === undefined || version !== installedVersion(projectRootDir)
  const needsInstall = force || !enabled || versionChanged

  const log = []
  const run = (args) => {
    log.push(`claude ${args.join(' ')}`)
    return claude(args, {cwd: projectRootDir}).trim()
  }

  // `marketplace add` with an absolute path is idempotent — a second add
  // reports "already on disk — declared in local settings" and exits 0. There
  // is deliberately no `marketplace update` fallback here: update takes no
  // --scope flag, so using it would risk registering at the wrong scope.
  if (needsMarketplace) run(['plugin', 'marketplace', 'add', marketplace, '--scope', 'local'])

  if (needsInstall) {
    // Only worth kicking the cache when the digest moved; at user scope the
    // plugin cache is keyed by version string, so a reused version would
    // otherwise be served stale.
    if (enabled && versionChanged) {
      try {
        run(['plugin', 'uninstall', id, '-s', 'local'])
      } catch {
        // not installed after all
      }
    }

    run(['plugin', 'install', id, '-s', 'local'])
  }

  return {globalEntries: globalEntriesFor(marketplaceName), id, log, scope: 'local', skipped: log.length === 0}
}

/** The version recorded by the last successful install of this project. */
function installedVersion(projectRootDir) {
  const receiptPath = join(projectRootDir, '.agent-plugins', 'state', 'claude-code.json')
  if (!existsSync(receiptPath)) return undefined

  try {
    return JSON.parse(readFileSync(receiptPath, 'utf8')).version
  } catch {
    return undefined
  }
}

/**
 * Which machine-global records mention this marketplace.
 *
 * A local-scope install of a directory marketplace normally leaves the global
 * store alone — repeated syncs and sessions were measured doing exactly that.
 * But it has been observed writing an installed_plugins entry and a cache
 * directory, and that was not reproducible. So rather than assert cleanliness,
 * we look, and `ap sync` reports whatever is actually there.
 */
export function globalEntriesFor(marketplaceName) {
  const configDir = dirname(dirname(knownMarketplacesPath()))
  const found = []

  const check = (file, extract) => {
    const path = join(configDir, 'plugins', file)
    if (!existsSync(path)) return
    try {
      if (extract(JSON.parse(readFileSync(path, 'utf8')))) found.push(file)
    } catch {
      // unreadable store tells us nothing
    }
  }

  check('known_marketplaces.json', (d) => Boolean(d[marketplaceName]))
  check('installed_plugins.json', (d) =>
    Object.keys(d.plugins ?? {}).some((k) => k.endsWith(`@${marketplaceName}`)),
  )

  if (existsSync(join(configDir, 'plugins', 'cache', marketplaceName))) found.push('cache/')

  return found
}

export function uninstallProjection({marketplaceName, packageId, projectRootDir}) {
  const done = []
  for (const args of [
    ['plugin', 'uninstall', `${packageId}@${marketplaceName}`, '-s', 'local'],
    ['plugin', 'marketplace', 'remove', marketplaceName],
  ]) {
    try {
      claude(args, {cwd: projectRootDir})
      done.push(args.join(' '))
    } catch {
      // already gone
    }
  }

  // `marketplace remove` leaves the cache tree behind. It is keyed by our own
  // ap-<project>-<hash> marketplace name, so it cannot belong to anything the
  // user installed themselves, and the receipt is what authorises removing it.
  const cacheDir = join(dirname(dirname(knownMarketplacesPath())), 'plugins', 'cache', marketplaceName)
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, {force: true, recursive: true})
    done.push(`rm ~/.claude/plugins/cache/${marketplaceName}`)
  }

  return done
}

/**
 * Ask the runtime which skills a session actually loads.
 *
 * Only the system/init event is read, and it is emitted before any API call.
 * So we take stdout whether or not the process exits non-zero — a failed turn
 * still tells us what was loaded.
 */
export function loadedSkills({projectRootDir}) {
  let out
  try {
    out = claude(['-p', '--output-format', 'stream-json', '--verbose', 'reply with ok'], {
      cwd: projectRootDir,
    })
  } catch (error) {
    out = error.stdout ?? ''
  }

  // system/init is not necessarily the first line: a SessionStart hook emits
  // system/hook_started ahead of it. Scan for it rather than assuming.
  for (const line of out.split('\n')) {
    if (!line) continue

    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }

    if (event.type === 'system' && event.subtype === 'init') return event.skills ?? []
  }

  throw new Error('runtime produced no system/init event')
}
