# Roadmap

**Status:** Active  
**Version:** 0.1.0  
**Last Updated:** 2026-09-21

---

# 1. Purpose

This document defines the implementation roadmap for the Agent Plugins project.

The roadmap translates the architecture and specifications into an incremental delivery sequence.

The project should evolve in the following direction:

```text
Canonical Model
      ↓
Validation
      ↓
Catalog
      ↓
Resolution
      ↓
Policy
      ↓
Lockfile
      ↓
Adapters
      ↓
CLI
      ↓
Source Integration
      ↓
Update System
      ↓
Ecosystem
```

The roadmap intentionally prioritizes correctness, determinism, and maintainability over rapid accumulation of integrations.

---

# 2. Product Direction

Agent Plugins should become a tool-neutral system for managing reusable AI-agent capabilities across projects and runtimes.

It should support:

```text
first-party content
+
vendor content
+
community content
+
project overlays
+
profiles
+
presets
+
policies
+
multiple runtime targets
```

while maintaining one canonical model.

Long-term:

```text
Skills
Agents
Prompts
Commands
Hooks
Tool configurations
Context/instructions
        │
        ▼
Canonical Capability Layer
        │
        ▼
Profiles / Presets / Policies
        │
        ▼
Resolver + Lockfile
        │
        ▼
Target Adapters
        │
        ├── Claude
        ├── Codex
        ├── Gemini
        ├── OpenCode
        ├── Hermes
        └── future runtimes
```

---

# 3. Roadmap Principles

Development MUST follow these principles.

## 3.1 Core before integrations

Do not build many runtime integrations before the canonical domain is stable.

## 3.2 Specification before implementation

Major subsystem behavior SHOULD be defined in a spec before implementation.

## 3.3 First-party first

First-party content is the initial proving ground.

Vendor and community ingestion come later.

## 3.4 Determinism before convenience

Prefer:

```text
resolve
plan
build
install
```

before implementing convenience commands such as:

```text
sync
auto-update
auto-discovery
```

## 3.5 Explicit over magical

Avoid implicit behavior involving:

- dependency resolution;
- network access;
- package updates;
- file deletion;
- target conversion.

## 3.6 Incremental capability

Each phase SHOULD leave the repository in a usable state.

---

# 4. Milestone Overview

Recommended milestone sequence:

```text
M0  Foundation
M1  Canonical Domain
M2  Catalog & Validation
M3  Resolver
M4  Policy & Lockfile
M5  Target Adapter Framework
M6  Claude Adapter
M7  CLI MVP
M8  Codex Adapter
M9  Vendor & Source Model
M10 Update Engine
M11 Profiles & Presets UX
M12 Multi-Target Production Readiness
M13 Community Ecosystem
M14 Advanced Tooling
```

---

# 5. Phase 0 — Foundation

## Goal

Establish the repository, engineering standards, documentation structure, and project boundaries.

## Deliverables

```text
README.md
AGENTS.md
CONTRIBUTING.md

docs/
├── problem.md
├── problem.vi.md
├── vision.md
├── goals.md
├── non-goals.md
├── requirements.md
└── ...
```

Repository tooling:

```text
TypeScript

package manager
workspace configuration

Biome
TypeScript strict mode

Vitest

Changesets or equivalent

CI
pre-commit / pre-push checks
```

Recommended workspace skeleton:

```text
packages/
├── core/
├── cli/
├── adapters/
└── schemas/

plugins/
profiles/
presets/

docs/
tests/
```

## Exit Criteria

- repository builds successfully;
- lint/typecheck/test pipeline exists;
- CI passes;
- architectural documentation structure exists;
- package boundaries are defined.

---

# 6. Phase 1 — Canonical Domain Model

## Goal

Implement the core domain vocabulary independently from any runtime.

Primary specifications:

```text
domain-model.md
terminology.md
capability-model.md
manifest-spec.md
```

## Core Entities

Implement types for:

```text
Package
Component
Capability
Publisher
Source

Skill
Agent
Prompt
Command
Hook

Preset
Profile

Policy

CanonicalReference
```

Example:

```ts
type CanonicalReference =
  | `plugin:${string}`
  | `skill:${string}`
  | `agent:${string}`
  | `prompt:${string}`
  | `command:${string}`
  | `hook:${string}`
```

