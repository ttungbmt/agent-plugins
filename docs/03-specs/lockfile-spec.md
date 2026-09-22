# Lockfile Specification

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.

## Overview

This document defines the lockfile model used by `agent-plugins`.

The system uses two distinct lockfiles:

```text id="8eyb0n"
catalog.lock
```

and:

```text id="7d0n7w"
agent-plugins.lock
```

They serve different purposes.

```text id="j44ilc"
catalog.lock
→ locks the curated upstream distribution baseline

agent-plugins.lock
→ locks the concrete resolution of one consumer project
```

The dual-lock model exists to separate:

```text id="ept1pl"
ecosystem curation
```

from:

```text id="9d37fs"
project resolution
```

This separation is fundamental to reproducibility, controlled updates, and explainability.

---

# 1. Core Principle

The canonical flow is:

```text id="ujqvp5"
External Publishers
        ↓
Maintainer Curation
        ↓
catalog.lock
        ↓
Catalog
        ↓
Project Manifest
        ↓
Resolver
        ↓
agent-plugins.lock
        ↓
Target Adapter
        ↓
Managed Runtime State
```

The key rule is:

> **The distribution lock freezes what upstream state is approved; the project lock freezes what a specific project actually resolved.**

---

# 2. Lockfile Types

V1 defines two lockfile types.

## Distribution Lock

```text id="gw4j6j"
catalog.lock
```

Owned by the `agent-plugins` distribution repository.

## Project Lock

```text id="cllx4u"
agent-plugins.lock
```

Owned by a consumer project.

They must not be merged into a single file.

---

# 3. Why Two Locks

A single lockfile would mix:

```text id="zud379"
upstream curation decisions

consumer intent

project-specific implementation selection

target-specific resolution
```

This would make updates difficult to reason about.

The dual-lock model provides:

```text id="n0pjmo"
Distribution Curator

controls:
catalog.lock

Project Maintainer

controls:
agent-plugins.yaml
agent-plugins.lock
```

---

# 4. `catalog.lock`

`catalog.lock` records the exact upstream state intentionally curated and tested by the `agent-plugins` distribution.

It answers:

> **Which exact upstream artifacts does this version of the Catalog recognize as approved inputs?**

---

# 5. `agent-plugins.lock`

`agent-plugins.lock` records the exact resolved state for a consumer Project.

It answers:

> **Which exact implementations, Components, Packages, and versions satisfy this Project's desired capabilities?**

---

# 6. Lockfiles Are Resolver-Owned

Lockfiles are generated artifacts with durable semantic meaning.

They should not normally be edited manually.

Preferred workflow:

```text id="9uvt77"
intent / curated state
        ↓
Resolver / update workflow
        ↓
lockfile
```

Avoid:

```text id="zy92u8"
manual lockfile editing
```

---

# 7. Lockfiles vs Ordinary Generated Files

A lockfile is technically derived, but differs from ordinary generated indexes.

Generated index:

```text id="c3qiwo"
delete
→ regenerate from authoritative metadata
```

Project Lock:

```text id="rngup1"
captures a historical concrete selection
```

Therefore a lockfile becomes authoritative for:

```text id="gpdw7p"
reproduction of the locked state
```

while remaining non-authoritative for:

```text id="h0u8lq"
user intent
```

---

# 8. Source-of-Truth Relationship

```text id="6avhhh"
agent-plugins.yaml
→ desired semantic state

catalog.lock
→ approved upstream baseline

agent-plugins.lock
→ exact project resolution
```

These files answer different questions.

---

# 9. File Locations

Distribution repository:

```text id="v864xr"
agent-plugins/
├── catalog/
├── ...
└── catalog.lock
```

Consumer repository:

```text id="om7pm4"
my-project/
├── agent-plugins.yaml
└── agent-plugins.lock
```

---

# 10. Common Lockfile Envelope

Both lockfiles should use a versioned envelope.

Conceptually:

```yaml id="3lyxsg"
apiVersion: agent-plugins.dev/v1alpha1
kind: ProjectLock

metadata:
  ...

spec:
  ...
```

Lockfile kinds:

```text id="sk1m6j"
CatalogLock
ProjectLock
```

---

# 11. Lockfile Versioning

Lockfile schema version must be independent from:

```text id="s8ny7n"
Publisher version

Package version

Catalog release version
```

Recommended initial value:

```text id="3c0wxv"
agent-plugins.dev/v1alpha1
```

---

# 12. Lockfile Format Stability

Before stable V1:

```text id="0135on"
lockfile structure may evolve
```

After stable V1:

```text id="lg2d62"
breaking changes require migration strategy
```

Lockfiles should not rely on undocumented parser behavior.

---

# 13. Deterministic Serialization

Lockfiles must be serialized deterministically.

Equivalent Resolution state should produce equivalent semantic lock content.

Stable ordering must be defined for:

```text id="mn6i1i"
Capabilities

Packages

Components

Targets

dependencies

diagnostics retained in lock
```

---

# 14. Canonical Ordering

Recommended:

Capabilities:

```text id="0y49n8"
Capability ID ascending
```

Publishers:

```text id="5i9u0l"
Publisher ID ascending
```

Packages:

```text id="re4y8u"
Publisher ID
then Package ID
```

Components:

```text id="0kwj93"
canonical Component reference ascending
```

---

# 15. Distribution Lock Scope

`catalog.lock` may contain exact resolution for:

```text id="hs4l6a"
Publishers

Packages

upstream versions

commit refs

integrity hashes
```

It should not contain:

```text id="sa6ox7"
Project Profiles

Project Presets

Project Policy

consumer Capability selections
```

---

# 16. Distribution Lock Example

Conceptually:

```yaml id="ugvdxk"
apiVersion: agent-plugins.dev/v1alpha1
kind: CatalogLock

metadata:
  generatedBy: agent-plugins
  lockVersion: 1

spec:
  packages:
    - publisher: superpowers
      package: superpowers

      version: 6.4.0

      source:
        type: git
        repository: obra/superpowers
        ref: abc123def456

      integrity:
        algorithm: sha256
        value: ...

    - publisher: ecc
      package: ecc

      version: 2.1.0

      source:
        type: git
        repository: ...
        ref: fed987...

      integrity:
        algorithm: sha256
        value: ...
```

Exact schema may evolve.

---

# 17. Distribution Lock Identity

Each locked Package must be identifiable by:

```text id="i27bge"
Publisher ID
+
Package ID
```

Canonical reference:

```text id="lyswk1"
publisher/package
```

Example:

```text id="87m82a"
superpowers/superpowers
```

---

# 18. Distribution Lock Version

Where upstream exposes a human-readable version, record it.

Example:

```yaml id="nwsipn"
version: 6.4.0
```

Version alone should not be relied on for reproducibility if it can move or be retagged.

---

# 19. Immutable Reference

External locked Packages should preferably record an immutable reference.

Examples:

```text id="7rd0uy"
Git commit SHA

content-addressed hash

immutable release artifact ID
```

Example:

```yaml id="v0wk84"
source:
  ref: 33ad20ef8...
```

---

# 20. Integrity Metadata

Where available:

```yaml id="wd48f9"
integrity:
  algorithm: sha256
  value: ...
```

Integrity helps detect:

```text id="mz6jrh"
tampered artifact

unexpected source change

corrupted cache
```

---

# 21. Immutable Ref vs Integrity

These concepts are related but different.

```text id="ooaaes"
immutable ref
→ identifies the intended source revision

integrity hash
→ verifies retrieved content
```

Use both where practical.

