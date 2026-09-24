import { stat } from 'node:fs/promises'
import { isAbsolute, normalize, resolve } from 'node:path'
import { trimEnd } from 'es-toolkit'
import { ConfigError } from './errors.js'
import type { MarketplaceSource } from './types.js'

const GITHUB_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
/** Hosts whose https URLs `claude` treats as git repos even without a `.git` suffix. */
const GIT_HOSTS = new Set(['github.com', 'gitlab.com'])

/**
 * Parse a Shorthand declaration into a source, classifying it the way `claude plugin marketplace add` does so the source
 * written out matches the one `claude` writes itself. A local path is resolved against `dir` (the declaring file's
 * directory) and stat'ed to tell `directory` from `file`.
 */
export async function parseShorthand(text: string, dir: string, origin: string, what = 'marketplace'): Promise<MarketplaceSource> {
  if (text.startsWith('./') || text.startsWith('../') || isAbsolute(text)) return local(text, dir, origin, what)
  if (text.startsWith('git@') || text.startsWith('ssh://')) return git(text)
  if (text.startsWith('https://') || text.startsWith('http://')) return web(text)

  const [repo, ref] = splitOnce(text, '@')
  if (GITHUB_REPO.test(repo)) return withRef({ source: 'github', repo }, ref)
  throw new ConfigError(
    `${origin}: unrecognised ${what} source "${text}"; try owner/repo, https://..., git@host:path or ./path`,
  )
}

function web(text: string): MarketplaceSource {
  const [body, ref] = splitOnce(text, '#')
  const url = new URL(body)
  if (!url.pathname.endsWith('.git') && !GIT_HOSTS.has(url.hostname)) return { source: 'url', url: text }
  url.pathname = trimEnd(url.pathname, '/')
  if (!url.pathname.endsWith('.git')) url.pathname += '.git'
  return withRef({ source: 'git', url: url.href }, ref)
}

function git(text: string): MarketplaceSource {
  const [url, ref] = splitOnce(text, '#')
  return withRef({ source: 'git', url }, ref)
}

async function local(text: string, dir: string, origin: string, what: string): Promise<MarketplaceSource> {
  if (dir.startsWith('https://')) {
    throw new ConfigError(`relative path "${text}" cannot be used in remote preset ${origin}`)
  }
  const info = await stat(resolve(dir, text)).catch(() => {
    throw new ConfigError(`${origin}: ${what} path "${text}" does not exist`)
  })
  const path = isAbsolute(text) ? normalize(text) : relativePath(text)
  if (info.isDirectory()) return { source: 'directory', path }
  if (!text.endsWith('.json')) throw new ConfigError(`${origin}: ${what} file "${text}" must be a .json file`)
  return { source: 'file', path }
}

/** `./a/../b/` → `./b`; a leading `../` is kept. */
function relativePath(text: string): string {
  const path = trimEnd(normalize(text), '/')
  return path === '..' || path.startsWith('../') ? path : `./${path}`
}

function splitOnce(text: string, separator: string): [string, string | undefined] {
  const at = text.indexOf(separator)
  return at < 0 ? [text, undefined] : [text.slice(0, at), text.slice(at + 1)]
}

function withRef(source: MarketplaceSource, ref: string | undefined): MarketplaceSource {
  return ref ? { ...source, ref } : source
}
