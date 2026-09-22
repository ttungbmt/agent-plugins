# Terminology

## Overview

This document defines the canonical terminology used throughout `agent-plugins`.

Its purpose is to ensure that:

- product documents,
- architecture,
- manifests,
- resolver logic,
- CLI output,
- tests,
- contributor discussions

use the same vocabulary consistently.

For detailed semantics and relationships, see `domain-model.md`.

---

# 1. Core Mental Model

The canonical model is:

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
Profile + Project + Policy
   ↓
Resolution
   ↓
Lockfile
   ↓
Target Adapter
```

Short form:

```text
Publisher
  ↓
Capability
  ↓
Composition
  ↓
Resolution
  ↓
Distribution
```

---

# 2. Publisher

A **Publisher** is the upstream project, owner, or first-party party that publishes one or more Packages.

Examples:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

Use Publisher when answering:

> Who publishes this tooling?

A Publisher carries identity and trust only. It does not carry fetch
coordinates: one Publisher may ship from several repositories, so the
repository, ref, and access mechanism live on `Package.spec.source`.

Do not use Publisher to mean a runtime target, a repository, or an access
mechanism.

**The term "provider" is not used in this project.** It was retired by
ADR 0011 because in most ecosystems it means a backend or driver (Terraform,
OAuth, cloud providers), which made `provider: superpowers` unreadable. In
archived documents it meant Publisher; the access mechanism it might be
mistaken for is the `Package.spec.source.type` enum, which is a field, not an
entity, and is never called a provider.

---

# 3. Package

A **Package** is the installable or distributable unit supplied by a Publisher.

Examples:

```text
superpowers
frontend-design
python-development
ecc
```

Use Package when answering:

> What unit is installed or fetched?

A Package may contain multiple Components.

---

# 4. Component

A **Component** is a functional unit contained inside a Package.

Supported types may include:

```text
skill
agent
command
hook
rule
mcp
lsp
workflow
```

Examples:

```text
skill:test-driven-development
agent:security-reviewer
hook:post-tool-use
mcp:github
```

Use Component when answering:

> What specific functionality does the package expose?

---

# 5. Capability

A **Capability** is a semantic ability independent of its implementation.

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
security.review
knowledge.research
product.discovery
```

Use Capability when answering:

> What can the agent environment do?

Capability is the primary abstraction between user intent and provider implementation.

---

# 6. Capability Implementation

A **Capability Implementation** is a Component mapped to a Capability.

Example:

```text
Capability:
engineering.testing.tdd

Implementation:
superpowers/superpowers#skill:test-driven-development
```

Multiple implementations may provide the same Capability.

---

# 7. Capability Requirement

A **Capability Requirement** means that a Capability is requested by:

```text
Preset
Profile
Project
another Capability
```

It expresses intent, not implementation.

Example:

```text
frontend-engineer
→ engineering/core
→ engineering.testing.tdd
```

---

# 8. Cardinality

**Cardinality** defines how many implementations of a Capability may normally be active.

Supported values:

```text
one
many
```

### one

