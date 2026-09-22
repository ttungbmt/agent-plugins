# TODO

**Status:** Active  
**Last Updated:** 2026-09-21

This file tracks actionable implementation work for the Agent Plugins project.

Roadmap and architecture decisions are defined in:

```text
docs/roadmap.md
docs/architecture.md
docs/specs/
```

This file answers:

> What should be implemented next?

---

# 1. Priority Legend

```text
P0  Blocking / foundation
P1  Required for MVP
P2  Important after MVP
P3  Future / ecosystem expansion
```

Status:

```text
[ ] Todo
[-] In progress
[x] Done
[~] Deferred
```

---

# 2. Current Focus

Current implementation sequence:

```text
Documentation contracts
        ↓
Canonical domain
        ↓
Schemas + validation
        ↓
Catalog
        ↓
Resolver
        ↓
Policy
        ↓
Lockfile
        ↓
Adapter framework
        ↓
Claude adapter
        ↓
CLI MVP
        ↓
Codex adapter
```

Current milestone:

```text
M0 — Foundation
```

---

# 3. Documentation

## P0 — Core Documents

- [x] `problem.md`
- [x] `problem.vi.md`
- [x] `vision.md`
- [x] `goals.md`
- [x] `non-goals.md`
- [x] `requirements.md`
- [x] `use-cases.md`
- [x] `domain-model.md`
- [x] `terminology.md`
- [x] `capability-model.md`
- [x] `architecture.md`
- [x] `repository-structure.md`
- [x] `source-of-truth.md`

## P0 — Core Specifications

- [x] `resolution-spec.md`
- [x] `catalog-spec.md`
- [x] `manifest-spec.md`
- [x] `lockfile-spec.md`
- [x] `policy-spec.md`
- [x] `adapter-spec.md`
- [x] `cli-spec.md`
- [x] `roadmap.md`
- [x] `todo.md`

## P0 — Remaining Specifications

- [ ] Write `configuration-spec.md`
- [ ] Write `overlay-spec.md`
- [ ] Write `source-spec.md`
- [ ] Write `update-spec.md`
- [ ] Write `error-model.md`
- [ ] Write `security-model.md`
- [ ] Write `testing-strategy.md`
- [ ] Write `versioning-spec.md`
- [ ] Write `migration-spec.md`

## P1 — Contributor Documentation

- [ ] Review `README.md`
- [ ] Review `AGENTS.md`
- [ ] Write `CONTRIBUTING.md`
- [ ] Write development setup guide
- [ ] Write architecture overview for contributors
- [ ] Write plugin authoring guide
- [ ] Write skill authoring guide
- [ ] Write adapter authoring guide

---

# 4. Repository Foundation

## P0 — Workspace

- [ ] Initialize workspace
- [ ] Select package manager
- [ ] Configure workspace packages
- [ ] Configure TypeScript
- [ ] Enable TypeScript strict mode
- [ ] Configure module resolution
- [ ] Configure package exports
- [ ] Configure build pipeline

Target structure:

```text
packages/
├── core/
├── schemas/
├── catalog/
├── resolver/
├── policy/
├── lockfile/
├── adapter-kit/
├── adapters/
├── application/
└── cli/
```

## P0 — Tooling

- [ ] Configure Biome
- [ ] Configure Vitest
- [ ] Configure test coverage
- [ ] Configure package scripts
- [ ] Configure dependency checks
- [ ] Configure unused-code detection
- [ ] Configure Git hooks if needed
- [ ] Configure CI

## P1 — Release Tooling

- [ ] Select versioning strategy
- [ ] Configure Changesets or equivalent
- [ ] Configure changelog generation
- [ ] Configure package publishing workflow
- [ ] Configure release CI

---

# 5. Canonical Domain

## P0 — Base Types

Create canonical domain types.

- [ ] `Package`
- [ ] `Component`
- [ ] `Capability`
- [ ] `Publisher`
- [ ] `Source`
- [ ] `Preset`
- [ ] `Role`
- [ ] `Policy`
- [ ] `Overlay`

## P0 — Component Types

- [ ] `Skill`
- [ ] `Agent`
- [ ] `Prompt`
- [ ] `Command`
- [ ] `Hook`

## P0 — Canonical Identifiers

Implement canonical references:

```text
plugin:<id>
skill:<id>
agent:<id>
prompt:<id>
command:<id>
hook:<id>
preset:<id>
role:<id>
```

Tasks:

- [ ] Define `CanonicalReference`
- [ ] Implement parser
- [ ] Implement serializer
- [ ] Implement validator
- [ ] Implement equality helpers
- [ ] Implement stable sorting

