# Source of Truth

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.

## Overview

This document defines the source-of-truth rules for `agent-plugins`.

The project contains several kinds of state:

```text
authoritative metadata
discovered metadata
generated metadata
locked state
consumer configuration
runtime state
documentation
```

These states must remain clearly separated.

The core rule is:

> **Every important piece of information should have exactly one authoritative owner.**

Other representations may reference, normalize, cache, derive, or materialize that information, but they must not silently become independent sources of truth.

---

# 1. Why Source-of-Truth Rules Matter

Without explicit ownership, the same information may appear in multiple locations.

Example:

```text
catalog/packages/superpowers.yaml

generated/catalog/components.json

.claude-plugin/marketplace.json

agent-plugins.lock
```

If all four files independently define:

```text
version
repository
components
capability mapping
```

they will eventually drift.

Typical problems include:

```text
duplicate metadata

conflicting versions

stale generated files

unclear update ownership

manual synchronization

unreproducible environments
```

The architecture must therefore distinguish between:

```text
what humans maintain

what adapters discover

what generators derive

what resolvers compute

what lockfiles freeze

what target adapters materialize
```

---

# 2. State Categories

`agent-plugins` uses six major state categories.

```text
1. Authoritative Source

2. Discovered State

3. Generated State

4. Resolution State

5. Consumer State

6. Runtime State
```

Documentation is treated separately because it may describe any of the above.

---

# 3. Authoritative Source

An **Authoritative Source** is the canonical location where maintainers intentionally define information.

If a conflict exists between an authoritative source and derived data:

```text
authoritative source wins
```

Examples:

```text
catalog/providers/
catalog/packages/
catalog/capabilities/

presets/
profiles/
policies/

plugins/native/
```

These locations contain project-owned decisions.

---

# 4. Authoritative Does Not Mean Upstream

An external repository may be authoritative for its own source code.

However, inside `agent-plugins`, the upstream repository is not authoritative for project-owned semantic decisions such as:

```text
capability mapping
default priority
curation status
trust classification
preset composition
profile composition
```

Example:

```text
Superpowers repository
→ authoritative for Superpowers source

agent-plugins catalog
→ authoritative for how Superpowers is modeled and curated
```

These responsibilities must remain distinct.

---

# 5. Canonical Provider Metadata

Source of truth:

```text
catalog/providers/
```

Example:

```text
catalog/providers/superpowers.yaml
```

This file owns project-maintained Provider metadata such as:

```text
canonical provider ID
display name
ownership classification
default trust classification
source configuration
discovery strategy
documentation links
```

It should not duplicate every discovered Component.

---

# 6. Canonical Package Metadata

Source of truth:

```text
catalog/packages/
```

Example:

```text
catalog/packages/superpowers.yaml
```

This owns curated Package-level metadata such as:

```text
canonical package ID
provider relationship
source location
supported discovery strategy
version constraints
curation metadata
target metadata when explicitly curated
```

Raw upstream inventories should not be manually copied here unless they are intentional Package metadata.

---

# 7. Canonical Capability Metadata

Source of truth:

```text
catalog/capabilities/
```

This is the canonical location for:

```text
Capability ID
description
cardinality
stability
dependencies
aliases
implementation mappings
default implementation priorities
```

Example:

```text
catalog/capabilities/engineering/testing/tdd.yaml
```

owns:

```text
engineering.testing.tdd
```

---

# 8. Capability Mapping Ownership

The mapping:

```text
Component
→ Capability
```

is a curated semantic decision.

Therefore its source of truth belongs to the curated capability catalog, not upstream discovery.

Example:

```text
Superpowers skill:
test-driven-development
```

may be discovered automatically.

But:

```text
test-driven-development
→ engineering.testing.tdd
```

is a project-maintained semantic mapping.

---

# 9. Canonical Preset Metadata

Source of truth:

```text
presets/
```

Presets own:

```text
Preset ID
included capabilities
included presets
preset metadata
```

Example:

```text
presets/engineering/core.yaml
```

A generated index may list its capabilities, but the Preset file remains authoritative.

---

# 10. Canonical Profile Metadata

Source of truth:

```text
profiles/
```

Profiles own:

```text
Profile ID
Preset composition
Profile metadata
```

Example:

```text
profiles/frontend-engineer.yaml
```

Generated profile indexes must not become independently editable definitions.

---

# 11. Canonical Policy Metadata

Source of truth:

```text
policies/
```

Policies own declarative rules for:

```text
trust
provider restrictions
security-sensitive components
review requirements
experimental components
preferences
```

Example:

```text
policies/strict.yaml
```

