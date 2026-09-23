import { relative } from 'node:path'
import { Command, Flags } from '@oclif/core'
import { init } from '../init/index.js'
import { ConfigError } from '../sync/resolve.js'

export default class Init extends Command {
  static override description = 'Create an empty agent-plugins.yaml in the current directory'

  static override flags = {
    name: Flags.string({ description: 'metadata.name of the Config (default: directory name in kebab-case)' }),
    force: Flags.boolean({ description: 'overwrite an existing agent-plugins.yaml' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Init)
    const cwd = process.cwd()

    let result
    try {
      result = await init({ cwd, name: flags.name, force: flags.force })
    } catch (error) {
      if (error instanceof ConfigError) this.error(error.message, { exit: 2 })
      throw error
    }

    this.log(`created ${relative(cwd, result.configPath)}`)
    for (const line of result.gitignoreAdded) this.log(`ignored ${line}`)
    this.log('next    edit agent-plugins.yaml, then run `ap sync`')
  }
}
