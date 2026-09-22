import {Command} from '@oclif/core'

import {plan} from '../lib/pipeline.js'

export default class Resolve extends Command {
  static description = 'Resolve the project manifest into a concrete Component set. Writes nothing.'

  async run() {
    const p = plan()

    this.log(`profile   ${p.profile.metadata.id}`)
    this.log(`policy    ${p.policy.metadata.id}`)
    this.log(`package   ${p.packageId} @ ${p.upstreamVersion}`)
    this.log('')

    this.log(`capabilities (${p.capabilities.size})`)
    for (const capabilityId of [...p.capabilities].sort()) {
      const chosen = p.selections.get(capabilityId)
      this.log(`  ${capabilityId.padEnd(32)} -> ${chosen.component}`)
    }

    this.log('')
    const pulled = [...p.included].filter((n) => !p.seeds.has(n)).sort()
    this.log(`components (${p.included.size} of ${p.components.size} shipped by the package)`)
    for (const name of [...p.included].sort()) {
      const why = p.seeds.has(name) ? 'selected' : 'required'
      this.log(`  ${why.padEnd(9)} ${name}`)
    }

    if (pulled.length > 0) {
      this.log('')
      this.log('requires edges (declared in catalog)')
      for (const edge of p.edges.filter((e) => pulled.includes(e.to))) {
        this.log(`  ${edge.from} -> ${edge.to}`)
      }
    }
  }
}