## Deliverables

```text
packages/core/
├── domain/
├── identifiers/
├── capabilities/
└── errors/
```

Schemas:

```text
package manifest
component manifest
profile
preset
policy
```

## Exit Criteria

The core model MUST:

- contain no Claude-specific logic;
- contain no Codex-specific logic;
- contain no filesystem assumptions;
- use canonical IDs;
- support dependency declarations;
- support capability metadata.

---

# 7. Phase 2 — Schema, Catalog & Validation

## Goal

Create a valid, queryable canonical repository.

Primary specifications:

```text
catalog-spec.md
manifest-spec.md
repository-structure.md
source-of-truth.md
```

## Implement

### Schema validation

```text
manifest validator
profile validator
preset validator
policy validator
```

### Repository scanner

Discover:

```text
plugins/
skills/
agents/
prompts/
hooks/
profiles/
presets/
```

### Catalog builder

Conceptual output:

```ts
interface Catalog {
  packages: Map<PackageId, Package>
  components: Map<ComponentId, Component>
  profiles: Map<ProfileId, Profile>
  presets: Map<PresetId, Preset>
}
```

### Reference validation

Detect:

```text
duplicate IDs
missing dependencies
invalid references
invalid manifests
cyclic static structures
```

## CLI support

Initial internal/dev command MAY expose:

```bash
agent-plugins validate

agent-plugins catalog list

agent-plugins catalog show
```

## Exit Criteria

The repository can answer:

```text
What packages exist?

What components exist?

Where did they come from?

Are all references valid?
```

---

# 8. Phase 3 — Resolver

## Goal

Build the deterministic engine that turns project intent into an effective canonical graph.

Primary specification:

```text
resolution-spec.md
```

## Resolver Inputs

```text
catalog
profile
preset
project config
dependency constraints
overlays
```

## Resolver Output

```ts
interface ResolvedEnvironment {
  profile: ProfileId

  packages: ResolvedPackage[]
  components: ResolvedComponent[]

  edges: ResolutionEdge[]
  diagnostics: Diagnostic[]
}
```

## Resolution Features

V1:

```text
direct dependencies
transitive dependencies
preset composition
profile inheritance
deduplication
stable ordering
conflict detection
```

Later:

```text
optional dependencies
conditional capabilities
complex version constraints
```

## Explainability

Build provenance during resolution.

Example:

```text
frontend
└── preset:web-core
    └── plugin:typescript
        └── skill:typescript
```

## Exit Criteria

Given identical inputs:

```text
resolver(input) = deterministic graph
```

Resolution MUST NOT:

- render target files;
- fetch network resources;
- install anything.

---

# 9. Phase 4 — Policy Engine

## Goal

Apply organizational and project constraints after resolution.

Primary specification:

```text
policy-spec.md
```

## V1 Policy Capabilities

Support:

```text
allow package
deny package

allow component type
deny component type

source restrictions

capability restrictions

target restrictions
```

Example:

```yaml
deny:
  sources:
    - untrusted-community

  capabilities:
    - executable-hook
```

## Pipeline

```text
Resolved Graph
      ↓
Policy Evaluation
      ↓
Allowed Graph
```

## Exit Criteria

Policies MUST:

- produce structured diagnostics;
- never silently remove critical content;
- remain separate from resolver logic.

---

# 10. Phase 5 — Lockfile

## Goal

Make resolution reproducible.

Primary specification:

```text
lockfile-spec.md
```

Lockfile SHOULD capture:

```text
resolved package versions

source revisions

integrity hashes

dependency graph identity

adapter versions

schema versions
```

Conceptually:

```yaml
lockfileVersion: 1

packages:
  superpowers:
    version: 1.2.0

sources:
  vendor:
    revision: abc123

targets:
  claude:
    adapterVersion: 1.0.0
```

## Commands

```bash
agent-plugins lock show
agent-plugins lock verify
```

## Exit Criteria

A locked environment can be reproduced without selecting new versions.

---

# 11. Phase 6 — Adapter Framework

## Goal

Implement the adapter abstraction before implementing many targets.

Primary specification:

```text
adapter-spec.md
```

Create:

```text
packages/adapters/
├── source/
└── target/
```

Adapter SDK:

```text
packages/adapter-kit/
├── types.ts
├── diagnostics.ts
├── render-plan.ts
├── validation.ts
└── test-kit.ts
```

Core Target Adapter contract:

```ts
interface TargetAdapter {
  metadata(): AdapterMetadata

  capabilities(): TargetCapabilities

  validate(
    input: ResolvedEnvironment
  ): ValidationResult

  plan(
    input: ResolvedEnvironment
  ): RenderPlan

  render(
    plan: RenderPlan
  ): RenderedArtifact[]
}
```

## Deliverables

- adapter manifest;
- capability declaration;
- render plan;
- conformance tests;
- deterministic rendering helpers.

## Exit Criteria

A dummy/test adapter passes the shared adapter conformance suite.

---

# 12. Phase 7 — Claude Adapter

## Goal

Use Claude as the first production target to validate the architecture.

Reason:

Claude's ecosystem provides rich primitives:

```text
skills
agents
commands
hooks
project instructions
```

This makes it a useful stress test for the canonical model.

## Implement mappings

Example:

```text
skill
→ .claude/skills/<id>/SKILL.md

agent
→ .claude/agents/<id>.md

command
→ .claude/commands/<id>.md
```

Target-native metadata SHOULD be generated by the adapter.

## Tests

Golden fixtures:

```text
basic skill
multiple skills
agent
command
hook
full plugin
collision
unsupported metadata
```

## Exit Criteria

A canonical profile can render a complete valid Claude project configuration.

---

# 13. Phase 8 — CLI MVP

## Goal

Expose the stable application pipeline through the CLI.

Primary specification:

```text
cli-spec.md
```

Recommended technology:

```text
TypeScript
+
oclif
+
Ink
```

V1 commands:

```text
init

catalog list
catalog show

profile list
profile show

resolve

plan

build

install

diff

validate

doctor

lock verify

adapter list
adapter show

version
```

## Core flow

```bash
agent-plugins init

agent-plugins resolve

agent-plugins plan --target claude

agent-plugins install --target claude
```

## CLI architecture

```text
CLI
 ↓
Application services
 ↓
Core
```

NOT:

```text
CLI
 ↓
domain logic
 ↓
filesystem
```

## Exit Criteria

A user can initialize a project and install a first-party profile into Claude entirely through the CLI.

---

# 14. MVP Milestone

At this point, the first meaningful product is complete.

MVP scope:

```text
Canonical manifests

Catalog

Profiles

Presets

Resolver

Policy

Lockfile

Claude target adapter

CLI

First-party plugins
```

Supported flow:

```text
first-party package
      ↓
profile
      ↓
resolver
      ↓
policy
      ↓
lockfile
      ↓
Claude adapter
      ↓
install
```

Not required for MVP:

```text
GitHub marketplace
community package discovery
automatic remote updates
multiple target adapters
GUI
TUI explorer
remote registry
```

---

# 15. Phase 9 — Codex Adapter

## Goal

Validate that the canonical architecture is genuinely target-independent.

Adding Codex MUST NOT require changing:

```text
canonical package manifests
profiles
presets
resolver semantics
```

Only target representation SHOULD change.

## Expected work

```text
Codex capability mapping

project instructions mapping

skills mapping

agent mapping if supported

unsupported capability diagnostics
```

## Critical Architecture Test

This phase answers:

> Did we accidentally design a Claude abstraction instead of a canonical abstraction?

Any major canonical redesign required by Codex SHOULD trigger architectural review.

## Exit Criteria

The same Profile can generate:

```text
Claude output

and

Codex output
```

from one resolved graph.

---

# 16. Phase 10 — Multi-Target Build

## Goal

Build multiple target environments from one canonical resolution.

Example:

```bash
agent-plugins build \
  --profile frontend \
  --target claude \
  --target codex
```

Pipeline:

```text
Profile
   ↓
Resolver
   ↓
Resolved Graph
   ├── Claude Adapter
   └── Codex Adapter
```

The resolver MUST NOT run target-specific dependency resolution.

## Exit Criteria

Multi-target rendering works deterministically.

---

# 17. Phase 11 — Source Adapter Foundation

## Goal

Introduce external package ingestion.

Initial Source Adapters:

```text
local
git
```

Later:

```text
github
marketplace
community-registry
```

Primary architectural rule:

```text
External Source
      ↓
Source Adapter
      ↓
Canonical Package
```

## Implement

```text
fetch
normalize
verify
cache
provenance
```

External packages MUST become canonical objects before resolution.

## Exit Criteria

A package from a Git repository can be normalized and consumed by the normal resolver.

---

# 18. Phase 12 — Vendor Layer

## Goal

Support curated upstream packages without modifying vendor source directly.

Repository model:

```text
first-party/
vendor/
overlays/
```

Example:

```text
Vendor source
     ↓
Imported canonical content
     ↓
Overlay
     ↓
Effective package
```

Use cases:

```text
Superpowers

Matt Pocock skills

ECC

community agent repositories
```

The system SHOULD preserve:

```text
upstream provenance
local modifications
update compatibility
```

## Exit Criteria

Vendor content can be updated without destroying local customization.

---

# 19. Phase 13 — Overlay Engine

## Goal

Allow controlled local modifications to imported packages.

Overlay operations MAY support:

```text
add
replace
merge
remove
```

Example:

```text
vendor agent
   +
organization instructions
   +
personal additions
```

Overlay MUST be distinct from Target Adapter behavior.

```text
Overlay
    = semantic change

Adapter
    = representation change
```

## Exit Criteria

Upstream package updates can be applied while preserving local overlays.

---

# 20. Phase 14 — Update Engine

## Goal

Safely evolve external package versions and revisions.

Primary specification:

```text
update-spec.md
```

Commands:

```bash
agent-plugins update

agent-plugins update superpowers

agent-plugins update --dry-run
```

Update flow:

```text
locked revision
      ↓
discover candidate
      ↓
compatibility check
      ↓
resolve
      ↓
policy
      ↓
preview
      ↓
lockfile update
```

## Update MUST NOT

automatically:

```text
install target artifacts
execute package code
overwrite overlays
```

## Exit Criteria

External dependencies can be safely updated with a visible change plan.

---

# 21. Phase 15 — Profile System Maturity

## Goal

Make Profiles the primary user-facing configuration abstraction.

Initial profile examples:

```text
software-engineer

frontend
backend

product-manager

second-brain
```

Profile inheritance:

```text
engineering-base
├── frontend
├── backend
└── fullstack
```

Example:

```text
frontend
    extends engineering-base
    + web preset
    + frontend quality preset
```

## Exit Criteria

Normal users SHOULD rarely need to select individual skills manually.

---

# 22. Phase 16 — Preset Library

## Goal

Create reusable capability bundles.

Examples:

```text
mental-models

typescript

frontend-quality

backend-quality

testing

security

documentation

product-management

second-brain
```

Presets SHOULD be:

- composable;
- relatively small;
- capability-oriented;
- target-independent.

Avoid monolithic presets containing everything.

---

# 23. Phase 17 — First-Party Content Library

## Goal

Build a high-quality curated content layer.

Recommended structure:

```text
first-party/
├── mental-models/
├── engineering/
├── product/
├── knowledge/
├── research/
└── operations/
```

Potential capability groups:

```text
Mental Models

Software Engineering

Frontend Engineering

Backend Engineering

Architecture

Testing

Security

DevOps

Product Management

Research

Writing

Second Brain

Knowledge Management
```

First-party SHOULD prioritize quality over quantity.

---

# 24. Phase 18 — Capability Resolution Maturity

## Goal

Move from package-based composition toward capability-aware composition.

Example:

```yaml
requires:
  - capability: code-review

prefers:
  - capability: typescript-analysis
```

Resolver MAY eventually choose publishers.

Example:

```text
Capability:
  code-review

Publishers:
  first-party/reviewer
  vendor/ecc-reviewer
  community/reviewer
```

This feature SHOULD NOT be implemented until package resolution is stable.

---

# 25. Phase 19 — Publisher Selection

## Goal

Allow multiple implementations of the same capability.

Selection MAY depend on:

```text
Profile
Policy
Priority
Trust
Version
Compatibility
User override
```

Example:

```text
capability: typescript-best-practices

publisher:
  mattpocock
```

or:

```text
publisher:
  first-party
```

Publisher selection MUST remain deterministic.

---

# 26. Phase 20 — Gemini Adapter

Add:

```text
target/gemini
```

