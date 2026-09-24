// PROTOTYPE — throwaway. Answers: "what should `ap sync` output look like?"
// Fake data only, nothing touches Claude Code. Delete once a variant is folded into sync.ts.
//
//   node packages/cli/src/commands/sync-output.prototype.mjs [a|b|c|d|all] [--static]
//
// Without --static each action shows a spinner that is redrawn in place into its final line,
// so progress and summary are the same line (no second table).
import { styleText } from 'node:util'

const c = (fmt, s) => styleText(fmt, s)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Raw actions as the planner emits them today: an install in the user Scope + uninstall in project = a move.
const RAW = [
  { kind: 'install', target: 'plugin', name: 'claude-code-setup@claude-plugins-official', scope: 'user', ms: 1000 },
  { kind: 'install', target: 'plugin', name: 'claude-md-management@claude-plugins-official', scope: 'user', ms: 1100 },
  { kind: 'install', target: 'plugin', name: 'commit-commands@claude-plugins-official', scope: 'user', ms: 1000 },
  { kind: 'install', target: 'plugin', name: 'skill-creator@claude-plugins-official', scope: 'user', ms: 1200 },
  { kind: 'uninstall', target: 'plugin', name: 'claude-code-setup@claude-plugins-official', ms: 900 },
  { kind: 'uninstall', target: 'plugin', name: 'claude-md-management@claude-plugins-official', ms: 3000 },
  { kind: 'uninstall', target: 'plugin', name: 'commit-commands@claude-plugins-official', ms: 900 },
  { kind: 'uninstall', target: 'plugin', name: 'skill-creator@claude-plugins-official', ms: 900 },
  { kind: 'install', target: 'skill', name: 'tdd', from: 'mattpocock/skills', ms: 700 },
  { kind: 'update', target: 'mcp', name: 'context7', ms: 400 },
  { kind: 'install', target: 'mcp', name: 'playwright', ms: 800, error: 'claude mcp add exited 1: npx not found' },
  { kind: 'install', target: 'hook', name: 'format-on-save', ms: 50 },
]
const NOTES = ['preset agent-plugins changed upstream — run with --update to accept']

/** Collapse install(user)+uninstall(project) of the same target into one `move`. */
function collapse(raw) {
  const out = []
  for (const a of raw) {
    if (a.kind === 'uninstall') {
      const moved = out.find((b) => b.kind === 'install' && b.target === a.target && b.name === a.name && b.scope)
      if (moved) { Object.assign(moved, { kind: 'move', fromScope: 'project', ms: moved.ms + a.ms }); continue }
    }
    out.push({ ...a })
  }
  return out
}

