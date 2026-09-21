# Domain Model

## Overview

This document defines the canonical domain model for `agent-plugins`.

The purpose of the domain model is to establish a stable vocabulary and a clear set of relationships between the concepts used throughout:

- product requirements,
- manifests,
- catalog metadata,
- resolver logic,
- policies,
- lockfiles,
- source adapters,
- target adapters,
- CLI behavior.

The domain model should remain independent from any single runtime such as Claude Code, Codex, Gemini, OpenCode, or Hermes.

The canonical flow is:

```text
Provider
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

A shorter mental model is:

```text
Source
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

# 1. Domain Goals

The domain model should make it possible to answer the following questions consistently:

```text
Where does this tooling come from?

What is the installable unit?

What functionality does it contain?

What semantic capability does that functionality provide?

Which capabilities should be active for this role or project?

Which implementation should provide each capability?

Which components are allowed under the current policy?

What exact state was resolved?

How is that state materialized into a target runtime?
```

---

# 2. Domain Boundaries

The domain is divided into five logical areas.

```text
Source
├── Provider
├── Package
└── Component

Semantic
└── Capability

Composition
├── Preset
├── Profile
├── Project
└── Policy

Resolution
├── Resolution
├── Resolution Decision
└── Lockfile

Integration
├── Source Adapter
└── Target Adapter
```

These boundaries should remain conceptually distinct even when the implementation stores some of them together.

---

# 3. Provider

## Definition

A **Provider** represents the origin, publisher, or upstream source responsible for one or more packages.

A Provider answers:

> **Where does this tooling come from?**

Examples:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

A provider may represent:

- an open-source project,
- an organization,
- an official runtime ecosystem,
- the `agent-plugins` project itself,
- another curated source.

---

## Provider Identity

A Provider must have a stable canonical identifier.

Example:

```text
superpowers
```

A display name may differ:

```text
Superpowers
```

Provider identity should not be derived from display text.

---

## Provider Attributes

Conceptually, a Provider may contain:

```text
id
display name
description

ownership
trust classification

source metadata
repository
documentation

discovery strategy
update strategy
```

---

## Provider Ownership

Ownership describes who maintains the provider relative to `agent-plugins`.

Recommended values:

```text
first-party
third-party
```

Example:

```text
agent-plugins
→ first-party

superpowers
→ third-party
```

Ownership and trust are different concepts.

A third-party provider may still be highly trusted.

---

## Provider Trust

Trust represents the confidence level assigned by project policy or catalog curation.

Possible classifications include:

```text
first-party
official
curated
community
untrusted
```

These values describe trust context, not ownership.

---

# 4. Package

## Definition

A **Package** is the installable or distributable unit supplied by a Provider.

A Package answers:

> **What unit must be fetched, installed, or referenced to obtain these components?**

Examples may include:

```text
superpowers
frontend-design
python-development
ecc
```

---

## Why Package Exists

Package and Component must remain separate because runtime installation granularity may differ from semantic selection granularity.

Example:

```text
Package: superpowers

contains:

Component A → planning
Component B → debugging
Component C → TDD
```

The resolver may select only:

```text
planning
debugging
```

but still need to install the entire package.

Therefore:

```text
selected component
≠
installation unit
```

---

## Package Attributes

Conceptually:

```text
id
provider
display name
description

source
version
immutable reference
integrity metadata

supported targets

contained components
dependencies

security metadata
update strategy
```

---

## Package Identity

A package should have a canonical identity scoped by provider when necessary.

Conceptually:

```text
provider/package
```

Examples:

```text
superpowers/superpowers
anthropic/frontend-design
wshobson/python-development
```

---

# 5. Component

## Definition

A **Component** is a functional unit contained within a Package.

A Component answers:

> **What specific functionality does this package expose?**

Examples:

```text
skill:test-driven-development
agent:security-reviewer
hook:post-tool-use
command:review
mcp:github
lsp:typescript
```

---

## Component Types

The initial domain model should support at least:

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

Additional types may be added later.

The core model should avoid assuming that every runtime uses all component types.

---

## Component Identity

A canonical component reference should be globally unambiguous.

Conceptually:

```text
provider/package#type:name
```

Example:

```text
superpowers/superpowers#skill:test-driven-development
```

Another example:

```text
ecc/ecc#agent:security-reviewer
```

---

## Component Attributes

Conceptually:

```text
id
type
package

name
description

target compatibility

security classification

capability mappings

dependencies
conflicts
```

---

# 6. Capability

## Definition

A **Capability** represents a semantic ability independent of its implementation.

A Capability answers:

> **What can the agent environment do?**

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.architecture
security.review
knowledge.research
product.discovery
```

Capability is the central abstraction of the domain model.

---

# 7. Capability Identity

Capability IDs must describe semantic intent, not provider identity.

Preferred:

```text
engineering.testing.tdd
```

Avoid:

```text
superpowers.tdd
ecc.tdd
matt.tdd
```

This allows implementation to change without changing user intent.

---

# 8. Capability Namespace

Capabilities use hierarchical namespaces.

Recommended pattern:

```text
<domain>.<area>.<capability>
```

Examples:

```text
workflow.planning

engineering.requirements
engineering.testing.tdd
engineering.debugging
engineering.review

frontend.design
frontend.accessibility

backend.api-design

security.review

knowledge.research
knowledge.synthesis

product.discovery

devops.kubernetes

gis.spatial-analysis
```

Namespaces should represent semantics rather than repository structure.

---

# 9. Capability Implementation

A component may implement one or more capabilities.

Example:

```text
superpowers/superpowers#skill:test-driven-development

implements:

engineering.testing.tdd
```

Multiple components may implement the same capability.

Example:

```text
engineering.testing.tdd

├── superpowers/...#skill:test-driven-development
├── mattpocock/...#skill:tdd
└── ecc/...#skill:tdd-workflow
```

These are called **Capability Implementations**.

---

# 10. Capability Cardinality

A Capability defines how many active implementations may normally coexist.

Initial values:

```text
one
many
```

---

## Cardinality: one

Only one active implementation should normally provide the capability.

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
```

Reason:

Multiple competing workflows may create inconsistent behavior.

---

## Cardinality: many

Multiple compatible implementations may coexist.

Examples may include:

```text
knowledge.research
framework expertise
database expertise
security knowledge
```

These implementations may be complementary rather than competing.

---

# 11. Capability Priority

Implementations may have explicit priority.

Example:

```text
engineering.testing.tdd

100 → Superpowers
80  → Matt Pocock
70  → ECC
```

Priority is only one resolution input.

It must not override:

```text
policy restrictions
target compatibility
version compatibility
explicit project override
```

---

# 12. Capability Requirement

A **Capability Requirement** represents the intent that a capability should exist in the resolved environment.

Requirements may originate from:

```text
Preset
Profile
Project
another capability
```

Example:

```text
frontend-engineer
→ engineering/core
→ engineering.testing.tdd
```

The requirement does not determine implementation.

Resolution determines implementation later.

---

# 13. Preset

## Definition

A **Preset** is a reusable composition of capabilities and optionally other presets.

A Preset answers:

> **Which capabilities commonly belong together?**

Examples:

```text
workflow/core
engineering/core
engineering/security

stacks/typescript
stacks/nextjs

domains/frontend
domains/backend
domains/product

knowledge/research
knowledge/writing
```

---

## Preset Responsibilities

A Preset may:

```text
include capabilities
include other presets
provide reusable composition
```

A Preset should generally not:

```text
select provider implementations
encode user identity
encode one specific project
contain runtime installation logic
```

---

## Preset Example

```text
engineering/core

├── workflow.planning
├── engineering.testing.tdd
├── engineering.debugging
├── engineering.review
└── engineering.verification
```

---

# 14. Preset Composition

Presets may reference other presets.

Example:

```text
frontend

├── engineering/core
├── engineering/testing
├── frontend/design
└── frontend/accessibility
```

Composition graphs must remain acyclic.

Invalid:

```text
A → B
B → C
C → A
```

---

# 15. Profile

## Definition

A **Profile** represents a reusable role or working context.

A Profile answers:

> **What baseline capabilities does this type of user normally need?**

Examples:

```text
frontend-engineer
backend-engineer
fullstack-engineer
platform-engineer
product-manager
researcher
second-brain
```

---

## Profile Responsibilities

Profiles should primarily compose presets.

Example:

```text
frontend-engineer

├── workflow/core
├── engineering/core
├── domains/frontend
└── stacks/typescript
```

A Profile should not normally:

```text
reference provider-specific components
pin package versions
contain project-specific stack details
contain runtime installation logic
```

