#!/usr/bin/env node
// Lists the pinned packages and images in the MCP catalog next to the latest published version.
// Report only: a bump can change flags or env vars, so read the changelog and edit the catalog by hand.
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'

const catalog = new URL('../packages/cli/presets/mcp-servers.yaml', import.meta.url)
const { servers } = parse(await readFile(catalog, 'utf8'))

/** The pinned artifact of a stdio server, or null when it pins nothing. */
function pinOf({ command, args = [] }) {
  if (command === 'npx') {
    const spec = args.find((a) => !a.startsWith('-'))
    const at = spec?.lastIndexOf('@') ?? -1
    return at > 0 ? { registry: 'npm', name: spec.slice(0, at), version: spec.slice(at + 1) } : null
  }
  if (command === 'uvx') {
    const from = args.indexOf('--from')
    const spec = from >= 0 ? args[from + 1] : args.find((a, i) => !a.startsWith('-') && args[i - 1] !== '--python')
    const match = spec?.match(/^([A-Za-z0-9._-]+)(?:\[[^\]]*\])?(?:==|@)(.+)$/)
    return match ? { registry: 'pypi', name: match[1], version: match[2] } : null
  }
  if (command === 'docker') {
    const image = args.find((a) => /^[a-z0-9./-]+:[\w.-]+$/.test(a))
    if (!image) return null
    const [name, version] = image.split(':')
    return { registry: name.startsWith('ghcr.io/') ? 'ghcr' : 'docker', name, version }
  }
  return null
}

async function json(url, init) {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json()
}

const semver = (tag) => tag.match(/^v?(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number)
function newestTag(tags) {
  const stable = tags.filter(semver)
  stable.sort((a, b) => {
    const [x, y] = [semver(a), semver(b)]
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
  })
  return stable.at(-1)
}

const latest = {
  npm: async (name) => (await json(`https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`)).version,
  pypi: async (name) => (await json(`https://pypi.org/pypi/${name}/json`)).info.version,
  docker: async (name) => {
    const repo = name.includes('/') ? name : `library/${name}`
    const page = await json(`https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100&ordering=last_updated`)
    return newestTag(page.results.map((t) => t.name))
  },
  ghcr: async (name) => {
    const repo = name.slice('ghcr.io/'.length)
    const { token } = await json(`https://ghcr.io/token?scope=repository:${repo}:pull`)
    // GHCR pages the tag list and follows `Link: <next>; rel="next"`.
    const tags = []
    for (let url = `https://ghcr.io/v2/${repo}/tags/list?n=1000`; url; ) {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error(`${response.status} ${url}`)
      tags.push(...(await response.json()).tags)
      const next = response.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1]
      url = next && new URL(next, 'https://ghcr.io').href
    }
    return newestTag(tags)
  },
}

// Several entries share one pin (e.g. the chrome-devtools variants): look each artifact up once.
const pins = new Map()
for (const [entry, server] of Object.entries(servers)) {
  const pin = server.command && pinOf(server)
  if (!pin) continue
  const key = `${pin.registry}:${pin.name}@${pin.version}`
  if (pins.has(key)) pins.get(key).entries.push(entry)
  else pins.set(key, { ...pin, entries: [entry] })
}

const rows = await Promise.all(
  [...pins.values()].map(async (pin) => {
    try {
      return { ...pin, latest: await latest[pin.registry](pin.name) }
    } catch (error) {
      return { ...pin, latest: `? (${error.message})` }
    }
  }),
)

const outdated = rows.filter((r) => r.latest !== r.version)
const table = rows.map((r) => [r.latest === r.version ? ' ' : '*', r.registry, r.name, r.version, r.latest, r.entries.join(', ')])
const header = [' ', 'registry', 'package', 'pinned', 'latest', 'entries']
const widths = header.map((h, i) => Math.max(h.length, ...table.map((row) => String(row[i]).length)))
for (const row of [header, ...table]) console.log(row.map((cell, i) => String(cell).padEnd(widths[i])).join('  ').trimEnd())
console.log(`\n${outdated.length} of ${rows.length} pins have a newer version.`)
