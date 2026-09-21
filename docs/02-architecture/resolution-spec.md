# Resolution Specification

## Overview

This document defines the deterministic resolution behavior of `agent-plugins`.

The Resolver transforms high-level project intent into a concrete, reproducible set of:

- capabilities,
- selected implementations,
- components,
- packages,
- versions,
- resolution decisions,
- diagnostics.

The Resolver sits between:

```text
Project Intent
    ↓
Capabilities
    ↓
Concrete Implementations
```

Its primary responsibility is:

> **Given a project, catalog, policy, target, and lock state, determine the smallest valid and reproducible implementation set that satisfies all required capabilities.**

The Resolver must be:

- deterministic,
- explainable,
- policy-aware,
- target-aware,
- lock-aware,
- side-effect free where practical.

---

# 1. Scope

This specification defines:

```text
project expansion
preset expansion
capability collection
capability dependency expansion

candidate discovery
candidate eligibility

policy evaluation
target compatibility

project overrides
existing lock preference
implementation priority

cardinality handling
conflict resolution

component dependency resolution
package deduplication
version resolution

resolution output
diagnostics
explainability
```

This specification does not define:

```text
upstream discovery formats

runtime file rendering

package download implementation

CLI presentation

target-specific installation mechanics
```

Those belong to other specifications.

---

# 2. Resolver Input

The Resolver consumes a normalized `ResolutionContext`.

Conceptually:

```text
ResolutionContext

├── Catalog
├── DistributionLock
├── Project
├── Profile
├── Presets
├── Policy
├── Target
├── ExistingProjectLock
└── Overrides
```

All serialized input should be validated and normalized before entering the core resolution algorithm.

---

# 3. Resolver Output

The Resolver produces a `Resolution`.

Conceptually:

```text
Resolution

├── requirements
├── capabilityGraph
├── resolvedCapabilities
├── selectedImplementations
├── selectedComponents
├── resolvedPackages
├── decisions
├── diagnostics
└── metadata
```

A successful Resolution must contain enough information to build:

```text
agent-plugins.lock
```

and to explain every significant selection decision.

---

# 4. Resolution Purity

The core Resolver should conceptually behave as:

```text
resolve(context) → resolution
```

It must not directly:

```text
write files
install packages
modify runtime state
prompt users
fetch latest upstream versions
call an LLM
```

Any required external data must already be represented in the Resolution Context.

---

# 5. Determinism

For equivalent normalized inputs:

```text
resolve(context A)
=
resolve(context B)
```

when:

```text
context A
=
context B
```

The Resolver must not depend on:

```text
filesystem enumeration order
network timing
random values
current clock time
LLM output
unstated global configuration
object insertion order
```

Any ordering that affects output must be explicitly defined.

---

# 6. Resolution Pipeline

The canonical pipeline is:

```text
1. Validate Resolution Context

2. Expand Profile

3. Expand Presets

4. Collect Capability Requirements

5. Apply Capability Enable/Disable Overrides

6. Deduplicate Requirements

7. Expand Capability Dependencies

8. Validate Capability Graph

9. Discover Candidate Implementations

10. Evaluate Candidate Availability

11. Apply Policy

12. Apply Target Compatibility

13. Validate Implementation Dependencies

14. Apply Explicit Implementation Overrides

15. Prefer Existing Valid Lock

16. Apply Resolver Preferences

17. Resolve Cardinality

18. Resolve Conflicts

19. Select Components

20. Resolve Component Dependencies

21. Deduplicate Packages

22. Resolve Package Versions

23. Validate Final Resolution

24. Produce Resolution Decisions

25. Produce Diagnostics

26. Return Resolution
```

The order is significant.

---

# 7. Phase 1 — Context Validation

Before semantic resolution begins, validate:

```text
Project exists

Profile exists

Presets exist

Policy exists

Targets exist

Capability references exist

Package references exist

Component references exist
```

Structural errors must fail before candidate resolution.

Example:

```text
Unknown preset:
stacks/nonexistent
```

---

# 8. Phase 2 — Profile Expansion

If the Project selects:

```yaml
profile: frontend-engineer
```

the Resolver loads the canonical Profile.

Example:

```text
frontend-engineer

→ workflow/core
→ engineering/core
→ domains/frontend
→ stacks/typescript
```

Profile expansion produces Preset requirements.

Profile expansion must not resolve provider implementations.

---

# 9. No Hidden Profile Inheritance

Profile expansion should primarily use:

```text
Profile
→ Presets
```

Deep inheritance should not be assumed.

If shallow inheritance exists in the future, it must be expanded deterministically before Preset resolution.

---

# 10. Phase 3 — Preset Expansion

Preset references are recursively expanded.

Example:

```text
frontend-engineer

→ engineering/core

engineering/core

→ workflow/core
→ engineering/testing
→ engineering/debugging
```

Preset expansion continues until all reachable Presets are known.

---

# 11. Preset Cycle Detection

Preset graphs must be acyclic.

Invalid:

```text
A → B
B → C
C → A
```

Resolution fails with:

```text
PRESET_CYCLE
```

Diagnostic should include the complete cycle where possible.

Example:

```text
Preset dependency cycle:

A → B → C → A
```

---

# 12. Phase 4 — Capability Requirement Collection

After Preset expansion, collect all requested Capabilities.

Sources may include:

```text
Profile Presets

Project Presets

Direct Project Capability Enables

Capability Dependencies
```

Each requirement must retain provenance.

Example:

```text
engineering.testing.tdd

required by:
- frontend-engineer
  → engineering/core

- stacks/nextjs
  → frontend/testing
```

---

# 13. Requirement Provenance

Requirement provenance should not be discarded during deduplication.

Conceptually:

```text
CapabilityRequirement

capability:
engineering.testing.tdd

sources:
- profile/frontend-engineer
  → preset/engineering/core

- preset/frontend/testing
```

This supports:

```text
ap explain
```

and diagnostics.

---

# 14. Required vs Optional Requirements

A requirement may conceptually be:

```text
required
optional
```

Required:

```text
must resolve successfully
```

Optional:

```text
may resolve if available
```

V1 may initially treat all explicitly requested capabilities as required.

The data model should leave room for optional requirements.

---

# 15. Phase 5 — Capability Overrides

Project overrides are applied to the collected capability intent.

Supported concepts:

```text
enable

disable
```

Example:

```yaml
overrides:
  capabilities:
    enable:
      - security.review

    disable:
      - tooling.browser
```

---

# 16. Enable Override

An enable override creates an additional Capability Requirement.

Example:

```text
security.review
```

becomes part of desired state even if no Profile or Preset requested it.

---

# 17. Disable Override

A disable override suppresses inherited intent.

Example:

