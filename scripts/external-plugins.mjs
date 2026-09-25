#!/usr/bin/env node
// Generates this repo's External plugins from plugins/external.yaml (ADR 0018).
//   update  bump each `ref` to the newest upstream commit (per `track`), then sync
//   sync    copy Vendored plugins at their pinned `ref` and regenerate their marketplace.json entries
//   check   write nothing; exit 1 when plugins/external/ or marketplace.json drift from the list
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { parseDocument, Scalar } from 'yaml'

const root = new URL('..', import.meta.url).pathname
const listPath = join(root, 'plugins/external.yaml')
const externalDir = join(root, 'plugins/external')
const marketplacePath = join(root, '.claude-plugin/marketplace.json')

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const repoUrl = (repo) => `https://github.com/${repo}`

/** Reads and validates plugins/external.yaml; returns the YAML document (for `update`) and the plugins. */
async function loadList() {
  const doc = parseDocument(await readFile(listPath, 'utf8'))
  const entries = Object.entries(doc.toJS()?.plugins ?? {})
  const plugins = entries.map(([name, p]) => {
    const where = `plugins/external.yaml: ${name}`
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`${where}: name must be kebab-case`)
    if (!/^[\w.-]+\/[\w.-]+$/.test(p?.repo ?? '')) throw new Error(`${where}: repo must be owner/repo`)
    // quoted, or YAML may read an all-digit sha as a number
    if (typeof p.ref !== 'string' || !/^[0-9a-f]{40}$/.test(p.ref))
      throw new Error(`${where}: ref must be a quoted full commit sha`)
    const track = p.track ?? 'branch'
    if (!['branch', 'tag'].includes(track)) throw new Error(`${where}: track must be branch or tag`)
    const skills = p.skills ?? null
    if (skills) {
      const dirs = skills.map((s) => basename(s))
      if (new Set(dirs).size !== dirs.length) throw new Error(`${where}: two skills share a directory name`)
    }
    return { name, repo: p.repo, ref: p.ref, track, description: p.description ?? '', skills }
  })
  return { doc, plugins }
}

/** The newest upstream commit for a plugin's `track`. */
function latestRef({ repo, track }) {
  if (track === 'branch') return git(['ls-remote', repoUrl(repo), 'HEAD']).split(/\s+/)[0]
  const lines = git(['ls-remote', '--tags', '--sort=-v:refname', repoUrl(repo)]).split('\n').filter(Boolean)
  const refs = new Map(lines.map((l) => l.split('\t').reverse()))
  const newest = [...refs.keys()].find((r) => !r.endsWith('^{}'))
  if (!newest) throw new Error(`${repo} has no tags; use track: branch`)
  return refs.get(`${newest}^{}`) ?? refs.get(newest) // prefer the peeled commit of an annotated tag
}

/** Checks out repo@ref once per run, into a shared temp dir. */
function createCheckouts(tmp) {
  const cache = new Map()
  return (repo, ref) => {
    const key = `${repo}@${ref}`
    if (!cache.has(key)) {
      const dir = join(tmp, 'src', key.replace(/[/@]/g, '_'))
      mkdirSync(dir, { recursive: true })
      git(['init', '-q'], dir)
      git(['fetch', '-q', '--depth', '1', repoUrl(repo), ref], dir)
      git(['checkout', '-q', 'FETCH_HEAD'], dir)
      cache.set(key, dir)
    }
    return cache.get(key)
  }
}

/** Builds a Vendored plugin's directory under `into`: its selected skill dirs plus a generated plugin.json. */
async function stageVendored(plugin, checkout, into) {
  const src = checkout(plugin.repo, plugin.ref)
  const dest = join(into, plugin.name)
  for (const path of plugin.skills) {
    const from = join(src, path)
    if (!(await exists(join(from, 'SKILL.md'))))
      throw new Error(`${plugin.name}: ${plugin.repo}@${plugin.ref} has no ${path}/SKILL.md`)
    await cp(from, join(dest, 'skills', basename(path)), { recursive: true, verbatimSymlinks: true })
  }
  await mkdir(join(dest, '.claude-plugin'), { recursive: true })
  await writeJson(join(dest, '.claude-plugin/plugin.json'), {
    name: plugin.name,
    description: plugin.description,
    author: author(plugin),
    homepage: repoUrl(plugin.repo),
    repository: repoUrl(plugin.repo),
  })
}

/** Upstream's GitHub owner stands in as the author. */
function author({ repo }) {
  const owner = repo.split('/')[0]
  return { name: owner, url: `https://github.com/${owner}` }
}

/** The marketplace.json entry of an External plugin. */
function marketplaceEntry(plugin) {
  const source = plugin.skills
    ? `./plugins/external/${plugin.name}`
    : { source: 'github', repo: plugin.repo, sha: plugin.ref }
  const { name, description } = plugin
  return { name, description, author: author(plugin), source, homepage: repoUrl(plugin.repo) }
}

