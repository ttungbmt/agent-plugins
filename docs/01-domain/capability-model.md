# Capability Model

## Overview

This document defines the canonical capability model used by `agent-plugins`.

A **Capability** represents a publisher-independent semantic ability that an agent environment can provide.

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
security.review
frontend.design
knowledge.research
product.discovery
```

Capabilities form the semantic layer between:

```text
User Intent
    ↓
Capability
    ↓
Implementation
    ↓
Publisher Package / Component
```

The capability model exists so that users, roles, presets, and projects can describe **what they need** without directly depending on **who implements it**.

---

# 1. Capability as the Core Abstraction

The central principle is:

> **Capabilities describe intent. Components provide implementations.**

For example:

```text
Capability
engineering.testing.tdd
```

may be implemented by:

```text
Superpowers / test-driven-development

Matt Pocock / tdd

ECC / tdd-workflow
```

A consumer should normally depend on:

```text
engineering.testing.tdd
```

rather than:

```text
superpowers/test-driven-development
```

This creates a stable semantic boundary above fast-moving publishers.

---

# 2. Capability Responsibilities

A Capability is responsible for describing:

```text
semantic identity
meaning
namespace
cardinality
dependencies
compatibility constraints
lifecycle state
implementation candidates
```

A Capability is **not** responsible for:

```text
installation
source discovery
publisher fetching
runtime file generation
package download
```

Those concerns belong to other parts of the system.

---

# 3. Capability Identity

Every Capability must have a globally unique canonical identifier.

The identifier must describe semantic intent.

Preferred:

```text
engineering.testing.tdd
```

Avoid:

```text
superpowers.tdd
ecc.tdd
claude.tdd
```

Publisher names and runtime names must not normally appear in Capability IDs.

---

# 4. Capability ID Format

Capability IDs use dot-separated hierarchical namespaces.

Recommended form:

```text
<domain>.<area>.<capability>
```

Examples:

```text
workflow.planning

engineering.requirements
engineering.architecture
engineering.testing.tdd

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

Two-level IDs are acceptable when additional hierarchy provides little value:

```text
security.review
workflow.planning
```

---

# 5. Namespace Goals

Capability namespaces should optimize for:

```text
semantic clarity
stability
discoverability
composition
future extension
```

They should not mirror:

```text
repository folder structures
publisher naming conventions
runtime configuration formats
temporary implementation details
```

---

# 6. Initial Top-Level Namespaces

The initial catalog may use namespaces such as:

```text
workflow
engineering
frontend
backend
security
devops
data
database
knowledge
product
design
research
automation
gis
runtime
tooling
```

This list may evolve.

Adding a top-level namespace should require a genuine semantic distinction rather than convenience.

---

# 7. Workflow Namespace

The `workflow` namespace represents high-level working processes.

Examples:

```text
workflow.brainstorming
workflow.planning
workflow.execution
workflow.verification
workflow.code-review
workflow.branch-completion
```

These are usually strong candidates for:

```text
cardinality: one
```

because multiple competing workflow owners can create contradictory instructions.

---

# 8. Engineering Namespace

The `engineering` namespace represents software engineering practices that are broadly stack-independent.

Examples:

```text
engineering.requirements
engineering.domain-modeling
engineering.architecture
engineering.codebase-design

engineering.testing.tdd
engineering.testing.unit
engineering.testing.integration
engineering.testing.e2e

engineering.debugging
engineering.review
engineering.refactoring
engineering.verification
```

---

# 9. Stack and Domain Capabilities

Capabilities should describe semantic behavior, not reusable compositions.

For example:

```text
frontend.react
frontend.nextjs
frontend.accessibility
frontend.design
```

may exist as Capabilities.

But:

```text
stacks/nextjs
```

is a Preset, not a Capability.

Therefore:

```text
Capability
→ one semantic ability

Preset
→ composition of capabilities
```

---

# 10. Capability Description

Every canonical Capability should have a short, implementation-independent description.

Example:

```yaml
id: engineering.testing.tdd

description: >
  Guides development using a test-first cycle where expected behavior
  is expressed through tests before implementation.
```

The description should explain:

```text
what the capability provides
```

not:

```text
how a particular publisher implements it
```

---

# 11. Capability Cardinality

Each Capability must define a cardinality.

Initial values:

```text
one
many
```

---

# 12. Cardinality: One

`one` means that only one implementation should normally be active for the capability.

Example:

```yaml
id: engineering.testing.tdd
cardinality: one
```

Typical examples:

```text
workflow.planning
workflow.execution
engineering.testing.tdd
engineering.debugging
engineering.review
```

These capabilities represent methodologies or behavioral ownership where multiple implementations may compete.

---

# 13. Cardinality: Many

`many` means multiple implementations may be active simultaneously.

Example:

```yaml
id: knowledge.research
cardinality: many
```

Typical examples may include:

```text
knowledge.research
tooling.browser
database.postgresql
security.knowledge
```

Multiple implementations may provide complementary functionality.

---

# 14. Cardinality Is Semantic

Cardinality belongs to the Capability, not to a Publisher.

For example:

```text
engineering.testing.tdd
```

should remain:

```text
cardinality: one
```

regardless of whether there are:

```text
2 publishers
5 publishers
20 publishers
```

The number of available implementations does not determine cardinality.

