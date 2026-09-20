# agent-plugins — TODO

Execution backlog. Milestones and exit criteria are owned by [roadmap.md](roadmap.md); contracts
are owned by [specs.md](specs.md). This file tracks only what is left to do and what has been
done, in the roadmap's own sequence: `N0`, then `M0`–`M8`.

Nothing here is complete. The repository currently contains documentation only — no plugins,
skills, agents, vendor snapshots, schemas, or source code. Mark an item done only with evidence.

## N0 · Native marketplace

No first-party tooling. Uses the mechanisms Claude Code already provides: a marketplace, plugin
directories, plugin dependencies, and `claude plugin validate`.

- [x] Verify Claude Code's current plugin and marketplace contract. Checked against **2.1.278 on
      2026-09-20**. Accepted fields recorded in [specs.md](specs.md) §3. Note: `marketplace.json`
      has no schema on json.schemastore.org — only `plugin.json` does
      (`claude-code-plugin-manifest.json`).
- [x] Verify how Claude Code resolves symlinked entries under a plugin's `skills/` and `agents/`.
      Done by probe install into a clean consumer; result in [specs.md](specs.md) §3, *Verified
      Claude Code packaging behavior*. **Symlinked skill directories work** (dereferenced at
      install, including targets outside the plugin). **Symlinked agent files are silently
      dropped.** Component identity comes from the path, not frontmatter `name`.
- [ ] Re-verify symlink dereferencing for an install from the **published GitHub** repository, not
      only from a local-path marketplace. Git stores the entries as real symlinks, so a clone
      reproduces them; the clone-then-copy step is the part still unconfirmed.
- [ ] Write `skills/architecture-review/SKILL.md` with frontmatter `name` matching the directory ID.
- [ ] Write `skills/codebase-onboarding/SKILL.md` so `core` ships real content rather than being an
      empty bundle. `core` must not appear in the marketplace before it does.
- [ ] Write the first agent as `plugins/<owner>/agents/architect.md`, declaring
      `skills: [architecture-review]` rather than restating those instructions. Root
      `agents/architect/` stays empty until the platform track opens — see
      [specs.md](specs.md) §6.
- [ ] Create the plugin directories, each with `.claude-plugin/plugin.json` and `skills/` entries
      symlinked into the canonical homes. No copied skills.
- [ ] Place each agent as a real `.md` file at `plugins/<owner>/agents/<id>.md` with `name`,
      `description` and `skills:` frontmatter. Do not symlink it — the target drops symlinked
      agent files without warning.
- [ ] Document that contributors on Windows need `core.symlinks=true` or Developer Mode, and add a
      check that each composed `skills/` entry is still a symlink rather than a plain text file.
- [ ] Add an authoring check that every component's directory or file name matches its frontmatter
      `name`, and that `claude plugin details <plugin>` lists every component meant to ship. A
      dropped agent has no other symptom.
- [ ] Declare `core` as a dependency of `architecture` so installing `architecture` pulls it in.
- [ ] Import one vendor skill from `mattpocock/skills` at a pinned full commit. Keep the upstream
      bytes unmodified. Write `vendor/mattpocock/PROVENANCE.md` (repository, full commit,
      original paths, licence) and `vendor/mattpocock/SHA256SUMS`.
- [ ] Retain the upstream licence and attribution material alongside the snapshot.
- [ ] Review the imported vendor instruction text before wiring it in, and record the result:
      read every instruction file in full; no directive that rewrites repository files, exfiltrates
      data, or calls out to a network endpoint; no reference to credentials; licence present and
      compatible. This is the interim control until `docs/engineering/security-model.md` exists at
      M6 — untrusted instruction text arrives at N0, six milestones earlier.
- [ ] Decide and record how a vendor skill is exposed through a plugin in N0: the symlink name
      becomes the installed skill ID, so it can silently diverge from the upstream frontmatter
      `name` that [specs.md](specs.md) §6 says to preserve. Check for collisions with local skill
      IDs by hand — N0 has no adapter to detect them.
- [ ] Populate `.claude-plugin/marketplace.json` with one entry per plugin that has real content.
      Do not list a plugin before it exists.
- [ ] Document the installation steps that actually work in [usage.md](usage.md), and remove the
      "not implemented" banner from the sections that become true.

- [x] Removed the declared `$schema` from `.claude-plugin/marketplace.json`: the URL
      `json.schemastore.org/claude-code-marketplace.json` does not exist. Only `plugin.json` has a
      registered schema (`claude-code-plugin-manifest.json`); add that one when plugins are written.

**Done when:** the marketplace and every published plugin manifest pass `claude plugin validate`
(non-strict; `--strict` fails on any unread symlink, so validate each canonical home separately);
installing `architecture` into a clean consumer resolves its skills plus the `architect` agent and
auto-installs its dependencies; `claude plugin details architecture` lists every component that was
meant to ship; `sha256sum -c vendor/mattpocock/SHA256SUMS` passes.

