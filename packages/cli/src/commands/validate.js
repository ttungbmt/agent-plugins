import {Command, Flags} from '@oclif/core'
import {existsSync} from 'node:fs'

import {formatDiagnostic, inspectCatalog, loadManifest} from '../lib/catalog.js'
import {distributionRoot, projectPaths, projectRoot} from '../lib/paths.js'
import {graphDiagnostics} from '../lib/validate.js'

/**
 * cli-spec.md:939-971 — "Validate canonical repository and project configuration."
 * cli-spec.md:1027-1040 keeps the boundary with `doctor` explicit:
 *   validate = is the data valid?   doctor = is the environment healthy?
 * Writes nothing (cli-spec.md:989).
 */
export default class Validate extends Command {
  static description = 'Validate the catalog and project configuration against the schemas. Writes nothing.'

  static flags = {
    strict: Flags.boolean({
      default: false,
      description: 'treat warnings as errors (cli-spec.md:975-987)',
    }),
  }

  async run() {
    const {flags} = await this.parse(Validate)
    const root = distributionRoot()

    const {catalog, diagnostics} = inspectCatalog(root)
    const all = [...diagnostics]

    // Graph and quality checks only mean anything once every manifest parses.
    if (diagnostics.length === 0) all.push(...graphDiagnostics(catalog))
    all.push(...this.projectDiagnostics(catalog))

    const errors = all.filter((d) => d.severity === undefined || d.severity === 'error')
    const warnings = all.filter((d) => d.severity === 'warning')
    const notes = all.filter((d) => d.severity === 'info')

    this.log(`catalog   ${root}`)
    this.log(
      `entities  ${['providers', 'packages', 'capabilities', 'presets', 'profiles', 'policies']
        .map((key) => `${catalog[key].size} ${key}`)
        .join(', ')}`,
    )

    for (const [label, group] of [['error', errors], ['warning', warnings], ['note', notes]]) {
      if (group.length === 0) continue
      this.log('')
      this.log(`${label}s (${group.length})`)
      for (const d of group) this.log(formatDiagnostic(d))
    }

    this.log('')
    if (errors.length > 0) {
      this.error(`${errors.length} error(s), ${warnings.length} warning(s)`, {exit: 1})
    }

    if (warnings.length > 0 && flags.strict) {
      this.error(`${warnings.length} warning(s) promoted to errors by --strict`, {exit: 1})
    }

    const counts = [
      warnings.length > 0 && `${warnings.length} warning(s)`,
      notes.length > 0 && `${notes.length} note(s)`,
    ].filter(Boolean)
    this.log(counts.length > 0 ? `valid, with ${counts.join(' and ')}` : 'valid')
  }

  /** The consumer manifest is optional: `ap validate` is useful in the distribution repo alone. */
  projectDiagnostics(catalog) {
    let paths
    try {
      paths = projectPaths(projectRoot())
    } catch {
      return []
    }

    if (!existsSync(paths.manifest)) return []

    const out = []
    const add = (code, field, message) =>
      out.push({code, field, file: paths.manifest, message, severity: 'error'})

    let manifest
    try {
      manifest = loadManifest(paths.manifest)
    } catch (error) {
      add('INVALID_MANIFEST', '(root)', error.message)
      return out
    }

    const profileId = manifest.spec?.profile
    if (!profileId) {
      add('INVALID_MANIFEST', 'spec.profile', 'no profile declared, and there is no default')
    } else if (!catalog.profiles.has(profileId)) {
      add('UNKNOWN_PROFILE', 'spec.profile', `no Profile "${profileId}"`)
    }

    for (const presetId of manifest.spec?.presets ?? []) {
      if (!catalog.presets.has(presetId)) add('UNKNOWN_PRESET', 'spec.presets', `no Preset "${presetId}"`)
    }

    const policyId = manifest.spec?.policy ?? 'default'
    if (!catalog.policies.has(policyId)) {
      add('UNKNOWN_POLICY', 'spec.policy', `no Policy "${policyId}"`)
    }

    const overrides = manifest.spec?.overrides?.capabilities ?? {}
    for (const key of ['enable', 'disable']) {
      for (const capId of overrides[key] ?? []) {
        if (!catalog.capabilities.has(capId)) {
          add('UNKNOWN_CAPABILITY', `spec.overrides.capabilities.${key}`, `no Capability "${capId}"`)
        }
      }
    }

    return out
  }
}