```text
frontend-engineer
→ tooling.browser

Project:
disable tooling.browser
```

However, disabling a Capability does not automatically invalidate its dependents silently.

---

# 18. Disable vs Hard Dependency

Suppose:

```text
engineering.testing.e2e
→ requires tooling.browser
```

and Project disables:

```text
tooling.browser
```

while still requiring:

```text
engineering.testing.e2e
```

Resolution must fail.

Example diagnostic:

```text
CAPABILITY_DISABLED_BUT_REQUIRED

tooling.browser

Disabled by:
project override

Still required by:
engineering.testing.e2e
```

The Resolver must not silently restore or silently drop the dependency.

---

# 19. Phase 6 — Requirement Deduplication

Capability requirements are deduplicated by canonical Capability ID.

Input:

```text
engineering.testing.tdd
engineering.debugging
engineering.testing.tdd
engineering.review
```

Normalized:

```text
engineering.testing.tdd
engineering.debugging
engineering.review
```

Requirement provenance is merged.

---

# 20. Why Deduplication Happens Before Resolution

Presets must not resolve independently.

Incorrect:

```text
Preset A
→ resolve TDD Provider A

Preset B
→ resolve TDD Provider B

merge later
```

Correct:

```text
Preset A ─┐
          ├→ engineering.testing.tdd
Preset B ─┘
                  ↓
          one resolution process
```

This prevents duplicate semantic ownership.

---

# 21. Phase 7 — Capability Dependency Expansion

Capabilities may declare semantic dependencies.

Example:

```text
engineering.testing.e2e
→ tooling.browser
```

The Resolver recursively adds required capabilities.

---

# 22. Capability Dependency Provenance

Dependency-generated requirements should retain their source path.

Example:

```text
tooling.browser

required by:

frontend-engineer
→ engineering/testing
→ engineering.testing.e2e
→ tooling.browser
```

This dependency path must be available for diagnostics.

---

# 23. Capability Dependency Cycle

Capability graphs must be acyclic.

Invalid:

```text
Capability A
→ B
→ C
→ A
```

Resolution fails with:

```text
CAPABILITY_CYCLE
```

---

# 24. Phase 8 — Capability Graph Validation

After dependency expansion:

```text
validate all capability nodes

validate all dependency edges

verify no disabled hard dependency

verify no cycles

verify lifecycle constraints
```

Deprecated capabilities may generate warnings.

Removed capabilities should normally fail new resolution.

---

# 25. Phase 9 — Candidate Discovery

For each required Capability, find all registered Capability Implementations.

Example:

```text
engineering.testing.tdd

Candidates:

Superpowers
Matt Pocock
ECC
```

Candidate discovery uses curated implementation mappings.

It does not scan arbitrary repositories during core resolution.

---

# 26. Candidate Model

Conceptually:

```text
Candidate

├── capability
├── component
├── package
├── provider
├── priority
├── status
├── targetCompatibility
├── provenance
├── dependencies
├── conflicts
└── securityMetadata
```

---

# 27. Candidate Initial State

All discovered mapped implementations begin conceptually as:

```text
Candidate
```

They later transition to:

```text
Eligible
Rejected
Suppressed
Selected
```

---

# 28. No Candidate

If a required Capability has no known implementation:

```text
NO_IMPLEMENTATION
```

Example:

```text
No implementation registered for:

security.specialized-audit
```

Required capability:

```text
→ resolution failure
```

Optional capability:

```text
→ warning
```

---

# 29. Phase 10 — Candidate Availability

Before policy evaluation, determine whether the Candidate exists in the selected distribution state.

Check:

```text
Package available

Component available

selected distribution version contains Component

implementation not removed

required immutable reference available
```

Unavailable candidates are rejected.

---

# 30. Candidate Lifecycle Status

Implementation status may include:

```text
active

deprecated

disabled

removed
```

Default behavior:

```text
active
→ eligible for normal resolution

deprecated
→ eligible with warning / lower preference

disabled
→ reject

removed
→ reject for new resolution
```

Existing lock reproduction rules may treat deprecated or removed implementations differently when the locked artifact remains available.

---

# 31. Phase 11 — Policy Evaluation

Policy evaluates each available Candidate.

Conceptually:

```text
Candidate
+
Policy
→ PolicyDecision
```

Possible decisions:

```text
allow

deny

review

prompt
```

---

# 32. Policy Is a Hard Eligibility Layer

A denied Candidate is rejected.

Example:

```text
Candidate A
priority: 100
trust: community

Policy:
deny community

Result:
Candidate A rejected
```

Higher priority must never override policy denial.

---

# 33. Review and Prompt Policy Outcomes

Core Resolver must remain non-interactive.

Therefore:

```text
review
prompt
```

should become structured states or diagnostics.

The Application Layer decides whether:

```text
interactive approval is possible
```

or:

```text
CI must fail
```

V1 may simplify policy outcomes to:

```text
allow
deny
```

if necessary.

---

# 34. Policy Decision Trace

For every policy rejection, record:

```text
policy ID

rule

Candidate

reason
```

Example:

```text
Candidate:
provider-a/security-review

Rejected:
trust level community is denied by strict policy
```

---

# 35. Phase 12 — Target Compatibility

Each remaining Candidate is evaluated against the selected Target.

Conceptually:

```text
Candidate
+
TargetDescriptor
→ CompatibilityDecision
```

Possible states:

```text
supported

partial

unsupported
```

---

# 36. Unsupported Candidate

An unsupported Candidate is rejected for the current Target.

Example:

```text
Candidate requires hooks.

Target does not support hooks.

→ TARGET_UNSUPPORTED
```

---

# 37. Partial Support

Partial support should be explicit.

Whether partial support is acceptable depends on:

```text
Capability requirement

Policy

Target rules
```

For required Capabilities, partial support should not silently count as full satisfaction unless explicitly modeled.

---

# 38. Target Selection and Multi-Target Projects

For a single Target:

```text
resolve(Target A)
```

For multiple Targets, preferred architecture is:

```text
Shared Desired Capability Set
        ↓
Resolve per Target
```

rather than forcing one implementation set across all runtimes.

Conceptually:

```text
Project
├── Target Claude
│   └── Resolution A
└── Target Codex
    └── Resolution B
```

V1 may support only one Target.

---

# 39. Phase 13 — Implementation Dependency Validation

Candidates may depend on:

```text
Components

Packages

runtime primitives
```

Implementation dependencies are distinct from Capability dependencies.

Example:

```text
security-review-agent
→ requires security-rules
```

The Candidate is only eligible if required implementation dependencies can be satisfied.

---

# 40. Transitive Component Dependencies

Component dependencies are expanded transitively.

Example:

```text
Component A
→ Component B
→ Component C
```

