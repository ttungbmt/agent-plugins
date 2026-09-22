import {Command, Flags} from '@oclif/core'

import {pruneStore} from '../lib/store.js'

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default class Prune extends Command {
  static description = 'Remove source snapshots no project refers to any more.'

  static flags = {
    'dry-run': Flags.boolean({default: false, description: 'report what would go, delete nothing'}),
  }

  async run() {
    const {flags} = await this.parse(Prune)
    const dryRun = flags['dry-run']
    const {kept, removed, store} = pruneStore({dryRun})

    this.log(`store ${store}`)
    this.log('')

    for (const entry of kept) {
      this.log(`keep    ${entry.key}`)
      for (const project of entry.usedBy) this.log(`          used by ${project}`)
      for (const root of entry.dead) this.log(`          ${dryRun ? 'stale' : 'dropped'} root ${root.target} (${root.reason})`)
    }

    if (kept.length > 0 && removed.length > 0) this.log('')

    for (const entry of removed) {
      this.log(`${dryRun ? 'would remove' : 'removed'}  ${entry.key}  ${mb(entry.bytes)}`)
      for (const root of entry.dead) this.log(`          dead root ${root.target} (${root.reason})`)
    }

    this.log('')
    const freed = removed.reduce((sum, entry) => sum + entry.bytes, 0)
    if (removed.length === 0) {
      this.log(`nothing to prune (${kept.length} snapshot(s) in use)`)
    } else if (dryRun) {
      this.log(`${removed.length} snapshot(s), ${mb(freed)} would be freed — rerun without --dry-run`)
    } else {
      this.log(`${removed.length} snapshot(s) removed, ${mb(freed)} freed`)
    }
  }
}