Only one active implementation should normally satisfy the Capability.

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
```

### many

Multiple compatible implementations may coexist.

Examples may include:

```text
knowledge.research
framework expertise
security knowledge
```

---

# 9. Preset

A **Preset** is a reusable composition of Capabilities and optionally other Presets.

Examples:

```text
workflow/core
engineering/core
engineering/security
stacks/nextjs
knowledge/research
```

Use Preset when answering:

> Which capabilities commonly belong together?

---

# 10. Profile

A **Profile** is a reusable role or working context composed from Presets.

Examples:

```text
frontend-engineer
backend-engineer
fullstack-engineer
product-manager
researcher
second-brain
```

Use Profile when answering:

> What baseline capabilities does this role normally need?

---

# 11. Project

A **Project** represents the desired agent environment of a specific repository or workspace.

A Project may select:

```text
profile
presets
policy
targets
overrides
```

Use Project when answering:

> What does this specific repository need?

---

# 12. Policy

A **Policy** defines constraints used during resolution and materialization.

Policies may govern:

```text
provider trust
allowed sources
hooks
commands
scripts
MCP servers
experimental components
update behavior
```

Use Policy when answering:

> What is allowed?

---

# 13. Catalog

The **Catalog** is the curated set of metadata known to the resolver.

It contains:

```text
Providers
Packages
Capabilities
Implementation mappings
```

Use Catalog when referring to curated, canonical availability.

Do not use Catalog as a synonym for upstream repository.

---

# 14. Resolution

A **Resolution** is the concrete result produced by evaluating:

```text
Project
+
Profile
+
Presets
+
Capabilities
+
Policy
+
Catalog
+
Target
```

Use Resolution when answering:

> What exact implementations should become active?

---

# 15. Resolver

The **Resolver** is the domain service that computes a Resolution.

Conceptually:

```text
Project
↓
Profile
↓
Presets
↓
Capabilities
↓
Candidates
↓
Policy filtering
↓
Target filtering
↓
Conflict resolution
↓
Selected Implementations
```

---

# 16. Candidate

A **Candidate** is a Capability Implementation being considered during resolution.

Candidates may become:

```text
Eligible
Rejected
Suppressed
Selected
```

---

# 17. Eligible Candidate

An **Eligible Candidate** satisfies all hard constraints.

Examples:

```text
allowed by policy
compatible with target
available in selected version
not explicitly disabled
```

Eligibility is evaluated before preference and priority.

---

# 18. Selected Implementation

A **Selected Implementation** is the Candidate chosen to satisfy a Capability Requirement.

For:

```text
cardinality: one
```

there should normally be one selected implementation.

For:

```text
cardinality: many
```

there may be several.

---

# 19. Suppressed Implementation

A **Suppressed Implementation** is valid and eligible, but not selected because another Candidate satisfied the Capability.

Example:

```text
engineering.testing.tdd

Selected:
Superpowers

Suppressed:
Matt Pocock
ECC
```

Suppressed does not mean invalid.

---

# 20. Rejected Implementation

A **Rejected Implementation** fails a hard constraint.

Examples:

```text
denied by policy
unsupported target
version incompatible
missing dependency
explicit conflict
```

Difference:

```text
Suppressed
→ eligible but not selected