---

# 16. Profile vs Preset

The distinction is:

```text
Preset
→ reusable capability group

Profile
→ reusable working role composed from presets
```

Example:

```text
Preset:
engineering/security

Profile:
backend-engineer
```

A profile uses multiple presets.

A preset does not represent a person or role.

---

# 17. Profile vs Project

The distinction is:

```text
Profile
→ who / what role is working

Project
→ what the current repository requires
```

Example:

```text
Profile:
frontend-engineer

Project A:
Next.js + Cloudflare

Project B:
React + Vite
```

The Profile remains reusable across both projects.

---

# 18. Project

## Definition

A **Project** represents the desired agent environment for a specific consumer repository or workspace.

A Project answers:

> **What does this project need?**

A Project may select:

```text
profile
presets
policy
targets
capability overrides
```

---

## Project Example

```yaml
profile: frontend-engineer

presets:
  - stacks/nextjs
  - stacks/cloudflare
  - engineering/security

targets:
  - claude-code

policy: default
```

The Project describes intent.

It should not normally list every low-level component.

---

# 19. Project Overrides

Projects may override inherited capability intent.

Examples:

```text
enable capability
disable capability
select specific implementation
```

Overrides should remain explicit.

They should not become an unrestricted patch mechanism.

---

# 20. Policy

## Definition

A **Policy** defines constraints applied during resolution and materialization.

A Policy answers:

> **Which implementations and behaviors are allowed?**

Policies may govern:

```text
provider trust
source classification
hooks
commands
scripts
MCP servers
experimental components
provider preference
update behavior
```

---

## Policy Example

```text
default

Allowed trust:
first-party
official
curated
community

External hooks:
review

External MCP:
prompt

Experimental:
deny
```

---

# 21. Policy Is Not a Profile

A Profile answers:

```text
What capabilities do I normally need?
```

A Policy answers:

```text
What is allowed?
```

Example:

```text
Profile:
backend-engineer

Policy:
strict
```

These concerns must remain separate.

---

# 22. Policy Is Not Capability Priority

Capability priority describes preferred implementations.

Policy constrains which implementations are eligible.

Conceptually:

```text
Candidates
   ↓
Policy Filter
   ↓
Eligible Candidates
   ↓
Priority / Resolution
```

Therefore:

```text
policy > priority
```

A high-priority candidate rejected by policy cannot win.

---

# 23. Resolution

## Definition

A **Resolution** is the computed result of evaluating:

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

A Resolution answers:

> **What exact capabilities, implementations, packages, and components should be active?**

---

# 24. Resolution Pipeline

Conceptually:

```text
Project
   ↓
Profile
   ↓
Presets
   ↓
Capability Requirements
   ↓
Candidate Implementations
   ↓
Policy Filtering
   ↓
Target Filtering
   ↓
Conflict Resolution
   ↓
Selected Components
   ↓
Required Packages
   ↓
Resolved Versions
   ↓
Resolution
```

---

# 25. Resolution Decision

A **Resolution Decision** represents why an implementation was selected or rejected.

A decision may capture:

```text
capability
candidate
selected / rejected
reason
policy result
priority
target compatibility
dependency path
```

This supports explainability.

---

## Example Decision

```text
Capability:
engineering.testing.tdd

Candidate:
Superpowers / test-driven-development

Decision:
selected

Reasons:
allowed by policy
compatible with claude-code
priority 100
```

Another:

```text
Candidate:
Provider X / tdd

Decision:
rejected

Reason:
community provider denied by strict policy
```

---

# 26. Required vs Optional Capability

The model should distinguish where practical between:

```text
required
optional
```

A missing required capability causes resolution failure.

A missing optional capability may produce:

```text
warning
degraded state
```

depending on policy and configuration.

This distinction may be introduced incrementally if V1 initially treats all requested capabilities as required.

---

# 27. Dependency

A **Dependency** represents one entity requiring another.

Possible relationships include:

```text
Preset → Preset

Preset → Capability

Profile → Preset

Project → Preset

Component → Component

Capability → Capability
```

Dependencies should be explicit and acyclic where applicable.

---

# 28. Hard Dependency

A hard dependency must exist for the requesting entity to be valid.

Example:

```text
Capability A
requires
Capability B
```

Disabling B while keeping A should cause validation or resolution failure.

---

# 29. Optional Dependency