const GROUP = { plugin: 'Plugins', skill: 'Skills', mcp: 'MCP servers', hook: 'Hooks', marketplace: 'Marketplaces' }
const secs = (ms) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`)
const byGroup = (actions) => Object.groupBy(actions, (a) => a.target)
const totals = (actions) => {
  const t = {}
  for (const a of actions) { const k = a.error ? 'failed' : a.kind; t[k] = (t[k] ?? 0) + 1 }
  return t
}
const PAST = { install: 'installed', uninstall: 'removed', update: 'updated', move: 'moved', failed: 'failed' }
const totalLine = (actions, sep = ' · ') => {
  const t = totals(actions)
  return Object.entries(t).map(([k, n]) => (k === 'failed' ? c(['red', 'bold'], `${n} ${PAST[k]}`) : `${n} ${PAST[k]}`)).join(sep)
}
const totalMs = (actions) => actions.reduce((s, a) => s + a.ms, 0)
const scopeTag = (s) => c(s === 'user' ? 'magenta' : 'cyan', s)
const shortName = (n) => n.replace(/@claude-plugins-official$/, c('dim', '@claude-plugins-official'))

// Each variant: rows (ordered, with optional group headers), line(a, state), header, footer.
const VARIANTS = {
  a: {
    title: 'A — flat list, one line per action, verbs colored, totals footer',
    header: () => [],
    groupHeader: () => null,
    line(a, state) {
      const verb = { install: c('green', '+ install'), uninstall: c('red', '- remove '), update: c('yellow', '~ update '), move: c('blue', '→ move   ') }[a.kind]
      const where = a.kind === 'move' ? ` ${scopeTag(a.fromScope)} → ${scopeTag(a.scope)}` : ''
      const what = `${a.target === 'mcp' ? 'MCP server ' : a.target === 'plugin' ? '' : a.target + ' '}${shortName(a.name)}`
      if (state === 'run') return `${c('cyan', '⠋')} ${verb} ${what}${where}`
      const mark = a.error ? c('red', '✖') : c('green', '✔')
      const err = a.error ? `\n    ${c('red', a.error)}` : ''
      return `${mark} ${verb} ${what}${where} ${c('dim', secs(a.ms))}${err}`
    },
    footer: (acts) => ['', `${totalLine(acts)} ${c('dim', `in ${secs(totalMs(acts))}`)}`],
  },

  b: {
    title: 'B — grouped by kind (pnpm/cargo style), aligned names, scope as badge',
    header: () => [],
    groupHeader: (g, acts) => `\n${c('bold', GROUP[g])} ${c('dim', `(${acts.length})`)}`,
    line(a, state) {
      const icon = state === 'run' ? c('cyan', '⠋') : a.error ? c('red', '✖') : { install: c('green', '+'), uninstall: c('red', '-'), update: c('yellow', '~'), move: c('blue', '→') }[a.kind]
      const name = a.name.replace(/@claude-plugins-official$/, '').padEnd(22)
      const detail = a.kind === 'move'
        ? `${c('dim', 'moved')} ${scopeTag(a.fromScope)} ${c('dim', '→')} ${scopeTag(a.scope)}`
        : a.from ? `${c('dim', 'from')} ${a.from}` : c('dim', PAST[a.kind])
      if (state === 'run') return `  ${icon} ${name}`
      return `  ${icon} ${name} ${a.error ? c('red', a.error) : detail} ${c('dim', secs(a.ms))}`
    },
    footer: (acts) => ['', `${acts.some((a) => a.error) ? c('red', '✖') : c('green', '✔')} ${totalLine(acts, ', ')} ${c('dim', `in ${secs(totalMs(acts))}`)}`],
  },

  c: {
    title: 'C — terraform-style: plan block first, then compact apply log',
    header: (acts) => {
      const sym = { install: c('green', '+'), uninstall: c('red', '-'), update: c('yellow', '~'), move: c('blue', '→') }
      const lines = [c('bold', 'Plan'), '']
      for (const [g, list] of Object.entries(byGroup(acts))) {
        lines.push(`  ${c('dim', GROUP[g].toLowerCase())}`)
        for (const a of list) lines.push(`    ${sym[a.kind]} ${a.name}${a.kind === 'move' ? `  ${scopeTag(a.fromScope)} → ${scopeTag(a.scope)}` : ''}`)
      }
      const t = totals(acts.map((a) => ({ ...a, error: undefined })))
      lines.push('', `  ${Object.entries(t).map(([k, n]) => `${n} to ${k}`).join(', ')}`, '', c('bold', 'Apply'), '')
      return lines
    },
    groupHeader: () => null,
    line(a, state) {
      const label = `${a.kind.padEnd(7)} ${a.name.replace(/@claude-plugins-official$/, '')}`
      if (state === 'run') return `  ${c('cyan', '⠋')} ${label}`
      return a.error ? `  ${c('red', '✖')} ${label}  ${c('red', a.error)}` : `  ${c('green', '✔')} ${c('dim', label)} ${c('dim', secs(a.ms))}`
    },
    footer: (acts) => ['', `${totalLine(acts)} ${c('dim', `in ${secs(totalMs(acts))}`)}`],
  },

  d: {
    title: 'D — minimal: one progress line while running, only changes + totals when done',
    minimal: true,
    header: () => [],
    groupHeader: () => null,
    line(a) {
      const verb = { install: 'added', uninstall: 'removed', update: 'updated', move: 'moved' }[a.kind]
      const extra = a.kind === 'move' ? ` ${c('dim', `(${a.fromScope} → ${a.scope})`)}` : ''
      return a.error
        ? `${c('red', '✖')} ${a.name} ${c('red', a.error)}`
        : `${c('green', '✔')} ${verb.padEnd(8)} ${c('dim', GROUP[a.target].toLowerCase().replace(/s$/, ''))} ${a.name.replace(/@claude-plugins-official$/, '')}${extra}`
    },
    footer: (acts) => ['', `${totalLine(acts)} ${c('dim', `in ${secs(totalMs(acts))}`)}`],
  },
}

async function render(v, live) {
  const acts = collapse(RAW)
  const w = (s) => process.stdout.write(s + '\n')
  w(c(['bold', 'underline'], v.title))
  w('')
  for (const l of v.header(acts)) w(l)

  if (v.minimal) {
    // A single redrawn status line, then the final list.
    let done = 0
    for (const a of acts) {
      if (live) {
        process.stdout.write(`\r\x1b[2K${c('cyan', '⠋')} ${c('dim', `[${done + 1}/${acts.length}]`)} ${a.kind} ${a.name.replace(/@claude-plugins-official$/, '')}`)
        await sleep(Math.min(a.ms, 600))
      }
      done++
    }
    if (live) process.stdout.write('\r\x1b[2K')
    for (const a of acts) w(v.line(a))
  } else {
    const groups = v.groupHeader('plugin', []) === null ? [[null, acts]] : Object.entries(byGroup(acts))
    for (const [g, list] of groups) {
      if (g) w(v.groupHeader(g, list))
      for (const a of list) {
        if (live) {
          process.stdout.write(v.line(a, 'run'))
          await sleep(Math.min(a.ms, 600))
          process.stdout.write('\r\x1b[2K')
        }
        w(v.line(a, 'done'))
      }
    }
  }
  for (const n of NOTES) w(`${c('yellow', '!')} ${n}`)
  for (const l of v.footer(acts)) w(l)
  w('')
}

const arg = process.argv[2] ?? 'all'
const live = !process.argv.includes('--static') && process.stdout.isTTY
for (const key of arg === 'all' ? Object.keys(VARIANTS) : [arg]) {
  await render(VARIANTS[key], live)
  if (arg === 'all') w2()
}
function w2() { process.stdout.write(c('dim', '─'.repeat(60)) + '\n\n') }
