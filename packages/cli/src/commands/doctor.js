import {Command} from '@oclif/core'
import {existsSync} from 'node:fs'
import {join} from 'node:path'

export default class Doctor extends Command {
  static description = 'Diagnose whether the local environment is healthy enough to operate'

  async run() {
    const cwd = process.cwd()
    const hasManifest = existsSync(join(cwd, 'agent-plugins.yaml'))
    const hasLockfile = existsSync(join(cwd, 'agent-plugins.lock'))

    const mark = (ok) => (ok ? '✓' : '!')
    const state = (ok) => (ok ? 'found' : 'not found')

    this.log(`✓ agent-plugins ${this.config.version}`)
    this.log(`✓ node ${process.version}`)
    this.log(`✓ cwd ${cwd}`)
    this.log(`${mark(hasManifest)} configuration ${state(hasManifest)} (agent-plugins.yaml)`)
    this.log(`${mark(hasLockfile)} lockfile ${state(hasLockfile)} (agent-plugins.lock)`)
  }
}