---

# 15. Cardinality Is Not Package Count

A cardinality of:

```text
one
```

does not mean only one Package may be installed.

Example:

```text
Package A
provides selected debugging component

Package B
provides selected planning component
```

Both packages may contain TDD implementations.

Only one TDD Component should be semantically selected.

Therefore:

```text
Capability cardinality
≠
Package installation cardinality
```

---

# 16. Capability Implementation

A **Capability Implementation** maps one Component to one Capability.

Conceptually:

```text
Capability
engineering.testing.tdd

Implementation
superpowers/superpowers#skill:test-driven-development
```

An implementation may include metadata such as:

```text
priority
status
target compatibility
trust constraints
version constraints
notes
```

---

# 17. Many-to-Many Mapping

The model must support:

```text
one Capability
→ many Components
```

and:

```text
one Component
→ multiple Capabilities
```

Example:

```text
Component:
architecture-review-agent

implements:

engineering.architecture
engineering.review
```

However, multi-capability mappings should be used carefully.

Capabilities should not be collapsed merely because one publisher combines them in one Component.

---

# 18. Mapping Must Preserve Semantic Boundaries

Suppose a Component provides:

```text
planning
TDD
debugging
review
```

The catalog should not create:

```text
engineering.super-workflow
```

simply because one publisher bundles those behaviors together.

Instead it should map the Component to the appropriate semantic capabilities where justified.

The Capability model must remain independent from publisher packaging.

---

# 19. Implementation Priority

Each implementation may define a resolution priority.

Example:

```yaml
capability: engineering.testing.tdd

implementations:
  - component: superpowers/superpowers#skill:test-driven-development
    priority: 100

  - component: mattpocock/skills#skill:tdd
    priority: 80

  - component: ecc/ecc#skill:tdd-workflow
    priority: 70
```

Higher values represent stronger default preference.

---

# 20. Priority Is Not Trust

Priority answers:

> Which eligible implementation is preferred?

Trust answers:

> Is this implementation eligible under policy?

Therefore the resolution order should conceptually be:

```text
Candidates
    ↓
Hard Constraints
    ↓
Policy
    ↓
Target Compatibility
    ↓
Eligibility
    ↓
Priority
```

Never:

```text
Priority
    ↓
ignore policy
```

---

# 21. Priority Is Contextual

A default catalog priority may exist.

However, resolution may also consider:

```text
policy preference
target-specific preference
project override
version availability
compatibility
```

The effective order may therefore differ from the base catalog priority.

---

# 22. Explicit Override

A Project may explicitly select a specific implementation.

Conceptually:

```yaml
overrides:
  implementations:
    engineering.testing.tdd:
      component: mattpocock/skills#skill:tdd
```

An explicit override should normally have stronger preference than default priority.

However, it still must satisfy hard constraints such as:

```text
policy
target compatibility
availability
dependency validity
```

An override should not automatically bypass security policy.

---

# 23. Capability Requirement

A Capability Requirement indicates that a Capability should be present in the desired environment.

Possible origins:

```text
Preset
Role
Project
Capability dependency
```

Each requirement should ideally retain provenance.

Example:

```text
engineering.testing.tdd

required by:

Project
→ frontend-engineer
→ engineering/core
```

This provenance supports:

```text
explainability
conflict diagnostics
disable behavior
```

---

# 24. Required Capability

A required capability must resolve successfully.

Example:

```yaml
capabilities:
  required:
    - engineering.testing.tdd
```

If no eligible implementation exists:

```text
resolution fails
```

---

# 25. Optional Capability

An optional capability improves the environment but does not make the environment invalid if unavailable.

Conceptually:

```yaml
capabilities:
  optional:
    - browser.visual-regression
```

If unavailable, the resolver may emit:

```text
warning
```

rather than failure.

V1 may initially treat most declared capabilities as required if optional semantics are not yet necessary.

---

# 26. Capability Dependencies

A Capability may depend on another Capability.

Example:

```text
engineering.testing.e2e

requires:

tooling.browser
```

This dependency should remain semantic.

Avoid:

```text
engineering.testing.e2e
requires package X
```

unless the dependency is implementation-specific.

---

# 27. Hard Capability Dependency

A hard dependency means the required Capability must also resolve.

Example:

```yaml
id: engineering.testing.e2e

requires:
  - tooling.browser
```

Resolution becomes:

```text
engineering.testing.e2e
       ↓
tooling.browser
```

If `tooling.browser` cannot resolve:

```text
engineering.testing.e2e
```

must also fail.

---

# 28. Optional Capability Dependency

An optional dependency adds functionality but is not required.

Example:

```text
knowledge.research

optionally uses:

tooling.browser
```

The absence of the optional dependency does not invalidate `knowledge.research`.

---

# 29. Capability Dependency Cycles

Capability dependency graphs must be acyclic.

Invalid:

```text
Capability A
→ Capability B
→ Capability C
→ Capability A
```

Cycle detection should occur during validation before final resolution.

---

# 30. Implementation Dependencies

A Component may have implementation-specific dependencies.

Example:

```text
security-review-agent
requires
filesystem-search-tool
```

These dependencies belong to Component or Package metadata rather than the Capability itself.

This distinction is important:

```text
Capability Dependency
→ semantic requirement

Component Dependency
→ implementation requirement
```