/**
 * External plugins are the only entries that point outside the repo or into plugins/external/; Internal and Custom
 * plugins always use a ./plugins/internal|custom path. Those hand-written entries keep their order.
 */
const isExternalEntry = ({ source }) =>
  typeof source === 'object' || (typeof source === 'string' && source.startsWith('./plugins/external/'))

async function expectedMarketplace(plugins) {
  const marketplace = JSON.parse(await readFile(marketplacePath, 'utf8'))
  const handWritten = marketplace.plugins.filter((e) => !isExternalEntry(e))
  const clash = handWritten.find((e) => plugins.some((p) => p.name === e.name))
  if (clash)
    throw new Error(`${clash.name} is both hand-written in marketplace.json and listed in plugins/external.yaml`)
  return { ...marketplace, plugins: [...handWritten, ...plugins.map(marketplaceEntry)] }
}

/** Directories under plugins/external/ that hold a generated plugin; others (e.g. placeholders) are left alone. */
async function generatedDirs() {
  const names = await readdir(externalDir).catch(() => [])
  const found = []
  for (const name of names) if (await exists(join(externalDir, name, '.claude-plugin/plugin.json'))) found.push(name)
  return found
}

async function sync(plugins, checkout, tmp) {
  const staged = join(tmp, 'staged')
  for (const p of plugins.filter((p) => p.skills)) await stageVendored(p, checkout, staged)
  const vendored = new Set(plugins.filter((p) => p.skills).map((p) => p.name))
  for (const name of await generatedDirs())
    if (!vendored.has(name)) await rm(join(externalDir, name), { recursive: true })
  for (const name of vendored) {
    await rm(join(externalDir, name), { recursive: true, force: true })
    await cp(join(staged, name), join(externalDir, name), { recursive: true, verbatimSymlinks: true })
  }
  await writeJson(marketplacePath, await expectedMarketplace(plugins))
  console.log(`synced ${plugins.length} External plugin(s)`)
}

async function check(plugins, checkout, tmp) {
  const staged = join(tmp, 'staged')
  const problems = []
  const vendored = plugins.filter((p) => p.skills)
  for (const p of vendored) {
    await stageVendored(p, checkout, staged)
    if (!(await exists(join(externalDir, p.name)))) {
      problems.push(`missing plugins/external/${p.name}/`)
      continue
    }
    const want = await tree(join(staged, p.name))
    const have = await tree(join(externalDir, p.name))
    for (const [file, bytes] of want) {
      if (!have.has(file)) problems.push(`missing plugins/external/${p.name}/${file}`)
      else if (!bytes.equals(have.get(file))) problems.push(`edited plugins/external/${p.name}/${file}`)
    }
    for (const file of have.keys()) if (!want.has(file)) problems.push(`extra plugins/external/${p.name}/${file}`)
  }
  for (const name of await generatedDirs())
    if (!vendored.some((p) => p.name === name))
      problems.push(`plugins/external/${name} is not in plugins/external.yaml`)
  const marketplace = JSON.parse(await readFile(marketplacePath, 'utf8'))
  if (!isDeepStrictEqual(marketplace, await expectedMarketplace(plugins)))
    problems.push('.claude-plugin/marketplace.json External plugin entries are out of date')

  if (problems.length === 0) return console.log(`${plugins.length} External plugin(s) match plugins/external.yaml`)
  for (const p of problems) console.error(`✗ ${p}`)
  console.error('Run `pnpm plugins:sync`; to edit upstream content, move the plugin to plugins/custom/ (ADR 0018).')
  process.exitCode = 1
}

async function update(doc, plugins) {
  const bumped = plugins.map((p) => {
    const ref = latestRef(p)
    if (ref !== p.ref) {
      console.log(`${p.name}: ${p.ref.slice(0, 7)} → ${ref.slice(0, 7)}`)
      const quoted = new Scalar(ref)
      quoted.type = Scalar.QUOTE_DOUBLE
      doc.setIn(['plugins', p.name, 'ref'], quoted)
    }
    return { ...p, ref }
  })
  await writeFile(listPath, doc.toString())
  return bumped
}

async function tree(dir, base = dir, files = new Map()) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await tree(path, base, files)
    else files.set(relative(base, path), await readFile(path))
  }
  return files
}

const exists = (path) => stat(path).then(() => true, () => false)
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

const command = process.argv[2]
if (!['update', 'sync', 'check'].includes(command)) {
  console.error('usage: external-plugins.mjs <update|sync|check>')
  process.exit(2)
}
const tmp = await mkdtemp(join(tmpdir(), 'external-plugins-'))
try {
  let { doc, plugins } = await loadList()
  const checkout = createCheckouts(tmp)
  if (command === 'update') plugins = await update(doc, plugins)
  if (command === 'check') await check(plugins, checkout, tmp)
  else await sync(plugins, checkout, tmp)
} finally {
  await rm(tmp, { recursive: true, force: true })
}
