# AGENTS.md

Operating guide for contributors and coding agents working on `agent-plugins`.

## Start here

`agent-plugins` is a plugin-first repository. Owned/local components are the default; vendor dependencies and overlays are optional extensions. Implement the requested workflow without turning the collection into a registry-centered framework.

Read [README.md](README.md) for orientation, [specs.md](docs/specs.md) for design contracts, [roadmap.md](docs/roadmap.md) for sequencing, [todo.md](docs/todo.md) for current work, and [usage.md](docs/usage.md) for the intended consumer experience. Those six files — including this one — are the current documentation set, and they are written in English. ADRs under `docs/adr/` and the detailed documents listed in `docs/specs.md` §14 are deliberate additions to that set, not exceptions to it; no seventh narrative overview may be added without removing one. This set defines intended behavior, not a claim that tooling already exists: the repository currently contains no plugins, skills, agents, vendor snapshots, or source code.

Follow explicit task instructions and applicable repository instructions. An `AGENTS.md` deeper in the tree governs its own subtree and overrides this file there. Use specifications, code, and tests as evidence; surface meaningful conflicts instead of silently changing a contract.

## Locate code efficiently

When a repository has `.codegraph/` at its root, use `codegraph_explore` or `codegraph explore "<symbol or question>"` before text search or reading files to understand or locate code. Use ordinary search if the tool is unavailable and state the limitation where relevant. Do not create an index unless requested. Skip CodeGraph entirely when `.codegraph/` is absent.

## Ownership and paths

| Path | Responsibility |
| --- | --- |
| `plugins/<id>/plugin.yaml` | Owned plugin composition (M3 onward). Until then N0 packages natively: `plugins/<id>/.claude-plugin/plugin.json` plus `skills/` symlinks into canonical homes |
| `skills/<id>/SKILL.md` | Owned reusable capability |
| `agents/<id>/agent.yaml` + `prompt.md` | Owned worker definition (M3 onward). Until then root `agents/` stays empty: an N0 agent is a real `plugins/<owner>/agents/<id>.md`, because the target silently drops symlinked agent files — see `docs/specs.md` §6 |
| `hooks/`, `prompts/` | Reserved owned components; later contracts |
| `rules/` | Reserved placeholder only; rules contract deferred to M8 |
| `vendor/<source>/<id>/` | Selected upstream snapshot |
| `overlays/<source>/<id>/` | Vendor file replacements |
| `profiles/<id>.yaml` | Project presets |
| `adapters/` | Runtime-specific implementations and templates |
| `schemas/` | Validation contracts |
| `src/` | Domain, application, infrastructure, CLI |
| `tests/` | Unit and integration suites plus fixtures |
| `docs/` | Specification, roadmap, backlog, and planned detailed docs |
| `dist/` | Generated artifacts |
| `.claude-plugin/` | Bootstrap distribution metadata; generated from canonical plugins at M3 |
| `.claude/` | This repository's own Claude Code settings, not adapter output |
| `.mcp.json` | Reserved placeholder only; MCP contract deferred to M8 |

`CLAUDE.md` is a repository-relative symlink to this file, not machine-specific state. Keep it committed; do not replace it with a copy.

Local references are bare IDs: `architecture-review`, `architect`, `architecture`. Only vendor references use a qualifier: `vendor:mattpocock/domain-modeling`. Never resolve an unqualified name by searching vendors. Do not introduce an ownership wrapper directory, local prefix, category nesting, or copied components inside plugins. A symlink from a plugin into a component's canonical home is not a copy; that is how N0 composes plugins, and each component still has exactly one home.

Overlays retain the vendor identity. They are not a general customization layer for local components. Categories belong in metadata. Keep one implementation home for each responsibility; adapter implementations live in root `adapters/`.

## Preserve architectural boundaries