---

# 31. Capability Conflicts

Capabilities themselves may occasionally conflict.

Example:

```text
workflow.strict-tdd
conflicts with
workflow.prototype-first
```

However, explicit Capability-level conflicts should be uncommon.

Prefer modeling overlap through:

```text
shared capability identity
+
cardinality
```

whenever possible.

---

# 32. Implicit Conflict

The most common conflict is implicit.

Example:

```text
engineering.testing.tdd
cardinality: one
```

If two implementations are selected:

```text
implementation A
implementation B
```

they conflict automatically.

No explicit conflict declaration is required.

---

# 33. Explicit Implementation Conflict

Two Components may conflict even when they implement different capabilities.

Example:

```text
Component A
conflictsWith:
  - Component B
```

Potential reasons:

```text
same command name
incompatible hooks
contradictory runtime configuration
mutually exclusive execution models
```

Explicit implementation conflicts belong to implementation metadata.

---

# 34. Capability Ownership

Some capabilities behave like workflow owners.

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
```

These should normally have:

```text
cardinality: one
```

The selected implementation becomes the **active owner** of that capability.

---

# 35. Capability Ownership Does Not Mean Publisher Ownership

For example:

```text
Superpowers
```

may be selected as the active owner of:

```text
engineering.testing.tdd
```

for a particular Resolution.

This does not mean:

```text
Superpowers permanently owns the capability
```

The Capability remains publisher-independent.

Another Project or Policy may resolve differently.

---

# 36. Capability Categories

Capabilities may include category metadata for browsing and discovery.

Example:

```yaml
category: testing
```

Categories are informational.

They should not replace hierarchical Capability IDs.

---

# 37. Capability Tags

Capabilities may contain tags.

Example:

```yaml
tags:
  - testing
  - discipline
  - engineering
```

Tags support:

```text
search
discovery
documentation
future recommendation
```

They should not participate in deterministic resolution unless explicitly specified by a later feature.

---

# 38. Capability Stability

Capabilities may expose a stability classification.

Suggested lifecycle:

```text
experimental
stable
deprecated
removed
```

---

# 39. Experimental Capability

An experimental Capability may still change:

```text
name
scope
semantics
dependencies
```

Example:

```yaml
stability: experimental
```

Experimental capabilities should be used carefully in long-lived roles.

---

# 40. Stable Capability

A stable Capability has established semantics.

Changes to a stable Capability should avoid changing its fundamental meaning.

If semantics change substantially, introducing a new Capability ID may be preferable.

---

# 41. Deprecated Capability

A deprecated Capability remains known for migration and compatibility.

Example:

```yaml
status: deprecated
replacement: engineering.testing.tdd
```

Deprecated capabilities should not normally appear in new Presets.

---

# 42. Removed Capability

A removed Capability is no longer part of active catalog resolution.

It may remain documented for:

```text
lockfile compatibility
migration
historical reference
```

---

# 43. Capability Renaming

Renaming a Capability ID is a breaking semantic change.

Prefer:

```text
old capability
→ deprecated

new capability
→ introduced

migration mapping
→ documented
```

rather than silently changing identifiers.

---

# 44. Capability Alias

Aliases may support discovery or migration.

Example:

```yaml
aliases:
  - tdd
  - test-driven-development
```

Aliases should resolve to exactly one canonical Capability.

They must not create alternate canonical identities.

---

# 45. Capability Granularity

Capabilities should be neither too broad nor too narrow.

Too broad:

```text
engineering
```

Too narrow:

```text
engineering.testing.tdd.red-phase.write-one-failing-test
```

Preferred:

```text
engineering.testing.tdd
```

A useful Capability should represent a meaningful unit of user intent.

---

# 46. Capability Splitting Rule

Split a Capability when the behaviors can reasonably be:

```text
requested independently
implemented independently
resolved independently
governed independently
```

Example:

```text
engineering.testing.tdd
engineering.testing.e2e
```

should remain separate.

---

# 47. Capability Merging Rule

Do not create separate Capabilities merely because publishers use different terms.

For example:

```text
tdd
test-driven-development
testing-discipline
```

may all map to:

```text
engineering.testing.tdd
```

if their semantic intent is substantially equivalent.

---

# 48. Semantic Equivalence

Two Components may map to the same Capability when they provide sufficiently equivalent user intent.

They do not need to be implementation-identical.

Example:

```text
Publisher A:
test-driven-development

Publisher B:
tdd-workflow
```

Both may represent:

```text
engineering.testing.tdd
```

even if their detailed instructions differ.

---

# 49. Semantic Similarity Is Not Always Equivalence

Two components that sound similar may still deserve different Capabilities.

Example:

```text
engineering.review
```

versus:

```text
security.review
```

Both involve review, but the intended outcomes differ.

Capability mapping requires semantic judgment.

---

# 50. Capability Mapping Criteria

When mapping a Component to a Capability, maintainers should consider:

```text
primary user intent

expected output

workflow ownership

scope

preconditions

side effects

runtime behavior
```

A name match alone is not sufficient.

---

# 51. One Component, Multiple Capabilities

A Component may provide several semantic capabilities.

Example:

```text
architecture-agent
```

may provide:

```text
engineering.architecture
engineering.codebase-design
```

This mapping is allowed.

However, only map capabilities that the Component genuinely provides.

Avoid inflating mappings for discovery purposes.

---

# 52. One Capability, Multiple Components From Same Package

A Package may contain multiple Components that implement the same Capability.

Example:

```text
Package X

