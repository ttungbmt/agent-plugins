/**
 * Graph and quality checks that run after every manifest is structurally valid.
 *
 * catalog-spec.md:2935-2953 separates these from schema validation: some are
 * hard errors, some are conditions a maintainer should see but that do not
 * invalidate the Catalog.
 */

/**
 * Declared `requires` edges must form a DAG.
 *
 * resolution-spec.md:1107-1118 — "Component dependency cycle -> error" by
 * default. Nothing crashes without this check: closure.js terminates on a
 * cycle and pulls in everything reachable. What a cycle signals is a curation
 * problem — ADR 0010 D6 line 110 says a Package whose Components depend on
 * each other densely belongs to `ecosystem`, not `collection`.
 */
function cycleDiagnostics(catalog) {
  const diagnostics = []

  for (const [packageId, pkg] of catalog.packages) {
    const components = pkg.spec.components ?? {}
    const state = new Map()
    const stack = []

    const walk = (name) => {
      if (state.get(name) === 'done') return
      if (state.get(name) === 'open') {
        const cycle = [...stack.slice(stack.indexOf(name)), name].join(' -> ')
        diagnostics.push({
          code: 'COMPONENT_CYCLE',
          entity: packageId,
          field: `spec.components.${name}.requires`,
          file: pkg.__path,
          message: `declared requires form a cycle: ${cycle}`,
          severity: 'error',
        })
        return
      }

      state.set(name, 'open')
      stack.push(name)
      for (const next of components[name]?.requires ?? []) walk(next)
      stack.pop()
      state.set(name, 'done')
    }

    for (const name of Object.keys(components).sort()) walk(name)
  }

  return diagnostics
}

/**
 * Conditions worth a maintainer's attention that do not invalidate the Catalog.
 *
 * Two levels, because `--strict` promotes warnings and a warning that can never
 * be resolved would make that flag permanently red and therefore useless:
 *   warning — a curation gap someone should close
 *   info    — a legitimate state that should simply not be invisible
 */
function qualityDiagnostics(catalog) {
  const diagnostics = []
  const at = (severity) => (code, entry, field, message, entity) =>
    diagnostics.push({code, entity, field, file: entry.__path, message, severity})

  const warn = at('warning')
  const note = at('info')

  for (const [id, cap] of catalog.capabilities) {
    const implementations = cap.spec.implementations

    // catalog-spec.md:1473-1491 — a Capability nothing implements cannot resolve.
    if (implementations.length === 0) {
      warn('MISSING_IMPLEMENTATION', cap, 'spec.implementations', 'no implementation is mapped', id)
      continue
    }

    // catalog-spec.md:1453-1469 — equal preference among cardinality-one
    // candidates makes resolution ambiguous at runtime.
    if (cap.spec.cardinality === 'one' && implementations.length > 1) {
      const priorities = implementations.map((impl) => impl.priority)
      const undecided = new Set(priorities).size < priorities.length || priorities.includes(undefined)
      if (undecided) {
        warn(
          'AMBIGUOUS_RESOLUTION',
          cap,
          'spec.implementations',
          `cardinality "one" with ${implementations.length} candidates and no distinguishing priority — ` +
            'resolution will fail until one is preferred',
          id,
        )
      }
    }
  }

  // A Publisher no Package belongs to is dead catalog weight.
  const usedPublishers = new Set([...catalog.packages.values()].map((pkg) => pkg.spec.publisher))
  for (const [id, publisher] of catalog.publishers) {
    if (!usedPublishers.has(id)) {
      warn('UNUSED_PUBLISHER', publisher, 'metadata.id', 'no Package references this Publisher', id)
    }
  }

  // A `requires` target that implements no Capability is legitimate and
  // permanent — catalog-spec.md:3011-3022, discovery does not imply
  // eligibility. It enters the closure without ever being chosen, so it is
  // reported, but as info: there is nothing here for a maintainer to fix.
  const mapped = new Set()
  for (const cap of catalog.capabilities.values()) {
    for (const impl of cap.spec.implementations) mapped.add(`${impl.package}/${impl.component}`)
  }

  for (const [packageId, pkg] of catalog.packages) {
    for (const [name, component] of Object.entries(pkg.spec.components ?? {})) {
      for (const target of component.requires ?? []) {
        if (!mapped.has(`${packageId}/${target}`)) {
          note(
            'UNCURATED_DEPENDENCY',
            pkg,
            `spec.components.${name}.requires`,
            `"${target}" implements no Capability — it enters the closure as a dependency only`,
            packageId,
          )
        }
      }
    }
  }

  return diagnostics
}

export function graphDiagnostics(catalog) {
  return [...cycleDiagnostics(catalog), ...qualityDiagnostics(catalog)]
}
