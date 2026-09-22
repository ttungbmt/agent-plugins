import {Command} from '@oclif/core'

import {scanReferences} from '../lib/closure.js'
import {plan} from '../lib/pipeline.js'

/**
 * ADR 0010 D6: "Tham chiếu chưa được khai báo sẽ được báo để người curate xử lý."
 *
 * This is that report, and nothing more. Scanning never feeds resolution —
 * it only nominates edges for a human to accept into the Package catalog.
 */
export default class Audit extends Command {
  static description = 'Report references found in Component bodies that are not declared as requires.'

  async run() {
    const p = plan()
    const declared = p.catalog.packages.get(p.packageId).spec.components ?? {}
    const names = [...p.components.keys()]

    let undeclared = 0
    let confirmed = 0

    for (const name of [...p.included].sort()) {
      const known = new Set(declared[name]?.requires ?? [])
      const hits = scanReferences(p.components.get(name).body, name, names)
      const missing = hits.filter((h) => !known.has(h.name))

      if (known.size === 0 && missing.length === 0) continue

      this.log(name)
      for (const edge of known) {
        const seen = hits.some((h) => h.name === edge)
        this.log(`  declared   ${edge}${seen ? '' : '   (not found in body — verify by hand)'}`)
        confirmed++
      }

      for (const hit of missing) {
        this.log(`  undeclared ${hit.name.padEnd(28)} ${hit.count}x ${hit.form}`)
        undeclared++
      }

      this.log('')
    }

    this.log(`${confirmed} declared, ${undeclared} undeclared candidate(s).`)
    this.log('Candidates are suggestions, not facts: this package writes tracker labels')
    this.log('like `bug:triage` and uses words like "implement" as plain English.')
    this.log('Accept a real one by adding it to spec.components.<name>.requires.')
  }
}