skill:tdd
agent:tdd-coach
```

Both might implement:

```text
engineering.testing.tdd
```

The catalog may:

```text
prefer one
treat them as a composite implementation
or allow both if semantics justify it
```

This should be explicit.

---

# 53. Composite Implementation

Some Capabilities may require multiple Components from the same or different Packages to function as one implementation.

Conceptually:

```text
Capability
security.review

Implementation
├── security-review-agent
├── static-analysis-command
└── security-rules
```

The model may represent such a case as an implementation set.

This should be introduced only where necessary.

Simple one-component mappings are preferable.

---

# 54. Implementation Set

An **Implementation Set** conceptually groups multiple Components that jointly satisfy one Capability.

Example:

```yaml
capability: security.review

components:
  - ecc/ecc#agent:security-reviewer
  - ecc/ecc#command:security-scan
```

The set should resolve atomically when required.

V1 may defer explicit first-class Implementation Sets if existing Package/Component dependency modeling is sufficient.

---

# 55. Capability Source Independence

A Capability must remain valid even if every current implementation disappears.

For example:

```text
engineering.testing.tdd
```

still represents meaningful user intent even if a specific publisher is removed.

This separation is central to long-term stability.

---

# 56. Target Independence

Capabilities must remain runtime-independent.

Preferred:

```text
frontend.design
```

Avoid:

```text
claude.frontend.design
```

Target compatibility belongs to implementations.

---

# 57. Target-Specific Implementations

The same Capability may resolve to different Components depending on Target.

Example:

```text
engineering.testing.tdd

Claude Code
→ Component A

Codex
→ Component B
```

The Capability remains unchanged.

---

# 58. Capability Availability

A Capability may have different availability states per Resolution Context.

Examples:

```text
available
partially available
unavailable
```

Availability depends on:

```text
catalog
policy
target
version
publisher state
```

---

# 59. Capability Support Status

For a Target, support may conceptually be:

```text
supported
partial
unsupported
```

Example:

```text
workflow.external-hook

Claude Code
→ supported

Runtime B
→ unsupported
```

Support status should be derived from implementation availability rather than embedded directly into Capability semantics where possible.

---

# 60. Capability Selection Pipeline

For each Capability Requirement:

```text
Capability Requirement
        ↓
Find Implementations
        ↓
Check Availability
        ↓
Apply Policy
        ↓
Check Target Compatibility
        ↓
Check Dependencies
        ↓
Check Conflicts
        ↓
Determine Eligible Candidates
        ↓
Apply Overrides
        ↓
Apply Preference / Priority
        ↓
Apply Cardinality
        ↓
Select Implementation(s)
```

---

# 61. Eligibility Before Preference

The resolver must first determine:

```text
Can this candidate be used?
```

Only then:

```text
Should this candidate be preferred?
```

Therefore:

```text
Eligibility
    ↓
Preference
```

not:

```text
Preference
    ↓
Eligibility
```

---

# 62. Hard Resolution Constraints

A candidate should be rejected when it violates a hard constraint such as:

```text
policy deny
unsupported target
missing required dependency
unavailable locked version
explicit incompatibility
disabled implementation
```

Rejected candidates do not participate in preference ranking.

---

# 63. Soft Resolution Preferences

Examples of soft preference signals:

```text
catalog priority
publisher preference
official-source preference
curated-source preference
target-specific preference
existing lockfile preference
```

These influence selection among eligible candidates.

---

# 64. Existing Lock Preference

When preserving a valid lockfile, the resolver may prefer the currently locked implementation over switching automatically to another equally valid candidate.

This supports stability.

Conceptually:

```text
valid existing lock
>
unnecessary implementation churn
```

unless an explicit update operation requests reconsideration.

---

# 65. Deterministic Tie-Breaking

If multiple candidates remain equally preferred, the resolver must use a documented deterministic rule or fail explicitly.

Possible deterministic final tie-breakers may include:

```text
canonical publisher ID
canonical package ID
canonical component ID
```

However, silently choosing alphabetically may hide a missing product decision.

For important `cardinality: one` capabilities, an explicit ambiguity error may be preferable.

---

# 66. Capability Resolution Output

For every resolved Capability, the Resolution should be able to represent:

```text
capability ID
requirement sources
cardinality

candidate implementations

selected implementation(s)
suppressed implementations
rejected implementations

resolution reason
diagnostics
```

This supports `ap explain`.

---

# 67. Example Resolution

```text
Capability:
engineering.testing.tdd

Cardinality:
one

Required by:
frontend-engineer
→ engineering/core

Candidates:

1. Superpowers / test-driven-development
   policy: allowed
   target: supported
   priority: 100
   status: selected

2. Matt Pocock / tdd
   policy: allowed
   target: supported
   priority: 80
   status: suppressed

3. ECC / tdd-workflow
   policy: denied
   target: supported
   priority: 70
   status: rejected
```

---

# 68. Explainability Requirements

A Capability resolution should be explainable through:

```text
Why was this capability required?

Which implementations were considered?

Which candidates were rejected?

Why were they rejected?

Why was this candidate selected?

