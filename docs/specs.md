# Agent Plugins — Technical Specification

Version: 0.3.0 · Status: design baseline · Updated: 2026-09-20

This specification defines the intended system. It does not assert that the CLI, schemas, adapters, or example components have been implemented. Examples describe repository contracts; upstream examples are illustrative and must be verified before import.

## 1. Product and scope

`agent-plugins` is a personal collection and development platform for reusable agent plugins. Plugins are the primary product. Owned skills, agents, hooks, and prompts are canonical assets at the repository root. Curated vendor dependencies and their overlays extend those assets when useful.

The registry index, resolver, CLI, adapters, and update automation support authoring and distributing plugins. A plugin composed entirely of local components MUST work without vendor configuration, network access, or an overlay subsystem.

Goals:

- Develop focused, reusable plugins and components in one canonical repository.
- Let projects select only the capabilities they need through profiles and manifests.
- Reuse selected vendor components while preserving provenance and reviewed revisions.
- Customize vendor content without modifying its snapshot.
- Generate runtime output from a runtime-neutral model.
- Support central local development and reproducible project installations.
- Preserve unmanaged project files during installation and synchronization.

MVP includes local skills, agents, plugins, profiles, dependency resolution, curated vendor skills, replacement overlays, portable Agent Skills output, a Claude Code adapter, project installation, locks, and a non-interactive CLI. Hooks and prompts have reserved root directories but their execution/rendering contracts are deferred. Rules and MCP support require later contracts; root `rules/` and `.mcp.json` exist only as reserved placeholders and are not active contracts.

Non-goals for MVP: public marketplace service, database backend, accounts, telemetry, a general package version solver, automatic vendor merging, advanced overlay merging, and simultaneous implementation of every runtime adapter.

## 2. Architectural invariants

1. Plugins are the main authoring and distribution unit.
2. Local ownership is the default. Local references have no ownership prefix.
3. `vendor/` contains selected third-party snapshots. `overlays/` customizes only those snapshots.
4. Canonical sources and generated output are separate. Never edit `dist/` to change source behavior.
5. Vendor snapshots remain byte-preserving imports, except for explicitly declared file selection. Metadata and normalization live outside upstream files.
6. Core models do not encode runtime-specific paths, model names, or tool identifiers.
7. Resolution is deterministic, explicit, type-checked, and cycle-safe.
8. Installation manages only paths recorded as owned by this tool.

## 3. Canonical repository layout

```text
agent-plugins/
├── README.md
├── AGENTS.md
├── CLAUDE.md                 # symlink → AGENTS.md
├── LICENSE
├── plugins/
│   └── architecture/
│       └── plugin.yaml
├── skills/
│   └── architecture-review/
│       ├── SKILL.md
│       ├── references/
│       ├── scripts/
│       ├── templates/
│       └── assets/
├── agents/
│   └── architect/
│       ├── agent.yaml
│       └── prompt.md
├── hooks/
├── prompts/
├── rules/                    # reserved placeholder; contract deferred to M8
├── vendor/
│   └── mattpocock/
│       └── domain-modeling/
│           └── SKILL.md
├── overlays/
│   └── mattpocock/
│       └── domain-modeling/
│           └── SKILL.md
├── profiles/
│   └── minimal.yaml
├── registry.yaml
├── sources.yaml
├── sources.lock.json
├── adapters/
│   ├── agent-skills/
│   └── claude-code/
├── schemas/
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── cli/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/
│   ├── specs.md
│   ├── roadmap.md
│   ├── todo.md
│   ├── usage.md
│   ├── architecture/
│   ├── contracts/
│   ├── engineering/
│   ├── operations/
│   └── adr/
├── dist/
├── .claude-plugin/           # bootstrap distribution metadata; generated at M3
├── .claude/                  # this repository's own Claude Code settings, not adapter output
├── .mcp.json                 # reserved placeholder; contract deferred to M8
├── .gitignore
├── package.json
├── pnpm-lock.yaml
└── .github/workflows/
```

