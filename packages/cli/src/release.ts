// Điểm vào của bản bundle: `bin/run.js` của Release tarball gọi `execute`, còn oclif nạp `COMMANDS` từ chính file này
// qua explicit strategy (ADR 0008).
export { execute } from '@oclif/core'
export { COMMANDS } from './commands/index.js'