The dependency graph must be validated.

---

# 41. Component Dependency Cycles

Cycles in implementation dependency graphs should fail unless the package format explicitly allows a safe cycle.

Default:

```text
Component dependency cycle
→ error
```

---

# 42. Phase 14 — Explicit Implementation Overrides

A Project may explicitly select an implementation.

Example:

```yaml
overrides:
  implementations:
    engineering.testing.tdd:
      component: mattpocock/skills#skill:tdd
```

An explicit implementation override is a strong preference.

It is not an unrestricted bypass.

---

# 43. Override Eligibility

The explicitly selected Candidate must still satisfy:

```text
availability

policy

target compatibility

hard dependencies

hard conflicts
```

If it does not:

```text
INVALID_IMPLEMENTATION_OVERRIDE
```

The Resolver must not silently fall back unless the manifest explicitly requests fallback behavior.

---

# 44. Override Precedence

Among eligible candidates:

```text
Explicit Project Implementation Override
```

has the highest user preference.

Conceptually:

```text
Override
>
Existing Lock Preference
>
Policy Preference
>
Catalog Priority
```

But:

```text
Hard Constraints
>
Override
```

---

# 45. Phase 15 — Existing Lock Preference

Normal sync should preserve an existing valid locked implementation where possible.

Example:

Current lock:

```text
engineering.testing.tdd
→ Superpowers v6.3
```

Catalog now also contains another equally valid implementation.

Normal:

```text
ap sync
```

should not switch implementations without reason.

---

# 46. Lock Stability Principle

If:

```text
desired semantic state unchanged

locked implementation still eligible

locked version still valid
```

then:

```text
preserve locked implementation
```

This minimizes unnecessary churn.

---

# 47. Lock Preference Is Not Absolute

Existing lock must not be preserved when:

```text
implementation no longer exists

policy now rejects it

target no longer supports it

required dependency missing

explicit project override changed

package version unavailable

security policy invalidates it
```

In those cases the Resolver must reconsider candidates.

---

# 48. Update Mode vs Normal Mode

The Resolver should conceptually support at least two behaviors:

```text
normal resolution

update resolution
```

Normal:

```text
preserve valid lock
```

Update:

```text
allow reconsideration of newer curated state
```

Update does not mean bypass policy.

---

# 49. Resolution Mode

Conceptually:

```text
mode: sync
mode: update
mode: fresh
```

Possible semantics:

```text
fresh
→ no existing lock

sync
→ prefer existing valid lock

update
→ intentionally reconsider selected versions / candidates
```

Exact API belongs in implementation.

---

# 50. Phase 16 — Resolver Preferences

After hard eligibility and explicit overrides, apply soft preferences.

Potential preference sources:

```text
existing lock

policy provider preference

target-specific preference

catalog implementation priority
```

These must have defined ordering.

---

# 51. Canonical Preference Order

For V1, recommended order:

```text
1. Explicit Project Implementation Override

2. Existing Valid Lock
   in normal sync mode

3. Policy-Specific Preference

4. Target-Specific Preference

5. Catalog Implementation Priority

6. Deterministic final tie handling
```

Hard eligibility checks always occur before this order.

---

# 52. Policy Preference

A Policy may prefer:

```text
official

curated

first-party
```

without necessarily denying other Candidates.

Example:

```text
prefer official
allow curated
allow community
```

This influences eligible candidate ranking.

---

# 53. Catalog Priority

Each Capability Implementation may define a default priority.

Example:

```text
Superpowers 100
Matt Pocock 80
ECC 70
```

Priority is a catalog preference, not a universal quality score.

---

# 54. Target-Specific Preference

A Candidate may be especially suitable for one runtime.

Conceptually:

```text
Capability X

Claude Code:
prefer implementation A

Codex:
prefer implementation B
```

Target preference must be explicit and deterministic.

---

# 55. Preference Comparison

The Resolver should transform preference signals into a deterministic comparison strategy.

Avoid hidden scoring such as:

```text
magic weighted score
```

unless fully documented.

Prefer lexicographic precedence:

```text
override
then lock
then policy preference
then target preference
then catalog priority
```

This is easier to explain.

---

# 56. Candidate Ranking Tuple

Conceptually an eligible Candidate may receive:

```text
PreferenceTuple

(
  explicitOverride,
  lockMatch,
  policyPreference,
  targetPreference,
  catalogPriority
)
```

Candidates are compared lexicographically.

The exact representation may differ.

---

# 57. Why Lexicographic Precedence

Lexicographic precedence makes:

```text
ap explain
```

clear.

Example:

```text
Selected because:

1. no explicit override existed
2. candidate matched current lock
3. candidate satisfied policy
```

rather than:

```text
selected because score = 83.72
```

---

# 58. Phase 17 — Cardinality Resolution

After eligibility and preference:

```text
apply Capability cardinality
```

Supported:

```text
one

many
```

---

# 59. Cardinality One

For:

```text
cardinality: one
```

the Resolver must select at most one Candidate.

Cases:

```text
0 eligible
→ fail if required

1 eligible
→ select

>1 eligible
→ compare preference
```

---

# 60. Unique Winner

If one Candidate is strictly preferred:

```text
select winner
```

All other eligible candidates become:

```text
Suppressed
```

---

# 61. Ambiguous Winner

If multiple Candidates remain equivalent after all defined preference rules:

```text
AMBIGUOUS_RESOLUTION
```

Recommended behavior:

```text
fail
```

rather than silently selecting alphabetically.

Example:

```text
engineering.testing.tdd

Candidate A
Candidate B

same effective preference

→ require explicit override
```

---

# 62. Final Deterministic Tie-Breaker

A canonical ID tie-breaker may be used only for cases where semantic choice is irrelevant.

For important workflow ownership capabilities:

```text
ambiguity error
```

is preferred.

The Capability may eventually define a tie policy.

---

# 63. Cardinality Many

For:

```text
cardinality: many
```

all eligible non-conflicting Candidates may be selected unless additional selection rules apply.

This does not mean:

```text
select everything automatically
```

if the Capability defines explicit selection semantics.

Default V1 behavior may be:

```text
select all eligible compatible candidates
```

for `many`.

---

# 64. Cardinality Many and Lock Stability

Normal sync should avoid adding newly discovered `many` implementations merely because the catalog changed if the lock is intended to freeze the current environment.

Therefore:

```text
sync mode
→ preserve valid selected set

update/fresh mode
→ evaluate full eligible set
```

This prevents silent growth of the environment.

---

# 65. Phase 18 — Conflict Resolution

After preliminary selection, validate conflicts.

Conflict types:

```text
cardinality conflict

explicit Component conflict

Package conflict

runtime conflict

dependency conflict
```

---

