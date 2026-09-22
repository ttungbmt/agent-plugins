# Architecture

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.

## Overview

This document defines the system architecture of `agent-plugins`.

The architecture is designed to support the core product model:

```text
Publisher
   ↓
Package
   ↓
Component
   ↓
Capability
   ↓
Preset
   ↓
Role + Project + Policy
   ↓
Resolver
   ↓
Lockfile
   ↓
Target Adapter
```

The system should remain:

- capability-oriented,
- deterministic,
- explainable,
- reproducible,
- publisher-independent,
- target-independent at the core,
- extensible without unnecessary framework complexity.

The central architectural principle is:

> **Keep semantic intent in the core, isolate ecosystem-specific behavior behind adapters, and make resolution deterministic before materialization begins.**

---

# 1. Architecture Goals

The architecture must enable:

```text
capability-first configuration

reusable presets and roles

publisher-independent user intent

deterministic resolution

policy-aware selection

conflict detection

full provenance

reproducible lockfiles

safe target materialization

multi-runtime extensibility
```

It must also avoid:

```text
publisher logic leaking into roles

runtime-specific concepts leaking into the domain

generated files becoming authoritative

CLI code becoming business logic

source discovery becoming resolution logic

package installation becoming capability semantics
```

---

# 2. Architectural Style

`agent-plugins` should use a modular architecture inspired by:

```text
Domain-Driven Design
+
Hexagonal / Ports and Adapters
+
Functional Core / Imperative Shell
+
Dependency Inversion
```

This does not require implementing these patterns formally or excessively.

The practical interpretation is:

```text
Domain Model
    ↓
Application / Resolution Logic
    ↓
Ports
    ↓
Adapters
```

External systems should depend on the core model.

The core model should not depend on external systems.

---

# 3. High-Level Architecture

```text
┌──────────────────────────────────────────┐
│                CLI / UX                  │
│                                          │
│ init sync list search explain diff doctor│
└─────────────────────┬────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────┐
│           Application Services           │
│                                          │
│ project loading                          │
│ validation                               │
│ orchestration                            │
│ resolution                               │
│ sync                                     │
│ update                                   │
└─────────────────────┬────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────┐
│               Core Domain                │
│                                          │
│ Publisher                                 │
│ Package                                  │
│ Component                                │
│ Capability                               │
│ Preset                                   │
│ Role                                  │
│ Policy                                   │
│ Project                                  │
│ Resolution                               │
│ Lockfile                                 │
└──────────────┬───────────────────────────┘
               │
        ┌──────┴────────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│Source Ports  │  │Target Ports  │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│Source        │  │Target        │
│Adapters      │  │Adapters      │
│              │  │              │
│GitHub        │  │Claude Code   │
│Marketplace   │  │Codex         │
│Superpowers   │  │Gemini        │
│ECC           │  │OpenCode      │
│Filesystem    │  │Hermes        │
└──────────────┘  └──────────────┘
```

---

# 4. Core Principle: Domain First

The core domain must not depend on:

```text
Claude Code
Codex
GitHub APIs
filesystem layout of an upstream publisher
oclif
Ink
specific YAML libraries
network APIs
```

The core should operate on normalized domain objects.

Example:

```text
CapabilityRequirement
CandidateImplementation
PolicyResult
ResolutionDecision
```

rather than runtime-specific objects such as:

```text
ClaudePluginEntry
GitHubRepositoryResponse
```

---

# 5. Major Architectural Layers

The architecture is divided into five major layers.

```text
1. Domain

2. Application

3. Source Integration

4. Target Integration

5. Presentation
```

Supporting infrastructure includes:

```text
schemas
serialization
filesystem
generated artifacts
testing
```

---

# 6. Domain Layer

The Domain Layer contains the semantic model and deterministic business rules.

Primary concepts:

```text
Publisher
Package
Component
Capability
Capability Implementation

Preset
Role
Policy
Project

Candidate
Resolution
Resolution Decision

Lockfile
Diagnostic
```

The Domain Layer should contain no direct filesystem or network calls.

---

# 7. Domain Services

Domain behavior that does not naturally belong to a single entity should be implemented through domain services.

Primary services include:

```text
Capability Resolver

Dependency Graph Builder

Policy Evaluator

Conflict Resolver

Compatibility Evaluator

Resolution Explainer

Lockfile Builder
```

These services should be deterministic for identical inputs.

---

# 8. Application Layer

The Application Layer orchestrates domain operations.

Typical responsibilities:

```text
load project

load catalog

load policies

validate inputs

construct resolution context

invoke resolver

build lockfile

invoke target adapter

calculate diff

apply sync

run update workflows
```

The Application Layer may use ports for filesystem, source adapters, and target adapters.

It should not contain core selection semantics that belong in the Domain Layer.

---

# 9. Presentation Layer

The primary V1 presentation layer is the CLI.