Directories shown are planned responsibilities, not evidence that files already exist. Optional skill resource directories are created only when needed.

This specification, the roadmap, and the backlog live under `docs/`, not at the repository root. `AGENTS.md` is the contributor operating guide; `CLAUDE.md` is a committed repository-relative symlink to it, not machine-specific state. `rules/` and `.mcp.json` are reserved placeholders whose contracts are deferred to M8; they do not grant rules or MCP support today. Root `.claude/` holds this repository's own Claude Code settings for developing the collection. Do not confuse it with the `.claude/` tree an adapter installs into a consuming project (§10); the collection is not its own install target.

`plugins/<id>/plugin.yaml` composes canonical components by reference. Do not duplicate reusable skills or agents inside plugin directories. Use `skills/<id>/` without category nesting; categories are metadata. `profiles/<id>.yaml` is the single profile convention.

`plugins/<id>/` has two phases, and the difference is deliberate rather than a contradiction. Until M3, the native track (roadmap N0) packages a plugin directly as `plugins/<id>/.claude-plugin/plugin.json` plus `skills/` entries that are symlinks into `skills/<id>/`, and agents as files in the plugin that owns them. A symlink into the canonical home is not a duplicated component; the prohibition above is on *copies*. From M3 the Claude Code adapter generates that native packaging from `plugins/<id>/plugin.yaml`, which becomes the canonical input (§10).

`adapters/` owns adapter implementations and runtime templates. `src/` owns core, application, infrastructure, and CLI code; do not create a second adapter implementation tree under it. `schemas/` owns manifest validation contracts. `dist/` contains disposable build output.

## 4. Domain model

| Entity | Responsibility |
| --- | --- |
| Plugin | Owned bundle of component references and plugin dependencies |
| Skill | Reusable capability, workflow, knowledge, references, or scripts |
| Agent | Role and instructions that depend on skills |
| Hook | Reserved model for event-driven behavior; deferred |
| Prompt | Reserved model for reusable prompt content; deferred |
| Profile | Project-oriented composition of plugins and explicit components |
| VendorSource | Upstream identity, selected components, and tracked ref |
| Overlay | File replacements for one vendor component |
| RegistryIndex | Explicit lookup index for local and vendor components |
| ResolvedGraph | Validated dependency closure plus effective content provenance |
| Adapter | Translation of the resolved graph into a target format |
| ProjectManifest | Portable project intent |
| SourceLock / ProjectLock | Resolved upstream state / resolved installation state |

Dependency relationships:

```text
Project → Profiles → Plugins → Skills
                    Plugins → Agents → Skills
                    Plugins → Plugin dependencies
Profiles → Parent profiles
Projects and profiles → Explicit skills and agents

Component reference → Local source
                    → Vendor snapshot + optional overlay

Resolved graph → Adapter → Build artifact → Project installation
```

A plugin remains owned by this repository when it references vendor skills. An overlay does not create a new component identity.

## 5. Identity and references

Local IDs and vendor source aliases use lowercase kebab-case: `[a-z0-9]+(?:-[a-z0-9]+)*`.

| Reference | Meaning | Canonical location |
| --- | --- | --- |
| `architecture-review` | Local skill | `skills/architecture-review/` |
| `architect` | Local agent | `agents/architect/` |
| `architecture` | Local plugin | `plugins/architecture/plugin.yaml` |
| `vendor:mattpocock/domain-modeling` | Vendor component | `vendor/mattpocock/domain-modeling/` |

Bare references MUST resolve to local components only. Never fall back to a vendor search. `local:` and other ownership prefixes are not part of the reference grammar. Only vendor components use `vendor:<source>/<component>`.

All entries in `registry.yaml.components` have unique canonical references across component types; the consuming field additionally checks the expected type. Profiles use their own name space because `extends` and `profiles` exclusively refer to profiles. Vendor component IDs are unique within a source alias. Two sources may provide the same short name because their qualified references differ.

