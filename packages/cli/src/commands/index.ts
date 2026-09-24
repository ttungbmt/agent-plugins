import Init from './init.js'
import Sync from './sync.js'

/**
 * Command map for oclif's explicit strategy: the bundle cannot scan the `commands/` directory (ADR 0008).
 * New commands must be added here; `commands.test.ts` fails if one is forgotten.
 */
export const COMMANDS = {
  init: Init,
  sync: Sync,
}