Recommended stack:

```text
TypeScript
oclif
Ink
```

The CLI should remain thin.

Conceptually:

```text
CLI Command
     ↓
Application Service
     ↓
Domain
```

Avoid:

```text
CLI Command
     ↓
complex resolution logic
```

---

# 10. CLI Responsibilities

The CLI may handle:

```text
argument parsing

interactive prompts

terminal rendering

user confirmation

exit codes

format selection
```

It should delegate:

```text
validation

resolution

policy evaluation

conflict handling

lockfile generation

sync planning
```

to reusable application/core services.

---

# 11. Source Integration Layer

The Source Integration Layer understands external publisher ecosystems.

Examples:

```text
Git repository

Claude marketplace

Agent Skills format

Superpowers structure

ECC structure

filesystem source
```

Its purpose is normalization.

Conceptually:

```text
External Source
      ↓
Source Adapter
      ↓
Normalized Package / Component Metadata
```

---

# 12. Source Adapter Boundary

A Source Adapter must answer:

```text
What packages exist?

What components exist?

What versions or refs exist?

Where does each component originate?

What metadata can be extracted?
```

It must not answer:

```text
Which capability should the project use?

Which candidate should win?

Which role needs this package?
```

Those are resolver and catalog concerns.

---

# 13. Source Adapter Interface

Conceptually:

```ts
interface SourceAdapter {
  discover(source: SourceDescriptor): Promise<DiscoveredSource>
}
```

The exact implementation may differ.

Normalized output should conceptually include:

```text
Publisher metadata

Packages

Components

Versions

Source refs

Integrity metadata

Raw compatibility metadata
```

---

# 14. Generic vs Publisher-Specific Source Adapters

Prefer generic adapters when possible.

Examples:

```text
github
filesystem
claude-marketplace
agent-skills
```

Publisher-specific adapters are appropriate when upstream structure is sufficiently unique.

Examples:

```text
superpowers
ecc
```

The system should not create one custom adapter per publisher without need.

---

# 15. Discovery Is Not Curation

Source adapters may discover hundreds of components.

That does not make those components part of the curated catalog.

Architecturally:

```text
Upstream
   ↓
Source Adapter
   ↓
Discovered Metadata
   ↓
Curation
   ↓
Canonical Catalog
```

These phases must remain separate.

---

# 16. Catalog Layer

The Catalog represents the curated universe available to the resolver.

Canonical content:

```text
Publishers

Packages

Capabilities

Capability implementation mappings
```

The Catalog may reference discovered Components without manually duplicating their full upstream metadata.

---

# 17. Catalog Responsibilities

The Catalog determines:

```text
which publishers are recognized

which packages are supported

which components are curated

which capabilities exist

which implementations map to capabilities

default implementation priorities

lifecycle metadata
```

It should not determine project-specific resolution.

---

# 18. Catalog Source of Truth

Recommended authoritative directories:

```text
catalog/
├── publishers/
├── packages/
└── capabilities/
```

These files are canonical.

Generated component indexes are derived.

---

# 19. Discovered Component Index

Upstream Components should preferably be discovered and normalized into a generated index.

Example:

```text
generated/catalog/components.json
```

This prevents manual duplication such as:

```text
catalog/components/
```

for every third-party upstream item.

The generated index can be recreated from:

```text
publisher source configuration
+
source adapters
+
distribution lock
```

---

# 20. Native Components

First-party implementations live under:

```text
plugins/native/
```

Example:

```text
plugins/native/
├── product-management/
├── second-brain/
└── gis/
```

Native components are authoritative source code rather than discovered third-party metadata.

They still participate in the same normalized Package / Component / Capability model.

---

# 21. Composition Layer

Composition is represented through:

```text
Presets
Roles
Projects
```

Dependency direction:

```text
Role
   ↓
Preset
   ↓
Capability
```

Projects may additionally compose presets and overrides.

---

# 22. Preset Storage

Canonical presets live under:

```text
presets/
```

Example:

```text
presets/
├── workflow/
├── engineering/
├── stacks/
├── domains/
├── knowledge/
└── tools/
```

Presets are authoritative declarative input.

---

# 23. Role Storage

Canonical roles live under:

```text
roles/
```

Example:

```text
roles/
├── frontend-engineer.yaml
├── backend-engineer.yaml
├── product-manager.yaml
└── second-brain.yaml
```

Roles should primarily reference Presets.

---

# 24. Policy Storage

Reusable policies live under:

```text
policies/
```

Examples:

```text
default.yaml
strict.yaml
personal.yaml
enterprise.yaml
```

Policies are resolved independently from Roles.

---

# 25. Project Manifest

Consumer repositories define desired state through:

```text
agent-plugins.yaml
```

Conceptually:

```yaml
apiVersion: agent-plugins.dev/v1alpha1

role: frontend-engineer

presets:
  - stacks/nextjs
  - stacks/cloudflare
  - engineering/security

policy: default

targets:
  - claude-code
```

