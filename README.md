# Agent Plugins

Declare your Claude Code marketplaces, plugins, skills, agents, rules, workflows, MCP servers and hooks in one YAML
file, and sync them with `ap`.

Setting up Claude Code by hand means running `claude plugin install`, copying skill folders and editing
`.mcp.json` and `settings.json` in every repo and on every machine. With `ap` you write that setup once in
`agent-plugins.yaml`, commit it, and run `ap sync` wherever you need it.

- **Declarative.** The file lists what you want and `ap` works out what to add, update or remove.
- **Safe to run.** `--dry-run` shows the plan before anything is written. `ap` only changes entries it created itself,
  never the ones you added by hand.
- **Reusable.** Put a shared setup in a Preset and pull it into many repos, or sync one machine-wide setup to
  `~/.claude`.

## Install

Requires Node.js 22 or newer, plus `claude` and `git` on your `PATH`. Works on Linux, macOS and WSL; on Windows, use
WSL.

```bash
npm i -g https://github.com/ttungbmt/agent-plugins/releases/latest/download/ap.tgz
ap --version
```

`pnpm add -g <same url>` works too. The tarball is one bundled file, so nothing else is downloaded from the npm registry.

- **Update:** run the install command again.
- **Pin a version:** install the versioned asset instead, e.g.
  `https://github.com/ttungbmt/agent-plugins/releases/download/v0.2.0/ap-0.2.0.tgz`.
- **Uninstall:** `npm uninstall -g @ttungbmt/agent-plugins`.

<details>
<summary>Run without installing, verify a download</summary>

- **Run without installing:** `npx --package <versioned url> ap sync`. Use a versioned URL: `npx` caches by URL, so
  the `latest` URL keeps running whichever version it fetched first.
- **Verify** that a tarball was built by this repository's release workflow:
  `gh attestation verify ap.tgz -R ttungbmt/agent-plugins`.

</details>

## Quickstart

1. In your repo, create a Config:

   ```bash
   ap init
   ```

   This writes `agent-plugins.yaml` with commented-out examples and adds `ap`'s local files to `.gitignore`.

2. Say what you want. This example uses every kind `ap` supports; keep only what you need:

   ```yaml
   # yaml-language-server: $schema=https://raw.githubusercontent.com/ttungbmt/agent-plugins/master/schemas/config.schema.json
   kind: Config

   metadata:
     name: my-app

   spec:
     presets:
       - base                        # Bundled preset: the official marketplace + two plugins

     plugins:
       commit-commands@claude-plugins-official: true

     skills:
       - { source: anthropics/skills, skills: [pdf, docx] }

     agents:
       - { source: affaan-m/ECC, agents: [typescript-reviewer] }

     rules:
       - { source: affaan-m/ECC, rules: [common] }

     workflows:
       - { source: transilienceai/communitytools, path: .claude/workflows }

     mcpServers:
       context7: true                # from the bundled MCP catalog
       docs:                         # inline, in Claude Code's own format
         type: http
         url: https://example.com/mcp
         headers: { Authorization: "Bearer ${DOCS_TOKEN}" }

     hooks:
       format:
         event: PostToolUse
         matcher: Edit|Write
         hooks: [{ type: command, command: npx prettier --write }]
   ```

   The first line gives editors that use `yaml-language-server` (e.g. VS Code with the YAML extension) completion and
   validation.

3. Preview the changes. Nothing is written yet:

   ```console
   $ ap sync --dry-run
   Marketplaces (1)
     + claude-plugins-official                       add at user

   Plugins (3)
     + claude-code-setup@claude-plugins-official     install
     + claude-md-management@claude-plugins-official  install
     + commit-commands@claude-plugins-official       install

   Skills (2)
     + pdf                                           install
     + docx                                          install
   ...
   12 to change: 4 add, 8 install
   ! MCP server "docs" uses ${DOCS_TOKEN}, which is not set in this environment
   ```

4. Apply it, then commit `agent-plugins.yaml` and `agent-plugins.lock`:

   ```bash
   ap sync
   ```

   Run `ap sync` again whenever you change the file; running it with no changes does nothing.

More complete setups live in [`examples/`](examples/).

## Concepts

- **Config** — `agent-plugins.yaml`, the file `ap` reads. It selects Presets under `spec.presets` and may declare
  entries of its own, which override the Presets.
- **Preset** — a reusable file of declarations (`kind: Preset`) that can build on other Presets with `spec.extends`.
  A reference is a bare name for a Bundled preset shipped with `ap` (e.g. `base`), a path like
  `./team.preset.yaml` for a Local preset, or an `https://` URL for a Remote preset.
- **Scope** — where a Sync writes, chosen with `--scope`:

  | Scope               | Claude Code settings          | MCP servers       | `ap` records what it manages in |
  | ------------------- | ----------------------------- | ----------------- | ------------------------------- |
  | `project` (default) | `.claude/settings.json`       | `.mcp.json`       | `agent-plugins.lock` (commit it) |
  | `local`             | `.claude/settings.local.json` | `~/.claude.json`  | `.agent-plugins/state.local.json` |
  | `user`              | `~/.claude/settings.json`     | `~/.claude.json`  | `~/.agent-plugins/state.json`   |

  Skills, agents, rules and workflows are copied into `.claude/` (or `~/.claude/` at the `user` Scope); the `local`
  Scope has no directory of its own for them.