# 66. Cardinality Conflict

Normally resolved during cardinality selection.

If two active implementations remain for:

```text
cardinality: one
```

the Resolution is invalid.

---

# 67. Explicit Component Conflict

Example:

```text
Component A
conflictsWith Component B
```

If both are selected:

```text
resolve using preference
```

only if one can safely be suppressed without breaking required capabilities.

Otherwise:

```text
HARD_COMPONENT_CONFLICT
```

---

# 68. Cross-Capability Conflict

Suppose:

```text
Capability A
→ Component X

Capability B
→ Component Y

X conflicts with Y
```

The Resolver may need to search for an alternative implementation of A or B.

This is more complex than single-capability ranking.

---

# 69. Conflict Backtracking

V1 should support limited deterministic backtracking where required.

Example:

```text
A has:
X1
X2

B has:
Y1

X1 conflicts with Y1
X2 does not
```

The Resolver should be able to choose:

```text
A → X2
B → Y1
```

instead of failing immediately.

---

# 70. Backtracking Scope

Avoid implementing an unrestricted general SAT solver in V1 unless necessary.

Recommended:

```text
deterministic bounded search
```

over Candidate combinations for unresolved conflicts.

Expected V1 graphs are small enough for simple strategies.

---

# 71. Conflict Search Objective

When alternative valid solutions exist, select according to the same preference order.

The Resolver should seek:

```text
valid solution
with maximal preference preservation
```

not merely the first solution encountered.

---

# 72. Conflict Resolution Determinism

Search order must be stable.

Candidates should be ordered by:

```text
effective preference
then canonical ID
```

for deterministic traversal.

---

# 73. Unsatisfiable Conflict

If no valid combination exists:

```text
UNSATISFIABLE_RESOLUTION
```

Diagnostic should show the conflicting paths.

Example:

```text
Capability A requires Component X.

Capability B requires Component Y.

X conflicts with Y.

No alternative implementations are available.
```

---

# 74. Phase 19 — Selected Components

After capability resolution:

```text
Capability
→ Selected Implementation
→ Component(s)
```

Collect all selected Components.

A Component may satisfy multiple Capabilities.

It should only appear once in the selected Component set.

---

# 75. Component Selection Provenance

For each selected Component, retain which Capabilities caused it to be selected.

Example:

```text
architecture-agent

selected for:
- engineering.architecture
- engineering.codebase-design
```

This supports package explanation.

---

# 76. Phase 20 — Component Dependency Resolution

Selected Components may require additional Components.

Example:

```text
selected Component A
→ requires Component B
```

B becomes part of the implementation state.

However, dependency Component B does not automatically become a selected Capability Implementation unless explicitly mapped as such.

---

# 77. Dependency Component vs Capability Implementation

Example:

```text
Component B
```

is installed because Component A requires it.

This does not necessarily mean:

```text
Capability X
→ Component B selected
```

Keep semantic selection and implementation dependency separate.

---

# 78. Component Dependency Eligibility

Dependency Components must still satisfy relevant hard constraints such as:

```text
availability

target support

security policy
```

Executable dependency Components must not bypass Policy merely because they are transitive.

---

# 79. Hidden Dependency Security

If a seemingly harmless skill requires:

```text
external executable hook
```

Policy must evaluate the hook.

Transitive dependencies cannot bypass security governance.

---

# 80. Phase 21 — Package Deduplication

Map selected and dependency Components to Packages.

Example:

```text
Component A ─┐
Component B ─┼→ Package X
Component C ─┘
```

Package X appears once.

---

# 81. Package Activation Semantics

Installing Package X does not imply that every Component in X is selected.

The Resolution must distinguish:

```text
required package
```

from:

```text
selected component
```

---

# 82. Package Provenance

For each Package, retain:

```text
Provider

source

selected version/ref

Components requiring package
```

Example:

```text
Package:
superpowers

required by:
- planning
- debugging
- verification

TDD component:
present in package but suppressed
```

---

# 83. Phase 22 — Version Resolution

After required Packages are known, resolve concrete versions.

Inputs may include:

```text
Distribution Lock

Project Lock

Package constraints

Target constraints

Update mode
```

---

# 84. Version Resolution Priority

Recommended semantics:

Normal sync:

```text
1. Existing Project Lock version
   if still valid

2. Distribution Lock pinned version

3. fail if no approved version available
```

Fresh resolution:

```text
1. Distribution Lock pinned version

2. fail if unavailable
```

Update resolution:

```text
1. newly selected approved Distribution Lock state
```

V1 should not resolve arbitrary upstream latest versions during normal project resolution.

---

# 85. Distribution Lock as Version Boundary

The consumer Resolver should normally choose from versions approved by:

```text
catalog.lock
```

not from the entire remote provider history.

This separates:

```text
distribution curation
```

from:

```text
consumer project resolution
```

---

# 86. Immutable Reference

A resolved Package should preferably end with:

```text
version
+
immutable reference
```

Example:

```text
version: 6.4.0
commit: abc123...
```

If no immutable reference exists, reproducibility quality should be reflected in diagnostics or metadata.

---

# 87. Version Conflict

If Package constraints cannot be satisfied:

```text
PACKAGE_VERSION_CONFLICT
```

Diagnostic should include:

```text
Package

constraints

requesting Components

available curated version
```

---

# 88. Phase 23 — Final Resolution Validation

Before Resolution succeeds, validate:

```text
every required Capability is satisfied

cardinality constraints hold

all selected Components exist

all Component dependencies satisfied

all Package dependencies satisfied

all selected versions valid

all selected Candidates policy-compliant

all selected Candidates target-compatible

no unresolved hard conflicts
```

---

# 89. Minimality Validation

Where practical, verify no selected Component exists without one of:

```text
Capability selection

Component dependency

Package requirement
```

This prevents accidental environment growth.

---

# 90. Phase 24 — Resolution Decisions

The Resolver must record decisions while resolving.

Decision types may include:

```text
required

enabled

disabled

candidate-found

candidate-rejected

candidate-suppressed

candidate-selected

dependency-added

package-added

lock-preserved

override-applied

conflict-resolved
```

---

# 91. Resolution Decision Structure

Conceptually:

```text
ResolutionDecision

├── code
├── entity
├── outcome
├── reason
├── source
├── relatedEntities
└── dependencyPath
```

---

# 92. Selected Decision Example

```text
Capability:
engineering.testing.tdd

Candidate:
superpowers/...#skill:test-driven-development

Outcome:
selected

Reasons:
- allowed by policy
- target compatible
- existing lock match
```

---

# 93. Suppressed Decision Example

```text
Candidate:
mattpocock/...#skill:tdd

Outcome:
suppressed

Reason:
another eligible candidate has stronger lock preference
```