The source path, component type, manifest name, and registry entry MUST agree. Paths are relative to the repository, stay inside the expected ownership directory, and may not contain traversal or absolute paths. Symlink resolution must also stay within allowed roots.

An overlay keeps the reference `vendor:mattpocock/domain-modeling`; there is no overlay reference prefix. Target adapters MUST detect output-name collisions, including case-insensitive collisions, and fail with both source references. Never silently overwrite or select one.

## 6. Manifest conventions

Canonical configuration uses YAML. Locks use JSON. Every manifest has `version: 1`, meaning schema version, not plugin release version. Unknown fields are rejected until explicitly added to the schema. Optional lists default to empty. Examples below form one consistent proposed contract.

### Registry index

`registry.yaml` is an internal index, not the product or a second source of component content.

```yaml
version: 1
name: agent-plugins
components:
  architecture-review:
    type: skill
    path: skills/architecture-review
    category: architecture
    stability: experimental
  architect:
    type: agent
    path: agents/architect
    category: architecture
    stability: experimental
  architecture:
    type: plugin
    path: plugins/architecture/plugin.yaml
    stability: experimental
  vendor:mattpocock/domain-modeling:
    type: skill
    path: vendor/mattpocock/domain-modeling
    stability: experimental
```

Ownership is derived from the reference and validated against the path. Do not maintain a redundant, independently editable ownership field. Stability defaults to `experimental`; `stable` is supported, `deprecated` emits a warning, and `disabled` prevents use. Runtime loaders resolve explicit index entries rather than relying on filesystem order. Authoring validation reports unindexed components.

### Skill

`skills/architecture-review/SKILL.md`:

```markdown
---
name: architecture-review
description: Review module boundaries and dependency direction before a structural change.
---

# Architecture Review

Inspect the relevant modules and their consumers. Identify boundary violations,
explain the trade-offs, and recommend the smallest coherent improvement.
Use references and scripts from this directory only when relevant to the review.
```

The entry point is required. Local frontmatter `name` matches the local ID. Vendor names are preserved and their mapping is tracked separately. Skills should define when to use them, expected inputs, workflow, and useful output. Agents reuse skills instead of copying their instructions.

### Agent

`agents/architect/agent.yaml`:

```yaml
version: 1
name: architect
description: Reviews module boundaries and software architecture.
prompt: prompt.md
skills:
  - architecture-review
```

`prompt` is required and resolves within the agent directory. Skill dependencies are required dependencies. Runtime-specific model and tool settings belong in adapters; a future capability contract must be defined before adding such fields to canonical agents.

### Plugin

`plugins/architecture/plugin.yaml`:

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

The local-only example is the first implementation slice. Once imported and locked, a vendor skill can be added to the same `skills` list:

```yaml
skills:
  - architecture-review
  - vendor:mattpocock/domain-modeling
```

`plugins` contains local plugin dependencies. Skills and agents referenced by the plugin are required. Nested plugin content does not redefine components. Hooks, prompts, rules, and MCP fields are deferred rather than accepted and silently ignored.

### Profile

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

Profile inheritance is additive and deduplicated. Multiple parents do not override component definitions. MVP exclusions are project-level only.

### Project intent

Consumers commit `.agent-plugins.yaml`:

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

The collection alias maps to a local checkout through machine-local CLI configuration. Absolute checkout paths MUST NOT be written into the committed manifest or project lock. A future CLI contract will define alias registration and configuration locations.

`targets` must be nonempty. `strategy` accepts `symlink` (default) or `copy`. `mode` accepts `locked` (default) or `live`. Explicit project includes are additional roots; excludes are applied as described below.

## 7. Resolution algorithm

