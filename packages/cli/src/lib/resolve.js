/**
 * Capability-driven resolution.
 *
 * resolution-spec.md:29 — "determine the smallest valid and reproducible
 * implementation set that satisfies all required capabilities."
 *
 * Selection is never package-driven: we start from the Profile's Capabilities
 * and pick one implementation each, honouring cardinality.
 */

/** Resolution Decision, per resolution-spec.md:2196-2209 (subset). */
function decision(code, entity, outcome, reason) {
  return {code, entity, outcome, reason}
}

/** Profile -> Presets -> Capability IDs. Presets may include other presets. */
export function expandProfile(catalog, manifest) {
  const decisions = []
  const capabilities = new Set()

  const profileId = manifest.spec?.profile
  const profile = catalog.profiles.get(profileId)
  if (!profile) throw new Error(`unknown profile "${profileId}"`)

  const seenPresets = new Set()
  const queue = [
    ...(profile.spec?.presets ?? []).map((id) => ({id, via: `profile:${profileId}`})),
    ...(manifest.spec?.presets ?? []).map((id) => ({id, via: 'project'})),
  ]

  while (queue.length > 0) {
    const {id, via} = queue.shift()
    if (seenPresets.has(id)) continue
    seenPresets.add(id)

    const preset = catalog.presets.get(id)
    if (!preset) throw new Error(`unknown preset "${id}" (required by ${via})`)

    decisions.push(decision('preset-expanded', id, 'included', `required by ${via}`))

    for (const nested of preset.spec?.presets ?? []) {
      queue.push({id: nested, via: `preset:${id}`})
    }

    for (const capId of preset.spec?.capabilities ?? []) {
      capabilities.add(capId)
      decisions.push(decision('required', capId, 'required', `included by preset ${id}`))
    }
  }

  for (const capId of manifest.spec?.overrides?.capabilities?.enable ?? []) {
    capabilities.add(capId)
    decisions.push(decision('enabled', capId, 'required', 'enabled by project override'))
  }

  for (const capId of manifest.spec?.overrides?.capabilities?.disable ?? []) {
    if (capabilities.delete(capId)) {
      decisions.push(decision('disabled', capId, 'removed', 'disabled by project override'))
    }
  }

  return {capabilities, decisions, profile}
}

/** One Component per Capability. cardinality: one means exactly one winner. */
export function selectImplementations(catalog, capabilityIds) {
  const decisions = []
  const selections = new Map()

  for (const capId of [...capabilityIds].sort()) {
    const cap = catalog.capabilities.get(capId)
    if (!cap) throw new Error(`UNKNOWN_CAPABILITY: "${capId}"`)

    const candidates = cap.spec?.implementations ?? []
    if (candidates.length === 0) {
      throw new Error(`UNRESOLVED_CAPABILITY: "${capId}" has no implementations`)
    }

    const cardinality = cap.spec?.cardinality ?? 'one'
    if (cardinality === 'one' && candidates.length > 1) {
      // resolution-spec.md:1553-1581 — fail rather than pick alphabetically.
      throw new Error(
        `AMBIGUOUS_RESOLUTION: "${capId}" has ${candidates.length} candidates ` +
          `(${candidates.map((c) => `${c.package}:${c.component}`).join(', ')}) ` +
          'and no preference rule; declare an explicit override',
      )
    }

    const chosen = candidates[0]
    selections.set(capId, chosen)
    decisions.push(
      decision(
        'candidate-selected',
        `${chosen.package}:${chosen.component}`,
        'selected',
        `sole implementation of ${capId}`,
      ),
    )
  }

  return {decisions, selections}
}