---

# 94. Rejected Decision Example

```text
Candidate:
community-provider/...#skill:tdd

Outcome:
rejected

Reason:
trust level community denied by strict policy
```

---

# 95. Phase 25 — Diagnostics

Diagnostics are produced for:

```text
errors

warnings

informational conditions
```

They should use stable codes.

---

# 96. Diagnostic Severity

Recommended:

```text
error

warning

info
```

Errors invalidate Resolution.

Warnings permit Resolution but indicate degraded or noteworthy state.

---

# 97. Core Diagnostic Codes

Recommended initial codes:

```text
UNKNOWN_PROFILE

UNKNOWN_PRESET

UNKNOWN_CAPABILITY

UNKNOWN_COMPONENT

UNKNOWN_PACKAGE

PRESET_CYCLE

CAPABILITY_CYCLE

COMPONENT_CYCLE

CAPABILITY_DISABLED_BUT_REQUIRED

NO_IMPLEMENTATION

POLICY_DENIED

TARGET_UNSUPPORTED

INVALID_IMPLEMENTATION_OVERRIDE

AMBIGUOUS_RESOLUTION

HARD_COMPONENT_CONFLICT

UNSATISFIABLE_RESOLUTION

PACKAGE_VERSION_CONFLICT

LOCK_INVALID

LOCK_STALE

DEPRECATED_IMPLEMENTATION

OPTIONAL_CAPABILITY_UNAVAILABLE
```

Exact naming may evolve.

---

# 98. Diagnostic Requirements

A useful diagnostic should answer:

```text
What failed?

Which entity failed?

Why?

What requested it?

What can the user do?
```

---

# 99. Dependency Path in Diagnostics

Example:

```text
Unable to resolve:

security.review

Required by:

Project
→ backend-engineer
→ engineering/security
→ security.review

Reason:
all implementations rejected by policy
```

---

# 100. Explainability

Explainability is part of the Resolver contract.

The system should not try to reconstruct all reasoning afterward from final selections alone.

The Resolver should preserve sufficient decision metadata.

---

# 101. `ap explain <capability>`

For a Capability, explanation should include:

```text
Capability identity

Requirement sources

Dependencies

All considered Candidates

Eligibility results

Policy decisions

Target decisions

Preference comparison

Selected implementation

Suppressed implementations

Rejected implementations

Resolved Package/version
```

---

# 102. Example Explain Output

```text
Capability:
engineering.testing.tdd

Cardinality:
one

Required by:
frontend-engineer
→ engineering/core

Candidates:

Superpowers
  status: selected
  target: supported
  policy: allowed
  priority: 100
  lock: matched

Matt Pocock
  status: suppressed
  target: supported
  policy: allowed
  priority: 80

ECC
  status: rejected
  policy: denied

Selected:
superpowers/superpowers#skill:test-driven-development
```

---

# 103. `ap explain package <package>`

Package explanation should include:

```text
why Package is required

selected Components in Package

dependency Components

Capabilities associated with those Components

resolved version

Provider provenance
```

---

# 104. Stable Ordering

Resolution output must use canonical stable ordering.

Recommended sorting:

Capabilities:

```text
canonical capability ID
```

Packages:

```text
provider ID
then package ID
```

Components:

```text
canonical Component reference
```

Diagnostics:

```text
severity
then code
then entity ID
```

Stable ordering improves:

```text
lockfile diffs

tests

reproducibility

reviewability
```

---

# 105. Lockfile Construction

Only a successful Resolution may produce a new Project Lockfile.

The Lockfile Builder consumes:

```text
Resolution
```

and must not independently select alternatives.

---

# 106. Lockfile Semantic Content

At minimum, the lockfile should be able to represent:

```text
resolution format version

catalog/distribution identity

target

Capabilities

selected implementations

Components

Packages

versions

immutable refs

integrity

provenance
```

Exact schema belongs in `lockfile-spec.md`.

---

# 107. Lockfile Selection Trace

The lockfile may store selected reason metadata sufficient for basic explanation.

However, full rejected-candidate history need not necessarily be persisted forever.

Trade-off belongs in `lockfile-spec.md`.

---

# 108. Lock Hash / Context Fingerprint

To detect drift, the system should consider computing a deterministic fingerprint of significant Resolution inputs.

Potential inputs:

```text
normalized Project manifest

Profile content

Preset content

Policy content

Capability catalog identity

Distribution Lock identity

Target identity
```

Conceptually:

```text
resolutionInputHash
```

This helps identify stale lock state.

---

# 109. Manifest-Lock Drift

If the semantic input fingerprint differs:

```text
LOCK_STALE
```

The system should distinguish:

```text
manifest changed

catalog changed

policy changed

target changed
```

where practical.

---

# 110. Catalog Change Without Project Update

A newer catalog may exist while the Project Lock remains valid.

Normal sync should not necessarily modify the lock.

The system may report:

```text
update available
```

rather than:

```text
lock stale
```

if the locked state remains valid under the current selected distribution context.

---

# 111. Distribution Identity

A Project Lock should record enough distribution identity to know which curated catalog state produced it.

Possible representation:

```text
catalog version

catalog commit

catalog digest
```

Exact representation belongs in lockfile specification.

---

# 112. Resolution Modes

Recommended modes:

## Fresh

No usable existing Project Lock.

```text
resolve from current approved distribution state
```

## Sync

Use desired state while preserving valid locked selections.

```text
stability first
```

## Update

Intentionally reconsider upstream/package selections.

```text
new approved state may replace locked state
```

---

# 113. Fresh Resolution

Fresh resolution uses:

```text
Project

Catalog

Policy

Target

Distribution Lock
```

No lock preference exists.

---

# 114. Sync Resolution

Sync uses Existing Project Lock as a strong preference.

It may still change the lock when:

```text
Project intent changed

Policy changed incompatibly

Target changed

locked implementation unavailable

locked implementation invalid
```

---

# 115. Update Resolution

Update mode may reconsider:

```text
Package versions

implementation choices

newly available candidates
```

depending on user intent.

Update changes must remain explicit and reviewable.

---

# 116. Update Does Not Mean Recompose Everything

Different update scopes should eventually be supported.

Examples:

```text
update package version only

update one Provider

update one Capability implementation

update all curated dependencies
```

V1 may initially support a simpler global/provider update workflow.

---

# 117. Resolution and Sync

Resolver:

```text
decides desired concrete state
```

Sync:

```text
reconciles actual runtime state
```

Do not combine them conceptually.

Flow:

```text
Project
↓
Resolver
↓
Resolution
↓
Target Adapter
↓
Materialization Plan
↓
Sync
```

---

# 118. Resolver Does Not Inspect Arbitrary Runtime State