1. Parse and validate manifest versions, references, and paths.
2. Resolve selected profiles and their transitive parents; report cycles with the full chain.
3. Collect profile plugins and project plugins; expand plugin dependencies.
4. Collect skills and agents from profiles, plugins, and project includes.
5. Expand each included agent's skill dependencies, including project-added agents.
6. Apply project exclusions, then check required dependency edges again.
7. Fail if an excluded component is still required by a retained plugin or agent. Do not reinstall it, silently remove its consumer, or produce a broken graph. Explain which selection must change.
8. Validate lifecycle, expected types, source locks, vendor hashes, and overlay targets.
9. Deduplicate by canonical identity and produce stable dependency-first ordering, with lexical canonical-reference ordering for ties.
10. Attach source and effective-content hashes and return the resolved graph.

Exclusion wins over inclusion, but cannot waive required dependency validation. Excluding an optional profile-level skill is valid when no retained consumer requires it. Unknown include/exclude references are errors to catch typos. Repeated references to the same identity are deduplicated; duplicate definitions are errors.

Neither filesystem enumeration nor YAML mapping order may determine output. The same canonical inputs and adapter version MUST yield the same graph and artifact bytes, apart from explicitly separated operational timestamps.

## 8. Vendor management

Vendor import is optional. An absent `sources.yaml` and source lock is valid for a local-only graph. Once a vendor reference is selected, its source configuration and lock are required.

Illustrative `sources.yaml`:

```yaml
version: 1
sources:
  mattpocock:
    repository: https://github.com/mattpocock/skills.git
    ref: main
    components:
      domain-modeling:
        type: skill
        path: domain-modeling
```

The upstream repository/ref/path must be checked during onboarding; this example is not a claim about current upstream layout. Selection is explicit. Discovery of new upstream components does not import them automatically.

`sources.lock.json` records schema version, source alias, repository, requested ref, full resolved commit, selected component original paths, file inventory and cryptographic hashes. It is committed together with the selected vendor snapshot. Branch names and shortened commit IDs are insufficient pins. Retain required license and attribution material.

Lifecycle:

```text
Fetch candidate → Resolve commit → Extract selected files in staging
→ Diff → Validate → Audit → Update candidate snapshot and lock
→ Review change/PR → Accept into canonical branch
```

Snapshots may change through this workflow; manual customization inside `vendor/` is prohibited. Updating a lock alone must not legitimize altered snapshot bytes. Candidate content, lock, license information, and overlay compatibility are reviewed together. Upstream scripts are never executed during discovery/import/validation.

Temporary clones and downloads live in an OS-appropriate external cache, not the canonical source tree. Cache eviction cannot change locked identity. Local-only operation requires no fetch.

## 9. Overlay contract

MVP supports replacement of existing files only:

```text
vendor/mattpocock/domain-modeling/SKILL.md
overlays/mattpocock/domain-modeling/SKILL.md
```

For each file in the vendor snapshot, use the overlay file at the same relative path if present; otherwise retain the vendor file. This is file replacement, not replacement of the entire component directory. Files with no matching vendor path, missing targets, directory/file conflicts, traversal, and symlink escapes are errors.

Merge, append, delete, patch, and adding new files are deferred. A workflow that needs independently owned content should become an explicit local component with its own ID and preserved attribution where applicable.

Build effective content into `dist/`; never copy replacements into `vendor/`. Record both snapshot and overlay hashes in resolved provenance. Vendor updates revalidate overlays even when an overridden file hides the upstream change in effective output.

## 10. Adapters and output

Adapters consume `ResolvedGraph`, validate supported capabilities, and build artifacts. They do not fetch vendors or independently reinterpret manifests. Filesystem installation is owned by the shared installer; adapters supply output plans and target-specific validation.

MVP targets:

- `agent-skills`: portable skill artifacts. Selecting unsupported agents must produce a clear error rather than silently discard them.
- `claude-code`: skills and canonical agent conversion, plus generated plugin/marketplace artifacts once target contracts are verified.