## P0 — Domain Errors

- [ ] Invalid identifier
- [ ] Duplicate identifier
- [ ] Missing reference
- [ ] Invalid dependency
- [ ] Invalid capability
- [ ] Cyclic reference

---

# 6. Schemas

## P0 — Schema Strategy

- [ ] Select runtime schema library
- [ ] Define schema versioning convention
- [ ] Define compatibility strategy
- [ ] Define schema error format

## P0 — Schemas

- [ ] Package manifest schema
- [ ] Skill schema
- [ ] Agent schema
- [ ] Prompt schema
- [ ] Command schema
- [ ] Hook schema
- [ ] Preset schema
- [ ] Role schema
- [ ] Policy schema
- [ ] Project configuration schema
- [ ] Adapter manifest schema
- [ ] Lockfile schema

## P1 — Schema Fixtures

- [ ] Valid fixtures
- [ ] Invalid fixtures
- [ ] Boundary fixtures
- [ ] Version compatibility fixtures

---

# 7. Manifest System

## P0 — Manifest Loader

- [ ] Read manifest files
- [ ] Parse YAML
- [ ] Parse JSON if supported
- [ ] Validate schema version
- [ ] Convert manifest to canonical types
- [ ] Preserve source location

## P0 — Manifest Diagnostics

Diagnostics should include:

```text
file
line if available
field
code
message
suggestion
```

Tasks:

- [ ] Invalid schema diagnostic
- [ ] Unknown field diagnostic
- [ ] Missing required field diagnostic
- [ ] Invalid canonical reference diagnostic

## P1 — Manifest Tests

- [ ] Unit tests
- [ ] Fixture tests
- [ ] Invalid-manifest snapshots

---

# 8. Repository Scanner

## P0 — Scan Canonical Repository

Discover:

```text
plugins/
skills/
agents/
prompts/
commands/
hooks/
presets/
roles/
policies/
```

Tasks:

- [ ] Define scanner API
- [ ] Walk canonical directories
- [ ] Ignore unsupported files
- [ ] Detect duplicate IDs
- [ ] Preserve file provenance
- [ ] Produce deterministic ordering

## P1 — Scanner Configuration

- [ ] Custom repository root
- [ ] Ignore patterns
- [ ] Optional directories
- [ ] Monorepo-ready abstraction

---

# 9. Validation Engine

## P0 — Structural Validation

- [ ] Validate manifests
- [ ] Validate canonical IDs
- [ ] Validate duplicate IDs
- [ ] Validate references
- [ ] Validate component types
- [ ] Validate dependency syntax

## P0 — Graph Validation

- [ ] Missing dependencies
- [ ] Dependency cycles
- [ ] Role inheritance cycles
- [ ] Preset composition cycles
- [ ] Invalid capability publishers

## P1 — Validation Modes

- [ ] Normal mode
- [ ] Strict mode
- [ ] Machine-readable diagnostics

---

# 10. Catalog

## P0 — Catalog Model

Implement:

```ts
Catalog
├── packages
├── components
├── presets
├── roles
├── policies
└── publishers
```

Tasks:

- [ ] Build catalog from repository
- [ ] Index by canonical ID
- [ ] Index by component type
- [ ] Index by capability
- [ ] Index by publisher
- [ ] Stable deterministic ordering

## P1 — Catalog Queries

- [ ] `get()`
- [ ] `has()`
- [ ] `list()`
- [ ] `search()`
- [ ] `findByCapability()`
- [ ] `findByPublisher()`

## P1 — Catalog Tests

- [ ] Empty repository
- [ ] Valid repository
- [ ] Duplicate entries
- [ ] Missing reference
- [ ] Deterministic catalog output

---

# 11. Preset System

## P0

- [ ] Parse Presets
- [ ] Resolve Preset references
- [ ] Support package selection
- [ ] Support capability selection
- [ ] Support nested Presets
- [ ] Detect cycles
- [ ] Stable composition ordering

## P1

Create initial Presets:

- [ ] `mental-models`
- [ ] `engineering-base`
- [ ] `typescript`
- [ ] `testing`
- [ ] `code-review`
- [ ] `frontend-quality`

---

# 12. Role System

## P0

- [ ] Parse Roles
- [ ] Support Role inheritance
- [ ] Support Preset references
- [ ] Support explicit package selection
- [ ] Support policy references
- [ ] Detect inheritance cycles
- [ ] Produce effective Role

## P1

Initial Roles:

- [ ] `software-engineer`
- [ ] `frontend`
- [ ] `backend`
- [ ] `product-manager`
- [ ] `second-brain`