No runtime adapter should independently redefine these policy semantics.

---

# 12. Canonical Native Implementation Source

Source of truth:

```text
plugins/native/
```

Native plugin source code and native Component definitions belong here.

Example:

```text
plugins/native/second-brain/
```

This directory is authoritative for the actual first-party implementation.

Catalog metadata may reference it.

Generated target manifests may expose it.

Neither should duplicate ownership of its source code.

---

# 13. Source Adapter Code

Source of truth for upstream normalization behavior:

```text
packages/source-adapters/
```

Adapters define:

```text
how upstream formats are discovered
how upstream metadata is normalized
how Package/Component identity is extracted
```

Generated discovery output is not authoritative for adapter behavior.

---

# 14. Target Adapter Code

Source of truth for runtime-specific materialization logic:

```text
packages/target-adapters/
```

Target adapters define:

```text
how Resolution maps into runtime-native artifacts
how Actual State is inspected
how Managed State is identified
how changes are applied
```

Generated runtime files do not define adapter semantics.

---

# 15. Domain and Resolver Logic

Source of truth for domain behavior:

```text
packages/core/
```

Examples:

```text
Capability semantics
resolution ordering
policy evaluation
conflict behavior
lockfile construction
diagnostic rules
```

Documentation explains this behavior, but executable rules ultimately live in code once implemented.

If documentation and implementation diverge:

```text
the divergence is a bug
```

rather than a reason to maintain two competing definitions.

---

# 16. Schema Contracts

Source of truth for serialized manifest structure:

```text
packages/schemas/
```

Schemas define machine-valid structure for:

```text
Provider
Package
Capability
Preset
Profile
Policy
Project
Lockfile
```

Documentation should explain schemas but should not redefine incompatible field contracts.

---

# 17. Discovered State

**Discovered State** is information obtained from external sources.

Examples:

```text
upstream component inventories
upstream manifests
repository metadata
release metadata
component locations
```

Discovered state is not automatically trusted or curated.

Conceptually:

```text
Upstream
   ↓
Source Adapter
   ↓
Discovered State
```

---

# 18. Discovered State Is Not Canonical Curation

The following states must remain distinct:

```text
discovered
curated
selected
```

Example:

```text
Provider contains 300 Components

300 discovered

25 curated

8 selected for current project
```

A discovery result must never automatically redefine the curated catalog.

---

# 19. Generated Component Inventory

Recommended location:

```text
generated/catalog/components.json
```

This file may contain normalized third-party Component data discovered from upstream.

It is:

```text
generated
rebuildable
non-authoritative
```

It must not contain irreplaceable manual curation.

---

# 20. Generated Metadata

Generated metadata exists for performance, compatibility, discovery, or distribution convenience.

Examples:

```text
generated/catalog/components.json

generated/catalog/search-index.json

generated/catalog/reverse-index.json

generated/catalog/capability-index.json
```

These files are derived from authoritative sources and/or locked upstream data.

---

# 21. Generated State Rule

A generated artifact must satisfy:

```text
delete artifact
+
run generator
=
equivalent artifact
```

If deleting a generated artifact loses manually maintained information, the architecture is incorrect.

---

# 22. Generated Files Must Declare Their Generator

Every committed generated file should have a known generation path.

Conceptually:

```text
generated/catalog/components.json
← generate:catalog

.claude-plugin/marketplace.json
← generate:claude-marketplace
```

This relationship should be documented or encoded in repository tooling.

---

# 23. Generated Files Are Read-Only by Convention

Humans should generally not edit:

```text
generated/
```

directly.

Instead:

```text
edit authoritative source
↓
run generator
↓
review generated diff
```

This keeps the dependency direction clear.

---

# 24. Generated Marketplace Metadata

Example:

```text
.claude-plugin/marketplace.json
```

should preferably be derived from:

```text
catalog/providers/
catalog/packages/
plugins/native/
catalog.lock
```

The marketplace file exists because Claude Code needs a native format.

It should not become a second independent catalog.

---

# 25. Target-Specific Files Are Derived

Runtime-specific manifests should generally follow:

```text
Canonical Domain Metadata
        ↓
Target Adapter / Generator
        ↓
Runtime-Specific Artifact
```

Examples:

```text
Claude marketplace manifest

Codex configuration

Gemini configuration

future runtime metadata
```

The target format should not define the core model.

---

# 26. Distribution Lock

Recommended source:

```text
catalog.lock
```

This file is authoritative for the **selected tested upstream baseline** of the `agent-plugins` distribution.

It owns concrete pinned information such as:

```text
Provider/package version

commit SHA

content integrity

resolved upstream reference
```

