// Entry point of the bundle: the Release tarball's `bin/run.js` calls `execute`, and oclif loads `COMMANDS` from this
// very file through the explicit strategy (ADR 0008).
export { execute } from '@oclif/core'
export { COMMANDS } from './commands/index.js'