Rejected
→ not eligible
```

---

# 21. Resolution Decision

A **Resolution Decision** records why a Candidate was:

```text
selected
suppressed
rejected
```

It may include:

```text
capability
candidate
priority
policy result
target compatibility
reason
dependency path
```

Resolution Decisions enable explainability.

---

# 22. Resolution Context

A **Resolution Context** is the full set of inputs used by the Resolver.

Conceptually:

```text
Catalog
Distribution Lock
Project Manifest
Profile
Presets
Policy
Target
Overrides
```

---

# 23. Conflict

A **Conflict** exists when multiple selections cannot safely coexist.

Examples:

```text
two active implementations of a cardinality-one capability
mutually exclusive workflows
incompatible components
```

Conflicts may be:

```text
implicit
explicit
```

---

# 24. Dependency

A **Dependency** represents one entity requiring another.

Examples:

```text
Preset → Preset
Preset → Capability
Profile → Preset
Capability → Capability
Component → Component
```

Dependencies may be hard or optional.

---

# 25. Hard Dependency

A **Hard Dependency** is required for validity.

If A requires B:

```text
A → B
```

then A cannot remain active without B.

---

# 26. Optional Dependency

An **Optional Dependency** improves or extends functionality but is not required.

Its absence should not automatically invalidate the environment.

---

# 27. Target

A **Target** is an agent runtime into which a Resolution is materialized.

Examples:

```text
claude-code
codex
gemini
opencode
hermes
```

Target identity must remain separate from Capability identity.

---

# 28. Source Adapter

A **Source Adapter** translates an upstream ecosystem into normalized internal metadata.

Examples:

```text
GitHub adapter
Claude marketplace adapter
Superpowers adapter
ECC adapter
filesystem adapter
```

Use Source Adapter when answering:

> How does the system understand this external source?

---

# 29. Target Adapter

A **Target Adapter** transforms a Resolution into native configuration for a Target runtime.

Example:

```text
Resolution
↓
Claude Code Adapter
↓
Claude-native configuration
```

Use Target Adapter when answering:

> How is resolved state represented on this runtime?

---

# 30. Materialization

**Materialization** is the process of applying a Resolution to a Target.

It may involve:

```text
generating files
installing packages
enabling components
updating managed state
```

---

# 31. Desired State

**Desired State** is the semantic state declared by the user.

Primary source:

```text
agent-plugins.yaml
```

It describes what should exist.

---

# 32. Actual State

**Actual State** is the current state of the target runtime.

It may include both:

```text
agent-plugins-managed state
manually managed state
```

---

# 33. Managed State

**Managed State** is the subset of Actual State owned by `agent-plugins`.

The system should not assume ownership of unrelated runtime configuration.

---

# 34. Sync

**Sync** is the reconciliation process that moves Managed State toward Desired State.

Conceptually:

```text
Desired State
↓
Resolution
↓
Diff
↓
Reconciliation
↓
Managed State
```

Sync should be idempotent.

---

# 35. Project Manifest

The **Project Manifest** is the declarative configuration of a consumer project.

Recommended filename:

```text
agent-plugins.yaml
```

It may contain:

```text
profile
presets
targets
policy
overrides
```

---

# 36. Lockfile

A **Lockfile** records the concrete result of resolution.

It exists to support:

```text
reproducibility
traceability
version pinning
provenance
```

---

# 37. Project Lockfile

The **Project Lockfile** records the resolved state of one consumer project.

Recommended filename:

```text
agent-plugins.lock
```

It may include:

```text
capabilities
implementations
packages
components
versions
immutable references
targets
```

---

# 38. Distribution Lock

The **Distribution Lock** records upstream versions curated and tested by the `agent-plugins` distribution.

Recommended conceptual name:

```text
catalog.lock
```

Difference:

```text
catalog.lock
→ curated distribution baseline