An optional dependency improves or extends functionality but is not required for validity.

Example:

```text
knowledge.research

optionally enhances with:

browser.automation
```

Optional dependencies should not silently become mandatory.

---

# 30. Conflict

A **Conflict** represents two or more active selections that cannot safely coexist.

Examples:

```text
multiple implementations of a cardinality-one capability

incompatible runtime components

mutually exclusive workflows
```

Conflicts may be:

```text
implicit
explicit
```

---

## Implicit Conflict

Derived from capability cardinality.

Example:

```text
engineering.testing.tdd
cardinality: one
```

Two selected implementations create a conflict.

---

## Explicit Conflict

Declared directly between components or packages.

Example:

```text
Component A
conflicts with
Component B
```

Explicit conflicts should be rare and documented.

---

# 31. Catalog

## Definition

The **Catalog** is the curated metadata set known to the resolver.

It contains:

```text
Providers
Packages
Capability definitions
Implementation mappings
```

The catalog answers:

> **What implementations are available and how do they map to semantic capabilities?**

---

# 32. Catalog vs Upstream Source

The catalog is curated.

Upstream is discovered.

Example:

```text
Upstream provider
contains 300 components

Source Adapter
discovers 300

Catalog
curates 20
```

Therefore:

```text
discovered
≠
approved
≠
active
```

These are separate states.

---

# 33. Discovered Component

A **Discovered Component** is a component identified from an upstream source adapter.

It is not automatically part of the curated catalog.

Lifecycle:

```text
Upstream
   ↓
Discovered
   ↓
Reviewed
   ↓
Curated
   ↓
Mapped to Capability
   ↓
Eligible for Resolution
```

---

# 34. Curated Component

A **Curated Component** is an external or native component approved for catalog participation.

Curation may include:

```text
capability mapping
trust classification
priority
target compatibility
security review metadata
```

---

# 35. Source Adapter

## Definition

A **Source Adapter** translates an external source ecosystem into normalized internal metadata.

A Source Adapter answers:

> **How do we understand this upstream source?**

Examples:

```text
GitHub
Claude marketplace
Superpowers
ECC
Agent Skills
filesystem
```

---

## Source Adapter Responsibilities

A source adapter may:

```text
discover packages
discover components
read versions
resolve source metadata
extract integrity metadata
normalize upstream manifests
```

It should not:

```text
choose user capabilities
apply profile composition
decide final implementation winners
```

Those belong to the resolver.

---

# 36. Target

A **Target** represents an agent runtime into which resolved state may be materialized.

Examples:

```text
claude-code
codex
gemini
opencode
hermes
```

Target identity should remain separate from capability identity.

---

# 37. Target Compatibility

An implementation may support:

```text
all targets
specific targets
no currently supported target
```

Example:

```text
Component A

supports:
- claude-code
- codex
```

The resolver must consider compatibility before selection.

---

# 38. Target Adapter

## Definition

A **Target Adapter** transforms normalized resolved state into native configuration for a Target runtime.

A Target Adapter answers:

> **How should this resolution be represented on this runtime?**

Example:

```text
Resolution
   ↓
Claude Code Adapter
   ↓
Claude-native configuration
```

---

## Target Adapter Responsibilities

A target adapter may:

```text
validate target support
render target files
translate package references
install supported packages
reconcile managed state
```

It should not redefine semantic capability meaning.

---

# 39. Materialization

**Materialization** is the process of applying a Resolution to a Target.

Conceptually:

```text
Resolution
    ↓
Target Adapter
    ↓
Materialized Runtime State
```

Materialization may involve:

```text
generating files
installing packages
enabling components
updating managed configuration
```

---

# 40. Desired State

The **Desired State** is the semantic state declared by the user.

Primary source:

```text
Project Manifest
```

It includes:

```text
profile
presets
policy
target
overrides
```

Desired state is not necessarily identical to runtime state.

---

# 41. Actual State

The **Actual State** is the currently materialized state of a target runtime.

Example:

```text
installed package A
installed package B
manual package C
```

Synchronization compares:

```text
Desired State
vs
Actual State
```

---

# 42. Managed State

**Managed State** represents the subset of Actual State controlled by `agent-plugins`.

Example:

```text
Actual State

├── package A  ← managed
├── package B  ← managed
└── package C  ← manually managed
```

`agent-plugins` should not assume ownership of unrelated runtime state.