---

# 22. Native Package Locking

First-party native Packages do not necessarily require independent upstream version entries.

Their source is the current `agent-plugins` distribution.

They may be represented through:

```text id="m1jn82"
distribution version

repository commit

native package identity
```

rather than external upstream refs.

---

# 23. Distribution Lock Generation

`catalog.lock` should change only through an explicit update workflow.

Conceptually:

```text id="l0qta6"
Current catalog.lock
       ↓
Check upstream
       ↓
Review changes
       ↓
Select approved ref
       ↓
Validate
       ↓
Test
       ↓
Write catalog.lock
```

---

# 24. No Automatic Latest Resolution

Normal Catalog loading must not behave as:

```text id="46qthq"
version: latest
```

Instead:

```text id="gvyk5a"
Catalog
+
catalog.lock
```

defines approved upstream state.

---

# 25. Distribution Lock Update

Example:

```text id="bj353y"
Superpowers

6.3.0
abc123

↓

6.4.0
def456
```

The change should be explicit in `catalog.lock`.

---

# 26. Distribution Lock Review

An update should be reviewable for:

```text id="h2k0o3"
version change

Component additions

Component removals

security-sensitive additions

Capability impact

Target compatibility changes
```

Raw version difference alone is insufficient.

---

# 27. Distribution Lock Does Not Select Capabilities

`catalog.lock` may lock Package X.

That does not imply:

```text id="59de0n"
all Package X Components are selected
```

It only means:

```text id="lr1cv0"
this is the approved Package state available to Resolution
```

---

# 28. Project Lock Scope

`agent-plugins.lock` records:

```text id="w24bs5"
Project resolution metadata

Target

resolved Capabilities

selected implementations

selected Components

dependency Components

resolved Packages

concrete versions

immutable refs

integrity

provenance
```

---

# 29. Project Lock Example

Conceptually:

```yaml id="qrbtaw"
apiVersion: agent-plugins.dev/v1alpha1
kind: ProjectLock

metadata:
  lockVersion: 1
  resolverVersion: 0.1.0

spec:
  target: claude-code

  resolution:
    inputDigest: sha256:...
    catalogDigest: sha256:...

  capabilities:
    - id: engineering.testing.tdd

      implementation:
        component: superpowers/superpowers#skill:test-driven-development

      requiredBy:
        - profile/frontend-engineer
        - preset/engineering/core

  packages:
    - publisher: superpowers
      package: superpowers
      version: 6.4.0
      ref: abc123...

      components:
        selected:
          - skill:test-driven-development
          - skill:systematic-debugging

  ...
```

The final schema should avoid unnecessary verbosity while preserving reproducibility.

---

# 30. Project Lock Metadata

Recommended metadata:

```text id="1vb1j0"
lock schema version

resolver version

generation tool version

resolution mode

target identity
```

Avoid timestamps in semantic comparison unless they are purely informational.

---

# 31. Timestamp Policy

A field such as:

```yaml id="hv8k7m"
generatedAt: ...
```

may be useful for humans.

However, it must not participate in semantic lock equality.

Repeated equivalent Resolution should not produce noisy diffs solely because time changed.

V1 may omit timestamps entirely.

---

# 32. Resolver Version

Record:

```text id="feps4n"
resolverVersion
```

because Resolver algorithm changes may affect selection even with identical manifests and Catalog state.

Example:

```yaml id="pn4lbp"
resolverVersion: 0.1.0
```

---

# 33. Resolver Version Is Not CLI Version

The CLI release and Resolver semantics may initially share one package version.

Conceptually they remain distinct.

Future versions may separate:

```text id="4ald9f"
tool version
resolver semantics version
lock schema version
```

---

# 34. Project Manifest Digest

The lockfile should record a digest of Resolution-relevant normalized Project intent.

Conceptually:

```yaml id="i0f58v"
resolution:
  manifestDigest: sha256:...
```

The digest should include semantic fields only.

---

# 35. Manifest Digest Inputs

Recommended inputs:

```text id="55tmc4"
profile

presets

effective policy reference

targets

Capability overrides

Implementation overrides
```

Exclude:

```text id="tnv49m"
comments

whitespace

metadata.description

YAML formatting
```

---

# 36. Expanded Intent Digest

The system may also record a digest of fully expanded semantic intent.

For example:

```text id="l7ew7x"
expanded Profile

expanded Presets

effective Capability requirements
```

This can improve drift analysis.

It is optional for V1.

---

# 37. Catalog Digest

Project Lock should record the Catalog/distribution identity used during Resolution.

Conceptually:

```yaml id="eqru9n"
resolution:
  catalogDigest: sha256:...
```

This helps determine whether:

```text id="6m3uo9"
same Project intent
```

was resolved against:

```text id="1w3hvj"
same curated distribution
```

---

# 38. Policy Digest

If Policies can change while retaining the same ID, the lock should record either:

```text id="7gmbcl"
policy content digest
```

or include Policy content in the broader Resolution input digest.

Recommended:

```text id="xtz87z"
include normalized Policy in resolutionInputDigest
```

---

# 39. Profile and Preset Digests

Likewise, Profiles and Presets are referenced by ID but their content can change.

The project lock should detect semantic changes even if IDs remain stable.

Preferred:

```text id="kyrspj"
resolutionInputDigest
```

includes normalized expanded composition.

---

# 40. Resolution Input Digest

Recommended conceptual definition:

```text id="ztkcq4"
resolutionInputDigest =
hash(
  normalized project intent
  +
  expanded profile
  +
  expanded presets
  +
  policy
  +
  target descriptor
  +
  relevant catalog semantic state
  +
  distribution identity
)
```

Exact canonical serialization must be deterministic.

---

# 41. Why Digests Matter

Without content digests:

```text id="fzqnkk"
Profile ID unchanged
```

could hide:

```text id="nmx9xr"
Profile contents changed
```

The Lockfile could appear current while semantics actually changed.

---

# 42. Digest Algorithm

Recommended V1:

```text id="137vbv"
SHA-256
```

Representation:

```text id="q9id3v"
sha256:<hex>
```

Example:

```text id="wgflg9"
sha256:a1b2c3...
```

---

# 43. Canonical Serialization for Digests

Never hash raw YAML bytes.

Raw files may differ because of:

```text id="bta9tw"
comments

whitespace

key ordering
```

without semantic change.

Instead:

```text id="smjp1w"
parse
↓
normalize
↓
canonical serialize
↓
hash
```

---

# 44. Lockfile Capability Entries

Each resolved Capability should identify:

```text id="za2l2l"
Capability ID

cardinality

requirement state

selected implementation(s)
```

Possible additional fields:

```text id="2i46yn"
requiredBy

dependencies

selection reason
```

---

# 45. Capability Requirement Provenance

Where practical, persist enough information to explain:

```text id="o4evzg"
why the Capability exists
```

Example:

```yaml id="q6u6vs"
requiredBy:
  - profile/frontend-engineer
  - preset/engineering/core
```

Avoid persisting huge duplicate graph structures if they can be reconstructed reliably.

---

# 46. Selected Implementation

For:

```text id="1lxva9"
cardinality: one
```

a Capability entry may contain one selected implementation.

For:

```text id="jzuhs7"
cardinality: many
```

it may contain several.

Example:

```yaml id="n31g0v"
selected:
  - component: publisher/package#skill:x
```

Using an array consistently may simplify schema design.

---

# 47. Selected Implementation Provenance

Selected implementation should be traceable to:

```text id="2cgfwe"
Component

Package

Publisher
```