- **Managed and Manual entries** — `ap` changes or removes only the entries it created. Something you added by hand
  with the same name is reported as a conflict and left alone, unless you pass `--force`.

Exact definitions of every term are in [`CONTEXT.md`](CONTEXT.md).

## Common tasks

### Share one setup across all your repos

`ap sync` reads `agent-plugins.yaml` from the current directory. Keep a machine-wide Config in its own directory and
sync it to the `user` Scope:

```bash
mkdir -p ~/.config/agent-plugins && cd ~/.config/agent-plugins
ap init --name machine   # then list the Presets you want under spec.presets
ap sync --dry-run --scope user
ap sync --scope user
```

Repos can still commit their own `agent-plugins.yaml` for project-specific entries. Several Configs can sync to the
`user` Scope without removing each other's entries: an entry is only removed once no Config declares it.

To send a single entry to `~/.claude` from a project Config, add `scope: user` to it, e.g.
`- { source: anthropics/skills, skills: [pdf], scope: user }` or `context7: { scope: user }`.

### Check for drift in CI

```bash
ap sync --check
```

Exits `1` when settings are out of sync with the Config, and changes nothing.

### Pick up new versions

Skill, agent, rule and workflow sources are pinned to a commit in `agent-plugins.lock`, and Remote presets to a
`sha256`. To move to the latest commit and accept changed Remote presets:

```bash
ap sync --update
```

### Add an MCP server

`name: true` takes the config from the [bundled MCP catalog](packages/cli/presets/mcp-servers.yaml) (e.g. `github`,
`firecrawl`, `context7`, `playwright`, `sentry`). Otherwise write the server inline in Claude Code's own format. Write
secrets as `${VAR}` placeholders, never as literal values. Claude Code asks you to approve servers in `.mcp.json`
before they run; `ap` never approves them for you.

### Share a Preset with your team

Move the shared declarations into a Preset and point each repo's Config at it:

```yaml
# team.preset.yaml
kind: Preset
metadata:
  name: team
spec:
  extends: base
  plugins:
    commit-commands@claude-plugins-official: true
```

```yaml
# agent-plugins.yaml
spec:
  presets:
    - ./team.preset.yaml   # or https://example.com/team.preset.yaml
```

## Commands

| Command   | What it does                                                                        |
| --------- | ----------------------------------------------------------------------------------- |
| `ap init` | Create an empty `agent-plugins.yaml` here. `--name <name>`, `--force` to overwrite. |
| `ap sync` | Bring a Scope in line with `agent-plugins.yaml`.                                    |

`ap sync` flags:

| Flag                           | Effect                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `--scope project\|local\|user` | Scope to write (default `project`).                                                 |
| `--dry-run`                    | Print the plan without changing anything.                                           |
| `--check`                      | Change nothing; exit non-zero if out of sync.                                       |
| `--update`                     | Fetch the latest commit of item sources and accept changed Remote presets.         |
| `--force`                      | Overwrite Manual entries, and files edited on disk, that clash with a declaration. |
| `--verbose`                    | Stream the output of the underlying `claude` and `git` commands.                    |

Exit codes: `0` in sync, `1` out of sync or conflicts, `2` invalid Config. Run `ap <command> --help` for details.

## Configuration reference

- JSON Schemas: [`schemas/config.schema.json`](schemas/config.schema.json) and
  [`schemas/preset.schema.json`](schemas/preset.schema.json). Their descriptions document every key and form.
- Bundled presets and the MCP catalog: [`packages/cli/presets/`](packages/cli/presets/).
- Full behaviour of `ap sync` and `ap init`: [`docs/design/`](docs/design/) (in Vietnamese).

## Troubleshooting

- **`claude` or `git` not found** — an applying Sync shells out to both. Install them, or use `--dry-run`/`--check`,
  which do not need `claude`.
- **`npm` refuses to install over the `ap` binary** — versions up to 0.2.0 were published as `agent-plugins`. Run
  `npm uninstall -g agent-plugins`, then install again.
- **A conflict with a Manual entry** — something with the same name already exists and `ap` did not create it. Remove
  or rename it, or rerun with `--force` to let `ap` take it over.
- **A Remote preset's content changed** — `ap` stops rather than apply unreviewed changes. Check the change, then run
  `ap sync --update`.
- **An MCP server doesn't start** — set the `${VAR}` the warning names, and approve the server in Claude Code.

Still stuck? Rerun with `--verbose` and [open an issue](https://github.com/ttungbmt/agent-plugins/issues) with your
Config and the output.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development setup and release process. Design decisions are recorded
in [`docs/adr/`](docs/adr/).

## Acknowledgements

`ap` resolves and installs content from these projects. They inspired it, and its catalog is modelled on them:
[Superpowers](https://github.com/obra/superpowers),
[Everything Claude Code](https://github.com/affaan-m/everything-claude-code),
[Matt Pocock Skills](https://github.com/mattpocock/skills),
[Anthropic Skills](https://github.com/anthropics/skills),
[wshobson/agents](https://github.com/wshobson/agents) and
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills).
All of them remain the work of their authors under their own licenses. `ap` installs from upstream sources and does not
vendor, fork or re-license their content.
