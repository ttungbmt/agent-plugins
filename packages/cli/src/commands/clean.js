import {Command} from '@oclif/core'
import {existsSync, readFileSync, rmSync} from 'node:fs'

import {globalEntriesFor, uninstallProjection} from '../lib/install.js'
import {projectPaths, projectRoot} from '../lib/paths.js'
import {removeRoot} from '../lib/store.js'

export default class Clean extends Command {
  static description = 'Uninstall what this project installed and remove its generated state.'

  async run() {
    const paths = projectPaths(projectRoot())

    // D8: only remove what the receipt says we installed.
    if (existsSync(paths.receipt)) {
      const receipt = JSON.parse(readFileSync(paths.receipt, 'utf8'))
      const [packageId] = receipt.plugin.split('@')
      const done = uninstallProjection({
        marketplaceName: receipt.marketplace,
        packageId,
        projectRootDir: paths.root,
      })
      for (const step of done) this.log(`removed  ${step}`)

      const leftover = globalEntriesFor(receipt.marketplace)
      this.log(
        leftover.length === 0
          ? 'verified ~/.claude carries no record of this project'
          : `WARNING  ~/.claude still records this marketplace in: ${leftover.join(', ')}`,
      )

      // Release this project's claim on the shared snapshot. The snapshot
      // itself stays — other projects may still need it. `ap prune` collects
      // the ones nobody refers to any more.
      if (receipt.snapshotKey && removeRoot(receipt.snapshotKey, paths.root)) {
        this.log(`released ${receipt.snapshotKey} (snapshot kept in the shared store)`)
      }
    } else {
      this.log('no receipt found — nothing was recorded as installed')
    }

    for (const dir of [paths.marketplace, paths.state]) {
      rmSync(dir, {force: true, recursive: true})
    }

    this.log('removed  .agent-plugins/{marketplace,state}')
  }
}