The lock may avoid duplicating all Package metadata by referencing canonical Package entries elsewhere in the lock.

---

# 48. Normalized Lock Structure

Prefer normalized references over excessive duplication.

Example:

```text id="vo0bid"
Capabilities
→ reference Components

Components
→ reference Packages

Packages
→ reference Publishers
```

rather than repeating repository/version information under every Capability.

---

# 49. Capability Lock Example

Conceptually:

```yaml id="8k6ef0"
capabilities:
  engineering.testing.tdd:
    cardinality: one

    selected:
      - superpowers/superpowers#skill:test-driven-development

    requiredBy:
      - profile/frontend-engineer
      - preset/engineering/core
```

Map vs array form is a schema choice.

---

# 50. Component Lock Entries

Component state should distinguish:

```text id="dl6j4l"
selected implementation Component

dependency Component
```

Example:

```yaml id="34l98q"
components:
  - id: superpowers/superpowers#skill:test-driven-development
    role: selected

  - id: package-x/package-x#rule:shared-rules
    role: dependency
```

---

# 51. Component Role

Recommended conceptual values:

```text id="8966j1"
selected

dependency
```

A Component may serve both roles.

In that case:

```text id="ylojg7"
roles:
  - selected
  - dependency
```

may be more accurate.

---

# 52. Component-to-Capability Mapping

For selected Components, the lock should be able to identify which Capabilities they satisfy.

Example:

```yaml id="kniox3"
capabilities:
  - engineering.architecture
  - engineering.codebase-design
```

This is useful for explanation and impact analysis.

---

# 53. Suppressed Candidates

The Project Lock does not necessarily need to persist every suppressed candidate.

Trade-off:

Persisting all candidates improves:

```text id="p3z7vv"
offline explainability
historical decision analysis
```

but increases:

```text id="hrmwlt"
lock size

churn

coupling to Catalog candidate universe
```

Recommended V1:

```text id="rfsmly"
persist selected state and compact selection reason

recompute non-selected candidates from current compatible Catalog when needed
```

with caution that current Catalog may differ from historical state.

---

# 54. Historical Explainability

If exact historical explanation is a core requirement, the lock may retain a compact decision snapshot.

Example:

```yaml id="h4mhyw"
decision:
  selectedBecause: catalog-priority
  effectivePriority: 100
```

Optional:

```text id="s5izf3"
suppressed component IDs
```

Full decision graph should not be required in V1.

---

# 55. Rejected Candidates

Rejected candidates generally should not be persisted in the Project Lock.

They are Resolution diagnostics rather than selected state.

Exceptions may exist for:

```text id="nd7blx"
audit mode

enterprise traceability
```

later.

---

# 56. Package Lock Entries

Each resolved Package should record:

```text id="66lk2n"
Publisher

Package

version

immutable ref

source

integrity

required Components
```

---

# 57. Package Lock Example

```yaml id="w87exr"
packages:
  - id: superpowers/superpowers

    version: 6.4.0

    source:
      type: git
      repository: obra/superpowers
      ref: abc123def456

    integrity:
      algorithm: sha256
      value: ...

    components:
      - skill:test-driven-development
      - skill:systematic-debugging
```

---

# 58. Package Source Provenance

The Project Lock should preserve enough provenance to reproduce the Package without requiring mutable Catalog state.

Recommended:

```text id="5rqdqo"
Publisher ID

Package ID

source type

repository/source locator

immutable ref

integrity
```

---

# 59. Why Persist Source Information

If only:

```text id="0xy4fn"
publisher/package
```

is stored, future Catalog changes could make historical reproduction ambiguous.

Persisting source provenance improves long-term lock durability.

---

# 60. Catalog Duplication in Project Lock

Some duplication between Catalog and Project Lock is intentional.

The Catalog owns current semantic metadata.

The Project Lock owns the concrete historical snapshot necessary for reproduction.

Therefore storing:

```text id="h5yecb"
source ref

integrity

version
```

in both `catalog.lock` and `agent-plugins.lock` is acceptable.

---

# 61. Project Lock vs Distribution Lock Version

Normally:

```text id="0wckz4"
Project Package ref
```

will correspond to an approved Package state in:

```text id="xhyvx1"
catalog.lock
```

The Project Lock should persist the concrete chosen ref rather than merely referencing the current distribution lock indirectly.

---

# 62. Why Copy Concrete Package Refs

Consider:

```text id="75orq1"
Project resolved against Catalog v1

later Catalog updates Package X
```

If Project Lock only says:

```text id="lnmgic"
use catalog.lock Package X
```

historical reproduction changes.

Therefore Project Lock should preserve:

```text id="mr63ks"
exact Package ref used
```

---

# 63. Lockfile Target

Project Lock must record Target identity.

V1:

```yaml id="bsaxlc"
target: claude-code
```

Future multi-target structure may become:

```yaml id="gs71pf"
targets:
  claude-code:
    ...
  codex:
    ...
```

Do not overdesign this before second-target implementation.

---

# 64. Target-Specific Lock Data

Keep target-specific metadata minimal.

The Project Lock should primarily represent normalized Resolution.

Runtime-specific generated paths and files belong to the Target Adapter.

Target-specific lock metadata is justified only when necessary for reproducibility.

---

# 65. Managed State Metadata

A Target Adapter may require identifiers to determine which runtime state it owns.

Possible location:

```text id="8trdsw"
target-specific state file
```

or compact metadata in the Project Lock.

Avoid turning the semantic Lockfile into a full mirror of runtime filesystem state.

---

# 66. Actual State Is Not Lock State

Project Lock:

```text id="gxss4x"
what should be concretely materialized
```

Actual State:

```text id="q8dukw"
what currently exists
```

They may differ.

That difference is:

```text id="9y6q44"
runtime drift
```

---

# 67. Lockfile Does Not Guarantee Runtime Applied

Writing a Lockfile does not by itself prove Target materialization succeeded.

Preferred sync sequence:

```text id="0mkj1n"
resolve
↓
build materialization plan
↓
apply
↓
verify
↓
commit final lock state
```

or otherwise use transactional state markers.

---

# 68. Failed Materialization

If materialization fails:

```text id="gj1u8m"
do not claim successful final lock state
```

Possible strategies:

```text id="6e481f"
keep previous lock

write temporary pending lock

rollback runtime changes
```

Exact behavior belongs in adapter/sync specs.

---

# 69. Lockfile Atomic Write

Lockfiles should be written atomically where practical.

Example:

```text id="wpjk7j"
write temp file
↓
fsync if needed
↓
rename
```

This avoids partially written locks after interruption.

---

# 70. Lockfile Validation

A Lockfile must pass:

```text id="n9vp4c"
schema validation

reference consistency

digest validation where applicable

Package/Component consistency

target consistency
```

before use.

---

# 71. Invalid Lockfile

If parsing or validation fails:

```text id="1cfl8u"
LOCK_INVALID
```

The CLI must not silently treat malformed lock state as valid.

Depending on command:

```text id="zqu4s0"
fresh re-resolution
```

may be possible after explicit user-visible handling.

---

# 72. Missing Project Lock

For:

```text id="o8kblm"
ap sync
```

with no `agent-plugins.lock`:

```text id="7s62t5"
resolution mode = fresh
```

The Resolver produces a new lock.

---

# 73. Missing Distribution Lock

For external Packages requiring pinned curated state, missing `catalog.lock` should generally fail distribution Catalog loading.

Diagnostic:

```text id="nlxmjv"
CATALOG_LOCK_MISSING
```