The Project Manifest should remain concise.

---

# 26. Resolution Context Construction

Before resolution begins, the Application Layer builds a normalized Resolution Context.

Conceptually:

```text
Catalog

Distribution Lock

Project Manifest

Resolved Role

Resolved Presets

Policy

Target

Existing Project Lockfile

Overrides
```

No target materialization should occur before this context is validated.

---

# 27. Resolution Pipeline

The core resolution pipeline is:

```text
Load Project
     ↓
Validate Project
     ↓
Expand Role
     ↓
Expand Presets
     ↓
Collect Capability Requirements
     ↓
Deduplicate Requirements
     ↓
Expand Capability Dependencies
     ↓
Build Capability Graph
     ↓
Find Candidate Implementations
     ↓
Apply Hard Constraints
     ↓
Apply Policy
     ↓
Apply Target Compatibility
     ↓
Check Implementation Dependencies
     ↓
Resolve Conflicts
     ↓
Apply Overrides
     ↓
Apply Preferences / Priorities
     ↓
Apply Cardinality
     ↓
Select Components
     ↓
Deduplicate Packages
     ↓
Resolve Versions
     ↓
Produce Resolution
```

---

# 28. Resolution Must Be Pure Where Practical

The deterministic resolver should conceptually behave like:

```text
resolve(context) → resolution
```

It should not:

```text
download packages

modify filesystem

prompt user

write lockfiles

call an LLM
```

These side effects belong outside the core resolver.

---

# 29. Functional Core, Imperative Shell

A useful architecture principle is:

```text
Imperative Shell

load files
fetch metadata
read runtime state

        ↓

Functional Core

validate
build graph
resolve
compare

        ↓

Imperative Shell

write lockfile
materialize runtime
display output
```

This makes resolver behavior easier to test.

---

# 30. Requirement Expansion

Role and Preset expansion should happen before implementation selection.

Correct:

```text
Role
    ↓
Presets
    ↓
All Capability Requirements
    ↓
Deduplicate
    ↓
Resolve
```

Avoid:

```text
Resolve Preset A independently

Resolve Preset B independently

merge later
```

The latter could accidentally activate competing implementations.

---

# 31. Graph Model

The resolver operates over several logically separate graphs.

```text
Preset Graph

Capability Graph

Component Dependency Graph

Package Dependency Graph
```

These graphs must not be conflated.

---

# 32. Preset Graph

Represents composition:

```text
Preset A
→ Preset B
```

Used for:

```text
composition expansion
cycle detection
provenance
```

---

# 33. Capability Graph

Represents semantic dependencies:

```text
engineering.testing.e2e
→ tooling.browser
```

Used for:

```text
dependency expansion
cycle detection
resolution ordering
impact analysis
```

---

# 34. Component Dependency Graph

Represents implementation requirements.

Example:

```text
security-review-agent
→ security-rules
```

Used after candidate selection or during eligibility checking.

---

# 35. Package Dependency Graph

Represents installation dependencies between Packages.

This graph belongs to distribution/materialization logic rather than semantic Capability composition.

---

# 36. Policy Evaluation

Policy acts as an eligibility filter.

Conceptually:

```text
Candidates
    ↓
Policy Evaluator
    ↓
Allowed / Denied / Review
```

Priority should be applied only after hard policy restrictions.

---

# 37. Policy Architecture

The Policy Evaluator should consume normalized metadata.

Example:

```text
Candidate
├── publisher trust
├── ownership
├── component type
├── security metadata
└── source
```

and:

```text
Policy
```

to produce:

```text
PolicyDecision
```

Example:

```text
allow
deny
review
prompt
```

---

# 38. Policy Must Not Depend on CLI

The policy engine should not directly prompt the user.

Instead:

```text
Policy Evaluator
→ review required
```

The application/CLI layer decides how to handle that result.

This preserves non-interactive CI behavior.

---

# 39. Target Compatibility Evaluation

Target compatibility should occur before final selection.

Conceptually:

```text
Candidate
+
Target
     ↓
Compatibility Evaluator
     ↓
supported / partial / unsupported
```

Target compatibility metadata may come from:

```text
catalog metadata
source discovery
target adapter capabilities
```

---

# 40. Conflict Resolver

The Conflict Resolver handles:

```text
cardinality conflicts

explicit component conflicts

package conflicts where relevant

mutually exclusive implementations
```

It should produce structured Resolution Decisions.

---

# 41. Cardinality Resolution

For:

```text
cardinality: one
```

the resolver selects at most one eligible implementation.

For:

```text
cardinality: many
```

multiple eligible non-conflicting implementations may be selected.

---

# 42. Ambiguity

If multiple candidates remain equally valid and the architecture does not define a meaningful deterministic preference, resolution should fail explicitly.