It does not own semantic Capability definitions.

---

# 27. Distribution Lock Semantics

The relationship is:

```text
Catalog Metadata
        +
Maintainer Update Decision
        ↓
catalog.lock
```

The Distribution Lock answers:

> Which exact upstream state has this distribution intentionally selected and tested?

It does not answer:

> Which capabilities does a user need?

---

# 28. Catalog vs Distribution Lock

These must remain separate.

```text
catalog/packages/
```

answers:

```text
What Package is this?
Where does it come from?
How is it modeled?
```

`catalog.lock` answers:

```text
Which exact version/ref of this Package is currently curated?
```

This separation enables controlled updates.

---

# 29. Consumer Manifest

Source of truth for a consumer project's desired semantic state:

```text
agent-plugins.yaml
```

It owns project intent such as:

```text
profile
presets
policy
targets
overrides
```

This is the primary consumer-managed configuration.

---

# 30. Consumer Manifest Must Remain Intent-Oriented

The consumer manifest should not normally duplicate:

```text
provider repositories
component inventories
resolved package versions
generated target paths
```

Those belong elsewhere.

Preferred:

```yaml
profile: frontend-engineer

presets:
  - stacks/nextjs
  - engineering/security
```

Avoid large manually resolved plugin lists.

---

# 31. Project Lockfile

Source of truth for the concrete resolved state of a consumer project:

```text
agent-plugins.lock
```

The lockfile records the result of deterministic resolution.

It may own:

```text
selected implementations
resolved packages
resolved versions
immutable refs
integrity metadata
target-specific resolved state
```

---

# 32. Manifest vs Lockfile

These represent different truths.

```text
agent-plugins.yaml
→ desired semantic intent

agent-plugins.lock
→ resolved concrete state
```

The lockfile must not replace the manifest.

The manifest must not attempt to encode every locked implementation detail.

---

# 33. Desired State vs Resolved State

Conceptually:

```text
Desired State
agent-plugins.yaml

        ↓

Resolver

        ↓

Resolved State
agent-plugins.lock
```

This distinction is foundational.

---

# 34. Lockfile Is Generated but Authoritative for Reproduction

A lockfile is produced by the resolver, but once committed it becomes authoritative for reproducing that resolved project state.

This makes lockfiles different from ordinary generated indexes.

They are:

```text
derived
but intentionally persisted
and semantically authoritative for concrete reproduction
```

Therefore:

```text
generated index
≠
lockfile
```

---

# 35. Lockfiles Must Not Own User Intent

If a user wants to add:

```text
security.review
```

they should modify:

```text
agent-plugins.yaml
```

not directly edit:

```text
agent-plugins.lock
```

The lockfile is resolver-owned state.

---

# 36. Lockfile Editing Rule

Manual lockfile editing should be unsupported or strongly discouraged.

Preferred flow:

```text
edit manifest
↓
resolve
↓
write lockfile
```

or:

```text
request update
↓
resolve new state
↓
write lockfile
```

---

# 37. Resolution State

A Resolution is computed in memory from:

```text
Catalog

Distribution Lock

Project Manifest

Profile

Presets

Policy

Target

Existing Project Lock
```

The Resolution itself may not need a persistent standalone file.

Its durable representation is primarily:

```text
agent-plugins.lock
```

plus target materialization state.

---

# 38. Resolution Decisions

Resolution decisions should be generated by the resolver.

Examples:

```text
selected

suppressed

rejected

policy denied

target incompatible

priority winner
```

The canonical reason for a resolution decision is the resolver algorithm plus its normalized inputs.

Do not manually maintain independent decision files.

---

# 39. Explainability Data

Explainability should derive from:

```text
Resolution Decisions

Project Manifest

Catalog

Lockfile
```

rather than from manually authored explanation metadata.

Example:

```bash
ap explain engineering.testing.tdd
```

should inspect resolver-produced data.

---

# 40. Runtime State

Runtime state is the materialized state inside:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

It represents:

```text
what currently exists
```

not:

```text
what the project intends
```

Runtime state must therefore not become the primary source of truth.

---

# 41. Actual State

**Actual State** is discovered by a Target Adapter.

Example:

```text
installed package A

installed package B

manual package C
```

Actual State is observational.

It may contain unmanaged user configuration.

---

# 42. Managed State

Managed State is the subset of Actual State controlled by `agent-plugins`.

Example:

```text
Actual State

├── A ← agent-plugins managed
├── B ← agent-plugins managed
└── C ← manually managed
```

Managed State should be reconstructable from:

```text
Project Lockfile
+
Target Adapter conventions
```

