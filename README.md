# Agent Plugins

`ap` declares the marketplaces, plugins, skills, agents and MCP servers you want in Claude Code in an
`agent-plugins.yaml` file, then syncs them into Claude Code's settings.

## Install

Requires Node.js 22 or newer, plus `claude` and `git` on your `PATH`. Supported on Linux, WSL and macOS; on Windows,
use WSL.

```bash
npm i -g https://github.com/ttungbmt/agent-plugins/releases/latest/download/ap.tgz
ap --version
```

`pnpm add -g <same url>` works too. The tarball is a single bundled file with no dependencies, so nothing else is
downloaded from the npm registry.

- **Update:** run the install command again.
- **Pin a version:** use the versioned asset, e.g.
  `https://github.com/ttungbmt/agent-plugins/releases/download/v0.1.0/ap-0.1.0.tgz`.
- **Uninstall:** `npm uninstall -g agent-plugins`.
- **Verify** that a tarball was built by this repository's release workflow:
  `gh attestation verify ap.tgz -R ttungbmt/agent-plugins`.
- **Run without installing:** `npx --package <versioned url> ap sync`. Use a versioned URL here: `npx` caches by
  URL, so the `latest` URL keeps running whichever version it fetched first.

## Usage

```bash
ap init             # create agent-plugins.yaml in the current directory
ap sync --dry-run   # show what would change
ap sync             # apply to the project scope (.claude/, .mcp.json)
```

### Share one setup across all your repos

`ap sync` reads `agent-plugins.yaml` from the current directory. Keep a machine-wide Config in its own directory and
sync it to the `user` scope (`~/.claude`):

```bash
mkdir -p ~/.config/agent-plugins && cd ~/.config/agent-plugins
ap init --name machine   # then list the presets you want under spec.presets
ap sync --scope user
```

Repos can still commit their own `agent-plugins.yaml` for project-specific entries. Several Configs can sync to the
`user` scope without removing each other's entries: an entry is only removed once no Config declares it
([ADR 0003](docs/adr/0003-managed-entries-per-scope-state.md)).

## Development

```bash
mise install             # node + pnpm from mise.toml
pnpm install
pnpm ap sync --dry-run   # build packages/cli incrementally and run it
pnpm -C packages/cli test
```

To try the release build locally: `pnpm -C packages/cli pack:release`, then
`packages/cli/scripts/smoke-release.sh` installs the tarball into a temporary prefix and runs it.

### Releasing

Set `version` in `packages/cli/package.json`, commit, then push a matching tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

The [release workflow](.github/workflows/release.yml) tests, bundles, smoke-tests the tarball on Linux and macOS
with Node 22 and 24, attests it and creates the GitHub Release. A tag with a `-` (e.g. `v0.2.0-beta.1`) becomes a
pre-release and does not move the `latest` link. See [ADR 0008](docs/adr/0008-distribute-ap-via-github-release-tarball.md).

Full runbook (checks, pre-releases, troubleshooting): [docs/releasing.md](docs/releasing.md).

## Prior Art & Acknowledgements

`agent-plugins` exists because these ecosystems already solve parts of the problem
well — and because assembling them by hand is what made a resolver necessary.
They are both the inspiration for this project and the reference publishers its
catalog is modelled against.

| Ecosystem | What it is | What `agent-plugins` takes from it |
| --- | --- | --- |
| [Superpowers](https://github.com/obra/superpowers) | An agentic skills framework and development methodology for Claude Code, by Jesse Vincent | Skills as enforced process rather than documentation — brainstorming, TDD, systematic debugging |
| [Everything Claude Code (ECC)](https://github.com/affaan-m/everything-claude-code) | A broad agent harness: agents, skills, commands, rules and hooks across several runtimes | Multi-runtime packaging, and the scale at which a catalog still has to stay navigable |
| [Matt Pocock Skills](https://github.com/mattpocock/skills) | "Skills for Real Engineers", published straight from a working `.agents` directory | Separating user-invoked orchestration from model-invoked discipline; stack-specific skills |
| [Anthropic Skills](https://github.com/anthropics/skills) | Anthropic's public Agent Skills repository and format specification | The `SKILL.md` format as the common denominator every adapter renders to |
| [wshobson/agents](https://github.com/wshobson/agents) | A multi-harness plugin marketplace: one Markdown source rendered into harness-native artifacts for Claude Code, Codex, Cursor, OpenCode, Copilot and Pi | Evidence that a single source of truth can target many runtimes without lowest-common-denominator output — the adapter model |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | Production-grade engineering lifecycle skills for AI coding agents, each with explicit verification gates | Verification gates as part of a skill's contract, and a lifecycle-shaped way to name capabilities |

The overlap between them — three credible TDD skills, several code-review agents —
is exactly what declaring them in one Config is designed to arbitrate.

All of the above remain the work of their authors, under their own licenses.
`agent-plugins` resolves and installs from upstream sources; it does not vendor,
fork, or re-license their content.