---

# 13. Resolver

## P0 — Resolver Core

Implement:

```text
Role
   ↓
Preset expansion
   ↓
Package selection
   ↓
Dependency expansion
   ↓
Deduplication
   ↓
Conflict detection
   ↓
Resolved Graph
```

Tasks:

- [ ] Define resolver input
- [ ] Define resolver output
- [ ] Resolve direct dependencies
- [ ] Resolve transitive dependencies
- [ ] Deduplicate components
- [ ] Detect conflicts
- [ ] Detect cycles
- [ ] Stable graph ordering

## P0 — Resolution Provenance

Track:

```text
selectedBy
dependsOn
providedBy
inheritedFrom
```

Example:

```text
role:frontend
→ preset:typescript
→ plugin:typescript
→ skill:typescript
```

Tasks:

- [ ] Record resolution edges
- [ ] Record selection reason
- [ ] Support dependency path tracing

## P1 — Explainability

- [ ] `why(component)`
- [ ] full dependency tree
- [ ] conflict explanation
- [ ] resolution summary

## P1 — Resolver Tests

- [ ] Direct package
- [ ] Transitive package
- [ ] Nested Preset
- [ ] Role inheritance
- [ ] Duplicate dependency
- [ ] Dependency cycle
- [ ] Conflict
- [ ] Deterministic resolution

---

# 14. Policy Engine

## P0 — Policy Evaluation

- [ ] Allow package
- [ ] Deny package
- [ ] Allow component
- [ ] Deny component
- [ ] Allow source
- [ ] Deny source
- [ ] Capability restrictions
- [ ] Target restrictions

## P0 — Diagnostics

- [ ] Policy rejection code
- [ ] Explain matching policy
- [ ] Explain blocked component
- [ ] Include remediation suggestion

## P1 — Policy Composition

- [ ] Base policy
- [ ] Workspace policy
- [ ] Project policy
- [ ] Define precedence

---

# 15. Lockfile

## P0 — Lockfile Model

Capture:

- [ ] Schema version
- [ ] Package versions
- [ ] Source revisions
- [ ] Integrity hashes
- [ ] Resolved dependencies
- [ ] Adapter versions
- [ ] Target metadata

## P0 — Operations

- [ ] Read lockfile
- [ ] Validate lockfile
- [ ] Generate lockfile
- [ ] Compare lockfile with config
- [ ] Verify integrity
- [ ] Detect stale lockfile

## P1 — Determinism

- [ ] Stable key ordering
- [ ] Stable serialization
- [ ] Lockfile round-trip test
- [ ] Reproducibility tests

---

# 16. Configuration System

## P0

Blocked by:

```text
configuration-spec.md
```

Tasks:

- [ ] Define project config schema
- [ ] Define default Role
- [ ] Define target list
- [ ] Define sources
- [ ] Define policies
- [ ] Define overlays
- [ ] Define lockfile mode
- [ ] Define output paths

## P0 — Configuration Precedence

Implement:

```text
CLI
↓
environment
↓
project
↓
workspace
↓
user
↓
defaults
```

## P1

- [ ] Config discovery
- [ ] Explicit config path
- [ ] Project root discovery
- [ ] Configuration diagnostics

---

# 17. Adapter SDK

## P0 — Shared Contracts

- [ ] `AdapterMetadata`
- [ ] `AdapterCapabilities`
- [ ] `SourceAdapter`
- [ ] `TargetAdapter`
- [ ] `RenderPlan`
- [ ] `RenderedArtifact`

## P0 — Target Adapter API

Implement:

```text
metadata
capabilities
validate
plan
render
```

## P1 — Utilities

- [ ] Path validation
- [ ] Collision detection
- [ ] Integrity helper
- [ ] Diagnostic helper
- [ ] Deterministic render helpers
- [ ] Test helpers

## P1 — Conformance Suite

- [ ] Metadata test
- [ ] Capability declaration test
- [ ] Determinism test
- [ ] Path traversal test
- [ ] Collision test
- [ ] Unsupported capability test

---

# 18. Render Plan

## P0

Define operations:

```text
create
update
remove
unchanged
```

Tasks:

- [ ] Render-plan model
- [ ] Stable operation ordering
- [ ] Collision detection
- [ ] Path ownership metadata
- [ ] Source-component metadata

## P1

- [ ] Render-plan hash
- [ ] Human-readable formatter
- [ ] JSON formatter

---

# 19. Filesystem Apply Layer

## P0

