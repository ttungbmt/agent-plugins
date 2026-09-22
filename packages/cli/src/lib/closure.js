/**
 * Component -> Component `requires`.
 *
 * The closure is built from DECLARED edges in the Package catalog entry, not
 * from scanning Component bodies. Scanning was measured against
 * mattpocock-skills@c55ee46 and is not sound in either direction:
 *
 *   missed   grill-with-docs -> grilling      (only `<namespace>:<name>` was
 *                                              scanned; the real text is a
 *                                              bare quoted name)
 *   invented code-review -> implement         ("...faithfully implement the
 *                                              originating issue")
 *   invented setup-... -> triage              (`bug:triage`, a tracker label)
 *   real     tdd -> codebase-design           ('call the Skill tool with
 *                                              "codebase-design"')
 *
 * Nothing mechanical separates the last one from the two above it, so the scan
 * is advisory only — see `ap audit`, which reports undeclared references for a
 * curator to accept or reject.
 */

const escape = (name) => name.replaceAll('-', '\\-')

function countMatches(body, re) {
  return [...body.matchAll(re)].length
}

/** Advisory: candidate references from one Component body to its siblings. */
export function scanReferences(body, selfName, siblingNames) {
  const hits = []

  for (const name of siblingNames) {
    if (name === selfName) continue

    const namespaced = countMatches(body, new RegExp(`[a-z0-9-]+:${escape(name)}(?![a-z0-9-])`, 'g'))
    const slash = countMatches(body, new RegExp(`/${escape(name)}(?![a-z0-9-])`, 'g'))
    const bare = countMatches(body, new RegExp(`(?<![a-z0-9-/:])${escape(name)}(?![a-z0-9-])`, 'gi'))

    const total = namespaced + slash + bare
    if (total === 0) continue

    let form = 'bare'
    if (namespaced > 0) form = 'namespaced'
    else if (slash > 0) form = 'slash'

    hits.push({count: total, form, name})
  }

  return hits.sort((a, b) => b.count - a.count)
}

/**
 * Transitive closure over declared `requires`.
 * `declared` is the Package's curated `spec.components` map.
 */
export function requiresClosure(seeds, components, declared = {}) {
  const included = new Set()
  const edges = []
  const queue = [...seeds]

  while (queue.length > 0) {
    const current = queue.shift()
    if (included.has(current)) continue

    if (!components.has(current)) {
      throw new Error(`UNRESOLVED_COMPONENT_REFERENCE: "${current}" is not shipped by the package`)
    }

    included.add(current)

    for (const next of declared[current]?.requires ?? []) {
      edges.push({from: current, to: next})
      if (!included.has(next)) queue.push(next)
    }
  }

  return {edges, included}
}