Which package must be installed?

Which publisher owns that package?
```

---

# 69. Capability Provenance

The Capability itself is semantic and project-owned.

Its implementations retain upstream provenance.

Example:

```text
Capability:
engineering.testing.tdd

Implementation provenance:
publisher: superpowers
package: superpowers
repository: ...
version: ...
commit: ...
```

Do not place upstream repository identity inside the Capability ID.

---

# 70. Capability Catalog Entry

A conceptual Capability manifest may look like:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.testing.tdd
  name: Test-Driven Development

spec:
  description: >
    Provides a test-first development workflow.

  cardinality: one

  stability: stable

  tags:
    - testing
    - engineering

  implementations:
    - component: superpowers/superpowers#skill:test-driven-development
      priority: 100

    - component: mattpocock/skills#skill:tdd
      priority: 80

    - component: ecc/ecc#skill:tdd-workflow
      priority: 70
```

Exact schema belongs in later specification documents.

---

# 71. Preset Capability Reference

A Preset should normally reference Capability IDs.

Example:

```yaml
id: engineering/core

capabilities:
  - workflow.planning
  - engineering.testing.tdd
  - engineering.debugging
  - engineering.review
```

The Preset should not normally choose implementations.

---

# 72. Role Capability Flow

A Role should normally reach Capabilities through Presets.

Example:

```text
frontend-engineer
    ↓
engineering/core
    ↓
engineering.testing.tdd
```

Direct Role → Capability references may be supported if useful, but Preset composition should remain the preferred pattern.

---

# 73. Project Capability Flow

A Project may add capabilities through:

```text
Role
Preset
explicit capability override
```

Conceptually:

```text
Project
├── Role
│   └── Presets
│       └── Capabilities
│
├── Additional Presets
│   └── Capabilities
│
└── Overrides
    ├── enable
    └── disable
```

---

# 74. Capability Enable Override

A project may explicitly enable a Capability.

Example:

```yaml
overrides:
  capabilities:
    enable:
      - security.review
```

This behaves like an additional Capability Requirement.

---

# 75. Capability Disable Override

A Project may disable an inherited Capability.

Example:

```yaml
overrides:
  capabilities:
    disable:
      - tooling.browser
```

If another required Capability has a hard dependency on the disabled Capability, resolution must fail rather than silently creating an invalid environment.

---

# 76. Disable Semantics

When disabling a Capability, the system should track:

```text
what requested it
what disabled it
whether dependencies still require it
```

This enables explainability.

Example:

```text
tooling.browser

required by:
frontend/testing

disabled by:
project override

result:
conflict — still required by engineering.testing.e2e
```

---

# 77. Capability Deduplication

If multiple Presets require the same Capability:

```text
engineering/core
→ engineering.testing.tdd

frontend/testing
→ engineering.testing.tdd
```

the desired Capability should appear once.

Its requirement provenance should retain both sources.

Conceptually:

```text
engineering.testing.tdd

required by:
- engineering/core
- frontend/testing
```

---

# 78. Requirement Aggregation

Capability requirements should be aggregated before implementation selection.

Preferred:

```text
Collect all requirements
        ↓
Deduplicate capability IDs
        ↓
Build dependency graph
        ↓
Resolve implementations
```

Avoid resolving each Preset independently.

That could activate multiple competing implementations of the same semantic Capability.

---

# 79. Capability Graph

Capabilities form a semantic dependency graph.

Example:

```text
engineering.testing.e2e
        │
        ├── tooling.browser
        │
        └── engineering.testing.integration
```

The graph enables:

```text
dependency validation
cycle detection
resolution ordering
explainability
impact analysis
```

---

# 80. Capability Graph vs Package Graph

These are separate graphs.

Capability graph:

```text
semantic dependencies
```

Package graph:

```text
installation dependencies
```

Example:

```text
Capability A
→ Capability B
```

may resolve to:

```text
Package X
Package Y
```

while Package X may independently depend on Package Z.

The resolver must not conflate these layers.

---

# 81. Capability Graph vs Preset Graph

Preset graph describes composition:

```text
Preset A
→ Preset B
```

Capability graph describes semantic dependencies:

```text
Capability A
→ Capability B
```

Both must remain independently valid and acyclic where applicable.

---

# 82. Capability Impact Analysis

When an implementation changes, the system should be able to identify affected capabilities.

Example:

```text
Publisher update
    ↓
Component changed
    ↓
Mapped Capability
engineering.testing.tdd
    ↓
Affected Presets
engineering/core
frontend/testing
    ↓
Affected Roles
frontend-engineer
backend-engineer
```

This supports update review.

---

# 83. Reverse References

The catalog should eventually make it possible to navigate:

```text
Capability
→ Implementations
```

and:

```text
Capability
→ Presets
→ Roles
```

This improves:

```text
search
documentation
impact analysis
debugging
```

Generated indexes may support these reverse relationships.

---

# 84. Capability Search

Search should prioritize Capability identity over implementation identity.

Example:

```bash
ap search tdd
```

Preferred output:

```text
Capability
engineering.testing.tdd

Implementations
- Superpowers ...
- Matt Pocock ...
- ECC ...
```

rather than displaying raw repository names first.

---

# 85. Capability Discovery

Users should be able to discover capabilities by:

```text
ID
name
description
alias
tag
Preset
Role
```

Publisher identity should be secondary.

---

# 86. Capability Documentation

Each important Capability should eventually document:

```text
ID
name
description
cardinality
dependencies
typical use
implementations
status
related capabilities
```

This documentation may be generated from catalog metadata where practical.

---

# 87. Capability Families

Related Capabilities may form semantic families.

Example:

```text
engineering.testing

├── engineering.testing.tdd
├── engineering.testing.unit
├── engineering.testing.integration
└── engineering.testing.e2e
```

Families are represented through namespace hierarchy rather than a separate first-class entity in V1.

---

# 88. Capability Variant

Avoid creating variants merely for publisher differences.

Bad:

```text
engineering.testing.tdd.superpowers
engineering.testing.tdd.ecc
```

Good:

```text
engineering.testing.tdd
```

with multiple implementations.

---

# 89. Capability Scope

A Capability may be relevant at different scopes:

```text
global
role
project
task
```

However, scope should generally belong to composition or resolution context rather than the Capability definition.

For example:

```text
engineering.testing.tdd
```

remains the same Capability whether requested by a Role or Project.

---

# 90. Task-Level Capabilities

Future versions may support temporary task-level Capability Requirements.

Example:

```text
Current task:
security audit

temporarily require:
security.review
security.threat-modeling
```

This should reuse the same Capability model rather than creating a separate task plugin model.

Task-level composition is not required for V1.

---

# 91. Capability Policy Interaction

Policy may evaluate implementation metadata.

Example:

```text
Capability:
security.review

Candidate A:
trust: community

Candidate B:
trust: curated

Policy:
deny community
```

Result:

```text
A → rejected
B → eligible
```

The Policy does not alter the meaning of the Capability.

---

# 92. Capability Trust

Capabilities themselves should generally not have trust classifications.

Trust belongs to:

```text
Publisher
Package
Component
Implementation
```

Example:

```text
engineering.testing.tdd
```

is neither trusted nor untrusted.

Its implementations may have different trust levels.

---

# 93. Capability Security Classification

Some semantic capabilities may indicate security significance.

For example:

```text
security.review
```

But executable risk should still be evaluated at the Component level.

A harmless instructional skill and an executable hook may both contribute to the same Capability but have very different security implications.

---

# 94. Capability Resolution and Lockfiles

The Project Lockfile should capture the relationship:

```text
Capability
→ selected implementation
→ Component
→ Package
→ Publisher
→ immutable version
```

Example:

```text
engineering.testing.tdd
→ superpowers/...#skill:test-driven-development
→ package superpowers
→ commit abc123
```

This preserves both semantic intent and concrete reproducibility.

---

# 95. Lockfile Should Preserve Suppression Context

Where practical, the lockfile or resolution metadata may preserve enough information to explain:

```text
selected candidate
suppressed candidates
selection reason
```

Not all rejected candidate information must necessarily be persisted forever.

The exact boundary belongs in `lockfile-spec.md`.

---

# 96. Capability Resolution and Updates

Normal sync should preserve locked implementations where valid.

Update operations may reevaluate:

```text
new versions
new candidates
changed priority
removed implementations
changed policy compatibility
```

This separation avoids silent implementation switching.

---

# 97. Capability Migration

When a Capability is replaced:

```text
old.capability
→ deprecated

new.capability
→ preferred
```

migration tooling should eventually be able to identify affected:

```text
Presets
Roles
Projects
Lockfiles
```

---

# 98. Capability Validation Rules

At minimum, catalog validation should verify:

```text
Capability ID is unique

Capability ID follows naming rules

cardinality is valid

implementation references exist

dependencies reference valid capabilities

dependency graph is acyclic

replacement capability exists when deprecated

aliases do not collide

implementation priorities are valid
```

---

# 99. Implementation Validation Rules

For each Capability Implementation:

```text
Component exists

Component belongs to a valid Package

Package belongs to a valid Publisher

target metadata is valid

priority is valid

status is valid

security metadata is structurally valid
```

---

# 100. Semantic Review Rules

Some validation cannot be fully automated.

Human review is required for:

```text
whether two implementations are semantically equivalent

whether a capability is too broad

whether a capability is too narrow

whether cardinality should be one or many

whether a mapping exaggerates what a Component provides
```

The capability catalog is therefore curated, not purely generated.

---

# 101. Capability Addition Checklist

Before adding a new Capability, ask:

```text
1. What user intent does it represent?

2. Can the user reasonably request it independently?

3. Is there already a Capability with equivalent meaning?

4. Is this semantic or publisher-specific?

5. Is this semantic or runtime-specific?

6. What should its cardinality be?

7. Does it depend on another Capability?

8. Which Components currently implement it?

9. Is the name likely to remain stable?

10. Would this be better represented as a Preset?
```

---

# 102. Capability vs Preset Decision

Use a Capability when describing:

```text
one semantic ability
```

Use a Preset when describing:

```text
a reusable combination of abilities
```

Example:

```text
engineering.testing.tdd
→ Capability
```

Example:

```text
engineering/testing
→ Preset
```

which may contain:

```text
engineering.testing.tdd
engineering.testing.unit
engineering.testing.integration
engineering.testing.e2e
```

---

# 103. Capability vs Component Decision

Ask:

> Is this describing what the system should be able to do, or how it currently does it?

If:

```text
what
```

use Capability.

If:

```text
how
```

use Component.

Example:

```text
engineering.debugging
→ Capability

systematic-debugging skill
→ Component
```

---

# 104. Capability vs Role Decision

Capability:

```text
what ability is needed?
```

Role:

```text
what baseline abilities does this role need?
```

Example:

```text
product.discovery
→ Capability

product-manager
→ Role
```

---

# 105. Capability vs Policy Decision

Capability:

```text
what should exist?
```

Policy:

```text
what is allowed to satisfy it?
```

These concepts must remain independent.

---

# 106. Capability vs Target Decision

Capability:

```text
what is needed?
```

Target:

```text
where will it run?
```

Example:

```text
engineering.testing.tdd
```

may be needed on:

```text
Claude Code
Codex
Gemini
```

with different implementations.

---

# 107. Anti-Pattern — Publisher-Coupled Capability

Avoid:

```text
superpowers.planning
```

Reason:

```text
semantic intent becomes coupled to implementation
```

Prefer:

```text
workflow.planning
```

---

# 108. Anti-Pattern — Runtime-Coupled Capability

Avoid:

```text
claude.frontend-design
```

Prefer:

```text
frontend.design
```

Target support belongs to implementations.

---

# 109. Anti-Pattern — Preset as Capability

Avoid:

```text
fullstack-engineering
```

as one giant Capability if it actually represents:

```text
planning
testing
debugging
frontend
backend
database
```

That belongs in a Preset or Role.

---

# 110. Anti-Pattern — Publisher Package Equals Capability

Avoid assuming:

```text
Package Superpowers
=
Capability Superpowers
```

A Package may implement many Capabilities.

Capabilities should remain semantic.

---

# 111. Anti-Pattern — Every Skill Gets a Capability

Not every upstream Component deserves a canonical Capability.

A publisher may expose:

```text
highly specific helper skill
internal workflow step
implementation-specific command
```

The Component may:

```text
support another Capability
```

without requiring a new semantic Capability ID.

---

# 112. Anti-Pattern — Capability Explosion

Avoid creating hundreds of extremely small semantic units that users would never independently request.

Capability granularity should remain useful for:

```text
composition
resolution
policy
explanation
```

---

# 113. Anti-Pattern — Capability Monolith

Avoid making Capabilities so broad that publisher overlap becomes meaningless.

Example:

```text
software-engineering
```

is too broad for useful resolution.

---

# 114. Anti-Pattern — Priority as Universal Quality Score

Implementation priority should not be interpreted as:

```text
objective universal quality ranking
```

It means:

```text
default resolver preference in this catalog context
```

Selection still depends on:

```text
target
policy
project
version
compatibility
```

---

# 115. Anti-Pattern — Silent Capability Replacement

If an update changes:

```text
engineering.testing.tdd
```

from:

```text
Publisher A
```

to:

```text
Publisher B
```

that change should be visible.

Publisher independence does not justify hidden implementation churn.

---

# 116. Initial Workflow Capability Examples

Possible initial workflow capabilities:

```text
workflow.brainstorming
workflow.planning
workflow.execution
workflow.verification
workflow.code-review
workflow.git-worktree
workflow.branch-completion
```

The exact initial catalog should remain curated.

---

# 117. Initial Engineering Capability Examples

Possible initial engineering capabilities:

```text
engineering.requirements
engineering.domain-modeling
engineering.architecture
engineering.codebase-design

engineering.testing.tdd
engineering.testing.unit
engineering.testing.integration
engineering.testing.e2e

engineering.debugging
engineering.review
engineering.refactoring
engineering.verification
engineering.build-repair
```

---

# 118. Initial Frontend Capability Examples

```text
frontend.design
frontend.react
frontend.nextjs
frontend.accessibility
frontend.performance
frontend.testing
```

---

# 119. Initial Backend Capability Examples

```text
backend.api-design
backend.contract-design
backend.service-design
backend.integration
```

---

# 120. Initial Security Capability Examples

```text
security.review
security.threat-modeling
security.static-analysis
security.dependency-review
security.secrets-review
```

Some of these may eventually be better represented as presets or component-specific tooling after real catalog experience.

The taxonomy should remain open to refinement before stable V1.

---

# 121. Initial Knowledge Capability Examples

```text
knowledge.research
knowledge.writing
knowledge.synthesis
knowledge.management
knowledge.note-maintenance
```

---

# 122. Initial Product Capability Examples

```text
product.discovery
product.requirements
product.prioritization
product.specification
product.research
product.analysis
```

---

# 123. Initial DevOps Capability Examples

```text
devops.containerization
devops.kubernetes
devops.ci
devops.deployment
devops.observability
```

---

# 124. Initial GIS Capability Examples

```text
gis.spatial-analysis
gis.data-processing
gis.map-design
gis.routing
gis.geocoding
```

These demonstrate that the capability model can extend beyond generic software development.

---

# 125. Capability Model Evolution

The capability taxonomy should evolve conservatively.

Preferred process:

```text
identify repeated user intent
        ↓
review existing taxonomy
        ↓
propose capability
        ↓
review semantics
        ↓
assign namespace
        ↓
assign cardinality
        ↓
map implementations
        ↓
validate in real roles/projects
        ↓
stabilize
```