External Resolution should not silently use latest upstream.

---

# 74. Partial Distribution Lock

If a curated external Package exists in Catalog but lacks a required lock entry:

```text id="snhjwa"
CATALOG_PACKAGE_NOT_LOCKED
```

unless its Package version strategy explicitly does not require distribution locking.

---

# 75. Lockfile Staleness

A Project Lock is stale when Resolution-relevant desired state changed.

Examples:

```text id="fr0eqf"
Project Manifest semantic change

Profile content change

Preset content change

Policy change

Target change

Catalog semantic change required by project
```

---

# 76. `LOCK_STALE`

When the current lock cannot represent current desired semantic state:

```text id="7flshn"
LOCK_STALE
```

should be reported.

---

# 77. Stale vs Update Available

These are different.

```text id="qphblm"
LOCK_STALE
```

means:

```text id="nc8eyc"
current lock no longer matches required input state
```

`UPDATE_AVAILABLE` means:

```text id="d54kyn"
newer curated state exists
but current lock remains valid
```

Normal sync should not confuse them.

---

# 78. Example — Manifest Changed

Original:

```text id="beu5dx"
stacks/nextjs
```

New:

```text id="vkrt6d"
stacks/nextjs
engineering/security
```

Existing lock lacks security capabilities.

Result:

```text id="cnyog8"
LOCK_STALE
```

Re-resolution required.

---

# 79. Example — New Catalog Version Available

Project remains unchanged.

Existing locked Package:

```text id="lc6tzm"
Superpowers 6.3
```

Distribution now curates:

```text id="im53wh"
Superpowers 6.4
```

If current project lock remains valid:

```text id="70cz6x"
not stale
```

Potentially:

```text id="df5frm"
update available
```

---

# 80. Example — Policy Changed

Project:

```text id="tstzzw"
policy: strict
```

Policy definition changes to deny an implementation currently locked.

The lock becomes invalid under current desired policy.

Result:

```text id="xzziph"
LOCK_STALE
or LOCK_POLICY_INVALIDATED
```

Exact diagnostic naming may be refined.

---

# 81. Lock Revalidation

Before preserving an existing lock during normal sync, verify:

```text id="ig25o4"
Capability still required

implementation still mapped

Package still available

Policy still allows it

Target still supports it

dependencies still valid

version/ref still retrievable where required
```

---

# 82. Valid Existing Lock Preference

If all relevant checks pass:

```text id="w8cfv9"
existing locked implementation
```

receives strong preference in normal sync.

This preserves stability.

---

# 83. Lock Preservation Does Not Override Hard Constraints

Existing lock must be discarded for affected selection if:

```text id="66ncl9"
policy denies implementation

Target no longer supports it

Component removed

dependency invalid

Project override changed

Package unavailable
```

---

# 84. Partial Lock Reuse

When Project intent changes, unaffected locked selections may be reused.

Example:

```text id="3qh8gn"
existing:
planning
TDD
debugging

new requirement:
security.review
```

Resolver may preserve:

```text id="876huf"
planning
TDD
debugging
```

while resolving:

```text id="9w2zkr"
security.review
```

---

# 85. Why Partial Reuse

Recomputing everything may cause unnecessary implementation churn.

Desired behavior:

```text id="exdg3u"
change only what must change
```

while maintaining deterministic correctness.

---

# 86. Lock Reuse Unit

The natural reuse unit is primarily:

```text id="o1h5b1"
Capability implementation selection
```

plus:

```text id="5f1qfj"
Package version
```

subject to dependencies.

The entire lock should not be treated as all-or-nothing.

---

# 87. Lockfile Dependency Closure

When reusing a locked selection, its complete required dependency closure must also remain valid.

Do not reuse:

```text id="yaoovz"
Component A
```

if its locked dependency:

```text id="1c11w3"
Component B
```

is no longer usable.

---

# 88. Sync Mode

Normal:

```text id="isq26t"
ap sync
```

uses:

```text id="r7h3nu"
existing lock preservation
```

where valid.

It should not upgrade versions simply because newer curated versions exist.

---

# 89. Update Mode

Explicit:

```text id="8c6e8e"
ap update
```

may intentionally reconsider:

```text id="8a263x"
Package versions

implementation selections

newly curated alternatives
```

depending on update scope.

---

# 90. Update Check

```text id="xu012e"
ap update --check
```

must not mutate:

```text id="bfydwk"
catalog.lock

agent-plugins.lock

runtime state
```

It only reports possible changes.

---

# 91. Distribution Update vs Project Update

Distribution update:

```text id="5xjmnt"
upstream
→ catalog.lock
```

Project update:

```text id="wpo8fo"
new approved distribution state
→ agent-plugins.lock
```

These are independent operations.

---

# 92. Project Cannot Select Unapproved Upstream Latest by Default

Normal consumer Resolution should not skip `catalog.lock` and directly fetch:

```text id="l297si"
latest Publisher version
```

This would bypass curation.

---

# 93. Advanced Version Override

V1 should not allow arbitrary Project Package version overrides by default.

Avoid:

```yaml id="uwx0xx"
packages:
  superpowers:
    version: latest
```

This belongs outside normal capability-oriented consumer behavior.

---

# 94. Future Advanced Pinning

A future expert mode could allow:

```text id="azgscu"
custom Package source/ref
```

but it must be clearly represented as an explicit trust/reproducibility escape hatch.

Not required for V1.

---

# 95. Lockfile Reproducibility Goal

Given:

```text id="e8dio2"
Project Lock

compatible tool version

access to locked sources
```

the system should be able to reconstruct an equivalent resolved environment.

---

# 96. Reproducibility Levels

Useful conceptual levels:

```text id="ynob7o"
semantic reproducibility

source reproducibility

byte reproducibility
```

Semantic:

```text id="ipzxbd"
same selected capabilities/components
```

Source:

```text id="enx68j"
same upstream source revisions
```

Byte:

```text id="8qp0bl"
identical fetched artifact bytes
```

V1 should aim for at least semantic + source reproducibility.

Integrity metadata improves byte-level confidence.

---

# 97. Reproducibility Limitations

Reproduction may still fail if:

```text id="cf5xs0"
upstream artifact disappears

network unavailable

runtime version incompatible

external Package installation behavior changed

required external service unavailable
```

The Lockfile records intent and source identity; it cannot guarantee permanent external availability.

---

# 98. Lockfile Integrity Check

When retrieving locked Package content:

```text id="mu7voy"
fetch
↓
verify immutable ref
↓
verify integrity if available
↓
accept
```

Mismatch should fail.

Recommended diagnostic:

```text id="pj41dh"
INTEGRITY_MISMATCH
```

---

# 99. Integrity Is Not Optional When Declared

If Lockfile contains an integrity hash, retrieval must verify it.

Do not silently ignore failed verification.

---

# 100. Source Ref Mismatch

If retrieved source revision differs from locked ref:

```text id="994k9p"
SOURCE_REF_MISMATCH
```

even if upstream version label appears the same.

---

# 101. Mutable Tags

A tag such as:

```text id="0mxfqb"
v6.4.0
```

may theoretically move upstream.

Therefore Lockfile should prefer:

```text id="mtvf10"
tag/version
+
immutable commit
```

where possible.

---

# 102. Local Cache

Downloaded Packages may be cached.

Cache does not alter lock semantics.

```text id="xzcvta"
Lockfile
→ what content is expected

Cache
→ where content may already exist
```

Cached content must still satisfy locked integrity.

---

# 103. Offline Mode

If all locked artifacts are available locally:

```text id="5q4pf2"
reproduction may work offline
```

Core Resolution should not require remote latest checks.

---

# 104. Lockfile and Source Adapters

Source adapters help retrieve and normalize locked upstream state.

They must not silently substitute a different version if the locked source is unavailable.

Fail instead.

---

# 105. Lockfile and Target Adapters

Target adapters consume Resolution/Lock state.

They must not choose alternative semantic implementations.

If a locked implementation cannot be materialized:

```text id="nxn7j6"
report incompatibility
```

rather than substituting silently.

---

# 106. Lockfile and Policy

Project Lock does not permanently override current Policy.

During normal sync:

```text id="2inf45"
existing lock
↓
revalidate under current Policy
```

If invalid:

```text id="9hlzcy"
selection must change or Resolution must fail
```

---

# 107. Lockfile and Capability Mapping

If current Catalog no longer maps locked Component X to Capability Y:

```text id="re26qf"
lock requires revalidation
```

Normal preservation should not assume stale semantic mappings remain valid forever.

---

# 108. Historical Mapping Snapshot

For stronger long-term reproduction, the Project Lock may record:

```text id="5kiz8r"
Capability → selected Component
```

directly.

Therefore even if current Catalog mapping changes, the historical lock remains understandable.

Whether the current tool permits reproduction of old mapping depends on compatibility policy.

---

# 109. Lockfile Forward Compatibility

Unknown lockfile fields should be handled according to `apiVersion`.

The parser should not silently ignore semantics from a future unsupported version.

Unsupported version:

```text id="ocgvmh"
UNSUPPORTED_LOCK_VERSION
```

---

# 110. Lockfile Migration

Future:

```text id="f2nx8y"
v1alpha1
→ v1beta1
```

may require migration.

Conceptually:

```text id="813lsu"
Old Lock
↓
Lock Migration
↓
Current Lock DTO
↓
Validation
```

Migration must preserve semantic concrete selections where possible.

---

# 111. Project Lock Schema Location

Recommended:

```text id="wt6u7v"
packages/schemas/schemas/project-lock.schema.json
```

or:

```text id="qlw8gc"
packages/schemas/schemas/v1alpha1/project-lock.schema.json
```

---

# 112. Catalog Lock Schema Location

Recommended:

```text id="ydyb0n"
packages/schemas/schemas/catalog-lock.schema.json
```

or versioned equivalent.

---

# 113. Lockfile Unknown Fields

Recommended V1 behavior:

```text id="6ekepi"
reject unknown fields
```

This prevents unnoticed incompatibility.

---

# 114. Lockfile Human Readability

Lockfiles should remain inspectable by humans.

However:

```text id="rlh18c"
human editing convenience
```

is secondary to:

```text id="x82xcm"
deterministic machine semantics
```

---

# 115. YAML vs JSON

Project Manifest uses YAML.

For Lockfiles, good candidates are:

```text id="3ke1rc"
YAML
JSON
```

Recommended V1:

```text id="t26g7v"
YAML
```

if consistency with manifests and reviewability is prioritized.

Alternative:

```text id="d34x05"
JSON
```

if deterministic tooling and stricter generation are preferred.

---

# 116. Recommended Lockfile Format

For this project, YAML is recommended initially because:

```text id="nlv2k5"
human inspection matters

Git diffs matter

Project Manifest already uses YAML
```

But generators must control formatting.

Lockfile extension remains:

```text id="zt6rbp"
agent-plugins.lock
```

so format can remain an implementation detail.

---

# 117. Lockfile Header

A generated lock may include a comment:

```yaml id="8tfbky"
# This file is generated by agent-plugins.
# Do not edit manually.
```

Comments are optional.

Machine semantics must not depend on them.

---

# 118. Dirty Lock Detection

If a user manually edits the Lockfile into a valid but inconsistent state, semantic validation should detect mismatches where possible.

Examples:

```text id="laegbr"
Component does not belong to Package

Capability references unlisted Component

Package integrity missing unexpectedly
```

---

# 119. Lock Self-Consistency

A Project Lock must satisfy:

```text id="w2zx1u"
every selected Component exists in Components section

every Component belongs to a resolved Package

every Capability selected implementation references a valid Component

every Package has valid Publisher identity

no duplicate IDs

target matches resolution metadata
```

---

# 120. Lockfile Dependency Graph

Persist enough dependency information to reproduce selected Package/Component closure.

The exact full Capability graph need not be duplicated if it is not necessary for reproduction.

Prefer locking:

```text id="s7f7eu"
concrete implementation closure
```

over copying all Catalog semantics.

---

# 121. Lockfile Minimality

A Project Lock should contain:

```text id="memyxl"
only state required for:

reproduction
validation
explanation
drift detection
```

Avoid turning it into a full Catalog snapshot.

---

# 122. Lockfile Completeness vs Size

The design trade-off is:

```text id="s26jma"
more historical metadata
→ better offline explanation
→ larger lock / more churn

less historical metadata
→ smaller lock
→ stronger dependency on current Catalog
```

Recommended V1 balance:

```text id="gsnk85"
persist selected semantic mapping
persist concrete package provenance
persist input digests
do not persist full candidate universe
```

---

# 123. Recommended Project Lock Sections

Conceptually:

```text id="7lz8sq"
metadata

resolution

capabilities

components

packages
```

Potential future:

```text id="cx5jyn"
targets

diagnostics

decisions
```

---

# 124. Recommended Project Lock Shape

```yaml id="3qaord"
apiVersion: agent-plugins.dev/v1alpha1
kind: ProjectLock

metadata:
  lockVersion: 1
  resolverVersion: 0.1.0

resolution:
  target: claude-code

  manifestDigest: sha256:...
  inputDigest: sha256:...
  catalogDigest: sha256:...

capabilities:
  engineering.testing.tdd:
    selected:
      - superpowers/superpowers#skill:test-driven-development

  engineering.debugging:
    selected:
      - superpowers/superpowers#skill:systematic-debugging

components:
  superpowers/superpowers#skill:test-driven-development:
    package: superpowers/superpowers
    roles:
      - selected

  superpowers/superpowers#skill:systematic-debugging:
    package: superpowers/superpowers
    roles:
      - selected

packages:
  superpowers/superpowers:
    version: 6.4.0

    source:
      type: git
      repository: obra/superpowers
      ref: abc123...

    integrity:
      algorithm: sha256
      value: ...
```

This example is conceptual, not final schema.

---

# 125. Why Maps May Be Preferable

Using canonical IDs as keys may provide:

```text id="36k1b1"
natural deduplication

smaller files

easy lookup

stable identity
```

Example:

```yaml id="tffxxm"
packages:
  superpowers/superpowers:
    ...
```

Arrays may be easier for schemas and future ordering.

The final schema should choose one consistent strategy.

---

# 126. Recommended V1 Choice

Recommended:

```text id="og3yng"
maps for uniquely keyed entity collections
```

such as:

```text id="6xuu5f"
capabilities

components

packages
```

because the canonical IDs already provide keys.

---

# 127. Required-By Data

`requiredBy` is useful but may create noisy lock changes when composition structure changes without actual selected state changing.

Recommended:

```text id="vbl3yj"
do not require full requiredBy provenance for V1 reproduction
```

Instead preserve it in:

```text id="rtk1vm"
Resolution object
```

and optionally compactly in Lockfile for explanation.

---

# 128. Selection Reason

Recommended compact representation:

```yaml id="02k7td"
selection:
  reason: existing-lock
```

Possible reason codes:

```text id="yitpzv"
explicit-override

existing-lock

policy-preference

target-preference

catalog-priority

single-candidate

cardinality-many
```

---

# 129. Stable Reason Codes

If stored in locks, reason values should be machine-stable codes rather than human prose.

Human-readable CLI text can be generated from them.

---

# 130. Lockfile Diff

Lockfile diffs should communicate meaningful changes.

Examples:

```text id="65ojv7"
Capability implementation changed

Package version changed

Component added

Component removed

Target changed
```

Stable serialization is critical for readable diffs.

---

# 131. Semantic Diff

Future:

```bash id="e1j67d"
ap diff
```

should compare semantic lock entities rather than raw text.

Example:

```text id="cniazu"
engineering.testing.tdd

Superpowers
→ Matt Pocock
```

is more useful than several YAML line changes.

---

# 132. Lockfile Update Scope

An update may target:

```text id="nr6azk"
all Packages

one Publisher

one Package

one Capability selection
```

V1 may implement only:

```text id="jsutyy"
global

Publisher-level
```

initially.

---

# 133. Scoped Update Preservation

If updating Publisher A:

```text id="vpa3bk"
unrelated Publisher B selections
```

should remain locked where possible.

Update operations should minimize unrelated churn.

---

# 134. Capability Implementation Update

A Catalog priority change alone should not force normal sync to replace a valid locked implementation.

Explicit update may reconsider it.

---

# 135. Package Version Update

Package version update may preserve:

```text id="c1bf0h"
same semantic Capability implementation
```

while changing:

```text id="o013rb"
source ref
integrity
```

This should be visible in lock diff.

---

# 136. Implementation Change

More significant:

```text id="1nm9d9"
Capability X

Publisher A Component
→ Publisher B Component
```

This should be prominently visible.

---

# 137. Security-Sensitive Lock Diff

Changes adding:

```text id="y21ts4"
hook

script

command

MCP server
```

should be highlighted during update review where metadata permits.

---

# 138. Lockfile Auditability

A reviewer should be able to answer:

```text id="69964b"
Which capabilities are active?

Which implementation provides each?

Which packages are required?

Which exact upstream refs are used?

What changed from the previous lock?
```

without scanning generated runtime state.

---

# 139. Lockfile Does Not Replace SBOM

The Project Lock may resemble a software bill of materials.

However, V1 is not intended to provide a complete SBOM implementation.

Future inventory export may derive from Lockfile data.

---

# 140. Lockfile Does Not Replace Package Manager Locks

`agent-plugins.lock` does not replace:

```text id="ummskx"
pnpm-lock.yaml

package-lock.json

uv.lock

Cargo.lock
```

Those lock general software dependencies.

`agent-plugins.lock` locks AI agent capability resolution.

---

# 141. Nested Package Dependencies

If an external Package itself uses npm or another package manager:

```text id="ja2av1"
agent-plugins.lock
```

does not need to duplicate every transitive dependency from that ecosystem.

The Package's native dependency manager remains responsible.

---

# 142. Runtime Tool Dependencies

If a Component requires:

```text id="m72c1c"
Node

Python

browser binary
```

the Lockfile may record the requirement where relevant.

It does not need to become a complete workstation lockfile.

---

# 143. Lockfile Security

Lockfiles may contain:

```text id="n6p36b"
public repositories

hashes

Package names

Component names
```

They must not contain:

```text id="xnym7a"
API tokens

passwords

private keys

secret environment values
```

---

# 144. Private Sources

If future Packages come from private repositories, the lock may record:

```text id="q1jmip"
source identity
```

but never authentication secrets.

Credentials belong to external credential systems.

---

# 145. Relative Paths

For local/native sources, stored paths should be:

```text id="ypk8ve"
repository-relative
```

where possible.

Avoid absolute machine paths.

---

# 146. Local Package Locking

Future local external Packages may require content hashes.

Example:

```yaml id="3rg89m"
source:
  type: filesystem
  path: ./agent-tools/custom

integrity:
  algorithm: sha256
  value: ...
```

Not required for V1 unless local Package sources are supported.

---

# 147. Lockfile Commit Policy

Recommended:

```text id="brnjrt"
commit catalog.lock
```

in the distribution repository.

Recommended:

```text id="40ze0f"
commit agent-plugins.lock
```

in consumer repositories.

This enables code review of dependency and implementation changes.

---

# 148. Lockfile Merge Conflicts

Because lockfiles are generated:

```text id="tyl42h"
manual conflict resolution
```

should be minimized.

Preferred:

```text id="y8z05s"
resolve manifest/catalog conflict
↓
regenerate lock
```

when safe.

---

# 149. Regenerating a Project Lock

Command concept:

```bash id="ps0q7a"
ap sync
```

should regenerate or update the Lockfile according to normal lock-preservation semantics.

A destructive:

```text id="zm9e9r"
delete lock
```

changes Resolution mode to fresh and may change implementation selections.

This should be understood as meaningful.

---

# 150. Fresh Lock Warning

If an existing Lockfile is removed:

```text id="1qxfsp"
fresh resolution
```

may select newer or differently preferred approved implementations.

The CLI may warn before intentionally resetting lock state.

---

# 151. Frozen Mode

CI should eventually support behavior equivalent to:

```text id="t0aa6v"
frozen lock
```

Meaning:

```text id="t480g2"
Manifest and Lock must already agree

no Lockfile mutation allowed
```

Potential command:

```bash id="whm2wh"
ap sync --frozen
```

or:

```bash id="8u88vo"
ap validate --locked
```

Exact CLI belongs in `cli-spec.md`.

---

# 152. Frozen Lock Failure

CI should fail when:

```text id="4lhvtl"
Lock missing

Lock invalid

Lock stale

locked Package unavailable

integrity mismatch
```

rather than modifying repository state.

---

# 153. Lockfile CI Use

Typical CI flow:

```text id="o75k5x"
parse manifest
↓
validate lock
↓
revalidate Resolution
↓
verify no drift
↓
optionally verify target generation
```

---

# 154. Distribution Frozen Check

Distribution CI should verify:

```text id="q28jv2"
catalog.lock valid

all external Packages pinned

generated discovery matches locked refs

no generated drift
```

---

# 155. Lockfile Diagnostics

Recommended diagnostic codes:

```text id="ttxfxz"
LOCK_MISSING

LOCK_INVALID

LOCK_STALE

LOCK_TARGET_MISMATCH

LOCK_RESOLVER_VERSION_UNSUPPORTED

CATALOG_LOCK_MISSING

CATALOG_LOCK_INVALID

CATALOG_PACKAGE_NOT_LOCKED

LOCKED_COMPONENT_MISSING

LOCKED_PACKAGE_MISSING

LOCKED_IMPLEMENTATION_INVALID

SOURCE_REF_MISMATCH

INTEGRITY_MISMATCH

UNSUPPORTED_LOCK_VERSION
```

---

# 156. Lockfile Doctor Checks

`ap doctor` should eventually inspect:

```text id="3k7eqt"
Manifest ↔ Lock consistency

Lock ↔ Catalog consistency

Lock ↔ Policy consistency

Lock ↔ Target compatibility

Lock ↔ Runtime Managed State
```

---

# 157. Lockfile Explainability

`ap explain` may use the Lockfile to answer:

```text id="2j8chv"
which implementation is locked

which Package contains it

which version/ref is used
```

Current Catalog/Resolution metadata may supplement:

```text id="7uut8b"
why alternatives were suppressed
```

---

# 158. Historical Catalog Compatibility

