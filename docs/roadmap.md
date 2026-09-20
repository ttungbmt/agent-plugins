# Roadmap

Version: 0.3.0 · Updated: 2026-09-20 · Status: N0 next; M0–M8 planned

The product is a collection of owned agent plugins. Local skills and agents provide the foundation; vendor imports extend working local workflows.

Delivery runs on **two tracks**:

- **Native track (N0)** — package the collection with the mechanisms Claude Code already provides: a marketplace, plugin directories, plugin dependencies, and `claude plugin validate`. No first-party CLI. **This is the next track to build.**
- **Platform track (M0–M8)** — the runtime-neutral model, first-party resolver, profiles, overlays, locks, and adapters described in [specs.md](specs.md). **Deferred**; see the activation conditions below.

This roadmap records target capabilities and exit criteria. It does not claim implementation progress: the repository currently contains documentation only, with no plugins, skills, agents, or vendor snapshots. [specs.md](specs.md) defines the contracts; [todo.md](todo.md) tracks tasks.

## Architecture baseline

Canonical first-party skills live at `skills/<id>/SKILL.md`. Third-party content lives in `vendor/<source>/<id>/` as a byte-preserving pinned snapshot.

`plugins/<id>/` has two documented phases, and they are not in conflict:

- **N0 (native):** `plugins/<id>/` is packaging only — a `.claude-plugin/plugin.json` plus `skills/` entries that are symlinks into the canonical homes, and agents as real `.md` files in the plugin that owns them. A symlink is not a copy: each component still has exactly one canonical home.
- **M3 onward (platform):** `plugins/<id>/plugin.yaml` becomes the canonical input, and the Claude Code adapter *generates* the native packaging above. See [specs.md](specs.md) §10 for the handover.

N0 must verify and record Claude Code's actual symlink behaviour for plugin `skills/` and `agents/` entries, including the cases where symlinks are *not* followed. That finding belongs in the N0 exit evidence; `docs/architecture/project-structure.md` will record it once written.

The platform track's `plugin.yaml` / `agent.yaml` / `profiles/<id>.yaml` / `registry.yaml` conventions are not in use yet. Local component references are bare IDs; third-party references are qualified, such as `vendor:mattpocock/domain-modeling`.

## N0 — Native marketplace

**Depends on:** nothing. This is the next work.

**Goal:** make the collection usable across projects today, without building a platform first.

Deliver:

- Root marketplace manifest declaring the plugins that actually have content. Start with `core` and `architecture`; add the remaining candidates only when a real workflow needs them.
- One first-party skill (`architecture-review`) and one agent (`architect`).
- A first vendor import from `mattpocock/skills` at a pinned commit, with licence, provenance at `vendor/mattpocock/PROVENANCE.md`, and per-file checksums at `vendor/mattpocock/SHA256SUMS`; skill bytes unmodified.
- Plugin composition by symlink, so each component has exactly one canonical home.
- `core` as the base plugin; the others declare it as a dependency so installing any of them pulls it in.

**Exit:** the marketplace and every published plugin manifest validate; installing `architecture` into a clean consumer resolves its skills plus the `architect` agent and auto-installs `core`; `sha256sum -c vendor/mattpocock/SHA256SUMS` passes; Claude Code's symlink-resolution behaviour for plugin `skills/` and `agents/` entries is verified and recorded.

**Not in N0:** profiles, overlays, project locks, a first-party CLI, additional runtimes.

## Platform track — activation conditions

M0–M5 below are deferred, not cancelled. Start M0 when at least one of these becomes true, and say which one:

- A second runtime is needed in production, and hand-maintaining `.codex-plugin/` or `.cursor-plugin/` alongside `.claude-plugin/` has become error-prone.
- A consumer needs reproducible installs pinned to a content digest, which plugin versions alone cannot express.
- A vendor component must be customized without forking it, which requires overlays.
- Plugin membership needs computing from declared intent rather than maintaining symlinks by hand.

Until then, prefer adding skills over adding infrastructure.

## M0 — Foundation and contracts

**Goal:** make the architecture implementable without prematurely building vendor infrastructure.

Deliver:

- Repository skeleton with root-owned components and clearly separated generated output.
- Pinned TypeScript/Node.js/pnpm toolchain and meaningful verification scripts.
- Architecture, domain model, manifest, and resolution contracts.
- Schemas for local registry entries, skills, agents, plugins, profiles, and project intent.
- ADRs for ownership layout and plugin/component composition where needed.

**Exit:** a documented local-only fixture parses and validates; schema errors identify the file and field. Empty or absent vendor configuration is accepted.

## M1 — Local plugin vertical slice

**Depends on:** M0.

Deliver the first useful plugin:

```text
plugins/architecture/plugin.yaml
  → skills/architecture-review/SKILL.md
  → agents/architect/agent.yaml + prompt.md
      → architecture-review
```

Implement registry loading, local reference resolution, agent-to-skill dependencies, plugin dependencies, and a validation command. Add focused authoring templates after proving the source format.

**Exit:** the architecture plugin validates and resolves entirely offline, with no vendor manifest, import, or overlay required. Missing references, duplicate definitions, incorrect types, and cycles have useful errors.

## M2 — Composition and profiles

**Depends on:** M1.

Deliver profile inheritance, project selection, explicit includes/excludes, stable dependency ordering, lifecycle validation, and resolved provenance. Start with `profiles/minimal.yaml`; add presets only when real consumers need them.

