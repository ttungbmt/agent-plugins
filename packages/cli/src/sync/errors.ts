/** A Config or Preset that `ap` cannot resolve; each message names the file at fault. */
export class ConfigError extends Error {
  /** One `<file>: <message>` line per problem, in a fixed order; `message` joins them with newlines. */
  readonly messages: string[]

  constructor(messages: string | string[]) {
    const lines = typeof messages === 'string' ? [messages] : messages
    super(lines.join('\n'))
    this.messages = lines
  }
}