- [ ] Validate destination paths
- [ ] Prevent path traversal
- [ ] Create directories
- [ ] Write generated files
- [ ] Remove owned stale files
- [ ] Preserve user-owned files
- [ ] Detect collisions

## P1

- [ ] Atomic apply
- [ ] Temporary staging
- [ ] Rollback strategy
- [ ] Idempotent writes
- [ ] File integrity comparison

---

# 20. Claude Target Adapter

## P1 — Research

- [ ] Confirm current Claude plugin structure
- [ ] Confirm Skills representation
- [ ] Confirm Agents representation
- [ ] Confirm Commands representation
- [ ] Confirm Hooks representation
- [ ] Confirm project instructions behavior

## P1 — Implementation

- [ ] Adapter manifest
- [ ] Capability declaration
- [ ] Skill renderer
- [ ] Agent renderer
- [ ] Command renderer
- [ ] Hook renderer
- [ ] Project instructions renderer

## P1 — Validation

- [ ] Unsupported metadata handling
- [ ] Filename validation
- [ ] Collision detection
- [ ] Reserved paths

## P1 — Tests

Golden fixtures:

- [ ] Single skill
- [ ] Multiple skills
- [ ] Agent
- [ ] Command
- [ ] Hook
- [ ] Full plugin
- [ ] Collision case
- [ ] Unsupported case
- [ ] Deterministic output

---

# 21. Application Layer

## P1

Create services independent from CLI:

- [ ] `InitService`
- [ ] `CatalogService`
- [ ] `ResolveService`
- [ ] `PlanService`
- [ ] `BuildService`
- [ ] `InstallService`
- [ ] `DiffService`
- [ ] `ValidateService`
- [ ] `DoctorService`

Later:

- [ ] `UpdateService`
- [ ] `SourceService`

Application layer MUST orchestrate domain services.

CLI MUST NOT contain this logic.

---

# 22. CLI Foundation

## P1 — oclif

- [ ] Initialize oclif project
- [ ] Configure command discovery
- [ ] Configure global flags
- [ ] Configure error handling
- [ ] Configure help
- [ ] Configure version
- [ ] Configure completion

## P1 — Output

- [ ] Human presenter
- [ ] JSON presenter
- [ ] Diagnostic presenter
- [ ] Table helper
- [ ] Tree helper

## P1 — Behavior

- [ ] `--json`
- [ ] `--quiet`
- [ ] `--verbose`
- [ ] `--no-color`
- [ ] `--offline`
- [ ] `--yes`
- [ ] `--dry-run`

## P1 — Exit Codes

Implement:

```text
0  success
1  general
2  CLI usage
3  configuration
4  validation
5  resolution
6  policy
7  lockfile
8  source
9  adapter
10 filesystem
```

---

# 23. CLI MVP Commands

## P1 — `init`

- [ ] Initialize config
- [ ] Detect existing project
- [ ] Avoid overwrite
- [ ] Support non-interactive flags

## P1 — `validate`

- [ ] Validate repository
- [ ] Validate project config
- [ ] `--strict`
- [ ] `--json`

## P1 — `catalog`

- [ ] `catalog list`
- [ ] `catalog show`

## P1 — `role`

- [ ] `role list`
- [ ] `role show`
- [ ] `role show --resolved`

## P1 — `resolve`

- [ ] Basic resolution
- [ ] Summary output
- [ ] `--json`
- [ ] `--verbose`
- [ ] `--explain`
- [ ] `--why`

## P1 — `adapter`

- [ ] `adapter list`
- [ ] `adapter show`
- [ ] `adapter capabilities`

## P1 — `plan`

- [ ] Select target
- [ ] Generate Render Plan
- [ ] Display changes
- [ ] JSON output

## P1 — `build`

- [ ] Build one target
- [ ] Output to `dist`
- [ ] Frozen lockfile mode
- [ ] Deterministic output

## P1 — `install`

- [ ] Render target
- [ ] Preview changes
- [ ] Confirmation
- [ ] `--yes`
- [ ] `--dry-run`
- [ ] Safe filesystem apply

## P1 — `diff`

- [ ] Summary diff
- [ ] Content diff
- [ ] `--check`
- [ ] JSON mode

## P1 — `lock`

- [ ] `lock show`
- [ ] `lock verify`

## P1 — `doctor`

- [ ] Config check
- [ ] Lockfile check
- [ ] Adapter check
- [ ] Filesystem check
- [ ] Runtime check

---

# 24. Ink / Interactive UX

## P2

Do not block MVP on advanced TUI.

Initial Ink usage:

- [ ] `init` wizard
- [ ] Role selector
- [ ] Target selector
- [ ] Confirmation UI

Later:

- [ ] Catalog explorer
- [ ] Dependency graph browser
- [ ] Update review UI
- [ ] Capability compatibility UI

Ink MUST remain optional for non-interactive commands.

---

# 25. First End-to-End Fixture

## P1

Create fixture:

```text
fixtures/
└── frontend-project/
```

Contains:

```text
Role: frontend

Preset:
  engineering-base
  typescript
  testing

Packages:
  first-party
```

Expected flow:

```bash
agent-plugins validate

agent-plugins resolve

agent-plugins plan --target claude

agent-plugins build --target claude

agent-plugins install --target claude

agent-plugins diff --target claude --check
```

Final result:

```text
No changes.
```

This fixture defines the first complete product loop.

---

# 26. MVP Acceptance Checklist

The MVP is complete when:

- [ ] Canonical manifests are stable
- [ ] Catalog loads first-party packages
- [ ] Roles work
- [ ] Presets work
- [ ] Resolver works deterministically
- [ ] Policy works
- [ ] Lockfile works
- [ ] Claude adapter works
- [ ] Render Plan works
- [ ] Safe apply works
- [ ] CLI works end-to-end
- [ ] `--json` works for automation
- [ ] CI workflow passes
- [ ] Golden fixtures pass
- [ ] Repeated install is idempotent

Core MVP story:

```text
canonical content
    ↓
role
    ↓
resolve
    ↓
policy
    ↓
lock
    ↓
Claude adapter
    ↓
install
```

---

# 27. Codex Adapter

## P2 — Research

- [ ] Confirm current Codex project instruction model
- [ ] Confirm Skills support
- [ ] Confirm Agent support
- [ ] Confirm tool/config behavior
- [ ] Build capability mapping

## P2 — Implementation

- [ ] Adapter manifest
- [ ] Capability declaration
- [ ] Validation
- [ ] Render planning
- [ ] Rendering
- [ ] Golden fixtures
- [ ] Conformance tests

## Architecture Gate

- [ ] Verify no Claude-specific canonical assumptions
- [ ] Verify same resolved graph can target Claude and Codex
- [ ] Refactor abstraction leaks before proceeding

---

# 28. Multi-Target Support

## P2

- [ ] Multiple `--target`
- [ ] Resolve once
- [ ] Render each target independently
- [ ] Target-specific diagnostics
- [ ] Multi-target build summary
- [ ] Multi-target lockfile metadata

Example:

```bash
agent-plugins build \
  --target claude \
  --target codex
```

---

# 29. Source Adapter System

## P2 — Source Contract

- [ ] `discover`
- [ ] `fetch`
- [ ] `normalize`
- [ ] `verify`

## P2 — Local Adapter

- [ ] Implement `source/local`
- [ ] Validate canonical local packages

## P2 — Git Adapter

- [ ] Git source config
- [ ] Fetch immutable revision
- [ ] Normalize package
- [ ] Capture provenance
- [ ] Integrity verification
- [ ] Local cache

## P2 — Source Diagnostics

- [ ] Fetch failure
- [ ] Revision unavailable
- [ ] Integrity mismatch
- [ ] Unsupported repository structure
- [ ] Normalization failure

---

# 30. Vendor Layer

## P2

- [ ] Define vendor directory layout
- [ ] Define vendor provenance
- [ ] Define import workflow
- [ ] Define vendor IDs
- [ ] Prevent direct modification where possible

Initial vendor research:

- [ ] Superpowers
- [ ] Matt Pocock ecosystem
- [ ] ECC
- [ ] Other curated repositories

---

# 31. Overlay Engine

## P2

Blocked by:

```text
overlay-spec.md
```

Implement operations:

- [ ] Add
- [ ] Replace
- [ ] Merge
- [ ] Remove

Additional tasks:

- [ ] Overlay ordering
- [ ] Overlay conflicts
- [ ] Overlay provenance
- [ ] Overlay validation
- [ ] Overlay tests

Architecture invariant:

```text
Overlay
    = semantic modification

Adapter
    = target representation
```

---

# 32. Update Engine

## P2

Blocked by:

```text
update-spec.md
```

Implement:

- [ ] Discover newer version/revision
- [ ] Compare current lock
- [ ] Candidate selection
- [ ] Compatibility validation
- [ ] Re-resolution
- [ ] Policy evaluation
- [ ] Preview
- [ ] Update lockfile

CLI:

- [ ] `update`
- [ ] `update <package>`
- [ ] `update --dry-run`

Later:

- [ ] `--patch`
- [ ] `--minor`
- [ ] `--major`

---

# 33. Source CLI

## P2

- [ ] `source list`
- [ ] `source show`
- [ ] `source refresh`

Important:

```text
source refresh
    !=
update
```

---

# 34. Cache

## P2

- [ ] Define cache location
- [ ] Define cache structure
- [ ] Implement source cache
- [ ] Integrity check
- [ ] Cache pruning

CLI:

- [ ] `cache status`
- [ ] `cache clean`
- [ ] `cache prune`

---

# 35. First-Party Library

## P2 — Mental Models

- [ ] Debugging
- [ ] Problem solving
- [ ] Systems thinking
- [ ] Trade-off analysis
- [ ] Root-cause analysis
- [ ] First-principles reasoning

## P2 — Engineering

- [ ] Software engineering
- [ ] Architecture
- [ ] Code review
- [ ] Testing
- [ ] Security
- [ ] Documentation

## P2 — Frontend

- [ ] TypeScript
- [ ] React
- [ ] Next.js
- [ ] Accessibility
- [ ] Performance
- [ ] Frontend testing

## P2 — Backend

- [ ] API design
- [ ] Database design
- [ ] Distributed systems
- [ ] Observability
- [ ] Backend testing

## P2 — Product

- [ ] Product discovery
- [ ] Requirements
- [ ] Prioritization
- [ ] Roadmapping
- [ ] Metrics
- [ ] Stakeholder management

## P2 — Knowledge

- [ ] Research
- [ ] Writing
- [ ] Knowledge management
- [ ] Second brain

---

# 36. Publisher Model

## P2

- [ ] Publisher ID
- [ ] Publisher metadata
- [ ] Publisher trust
- [ ] Publisher priority

## P3 — Capability Publisher Selection

- [ ] Multiple publishers per capability
- [ ] Publisher preference
- [ ] Publisher override
- [ ] Deterministic selection
- [ ] Policy constraints

---

# 37. Additional Target Adapters

## P3 — Gemini

- [ ] Research
- [ ] Capability matrix
- [ ] Adapter
- [ ] Tests

## P3 — OpenCode

- [ ] Research
- [ ] Capability matrix
- [ ] Adapter
- [ ] Tests

## P3 — Hermes

- [ ] Research
- [ ] Capability matrix
- [ ] Adapter
- [ ] Tests

---

# 38. Advanced CLI

## P3

- [ ] `inspect`
- [ ] `graph`
- [ ] `add`
- [ ] `remove`
- [ ] `sync`
- [ ] `migrate`

Possible:

```bash
agent-plugins inspect skill:typescript
agent-plugins graph --format mermaid
```

Do not implement before core semantics stabilize.

---

# 39. Rich TUI

## P3

- [ ] Catalog explorer
- [ ] Role explorer
- [ ] Dependency tree
- [ ] Capability matrix
- [ ] Install preview
- [ ] Update review
- [ ] Searchable component selector

TUI MUST consume Application APIs.

---

# 40. Security

## P1 — Baseline

- [ ] Path traversal protection
- [ ] Generated path validation
- [ ] Secret redaction
- [ ] Unknown file ownership protection
- [ ] No arbitrary package execution
- [ ] Integrity support

## P2

- [ ] Source trust level
- [ ] Executable-content detection
- [ ] License metadata
- [ ] Security policy hooks

## P3

- [ ] Package signatures
- [ ] Verified publishers
- [ ] Registry trust model

---

# 41. Testing

## P0 — Unit Tests

- [ ] Canonical references
- [ ] Schemas
- [ ] Manifest parser
- [ ] Catalog
- [ ] Role composition
- [ ] Preset composition

## P1 — Core Tests

- [ ] Resolver
- [ ] Policy
- [ ] Lockfile
- [ ] Render Plan
- [ ] Filesystem apply

## P1 — Adapter Tests

- [ ] Conformance tests
- [ ] Golden fixtures
- [ ] Snapshot tests
- [ ] Determinism tests

## P1 — CLI Tests

- [ ] Argument parsing
- [ ] Exit codes
- [ ] JSON contract
- [ ] Human presentation
- [ ] CI behavior

## P1 — End-to-End

- [ ] Init → Resolve → Build
- [ ] Build → Install → Diff
- [ ] Repeated install
- [ ] Frozen lockfile
- [ ] Policy rejection
- [ ] Unsupported adapter feature

---

# 42. CI

## P0

Pipeline:

```text
install
 ↓
lint
 ↓
typecheck
 ↓
test
 ↓
build
```

Tasks:

- [ ] Lint
- [ ] Typecheck
- [ ] Unit tests
- [ ] Integration tests
- [ ] Build

## P1

Add:

- [ ] Schema fixtures
- [ ] Adapter conformance
- [ ] Golden fixtures
- [ ] Determinism check
- [ ] CLI contract tests

Recommended future project validation:

```bash
agent-plugins validate --strict

agent-plugins lock verify

agent-plugins build --frozen-lockfile

agent-plugins diff --check
```

---

# 43. Performance

## P2

- [ ] Measure catalog loading
- [ ] Measure resolver performance
- [ ] Avoid repeated manifest parsing
- [ ] Cache parsed manifests
- [ ] Lazy-load adapters
- [ ] Incremental rendering

Do not optimize before profiling.

---

# 44. Versioning

## P2

Blocked by:

```text
versioning-spec.md
```

Define versions for:

- [ ] CLI
- [ ] Core
- [ ] Canonical schemas
- [ ] Adapter API
- [ ] Individual adapters
- [ ] Lockfile
- [ ] JSON CLI output

---

# 45. Migration

## P3

Blocked by:

```text
migration-spec.md
```

- [ ] Detect old schema
- [ ] Plan migration
- [ ] Preview migration
- [ ] Apply migration
- [ ] Validate migrated project
- [ ] CLI `migrate`

---

# 46. Community Ecosystem

## P3

Do not start until security/provenance model is stable.

- [ ] Community catalog design
- [ ] Package metadata index
- [ ] Trust metadata
- [ ] Integrity metadata
- [ ] License metadata
- [ ] Community source adapter
- [ ] Search
- [ ] Package discovery

---

# 47. Registry

## P3

- [ ] Registry architecture
- [ ] Namespace model
- [ ] Package ownership
- [ ] Package version metadata
- [ ] Integrity storage
- [ ] Registry API
- [ ] Offline cache strategy

---

# 48. Publishing

## P3

Potential CLI:

```text
package validate
package pack
package publish
```

Tasks:

- [ ] Define package archive format
- [ ] Package validation
- [ ] Package integrity
- [ ] Publisher identity
- [ ] Publishing authorization

---

# 49. IDE Integration

## P3

- [ ] VS Code exploration
- [ ] Role selector
- [ ] Catalog browser
- [ ] Diagnostics
- [ ] Generated artifact preview

Must reuse Application API.

---

# 50. MCP / Agent Interface

## P3

Potential read operations:

- [ ] Search catalog
- [ ] Inspect package
- [ ] Inspect capability
- [ ] Resolve Role
- [ ] Show Render Plan

Potential write operations require separate security review.

---

# 51. Documentation Quality Pass

Before V1:

- [ ] Ensure terminology is consistent
- [ ] Remove duplicated concepts
- [ ] Cross-link specifications
- [ ] Add architecture diagrams
- [ ] Add canonical examples
- [ ] Add CLI examples
- [ ] Add end-to-end tutorial
- [ ] Add troubleshooting
- [ ] Add FAQ

---

# 52. Architecture Review Gates

## After Canonical Domain

- [ ] No target-specific fields in core
- [ ] Canonical IDs stable
- [ ] Package/component distinction clear

## After Resolver

- [ ] No rendering logic in resolver
- [ ] No network logic in resolver
- [ ] Resolution deterministic
- [ ] Resolution explainable

## After Claude Adapter

- [ ] Target semantics isolated
- [ ] Canonical content unchanged
- [ ] Adapter conformance passes

## After Codex Adapter

- [ ] No Claude assumptions leaked into core
- [ ] Same resolved graph works for both targets

## Before External Ecosystem

- [ ] Provenance model complete
- [ ] Integrity model complete
- [ ] Policy model complete
- [ ] Source trust model defined

## Before Community Registry

- [ ] Security model reviewed
- [ ] No remote package execution
- [ ] Integrity validation working
- [ ] Trust metadata available

---

# 53. V0.1 Checklist

Goal:

```text
first end-to-end build
```

Required:

- [ ] Repository foundation
- [ ] Canonical model
- [ ] Schemas
- [ ] Manifest loader
- [ ] Repository scanner
- [ ] Validation
- [ ] Catalog
- [ ] Preset
- [ ] Role
- [ ] Resolver
- [ ] Basic Claude adapter
- [ ] Basic CLI
- [ ] Build command
- [ ] End-to-end fixture

---

# 54. V0.2 Checklist

Goal:

```text
reproducible + safe
```