where practical.

---

# 43. Runtime State Must Not Override Desired State

If runtime state differs from the manifest:

```text
Desired State
≠
Actual Managed State
```

the system should report drift.

It should not silently rewrite user intent to match runtime state.

---

# 44. Sync Direction

The normal reconciliation direction is:

```text
Desired State
      ↓
Resolution
      ↓
Materialization Plan
      ↓
Managed Runtime State
```

Not:

```text
Runtime State
      ↓
silently redefine Desired State
```

---

# 45. Importing Existing Runtime State

A future import/adopt command may intentionally create configuration from existing runtime state.

Example:

```text
ap import
```

If supported, this is an explicit conversion operation.

It must not blur normal source-of-truth direction.

---

# 46. Source-of-Truth Hierarchy

The core hierarchy is:

```text
Human-maintained Intent / Curation
        ↓
Authoritative Metadata
        ↓
Normalized Domain Model
        ↓
Resolver
        ↓
Lock State
        ↓
Target Adapter
        ↓
Managed Runtime State
```

External discovery enters before curation:

```text
External Source
      ↓
Discovery
      ↓
Review / Curation
      ↓
Authoritative Catalog Mapping
```

---

# 47. Full Data Flow

```text
                    External Provider
                           │
                           ▼
                    Source Adapter
                           │
                           ▼
                 Discovered Components
                           │
                           │
                  Maintainer Curation
                           │
                           ▼
┌────────────────────────────────────────────┐
│           Authoritative Metadata           │
│                                            │
│ catalog/                                   │
│ presets/                                   │
│ profiles/                                  │
│ policies/                                  │
│ plugins/native/                            │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
                 Validation
                      │
                      ▼
              Normalized Domain
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
       Generators            Resolver
            │                   │
            ▼                   ▼
      generated/        agent-plugins.lock
            │                   │
            ▼                   ▼
runtime distribution      Target Adapter
artifacts                   │
                            ▼
                     Managed Runtime State
```

---

# 48. Data Ownership Matrix

| Data | Source of Truth | Derived From |
|---|---|---|
| Provider identity | `catalog/providers/` | Maintainer curation |
| Package identity | `catalog/packages/` | Maintainer curation |
| Capability identity | `catalog/capabilities/` | Maintainer curation |
| Capability cardinality | `catalog/capabilities/` | Maintainer decision |
| Implementation mapping | `catalog/capabilities/` | Maintainer curation |
| Default implementation priority | `catalog/capabilities/` | Maintainer curation |
| Preset composition | `presets/` | Maintainer curation |
| Profile composition | `profiles/` | Maintainer curation |
| Policy rules | `policies/` | Maintainer curation |
| Native source code | `plugins/native/` | First-party implementation |
| Third-party Component inventory | Generated discovery state | Source adapter + upstream |
| Curated upstream version | `catalog.lock` | Maintainer update decision |
| Search indexes | `generated/` | Canonical metadata |
| Reverse indexes | `generated/` | Canonical metadata |
| Claude marketplace output | `.claude-plugin/marketplace.json` | Catalog/native/lock |
| Project intent | `agent-plugins.yaml` | Consumer |
| Project resolution | `agent-plugins.lock` | Resolver |
| Actual runtime state | Runtime | Target inspection |
| Managed runtime state | Runtime + lock metadata | Target adapter |
| Architecture rules | `docs/` + implementation | Maintainers/code |

---

# 49. Filesystem Classification

## Authoritative Domain Data

```text
catalog/
presets/
profiles/
policies/
plugins/native/
```

## Authoritative Implementation

```text
apps/
packages/
tools/
```

## Authoritative Documentation

```text
docs/
```

## Locked State

```text
catalog.lock
agent-plugins.lock
```

## Generated State

```text
generated/
.claude-plugin/marketplace.json
```

## Consumer Intent

```text
agent-plugins.yaml
```

## Runtime State

```text
target-specific managed files
```

---

# 50. Documentation Source of Truth

Documentation has its own hierarchy.

`docs/index.md` is authoritative for:

```text
documentation navigation
reading order
authoring order
```

Domain definitions belong primarily to:

```text
docs/01-domain/
```

Architecture decisions belong primarily to:

```text
docs/02-architecture/
```

Technical contracts belong primarily to:

```text
docs/03-specs/
```

---

# 51. Avoid Documentation Duplication

A concept should have one canonical deep explanation.

Example:

```text
Capability semantics
→ capability-model.md
```

Other documents may summarize it but should link back rather than redefine it differently.

Likewise:

```text
Resolver algorithm
→ resolution-spec.md

Lockfile format
→ lockfile-spec.md

Policy semantics
→ policy-spec.md
```

---

# 52. README Is Not the Architecture Source of Truth

Root:

```text
README.md
```

should provide:

```text
overview
quick start
basic concepts
links
```

It should not become the canonical source for detailed domain or architecture decisions.

---

# 53. ADR Source of Truth

An ADR records:

```text
why an important architectural decision was made
```

The current architecture documentation records:

```text
what the architecture is now
```

Therefore:

```text
ADR
→ historical decision context

architecture.md
→ current architectural model
```

If an ADR is superseded, the architecture documentation should reflect the current state.

---

# 54. Code vs Documentation

Once implementation exists:

```text
specification
and
implementation
```

must agree.

When they do not:

```text
do not silently treat implementation as new specification
```

Instead:

```text
determine intended behavior

update code or spec

record architectural change if necessary
```

---

# 55. Schema vs Example

Schemas are authoritative for machine-valid structure.

Examples are educational.

Therefore:

```text
example accepted by docs
but rejected by schema
```

is a documentation bug.

Examples must not independently redefine valid structure.

---

# 56. Catalog vs Generated Component Index

Example:

```text
catalog/capabilities/engineering/testing/tdd.yaml
```

may reference:

```text
superpowers/...#skill:test-driven-development
```

The existence and raw metadata of that Component may come from:

```text
generated/catalog/components.json
```

The semantic mapping remains authoritative in the Capability file.

Thus:

```text
Generated Component Index
→ what exists

Capability Catalog
→ what it means to agent-plugins
```

---

# 57. Upstream Version vs Distribution Lock

An upstream repository may release:

```text
v6.4
```

but `agent-plugins` may remain pinned to:

```text
v6.3
```

The current upstream latest version is not the distribution source of truth.

For normal resolution:

```text
catalog.lock
```

wins until an intentional update occurs.

---

# 58. Latest Is Observational, Not Authoritative

Source adapters may report:

```text
latest available version
```

This information is useful for:

```text
ap update --check
```

but must not automatically change:

```text
catalog.lock
```

or consumer project lockfiles.

---

# 59. Update Direction

A provider update should flow:

```text
Upstream Change
      ↓
Discovery
      ↓
Update Report
      ↓
Maintainer Review
      ↓
catalog.lock Update
      ↓
Generated Artifact Update
```

Not:

```text
Upstream Change
      ↓
automatic lock mutation
```

---

# 60. Project Update Direction

A consumer project update should flow:

```text
New curated distribution state
        ↓
Explicit project update
        ↓
Resolver
        ↓
New agent-plugins.lock
        ↓
Target materialization
```

Normal:

```text
ap sync
```

should preserve valid locked state.

---

# 61. Resolver Source of Truth

The Resolver operates on normalized inputs.

It should not inspect random generated target files to infer semantic intent.

Canonical resolver inputs are:

```text
Catalog
Distribution Lock
Project Manifest
Profile
Presets
Policy
Target descriptor
Existing Project Lock
Overrides
```

---

# 62. Resolver Output Ownership

The Resolver owns:

```text
Selected Implementations

Suppressed Implementations

Rejected Implementations

Resolution Decisions

Resolution Diagnostics
```

Target adapters consume those results.

They must not independently choose alternative providers.

---

# 63. Target Adapter Source-of-Truth Rule

A Target Adapter may decide:

```text
how
```

to represent selected state.

It may not decide:

```text
what semantic implementation wins
```

Example:

```text
Resolver:
TDD → Superpowers
```

The Claude Code adapter must not substitute ECC TDD simply because it is easier to render.

---

# 64. Source Adapter Source-of-Truth Rule

A Source Adapter may determine:

```text
what exists upstream
```

It may not determine:

```text
what semantic capability that Component should own
```

That mapping is curated.

---

# 65. Provider Metadata Precedence

When normalized upstream metadata and curated Provider metadata overlap:

```text
curated metadata
```

should generally win for project-owned semantic fields.

Example:

```text
display name
trust classification
curation status
```

Raw upstream metadata remains useful as observed source data.

---

# 66. Package Metadata Precedence

A Package may have:

```text
upstream metadata
+
curated metadata
```

These should be merged using explicit precedence rules.

Conceptually:

```text
immutable upstream facts
+
curated annotations
=
normalized package
```

Example:

```text
upstream repository URL
→ discovered fact

trust level
→ curated annotation
```

Do not let curated metadata rewrite immutable source facts without an explicit override model.

---

# 67. Trust Source of Truth

Default project-maintained trust metadata belongs to:

```text
catalog
and/or
policy
```