---

# 43. Sync

**Sync** is the reconciliation operation that moves Managed State toward resolved Desired State.

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

# 44. Lockfile

## Definition

A **Lockfile** records the exact concrete result of resolution.

A Lockfile answers:

> **What exact state was selected?**

It bridges:

```text
semantic intent
```

and:

```text
reproducible implementation state
```

---

# 45. Project Lockfile

The project lockfile belongs to a consumer project.

Recommended filename:

```text
agent-plugins.lock
```

It may contain:

```text
resolved capabilities
selected implementations
packages
components
versions
immutable references
target information
integrity metadata
resolution metadata
```

---

# 46. Distribution Lock

The `agent-plugins` distribution may maintain a separate lock representing tested upstream provider state.

Conceptually:

```text
catalog.lock
```

This answers:

> Which upstream versions has this distribution curated and tested?

It is distinct from a project lockfile.

---

# 47. Distribution Lock vs Project Lockfile

```text
catalog.lock

controls:
curated upstream baseline

agent-plugins.lock

controls:
resolved consumer project state
```

Conceptually:

```text
Distribution
   ↓
catalog.lock
   ↓
Project Resolution
   ↓
agent-plugins.lock
```

---

# 48. Version

A Package may expose a mutable human-readable version.

Examples:

```text
6.4.1
v2.8.0
main
```

For reproducibility, a mutable version should preferably resolve to an immutable reference.

---

# 49. Immutable Reference

Examples:

```text
Git commit SHA
content hash
archive checksum
immutable release artifact
```

The lockfile should prefer immutable references where possible.

---

# 50. Integrity

**Integrity Metadata** provides evidence that retrieved content matches the locked artifact.

Possible forms:

```text
checksum
hash
signature
```

V1 may support only some integrity mechanisms, but the domain should leave room for them.

---

# 51. Provenance

## Definition

**Provenance** records where a package or component originated.

Example:

```text
ownership: third-party
provider: superpowers
repository: obra/superpowers
version: v6.4.1
commit: abc123
```

Provenance must survive resolution into the lockfile where practical.

---

# 52. Native

`native` describes a source classification for components implemented inside the `agent-plugins` repository.

Recommended location:

```text
plugins/native/
```

Example:

```text
plugins/native/second-brain/
```

A native component normally has:

```text
ownership: first-party
source: native
```

---

# 53. First-Party vs Native

These concepts are related but not identical.

```text
first-party
→ ownership classification

native
→ source/origin classification
```

Example:

```text
ownership: first-party
source: native
```

This distinction allows the model to remain precise if new distribution modes are added later.

---

# 54. Third-Party

A **Third-Party Component** is maintained outside the `agent-plugins` project.

It may still be:

```text
official
curated
community
```

Third-party does not mean untrusted.

---

# 55. Derived Component

A native component may be inspired by or derived from external work.

Conceptually:

```text
native implementation

derivedFrom:
external provider/component
```

Provenance should preserve this relationship where relevant.

---

# 56. Trust

**Trust** represents a curation or policy classification applied to providers, packages, or components.

Trust may influence:

```text
eligibility
automatic installation
hook execution
MCP execution
update review requirements
```

Trust should remain explicit.

---

# 57. Security-Sensitive Component

Components capable of performing external or executable behavior should be classified as security-sensitive.

Examples:

```text
hook
script
command
MCP server
external binary integration
```

Policy evaluation must occur before such components become active.

---

# 58. Implementation Status

A capability implementation may conceptually exist in several lifecycle states:

```text
discovered
curated
deprecated
disabled
removed
```

V1 may not require all statuses, but the model should not assume every known implementation is active.

---

# 59. Deprecated Implementation

A deprecated implementation remains known but should not normally be selected for new resolution.

It may remain necessary to reproduce older lockfiles.

This distinction is important for safe ecosystem evolution.

---

# 60. Removed Implementation

A removed implementation is no longer available from its provider.

Catalog update analysis should identify capabilities affected by removal.

Existing lockfiles may become unreproducible if the underlying immutable artifact is no longer accessible.

---

# 61. Resolution Context

A **Resolution Context** is the complete set of inputs used to compute a Resolution.

Conceptually:

```text
catalog
distribution lock
project manifest
profile
presets
policy
target
overrides
```

This context should be sufficient to explain resolution decisions.

---

# 62. Candidate