This phase further validates cross-runtime portability.

Success criteria:

The same canonical package SHOULD NOT require Gemini-specific changes.

---

# 27. Phase 21 — OpenCode Adapter

Add:

```text
target/opencode
```

Focus on:

```text
agent representation
commands
tool configuration
project instructions
```

---

# 28. Phase 22 — Hermes Adapter

Add:

```text
target/hermes
```

Potential capabilities:

```text
agents
skills
delegation
tool configuration
memory-related instructions
```

This adapter MAY have significantly different representation semantics.

That difference is expected and should remain isolated.

---

# 29. Phase 23 — Adapter Capability Matrix

## Goal

Provide users with transparent runtime compatibility.

Example:

| Capability | Claude | Codex | Gemini | OpenCode | Hermes |
|---|---|---|---|---|---|
| Skills | Native | Map | Map | Map | Native |
| Agents | Native | Map | Map | Native | Native |
| Commands | Native | Map | Map | Native | Map |
| Hooks | Native | Limited | Limited | Specific | Specific |

The authoritative source remains adapter metadata.

CLI may expose:

```bash
agent-plugins adapter capabilities claude
```

---

# 30. Phase 24 — Inspection & Debugging

Add commands such as:

```bash
agent-plugins inspect skill:typescript

agent-plugins graph

agent-plugins resolve --why skill:typescript
```

Users SHOULD be able to answer:

```text
Why is this installed?

Where did this come from?

Which Profile selected it?

Which Publisher supplied it?

Which target files were generated?

Which policy affected it?
```

Explainability is a core differentiator.

---

# 31. Phase 25 — Rich TUI

Once CLI primitives are stable, introduce richer terminal experiences.

Ink MAY provide:

```text
Profile browser

Catalog explorer

Dependency graph explorer

Install preview

Adapter compatibility viewer

Update review
```

Example:

```text
┌ Profiles ──────────┐
│ frontend           │
│ backend            │
│ second-brain       │
└────────────────────┘

┌ Capabilities ──────┐
│ ✓ TypeScript       │
│ ✓ Testing          │
│ ✓ Code Review      │
│ ! Hooks / Codex    │
└────────────────────┘
```

The TUI MUST call the same application services as CLI commands.

---

# 32. Phase 26 — Project Preset Wizard

Improve onboarding:

```bash
agent-plugins init
```

Example flow:

```text
What are you building?

> Software Engineering
  Product Management
  Second Brain
  Research

Role?

> Frontend
  Backend
  Fullstack

Targets?

✓ Claude
✓ Codex
```

Result:

```yaml
profile: frontend

targets:
  - claude
  - codex
```

The wizard maps user intent to canonical configuration.

It does not introduce unique domain semantics.

---

# 33. Phase 27 — Community Catalog

## Goal

Support discoverable community packages.

Possible model:

```text
community catalog
      ↓
metadata index
      ↓
source adapters
      ↓
canonical packages
```

Required before launch:

```text
provenance
integrity
trust metadata
license metadata
security review model
```

Do not launch community package execution before trust boundaries are mature.

---

# 34. Phase 28 — Trust & Security Model

Introduce source classifications:

```text
first-party

trusted-vendor

verified-community

community

local
```

Policy MAY enforce:

```yaml
sources:
  allow:
    - first-party
    - trusted-vendor
```

Other features:

```text
integrity hashes

signature verification

license inspection

executable-content warnings

malicious-path validation
```

---

# 35. Phase 29 — Remote Registry

A remote registry MAY eventually provide:

```text
package metadata

versions

capabilities

provenance

compatibility

integrity

documentation
```

The registry MUST NOT become required for local first-party usage.

Offline operation SHOULD remain possible.

---

# 36. Phase 30 — Package Publishing

Potential future commands:

```bash
agent-plugins package validate

agent-plugins package pack

agent-plugins package publish
```

Before supporting publish, define:

```text
package format

signing

versioning

ownership

namespace policy
```

---

# 37. Phase 31 — IDE Integration

Possible integrations:

```text
VS Code

Cursor

JetBrains
```

Potential features:

```text
profile selection

catalog browser

generated artifact inspection

resolution graph

update notifications

policy diagnostics
```

IDE integrations MUST reuse the Application API.

---

# 38. Phase 32 — MCP / Agent Interface

