# Agent Plugins

A personal collection and development platform for reusable agent plugins, with owned skills and agents at its core and curated vendor extensions when useful.

**Status:** design baseline, version 0.3.0. The commands and layouts below describe the intended system. The repository currently ships documentation only — no plugins, skills, agents, vendor snapshots, or CLI exist yet. The first milestone is N0, a native Claude Code marketplace built from the mechanisms Claude Code already provides; the first-party resolver and CLI belong to the deferred platform track. See [docs/roadmap.md](docs/roadmap.md).

## What this repository is for

Build your own plugins once, then compose them for different projects. A project selects the profiles, plugins, skills, and agents it needs without loading the whole collection or managing each upstream repository separately.

Plugins are the main product. The registry index, vendor workflow, adapters, and CLI support their development and distribution. A plugin made entirely from local components requires no vendor setup.

## Repository layout

```text
agent-plugins/
├── AGENTS.md      # Contributor operating guide (CLAUDE.md symlinks here)
├── plugins/       # Owned plugin manifests: <id>/plugin.yaml
├── skills/        # Owned capabilities: <id>/SKILL.md
├── agents/        # Owned workers: <id>/agent.yaml + prompt.md
├── hooks/         # Reserved for owned hooks
├── prompts/       # Reserved for owned prompts
├── rules/         # Reserved placeholder; contract deferred
├── vendor/        # Selected third-party snapshots
├── overlays/      # Customization of vendor files
├── profiles/      # Project presets: <id>.yaml
├── adapters/      # Runtime translation implementations
├── schemas/       # Manifest contracts
├── src/           # Core, application, infrastructure, CLI
├── tests/
├── docs/          # Specification, roadmap, backlog, usage guide, plus planned detailed docs
├── dist/          # Generated output, including registry.yaml
├── .claude/       # This repository's own Claude Code settings, not adapter output
├── .claude-plugin/  # Bootstrap distribution metadata; generated at M3
├── .github/workflows/
├── .mcp.json      # Reserved placeholder; contract deferred
├── LICENSE
├── sources.yaml
└── sources.lock.json
```

The tree is the target layout. Local components live directly at root; their IDs need no ownership prefix. Shared components have one canonical location and are referenced by plugins.

## Core concepts

| Concept | Meaning |
| --- | --- |
| Skill | Reusable capability, knowledge, or workflow |
| Agent | Worker role and instructions that reuse skills |
| Plugin | Owned bundle for composition and distribution |
| Profile | Preset describing a project's needs |
| Vendor | Selected, pinned third-party content |
| Overlay | Replacement files applied to a vendor component during build |
| Adapter | Translation into a runtime's format |

## Author a local plugin

Start with three canonical assets:

```text
skills/architecture-review/SKILL.md
agents/architect/agent.yaml
agents/architect/prompt.md
plugins/architecture/plugin.yaml
```

The agent reuses the skill:

```yaml
version: 1
name: architect
description: Reviews module boundaries and software architecture.
prompt: prompt.md
skills:
  - architecture-review
```

The plugin composes both:

```yaml
version: 1
name: architecture
description: Architecture design and review toolkit.
plugins: []
skills:
  - architecture-review
agents:
  - architect
```

The two-file agent above is the platform-track form. In N0 an agent is instead a single `plugins/<owner>/agents/<id>.md` carrying the same `name`, `description` and `skills:` fields, because Claude Code silently drops symlinked agent files — see [docs/specs.md](docs/specs.md) §3.

Declare each component's `category` and `stability` on the component itself; the `registry.yaml` index is generated from the canonical homes, not written by hand. Full index and skill examples appear in [docs/specs.md](docs/specs.md).

## Extend with vendor content

After explicitly importing and locking a vendor component, the plugin may use:

```yaml
skills:
  - architecture-review
  - vendor:mattpocock/domain-modeling
```

`architecture-review` resolves only to a local skill. `vendor:mattpocock/domain-modeling` resolves to a component from the `mattpocock` source. Vendor examples are illustrative; verify upstream paths and licensing during import.

Customize a vendor file here:

```text
overlays/mattpocock/domain-modeling/SKILL.md
```

The component keeps its vendor-qualified reference. MVP overlays replace matching files while retaining untouched vendor files. They do not rewrite the snapshot or create a new local component.

`sources.yaml` selects upstream components. `sources.lock.json` pins full commits, original paths, and hashes. Updates pass through staged diff, validation, audit, and review before adoption. Newly discovered upstream skills are not imported automatically.

## Select capabilities for a project

`profiles/minimal.yaml`:

```yaml
version: 1
name: minimal
extends: []
plugins:
  - architecture
skills: []
agents: []
```

The consuming project commits `.agent-plugins.yaml`:

```yaml
version: 1
collection: agent-plugins
targets:
  - claude-code
profiles:
  - minimal
plugins: []
skills:
  include: []
  exclude: []
agents:
  include: []
  exclude: []
install:
  strategy: symlink
  mode: locked
```

The collection alias maps to a checkout in machine-local configuration. Commit portable intent and `.agent-plugins.lock.json`, not absolute paths or machine-specific symlinks.

Resolution expands profiles, plugins, agents, and required skills. Excluding a component still required by a selected plugin or agent produces an error explaining the dependency.

## Installation and updates

The intended pipeline is:

```text
Project selections → Resolved plugins/components → Adapter → Project output
```

Symlinks are the preferred installation strategy; explicit copy mode supports environments without them. Locked mode links or copies immutable build artifacts, so updating the collection does not silently change a locked project. Explicit update operations advance its lock.

Live mode is an opt-in development workflow: rebuilding a shared generated artifact updates linked consumers. Copy consumers need sync. A live lock records the last synchronized state rather than promising frozen content.

Installation must preserve unmanaged files, detect modified managed content, and clean up only recorded managed paths. Generated output is never canonical source.

## Planned CLI

These commands are design examples, not installation instructions for an available package:

```text
agent-plugins validate
agent-plugins init
agent-plugins apply --dry-run
agent-plugins apply
agent-plugins sync
agent-plugins sync --update
agent-plugins doctor
agent-plugins plugin list|info|create
agent-plugins skill list|info|create
agent-plugins agent list|info|create
agent-plugins profile list|info|resolve
agent-plugins vendor list|check|diff|sync
```

`apply` creates the first installation. `sync` reconciles its locked state; `--update` explicitly resolves newer inputs. Vendor sync prepares upstream changes for review separately from project sync.

## Delivery scope

The first working slice is `architecture` → `architect` → `architecture-review`, using local content only. N0 ships that slice natively, through a Claude Code marketplace and plugin directories, with no first-party tooling. The platform-track MVP then adds profiles, portable skill output, a Claude Code adapter, safe project installation, and one curated vendor skill with a replacement overlay.

Candidate owned plugins include `core`, `architecture`, `research`, `frontend`, `backend`, `security`, and `agentic-engineering`. Build them when there is a real workflow; keep `core` small. Hooks, prompts, additional runtimes, advanced overlays, and a catalog follow later contracts.

Expected implementation stack: Node.js, TypeScript, pnpm, oclif, Zod, YAML parsing, execa, Vitest, and Biome. Versions and runnable scripts will be pinned during bootstrap.

## Documentation

- [docs/specs.md](docs/specs.md): requirements, reference grammar, contracts, and acceptance criteria.
- [AGENTS.md](AGENTS.md): contributor operating rules and navigation. `CLAUDE.md` is a symlink to it.
- [docs/roadmap.md](docs/roadmap.md): milestones, dependencies, and exit criteria.
- [docs/todo.md](docs/todo.md): actionable implementation backlog.
- [docs/usage.md](docs/usage.md): intended consumer experience for installing and selecting plugins.

Those five documents plus this README are the written documentation set, and all of them are in English. `docs/architecture/`, `docs/contracts/`, `docs/engineering/`, and `docs/operations/` are **empty directories** — the documents listed in [docs/specs.md](docs/specs.md) §14 are unwritten and must not be cited as sources. The next step is N0, the native marketplace; architecture and manifest contracts follow when the platform track opens.