- Local-only authoring and resolution must work without vendors or network access.
- Skills provide capabilities; agents reuse those skills; plugins compose them; profiles express project intent.
- `registry.yaml` is a generated index built from the canonical homes, not a handwritten file and not a parallel source of component content. Author `category` and `stability` on the component itself.
- Canonical models remain runtime-neutral. Adapters consume resolved graphs and handle target formats.
- Use `CLI → application → domain`; keep business rules out of command classes.
- Domain resolution should be deterministic and pure where practical.
- Edit canonical inputs and regenerate output. Do not manually edit generated artifacts to fix behavior.

## Work on a change

1. Read relevant files, consumers, schemas, and tests.
2. Check existing patterns and applicable design decisions.
3. Make the smallest coherent change that completes the task.
4. Update contracts, examples, and tests when behavior changes.
5. Run relevant available checks and report results precisely.

Use strict TypeScript, explicit domain types, discriminated unions, and validation at external boundaries. Avoid `any`, hidden mutable globals, speculative abstractions, and unrelated utility collections. Pin compatible dependency versions during bootstrap; inspect existing dependencies before adding new ones.

## Contracts and resolution

Change schemas and parsers together. Reject unknown manifest fields and unsupported schema versions. Preserve the reference grammar and path invariants in `docs/specs.md`.

Resolution must detect missing references, wrong types, duplicate definitions, profile/plugin cycles, disabled components, and target-name collisions. Deduplicate references by identity, not basename. Use stable dependency-first ordering with lexical tie-breaking.

Expand skills required by project-added agents too. Project excludes must never leave a broken required edge; fail with the dependency chain instead of silently reinstalling the excluded item or deleting its consumer.

## Vendor and overlays

Do not manually customize `vendor/`. Changes there must be imports from pinned upstream revisions with reviewed diffs, provenance, hashes, and required license material. New upstream components require explicit selection. Never execute imported scripts as part of discovery or validation.

MVP overlays replace existing vendor files at matching relative paths; untouched files remain. Adding files, deleting files, merge, append, and patch semantics are deferred. Validate overlay compatibility whenever upstream changes. Build effective content separately and record vendor and overlay hashes.

## Installation and locks

Commit source and project locks as portable resolved state. Keep local absolute paths out of committed manifests and locks.

Locked symlinks point to immutable artifacts. Ordinary sync honors the existing lock; explicit updates re-resolve inputs. Live mode is opt-in and must report drift rather than claim reproducibility.

Preserve unmanaged project content. Check modified managed content before overwrite or cleanup. Validate resolved paths, case collisions, and symlink boundaries before writes. Stage changes, guard concurrent updates, and write the project lock only after successful installation. Do not silently fall back from symlink to copy.

## Verification

Inspect `package.json` before choosing commands. Once implemented, the expected baseline is lint, typecheck, relevant tests, build, and canonical validation. Vendor changes also require provenance/hash checks, overlay compatibility, and review of executable or instruction changes.

Prioritize tests for resolver behavior, deterministic output, vendor imports, overlays, locked/live semantics, and safe symlink/copy installation. Filesystem fixtures must exercise unmanaged files, modified managed files, traversal, case collisions, and interrupted writes.

For documentation-only changes, check cross-file consistency, example validity, relative links, and obsolete paths. Do not claim implementation tests ran when only documents were checked. Report unavailable commands or missing fixtures explicitly.

## Documentation and completion

`docs/specs.md` owns requirements; README stays an overview; roadmap owns milestone scope; todo owns execution status; usage owns the consumer-facing guide. Update them together when shared conventions change. The subdirectories `docs/architecture/`, `docs/contracts/`, `docs/engineering/`, and `docs/operations/` are empty; the documents listed in `docs/specs.md` §14 are unwritten. Never cite an unwritten document, and never present a stub or an empty file as a completed dependency.

Record consequential architectural trade-offs in ADRs when those files are introduced. Routine implementation choices do not need a new decision process. Avoid duplicating the specification into this guide.

A change is complete when its authorized scope is delivered, contracts and docs agree, relevant verification passes or limitations are disclosed, provenance is preserved, and unmanaged user content remains intact. Mark backlog items complete only with evidence.