## M0 · Foundation and contracts

**Depends on:** nothing, but do not start before a roadmap activation condition is met.

- [ ] Pin the Node.js, TypeScript, and pnpm toolchain; commit the lockfile; add `lint`,
      `typecheck`, `test`, `build`, and `validate` scripts that actually run.
- [ ] Write `docs/architecture/architecture.md` and `docs/architecture/domain-model.md`.
- [ ] Write `docs/contracts/manifest-spec.md` and `docs/architecture/dependency-resolution.md`.
- [ ] Add JSON Schemas under `schemas/` for skills, agents, plugins, profiles, and project intent,
      including each component's own `category` and `stability`. Every manifest carries
      `version: 1`; unknown fields are rejected. No schema for a handwritten registry — it is
      generated.
- [ ] Add ADRs under `docs/adr/` for root ownership layout and plugin composition.
- [ ] Add a local-only fixture under `tests/fixtures/` that parses and validates with no vendor
      configuration present.

**Done when:** the local-only fixture validates; schema errors name the file and the field;
absent vendor configuration is accepted rather than treated as an error.

## M1 · Local plugin vertical slice

**Depends on:** M0.

- [ ] Generate `registry.yaml` into `dist/` by enumerating the canonical homes, reading `category`
      and `stability` from each component. Resolution consumes the generated index, never the
      filesystem directly, so ordering stays independent of directory enumeration.
- [ ] Implement bare-ID resolution for local components. An unqualified name must never fall back
      to a vendor search.
- [ ] Resolve agent-to-skill dependencies and plugin-to-plugin dependencies into a graph.
- [ ] Implement `agent-plugins validate`.
- [ ] Error cases with useful messages: missing reference, duplicate definition, wrong component
      type, profile cycle, plugin cycle.

**Done when:** `plugins/architecture/plugin.yaml` → `agents/architect` → `architecture-review`
resolves entirely offline, with no vendor manifest, import, or overlay required.

## M2 · Composition and profiles

**Depends on:** M1.

- [ ] Implement profile inheritance through `extends`: additive, deduplicated, no overriding of
      component definitions.
- [ ] Implement the project manifest `.agent-plugins.yaml` with `include`/`exclude` for skills
      and agents.
- [ ] Expand skill dependencies for project-added agents, not only plugin-declared ones.
- [ ] Fail when an exclusion breaks a required dependency edge; report the dependency chain.
      Never silently reinstall the excluded item or delete its consumer.
- [ ] Produce stable dependency-first ordering with lexical tie-breaking on the canonical
      reference. Neither filesystem enumeration nor YAML mapping order may affect output.
- [ ] Validate component lifecycle: `experimental` default, `stable`, `deprecated` warns,
      `disabled` blocks use.

**Done when:** identical inputs produce identical graphs; diamonds deduplicate; cycles report
their full chain.

## M3 · Runtime output and safe project installation

**Depends on:** M2.

- [ ] Implement the `agent-skills` adapter for portable skill artifacts. Selecting an unsupported
      agent must error, not silently discard it.
- [ ] Implement the `claude-code` adapter against verified target fixtures, emitting into the
      consumer's `.claude/skills/` and `.claude/agents/`.
- [ ] Generate `.claude-plugin/` distribution metadata from `plugins/<id>/plugin.yaml`. After
      this point the N0 handwritten metadata becomes generated output and must not be edited to
      change behaviour.
- [ ] Detect target output-name collisions, including case-insensitive ones, and fail naming both
      source references.
- [ ] Implement the shared installer: staged writes, symlink and copy strategies, managed-path
      records, `.agent-plugins.lock.json` written only after a successful install.
- [ ] Implement locked mode against immutable content-addressed artifacts, and opt-in live mode
      that reports drift instead of claiming reproducibility.
- [ ] Map the collection alias to a local checkout through machine-local configuration. No
      absolute path may reach a committed manifest or lock.
- [ ] Expose `init`, `apply [--update] [--dry-run]`, `sync [--update] [--dry-run]`, and `doctor`.
      All non-interactive, with meaningful nonzero exit status.
- [ ] Filesystem safety tests: unmanaged files preserved, modified managed content conflicts,
      path traversal, symlink escape, case collision, interrupted write recovery.

**Done when:** a local plugin installs into a fixture consumer; locked sync stays stable after
canonical source changes; explicit update advances the lock; live mode reports drift;
an interrupted operation leaves recoverable state.

## M4 · Curated vendor extension

**Depends on:** M3. Source contracts may be designed earlier.

