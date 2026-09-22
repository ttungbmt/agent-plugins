import {Args, Command} from '@oclif/core'

import {plan} from '../lib/pipeline.js'

export default class Explain extends Command {
  static args = {
    capability: Args.string({description: 'Capability ID to explain', required: true}),
  }

  static description = 'Explain why a Capability resolved to the Component it did.'

  async run() {
    const {args} = await this.parse(Explain)
    const p = plan()

    const chosen = p.selections.get(args.capability)
    if (!chosen) {
      this.error(`"${args.capability}" is not in this project's resolution`, {exit: 1})
    }

    const capability = p.catalog.capabilities.get(args.capability)
    this.log(`${args.capability}`)
    this.log(`  cardinality   ${capability.spec.cardinality}`)
    this.log(`  selected      ${chosen.package}:${chosen.component}`)
    this.log('')

    this.log('  reached through')
    for (const d of p.decisions.filter((d) => d.entity === args.capability)) {
      this.log(`    ${d.reason}`)
    }

    const pulls = p.edges.filter((e) => e.from === chosen.component)
    if (pulls.length > 0) {
      this.log('')
      this.log('  pulls in (declared requires)')
      for (const edge of pulls) this.log(`    ${edge.to}`)
    }
  }
}