depending on semantics.

For example:

```text
Provider baseline classification
→ catalog/providers/

Allowed trust levels
→ policies/
```

The runtime adapter must not invent trust values.

---

# 68. Ownership Source of Truth

Ownership classification belongs to canonical metadata.

Examples:

```text
agent-plugins
→ first-party

Superpowers
→ third-party
```

Ownership should not be inferred from installation location.

A third-party Package cached locally remains third-party.

---

# 69. Native Source of Truth

A native Component is defined by:

```text
actual repository source
+
canonical metadata
```

Its generated Claude plugin representation is not authoritative.

Example:

```text
plugins/native/product-management/
```

wins over:

```text
generated/targets/claude-code/...
```

---

# 70. Dependency Source of Truth

Different dependency types have different owners.

```text
Preset → Preset
→ preset manifest

Preset → Capability
→ preset manifest

Capability → Capability
→ capability manifest

Component → Component
→ normalized component/package metadata

Package → Package
→ package/source metadata
```

Do not collapse all dependency relationships into one generated dependency file.

---

# 71. Conflict Source of Truth

Implicit conflicts:

```text
Capability cardinality
```

source:

```text
catalog/capabilities/
```

Explicit Component conflicts:

```text
Component metadata
or curated Package/Component annotations
```

Project-specific implementation selection:

```text
Project override
```

These should remain separate concepts.

---

# 72. Priority Source of Truth

Default implementation priority belongs to:

```text
Capability implementation mapping
```

Project-specific preference belongs to:

```text
Project override
```

Policy-level provider preference belongs to:

```text
Policy
```

The effective resolver priority is computed from these sources.

It is not itself manually stored as another authoritative file.

---

# 73. Effective Configuration Is Derived

There should be no manually maintained file representing:

```text
fully expanded final project configuration
```

as another source of truth.

Effective configuration should be computed from:

```text
Project
+
Profile
+
Presets
+
Policy
+
Catalog
```

This avoids configuration drift.

---

# 74. Normalized Domain State Is Derived

Raw manifests are authoritative serialized input.

Normalized domain objects are runtime representations.

Conceptually:

```text
YAML
↓
Schema Validation
↓
Normalization
↓
Domain Object
```

Normalized objects need not be persisted as independent editable files.

---

# 75. Cache Is Never Authoritative

Future caches may store:

```text
downloaded metadata
parsed manifests
search indexes
remote responses
```

All caches must be safely disposable.

Conceptually:

```text
rm -rf cache
```

must not destroy user intent or curated metadata.

---

# 76. Downloaded Package Cache

If Package sources are cached locally:

```text
cache/
```

the cache is not the Package source of truth.

The lockfile plus upstream immutable reference determines what should be retrieved.

---

# 77. Local Machine State

Local machine state such as:

```text
cache
temporary files
credentials
runtime installation paths
```

must not influence semantic resolution unless explicitly represented as input.

This preserves reproducibility.

---

# 78. Environment Variables

Environment variables may supply:

```text
credentials
network configuration
target paths
```

but should not silently alter semantic capability selection.

If an environment variable affects resolution semantics, it should be treated as an explicit Resolution Context input and documented.

Prefer avoiding such behavior in V1.

---

# 79. Hidden Global Configuration

Project resolution must not depend on undocumented global state.

If future user-level configuration exists:

```text
global profile defaults
preferred policy
```

it should be explicit and observable.

A committed project lockfile should remain sufficient for reproduction where possible.

---

# 80. Consumer Overrides

Project overrides belong in:

```text
agent-plugins.yaml
```

They should not be hidden inside runtime-specific generated files.

Example:

```yaml
overrides:
  implementations:
    engineering.testing.tdd:
      component: mattpocock/skills#skill:tdd
```

---

# 81. No Manual Runtime Override as Canonical Intent

If a user manually modifies generated runtime files:

```text
.claude/...
```

those edits should not silently become Project intent.

Possible outcomes:

```text
preserve unmanaged change

report managed drift

require explicit adoption
```

depending on ownership.

---

# 82. Drift Detection

Drift may exist between:

```text
authoritative source
and
generated state
```

or:

```text
desired state
and
managed runtime state
```

Examples:

```text
catalog changed
but search index stale

manifest changed
but lockfile stale

lockfile unchanged
but managed runtime files modified
```

These should be detectable.

---

# 83. Generated Drift

Detection:

```text
generate
↓
compare
↓
difference
```

If generated output differs from committed output:

```text
generated state is stale
```

CI should fail where appropriate.

---

# 84. Manifest-Lock Drift

If:

```text
agent-plugins.yaml
```

changes without compatible lock update:

```text
agent-plugins.lock
```

becomes stale.

Commands such as:

```text
ap diff
ap doctor
ap sync
```

should detect this.

---

# 85. Runtime Drift

If managed runtime state differs from locked/materialized expectation:

```text
runtime drift
```

should be reported.

The adapter may reconcile it during:

```text
ap sync
```

---

# 86. Manual State Preservation

Unmanaged runtime state should remain untouched by default.

Example:

```text
manual plugin C
```

should not be removed simply because it does not appear in:

```text
agent-plugins.lock
```

Ownership must be explicit.

---

# 87. Precedence Rules

When multiple representations exist, use this conceptual precedence.

For semantic intent:

```text
Project explicit override
        ↓
Project Presets
        ↓
Profile Presets
```

For implementation eligibility:

```text
Hard Constraints
        ↓
Policy
        ↓
Target Compatibility
```

For implementation preference:

```text
Explicit Project Override
        ↓
Existing Valid Lock
        ↓
Policy Preference
        ↓
Catalog Priority
```

Exact resolver semantics belong in `resolution-spec.md`.

---

# 88. Source Precedence Is Not File Precedence

Avoid thinking:

```text
file A always overrides file B
```

globally.

Precedence belongs to specific semantic fields and resolution stages.

For example:

```text
Policy cannot redefine Capability ID.

Project override cannot rewrite Provider provenance.

Target adapter cannot override selected implementation.
```

Boundaries are semantic, not merely filesystem-based.

---

# 89. Authoritative Metadata Mutation

Authoritative metadata changes only through intentional maintenance.

Examples:

```text
edit capability mapping

add Provider

change Preset composition

change Policy

add native implementation
```

Automated discovery should not directly commit semantic changes without review.

---

# 90. Generated Artifact Mutation

Generated artifacts change through generators.

Correct:

```text
canonical change
↓
generator
↓
generated diff
```

Avoid:

```text
manual generated edit
↓
later overwritten
```

---

# 91. Lockfile Mutation

Lockfiles change through:

```text
resolution
explicit update
sync requiring resolution change
```

not through manual curation.

---

# 92. Runtime Mutation

Managed runtime state changes through:

```text
Target Adapter
```

after a materialization plan is produced.

Core domain code should not directly mutate runtime files.

---

# 93. Source-of-Truth by Operation

## Add Provider

Modify:

```text
catalog/providers/
catalog/packages/
```

Potentially:

```text
source adapter configuration
```

Then regenerate discovery data.

---

## Add Capability

Modify:

```text
catalog/capabilities/
```

Then validate and regenerate indexes.

---

## Add Preset

Modify:

```text
presets/
```

Then validate composition.

---

## Add Profile

Modify:

```text
profiles/
```

---

## Change Policy

Modify:

```text
policies/
```

---

## Add Native Plugin

Modify:

```text
plugins/native/
```

and corresponding canonical Package/Capability mappings.

---

## Update Provider Version

Do not rewrite semantic catalog identity.

Update:

```text
catalog.lock
```

after review.

---

## Change Consumer Needs

Modify:

```text
agent-plugins.yaml
```

Then resolve and update:

```text
agent-plugins.lock
```

---

# 94. What Must Never Be Source of Truth

The following should never independently own canonical semantic data:

```text
generated/

search indexes

runtime-generated manifests

Claude marketplace output

cache directories

CLI output

temporary update reports

terminal selections

uncommitted actual runtime state
```

---

# 95. Generated Documentation

If future reference documentation is generated from schemas/catalog metadata, the generated documentation is not authoritative for the underlying data.

Example:

```text
Generated Capability Reference
```

should come from:

```text
catalog/capabilities/
```

Humans should modify the Capability source, then regenerate documentation.

---

# 96. Duplicate Data Rule

Duplication is acceptable when:

```text
one copy is authoritative

other copies are generated or locked representations

generation path is explicit
```

Duplication is problematic when:

```text
multiple copies are manually editable
```

and no clear owner exists.

---

# 97. Denormalization Rule

Generated data may intentionally denormalize canonical data for:

```text
performance
search
runtime compatibility
human convenience
```

Example:

```text
search-index.json
```

may repeat:

```text
Capability ID
Preset names
Provider names
```

This duplication is acceptable because it is derived.

---

# 98. Provenance Source of Truth

Upstream provenance is composed from:

```text
canonical Provider/Package identity
+
discovered upstream facts
+
distribution lock
```

The lockfile persists concrete provenance needed for reproduction.

No single generated index should independently redefine provenance.

---