agent-plugins.lock
→ consumer project resolution
```

---

# 39. Provenance

**Provenance** records where a Package or Component came from.

Example:

```text
provider
repository
version
commit
ownership
source
```

Provenance should remain visible through resolution and lockfiles.

---

# 40. Ownership

**Ownership** describes who maintains an entity relative to `agent-plugins`.

Canonical values:

```text
first-party
third-party
```

Ownership is not the same as trust.

---

# 41. First-Party

**First-Party** means authored or maintained by the `agent-plugins` project.

Example:

```text
ownership: first-party
```

Do not use `official` as a synonym for first-party.

---

# 42. Third-Party

**Third-Party** means maintained outside the `agent-plugins` project.

A third-party provider may still be:

```text
official
curated
community
```

---

# 43. Native

**Native** describes a source/origin classification for implementations stored and maintained inside this repository.

Recommended location:

```text
plugins/native/
```

Typical combination:

```text
source: native
ownership: first-party
```

---

# 44. First-Party vs Native

Use:

```text
first-party
```

for ownership.

Use:

```text
native
```

for source/origin.

They are related but intentionally not identical.

---

# 45. Trust

**Trust** describes a policy or curation classification.

Recommended levels:

```text
first-party
official
curated
community
untrusted
```

Trust may influence:

```text
eligibility
installation
hook execution
MCP execution
review requirements
```

---

# 46. Official

**Official** means the Package or Provider is published by the organization responsible for the target ecosystem or product.

Example:

```text
Anthropic official plugin
```

Do not use `official` to mean `agent-plugins` first-party code.

---

# 47. Curated

**Curated** means explicitly reviewed and approved by the `agent-plugins` catalog maintainers.

Curated does not imply first-party ownership.

---

# 48. Community

**Community** means externally maintained and available to the ecosystem but not necessarily formally curated.

Community does not automatically mean unsafe.

---

# 49. Untrusted

**Untrusted** means the current policy or catalog does not grant sufficient trust for automatic use.

It does not necessarily mean malicious.

---

# 50. Security-Sensitive Component

A **Security-Sensitive Component** is a Component capable of executable or external behavior.

Examples:

```text
hook
script
command
MCP server
external binary integration
```

Such Components should be evaluated by Policy before activation.

---

# 51. Integrity

**Integrity** describes evidence that retrieved content matches expected content.

Examples:

```text
checksum
hash
signature
```

---

# 52. Version

A **Version** is a human-readable release reference.

Examples:

```text
6.4.1
v2.8.0
```

A version may not be immutable.

---

# 53. Immutable Reference

An **Immutable Reference** identifies exact content.

Examples:

```text
Git commit SHA
content hash
archive checksum
immutable release artifact
```

Lockfiles should prefer immutable references where possible.

---

# 54. Discovered Component

A **Discovered Component** is found in an upstream source but has not necessarily been approved for use.

Lifecycle:

```text
Discovered
↓
Reviewed
↓
Curated
↓
Mapped
↓
Eligible
```

---

# 55. Curated Component

A **Curated Component** is a Component approved to participate in catalog resolution.

Curation may add:

```text
capability mapping
priority
trust metadata
target compatibility
security metadata
```

---

# 56. Deprecated Implementation

A **Deprecated Implementation** is still known but should normally not be selected for new resolutions.

It may remain necessary to reproduce older lockfiles.

---

# 57. Removed Implementation

A **Removed Implementation** is no longer available from its source.

Removal may affect:

```text
capability coverage
reproducibility
existing project lockfiles
```

---

# 58. Update

An **Update** is an intentional transition from one upstream state to another.

Examples:

```text
new package version
new commit
component addition
component removal
metadata change
```

Update is distinct from normal Sync.

---

# 59. Update Impact

**Update Impact** describes the semantic effect of an Update.

Examples:

```text
capability implementation changed
component removed
new security-sensitive component
target compatibility changed
new dependency
```

---

# 60. Diagnostic

A **Diagnostic** is structured feedback produced during:

```text
validation
resolution
sync
update
```

A Diagnostic may contain:

```text
severity
code
message
entity
dependency path
remediation
```

---

# 61. Validation

**Validation** checks whether configuration and catalog state are structurally and semantically valid.

Examples:

```text
schema validation
reference validation
cycle detection
duplicate ID detection
```

Validation does not necessarily perform full Resolution.

---

# 62. Explainability

**Explainability** is the ability to answer why a Package, Component, or implementation was selected.

Canonical trace:

```text
Project
→ Profile
→ Preset
→ Capability
→ Implementation
→ Package
→ Provider
```

---

# 63. Reproducibility

**Reproducibility** means the same locked inputs can recreate an equivalent resolved environment.

It depends on:

```text
stable manifests
deterministic resolution
version pinning
immutable references
lockfiles
```

---

# 64. Idempotence

**Idempotence** means repeatedly applying the same operation produces no additional change once desired state is reached.

Example:

```text
ap sync
ap sync
ap sync
```

should converge to the same Managed State.

---

# 65. Override

An **Override** is an explicit Project-level exception to inherited behavior.

Examples:

```text
enable capability
disable capability
select specific implementation
```

Overrides should remain explicit and limited.

---

# 66. Bundle

**Bundle** means multiple capabilities or components packaged together as one distribution artifact.

Bundle is **not** a first-class composition concept in V1.

Prefer:

```text
Preset
```

for semantic composition.

---

# 67. Addon

**Addon** is a UX term for an optional Preset.

Conceptually:

```text
Addon = optional Preset
```

Addon is not a first-class domain entity in V1.

---

# 68. Overlay

**Overlay** refers to modification or patching applied on top of an external implementation.

Overlay is not a first-class V1 concept.

Prefer:

```text
policy
capability mapping
native replacement
```

before introducing overlays.

---

# 69. Plugin

**Plugin** is a runtime-specific packaging term.

It may correspond to a Package in some runtimes, especially Claude Code, but should not define the core domain model.

Use:

```text
Package
```

for runtime-independent domain modeling.

Use:

```text
Plugin
```

when discussing a runtime's native format.

---

# 70. Skill

A **Skill** is a Component type representing reusable instructions, knowledge, or workflow behavior.

Use Skill only when the implementation is specifically a skill.

Do not use Skill as a synonym for Capability.

---

# 71. Agent

An **Agent** is a Component type representing a specialized autonomous or semi-autonomous worker context.

Do not use Agent as a synonym for Profile.

---

# 72. Workflow

A **Workflow** is a Component or semantic process representing an ordered way of performing a task.

Examples:

```text
planning workflow
TDD workflow
review workflow
```

Workflow may be implemented as a Skill, Agent, or runtime-native mechanism.

---

# 73. Rule

A **Rule** is a Component type representing persistent behavioral instruction or constraint.

Rules may be runtime-specific.

---

# 74. Hook

A **Hook** is a Component triggered by runtime events.

Hooks are usually security-sensitive because they may execute code or commands.

---

# 75. Command

A **Command** is a user- or runtime-invoked Component exposing an explicit operation.

Commands may be executable and therefore may require Policy evaluation.

---

# 76. MCP

**MCP** refers to Model Context Protocol integrations exposed by a Package or Component.

MCP integrations may connect the agent to external tools, data, or services.

They should generally be treated as security-sensitive.

---

# 77. LSP

**LSP** refers to Language Server Protocol integrations.

An LSP integration is represented as a Component when it participates in the agent tooling environment.

---

# 78. Runtime

A **Runtime** is the actual AI agent system executing or consuming the generated configuration.

Examples:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

Within the domain model, Runtime is represented through a Target.

---

# 79. Environment

**Environment** is a broad informal term describing the effective set of capabilities, components, packages, configuration, and runtime state available to a user or project.

Environment is not a canonical first-class entity in V1.

Prefer more precise terms such as:

```text
Desired State
Resolution
Managed State
Actual State
```

---

# 80. Canonical Naming Rules

Use singular nouns for entity names:

```text
Provider
Package
Component
Capability
Preset
Profile
Policy
Project
Target
Resolution
```

Use lowercase kebab-case for IDs where appropriate:

```text
frontend-engineer
engineering-core
claude-code
```

Use dot-separated hierarchical IDs for Capabilities:

```text
engineering.testing.tdd
knowledge.research
security.review
```

Use `/` for categorized Preset IDs:

```text
engineering/core
stacks/nextjs
knowledge/research
```

---

# 81. Preferred Terms

Prefer:

```text
Capability
```

over:

```text
feature
ability
functionality
```

when referring to normalized semantic behavior.

Prefer:

```text
Package
```

over:

```text
plugin
```

when discussing runtime-independent installable units.

Prefer:

```text
Preset
```

over:

```text
bundle
pack
group
```

when describing reusable capability composition.

Prefer:

```text
Profile
```

when describing a working role.

Prefer:

```text
Policy
```

when describing constraints.

---

# 82. Terms to Avoid or Use Carefully

Avoid using:

```text
plugin
```

as the universal term for every domain object.

Avoid using:

```text
profile
```

for project-specific stacks.

Avoid using:

```text
preset
```

for provider-specific package lists unless explicitly intended.

Avoid using:

```text
official
```

as a synonym for first-party.

Avoid using:

```text
native
```

as a synonym for ownership.

Avoid using:

```text
addon
```

as a separate domain entity.

Avoid using:

```text
bundle
```

when semantic composition is meant.

---

# 83. Common Distinctions

## Provider vs Package

```text
Provider
→ who / where