Runtime state should not influence semantic selection except through explicit managed/lock context.

For example, manually installed Plugin X should not automatically become the TDD winner merely because it already exists.

---

# 119. Managed Runtime Optimization

Target Adapter may avoid reinstalling an already correct Package.

That is a materialization optimization.

It must not alter the semantic Resolution.

---

# 120. Resolution and Security

Security-sensitive Components include:

```text
hooks

scripts

commands

MCP servers

external binaries
```

Every selected or transitive security-sensitive Component must be visible to Policy evaluation.

---

# 121. Security Dependency Rule

No dependency path may bypass Policy.

Incorrect:

```text
Selected Skill
→ hidden executable Hook
→ automatically allowed
```

Correct:

```text
Selected Skill
→ Hook dependency
→ Policy evaluation
→ allowed / rejected
```

---

# 122. Trust Is Not Inherited Blindly

If:

```text
Package trust = curated
```

a newly discovered security-sensitive Component may still require explicit review depending on Policy.

Trust semantics belong in `policy-spec.md`.

---

# 123. Capability Minimality

The Resolver should only satisfy:

```text
requested capabilities

hard dependencies

selected optional capabilities
```

It should not proactively activate unrelated capabilities simply because they are available in an installed Package.

---

# 124. Package Minimality

A Package should be included only if at least one:

```text
selected Component

required dependency Component
```

requires it.

Unused Packages should not appear in Resolution.

---

# 125. Environment Minimality

The desired outcome is:

```text
smallest coherent valid implementation set
```

subject to:

```text
Package installation granularity
```

The Resolver controls semantic activation, even if physical Package installation contains extra unused Components.

---

# 126. Resolution Optimality

V1 does not need a mathematically global optimizer.

The primary objective order is:

```text
1. satisfy all hard requirements

2. obey policy

3. obey target constraints

4. avoid conflicts

5. preserve explicit overrides

6. preserve valid lock state

7. honor preferences

8. minimize unnecessary selections
```

---

# 127. Unsatisfied Required Capability

Required capability:

```text
0 valid solutions
```

must produce error.

Never silently remove it.

---

# 128. Unsatisfied Optional Capability

Optional capability:

```text
0 valid solutions
```

may produce warning.

Example:

```text
OPTIONAL_CAPABILITY_UNAVAILABLE
```

---

# 129. Deprecated Candidate

A deprecated Candidate may remain eligible when:

```text
existing lock requires reproduction
```

but should normally lose against a valid active Candidate during explicit update.

---

# 130. Removed Candidate

A removed Candidate should not be selected for new resolution.

If an existing lock references it and its immutable artifact remains retrievable:

```text
reproduction may continue
```

with warning.

If artifact is unavailable:

```text
resolution/reproduction failure
```

---

# 131. Project Override Removal

If a Project removes an explicit implementation override, normal sync behavior should be clearly defined.

Recommended:

```text
if currently locked implementation remains valid:
preserve it during sync

explicit update:
allow resolver to reconsider default winner
```

This avoids surprising churn.

---

# 132. Capability Disable Removal

If a previously disabled Capability becomes enabled again through manifest change:

```text
perform normal fresh selection for that Capability
```

unless valid historical lock metadata can be safely reused.

---

# 133. Multi-Capability Component

A selected Component may satisfy multiple Capability Requirements.

Example:

```text
Component A

implements:
engineering.architecture
engineering.codebase-design
```

If selected for one Capability, it may satisfy another if:

```text
mapping exists

eligibility is valid

cardinality/conflicts permit it
```

The Resolver should avoid selecting redundant Components unnecessarily.

---

# 134. Cross-Capability Reuse

If Candidate A satisfies:

```text
Capability X
Capability Y
```

and both are required, the Resolver may prefer a solution using one Component over two equally preferred separate Components when no stronger preference exists.

This supports environment minimality.

V1 may treat this as a later optimization if it complicates deterministic selection excessively.

---

# 135. Composite Implementations

If one Capability requires multiple Components jointly:

```text
Implementation Set
```

should be treated atomically.

Conceptually:

```text
Capability X

Candidate A:
Components [A1, A2]
```

All Components must pass:

```text
policy

target compatibility

dependency validation
```

or the Candidate is rejected.

V1 may defer first-class composite implementation support if not yet required.

---

# 136. Resolver Data Structures

Recommended conceptual core types:

```text
ResolutionContext

CapabilityRequirement

CapabilityNode

Candidate

CandidateEvaluation

PolicyDecision

CompatibilityDecision

ResolutionDecision

ResolvedCapability

SelectedComponent

ResolvedPackage

Resolution

Diagnostic
```

These are conceptual contracts, not mandatory class names.

---

# 137. Candidate Evaluation

Conceptually:

```text
CandidateEvaluation

candidate

availability

policy

targetCompatibility

dependencies

conflicts

preference

status

reasons
```

Keeping evaluation explicit improves explainability.

---

# 138. Resolved Capability

Conceptually:

```text
ResolvedCapability

capability

requirements

selected

suppressed

rejected

diagnostics
```

---

# 139. Resolved Package

Conceptually:

```text
ResolvedPackage

provider

package

version

immutableRef

integrity

requiredComponents
```

---

# 140. Resolution Metadata

A Resolution should include:

```text
resolver version

schema version

resolution mode

target

input fingerprint

catalog/distribution identity
```

This assists debugging and reproduction.

---

# 141. Resolver Version

If selection semantics change significantly, the Resolver version should be identifiable.

This may matter because:

```text
same manifest
+
same catalog
+
different resolver algorithm
```

could otherwise produce different outcomes.

Exact versioning strategy belongs to lockfile/release specifications.

---

# 142. Algorithm Changes

Changes that may alter selection behavior should be treated carefully.

Examples:

```text
preference precedence change

cardinality semantics change

conflict search change

lock preservation change
```

Such changes should:

```text
receive tests

update specification

possibly receive ADR

consider migration impact
```

---

# 143. Resolution Stability Contract

Within one stable Resolver version:

```text
same normalized inputs
→ same Resolution
```

This is a core contract.

---

# 144. Resolution Test Matrix

At minimum test:

```text
single capability / one candidate

single capability / multiple candidates

cardinality one

cardinality many

policy rejection

target rejection

explicit override

invalid override

existing lock preservation

lock invalidation

priority selection

ambiguity

Capability dependency

disabled dependency

Preset duplication

Capability deduplication

Component dependency

Package deduplication

version conflict

explicit Component conflict

cross-Capability conflict

no implementation

deprecated implementation
```

---

# 145. Property Tests

Useful resolver properties:

```text
determinism

idempotent normalization

requirement deduplication

no selected rejected Candidate

no cardinality-one duplicate selection

all selected Components belong to resolved Packages

all required Capabilities satisfied on success
```