Runtime paths and formats are verified against target documentation during adapter implementation and captured in fixtures. Typical planned Claude output includes `.claude/skills/` and `.claude/agents/`; plugin distribution metadata is generated from `plugins/<id>/plugin.yaml`. Direct project installation and plugin distribution are alternative delivery paths; avoid installing the same component twice.

`.claude-plugin/marketplace.json` is handwritten bootstrap metadata. Today its `plugins` array is empty and there is no root `.claude-plugin/plugin.json`, because the repository publishes no plugins yet. Roadmap N0 populates the marketplace by hand, listing one entry per directory under `plugins/<id>/`, each with its own `.claude-plugin/plugin.json`. That handwritten metadata is a temporary exception to the rule against a second handwritten source.

At M3 the Claude Code adapter generates this metadata from `plugins/<id>/plugin.yaml`, after which the handwritten files become generated output and must not be edited to change behavior. The models already agree on one point that earlier drafts did not: the marketplace declares many plugins under `plugins/<id>/`, never the whole repository as a single plugin with `source: "."`.

Runtime-specific settings, hook execution, and unsupported capabilities MUST not be silently enabled. Future Codex, OpenCode, Cursor, and Gemini CLI adapters reuse the same domain and resolution contracts.

## 11. Locks, installation, and synchronization

`sources.lock.json` pins upstream content. `.agent-plugins.lock.json` records the consumer's resolved state: schema version, collection revision/content digest, project intent digest, selected canonical references, vendor and overlay hashes, adapter versions, target artifact hashes, install strategy/mode, and managed relative paths. Local absolute cache locations belong in uncommitted machine state.

### Locked mode

Build or locate an immutable artifact identified by content and adapter version. Symlinks point to that artifact, not a mutable checkout. Copy mode copies the same artifact. Ordinary sync uses the existing lock and does not adopt newer content. Missing or inconsistent locked inputs produce an actionable error. An explicit update operation resolves new content and writes a new lock.

The first apply creates the lock. Changed project intent requires an explicit re-resolution; planned `apply --update` and `sync --update` are the operations that authorize it. A Git revision alone is insufficient for a dirty local tree; record the exact content digest or reject creation of a reproducible locked artifact.

### Live mode

An explicit local-development choice. Symlinks point to a stable generated artifact location for the selected graph. Rebuilding it changes linked consumers; pulling source alone does not rebuild it. The project lock records the last synchronized state and cannot guarantee unchanged live bytes. `doctor` reports drift. Copy installations adopt rebuilt content only on sync.

This separates central editing convenience from frozen installation guarantees without presenting a mutable symlink as reproducible.

### Filesystem safety

Before writing, compute and display a plan when requested. Verify paths, collisions, write capability, and existing managed state. Stage complete outputs before replacement; retain sufficient prior state for recovery. Write the lock only after successful installation. On failure, restore prior managed state or report exact partial state with a recovery plan.

Never overwrite unmanaged files. Never delete an entire runtime directory. Remove only obsolete paths recorded as managed, after checking that they still match the expected prior file/hash/link. Modified managed content causes a conflict requiring an explicit resolution. Uninstall obeys the same ownership checks. Protect against traversal, symlink escapes, case collisions, broken links, and concurrent writes.

If symlinks are unavailable, report the limitation and offer explicit copy mode; do not silently change strategy. Do not commit machine-specific symlinks. Ignore only generated paths owned by this tool, preserving existing user configuration.

## 12. CLI and implementation boundaries

Planned command surface, not currently asserted to exist:

```text
agent-plugins validate
agent-plugins init
agent-plugins apply [--update] [--dry-run]
agent-plugins sync [--update] [--dry-run]
agent-plugins doctor
agent-plugins plugin list|info|create
agent-plugins skill list|info|create
agent-plugins agent list|info|create
agent-plugins profile list|info|resolve
agent-plugins vendor list|check|diff|sync
```