Expose the Agent Plugins platform to AI agents.

Potential operations:

```text
search catalog

inspect capability

resolve profile

show generated plan

validate configuration
```

Mutating actions SHOULD require stronger permission boundaries.

---

# 39. Phase 33 — Web / Desktop UI

Only after the Application API is mature.

Possible architecture:

```text
                 CLI
                  │
                 TUI
                  │
Application API ──┼── IDE
                  │
                 MCP
                  │
                 Web
                  │
               Desktop
```

This is why domain logic MUST never be embedded in the CLI.

---

# 40. Phase 34 — Enterprise Policy

Future enterprise capabilities MAY include:

```text
organization-wide allowlists

mandatory packages

forbidden sources

approved adapter versions

license policies

security policies

workspace defaults
```

Layering:

```text
organization
    ↓
workspace
    ↓
project
    ↓
user
```

Precedence MUST be explicitly specified.

---

# 41. Phase 35 — Workspace / Monorepo

Support:

```text
repo root
├── shared profile
├── frontend project
├── backend project
└── documentation project
```

Possible configuration:

```yaml
workspace:
  defaults:
    profile: engineering-base

projects:
  apps/web:
    profile: frontend

  apps/api:
    profile: backend
```

Resolution SHOULD support shared caching while preserving project isolation.

---

# 42. Phase 36 — Incremental Build

Optimize:

```text
changed package
     ↓
affected canonical components
     ↓
affected target artifacts
```

Instead of rebuilding everything.

This is primarily performance optimization and SHOULD not precede stable semantics.

---

# 43. Phase 37 — Migration Framework

As schemas evolve, support:

```bash
agent-plugins migrate
```

Potential migrations:

```text
manifest v1 → v2

lockfile v1 → v2

project config v1 → v2
```

Migration SHOULD:

```text
preview
backup where needed
apply deterministically
validate result
```

---

# 44. Phase 38 — Plugin Development Toolkit

Provide scaffolding:

```bash
agent-plugins create plugin

agent-plugins create skill

agent-plugins create agent

agent-plugins create preset
```

Generated files MUST follow canonical schemas.

Templates SHOULD remain minimal.

---

# 45. Phase 39 — Adapter Development Toolkit

Potential commands:

```bash
agent-plugins adapter test ./adapters/target/foo

agent-plugins adapter validate foo

agent-plugins adapter fixture foo
```

Provide shared:

```text
adapter SDK

conformance suite

golden fixtures

test utilities
```

---

# 46. Phase 40 — Ecosystem Maturity

At maturity, the platform may look like:

```text
                    Agent Plugins

                         │
         ┌───────────────┼──────────────┐
         │               │              │
    First Party       Vendor       Community
         │               │              │
         └───────────────┼──────────────┘
                         │
                  Canonical Catalog
                         │
                 Profiles / Presets
                         │
                     Policies
                         │
                     Resolver
                         │
                     Lockfile
                         │
                Target Adapter Layer
              ┌──────┬──────┬───────┐
              │      │      │       │
           Claude  Codex  Gemini  Hermes ...
```

---

# 47. Recommended Implementation Order

The practical order SHOULD be:

```text
01. Repository foundation

02. Terminology

03. Canonical types

04. Schema definitions

05. Manifest parser

06. Repository scanner

07. Validation engine

08. Catalog

09. Preset loader

10. Profile loader

11. Resolver

12. Resolution explainability

13. Policy engine

14. Lockfile

15. Adapter API

16. Adapter SDK

17. Claude adapter

18. Render plan

19. Filesystem planner

20. Filesystem apply layer

21. CLI foundations

22. validate command

23. catalog commands

24. profile commands

25. resolve command

26. plan command

27. build command

28. install command

29. diff command

30. doctor command

31. Codex adapter

32. Multi-target builds

33. Source adapter API

34. Git source adapter

35. Vendor model

36. Overlay engine

37. Update engine

38. Preset/profile UX

39. More target adapters

40. Community ecosystem
```

---

# 48. Recommended MVP Boundary

The strongest MVP boundary is:

```text
first-party canonical repository
+
profile/preset composition
+
deterministic resolver
+
policy
+
lockfile
+
Claude adapter
+
CLI
```

Everything before this is foundational.