An old Project Lock may refer to a Component no longer present in the current Catalog.

Possible states:

```text id="utq3xg"
artifact still reproducible

artifact unavailable

semantic mapping deprecated
```

The tool should distinguish these rather than simply calling the lock corrupt.

---

# 159. Historical Reproduction

Future architecture may support reproducing directly from Lockfile provenance even if current Catalog has evolved.

This is desirable but not required to be complete in early V1.

The Lockfile schema should avoid making it impossible.

---

# 160. Lockfile Garbage Collection

Removing a Capability may make:

```text id="syvxgs"
Components

Packages
```

unreferenced.

Regenerated Lockfile should remove unreachable entries.

---

# 161. Reachability Rule

Every locked Component should be reachable from:

```text id="mjlln5"
selected Capability implementation
```

or:

```text id="5a4ibd"
required Component dependency
```

Every locked Package should be reachable from a locked Component.

---

# 162. Orphan Lock Entries

Orphan:

```text id="nn6wsj"
Package with no required Component
```

or:

```text id="p8m6qp"
Component with no semantic/dependency reason
```

should fail validation or be removed during lock normalization.

---

# 163. Lock Normalization

Before serialization:

```text id="0wh82i"
deduplicate

remove unreachable entries

sort canonical IDs

normalize source refs

normalize integrity format
```

---

# 164. Lockfile Equality

Semantic equality should ignore:

```text id="8q6uhj"
comments

formatting

informational timestamp
```

and compare normalized lock state.

---

# 165. Lock Digest

The Lockfile itself may expose:

```text id="3w9kl5"
lockDigest
```

computed over normalized semantic content.

Useful for:

```text id="we1iht"
runtime managed-state markers

cache keys

CI comparisons
```

Optional for V1.

---

# 166. Self-Hash Problem

If storing `lockDigest` inside the Lockfile, exclude that field from its own digest calculation.

Conceptually:

```text id="l32l2t"
lockDigest =
hash(lock without lockDigest)
```

---

# 167. Runtime State Marker

A Target Adapter may store:

```text id="08gx14"
project lock digest
```

in managed runtime metadata.

Then:

```text id="pnzr9p"
runtime digest
≠
current lock digest
```

can quickly identify possible drift.

This is optional adapter behavior.

---

# 168. Lockfile and Multiple Targets

Future model may choose:

```text id="u5oqdi"
one Project Lock
containing per-target Resolution
```

or:

```text id="7k70ib"
separate locks per target
```

Recommended direction:

```text id="vh6qwm"
one Project Lock
+
per-target resolution sections
```

because semantic Project intent is shared.

Not required for V1.

---

# 169. V1 Single-Target Simplicity

V1 should use:

```text id="t8dr21"
one Target
one project lock
```

without prematurely implementing nested multi-target complexity.

---

# 170. Catalog Lock and Multiple Target Support

`catalog.lock` remains largely Target-independent.

A pinned Package may support:

```text id="k5dgdw"
one

many

no currently enabled Targets
```

Target compatibility remains catalog/component metadata.

---

# 171. Lockfile Change Categories

Project Lock changes should be classifiable as:

```text id="ww4oms"
intent-driven

policy-driven

catalog-driven

update-driven

target-driven

resolver-version-driven
```

This can improve future diff reporting.

---

# 172. Intent-Driven Change

Example:

```text id="pil7yo"
+ engineering/security Preset
```

causes new Capability selections.

---

# 173. Policy-Driven Change

Example:

```text id="p5fgqt"
community publisher no longer allowed
```

causes implementation replacement.

---

# 174. Catalog-Driven Change

Example:

```text id="cp1kik"
locked Component removed from curated Catalog
```

may require a new implementation.

---

# 175. Update-Driven Change

Example:

```text id="bmnbo9"
Package 6.3 → 6.4
```

after explicit update.

---

# 176. Target-Driven Change

Example:

```text id="g5b49z"
Claude Code → Codex
```

may change implementation selection.

---

# 177. Resolver-Driven Change

A Resolver semantic upgrade may produce a different valid selection.

Such behavior should be considered a potentially breaking change and clearly surfaced.

---

# 178. Lockfile Churn Principle

Minimize lockfile churn.

Do not rewrite unrelated sections because:

```text id="qle458"
format changed

iteration order changed

current timestamp changed
```

Stable diffs are a product feature.

---

# 179. Distribution Lock Churn

Likewise, updating one Publisher should not reorder or rewrite all unrelated entries.

---

# 180. Lockfile Reviewability

A human reviewer should quickly see:

```text id="u0fn14"
what capability changed

which implementation changed

which Package changed version

whether security-sensitive Components were introduced
```

Future CLI diff should optimize for this.

---

# 181. V1 `catalog.lock` Minimum Fields

For external Packages:

```text id="ykq0zr"
Publisher ID

Package ID

human version if available

immutable source ref

source locator

integrity when available
```

---

# 182. V1 `agent-plugins.lock` Minimum Fields

```text id="4wuf7o"
Lock schema version

Resolver version

Target

Resolution input digest

Catalog/distribution digest or identity

resolved Capabilities

selected Components

resolved Packages

exact Package refs

provenance

integrity where available
```

---

# 183. V1 May Defer

V1 may defer:

```text id="bp1aqv"
full rejected-candidate history

signed lockfiles

cryptographic package signatures

SBOM export

multi-target lock sections

organization audit metadata

historical Catalog snapshots

advanced Package constraint solving
```

---

# 184. Future Signed Locks

Future enterprise or supply-chain features may support:

```text id="k4grkr"
signed catalog.lock

signed Project Lock
```

This is not required for V1.

Integrity hashes should be supported independently from signatures.

---

# 185. Future SBOM Export

Because Project Lock contains:

```text id="yjllx1"
Publishers

Packages

Components

versions

refs
```

it may later support:

```text id="jxg76r"
SBOM-like inventory export
```

without making SBOM a core V1 responsibility.

---

# 186. Future Audit Trail

The system may eventually record:

```text id="73rgg6"
who approved update

when

review status

security findings
```

These should not be required in V1 lockfiles.

---

# 187. Anti-Pattern — One Lock for Everything

Avoid:

```text id="d365o9"
one global lock
```

combining distribution and consumer state.

It creates unclear ownership.

---

# 188. Anti-Pattern — Version in Manifest, Not Lock

Avoid:

```yaml id="ehwucr"
profile: frontend-engineer

packages:
  superpowers: 6.4
```

Semantic intent and concrete resolution should remain separate.

---

# 189. Anti-Pattern — Lock Contains Only Package Versions

A lock such as:

```yaml id="z0kyav"
packages:
  superpowers: 6.4
  ecc: 2.0
```

is insufficient.

It loses:

```text id="zn6g9n"
Capability mapping

selected Components

semantic provenance

target information
```

---

# 190. Anti-Pattern — Full Catalog Snapshot in Every Project

Avoid copying:

```text id="3uor6k"
all Publishers

all Capabilities

all Candidate implementations
```

into every Project Lock.

The Lock should capture the resolved closure, not the entire ecosystem.

---

# 191. Anti-Pattern — Lock Uses Mutable Branch

Avoid:

```yaml id="ww09dd"
ref: main
```

as the only concrete upstream reference.

Prefer immutable commit.

---

# 192. Anti-Pattern — Automatic Lock Update During Sync

Normal:

```text id="u1mtkk"
ap sync
```

must not silently upgrade valid Package versions just because newer curated state exists.

---

# 193. Anti-Pattern — Trust Lock Without Revalidation