**Exit:** identical inputs produce identical graphs. Project-added agents bring their skills. Excluding a required dependency fails clearly. Diamonds deduplicate and cycles report their chain.

## M3 — Runtime output and safe project installation

**Depends on:** M2.

Deliver portable skill artifacts and a Claude Code adapter based on verified target contracts. Implement the shared installer, source-content hashes, project locks, machine-local collection alias mapping, symlink/copy strategies, locked mode, and explicit live mode.

Expose the core `init`, `apply`, `sync`, and `doctor` flows with non-interactive operation and previewable write plans. Generate plugin distribution metadata from canonical manifests rather than maintaining a second handwritten source.

**Exit:** a local plugin installs into a fixture consumer. Locked sync remains stable after canonical source changes; explicit update advances it. Live mode reports drift. Unmanaged files and modified managed files are protected. Interrupted operations leave recoverable state.

This is the first end-to-end local-only release checkpoint.

## M4 — Curated vendor extension

**Depends on:** M3; source contracts may be designed earlier.

Deliver explicit upstream selection, commit pinning, source locks, selected snapshots, provenance, license retention, staging, and vendor list/check/diff/sync operations. Start with one verified source and one useful skill.

Candidates include Vercel, Clerk, ECC, Browser Use, Taste Skill, and Awesome Copilot; they are evaluation candidates, not mandatory imports or verified compatibility claims.

N0 imports `mattpocock/skills` by hand at a pinned commit, recording provenance in `vendor/mattpocock/PROVENANCE.md` and checksums in `vendor/mattpocock/SHA256SUMS`. M4 does not repeat that import; it replaces the manual procedure with tooling and must reproduce the N0 snapshot byte for byte.

**Exit:** one plugin can opt into a pinned qualified vendor skill. Its snapshot and lock reproduce exact selected content. Upstream scripts are not executed; unselected content is not imported. Vendor updates cannot silently advance the accepted collection.

## M5 — Replacement overlays and complete MVP

**Depends on:** M4.

Deliver matching-file replacements under `overlays/<source>/<id>/`, overlay validation, effective-content staging, and combined vendor/overlay provenance. Revalidate overlays during every vendor update.

**Exit:** the same vendor reference resolves to overlaid content while untouched resources and vendor snapshot bytes remain unchanged. Missing targets and unsupported operations fail. The extended plugin installs safely and reproducibly through the M3 pipeline.

MVP is complete only when M0–M5 exit criteria pass together. Hooks/prompts execution, advanced overlays, and additional adapters are outside this gate.

## M6 — Reviewable updates and operational quality

**Depends on:** M5.

Deliver scheduled vendor checks, staged update branches/PRs, affected-component diffs, provenance reports, and validation/audit results. New upstream capabilities are discovery candidates only. Do not auto-merge vendor updates.

Add operational runbooks, recovery guidance, release packaging, and CI coverage across supported environments. Security and filesystem tests begin in earlier milestones; this phase automates and expands them.

**Exit:** an upstream change can produce a reviewable candidate update without changing accepted snapshots or installed locked projects. Recovery and rollback procedures have been exercised.

## M7 — Expand owned workflows and authoring experience

**Depends on:** N0. Once the native marketplace supports authoring and installation, this work is active and does not wait for the platform track. The tooling items below (search, scaffolding, dependency visualization) do depend on M3.

Grow `core`, `research`, `frontend`, `backend`, `security`, and `agentic-engineering` only around actual use. Candidate skills include `scalable-folder-design`, `technical-research`, `technology-evaluation`, and `repo-onboarding`; candidate agents include `researcher` and `code-reviewer`.

Add search, richer component information, scaffolding, dependency visualization, and interactive conveniences after non-interactive commands work. Keep `core` small and every plugin useful independently of a large vendor catalog.

**Exit:** new owned plugins reuse canonical components, carry focused examples, and have validated consumer scenarios.

## M8 — Additional contracts and runtimes

**Depends on:** demonstrated needs and stable core contracts.

- Define hooks and prompts behavior before activating reserved directories.
- Evaluate Codex, OpenCode, Cursor, and Gemini CLI adapters with explicit capability matrices.
- Define rules and MCP support only when needed.
- Evaluate overlay additions, merge, append, delete, and patch as separate contract changes.
- Consider a generated catalog or collections only when they solve an observed discovery problem.

**Exit:** each extension has a documented contract, migration implications, and target-specific tests. Existing local-only flows remain unchanged unless a deliberate versioned contract change is made.

## Milestone summary

| Milestone | Outcome | Dependency |
| --- | --- | --- |
| N0 | Native marketplace, first plugins, pinned vendor snapshot | None |
| M0 | Foundation and contracts | None |
| M1 | Local plugin resolves | M0 |
| M2 | Profiles and project composition | M1 |
| M3 | Local plugin installs safely | M2 |
| M4 | Optional pinned vendor skill | M3 |
| M5 | Vendor overlay; complete MVP | M4 |
| M6 | Reviewable update automation | M5 |
| M7 | More owned workflows and authoring tools | N0; tooling items M3 |
| M8 | Additional capabilities and runtimes | Stable relevant contracts |

## Deferred direction

Public SaaS, accounts, ratings, telemetry, a remote database-backed registry, a marketplace website, and a general semver dependency solver are not current objectives. Autonomous vendor merging is not part of the update model.

The immediate next action is **not** M0. It is N0, followed by growing the collection: add first-party skills where a real workflow demands one, and split a plugin only when a project genuinely needs a subset of it. Open the platform track only when one of the activation conditions above is met.
