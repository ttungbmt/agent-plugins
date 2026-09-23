import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { ConfigError } from '../sync/resolve.js'

const SCHEMA_URL =
  'https://raw.githubusercontent.com/ttungbmt/agent-plugins/master/packages/schemas/schemas/config.schema.json'
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
/** File chỉ dùng trên máy này mà `ap sync` ghi ra, không được commit. */
const IGNORED = ['.agent-plugins/state.local.json', '.agent-plugins/cache/']

export type InitResult = { configPath: string; gitignoreAdded: string[] }

/** Tạo `agent-plugins.yaml` rỗng và bổ sung .gitignore, theo docs/design/ap-init.md. */
export async function init(opts: { cwd: string; name?: string; force?: boolean }): Promise<InitResult> {
  const name = opts.name ?? kebabCase(basename(opts.cwd))
  if (opts.name !== undefined && !NAME_PATTERN.test(name)) {
    throw new ConfigError(`--name "${name}" must be kebab-case (lowercase letters, digits and single dashes)`)
  }
  if (!name) throw new ConfigError(`cannot derive a Config name from "${basename(opts.cwd)}"; pass --name`)

  const configPath = join(opts.cwd, 'agent-plugins.yaml')
  // flag 'wx' để không ghi đè Config có sẵn, kể cả khi file xuất hiện giữa chừng.
  await writeFile(configPath, configTemplate(name), { flag: opts.force ? 'w' : 'wx' }).catch((error) => {
    if (error.code === 'EEXIST') throw new ConfigError('agent-plugins.yaml already exists; pass --force to overwrite it')
    throw error
  })

  return { configPath, gitignoreAdded: await extendGitignore(join(opts.cwd, '.gitignore')) }
}

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
  #   - base                  # Preset mặc định đi kèm ap
  #   - ./presets/team.yaml   # Preset cục bộ
  # marketplaces:
  #   - owner/repo                              # GitHub, ghim ref: owner/repo@v1.0
  #   - git@github.com:owner/repo.git           # git (SSH hoặc https .git), ghim ref: ...git#main
  #   - https://example.com/marketplace.json    # URL tới marketplace.json
  #   - ./path/to/marketplace                   # thư mục hoặc file .json cục bộ
  # plugins:
  #   name@marketplace: true
`
}

/** Thêm các dòng IGNORED còn thiếu; trả về các dòng đã thêm. */
async function extendGitignore(path: string): Promise<string[]> {
  const text = await readFile(path, 'utf8').catch(() => '')
  const present = new Set(text.split(/\r?\n/).map((line) => line.trim()))
  const missing = IGNORED.filter((line) => !present.has(line))
  if (missing.length === 0) return []
  const separator = text === '' || text.endsWith('\n') ? '' : '\n'
  await writeFile(path, text + separator + missing.map((line) => line + '\n').join(''))
  return missing
}
