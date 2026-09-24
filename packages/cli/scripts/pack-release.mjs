// Dựng Release tarball (ADR 0008): bundle `ap` thành một file, lắp package không có dependency trong
// `release/staging`, rồi `npm pack` ra `release/ap-<ver>.tgz` và bản sao tên cố định `release/ap.tgz`.
import { execFileSync } from 'node:child_process'
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'

const root = new URL('../', import.meta.url)
const out = new URL('release/', root)
const staging = new URL('staging/', out)
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))

await rm(out, { recursive: true, force: true })
await mkdir(new URL('bin/', staging), { recursive: true })

await build({
  entryPoints: [new URL('src/release.ts', root).pathname],
  outfile: new URL('dist/ap.js', staging).pathname,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  minify: false,
  legalComments: 'none',
  alias: { 'react-devtools-core': new URL('scripts/react-devtools-stub.js', root).pathname },
  define: { 'process.env.NODE_ENV': '"production"' },
  // Dependency CommonJS trong bundle ESM vẫn gọi `require` cho module có sẵn của Node.
  banner: { js: "import { createRequire as __apCreateRequire } from 'node:module'; const require = __apCreateRequire(import.meta.url);" },
  logLevel: 'warning',
})

await writeFile(
  new URL('bin/run.js', staging),
  "#!/usr/bin/env node\nimport { execute } from '../dist/ap.js'\n\nawait execute({ dir: import.meta.url })\n",
  { mode: 0o755 },
)
await cp(new URL('presets/', root), new URL('presets/', staging), { recursive: true })

const release = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  bin: pkg.bin,
  files: ['bin', 'dist', 'presets'],
  engines: pkg.engines,
  oclif: { ...pkg.oclif, commands: { ...pkg.oclif.commands, target: './dist/ap.js' } },
  license: pkg.license,
}
await writeFile(new URL('package.json', staging), `${JSON.stringify(release, null, 2)}\n`)

const [{ filename }] = JSON.parse(
  execFileSync('npm', ['pack', '--json', '--pack-destination', out.pathname], { cwd: staging, encoding: 'utf8' }),
)
const tarball = new URL(`ap-${pkg.version}.tgz`, out)
await rm(tarball, { force: true })
await copyFile(new URL(filename, out), tarball)
await rm(new URL(filename, out))
await copyFile(tarball, new URL('ap.tgz', out))
console.log(tarball.pathname)
