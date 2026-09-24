import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { deburr } from 'es-toolkit'
import { ConfigError } from '../sync/errors.js'

const SCHEMA_URL =
  'https://raw.githubusercontent.com/ttungbmt/agent-plugins/master/packages/schemas/schemas/config.schema.json'
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** Machine-local files that `ap sync` writes; never committed. */
const IGNORED = ['.agent-plugins/state.local.json', '.agent-plugins/cache/']

export type InitResult = { configPath: string; gitignoreAdded: string[] }

/** Create an empty `agent-plugins.yaml` and extend .gitignore, per docs/design/ap-init.md. */
export async function init(opts: { cwd: string; name?: string; force?: boolean }): Promise<InitResult> {
  const name = opts.name ?? deriveName(opts.cwd)
  if (!NAME_PATTERN.test(name)) {
    throw new ConfigError(`--name "${name}" must be kebab-case (lowercase letters, digits and single dashes)`)
  }

  const configPath = join(opts.cwd, 'agent-plugins.yaml')
  // The 'wx' flag avoids overwriting an existing Config, even if the file appears in the meantime.
  await writeFile(configPath, configTemplate(name), { flag: opts.force ? 'w' : 'wx' }).catch((error) => {
    if (error.code === 'EEXIST') throw new ConfigError('agent-plugins.yaml already exists; pass --force to overwrite it')
    throw error
  })

  return { configPath, gitignoreAdded: await extendGitignore(join(opts.cwd, '.gitignore')) }
}

/** Kebab-case the directory name with diacritics stripped (`Dự Án` → `du-an`); throws when nothing valid is left. */
function deriveName(cwd: string): string {
  const name = kebabCase(deburr(basename(cwd)))
  if (!NAME_PATTERN.test(name)) {
    throw new ConfigError(`cannot derive a Config name from "${basename(cwd)}"; pass --name`)
  }
  return name
}

/** Hand-written on purpose: es-toolkit's `kebabCase` keeps non-ASCII letters and splits `v2` (ADR 0016). */
function kebabCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function configTemplate(name: string): string {
  return `# yaml-language-server: $schema=${SCHEMA_URL}

kind: Config

metadata:
  name: ${name}

spec: {}
  # presets:
  #   - base                  # Bundled preset shipped with ap
  #   - ./presets/team.yaml   # Local preset
  # marketplaces:
  #   - owner/repo                              # GitHub, pin a ref: owner/repo@v1.0
  #   - git@github.com:owner/repo.git           # git (SSH or https .git), pin a ref: ...git#main
  #   - https://example.com/marketplace.json    # URL to a marketplace.json
  #   - ./path/to/marketplace                   # local directory or .json file
  # plugins:
  #   name@marketplace: true
`
}

/** Append the missing IGNORED lines; returns the lines added. */
async function extendGitignore(path: string): Promise<string[]> {
  const text = await readFile(path, 'utf8').catch(() => '')
  const present = new Set(text.split(/\r?\n/).map((line) => line.trim()))
  const missing = IGNORED.filter((line) => !present.has(line))
  if (missing.length === 0) return []
  const separator = text === '' || text.endsWith('\n') ? '' : '\n'
  await writeFile(path, text + separator + missing.map((line) => line + '\n').join(''))
  return missing
}