Prefer:

```text
Ambiguous capability resolution
```

over:

```text
arbitrary implementation selection
```

---

# 43. Package Deduplication

Capability selection occurs at the Component level.

Installation occurs at the Package level.

Therefore the resolver should transform:

```text
Selected Components
       ↓
Required Packages
       ↓
Deduplicated Packages
```

Example:

```text
Component A ─┐
Component B ─┼→ Package X
Component C ─┘
```

Package X should be installed once.

---

# 44. Package Installation Does Not Equal Component Activation

A Package may contain Components not selected semantically.

Example:

```text
Package X

├── TDD
├── Debugging
└── Planning
```

Resolution may select:

```text
Debugging
Planning
```

while TDD is supplied by Package Y.

The architecture must preserve this distinction.

---

# 45. Version Resolution

Version resolution should occur after semantic selection identifies required Packages.

Conceptually:

```text
Selected Components
     ↓
Packages
     ↓
Version Constraints
     ↓
Distribution Lock
     ↓
Existing Project Lock
     ↓
Resolved Immutable Version
```

---

# 46. Existing Lock Stability

Normal synchronization should prefer preserving an existing valid lock.

`ap sync` should not automatically reconsider every upstream version.

Conceptually:

```text
valid locked state
+
unchanged desired state
=
preserve selection
```

Updates are a separate workflow.

---

# 47. Distribution Lock

The `agent-plugins` repository maintains a curated upstream baseline.

Conceptually:

```text
catalog.lock
```

It may pin:

```text
publisher
package
version
commit
integrity
```

This represents tested upstream state.

---

# 48. Project Lockfile

Consumer projects maintain:

```text
agent-plugins.lock
```

It records the actual project Resolution.

Conceptually:

```text
Capability
→ Implementation
→ Component
→ Package
→ Publisher
→ Version / Commit
```

---

# 49. Dual-Lock Model

The two lock layers serve different purposes.

```text
catalog.lock
      ↓
curated upstream baseline

Project Resolution
      ↓

agent-plugins.lock
      ↓
consumer reproducibility
```

The project lock should never be confused with the distribution lock.

---

# 50. Lockfile Builder

The Lockfile Builder receives a completed Resolution.

It should not independently make semantic selection decisions.

Correct:

```text
Resolution
    ↓
Lockfile Builder
```

Avoid:

```text
partial resolution
    ↓
Lockfile decides winner
```

---

# 51. Target Integration Layer

After Resolution is complete, the Target Integration Layer materializes it.

Architecture:

```text
Resolution
   ↓
Target Adapter
   ↓
Materialization Plan
   ↓
Diff
   ↓
Apply
```

---

# 52. Target Adapter Boundary

A Target Adapter should know:

```text
runtime-specific file formats

runtime-specific plugin structure

installation locations

supported component types

managed-state markers

native runtime features
```

It should not redefine:

```text
Capability meaning

Role semantics

Preset composition

publisher priority
```

---

# 53. Target Adapter Interface

Conceptually:

```ts
interface TargetAdapter {
  inspect(context): Promise<ActualState>

  plan(
    resolution,
    actualState
  ): Promise<MaterializationPlan>

  apply(
    plan
  ): Promise<MaterializationResult>
}
```

Exact APIs may differ.

Separating:

```text
inspect
plan
apply
```

allows safe diff and dry-run behavior.

---

# 54. Claude Code Target Adapter

Claude Code is the recommended first V1 target.

The adapter is responsible for translating Resolution into Claude-native concepts such as:

```text
plugins

skills

agents

commands

hooks

marketplace references

runtime configuration
```

The exact mapping belongs in `adapter-spec.md`.

---

# 55. Preserve Native Runtime Features

The architecture should not force all targets into a lowest-common-denominator format.

Example:

```text
Claude Code supports feature X
Codex supports feature Y
```

Each Target Adapter may expose native behavior where compatible with semantic intent.

Shared domain concepts should remain minimal.

---

# 56. Target Capabilities

Each Target Adapter may expose a capability descriptor.

Conceptually:

```text
supported component types

runtime constraints

feature flags

installation modes
```

This allows compatibility checking without embedding runtime-specific logic in the core.

---

# 57. Materialization Plan

Before mutating runtime state, the adapter should produce a Materialization Plan.

Example:

```text
Install:
+ package A

Enable:
+ component B

Update:
~ package C

Remove:
- managed package D

Preserve:
manual package E
```

This plan powers:

```text
ap diff

dry-run

sync confirmation

testing
```

---

# 58. Managed State Boundary

Target adapters must distinguish:

```text
agent-plugins-managed state
```

from:

```text
manual runtime state
```

Only managed state should be automatically reconciled.

The adapter may use:

```text
generated manifest

state metadata

lockfile markers

managed directories
```

to track ownership.

---

# 59. Sync Architecture

`ap sync` follows:

```text
Load Desired State
      ↓
Resolve
      ↓
Load Actual State
      ↓
Build Materialization Plan
      ↓
Display Diff
      ↓
Apply Plan
      ↓
Verify
      ↓
Write / Confirm Lock State
```

Exact lock-writing order must ensure failed materialization does not falsely record success.

---

# 60. Sync Transaction Principle

Where practical:

```text
resolve
→ plan
→ apply
→ verify
→ commit state
```

Avoid:

```text
write final lockfile
→ materialization fails
```

which could leave inconsistent state.

---

# 61. Idempotence

For unchanged input:

```text
sync(state)
→ state'

sync(state')
→ state'
```

The second sync should produce no meaningful change.

This should be tested at the adapter integration level.

---

# 62. Validation Architecture

Validation occurs at multiple levels.

```text
Schema Validation

Reference Validation

Graph Validation

Semantic Validation

Resolution Validation

Target Validation
```

These stages should remain distinguishable for better diagnostics.

---

# 63. Schema Validation

Checks structural correctness.

Examples:

```text
required fields

enum values

ID syntax

data types
```

Implemented primarily through:

```text
packages/schemas
```

---

# 64. Reference Validation

Checks:

```text
publisher exists

package exists

capability exists

preset exists

role exists

policy exists
```

---

# 65. Graph Validation

Checks:

```text
preset cycles

capability cycles

invalid dependency graph
```

---

# 66. Semantic Validation

Checks rules such as:

```text
publisher-specific capability IDs forbidden

invalid cardinality combinations

deprecated references

illegal override semantics
```

---

# 67. Resolution Validation

Checks whether required capabilities can actually be resolved under:

```text
catalog

policy

target

version constraints
```

---

# 68. Target Validation

Checks whether selected state can be materialized on a runtime.

Example:

```text
selected hook
+
target lacks hook support
=
error or degraded state
```

depending on requirement semantics.

---

# 69. Diagnostics Architecture

Diagnostics should be structured domain objects rather than plain strings.

Conceptually:

```text
code

severity

message

entity

source location

dependency path

details

remediation
```

This allows the CLI to render:

```text
human-readable output
JSON output
CI output
```

from the same diagnostics.

---

# 70. Explainability Architecture

Resolution decisions should be recorded during resolution rather than reconstructed heuristically afterward.

Conceptually:

```text
Resolution
├── selections
├── decisions
└── diagnostics
```

This enables:

```bash
ap explain engineering.testing.tdd
```

without reimplementing resolver reasoning.

---

# 71. Explainability Data Flow

```text
Capability Requirement
      ↓
Candidate Generation
      ↓
Policy Decisions
      ↓
Compatibility Decisions
      ↓
Conflict Decisions
      ↓
Selection Decision
      ↓
Resolution Trace
```

Each important stage contributes trace information.

---

# 72. Search Architecture

Search should operate primarily on generated indexes rather than repeatedly scanning all raw manifests.

Example:

```text
generated/catalog/search-index.json
```

The index may include:

```text
capabilities

aliases

presets

roles

publishers

packages

components
```

The canonical metadata remains authoritative.

---

# 73. Generated Artifacts

Recommended generated directory:

```text
generated/
├── catalog/
│   ├── components.json
│   └── search-index.json
└── targets/
    ├── claude-code/
    ├── codex/
    └── ...
```

Generated files must be fully regenerable.

---

# 74. Generated Marketplace Manifest

For Claude Code distribution:

```text
.claude-plugin/marketplace.json
```

should be treated as derived output if practical.

Its source should come from:

```text
catalog

native plugins

package metadata

distribution lock
```

rather than being manually maintained as an independent authority.

---

# 75. Source-of-Truth Hierarchy

The preferred hierarchy is:

```text
Authoritative Source
       ↓
Normalized / Generated Metadata
       ↓
Target-Specific Generated Artifacts
       ↓
Consumer Managed State
```

Example:

```text
catalog/publishers/
catalog/packages/
catalog/capabilities/
presets/
roles/
policies/
plugins/native/

        ↓

generated/

        ↓

.claude-plugin/marketplace.json

        ↓

agent-plugins.lock
runtime managed state
```

---

# 76. Repository Architecture

Recommended monorepo:

```text
agent-plugins/
├── apps/
│   └── cli/
│
├── packages/
│   ├── core/
│   ├── schemas/
│   ├── source-adapters/
│   └── target-adapters/
│
├── catalog/
│   ├── publishers/
│   ├── packages/
│   └── capabilities/
│
├── presets/
├── roles/
├── policies/
│
├── plugins/
│   └── native/
│
├── generated/
│
├── tests/
├── examples/
├── docs/
└── tools/
```

Detailed directory semantics belong in `repository-structure.md`.

---

# 77. Package Boundaries

V1 should keep internal package boundaries coarse.

Recommended:

```text
apps/cli

packages/core

packages/schemas

packages/source-adapters

packages/target-adapters
```

Avoid creating dozens of packages prematurely.

---

# 78. packages/core

`packages/core` owns:

```text
domain model

catalog interfaces

graph logic

resolver

policy evaluation

conflict resolution

lockfile domain logic

diagnostics

explainability
```

It should have minimal dependencies.

---

# 79. packages/schemas

`packages/schemas` owns:

```text
manifest schemas

runtime validators

schema versions

serialization contracts
```

Possible schemas:

```text
publisher.schema.json
package.schema.json
capability.schema.json
preset.schema.json
role.schema.json
policy.schema.json
project.schema.json
lockfile.schema.json
```

---

# 80. packages/source-adapters

Owns upstream integration.

Possible structure:

```text
source-adapters/
└── src/
    ├── github/
    ├── claude-marketplace/
    ├── agent-skills/
    ├── superpowers/
    ├── ecc/
    └── filesystem/
```

These adapters depend on core contracts.

Core must not depend on concrete adapters.

---

# 81. packages/target-adapters

Owns runtime integration.

Possible structure:

```text
target-adapters/
└── src/
    ├── claude-code/
    ├── codex/
    ├── gemini/
    ├── opencode/
    └── hermes/
```

Only Claude Code needs to be implemented in V1.

---

# 82. apps/cli

Owns:

```text
oclif commands

Ink rendering

interactive prompts

CLI error formatting

exit codes
```

It depends on application/core APIs.

The CLI must not become the only way to use the core.

---

# 83. Internal Dependency Direction

Recommended:

```text
schemas
   ↑

core
   ↑
   ├──────── source-adapters
   ├──────── target-adapters
   │
   └──────── application orchestration
                ↑
               CLI
```

More explicitly:

```text
CLI
→ Core/Application

Source Adapters
→ Core contracts

Target Adapters
→ Core contracts

Core
→ Schemas / minimal shared utilities
```

Never:

```text
Core
→ CLI

Core
→ Claude adapter

Core
→ GitHub adapter
```

---

# 84. Dependency Rule

Dependencies should point inward toward stable abstractions.

```text
runtime-specific
      ↓
application
      ↓
domain
```

The more central the module, the fewer external assumptions it should contain.

---

# 85. Serialization Boundary

Domain objects and YAML/JSON documents should not necessarily be the same type.

Recommended flow:

```text
Raw YAML
   ↓
Schema Validation
   ↓
DTO / Manifest
   ↓
Domain Normalization
   ↓
Domain Objects
```

This avoids coupling resolver logic directly to raw serialized structure.

---

# 86. Manifest Versioning

Manifests should include a version.

Recommended initial version:

```text
agent-plugins.dev/v1alpha1
```

The version belongs to serialization contracts rather than semantic domain identity.

---

# 87. Migration Architecture

Future schema changes may use:

```text
v1alpha1
→ v1beta1
→ v1
```

Migration should occur before domain normalization.

Conceptually:

```text
Old Manifest
    ↓
Migration
    ↓
Current Manifest DTO
    ↓
Domain Model
```

---

# 88. Update Architecture

Update is intentionally separate from sync.

```text
Sync
→ reconcile desired project state

Update
→ reconsider upstream state
```

This prevents accidental dependency churn.

---

# 89. Update Check Pipeline

Conceptually:

```text
Current Distribution Lock
       ↓
Source Adapters
       ↓
Available Upstream State
       ↓
Normalize
       ↓
Compare
       ↓
Impact Analysis
       ↓
Update Report
```

No mutation occurs during:

```text
ap update --check
```

---

# 90. Update Apply Pipeline

```text
Review Update
      ↓
Select New Upstream Ref
      ↓
Regenerate Discovery Metadata
      ↓
Validate Catalog
      ↓
Run Resolver Tests
      ↓
Run Adapter Tests
      ↓
Update Distribution Lock
      ↓
Regenerate Derived Artifacts
```

This is a maintainer operation.

---

# 91. Update Impact Analysis

Impact analysis should connect:

```text
Publisher Change
    ↓
Package Change
    ↓
Component Change
    ↓
Capability Mapping
    ↓
Preset Impact
    ↓
Role Impact
```

Generated reverse indexes can make this efficient.

---

# 92. Local-First Architecture

Core functionality should not require:

```text
hosted API

user account

central database

LLM service
```

The local repository and CLI should be sufficient for:

```text
validation

resolution

sync

explain

diff

doctor
```

subject to access to package sources when retrieval is needed.

---

# 93. No Database Requirement

V1 does not require a database.

Primary state may remain:

```text
YAML

JSON

lockfiles

generated indexes
```

A database may become useful later for:

```text
large registry search

hosted services

analytics
```

but must not shape V1 architecture.

---

# 94. No Runtime Service Requirement

The resolver should behave as a CLI/library operation.