Package
→ what gets installed
```

---

## Package vs Component

```text
Package
→ installation unit

Component
→ functional unit
```

---

## Component vs Capability

```text
Component
→ implementation

Capability
→ semantic intent
```

---

## Preset vs Profile

```text
Preset
→ reusable capability composition

Profile
→ role using presets
```

---

## Profile vs Project

```text
Profile
→ who / working role

Project
→ repository-specific needs
```

---

## Policy vs Priority

```text
Policy
→ eligibility

Priority
→ preference among eligible candidates
```

---

## Suppressed vs Rejected

```text
Suppressed
→ valid but not selected

Rejected
→ invalid under current constraints
```

---

## First-Party vs Native

```text
First-party
→ ownership

Native
→ source/origin
```

---

## Catalog vs Upstream

```text
Upstream
→ what exists externally

Catalog
→ what this project knows and curates
```

---

## Sync vs Update

```text
Sync
→ reconcile project desired state

Update
→ deliberately change upstream version/state
```

---

## Resolution vs Materialization

```text
Resolution
→ decide what should be used

Materialization
→ apply that decision to a runtime
```

---

# 84. Canonical Trace

When explaining why something exists, use this order:

```text
Project
   ↓
Profile
   ↓
Preset
   ↓
Capability
   ↓