Existing Lock is a strong preference, not an exemption.

Always revalidate:

```text id="ps7d1i"
Policy

Target

availability

hard dependencies
```

---

# 194. Anti-Pattern — Runtime as Lockfile

Do not reconstruct desired locked state solely by scanning:

```text id="i7zbyx"
.claude/

installed plugins
```

Runtime is Actual State, not the Project Lock.

---

# 195. Anti-Pattern — Timestamp Noise

Avoid rewriting:

```text id="dlubme"
generatedAt
```

on every no-op sync if it creates meaningless Git changes.

---

# 196. Anti-Pattern — Store Secrets

Lockfiles must never contain:

```text id="zkxnwi"
access tokens

passwords

private keys

secret query parameters
```

---

# 197. Project Lock Validation Invariants

A valid Project Lock must satisfy:

```text id="ghpy74"
1. Every locked Capability ID is unique.

2. Every selected implementation references a locked Component.

3. Every locked Component references a locked Package.

4. Every locked Package references a Publisher.

5. Every Package has a concrete approved source state.

6. Required source refs are immutable where supported.

7. Integrity metadata is structurally valid.

8. No orphan Components exist.

9. No orphan Packages exist.

10. Target identity is valid.

11. Resolver/schema version is supported.

12. Semantic digests are well-formed.
```

---

# 198. Distribution Lock Validation Invariants

A valid `catalog.lock` must satisfy:

```text id="tggkff"
1. Every entry references a known Package.

2. Every external Package requiring a lock has one.

3. Every locked Package has a concrete upstream source ref.

4. Immutable refs are syntactically valid.

5. Integrity metadata is valid where present.

6. No duplicate Package identities exist.

7. Generated discovery can be reproduced from locked state.
```

---

# 199. Runtime Reproduction Invariant

For a valid Project Lock:

```text id="6wri4u"
selected Capability implementation
→ Component
→ Package
→ concrete source
```

must always be traversable.

If that chain cannot be reconstructed, the Lock is incomplete.

---

# 200. Lock Preservation Invariant

In normal sync:

> **A valid locked selection should not change merely because another eligible implementation or newer approved Package version exists.**

This is the primary stability guarantee of the Project Lock.

---

# 201. Update Invariant

In explicit update mode:

> **The Resolver may reconsider locked selections, but all new state must still satisfy the same hard constraints, Policy, Target compatibility, and reproducibility requirements.**

---

# 202. Lockfile Acceptance Criteria

The lockfile model is V1-ready when:

```text id="nis38t"
catalog.lock can pin all external initial Publishers

Project Resolution can produce agent-plugins.lock

same Manifest + locked distribution produces stable Project Lock

Project Lock captures Capability → Component → Package → Publisher

exact upstream refs are persisted

normal sync preserves valid locked selection

Manifest change causes appropriate re-resolution

Policy change invalidates forbidden lock state

explicit update can change versions/selections

integrity mismatches fail

orphan lock entries are impossible

semantic lock diffs remain stable and readable
```

---

# 203. Dual-Lock Example

Distribution:

```text id="7a20cl"
catalog.lock

Superpowers
→ v6.4
→ abc123

ECC
→ v2.1
→ def456
```

Project:

```text id="4rbkza"
agent-plugins.yaml

profile:
frontend-engineer
```

Resolution:

```text id="5bb2dw"
engineering.testing.tdd
→ Superpowers

engineering.security
→ ECC
```

Project lock:

```text id="9ux47r"
agent-plugins.lock

TDD
→ Superpowers
→ abc123

Security
→ ECC
→ def456
```

The Project stores only the subset it actually resolved.

---

# 204. Distribution Update Example

Before:

```text id="s56v24"
catalog.lock

Superpowers
→ abc123
```

Maintainer reviews new upstream:

```text id="19zo2r"
Superpowers
→ xyz789
```

After approved update:

```text id="x1eyxf"
catalog.lock
→ xyz789
```

Existing consumer:

```text id="n18l3j"
agent-plugins.lock
→ abc123
```

remains valid until explicit Project update, provided the old artifact remains usable.

---

# 205. Project Update Example

Before:

```text id="i3vw9q"
agent-plugins.lock

Superpowers
→ abc123
```

Run:

```text id="be2r8b"
ap update
```

against new approved distribution.

After:

```text id="em3cwq"
agent-plugins.lock

Superpowers
→ xyz789
```

Lock diff makes the change explicit.

---

# 206. Implementation Change Example

Before:

```text id="rd34mv"
engineering.testing.tdd
→ Superpowers
```

Catalog now prefers:

```text id="q8n7b7"
Matt Pocock
```

Normal sync:

```text id="s0j2wa"
preserve Superpowers
```

Explicit update:

```text id="uoahku"
may switch to Matt Pocock
```

if all Resolver rules allow it.

---

# 207. Policy Invalidation Example

Locked:

```text id="1zvgjx"
security.review
→ Community Publisher
```

New Policy:

```text id="ez0isj"
deny community
```

Normal sync:

```text id="fjszhi"
cannot preserve lock
```

Resolver must:

```text id="38urmh"
select another eligible implementation
```

or:

```text id="hrdmk0"
fail
```

if none exists.

---

# 208. Lockfile Processing Pipeline

Project:

```text id="we7iq6"
agent-plugins.yaml
        ↓
Resolution Context
        ↓
Existing Lock Validation
        ↓
Resolver
        ↓
Resolution
        ↓
Lockfile Builder
        ↓
Lock Normalization
        ↓
Schema Validation
        ↓
Atomic Write
        ↓
agent-plugins.lock
```

Distribution:

```text id="c40dy3"
Upstream Check
       ↓
Maintainer Selection
       ↓
Package Ref Resolution
       ↓
Integrity Calculation
       ↓
Validation
       ↓
catalog.lock
```

---

# 209. Project Lock Mental Model

```text id="c416ka"
Intent
   ↓
Capability
   ↓
Selected Component
   ↓
Package
   ↓
Exact Source Revision
```

A Project Lock freezes the entire concrete path.

---

# 210. Distribution Lock Mental Model

```text id="zp9wo8"
Publisher Ecosystem
      ↓
Curated Package
      ↓
Approved Version
      ↓
Immutable Source Revision
```

---

# 211. Dual-Lock Invariants

The system must preserve:

```text id="jzllc0"
1. catalog.lock and agent-plugins.lock serve different owners.

2. catalog.lock pins approved upstream state.

3. agent-plugins.lock pins Project-specific resolved state.

4. Project Manifest remains the source of semantic intent.

5. Lockfiles never contain secrets.

6. External Package refs should be immutable where practical.

7. Lock serialization is deterministic.

8. Normal sync preserves valid Project Lock selections.

9. Explicit update may intentionally change them.

10. Existing lock never overrides hard Policy or Target constraints.

11. Project Lock contains only the resolved dependency closure.

12. Runtime state does not replace lock state.

13. Lockfile writes should be atomic.

14. Semantic digests use normalized input, not raw file bytes.

15. Distribution update does not automatically update consumer locks.

16. Consumer Project update does not mutate catalog.lock.

17. Selected state remains traceable from Capability to upstream source.

18. Generated runtime artifacts are downstream of the Lock, not authoritative above it.
```

---

# 212. Lockfile in One Sentence

> **`catalog.lock` freezes the exact upstream state curated by the `agent-plugins` distribution, while `agent-plugins.lock` freezes the exact capability-to-component-to-package resolution of a consumer project, allowing updates to remain explicit, reproducible, reviewable, and independent across distribution and project boundaries.**