---

# 146. Resolution Invariants

A successful Resolution must satisfy:

```text
1. Every required Capability is satisfied.

2. No rejected Candidate is selected.

3. Every selected Candidate is available.

4. Every selected Candidate is policy-compliant.

5. Every selected Candidate is target-compatible.

6. Every selected implementation dependency is satisfied.

7. Capability cardinality is respected.

8. No unresolved hard conflict remains.

9. Every selected Component belongs to a resolved Package.

10. Every resolved Package has a valid concrete version/ref.

11. Every selected implementation is explainable.

12. Every Package is required by at least one selected/dependency Component.

13. No disabled Capability remains active unless required conflict causes explicit failure.

14. Requirement provenance is preserved.

15. Stable output ordering is used.
```

---

# 147. Preference Invariants

Preference must obey:

```text
hard constraints
>
explicit override
>
existing valid lock
>
policy preference
>
target preference
>
catalog priority
```

The first line is not technically a preference.

It is eligibility.

The distinction must remain explicit.

---

# 148. Lock Invariants

Normal sync:

```text
do not change valid lock unnecessarily
```

Update:

```text
may intentionally change lock
```

Lock state may never preserve an implementation that violates current hard constraints.

---

# 149. Policy Invariants

Policy:

```text
filters eligibility
```

It must not:

```text
rename capabilities

rewrite provenance

silently mutate project intent
```

---

# 150. Target Invariants

Target compatibility may reject an implementation.

It must not change semantic Capability identity.

Example:

```text
engineering.testing.tdd
```

remains unchanged even if Claude and Codex use different implementations.

---

# 151. Override Invariants

Overrides:

```text
change project-specific preference/intent
```

but cannot silently override:

```text
security deny

unavailable Component

unsupported Target

broken hard dependency
```

unless a future Policy explicitly permits such behavior.

---

# 152. Failure vs Fallback

Fallback is permitted only among:

```text
eligible candidates
```

Example:

Preferred Candidate rejected by policy:

```text
try next eligible Candidate
```

But explicit implementation override failure should normally produce error rather than hidden fallback.

---

# 153. Why Explicit Override Should Fail Loudly

If user wrote:

```text
Use Matt Pocock TDD
```

and the system silently used Superpowers instead:

```text
declared intent
≠
actual environment
```

Therefore explicit override should fail if impossible.

---

# 154. Default Selection May Fall Back

Without explicit override:

```text
highest preferred Candidate unavailable
```

the Resolver may select the next eligible Candidate.

This is ordinary resolution.

The fallback reason must remain explainable.

---

# 155. Example — Basic Resolution

Input:

```text
Profile:
frontend-engineer

Target:
claude-code
```

Requirements:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
frontend.design
```

TDD candidates:

```text
Superpowers 100
Matt Pocock 80
ECC 70
```

All allowed.

Result:

```text
Superpowers
```

Reason:

```text
highest catalog priority
```

---

# 156. Example — Policy Changes Winner

Candidates:

```text
Superpowers
priority 100
trust community

Matt Pocock
priority 80
trust curated
```

Policy:

```text
deny community
```

Result:

```text
Superpowers → rejected
Matt Pocock → selected
```

Reason:

```text
policy filtering occurs before priority
```

---

# 157. Example — Lock Preserves Winner

Existing lock:

```text
TDD → Matt Pocock
```

Current eligible candidates:

```text
Superpowers priority 100
Matt Pocock priority 80
```

Normal sync:

```text
Matt Pocock remains selected
```

because:

```text
existing valid lock
>
catalog priority
```

Explicit update may reconsider Superpowers.

---

# 158. Example — Explicit Override

Default:

```text
Superpowers
```

Project:

```text
override TDD → ECC
```

ECC is eligible.

Result:

```text
ECC selected
```

Reason:

```text
explicit override
```

---

# 159. Example — Invalid Override

Project:

```text
override TDD → ECC
```

Policy:

```text
deny ECC provider
```

Result:

```text
resolution fails
```

Diagnostic:

```text
INVALID_IMPLEMENTATION_OVERRIDE

Requested:
ECC

Rejected by:
strict policy
```

---

# 160. Example — Cardinality Many

Capability:

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

Fresh/update mode:

```text
all eligible candidates may be selected
```

Normal sync:

```text
preserve locked valid selected set
```

unless project intent changed.

---

# 161. Example — Package Deduplication

Resolved:

```text
planning
→ superpowers/planning

debugging
→ superpowers/debugging

verification
→ superpowers/verification
```

All belong to:

```text
Package superpowers
```

Final:

```text
selected Components: 3

resolved Packages: 1
```

---

# 162. Example — Suppressed Component in Installed Package

Package Superpowers contains:

```text
planning
debugging
TDD
```

Resolved:

```text
planning → Superpowers

debugging → Superpowers

TDD → Matt Pocock
```

Package Superpowers is still installed.

But its TDD Component is:

```text
not semantically active
```

---

# 163. Example — Capability Dependency

```text
engineering.testing.e2e
```

requires:

```text
tooling.browser
```

Both must resolve.

If browser capability has no eligible implementation:

```text
engineering.testing.e2e
```

fails too.

Diagnostic must show dependency path.

---

# 164. Example — Cross-Capability Conflict

Required:

```text
Capability A
Capability B
```

A candidates:

```text
A1
A2
```

B:

```text
B1
```

Conflict:

```text
A1 conflicts B1
```

A2 compatible.

Resolver selects:

```text
A2
B1
```

even if A1 has higher standalone priority, because:

```text
valid complete solution
>
invalid locally preferred solution
```

---

# 165. Example — Unsatisfiable Graph

A:

```text
only A1
```

B:

```text
only B1
```

Conflict:

```text
A1 conflicts B1
```

Both Capabilities required.

Result:

```text
UNSATISFIABLE_RESOLUTION
```

---

# 166. Example — New Candidate Appears

Existing lock:

```text
TDD → Superpowers
```

New catalog includes:

```text
Provider X
priority 120
```

Normal sync:

```text
preserve Superpowers
```

Explicit update:

```text
Provider X may become selected
```

if eligible.

This prevents silent environment churn.

---

# 167. Example — Security-Sensitive Dependency

Selected:

```text
research-skill
```

Dependency:

```text
external MCP server
```

Policy:

```text
deny external MCP
```

Candidate must be rejected.

It must not be partially installed without its required dependency.

---

# 168. Resolution Complexity

Expected V1 graphs are relatively small:

```text
tens of capabilities

tens/hundreds of Candidates

small dependency graphs
```

Correctness and explainability are more important than advanced optimization.

---

# 169. Algorithmic Strategy

Recommended V1 strategy:

```text
graph expansion