`init` authors project intent; `apply` installs it; `sync` reconciles managed output; `validate` checks canonical contracts; `doctor` diagnoses the local environment and installation. Vendor sync stages selected upstream changes for review and must not silently advance the accepted branch. Project sync does not perform vendor updates.

Commands require non-interactive operation, meaningful nonzero failure status, actionable diagnostics, and no hidden mutation in list/info/check/diff/doctor. Detailed arguments, machine-readable output, and exit codes are finalized in the future CLI contract before implementation.

Expected stack: Node.js, strict TypeScript, pnpm, oclif, Zod, YAML parsing, execa, Vitest, and Biome. Exact compatible versions and executable scripts are chosen and pinned at bootstrap, not assumed by this specification.

Dependency direction:

```text
CLI → Application use cases → Domain
Infrastructure and adapters → Domain contracts
```

Domain resolution is pure where possible. External data is validated at boundaries. Shell calls use explicit argument arrays. No runtime-specific code or business rules in CLI command classes.

## 13. Quality and acceptance

Verification must cover:

- Local-only plugin → agent → skill resolution with no vendor files or network.
- Bare local references, qualified vendor references, missing references, wrong types, and duplicate definitions.
- Profile and plugin cycles, diamonds, deduplication, stable ordering, and project-added agent dependencies.
- Exclusions that remove optional roots and exclusions that break required edges.
- Selected vendor imports, commit/hash validation, provenance, license retention, and changed upstream paths.
- Overlay replacement while preserving untouched resources; no mutation of vendor bytes.
- Repeat builds producing the same artifact hashes.
- Symlink and copy installs, Windows path/case behavior, unmanaged file preservation, and interrupted writes.
- Locked sync remaining stable after source changes; explicit update advancing locks; live mode reporting drift.
- Adapter output against verified target fixtures and unsupported-capability errors.

CI should run implemented lint, typecheck, tests, build, and canonical validation commands. No command or check is marked successful without execution. Static inspection of vendor instructions is useful review support, not a guarantee of safety.

MVP acceptance: author a local plugin without vendors; install it into a test consumer; optionally extend it with one pinned vendor skill and replacement overlay; reproduce the locked result; update intentionally; preserve all unmanaged files.

## 14. Delivery and documentation

Follow [roadmap.md](roadmap.md) for milestones and [todo.md](todo.md) for executable work. [README.md](../README.md) is the overview; [AGENTS.md](../AGENTS.md) is the contributor operating guide, reachable as `CLAUDE.md` through a symlink. [usage.md](usage.md) describes the intended consumer experience.

The written documentation set is exactly six files: `README.md`, `AGENTS.md`, `docs/specs.md`, `docs/roadmap.md`, `docs/todo.md`, and `docs/usage.md`. Sequencing lives in the roadmap and execution status in the backlog; there is no separate implementation-plan document. All documentation is written in English.

The detailed documents below **do not exist yet**. `docs/architecture/`, `docs/contracts/`, `docs/engineering/`, and `docs/operations/` are empty directories. Do not cite them as sources or treat them as dependencies. Write them only as implementation needs them:

1. `docs/architecture/architecture.md` and `domain-model.md`.
2. `docs/contracts/manifest-spec.md` and `docs/architecture/dependency-resolution.md`.
3. `docs/operations/vendor-management.md` and `docs/architecture/adapter-design.md`.
4. `docs/contracts/cli-spec.md` and `docs/architecture/project-structure.md`.
5. `docs/engineering/testing-strategy.md` and `security-model.md`.
6. ADRs for root ownership, plugin composition, snapshots, overlays, adapter boundaries, and locked/live installation.

When migrating an existing checkout, move owned component directories to root, remove legacy ownership prefixes from local references, qualify every vendor reference, normalize plugin/profile paths to this contract, and regenerate indexes/locks/output using reviewed tooling. Detect collisions before moving. Preserve content and provenance; do not perform blind text replacement inside vendor snapshots.
