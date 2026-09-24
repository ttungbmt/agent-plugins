import Init from './init.js'
import Sync from './sync.js'

/**
 * Command map cho explicit strategy của oclif: bản bundle không quét được thư mục `commands/` (ADR 0008).
 * Command mới phải được thêm vào đây; `commands.test.ts` báo đỏ nếu quên.
 */
export const COMMANDS = {
  init: Init,
  sync: Sync,
}