---

# 126. Experimental Taxonomy

Before stable V1, new Capabilities may begin as:

```text
experimental
```

This permits refinement without prematurely guaranteeing long-term identity.

Frequently reused and semantically validated Capabilities may later become:

```text
stable
```

---

# 127. Capability Governance

Changes to stable capabilities should be reviewed with attention to:

```text
semantic compatibility
affected presets
affected roles
affected implementations
existing project lockfiles
migration requirements
```

Important changes should receive an ADR when they alter core modeling principles.

---

# 128. Capability Source of Truth

Canonical Capability definitions should live in:

```text
catalog/capabilities/
```

Example:

```text
catalog/
└── capabilities/
    ├── workflow/
    ├── engineering/
    ├── frontend/
    ├── backend/
    ├── security/
    ├── product/
    ├── knowledge/
    ├── devops/
    └── gis/
```

These files are authoritative.

Generated indexes are not.

---

# 129. Generated Capability Indexes

Derived data may include:

```text
search index
reverse preset index
reverse role index
implementation index
target-support matrix
```

These should be generated from canonical catalog data.

---

# 130. Capability Model Invariants

The capability model must preserve the following invariants:

```text
1. A Capability describes semantic intent.

2. Capability IDs are publisher-independent.

3. Capability IDs are target-independent.

4. Components implement Capabilities.

5. Presets compose Capabilities.

6. Roles primarily compose Presets.

7. Multiple publishers may implement one Capability.

8. Cardinality belongs to the Capability.

9. Policy determines eligibility before priority determines preference.

10. Required Capabilities must resolve or fail explicitly.

11. Capability dependencies are semantic.

12. Component dependencies are implementation-specific.

13. Duplicate Capability Requirements are aggregated.

14. Capability graphs must remain valid and acyclic.

15. Publisher changes should not require consumer intent changes.

16. Implementation changes must remain explainable.

17. Lockfiles preserve the mapping from semantic intent to concrete implementation.

18. Capability taxonomy is curated rather than automatically inferred.

19. Generated indexes never become the source of truth.

20. Deterministic resolution must not require an LLM.
```

---

# 131. Resolution Example — TDD

```text
Project
│
├── Role
│   └── frontend-engineer
│
└── Presets
    ├── engineering/core
    └── stacks/nextjs

          ↓

Capability Requirements

engineering.testing.tdd
engineering.debugging
frontend.nextjs
...

          ↓

engineering.testing.tdd

Candidates

├── Superpowers
│   priority: 100
│   policy: allowed
│   target: supported
│
├── Matt Pocock
│   priority: 80
│   policy: allowed
│   target: supported
│
└── ECC
    priority: 70
    policy: allowed
    target: supported

          ↓

cardinality: one

          ↓

Selected

Superpowers
```

---

# 132. Resolution Example — Policy Changes Winner

```text
engineering.testing.tdd

Candidates

Superpowers
priority: 100
trust: community

Matt Pocock
priority: 80
trust: curated
```

Policy:

```text
allow:
- first-party
- official
- curated
```

Resolution:

```text
Superpowers
→ rejected

Matt Pocock
→ selected
```

This demonstrates:

```text
eligibility before preference
```

---

# 133. Resolution Example — Cardinality Many

```text
knowledge.research

cardinality: many
```

Candidates:

```text
repository research
web research
documentation research
```

If all are:

```text
eligible
compatible
non-conflicting
```

the resolver may select all three.

---

# 134. Resolution Example — Hard Dependency

```text
engineering.testing.e2e

requires:

tooling.browser
```

Resolution:

```text
engineering.testing.e2e
        ↓
tooling.browser
        ↓
browser implementation
```

If `tooling.browser` is unavailable:

```text
engineering.testing.e2e
→ unresolved
```

and the environment fails if E2E is required.

---

# 135. Resolution Example — Project Override

Default:

```text
engineering.testing.tdd
→ Superpowers
```

Project override:

```text
engineering.testing.tdd
→ Matt Pocock
```

Resolution:

```text
Matt Pocock
→ selected

Superpowers
→ suppressed
```

provided Matt Pocock remains:

```text
policy allowed
target compatible
available
```

---

# 136. Capability Model in the Overall System

```text
Publishers
    ↓
Packages
    ↓
Components
    ↓
Implementation Mapping
    ↓
Capabilities
    ↓
Presets
    ↓
Roles + Project
    ↓
Capability Requirements
    ↓
Policy
    ↓
Resolver
    ↓
Selected Implementations
    ↓
Packages
    ↓
Lockfile
    ↓
Target Adapter
```

Capability is the semantic pivot between external ecosystem structure and consumer intent.

---

# 137. Capability Model Success Criteria

The model is successful when:

```text
users can request functionality without knowing publisher names

roles remain stable when publishers change

overlapping implementations can be resolved predictably

capability conflicts are explicit

publisher updates can be analyzed semantically

multiple runtimes can use the same capability intent

catalog maintainers can introduce new publishers without redesigning roles

every selected implementation can be explained
```

---

# 138. Capability Model in One Sentence

> **A Capability is a stable, publisher-independent expression of user intent that can have multiple concrete implementations, explicit cardinality and dependencies, deterministic resolution rules, and full traceability from semantic requirement to locked runtime component.**