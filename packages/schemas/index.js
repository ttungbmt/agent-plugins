import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const here = dirname(fileURLToPath(import.meta.url))
const read = (name) => JSON.parse(readFileSync(join(here, 'schemas', `${name}.schema.json`), 'utf8'))

/** Entity kind -> schema file. These six are the authoritative domain data. */
export const KINDS = ['Publisher', 'Package', 'Capability', 'Preset', 'Role', 'Policy']

const FILES = {
  Capability: 'capability',
  Package: 'package',
  Policy: 'policy',
  Preset: 'preset',
  Role: 'role',
  Publisher: 'publisher',
}

export const schemas = Object.fromEntries(KINDS.map((kind) => [kind, read(FILES[kind])]))

const ajv = new Ajv({allErrors: true, strict: true})
addFormats(ajv)
ajv.addSchema(read('common'))
for (const kind of KINDS) ajv.addSchema(schemas[kind])

const validators = Object.fromEntries(
  KINDS.map((kind) => [kind, ajv.getSchema(schemas[kind].$id)]),
)

/**
 * Map an Ajv failure onto the diagnostic codes catalog-spec.md:2887-2931 defines.
 * Anything without a dedicated code stays under the INVALID_MANIFEST umbrella.
 */
function codeFor(error, kind) {
  if (error.keyword === 'additionalProperties') return 'UNKNOWN_FIELD'
  if (error.keyword === 'required') return 'MISSING_FIELD'

  const path = error.instancePath
  // manifest-spec.md:2364-2383 — "it must fail clearly", not under the generic
  // umbrella, and never by best-effort parsing.
  if (path === '/apiVersion') return 'UNSUPPORTED_API_VERSION'

  if (error.keyword === 'pattern' && path === '/metadata/id') {
    return `INVALID_${kind.toUpperCase()}_ID`
  }

  if (path.endsWith('/cardinality')) return 'INVALID_CARDINALITY'
  if (path.endsWith('/priority')) return 'INVALID_PRIORITY'

  return 'INVALID_MANIFEST'
}

/**
 * Validate one parsed manifest against its kind's schema.
 * Returns diagnostics rather than throwing, so a caller can report every
 * problem in a file at once instead of one per run.
 */
export function validateManifest(kind, doc) {
  const validator = validators[kind]
  if (!validator) throw new Error(`no schema registered for kind "${kind}"`)

  if (validator(doc)) return []

  return validator.errors
    // An `if` failure never stands alone — Ajv always reports the real cause
    // from the matching `then` beside it. Surfacing both turns one problem
    // into two diagnostics, the second of which names no actionable field.
    .filter((error) => error.keyword !== 'if')
    .map((error) => ({
      code: codeFor(error, kind),
      field: fieldPath(error),
      message: describe(error),
    }))
}

function fieldPath(error) {
  // catalog-spec.md:2859-2884 shows diagnostics as `spec.implementations[2].component`,
  // so array indices render as brackets rather than as another dotted segment.
  const base =
    error.instancePath === ''
      ? ''
      : error.instancePath
          .slice(1)
          .split('/')
          .reduce((acc, seg) => (/^\d+$/.test(seg) ? `${acc}[${seg}]` : acc === '' ? seg : `${acc}.${seg}`), '')
  if (error.keyword === 'required') {
    return base === '' ? error.params.missingProperty : `${base}.${error.params.missingProperty}`
  }

  if (error.keyword === 'additionalProperties') {
    return base === '' ? error.params.additionalProperty : `${base}.${error.params.additionalProperty}`
  }

  return base === '' ? '(root)' : base
}

function describe(error) {
  switch (error.keyword) {
    case 'additionalProperties': {
      return `unknown field "${error.params.additionalProperty}" — authoritative manifests reject unknown fields so typos and stale fields surface (catalog-spec.md:2303-2325)`
    }

    case 'required': {
      return `missing required field "${error.params.missingProperty}"`
    }

    case 'enum': {
      return `must be one of: ${error.params.allowedValues.join(', ')}`
    }

    case 'const': {
      return `must be "${error.params.allowedValue}"`
    }

    case 'pattern': {
      return `does not match ${error.params.pattern}`
    }

    default: {
      return error.message
    }
  }
}