Everything after this is ecosystem expansion.

The MVP should prove:

> One canonical configuration can reliably generate and manage a real agent runtime environment.

---

# 49. MVP User Story

A developer clones or installs Agent Plugins.

They run:

```bash
agent-plugins init
```

Choose:

```text
Profile:
  frontend

Target:
  Claude
```

Then:

```bash
agent-plugins resolve
```

They inspect:

```text
frontend

├── mental-models
├── superpowers
├── typescript
├── frontend-engineering
├── testing
└── code-review
```

Then:

```bash
agent-plugins plan
```

Finally:

```bash
agent-plugins install
```

The project receives the correct target-native files.

Later:

```bash
agent-plugins diff
```

returns:

```text
No changes.
```

This is the first complete product loop.

---

# 50. V0.1

Suggested scope:

```text
canonical model

schemas

catalog

validation

basic profile

basic preset

resolver

Claude adapter

basic CLI
```

Goal:

```text
first successful end-to-end build
```

---

# 51. V0.2

Add:

```text
lockfile

policy

resolution explanation

render plan

diff

safe install
```

Goal:

```text
reproducible and inspectable usage
```

---

# 52. V0.3

Add:

```text
Codex adapter

multi-target build

adapter capability inspection
```

Goal:

```text
prove target neutrality
```

---

# 53. V0.4

Add:

```text
Source Adapter API

Git source

vendor packages

provenance

integrity
```

Goal:

```text
consume external ecosystems safely
```

---

# 54. V0.5

Add:

```text
overlay system

update engine

vendor update workflows
```

Goal:

```text
maintain upstream-derived content
```

---

# 55. V0.6

Add:

```text
profile maturity

preset library

first-party capability library

publisher selection foundations
```

Goal:

```text
improve daily usability
```

---

# 56. V0.7

Add additional targets:

```text
Gemini
OpenCode
Hermes
```

Goal:

```text
broaden runtime coverage
```

---

# 57. V0.8

Add:

```text
community catalog

trust metadata

security policies

package discovery
```

Goal:

```text
safe ecosystem expansion
```

---

# 58. V0.9

Focus on:

```text
stability

migration

performance

documentation

plugin author DX

adapter author DX

CI integrations
```

Goal:

```text
release candidate
```

---

# 59. V1.0

V1.0 SHOULD represent a stable contract for:

```text
canonical manifests

profiles

presets

resolution

policies

lockfile

adapter API

CLI core commands
```

Minimum target support SHOULD include at least:

```text
Claude
Codex
```

and preferably one additional substantially different runtime.

V1.0 SHOULD prioritize API stability rather than feature count.

---

# 60. What Not to Build Too Early

Avoid early investment in:

```text
remote marketplace

public package registry

web application

desktop application

complex TUI

recommendation AI

automatic package selection

agent-generated configuration

remote execution

cloud synchronization
```

before the core contracts are stable.

These features multiply complexity without validating the foundation.

---

# 61. Architecture Checkpoints

After major phases, stop and test architecture assumptions.

## Checkpoint A — After Resolver

Question:

> Can the system express project composition without referencing target runtime concepts?

If not, revisit the domain model.

---

## Checkpoint B — After Claude Adapter

Question:

> Does the adapter only transform representation?

If canonical manifests contain Claude-specific structures, revisit boundaries.

---

## Checkpoint C — After Codex Adapter

Question:

> Can the same canonical graph target both Claude and Codex?

If not, investigate abstraction leakage.

---

## Checkpoint D — After Vendor Import

Question:

> Can upstream packages update without modifying first-party source?

If not, revisit source/overlay separation.

---

## Checkpoint E — Before Community Registry

Question:

> Are provenance, integrity, policy, and trust boundaries strong enough?

If not, delay community execution.

---

# 62. Documentation Roadmap

Specifications SHOULD be completed roughly in this order:

```text
problem.md

vision.md

goals.md

non-goals.md

requirements.md

use-cases.md

terminology.md

domain-model.md

capability-model.md

architecture.md

repository-structure.md

source-of-truth.md

manifest-spec.md

catalog-spec.md

resolution-spec.md

policy-spec.md

lockfile-spec.md

adapter-spec.md

update-spec.md

cli-spec.md

roadmap.md
```

Then implementation-focused documentation:

```text
configuration-spec.md

overlay-spec.md

source-spec.md

security-model.md

testing-strategy.md

error-model.md

versioning-spec.md

migration-spec.md

contributing.md
```

---

# 63. Immediate Next Documents

After `roadmap.md`, recommended next specifications are:

```text
1. configuration-spec.md

2. overlay-spec.md

3. source-spec.md

4. update-spec.md

5. error-model.md

6. security-model.md

7. testing-strategy.md

8. versioning-spec.md

9. migration-spec.md
```

Among these, the highest priority is:

```text
configuration-spec.md
```

because the CLI, Profiles, targets, sources, and policies all need a concrete project configuration contract.

---

# 64. Immediate Engineering Backlog

Once documentation is sufficient, begin with:

```text
Epic 1
Canonical schema

Epic 2
Manifest parser

Epic 3
Repository scanner

Epic 4
Catalog

Epic 5
Validation engine

Epic 6
Resolver

Epic 7
Policy

Epic 8
Lockfile

Epic 9
Adapter SDK

Epic 10
Claude adapter

Epic 11
CLI

Epic 12
End-to-end workflow
```

---

# 65. Suggested Milestone Dependencies

```text
Foundation
    ↓
Canonical Domain
    ↓
Schemas
    ↓
Catalog
    ↓
Resolver
    ↓
Policy
    ↓
Lockfile
    ↓
Adapter Framework
    ↓
Claude Adapter
    ↓
CLI MVP
    ↓
Codex Adapter
    ↓
Multi-target
    ↓
External Sources
    ↓
Vendor + Overlay
    ↓
Update Engine
    ↓
Community
```

Each downstream phase SHOULD assume the upstream contracts are sufficiently stable.

---

# 66. Definition of Done — Feature

A feature is complete only when it includes where applicable:

```text
implementation

types

schema

validation

tests

diagnostics

documentation

CLI/API exposure

migration impact review
```

A feature is not complete merely because its happy path works.

---

# 67. Definition of Done — Milestone

A milestone SHOULD satisfy:

```text
all required specs implemented

tests passing

no critical architecture violations

deterministic behavior confirmed

documentation updated

end-to-end fixture working
```

---

# 68. Quality Gates

Before merging core architecture work:

```text
typecheck

lint

unit tests

integration tests

schema tests

snapshot tests

determinism tests
```

Adapter changes additionally require:

```text
adapter conformance tests

golden output tests
```

---

# 69. Success Metrics

Early success SHOULD be measured by architecture quality rather than download counts.

Useful internal metrics:

```text
% deterministic builds

resolver test coverage

adapter conformance rate

number of target-specific fields in canonical model
    → target should approach zero

percentage of first-party packages portable across targets

average number of manual steps required for install/update

number of unexplained resolution decisions
    → target zero
```

---

# 70. North-Star Technical Property

The strongest architectural success test is:

```text
New target runtime added
        ↓
new Target Adapter
        ↓
existing canonical packages unchanged
```

Similarly:

```text
New external source added
        ↓
new Source Adapter
        ↓
resolver unchanged
```

And:

```text
New CLI/TUI/GUI added
        ↓
new client
        ↓
domain core unchanged
```

If these properties remain true, the architecture is scaling correctly.

---

# 71. Final Roadmap Summary

The project SHOULD evolve in four major eras.

## Era 1 — Foundation

```text
Domain
Schemas
Catalog
Resolver
Policy
Lockfile
```

Goal:

```text
correct canonical system
```

---

## Era 2 — Runtime Delivery

```text
Adapter framework
Claude
CLI
Codex
Multi-target
```

Goal:

```text
usable product
```

---

## Era 3 — Ecosystem Management

```text
Source adapters
Vendor
Overlay
Update
Profiles
Preset library
More runtimes
```

Goal:

```text
scalable personal/team capability platform
```

---

## Era 4 — Platform

```text
Community registry
Trust model
IDE
MCP
TUI
Web/Desktop
Enterprise policy
```

Goal:

```text
full agent capability management platform
```

The recommended priority remains:

```text
correctness
    >
portability
    >
reproducibility
    >
usability
    >
ecosystem size
```

A small, deterministic system with clean boundaries is more valuable initially than a large plugin catalog with unstable architecture.