No long-running daemon is required in V1.

---

# 95. No LLM in Core Resolution

The architecture must preserve:

```text
deterministic core
```

An LLM may later assist with:

```text
capability classification suggestions

catalog review

documentation

project recommendations
```

but its output should not be required to reproduce a Resolution.

---

# 96. AI-Assisted Future Architecture

Future AI assistance should sit outside the deterministic core.

Preferred:

```text
LLM Recommendation Layer
       ↓
Suggested Manifest Change
       ↓
User / Policy Approval
       ↓
Deterministic Resolver
```

Avoid:

```text
Resolver
→ ask LLM which package wins
```

---

# 97. Security Architecture

Security should be addressed through:

```text
provenance

trust metadata

policy filtering

security-sensitive component classification

integrity metadata

explicit update review
```

The project does not provide a complete execution sandbox.

---

# 98. Security Boundary

The highest-risk boundary occurs before materialization.

Conceptually:

```text
External Source
    ↓
Discovered Component
    ↓
Curated Metadata
    ↓
Policy Evaluation
    ↓
Selected Component
    ↓
Materialization
```

Executable third-party behavior should not bypass this path.

---

# 99. Integrity Architecture

Where possible:

```text
human version
    ↓
immutable reference
    ↓
integrity metadata
```

should be captured during locking.

Examples:

```text
release v6.4
→ commit abc123

archive
→ sha256 ...
```

---

# 100. Provenance Architecture

Provenance should flow through the full pipeline.

```text
Publisher
    ↓
Package
    ↓
Component
    ↓
Candidate
    ↓
Selected Implementation
    ↓
Lockfile
```

Materialization should never erase origin metadata from managed-state records where it is needed for diagnostics.

---

# 101. Error Handling Architecture

Errors should be categorized.

Recommended categories:

```text
configuration

validation

resolution

policy

compatibility

source

materialization

update

internal
```

CLI exit codes can later map to these categories.

---

# 102. Failure Principle

Prefer early failure at the highest semantic layer possible.

Example:

```text
unknown capability
```

should fail before:

```text
target adapter installation
```

This keeps errors understandable.

---

# 103. Partial Failure

For required state:

```text
fail explicitly
```

For optional state:

```text
emit warning / degraded result
```

Do not silently drop requested required capabilities.

---

# 104. Testing Architecture

Testing should mirror architectural boundaries.

```text
Schema Tests

Domain Unit Tests

Graph Tests

Resolver Tests

Policy Tests

Adapter Contract Tests

Golden Output Tests

Integration Tests

CLI E2E
```

---

# 105. Resolver Unit Tests

Resolver tests should be pure whenever possible.

Inputs:

```text
in-memory catalog

project

policy

target
```

Output:

```text
Resolution
```

No real filesystem or network should be required.

---

# 106. Golden Adapter Tests

Target adapters should use fixtures and golden snapshots.

Example:

```text
Resolution Fixture
      ↓
Claude Adapter
      ↓
Generated Files
      ↓
Golden Expected Output
```

This is especially important for runtime formats.

---

# 107. Source Adapter Tests

Source adapters should be tested against captured fixtures rather than requiring live upstream services for every test.

Live integration tests may run separately.

---

# 108. Integration Test

A key V1 integration test should cover:

```text
Project Manifest
      ↓
Catalog
      ↓
Resolution
      ↓
Lockfile
      ↓
Claude Adapter
      ↓
Materialized Fixture Environment
```

---

# 109. End-to-End Test

CLI E2E should validate:

```bash
ap init
ap sync
ap explain
ap diff
ap doctor
```

against a controlled fixture.

---

# 110. CI Architecture

CI should eventually run:

```text
lint

typecheck

unit tests

schema validation

catalog validation

graph validation

resolver tests

adapter tests

integration tests

generated artifact check

build
```

Generated artifact verification may use:

```text
generate
git diff --exit-code
```

---

# 111. Architectural Invariants

The system must preserve:

```text
1. Core capabilities are publisher-independent.

2. Core capabilities are target-independent.

3. Roles compose Presets.

4. Presets compose Capabilities.

5. Resolution occurs before materialization.

6. Policy eligibility occurs before priority selection.

7. Source discovery is separate from curation.

8. Curation is separate from project resolution.

9. Components are selected semantically.

10. Packages are installed physically.

11. Package installation does not imply all contained Components are active.

12. Existing valid lock state is preserved during normal sync.

13. Update and sync remain separate operations.

14. Source adapters normalize upstream formats.

15. Target adapters preserve runtime-native formats.

16. Generated artifacts are never authoritative.

17. CLI contains minimal business logic.

18. Resolver is deterministic.

19. Core resolution does not require an LLM.

20. Managed state is explicitly bounded.
```

---

# 112. V1 Architecture Scope

V1 should implement:

```text
Domain entities

Schema validation

Catalog loading

Preset/Role expansion

Dependency graphs

Policy evaluation

Capability resolver

Conflict resolution

Resolution decisions

Project lockfile

Distribution lock support

Source adapter abstraction

Claude Code target adapter

Materialization planning

CLI

Diagnostics

Testing
```

---

# 113. V1 Source Adapter Scope

V1 does not need to perfectly generalize every upstream ecosystem.

A practical initial set:

```text
filesystem

GitHub / Git source

Claude marketplace

Superpowers

ECC
```

Matt Pocock and other publishers may use generic adapters where possible.

---

# 114. V1 Target Scope

Required:

```text
Claude Code
```

Architecturally reserved:

```text
Codex
Gemini
OpenCode
Hermes
```

Do not implement empty complex abstraction layers purely for hypothetical targets.

The target port should remain minimal until a second real adapter validates it.

---

# 115. Architectural Evolution Rule

When introducing a new abstraction, ask:

```text
Does V1 already have two real implementations requiring this abstraction?
```

If no:

```text
prefer the simpler design
```

unless the domain model clearly requires the boundary.

---

# 116. Avoid Premature Framework Architecture

Do not introduce:

```text
microservices

event bus

CQRS

distributed cache

database repositories

plugin runtime kernel

service mesh
```

for V1.

The expected system is primarily:

```text
local CLI
+
library
+
declarative catalog
+
filesystem state
```

---

# 117. Architecture Decision Records

Important architectural decisions should be documented as ADRs.

Initial ADRs:

```text
0001-capability-based-resolution.md

0002-publisher-package-component.md

0003-composition-over-inheritance.md

0004-no-addon-entity.md

0005-source-target-adapters.md

0006-dual-lock-model.md
```

Additional likely ADRs:

```text
0007-deterministic-resolver.md

0008-generated-artifacts-not-source-of-truth.md

0009-claude-code-first-target.md
```

---

# 118. Example — Full Resolution Flow

```text
agent-plugins.yaml

role:
frontend-engineer

presets:
stacks/nextjs
engineering/security

policy:
default

target:
claude-code

        ↓

Project Loader

        ↓

Role Expansion

frontend-engineer
→ workflow/core
→ engineering/core
→ domains/frontend
→ stacks/typescript

        ↓

Preset Expansion

        ↓

Capability Requirements

workflow.planning
engineering.testing.tdd
engineering.debugging
frontend.design
security.review
...

        ↓

Capability Graph

        ↓

Candidate Generation

TDD:
Superpowers
Matt Pocock
ECC

        ↓

Policy Filter

        ↓

Target Compatibility

        ↓

Priority / Conflict Resolution

        ↓

Selected Components

        ↓

Package Deduplication

        ↓

Version Resolution

        ↓

Resolution

        ↓

agent-plugins.lock

        ↓

Claude Code Adapter

        ↓

Materialization Plan

        ↓

Sync

        ↓

Managed Claude Code State
```

---

# 119. Example — Explainability Flow

```bash
ap explain engineering.testing.tdd
```

Application:

```text
Load Project Lock / Resolution
        ↓
Find Capability
        ↓
Read Requirement Provenance
        ↓
Read Candidate Decisions
        ↓
Render Explanation
```

Possible output:

```text
Capability:
engineering.testing.tdd

Required by:
frontend-engineer
→ engineering/core

Candidates:
Superpowers
Matt Pocock
ECC

Selected:
Superpowers

Why:
allowed by policy
supported on Claude Code
priority 100
```

No separate resolver implementation should be required for explain.

---

# 120. Example — Update Flow

```text
catalog.lock
    ↓
Current Superpowers ref

Source Adapter
    ↓
New upstream ref

Diff
    ↓

Components changed

    ↓

Capability Impact

    ↓

Preset / Role Impact

    ↓

Maintainer Review

    ↓

Update catalog.lock

    ↓

Regenerate

    ↓

Test
```

Consumer projects remain unchanged until their own lockfiles are intentionally updated.

---

# 121. Architecture Summary

The architecture can be summarized as:

```text
External Ecosystems
        ↓
Source Adapters
        ↓
Normalized Metadata
        ↓
Curated Catalog
        ↓
Capabilities
        ↓
Presets / Roles / Project
        ↓
Policy-Aware Resolver
        ↓
Resolution
        ↓
Lockfile
        ↓
Target Adapter
        ↓
Materialization Plan
        ↓
Managed Runtime State
```

The system is deliberately split into:

```text
understand upstream
        ↓
model semantics
        ↓
compose intent
        ↓
resolve deterministically
        ↓
materialize natively
```

---

# 122. Architecture in One Sentence

> **`agent-plugins` is a local-first, capability-driven resolver built around a deterministic core, curated catalog, source adapters for normalizing external ecosystems, and target adapters for safely materializing reproducible agent environments into native runtimes.**