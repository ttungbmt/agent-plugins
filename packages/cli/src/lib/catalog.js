import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join} from 'node:path'

import {validateManifest} from '@agent-plugins/schemas'
import {parse} from 'yaml'

/** The one accepted serialized schema version (ADR 0014 D1). */
export const API_VERSION = 'agent-plugins.dev/v1alpha1'

/** Directory -> entity kind. These six hold the authoritative domain data. */
const SOURCES = [
  {dir: ['catalog', 'publishers'], key: 'publishers', kind: 'Publisher'},
  {dir: ['catalog', 'packages'], key: 'packages', kind: 'Package'},
  {dir: ['catalog', 'capabilities'], key: 'capabilities', kind: 'Capability'},
  {dir: ['presets'], key: 'presets', kind: 'Preset'},
  {dir: ['roles'], key: 'roles', kind: 'Role'},
  {dir: ['policies'], key: 'policies', kind: 'Policy'},
]

function readYamlTree(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }

  // catalog-spec.md:1244-1250 — sort before processing. OS enumeration order
  // must not reach diagnostics or generated output.
  for (const entry of entries.sort()) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...readYamlTree(full))
    } else if (entry.endsWith('.yaml')) {
      out.push({path: full, raw: readFileSync(full, 'utf8')})
    }
  }

  return out
}

/**
 * Validate and index one kind. Collects every problem instead of throwing on
 * the first, so `ap validate` can report a whole catalog in one pass.
 */
function indexKind(files, kind) {
  const map = new Map()
  const diagnostics = []

  for (const {path, raw} of files) {
    let doc
    try {
      doc = parse(raw)
    } catch (error) {
      diagnostics.push({code: 'INVALID_MANIFEST', file: path, message: `unparseable YAML: ${error.message}`})
      continue
    }

    if (doc === null || doc === undefined) {
      diagnostics.push({code: 'INVALID_MANIFEST', file: path, message: 'empty manifest'})
      continue
    }

    if (doc.kind !== kind) {
      diagnostics.push({
        code: 'INVALID_MANIFEST',
        field: 'kind',
        file: path,
        message: `expected kind ${kind}, found ${doc.kind ?? '(none)'}`,
      })
      continue
    }

    const schemaErrors = validateManifest(kind, doc)
    if (schemaErrors.length > 0) {
      for (const error of schemaErrors) {
        diagnostics.push({...error, entity: doc.metadata?.id, file: path})
      }

      continue
    }

    const id = doc.metadata.id
    if (map.has(id)) {
      diagnostics.push({
        code: `DUPLICATE_${kind.toUpperCase()}`,
        entity: id,
        field: 'metadata.id',
        file: path,
        message: `already defined in ${map.get(id).__path}`,
      })
      continue
    }

    map.set(id, {...doc, __path: path})
  }

  return {diagnostics, map}
}

/** Every reference must resolve: Capability -> Package -> Publisher, and Role -> Preset -> Capability. */
function referenceDiagnostics(catalog) {
  const diagnostics = []
  const ref = (code, entry, field, message, entity) =>
    diagnostics.push({code, entity, field, file: entry.__path, message})

  for (const [id, pkg] of catalog.packages) {
    if (!catalog.publishers.has(pkg.spec.publisher)) {
      ref('UNKNOWN_PUBLISHER', pkg, 'spec.publisher', `no Publisher "${pkg.spec.publisher}"`, id)
    }
  }

  for (const [id, cap] of catalog.capabilities) {
    cap.spec.implementations.forEach((impl, index) => {
      if (!catalog.packages.has(impl.package)) {
        ref(
          'UNKNOWN_PACKAGE',
          cap,
          `spec.implementations[${index}].package`,
          `no Package "${impl.package}"`,
          id,
        )
      }
    })
  }

  for (const [id, preset] of catalog.presets) {
    for (const capId of preset.spec.capabilities ?? []) {
      if (!catalog.capabilities.has(capId)) {
        ref('UNKNOWN_CAPABILITY', preset, 'spec.capabilities', `no Capability "${capId}"`, id)
      }
    }

    for (const nested of preset.spec.presets ?? []) {
      if (!catalog.presets.has(nested)) {
        ref('UNKNOWN_PRESET', preset, 'spec.presets', `no Preset "${nested}"`, id)
      }
    }
  }

  for (const [id, role] of catalog.roles) {
    for (const presetId of role.spec.presets) {
      if (!catalog.presets.has(presetId)) {
        ref('UNKNOWN_PRESET', role, 'spec.presets', `no Preset "${presetId}"`, id)
      }
    }
  }

  return diagnostics
}

/** Render one diagnostic in the shape catalog-spec.md:2859-2884 prescribes. */
export function formatDiagnostic(d) {
  const location = [d.file, d.field, d.entity].filter(Boolean).join('  ')
  return `${location}\n  ${d.code}  ${d.message}`
}

/**
 * Load the authoritative domain data without throwing, returning whatever
 * could be indexed alongside every diagnostic found.
 */
export function inspectCatalog(root) {
  const catalog = {}
  let diagnostics = []

  for (const {dir, key, kind} of SOURCES) {
    const {diagnostics: found, map} = indexKind(readYamlTree(join(root, ...dir)), kind)
    catalog[key] = map
    diagnostics = [...diagnostics, ...found]
  }

  // References are only meaningful once every manifest is structurally sound.
  if (diagnostics.length === 0) diagnostics = referenceDiagnostics(catalog)

  return {catalog, diagnostics}
}

/**
 * Load the authoritative domain data.
 * source-of-truth.md:112-133 — catalog/, presets/, roles/, policies/
 * are the authoritative source; everything else is derived.
 *
 * catalog-spec.md:2844-2857 — any hard validation error fails the load. A
 * partially valid Catalog must never reach the Resolver.
 */
export function loadCatalog(root) {
  const {catalog, diagnostics} = inspectCatalog(root)
  if (diagnostics.length > 0) {
    const detail = diagnostics.map((d) => formatDiagnostic(d)).join('\n')
    throw new Error(`invalid catalog (${diagnostics.length} problem(s)):\n${detail}`)
  }

  return catalog
}

export function loadManifest(manifestPath) {
  const doc = parse(readFileSync(manifestPath, 'utf8'))
  if (doc?.kind !== 'Project') {
    throw new Error(`${manifestPath}: expected kind Project, found ${doc?.kind}`)
  }

  // There is no project.schema.json, so this is the only validation the project
  // manifest gets beyond its kind. manifest-spec.md:2364-2383 makes the version
  // the one thing that must fail clearly rather than be parsed best-effort.
  if (doc.apiVersion !== API_VERSION) {
    throw new Error(
      `UNSUPPORTED_API_VERSION: ${manifestPath} declares "${doc.apiVersion ?? '(none)'}", expected "${API_VERSION}"`,
    )
  }

  return doc
}