- [ ] Write `docs/operations/vendor-management.md`.
- [ ] Define `sources.yaml` (explicit component selection) and `sources.lock.json` (schema
      version, alias, repository, requested ref, full resolved commit, original paths, file
      inventory, hashes).
- [ ] Implement fetch → resolve commit → extract selected files in staging → diff → validate →
      audit → update candidate. Temporary clones live in an external cache, never in the source
      tree.
- [ ] Never execute upstream scripts during discovery, import, or validation.
- [ ] Reproduce the N0 `mattpocock` snapshot byte for byte with tooling instead of by hand.
- [ ] Implement `vendor list|check|diff|sync`. Vendor sync must not silently advance the accepted
      branch, and project sync must not perform vendor updates.

**Done when:** a plugin can opt into a pinned `vendor:<source>/<component>` reference; the
snapshot and lock reproduce exact selected content; unselected upstream content is not imported.

## M5 · Replacement overlays and complete MVP

**Depends on:** M4.

- [ ] Implement replacement-only overlays: for each file in the vendor snapshot, use the overlay
      file at the same relative path if present, otherwise retain the vendor file.
- [ ] Error on an overlay file with no matching vendor path, a missing target, a directory/file
      conflict, traversal, or a symlink escape.
- [ ] Build effective content into `dist/`. Never copy replacements back into `vendor/`.
- [ ] Record both snapshot and overlay hashes in resolved provenance.
- [ ] Revalidate overlays on every vendor update, including when an overridden file hides the
      upstream change in effective output.

**Done when:** the same vendor reference resolves to overlaid content while untouched resources
and vendor snapshot bytes are unchanged. MVP is complete only when M0–M5 exit criteria pass
together.

## M6 · Reviewable updates and operational quality

**Depends on:** M5.

- [ ] Scheduled upstream checks producing a reviewable candidate update: revision diff, licence
      changes, overlay status, affected components, build and test results. Never auto-merge.
- [ ] Treat newly discovered upstream components as candidates only; never import automatically.
- [ ] Write `docs/engineering/testing-strategy.md` and `docs/engineering/security-model.md`.
- [ ] Operational runbooks, recovery and rollback procedures, and release packaging.
- [ ] CI across supported environments: lint, typecheck, tests, build, canonical validation,
      provenance and hash checks, and a reproducibility check.

**Done when:** an upstream change produces a reviewable candidate without changing accepted
snapshots or installed locked projects; recovery and rollback have been exercised.

## M7 · Expand owned workflows and authoring experience

**Depends on:** N0 for authoring; the tooling items below depend on M3.

- [ ] Grow the candidate plugins only around actual use: `core`, `architecture`, `research`,
      `frontend`, `backend`, `security`, `agentic-engineering`. Keep `core` small.
- [ ] Candidate skills as real workflows demand them: `scalable-folder-design`,
      `technical-research`, `technology-evaluation`. (`codebase-onboarding` ships in N0.)
- [ ] Candidate agents: `researcher`, `code-reviewer`.
- [ ] Add `plugin|skill|agent|profile list|info|create` and scaffolding templates after the
      non-interactive core commands work.
- [ ] Add search and dependency visualization.
- [ ] Write `docs/architecture/project-structure.md` and `docs/contracts/cli-spec.md`.

**Done when:** new owned plugins reuse canonical components, carry focused examples, and have
validated consumer scenarios.

## M8 · Additional contracts and runtimes

**Depends on:** demonstrated need and stable core contracts.

- [ ] Define hooks and prompts behaviour before activating `hooks/` and `prompts/`. Until then a
      hooks or prompts field in a manifest is rejected, not silently ignored.
- [ ] Define the rules contract before activating `rules/`.
- [ ] Define the MCP contract before activating `.mcp.json`.
- [ ] Evaluate overlay add, delete, merge, append, and patch semantics as separate versioned
      contract changes.
- [ ] Write `docs/architecture/adapter-design.md`; evaluate Codex, OpenCode, Cursor, and
      Gemini CLI adapters with explicit capability matrices.
- [ ] Consider a generated catalog only if an observed discovery problem justifies it.

**Done when:** each extension has a documented contract, migration implications, and
target-specific tests, and existing local-only flows are unchanged unless a deliberate versioned
contract change was made.

## Explicitly not planned

Recorded so they are not reintroduced as tasks. Each contradicts a contract in
[specs.md](specs.md):

- A general package version solver, or version constraints on component references
  (`specs.md` §1 non-goals, §5).
- Namespaced or versioned component IDs, or a `local:` reference prefix (`specs.md` §5).
- Overlay merge, append, delete, patch, or file addition before M8 (`specs.md` §9).
- A public marketplace service, accounts, telemetry, a database-backed registry, or autonomous
  vendor merging (`specs.md` §1).