A **Candidate** is a capability implementation considered during resolution.

Lifecycle:

```text
Capability Requirement
       ↓
Candidate Discovery
       ↓
Policy Filtering
       ↓
Target Filtering
       ↓
Conflict Resolution
       ↓
Selected / Rejected
```

---

# 63. Eligible Candidate

A Candidate is **Eligible** when it satisfies all hard constraints.

Examples:

```text
allowed by policy
compatible with target
available in selected version
not explicitly disabled
```

Priority is generally applied only after eligibility is established.

---

# 64. Selected Implementation

The **Selected Implementation** is the candidate chosen to satisfy a capability requirement.

For:

```text
cardinality: one
```

there should normally be exactly one selected implementation.

For:

```text
cardinality: many
```

there may be multiple.

---

# 65. Suppressed Implementation

A **Suppressed Implementation** is a valid candidate that was not selected because another candidate satisfied the capability.

Example:

```text
engineering.testing.tdd

selected:
Superpowers

suppressed:
Matt Pocock
ECC
```

Suppressed candidates should remain visible to explainability tools.

---

# 66. Rejected Implementation

A **Rejected Implementation** failed a hard constraint.

Possible reasons:

```text
policy denied
target unsupported
version incompatible
explicit conflict
missing dependency
```

Rejected and suppressed are not the same state.

```text
suppressed
→ eligible but not selected

rejected
→ not eligible
```

---

# 67. Resolution Failure

Resolution fails when the desired state cannot produce a valid environment.

Examples:

```text
required capability has no eligible implementation

ambiguous cardinality-one capability

dependency cycle

hard conflict

unsupported required target capability
```

Failures should be explicit and explainable.

---

# 68. Resolution Warning

A warning indicates degraded but potentially valid behavior.

Examples:

```text
optional capability unavailable

deprecated implementation selected from existing lockfile

partial target support
```

Warnings must not silently hide required failures.

---

# 69. Diagnostic

A **Diagnostic** is a structured message produced during:

```text
validation
resolution
sync
update
```

A diagnostic should contain:

```text
severity
code
message
entity
dependency path
suggested remediation
```

where practical.

---

# 70. Update

An **Update** represents a deliberate change from one upstream state to another.

Examples:

```text
package version update
provider ref update
component addition
component removal
component metadata change
```

Updates are separate from normal sync.

---

# 71. Update Impact

**Update Impact** describes semantic changes caused by an upstream update.

Possible impacts:

```text
capability unchanged
capability implementation changed
component removed
new security-sensitive component
new dependency
target compatibility changed
```

Update review should focus on semantic impact, not only version numbers.

---

# 72. Domain Relationships

The primary relationships are:

```text
Provider
  1 ─── * Package

Package
  1 ─── * Component

Component
  * ─── * Capability

Preset
  * ─── * Capability

Preset
  * ─── * Preset

Profile
  1 ─── * Preset

Project
  0..1 ─── 1 Profile

Project
  * ─── * Preset

Project
  0..1 ─── 1 Policy

Project
  1 ─── * Target

Resolution
  1 ─── * Selected Implementation

Selected Implementation
  1 ─── 1 Component

Component
  * ─── 1 Package

Package
  * ─── 1 Provider
```

---

# 73. Conceptual Entity Diagram

```text
┌────────────┐
│  Provider  │
└─────┬──────┘
      │ 1
      │
      │ *
┌─────▼──────┐
│  Package   │
└─────┬──────┘
      │ 1
      │
      │ *
┌─────▼──────┐
│ Component  │
└─────┬──────┘
      │ *
      │ implements
      │ *
┌─────▼──────┐
│ Capability │
└─────▲──────┘
      │ *
      │ required by
      │ *
┌─────┴──────┐
│   Preset   │◄────────┐
└─────▲──────┘         │
      │ *              │ compose
      │                │
┌─────┴──────┐         │
│  Profile   │         │
└─────▲──────┘         │
      │                │
      │ selected by    │
      │                │
┌─────┴──────┐         │
│  Project   │─────────┘
└─────┬──────┘
      │
      ├──────── Policy
      │
      └──────── Target
                │
                ▼
           ┌───────────┐
           │ Resolver  │
           └─────┬─────┘
                 │
                 ▼
           ┌───────────┐
           │Resolution │
           └─────┬─────┘
                 │
                 ▼
           ┌───────────┐
           │ Lockfile  │
           └───────────┘
```

