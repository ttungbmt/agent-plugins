import {readFileSync} from 'node:fs'
import {join} from 'node:path'

import {loadCatalog, loadManifest} from './catalog.js'
import {requiresClosure} from './closure.js'
import {distributionRoot, projectPaths, projectRoot, sourceStore} from './paths.js'
import {expandProfile, selectImplementations} from './resolve.js'
import {ensureSnapshot, readComponents} from './source.js'

/**
 * Reject Components whose activation the policy forbids.
 *
 * The default V1 policy denies hook/mcp/lsp outright. That keeps
 * security-model.md:1904 ("V1 MUST NOT execute arbitrary package hooks") true
 * as written, instead of requiring it to be weakened.
 */
function applyPolicy(policy, components, included, snapshotDir, manifestRel) {
  const rules = policy?.spec?.componentTypes ?? {}
  const denied = []

  for (const name of included) {
    const type = components.get(name).type
    if (rules[type] === 'deny') denied.push(`${name} (${type})`)
  }

  const upstream = JSON.parse(readFileSync(join(snapshotDir, manifestRel), 'utf8'))
  for (const [key, type] of [['hooks', 'hook'], ['mcpServers', 'mcp'], ['lspServers', 'lsp']]) {
    if (upstream[key] && rules[type] === 'deny') {
      denied.push(`package-level ${key}`)
    }
  }

  if (denied.length > 0) {
    throw new Error(`COMPONENT_ACTIVATION_UNSUPPORTED: policy "${policy.metadata.id}" denies ${denied.join(', ')}`)
  }
}

/**
 * Everything up to (but not including) writing anything.
 * `resolve` stops here; `sync` continues.
 */
export function plan() {
  const root = projectRoot()
  const paths = projectPaths(root)
  const catalog = loadCatalog(distributionRoot())
  const manifest = loadManifest(paths.manifest)

  const {capabilities, decisions: profileDecisions, profile} = expandProfile(catalog, manifest)
  const {decisions: selectionDecisions, selections} = selectImplementations(catalog, capabilities)

  const packageIds = new Set([...selections.values()].map((s) => s.package))
  if (packageIds.size !== 1) {
    throw new Error(`V1 MVP supports exactly one package per project, found ${packageIds.size}`)
  }

  const packageId = [...packageIds][0]
  const pkg = catalog.packages.get(packageId)

  const snapshot = ensureSnapshot(pkg, sourceStore(), paths.root)
  const snapshotDir = snapshot.dir
  const {components, upstreamVersion} = readComponents(pkg, snapshotDir)

  const seeds = [...selections.values()].map((s) => s.component)
  for (const seed of seeds) {
    if (!components.has(seed)) {
      throw new Error(`UNRESOLVED_COMPONENT_REFERENCE: "${seed}" is not shipped by ${packageId}`)
    }
  }

  const {edges, included} = requiresClosure(seeds, components, pkg.spec.components ?? {})

  const policyId = manifest.spec?.policy ?? 'default'
  const policy = catalog.policies.get(policyId)
  if (!policy) throw new Error(`unknown policy "${policyId}"`)
  applyPolicy(policy, components, included, snapshotDir, pkg.spec.discovery.manifest)

  return {
    capabilities,
    catalog,
    components,
    decisions: [...profileDecisions, ...selectionDecisions],
    edges,
    included,
    manifest,
    packageId,
    paths,
    policy,
    profile,
    seeds: new Set(seeds),
    selections,
    snapshot,
    snapshotDir,
    upstreamVersion,
  }
}