Capability Implementation
   ↓
Component
   ↓
Package
   ↓
Provider
```

When explaining execution:

```text
Resolution
   ↓
Lockfile
   ↓
Target Adapter
   ↓
Materialization
   ↓
Managed State
```

---

# 85. Canonical Lifecycle

External tooling generally follows:

```text
Provider
   ↓
Discovered Package / Component
   ↓
Curated
   ↓
Mapped to Capability
   ↓
Eligible Candidate
   ↓
Selected Implementation
   ↓
Locked
   ↓
Materialized
```

---

# 86. Glossary Summary

| Term | Short Definition |
|---|---|
| Provider | Source or publisher of Packages |
| Package | Installable/distributable unit |
| Component | Functional unit inside a Package |
| Capability | Provider-independent semantic ability |
| Capability Implementation | Component implementing a Capability |
| Preset | Reusable composition of Capabilities |
| Profile | Reusable role composed from Presets |
| Project | Desired configuration of a repository |
| Policy | Constraints applied during resolution |
| Catalog | Curated Provider/Package/Capability metadata |
| Resolver | Computes concrete implementations |
| Resolution | Result of resolution |
| Candidate | Implementation considered by the Resolver |
| Selected | Candidate chosen to satisfy a Capability |
| Suppressed | Eligible Candidate not selected |
| Rejected | Candidate failing a hard constraint |
| Target | Agent runtime receiving resolved state |
| Source Adapter | Normalizes upstream metadata |
| Target Adapter | Produces runtime-native output |
| Materialization | Applies Resolution to a Target |
| Desired State | User-declared semantic state |
| Actual State | Current runtime state |
| Managed State | Runtime state owned by `agent-plugins` |
| Sync | Reconciles Managed State with Desired State |
| Project Lockfile | Reproducible project resolution |
| Distribution Lock | Curated upstream baseline |
| Provenance | Origin and source history |
| Trust | Policy/curation confidence classification |
| Native | Source stored inside this repository |
| First-Party | Ownership by this project |
| Diagnostic | Structured validation/resolution feedback |

---

# 87. Terminology Rule

When a new term is introduced, ask:

1. Does an existing canonical term already describe this concept?
2. Is the new term a real domain entity or only UX language?
3. Does it overlap with an existing concept?
4. Does it improve clarity enough to justify expanding the vocabulary?

If not, reuse the existing terminology.

---

# 88. Terminology in One Sentence

> **Use Provider for origin, Package for installation, Component for implementation, Capability for intent, Preset for composition, Profile for role, Project for repository needs, Policy for constraints, Resolution for concrete selection, and Target Adapter for runtime materialization.**