- [ ] Policy
- [ ] Lockfile
- [ ] Resolution explanation
- [ ] Render Plan
- [ ] Safe filesystem apply
- [ ] Install
- [ ] Diff
- [ ] Doctor
- [ ] Frozen lockfile
- [ ] Idempotency tests

---

# 55. V0.3 Checklist

Goal:

```text
prove portability
```

- [ ] Codex adapter
- [ ] Multi-target builds
- [ ] Adapter capability matrix
- [ ] Cross-target fixtures

---

# 56. V0.4 Checklist

Goal:

```text
external sources
```

- [ ] Source Adapter API
- [ ] Git adapter
- [ ] Provenance
- [ ] Integrity
- [ ] Source cache
- [ ] Vendor model

---

# 57. V0.5 Checklist

Goal:

```text
maintain upstream content
```

- [ ] Overlay engine
- [ ] Update engine
- [ ] Update preview
- [ ] Vendor update workflow

---

# 58. V0.6 Checklist

Goal:

```text
better daily UX
```

- [ ] Mature Role library
- [ ] Preset library
- [ ] First-party capability library
- [ ] Improved init wizard

---

# 59. V0.7 Checklist

Goal:

```text
broader target support
```

- [ ] Gemini adapter
- [ ] OpenCode adapter
- [ ] Hermes adapter

---

# 60. V0.8 Checklist

Goal:

```text
ecosystem expansion
```

- [ ] Community catalog
- [ ] Trust metadata
- [ ] Source policies
- [ ] Security hardening

---

# 61. V0.9 Checklist

Goal:

```text
release candidate
```

- [ ] Performance review
- [ ] Migration framework
- [ ] Documentation review
- [ ] Adapter author DX
- [ ] Plugin author DX
- [ ] CLI compatibility review
- [ ] Security review

---

# 62. V1.0 Checklist

Before V1.0:

- [ ] Canonical manifest API stable
- [ ] Role API stable
- [ ] Preset API stable
- [ ] Resolver semantics stable
- [ ] Policy semantics stable
- [ ] Lockfile format stable
- [ ] Adapter API stable
- [ ] CLI core commands stable
- [ ] CLI JSON output versioned
- [ ] Claude adapter production-ready
- [ ] Codex adapter production-ready
- [ ] At least one additional adapter validated
- [ ] Migration strategy documented
- [ ] Security model documented
- [ ] Full test suite passing
- [ ] Documentation complete

---

# 63. Do Not Build Yet

Keep these deferred until core stability:

- [ ] Remote public marketplace
- [ ] Cloud sync
- [ ] Web application
- [ ] Desktop application
- [ ] AI package recommendation
- [ ] Automatic package selection
- [ ] Automatic remote execution
- [ ] Full-screen TUI
- [ ] Public registry
- [ ] Enterprise dashboard

Reason:

```text
core correctness
    >
feature breadth
```

---

# 64. Next 10 Tasks

Execute these next, in order:

1. [ ] Write `configuration-spec.md`
2. [ ] Write `overlay-spec.md`
3. [ ] Write `source-spec.md`
4. [ ] Write `update-spec.md`
5. [ ] Finalize repository package structure
6. [ ] Implement canonical identifiers
7. [ ] Implement canonical domain types
8. [ ] Implement manifest schemas
9. [ ] Implement manifest loader
10. [ ] Implement repository scanner

After these:

```text
validation
→ catalog
→ resolver
```

should become the primary engineering focus.

---

# 65. Immediate Critical Path

The current critical path is:

```text
configuration-spec
       ↓
canonical types
       ↓
schemas
       ↓
manifest loader
       ↓
repository scanner
       ↓
validation
       ↓
catalog
       ↓
resolver
       ↓
policy
       ↓
lockfile
       ↓
adapter SDK
       ↓
Claude adapter
       ↓
CLI MVP
```

Anything outside this path SHOULD generally remain secondary until the MVP works.

---

# 66. Definition of Done

For every implementation task, verify:

- [ ] Correct architecture layer
- [ ] Types defined
- [ ] Validation included
- [ ] Stable diagnostics
- [ ] Unit tests
- [ ] Integration tests where applicable
- [ ] Deterministic behavior
- [ ] Documentation updated
- [ ] No target-specific leakage into core
- [ ] No hidden network access
- [ ] No unsafe filesystem mutation

---

# 67. Project Rule

When uncertain what to implement next, prioritize work that strengthens:

```text
canonical correctness

→ deterministic resolution

→ reproducibility

→ portability

→ explainability

→ safe automation

→ ecosystem growth
```

Do not optimize for the number of supported plugins or runtimes before the architecture can support them cleanly.