---

# 74. Domain Dependency Direction

The intended semantic dependency direction is:

```text
Profile
   ↓
Preset
   ↓
Capability
```

not:

```text
Profile
   ↓
Package
```

And:

```text
Capability
   ↓
Implementation Mapping
   ↓
Component
   ↓
Package
   ↓
Provider
```

This inversion keeps user intent independent from providers.

---

# 75. Provider Independence Invariant

Consumer configuration should not normally depend on provider identity.

Preferred:

```text
frontend-engineer
→ engineering.testing.tdd
```

Avoid:

```text
frontend-engineer
→ superpowers/test-driven-development
```

Provider-specific configuration belongs in:

```text
catalog
implementation mappings
explicit advanced override
```

---

# 76. Target Independence Invariant

Core capabilities must remain runtime-neutral.

Preferred:

```text
engineering.testing.tdd
```

Avoid:

```text
claude.testing.tdd
codex.testing.tdd
```

Target-specific implementation belongs in:

```text
component metadata
resolution
target adapter
```

---

# 77. Composition Invariant

Reuse should primarily occur through Presets.

Preferred:

```text
Profile
├── workflow/core
├── engineering/core
└── frontend
```

Avoid deep inheritance chains between Profiles.

---

# 78. Resolution Invariant

Resolution must remain deterministic for identical inputs.

Conceptually:

```text
resolve(context) = resolution
```

For the same normalized context:

```text
resolution A
=
resolution B
```

---

# 79. Explainability Invariant

Every selected implementation should be explainable through a dependency path.

Example:

```text
Project
→ frontend-engineer
→ engineering/core
→ engineering.testing.tdd
→ Superpowers
```

If the system cannot explain why an implementation exists, the model is incomplete.

---

# 80. Provenance Invariant

Every resolved external component should retain enough provenance to identify its origin.

At minimum where available:

```text
provider
package
source
version
immutable reference
```

---

# 81. Managed-State Invariant

`agent-plugins` must not implicitly claim ownership of unrelated runtime configuration.

Only state created or explicitly adopted by `agent-plugins` belongs to Managed State.

---

# 82. Generated-State Invariant

Generated artifacts do not define domain truth.

The dependency direction must remain:

```text
Domain Model
      ↓
Canonical Metadata
      ↓
Generated Runtime Artifacts
```

Never:

```text
Generated Runtime Artifact
      ↓
defines Domain Model
```

---

# 83. Domain State Transitions

A typical external component moves through:

```text
Discovered
   ↓
Curated
   ↓
Mapped
   ↓
Eligible
   ↓
Selected
   ↓
Locked
   ↓
Materialized
```

An implementation may later become:

```text
Deprecated
   ↓
Removed
```

---

# 84. Resolution State Model

Conceptually:

```text
Unknown
   ↓
Candidate
   ├── Rejected
   │
   └── Eligible
         ├── Suppressed
         │
         └── Selected
                ↓
              Locked
                ↓
            Materialized
```

This terminology should be used consistently in resolver diagnostics.

---

# 85. Example — Frontend Engineer

```text
Profile
frontend-engineer

      ↓

Presets
workflow/core
engineering/core
domains/frontend
stacks/typescript

      ↓

Capability
engineering.testing.tdd

      ↓

Candidates
Superpowers
Matt Pocock
ECC

      ↓

Policy + Target

      ↓

Selected
Superpowers/test-driven-development

      ↓

Package
superpowers

      ↓

Lockfile

      ↓

Claude Code Adapter
```

---

# 86. Example — Second Brain

```text
Profile
second-brain

      ↓

Presets
knowledge/research
knowledge/writing
knowledge/synthesis
tools/obsidian

      ↓

Capabilities
knowledge.research
knowledge.writing
knowledge.synthesis
knowledge.management

      ↓

Implementations
Native
Matt Pocock
ECC
other curated providers

      ↓

Resolution

      ↓

No unrelated engineering workflows
```

This example validates that the domain is not coding-specific.

---

# 87. Example — Policy Changes Resolution

Given:

```text
Capability:
security.review
```

Candidates:

```text
Provider A
priority: 100
trust: community

Provider B
priority: 80
trust: curated
```

Policy:

```text
allow:
first-party
official
curated
```

Resolution:

```text
Provider A
→ Rejected by policy

Provider B
→ Eligible
→ Selected
```

This demonstrates:

```text
policy > priority
```

---

# 88. Example — Package and Component Separation

Package:

```text
superpowers
```

Components:

```text
planning
debugging
TDD
verification
```

Resolved capabilities:

```text
planning
debugging
verification
```

TDD may be provided elsewhere.

The package may still be installed once because selected components require it.

Therefore:

```text
Package installation
does not imply
all package components are semantically selected
```

This distinction must remain explicit throughout the architecture.

---

# 89. Canonical Vocabulary

The following terms are canonical and should be used consistently:

```text
Provider
Package
Component
Capability
Capability Implementation
Capability Requirement

Preset
Profile
Project
Policy

Candidate
Eligible Candidate
Selected Implementation
Suppressed Implementation
Rejected Implementation

Resolution
Resolution Decision
Resolution Context

Target
Source Adapter
Target Adapter
Materialization

Desired State
Actual State
Managed State
Sync

Catalog
Project Lockfile
Distribution Lock

Provenance
Trust
Integrity

Diagnostic
Update
Update Impact
```

Avoid introducing synonyms for these concepts without a clear need.

---

# 90. Terms Intentionally Not First-Class

The following terms may be used in UX or conversation but are not first-class domain entities in V1:

```text
Addon
Bundle
Overlay
Persona
Environment Pack
Plugin Group
```

For example:

```text
Addon
→ represented internally as an optional Preset
```

This helps keep the domain model small.

---

# 91. Aggregate Boundaries

At the conceptual domain level, the main consistency boundaries are:

## Catalog Aggregate

Contains:

```text
Provider
Package
Capability
Implementation Mapping
```

Responsible for:

```text
identity
references
curation
availability
```

---

## Composition Aggregate

Contains:

```text
Preset
Profile
```

Responsible for:

```text
reusable capability intent
```

---

## Project Aggregate

Contains:

```text
Project
Policy Selection
Target Selection
Overrides
```

Responsible for:

```text
consumer desired state
```

---

## Resolution Aggregate

Contains:

```text
Resolution
Resolution Decisions
Selected Implementations
Diagnostics
```

Responsible for:

```text
deterministic concrete selection
```

---

## Lock Aggregate

Contains:

```text
Project Lockfile
immutable package/component resolution
```

Responsible for:

```text
reproducibility
```

These are conceptual boundaries; they do not require separate databases or services.

---

# 92. Domain Services

Some behavior does not naturally belong to one entity.

These operations are domain services conceptually.

Examples:

```text
Capability Resolver

Policy Evaluator

Conflict Resolver

Dependency Graph Validator

Target Compatibility Evaluator

Lockfile Builder

Resolution Explainer
```

Their implementation belongs in architecture, not in this document.

---

# 93. Core Domain

The true core domain of `agent-plugins` is not package downloading.

It is:

```text
Capability Modeling
+
Composition
+
Policy-Aware Resolution
+
Explainability
+
Reproducibility
```

Provider integration and target materialization support that core.

This distinction should influence architecture priorities.

---

# 94. Supporting Domains

Supporting domains include:

```text
Source Discovery

Package Retrieval

Runtime Materialization

CLI Presentation

Update Detection

Catalog Generation
```

These are important but should not define the core semantic model.

---

# 95. Domain Invariants Summary

The most important invariants are:

```text
1. Capability IDs are provider-independent.

2. Profiles primarily compose Presets.

3. Presets primarily compose Capabilities.

4. Provider selection occurs during resolution.

5. Policy filtering happens before preference selection.

6. Cardinality-one capabilities resolve to at most one active implementation.

7. Identical inputs produce deterministic resolution.

8. Every selected implementation is explainable.

9. External components retain provenance.

10. Package installation does not imply semantic activation of every contained component.

11. Target-specific behavior does not redefine semantic capability identity.

12. Generated artifacts are not authoritative domain state.

13. Sync manages only explicitly managed runtime state.

14. Project intent and user role remain distinct.

15. LLM behavior is not required for deterministic core resolution.
```

---

# 96. Domain Model in One Sentence

> **`agent-plugins` models external tooling as Providers containing Packages and Components, normalizes those Components into semantic Capabilities, composes Capabilities through Presets and Profiles, constrains them through Project and Policy context, and deterministically resolves them into a reproducible runtime environment.**