# 99. Integrity Source of Truth

When integrity metadata is available:

```text
checksum
commit SHA
signature
```

the selected immutable value belongs in lock state.

Discovery may observe integrity.

The lock records the concrete accepted integrity for reproduction.

---

# 100. Security Metadata Ownership

Security metadata may originate from:

```text
discovery

curation

policy
```

These serve different roles.

Example:

```text
Component type = hook
→ discovered fact

Risk annotation = executable
→ normalized/curated metadata

External hooks denied
→ Policy
```

Do not collapse these into one boolean such as:

```text
safe: true
```

---

# 101. Trust vs Provenance

Provenance answers:

```text
Where did this come from?
```

Trust answers:

```text
How is this source treated?
```

Provenance should be factual.

Trust is contextual and policy-sensitive.

Neither should overwrite the other.

---

# 102. Source-of-Truth Validation

Repository validation should verify:

```text
no duplicate canonical IDs

all references resolve

all generated files are reproducible

generated files are not required as unique input

lockfiles conform to schemas

Capability mappings reference valid Components

Preset/Profile references are valid
```

---

# 103. CI Enforcement

CI should eventually include:

```text
validate schemas

validate catalog

validate graph

generate derived artifacts

git diff --exit-code
```

This ensures:

```text
canonical source
=
committed derived state
```

---

# 104. Source-of-Truth Review Checklist

When adding a new file or field, ask:

```text
1. Is this authoritative or derived?

2. Who owns it?

3. Can it be generated?

4. Is this information already authoritative somewhere else?

5. What happens if the two copies disagree?

6. Can this file be safely deleted and recreated?

7. Does this represent intent, curation, resolution, or runtime state?

8. Should a human edit it directly?

9. Should it be committed?

10. Which process updates it?
```

If these questions have no clear answer, the data ownership is not yet well designed.

---

# 105. Decision Table

| Question | Canonical Location |
|---|---|
| Who is this provider? | `catalog/providers/` |
| What package exists? | `catalog/packages/` |
| What does this capability mean? | `catalog/capabilities/` |
| Which component implements it? | `catalog/capabilities/` mapping |
| What components exist upstream? | discovered/generated component inventory |
| Which upstream version is curated? | `catalog.lock` |
| Which capabilities belong together? | `presets/` |
| What does this role use? | `profiles/` |
| What is allowed? | `policies/` |
| Where is first-party source? | `plugins/native/` |
| What does this project want? | `agent-plugins.yaml` |
| What exactly was resolved? | `agent-plugins.lock` |
| What exists in runtime now? | target Actual State |
| What does `agent-plugins` own in runtime? | Managed State metadata |
| What should Claude receive? | target adapter output |
| What is searchable efficiently? | generated search index |
| Why was implementation X selected? | Resolution decisions |

---

# 106. Source-of-Truth Invariants

The project must preserve the following invariants:

```text
1. Each semantic fact has one authoritative owner.

2. Generated files never contain unique irreplaceable information.

3. Discovery does not automatically become curation.

4. Curation does not automatically become project selection.

5. Project intent lives in the Project Manifest.

6. Concrete project resolution lives in the Project Lockfile.

7. Distribution version selection lives in the Distribution Lock.

8. Capability semantics live in the Capability Catalog.

9. Provider/package source identity remains separate from capability meaning.

10. Target-specific artifacts are derived from resolved state.

11. Runtime state does not silently redefine project intent.

12. Managed runtime state is distinct from unmanaged runtime state.

13. Lockfiles are resolver-owned and should not be hand-maintained.

14. Source adapters observe upstream; they do not decide semantic mappings.

15. Target adapters materialize decisions; they do not make semantic selections.

16. CLI output is never a source of truth.

17. Caches are disposable.

18. Generated indexes are disposable.

19. Upstream latest versions never automatically replace locked versions.

20. Documentation should point to canonical definitions rather than create competing ones.
```

---

# 107. Minimal Source-of-Truth Model

The essential model can be reduced to:

```text
Curated Intent
│
├── catalog/
├── presets/
├── profiles/
├── policies/
└── plugins/native/
        │
        ▼
     Resolver
        │
        ▼
   Project Lock
        │
        ▼
  Target Adapter
        │
        ▼
 Managed Runtime
```

External providers enter through:

```text
Upstream
   ↓
Discovery
   ↓
Curation
```

---

# 108. Source-of-Truth in One Sentence

> **`agent-plugins` keeps human-maintained intent and curation authoritative, treats discovery and generated artifacts as derived data, uses lockfiles to freeze concrete resolution, and treats runtime state as materialized output rather than semantic truth.**