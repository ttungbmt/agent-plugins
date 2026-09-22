import {createHash} from 'node:crypto'
import {cpSync, linkSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs'
import {basename, dirname, join, relative, resolve} from 'node:path'

/**
 * Marketplace names are keyed globally by Claude Code, so they must be unique
 * per project on the machine. ADR 0010 D9.
 */
export function marketplaceName(projectRootDir) {
  const hash = createHash('sha256').update(resolve(projectRootDir)).digest('hex').slice(0, 8)
  return `ap-${basename(projectRootDir)}-${hash}`
}

/**
 * The projection flattens Components to `skills/<name>`.
 *
 * Upstream groups them (`skills/engineering/tdd`, `skills/productivity/grilling`),
 * but measurement shows the loader only follows a symlink for a skill directory
 * sitting *directly* under `skills/`:
 *
 *   skills/tdd             -> store   loads
 *   skills/engineering/tdd -> store   does NOT load, even though plugin.json
 *                                     lists it and the install succeeds
 *
 * Component names are unique within a Package, so flattening is lossless, and
 * it keeps every materialize mode on the same shape.
 */

/**
 * How a selected Component gets from the shared store into the projection.
 *
 * `symlink` is the default and the cheapest that works. It was chosen by
 * measurement, not preference — three approaches were probed against Claude
 * Code 2.1.278:
 *
 *   absolute path in plugin.json `skills`   REJECTED
 *   `../` escape out of the plugin root     REJECTED
 *       both fail manifest validation: "skills.0: Invalid input"
 *   directory symlink inside the plugin     WORKS — the skill loads and its
 *                                           supporting files resolve through
 *                                           the link
 *
 * So the manifest cannot point outside the plugin, but the filesystem can.
 * That is the Nix symlink-farm shape, and it means a projection costs a few
 * hundred bytes instead of copying content that already exists in the store.
 *
 * `hardlink` shares inodes per file, pnpm style. It needs the store and the
 * project on one filesystem, and it makes an accidental write corrupt every
 * project sharing the snapshot — the store is chmod a-w to prevent that.
 *
 * `copy` always works, and is the only option when the store and the project
 * are on different filesystems (a project under /mnt/c against a store on
 * ext4, for instance).
 */
export const MATERIALIZE_MODES = ['symlink', 'hardlink', 'copy']

function hardlinkTree(from, to) {
  // An agent or a command is a single .md, not a directory (ADR 0013 D2).
  if (statSync(from).isFile()) {
    linkSync(from, to)
    return
  }

  mkdirSync(to, {recursive: true})
  for (const entry of readdirSync(from, {withFileTypes: true})) {
    const source = join(from, entry.name)
    const destination = join(to, entry.name)
    if (entry.isDirectory()) hardlinkTree(source, destination)
    else if (entry.isFile()) linkSync(source, destination)
    else cpSync(source, destination, {recursive: true})
  }
}

function materialize(mode, from, to) {
  mkdirSync(dirname(to), {recursive: true})

  if (mode === 'symlink') {
    symlinkSync(from, to)
    return 'symlink'
  }

  if (mode === 'hardlink') {
    try {
      hardlinkTree(from, to)
      return 'hardlink'
    } catch (error) {
      // EXDEV: store and project are on different filesystems.
      if (error.code !== 'EXDEV' && error.code !== 'EPERM') throw error
      rmSync(to, {force: true, recursive: true})
      cpSync(from, to, {recursive: true})
      return 'copy'
    }
  }

  cpSync(from, to, {recursive: true})
  return 'copy'
}

/**
 * Generate the projection plugin.
 *
 * The projection decides WHICH Components ship. It never rewrites their
 * content — ADR 0010 D2: "Nội dung Component được giữ nguyên văn."
 *
 * The plugin version carries a digest of the exact bytes shipped. At `user`
 * scope Claude Code keys its plugin cache on the version string, so without
 * the digest a rebuilt projection would be silently ignored.
 */
/**
 * The version a projection of this closure would carry.
 *
 * Computing it reads six SKILL.md files and touches nothing, which lets `sync`
 * decide whether anything needs rebuilding or reinstalling before paying for
 * either. Materialising and, worse, spawning `claude plugin` subprocesses cost
 * three orders of magnitude more.
 */
export function computeVersion({components, included, upstreamVersion}) {
  const digest = createHash('sha256')
  for (const name of [...included].sort()) {
    const {raw, type} = components.get(name)
    // Type is part of the identity: moving a Component from skills/ to agents/
    // changes how it activates even if its bytes are untouched.
    digest.update(`${type}:${name}`)
    digest.update(raw)
  }

  return `${upstreamVersion}+${digest.digest('hex').slice(0, 12)}`
}

export function buildMarketplace({
  components,
  included,
  marketplace,
  mode = 'symlink',
  packageId,
  projectRootDir,
  snapshotDir,
  upstreamVersion,
  version = computeVersion({components, included, snapshotDir, upstreamVersion}),
}) {
  if (!MATERIALIZE_MODES.includes(mode)) {
    throw new Error(`unknown materialize mode "${mode}" (expected ${MATERIALIZE_MODES.join(', ')})`)
  }

  const names = [...included].sort()
  const name = marketplaceName(projectRootDir)

  rmSync(marketplace, {force: true, recursive: true})
  const pluginRoot = join(marketplace, 'plugins', packageId)
  mkdirSync(join(marketplace, '.claude-plugin'), {recursive: true})
  mkdirSync(join(pluginRoot, '.claude-plugin'), {recursive: true})

  // Each type lands in its own slot, and a flat .md keeps its extension —
  // Claude Code reads agents/<name>.md and skills/<name>/SKILL.md (ADR 0013 D2).
  const SLOTS = {agent: {dir: 'agents', flat: true}, command: {dir: 'commands', flat: true}, skill: {dir: 'skills'}}

  const shipped = {}
  const usedModes = new Set()
  for (const componentName of names) {
    const {sourcePath, type} = components.get(componentName)
    const slot = SLOTS[type]
    if (!slot) throw new Error(`COMPONENT_ACTIVATION_UNSUPPORTED: "${componentName}" is a ${type}`)

    // sourcePath may come from the upstream plugin.json and already start with
    // "./", so normalise rather than concatenate or the manifest ends up with
    // "././skills/...".
    const leaf = slot.flat ? `${componentName}.md` : componentName
    const from = join(snapshotDir, relative('.', sourcePath))
    usedModes.add(materialize(mode, from, join(pluginRoot, slot.dir, leaf)))
    ;(shipped[slot.dir] ??= []).push(`./${slot.dir}/${leaf}`)
  }

  writeFileSync(
    join(pluginRoot, '.claude-plugin', 'plugin.json'),
    `${JSON.stringify(
      {
        description: `Projection of ${packageId} — ${names.length}/${components.size} components`,
        name: packageId,
        ...shipped,
        version,
      },
      null,
      2,
    )}\n`,
  )

  writeFileSync(
    join(marketplace, '.claude-plugin', 'marketplace.json'),
    `${JSON.stringify(
      {
        name,
        owner: {name: 'agent-plugins'},
        plugins: [{description: 'generated projection', name: packageId, source: `./plugins/${packageId}`}],
      },
      null,
      2,
    )}\n`,
  )

  return {marketplaceName: name, mode: [...usedModes].join('+') || mode, shipped: names, version}
}