deterministic filtering

ordered candidate ranking

bounded conflict backtracking
```

Avoid introducing a complex SAT/SMT solver prematurely.

If real catalog complexity eventually demands one, the public semantics in this specification should remain stable.

---

# 170. Resolver Implementation Boundary

Recommended implementation location:

```text
packages/core/src/resolver/
```

Possible modules:

```text
resolve.ts

context.ts

requirements.ts

dependencies.ts

candidates.ts

eligibility.ts

preferences.ts

cardinality.ts

conflicts.ts

packages.ts

versions.ts

decisions.ts
```

Exact source layout is not normative.

---

# 171. Resolver Must Not Depend on CLI

The core Resolver must be callable by:

```text
CLI

tests

future API

future GUI

automation
```

without terminal interaction.

---

# 172. Resolver Must Not Depend on Concrete Source Adapter

Source discovery must happen before Resolver input is built.

Resolver consumes normalized Catalog data.

---

# 173. Resolver Must Not Depend on Concrete Target Adapter

Resolver may use normalized Target capabilities/descriptors.

It must not import:

```text
Claude Code adapter implementation
```

directly.

---

# 174. Resolver and Catalog

Catalog answers:

```text
What implementations exist?
```

Resolver answers:

```text
Which implementation should this Project use?
```

Do not mix these responsibilities.

---

# 175. Resolver and Policy

Policy answers:

```text
Which Candidates are allowed or preferred?
```

Resolver coordinates those decisions into the final selection.

---

# 176. Resolver and Lockfile

Resolver produces:

```text
Resolution
```

Lockfile Builder serializes:

```text
Resolution
```

The Lockfile must not become a second resolver.

---

# 177. Resolver and Target Adapter

Resolver decides:

```text
what
```

Target Adapter decides:

```text
how
```

Example:

```text
Resolver:
select Component X

Target Adapter:
render Component X into Claude native structure
```

---

# 178. V1 Mandatory Resolution Features

V1 must support:

```text
Profile expansion

Preset expansion

Capability requirement deduplication

Capability dependency expansion

cardinality one

cardinality many

policy filtering

target filtering

implementation priority

explicit implementation override

existing lock preservation

ambiguity detection

Component dependency resolution

Package deduplication

curated version resolution

structured diagnostics

resolution explanation
```

---

# 179. V1 May Defer

V1 may defer:

```text
advanced optional capabilities

complex composite implementations

large-scale constraint optimization

rich multi-target joint resolution

automatic semantic fallback between different capabilities

AI-assisted resolution

task-level temporary capability composition
```

---

# 180. Resolution Acceptance Criteria

Resolver V1 is acceptable when all of the following work reliably:

```text
same input always produces same output

TDD overlap selects one implementation

Policy can change the winner

Explicit override works

Invalid override fails

Valid lock survives normal sync

Update can intentionally change selection

Required missing capability fails

Capability dependencies resolve

Disabled required dependency fails

Preset cycles fail

Capability cycles fail

Package deduplication works

Cross-capability conflict can select a valid alternative

Unsatisfiable conflicts fail clearly

All selected components retain provenance

ap explain can reconstruct selection reasons
```

---

# 181. Resolution Decision Order

The core decision hierarchy is:

```text
Requested Intent
      ↓
Capability Graph
      ↓
Candidate Availability
      ↓
Hard Constraints
      ↓
Policy
      ↓
Target Compatibility
      ↓
Implementation Dependencies
      ↓
Explicit Override
      ↓
Existing Valid Lock
      ↓
Policy Preference
      ↓
Target Preference
      ↓
Catalog Priority
      ↓
Cardinality
      ↓
Conflict Validation
      ↓
Selected Solution
```

This ordering should remain stable unless deliberately changed through architecture review.

---

# 182. Resolution Rules Summary

```text
Request capabilities, not providers.

Expand all semantic requirements before selecting implementations.

Deduplicate by canonical Capability ID.

Hard constraints always beat preferences.

Policy filters before priority.

Target compatibility filters before priority.

Explicit override beats defaults but not hard constraints.

Normal sync prefers existing valid lock.

Updates may reconsider locked selections.

Cardinality determines how many implementations may remain active.

Conflicts must be resolved globally enough to produce a valid environment.

Packages are deduplicated after Component selection.

Version resolution uses curated locked upstream state.

Every important decision must be explainable.

Required failures must never be silently ignored.
```

---

# 183. Resolver Pseudocode

```text
function resolve(context):

    validate(context)

    presets =
        expandProfile(context.project.profile)
        + context.project.presets

    expandedPresets =
        expandPresetGraph(presets)

    requirements =
        collectCapabilities(expandedPresets)

    requirements +=
        context.project.overrides.capabilities.enable

    requirements =
        applyCapabilityDisables(requirements)

    requirements =
        deduplicate(requirements)

    requirements =
        expandCapabilityDependencies(requirements)

    validateCapabilityGraph(requirements)

    evaluations = []

    for capability in requirements:

        candidates =
            catalog.implementations(capability)

        candidates =
            evaluateAvailability(candidates)

        candidates =
            evaluatePolicy(candidates, context.policy)

        candidates =
            evaluateTarget(candidates, context.target)

        candidates =
            evaluateDependencies(candidates)

        candidates =
            applyImplementationOverride(
                candidates,
                context.project.overrides
            )

        candidates =
            applyLockPreference(
                candidates,
                context.existingLock,
                context.mode
            )

        candidates =
            rankCandidates(candidates)

        evaluations +=
            resolveCardinality(
                capability,
                candidates
            )

    selections =
        resolveGlobalConflicts(evaluations)

    components =
        collectSelectedComponents(selections)

    components =
        expandComponentDependencies(components)

    packages =
        deduplicatePackages(components)

    packages =
        resolveVersions(
            packages,
            context.distributionLock,
            context.existingLock,
            context.mode
        )

    validateFinalResolution(
        requirements,
        selections,
        components,
        packages
    )

    return buildResolution(...)
```

The pseudocode illustrates ordering, not required implementation syntax.

---

# 184. Resolver Contract

The Resolver guarantees:

```text
If Resolution succeeds:

all required semantic intent is satisfied

all hard constraints are respected

the result is deterministic

the result is reproducible enough to lock

the result is explainable
```

If those guarantees cannot be met:

```text
Resolution fails explicitly
```

rather than producing a hidden best-effort environment.

---

# 185. Resolution In One Sentence

> **The `agent-plugins` Resolver expands project intent into a complete capability graph, filters implementations by hard constraints, policy and target compatibility, applies explicit and lock-aware preferences, resolves cardinality and conflicts deterministically, then produces the smallest valid set of components and pinned packages with full decision provenance.**