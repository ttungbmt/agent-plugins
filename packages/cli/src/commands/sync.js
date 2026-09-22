import {Command, Flags} from '@oclif/core'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join, relative} from 'node:path'
import {stringify} from 'yaml'

import {buildMarketplace, computeVersion, marketplaceName, MATERIALIZE_MODES} from '../lib/build.js'
import {installProjection, loadedSkills} from '../lib/install.js'
import {plan} from '../lib/pipeline.js'

export default class Sync extends Command {
  static description = 'Resolve, build a local marketplace, and install it into an isolated Claude Code config.'

  static flags = {
    force: Flags.boolean({default: false, description: 'redo every step even when nothing changed'}),
    materialize: Flags.string({
      default: 'symlink',
      description: 'how selected Components reach the projection',
      options: MATERIALIZE_MODES,
    }),
    verify: Flags.boolean({default: false, description: 'after installing, ask the runtime which skills it loads'}),
  }

  async run() {
    const {flags} = await this.parse(Sync)
    const p = plan()
    const {paths} = p

    this.log(`role ${p.role.metadata.id} -> ${p.capabilities.size} capabilities -> ${p.included.size} components`)
    this.log(`source  ${p.snapshot.key}  (${p.snapshot.cached ? 'cache hit' : 'fetched'}, shared store)`)

    // The version is a digest of the bytes that would ship. Computing it reads
    // a handful of files; rebuilding and reinstalling cost three orders of
    // magnitude more, so decide first and pay only if something moved.
    const version = computeVersion({
      components: p.components,
      included: p.included,
      upstreamVersion: p.upstreamVersion,
    })

    const built = this.#alreadyBuilt(paths, p.packageId, version) && !flags.force
      ? {marketplaceName: marketplaceName(paths.root), mode: 'unchanged', version}
      : buildMarketplace({
          components: p.components,
          included: p.included,
          marketplace: paths.marketplace,
          mode: flags.materialize,
          packageId: p.packageId,
          projectRootDir: paths.root,
          snapshotDir: p.snapshotDir,
          upstreamVersion: p.upstreamVersion,
          version,
        })
    this.log(`built   ${relative(paths.root, paths.marketplace)}  ${p.packageId}@${built.version}`)
    this.log(built.mode === 'unchanged' ? '        unchanged, reused' : `        materialize=${built.mode}`)

    const installed = installProjection({
      force: flags.force,
      marketplace: paths.marketplace,
      marketplaceName: built.marketplaceName,
      packageId: p.packageId,
      projectRootDir: paths.root,
      version,
    })
    this.log(`install ${installed.id}`)
    this.log(
      installed.skipped
        ? '        already installed, nothing to do'
        : `        scope ${installed.scope} -> .claude/settings.local.json (this project only)`,
    )
    if (!installed.skipped) {
      this.log(
        installed.globalEntries.length === 0
          ? '        ~/.claude untouched'
          : `        note: also recorded in ~/.claude (${installed.globalEntries.join(', ')}) — ap clean removes it`,
      )
    }

    this.#writeLock(p, built)
    this.#writeReceipt(p, built, installed)
    this.log(`lock    ${relative(paths.root, paths.lock)}`)

    if (flags.verify) {
      const skills = loadedSkills({projectRootDir: paths.root})
      const ours = skills.filter((s) => s.startsWith(`${p.packageId}:`))
      this.log('')
      this.log(`runtime reports ${ours.length} skill(s) from ${p.packageId}:`)
      for (const skill of ours.sort()) this.log(`  ${skill}`)
    }
  }

  /** Is the projection on disk already exactly this version? */
  #alreadyBuilt(paths, packageId, version) {
    const manifest = join(paths.marketplace, 'plugins', packageId, '.claude-plugin', 'plugin.json')
    if (!existsSync(manifest)) return false

    try {
      return JSON.parse(readFileSync(manifest, 'utf8')).version === version
    } catch {
      return false
    }
  }

  #writeLock(p, built) {
    const pkg = p.catalog.packages.get(p.packageId)
    const lock = {
      apiVersion: 'agent-plugins/v1',
      kind: 'ProjectLock',
      spec: {
        capabilities: [...p.selections.entries()]
          .map(([id, impl]) => ({component: impl.component, id, package: impl.package}))
          .sort((a, b) => a.id.localeCompare(b.id)),
        components: [...p.included].sort().map((name) => ({
          name,
          role: p.seeds.has(name) ? 'selected' : 'dependency',
          sourcePath: p.components.get(name).sourcePath,
        })),
        packages: [
          {
            id: p.packageId,
            materialization: pkg.spec.materialization,
            projection: {marketplace: built.marketplaceName, version: built.version},
            source: {ref: pkg.spec.source.ref, type: pkg.spec.source.type, url: pkg.spec.source.url},
          },
        ],
        policy: p.policy.metadata.id,
        role: p.role.metadata.id,
        target: 'claude-code',
      },
    }

    writeFileSync(p.paths.lock, stringify(lock))
  }

  #writeReceipt(p, built, installed) {
    mkdirSync(p.paths.state, {recursive: true})
    writeFileSync(
      p.paths.receipt,
      `${JSON.stringify(
        {
          // D8: the adapter only removes what it recorded installing.
          installedAt: new Date().toISOString(),
          marketplace: built.marketplaceName,
          plugin: installed.id,
          scope: installed.scope,
          snapshot: p.snapshotDir,
          snapshotKey: p.snapshot.key,
          version: built.version,
        },
        null,
        2,
      )}\n`,
    )
  }
}
