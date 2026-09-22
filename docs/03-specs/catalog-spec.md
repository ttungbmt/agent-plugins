# Catalog Specification

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.  
**Normative contract:** `packages/schemas/schemas/{provider,package,capability}.schema.json` (source-of-truth.md §16, §55)

## Overview

This document defines the canonical catalog format used by `agent-plugins`.

The Catalog is the curated metadata layer that connects external tooling ecosystems to the semantic capability model.

The Catalog answers:

```text
Which Providers are recognized?

Which Packages are supported?

Which Capabilities exist?

Which Components implement those Capabilities?

Which implementations are preferred by default?

Which upstream state is curated and tested?
```

The Catalog must remain:

- declarative,
- human-reviewable,
- machine-validatable,
- deterministic,
- provider-aware,
- capability-oriented,
- independent from consumer projects.

The Catalog is not a project manifest and must not contain project-specific intent.

---

# 1. Scope

This specification defines:

```text
catalog directory structure

Provider manifests

Package manifests

Capability manifests

implementation mappings

canonical IDs

references

validation

loading

normalization

generated component inventories

distribution locking

catalog versioning
```

This specification does not define:

```text
Project manifests
Project lockfiles
Policy files
Preset/Profile files
runtime materialization
CLI behavior
```

Those are defined separately.

---

# 2. Canonical Catalog Structure

The canonical structure is:

```text
catalog/
├── providers/
│   ├── superpowers.yaml
│   ├── mattpocock.yaml
│   ├── ecc.yaml
│   ├── anthropic.yaml
│   ├── wshobson.yaml
│   └── agent-plugins.yaml
│
├── packages/
│   ├── superpowers.yaml
│   ├── mattpocock-skills.yaml
│   ├── ecc.yaml
│   └── ...
│
└── capabilities/
    ├── workflow/
    ├── engineering/
    ├── frontend/
    ├── backend/
    ├── security/
    ├── knowledge/
    ├── product/
    ├── devops/
    ├── tooling/
    └── gis/
```

The Catalog consists of three authoritative entity classes:

```text
Provider
Package
Capability
```

Third-party Component inventories are generally discovered rather than maintained manually as first-class catalog files.

---

# 3. Catalog Source-of-Truth Rules

Authoritative:

```text
catalog/providers/
catalog/packages/
catalog/capabilities/
```

Derived:

```text
generated/catalog/components.json
generated/catalog/search-index.json
generated/catalog/reverse-index.json
```

Locked distribution state:

```text
catalog.lock
```

The dependency direction is:

```text
Provider / Package Metadata
        +
Source Discovery
        +
Capability Curation
        ↓
Normalized Catalog
```

Generated artifacts must never become the sole source of semantic metadata.

---

# 4. Manifest Envelope

All canonical Catalog manifests should use a common envelope.

Recommended structure:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Provider

metadata:
  id: superpowers
  name: Superpowers

spec:
  ...
```

Supported V1 kinds:

```text
Provider
Package
Capability
```

The common envelope provides:

```text
schema version
entity kind
canonical identity
display metadata
specification body
```

---

# 5. `apiVersion`

Initial value:

```text
agent-plugins.dev/v1alpha1
```

All authoritative Catalog manifests must declare their schema version.

The version controls serialized structure.

It does not change the semantic identity of the entity.

---

# 6. `kind`

Allowed V1 values:

```text
Provider
Package
Capability
```

The declared `kind` must match the schema used to validate the file.

Example:

```yaml
kind: Capability
```

must validate using the Capability schema.

---

# 7. Common Metadata

Recommended common metadata:

```yaml
metadata:
  id: engineering.testing.tdd
  name: Test-Driven Development
  description: Test-first software development workflow.
```

Required fields:

```text
id
name
```

`description` should be required where meaningful, especially for Capabilities.

---

# 8. Canonical IDs

Canonical IDs must be:

```text
stable
unique within their entity scope
machine-friendly
human-readable
```

IDs should not be generated from display names at runtime.

Once stable, ID changes should be treated as migrations rather than ordinary renames.

---

# 9. Provider IDs

Provider IDs use lowercase kebab-case.

Examples:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

Recommended pattern:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Provider IDs are globally unique within the Catalog.

---

# 10. Package IDs

Package IDs use lowercase kebab-case.

Examples:

```text
superpowers
mattpocock-skills
frontend-design
ecc
```

Canonical Package identity is scoped by Provider:

```text
<provider-id>/<package-id>
```

Example:

```text
anthropic/frontend-design
```

Two Providers may technically expose Packages with the same local ID.

---

# 11. Capability IDs

Capability IDs use lowercase dot-separated semantic namespaces.

Examples:

```text
workflow.planning
engineering.testing.tdd
security.review
knowledge.research
```

Recommended pattern:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$
```

Capability IDs must not normally contain Provider or Target names.

---

# 12. Component References

A canonical Component reference must be globally unambiguous.

Recommended conceptual syntax:

```text
<provider>/<package>#<type>:<name>
```

Examples:

```text
superpowers/superpowers#skill:test-driven-development

ecc/ecc#agent:security-reviewer

anthropic/frontend-design#skill:frontend-design
```

Exact encoding may evolve before stable V1, but semantic identity must remain unambiguous.

---

# 13. Publisher Manifest

A Publisher manifest identifies a party that publishes content: an upstream
project, or a first-party owner.

A Publisher carries **identity and trust only**. It does not carry fetch
coordinates — see §17.

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Publisher

metadata:
  id: superpowers
  name: Superpowers
  description: Workflow-oriented engineering skills.

spec:
  homepage: https://github.com/obra/superpowers
  repository: https://github.com/obra/superpowers
  trust: curated
```

ADR 0011 retired the name `Provider` for this entity. The term "provider" is
not used anywhere in this project; in archived documents it meant Publisher.

---

# 14. Publisher Required Fields

A Publisher must define:

```text
metadata.id
metadata.name
spec
```

No field under `spec` is required, because no field under `spec` is read by
the resolver yet. The Publisher is loaded, existence-checked, and otherwise
inert. Fields are added to the schema when a consumer reads them, not before.

---

# 15. Publisher Ownership

Ownership distinguishes:

```text
first-party
third-party
```

Ownership must not be inferred solely from source location, and it is a
different concept from trust (§16).

**Not yet in the schema.** `spec.ownership` is deferred until a Policy gate
reads it, per ADR 0011 D6. Until then, ownership is expressed by the
`first-party` value of `spec.trust`.

---

# 16. Publisher Trust Baseline

A Publisher may declare a baseline trust classification:

```yaml
trust: curated
```

Allowed values:

```text
first-party
official
curated
community
untrusted
```

This is baseline catalog metadata and must come from explicit curation, never
from popularity (§147). A Policy may still impose stricter rules. No Policy
gate reads it yet.

---

# 17. Publisher Source — moved to Package

A Publisher has **no** `spec.source`. Fetch coordinates live on the Package:

```yaml
# catalog/packages/<id>.yaml
spec:
  source:
    type: git
    url: https://github.com/obra/superpowers.git
    ref: <40-hex commit SHA>
```

Reason (ADR 0011 D5): one Publisher may ship from several repositories. A
single `repository:` per Publisher would force one Publisher per repository,
collapsing the entity into a fetch coordinate and destroying the distinction
between *who publishes* and *where the bytes are*. Trust must also stay stable
across repository moves.

See §24 for the Package source shape.

---

# 18. Publisher Discovery — moved to Package

A Publisher has **no** `spec.discovery`. Discovery is declared per Package:

```yaml
# catalog/packages/<id>.yaml
spec:
  discovery:
    manifest: .claude-plugin/plugin.json
```

The upstream plugin manifest is read instead of globbing the tree, because a
repository may carry more Components than it ships: `mattpocock/skills`
contains 38 `SKILL.md` files but ships 25.

Discovery configuration must not contain semantic Capability mappings.

---

# 19. Publisher Links

Optional informational metadata:

```yaml
spec:
  homepage: https://www.aihero.dev
  repository: https://github.com/mattpocock/skills
```

Links are informational. `spec.repository` must never define canonical fetch
identity — that identity lives in `Package.spec.source` (§24).

---

# 20. Native Publisher

Recommended native Publisher:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Publisher

metadata:
  id: agent-plugins
  name: Agent Plugins

spec:
  trust: first-party
```

Native content remains located under:

```text
plugins/native/
```

---

# 21. Package Manifest

A Package manifest defines an installable or distributable unit belonging to
exactly one Publisher.

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Package

metadata:
  id: mattpocock-skills
  name: Matt Pocock Skills

spec:
  publisher: mattpocock

  materialization: collection

  source:
    type: git
    url: https://github.com/mattpocock/skills.git
    ref: c55ee46073ed923f86ce59a5eb3b6d895095d1b7

  discovery:
    manifest: .claude-plugin/plugin.json

  targets:
    - claude-code

  components:
    tdd:
      requires: [codebase-design]
```

`materialization` is defined by ADR 0010 D2. `components.<name>.requires` is
declared by a curator, never inferred from Component bodies.

---

# 22. Package Required Fields

A Package must define:

```text
metadata.id
metadata.name

spec.publisher
spec.materialization
spec.source
spec.discovery
```

---

# 23. Publisher Reference

Every Package must reference exactly one Publisher.

Example:

```yaml
publisher: superpowers
```

The reference must resolve to:

```text
catalog/publishers/superpowers.yaml
```

Unknown Publisher references fail Catalog validation with
`UNKNOWN_PUBLISHER`. A Publisher that no Package references is reported as
`UNUSED_PUBLISHER`.

---

# 24. Package Source

Package source is the complete, absolute fetch coordinate — not a path
relative to anything on the Publisher.

```yaml
source:
  type: git
  url: https://github.com/mattpocock/skills.git
  ref: c55ee46073ed923f86ce59a5eb3b6d895095d1b7
```

`type` is the access mechanism. It is an **enum field, not an entity**: there
is no catalog file for `git`, and it is never called a provider (ADR 0011 D4).
Backends are implemented in code; `git` is the only value in V1.

`ref` must be an immutable 40-character commit SHA. `main`, `latest`, and
`HEAD` are forbidden (security-model.md:831-835) and rejected both by the
schema and at fetch time. ADR 0010 D7 also rejects a `github` source type,
which clones over SSH and fails without a key.

---

# 25. Package Discovery

Package-level discovery refines what the Package manifest declares (§18).

Example:

```yaml
discovery:
  include:
    - skills/**
  exclude:
    - internal/**
```

Discovery rules identify Components.

They do not determine semantic Capability mappings.

---

# 26. Package Target Metadata

A Package may declare broad target compatibility.

Example:

```yaml
targets:
  - claude-code
```

Component-level metadata may further restrict support.

Broad Package compatibility must not automatically imply every contained Component works identically on every Target.

---

# 27. Package Version Strategy

Recommended conceptual values:

```text
distribution-lock
fixed
native
```

Example:

```yaml
version:
  strategy: distribution-lock
```

Meaning:

```text
exact version/ref is resolved from catalog.lock
```

Native packages may use:

```yaml
version:
  strategy: native
```

---

# 28. Package Security Metadata

A Package may contain security-related annotations.

Example:

```yaml
security:
  mayContainExecutableComponents: true
```

However, actual executable risk should preferably be discovered or modeled at Component level.

Avoid simplistic global fields such as:

```yaml
safe: true
```

---

# 29. Capability Manifest

A Capability manifest defines semantic intent and its curated implementations.

Example:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.testing.tdd
  name: Test-Driven Development
  description: >
    Provides a test-first software development workflow.

spec:
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

---

# 30. Capability Required Fields

A Capability must define:

```text
metadata.id
metadata.name
metadata.description

spec.cardinality
spec.implementations
```

An implementation list may be empty temporarily only for experimental or planned Capabilities if validation rules explicitly permit it.

Required stable Capabilities should normally have at least one implementation.

---

# 31. Capability Cardinality

Allowed V1 values:

```text
one
many
```

Example:

```yaml
cardinality: one
```

Cardinality is semantic and independent from the number of implementations.

---

# 32. Capability Stability

Recommended values:

```text
experimental
stable
deprecated
removed
```

Example:

```yaml
stability: stable
```

If omitted in V1, the default may be:

```text
experimental
```

until the taxonomy stabilizes.

---

# 33. Capability Dependencies

A Capability may declare semantic dependencies.

Example:

```yaml
requires:
  - tooling.browser
```

Optional dependencies may be represented separately.

Example:

```yaml
optional:
  - knowledge.web-research
```

Exact optional semantics should align with `resolution-spec.md`.

---

# 34. Capability Aliases

Optional aliases:

```yaml
aliases:
  - tdd
  - test-driven-development
```

Aliases are useful for:

```text
search
migration
CLI discovery
```

Aliases must not become canonical IDs.

---

# 35. Capability Tags

Tags are informational.

Example:

```yaml
tags:
  - testing
  - engineering
```

Tags should not directly influence deterministic resolution in V1.

---

# 36. Capability Implementations

Each implementation maps a Component to the Capability.

Required field:

```text
component
```

Recommended:

```text
priority
```

Possible future fields:

```text
status
targets
notes
constraints
```

---

# 37. Implementation Mapping Example

```yaml
implementations:
  - component: superpowers/superpowers#skill:test-driven-development
    priority: 100
```

This means:

```text
the referenced Component is a curated implementation of this Capability
```

It does not mean:

```text
the Component is always selected
```

Selection belongs to the Resolver.

---

# 38. Implementation Priority

Priority is an integer.

Recommended range:

```text
0–1000
```

Example:

```yaml
priority: 100
```

Higher values indicate stronger default Catalog preference.

Priority is not:

```text
quality score
trust score
popularity score
```

---

# 39. Default Priority

If omitted, define one deterministic default.

Recommended:

```text
0
```

Explicit priorities are preferred for `cardinality: one` Capabilities with multiple competing implementations.

---

# 40. Implementation Status

A mapping may eventually support:

```text
active
deprecated
disabled
removed
```

Example:

```yaml
status: deprecated
```

If omitted:

```text
active
```

may be assumed.

---

# 41. Capability Replacement

Deprecated Capabilities may reference a replacement.

Example:

```yaml
stability: deprecated

replacement:
  capability: engineering.testing.tdd
```

The replacement must reference an existing Capability.

---

# 42. Component Inventory

External Component definitions should generally not be manually duplicated as:

```text
catalog/components/*.yaml
```

Instead:

```text
Source Adapter
    ↓
generated/catalog/components.json
```

The generated inventory records upstream facts.

Capability mappings reference canonical Component IDs from that inventory.

---

# 43. Native Component Inventory

Native Components are different.

Their actual implementation source lives under:

```text
plugins/native/
```

Native Components may be discovered from those files using the same normalized Component model.

They do not require manual duplication into a separate third-party-style Component catalog.

---

# 44. Generated Component Record

Conceptually:

```json
{
  "id": "superpowers/superpowers#skill:test-driven-development",
  "provider": "superpowers",
  "package": "superpowers",
  "type": "skill",
  "name": "test-driven-development",
  "sourcePath": "skills/test-driven-development",
  "targets": ["claude-code"]
}
```

This format is illustrative.

The exact generated schema belongs to implementation contracts.

---

# 45. Component Metadata Sources

Component metadata may combine:

```text
upstream discovered facts
+
Package metadata
+
curated annotations
```

Example:

```text
name
→ discovered

type
→ discovered

source path
→ discovered

Capability mapping
→ curated

priority
→ curated

trust override
→ curated if needed
```

---

# 46. Metadata Precedence

Recommended precedence for normalized Component metadata:

```text
immutable upstream fact
        +
explicit curated annotation
        ↓
normalized Component
```

Curated metadata may annotate or override only fields explicitly designed for curation.

Do not silently rewrite factual provenance.

---

# 47. Catalog Loading

Catalog loading should conceptually follow:

```text
Read manifests
    ↓
Schema validation
    ↓
Canonical ID validation
    ↓
Reference validation
    ↓
Load generated Component inventory
    ↓
Resolve Capability implementation references
    ↓
Normalize
    ↓
Build Catalog
```

---

# 48. Load Order

Recommended load order:

```text
1. Providers

2. Packages

3. Components

4. Capabilities
```

because:

```text
Package references Provider

Component references Package

Capability implementation references Component
```

The final normalized Catalog should not depend on filesystem ordering.

---

# 49. Filesystem Enumeration

Manifest loading must sort discovered filenames canonically before processing.

Do not rely on operating-system directory enumeration order.

This supports deterministic diagnostics and generation.

---

# 50. Provider Validation

Validate:

```text
unique Provider ID

valid ID syntax

valid ownership

valid source type

valid discovery adapter

valid trust classification
```

If Provider discovery references an unavailable adapter:

```text
validation fails
```

---

# 51. Package Validation

Validate:

```text
unique Provider/Package identity

Provider exists

valid source configuration

valid version strategy

valid targets

valid discovery configuration
```

A Package must not reference itself as a dependency if package dependencies are later supported.

---

# 52. Capability Validation

Validate:

```text
unique Capability ID

valid namespace

valid cardinality

valid stability

all aliases valid

all dependencies exist

all implementation Component references exist

all priorities valid
```

---

# 53. Capability Dependency Cycle Validation

Capability dependency graph must be acyclic.

Example error:

```text
CAPABILITY_CYCLE

engineering.testing.e2e
→ tooling.browser
→ tooling.automation
→ engineering.testing.e2e
```

---

# 54. Alias Collision Validation

Aliases must not create ambiguous search or migration behavior.

Invalid:

```text
Capability A alias: tdd

Capability B alias: tdd
```

unless aliases are explicitly scoped.

Recommended V1 rule:

```text
global alias uniqueness
```

---

# 55. Component Reference Validation

For every Capability implementation:

```text
component must exist
```

Example invalid mapping:

```yaml
component: superpowers/superpowers#skill:does-not-exist
```

should fail validation.

---

# 56. Package Membership Validation

Every Component must resolve to a valid Package.

Example:

```text
superpowers/superpowers#skill:tdd
```

requires:

```text
Provider: superpowers
Package: superpowers
```

to exist.

---

# 57. Provider Membership Validation

Every Package must resolve to a valid Provider.

The relationship chain:

```text
Capability
→ Component
→ Package
→ Provider
```

must always be traversable.

---

# 58. Duplicate Component IDs

Source discovery must detect duplicate normalized Component IDs.

Example:

```text
two upstream files normalize to the same Component reference
```

This should fail discovery/generation rather than silently overwrite.

---

# 59. Duplicate Capability Mapping

A Component may intentionally implement multiple Capabilities.

However, the same:

```text
Capability
+
Component
```

mapping must not appear twice.

Duplicate mappings should fail validation.

---

# 60. Cardinality-One Priority Validation

For:

```text
cardinality: one
```

with multiple active implementations, maintainers should normally provide explicit priorities.

If priorities are identical:

```text
validation may allow it
```

but should warn that runtime Resolution may become ambiguous.

---

# 61. Catalog Warnings

Useful warnings include:

```text
Capability has no implementation

stable Capability only has deprecated implementations

cardinality-one Capability has equal-priority candidates

deprecated Capability still used in Preset/Profile

Package has no discovered Components

curated implementation references deprecated Component
```

Warnings do not necessarily invalidate the Catalog.

---

# 62. Catalog Errors

Errors include:

```text
duplicate canonical ID

invalid schema

missing Provider

missing Package

missing Component

invalid Capability dependency

dependency cycle

invalid Component reference

unknown adapter

invalid enum
```

Errors prevent Catalog use.

---

# 63. Catalog Normalization

Serialized Catalog files should be converted to normalized domain objects before Resolution.

Example:

```text
YAML
↓
Manifest DTO
↓
Normalized Provider / Package / Capability
↓
Catalog
```

The Resolver should not consume raw YAML structures.

---

# 64. Normalized Catalog

Conceptually:

```text
Catalog

providers:
  Map<ProviderId, Provider>

packages:
  Map<PackageRef, Package>

components:
  Map<ComponentRef, Component>

capabilities:
  Map<CapabilityId, Capability>

implementations:
  Map<CapabilityId, CapabilityImplementation[]>
```

The exact data structures are implementation details.

---

# 65. Catalog Indexes

Runtime indexes may be constructed in memory:

```text
Capability → Implementations

Component → Capabilities

Package → Components

Provider → Packages
```

These indexes should be derived.

They do not require independent authoritative files.

---

# 66. Reverse Index Generation

A generated reverse index may contain:

```text
Component → Capabilities

Capability → Presets

Preset → Profiles

Provider → Packages
```

Useful for:

```text
impact analysis
search
explainability
update reporting
```

---

# 67. Search Index

Generated:

```text
generated/catalog/search-index.json
```

may contain denormalized searchable fields:

```text
ID

name

description

aliases

tags

entity kind
```

Search indexes should never affect semantic resolution.

---

# 68. Distribution Lock

The Catalog uses:

```text
catalog.lock
```

to pin exact upstream state.

Conceptually:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: CatalogLock

providers:
  superpowers:
    packages:
      superpowers:
        version: 6.4.0
        ref: abc123...
        integrity: ...
```

Exact format belongs in `lockfile-spec.md` or distribution-lock subsection there.

---

# 69. Catalog Manifest vs Distribution Lock

Package manifest:

```text
What Package is this?
```

Distribution lock:

```text
Which exact version is currently curated?
```

Do not place continuously changing pinned commits directly into Package identity metadata unless a fixed Package intentionally requires it.

---

# 70. Catalog Version

The Catalog may expose a distribution-level identity.

Possible representations:

```text
Git commit

release version

catalog digest
```

This identity may be recorded in consumer lockfiles.

---

# 71. Catalog Digest

A deterministic digest may be computed over normalized authoritative Catalog state.

Conceptually:

```text
catalogDigest =
hash(
  providers
  packages
  capabilities
  distribution lock
)
```

Presets, Profiles, and Policies may have separate digests or participate in a broader distribution digest depending on lockfile design.

---

# 72. Deterministic Serialization

Generated normalized Catalog output should use stable ordering.

Recommended:

Providers:

```text
sort by Provider ID
```

Packages:

```text
sort by Provider ID, then Package ID
```

Components:

```text
sort by Component reference
```

Capabilities:

```text
sort by Capability ID
```

Implementation lists:

```text
sort by priority descending
then Component reference ascending
```

Stable output improves review and reproducibility.

---

# 73. Catalog Mutation

Catalog changes must occur through intentional edits.

Examples:

```text
add Provider

add Package

add Capability

change implementation mapping

change priority

deprecate Capability
```

Source discovery must not silently mutate authoritative Catalog files.

---

# 74. Adding a Provider

Required steps:

```text
1. Create Provider manifest

2. Create one or more Package manifests

3. Configure discovery adapter

4. Pin approved upstream state in catalog.lock

5. Run discovery

6. Review Components

7. Add Capability mappings

8. Validate Catalog

9. Run resolver tests

10. Regenerate derived indexes
```

---

# 75. Adding a Package

Required:

```text
Provider exists

Package ID selected

source configured

discovery configured

curated version pinned if external
```

Then:

```text
discover
validate
curate mappings
```

---

# 76. Adding a Capability

Before adding a Capability, follow the Capability Model checklist.

Then create:

```text
catalog/capabilities/<namespace>/<name>.yaml
```

Example:

```text
catalog/capabilities/engineering/testing/tdd.yaml
```

---

# 77. Adding an Implementation

To map a Component:

```text
confirm Component exists

review semantics

review security metadata

review Target support

assign default priority

add mapping to Capability
```

A Component should not be mapped merely because its name appears similar.

---

# 78. Removing an Implementation

Prefer lifecycle transition:

```text
active
→ deprecated
→ removed
```

where useful.

Removing a mapping may impact existing:

```text
Presets
Profiles
consumer lockfiles
```

Impact analysis should be performed.

---

# 79. Removing a Capability

A stable Capability should normally be:

```text
deprecated
```

before:

```text
removed
```

when migration is possible.

Replacement should be documented.

---

# 80. Provider Update

Updating a Provider does not automatically alter semantic Catalog mappings.

Workflow:

```text
new upstream state
    ↓
source adapter discovery
    ↓
component diff
    ↓
mapping validation
    ↓
maintainer review
    ↓
catalog.lock update
```

Mappings are changed only if semantic review requires it.

---

# 81. Newly Discovered Components

New Components are:

```text
discovered
```

not automatically:

```text
curated
```

They may appear in discovery/update reports without becoming Resolver candidates.

---

# 82. Removed Upstream Components

If an upstream Component disappears:

```text
generated inventory reports removal
```

Capability mappings referencing it become invalid for new curated state.

Update tooling should identify affected Capabilities.

---

# 83. Component Rename

If upstream renames a Component:

```text
old Component reference
→ removed/deprecated

new Component reference
→ discovered
```

Maintainers must review whether the new Component is semantically equivalent before remapping.

Do not assume rename equivalence automatically.

---

# 84. Provider Repository Restructure

If directory layout changes without semantic Component identity change, the Source Adapter may preserve stable canonical Component IDs where possible.

Canonical Component identity should not necessarily depend on physical source path.

---

# 85. Component Identity Stability

Component IDs should prefer upstream logical identity over fragile filesystem paths.

Good:

```text
#skill:test-driven-development
```

Potentially fragile:

```text
#skill:skills/v2/testing/tdd/SKILL.md
```

Source paths should remain metadata rather than identity where possible.

---

# 86. Catalog and Policy Separation

Catalog may define:

```text
baseline trust classification

Component security facts

default implementation priority
```

Policy defines:

```text
what current Project allows or prefers
```

Catalog must not encode Project-specific policy decisions.

---

# 87. Catalog and Profile Separation

Catalog answers:

```text
what exists?
```

Profile answers:

```text
what does this role need?
```

Profiles must not be embedded inside Catalog manifests.

---

# 88. Catalog and Preset Separation

Catalog defines semantic Capabilities.

Presets define reusable Capability composition.

Do not add:

```yaml
recommendedPresets:
```

inside every Capability merely to encode composition.

Reverse relationships may be generated.

---

# 89. Catalog and Target Separation

Catalog may describe Component/Package compatibility.

Target adapters define runtime materialization behavior.

Do not place Claude-specific rendering instructions inside Capability manifests.

---

# 90. Catalog and Source Adapter Separation

Source Adapter:

```text
discovers upstream facts
```

Catalog:

```text
defines project curation
```

A Source Adapter must not decide:

```text
Capability priority
Profile membership
Preset membership
```

---

# 91. Catalog and Resolver Separation

Catalog:

```text
Candidate universe
```

Resolver:

```text
Project-specific selection
```

Catalog should not contain fields such as:

```text
selected: true
```

for ordinary implementations.

Selection is contextual.

---

# 92. Catalog and Lockfile Separation

Catalog defines possible implementations.

Lockfile records selected implementations for one Project.

Do not store consumer-specific resolved state in the Catalog.

---

# 93. Extension Fields

V1 should avoid arbitrary untyped extension fields.

If extension metadata is needed, use a clearly namespaced structure.

Conceptually:

```yaml
extensions:
  some-namespace:
    ...
```

Prefer adding well-defined schema fields when a concept becomes broadly useful.

---

# 94. Comments

YAML comments are allowed for maintainers.

However, semantic behavior must never depend on comments.

All machine-relevant metadata must be represented structurally.

---

# 95. File Naming

Provider file:

```text
<provider-id>.yaml
```

Package file:

```text
<package-id>.yaml
```

Capability file:

```text
<final-capability-segment>.yaml
```

under namespace folders.

Example:

```text
engineering/testing/tdd.yaml
```

---

# 96. One Entity Per File

Preferred V1 rule:

```text
one Provider per file

one Package per file

one Capability per file
```

Benefits:

```text
clean diffs
easy ownership
simple references
easy generation
easy review
```

Large generated inventories are exempt.

---

# 97. Multi-Package Provider

A Provider may have multiple Package files.

Example:

```text
Provider:
anthropic

Packages:
anthropic/frontend-design
anthropic/typescript-lsp
anthropic/plugin-dev
```

Each Package remains independently referenceable.

---

# 98. Package Naming Collision

If two Providers both have:

```text
core
```

their full identities remain distinct:

```text
provider-a/core

provider-b/core
```

Local Package ID uniqueness is only required within a Provider.

---

# 99. Capability Name Collision

Capability IDs are globally unique.

There is no Provider scoping.

Therefore:

```text
engineering.testing.tdd
```

can exist only once as a canonical semantic Capability.

---

# 100. Unknown Fields

Recommended V1 behavior:

Authoritative manifests should reject unknown fields by default.

This helps detect:

```text
typos

stale fields

unsupported semantics
```

Example:

```yaml
prioroty: 100
```

should fail rather than silently being ignored.

---

# 101. Forward Compatibility

New optional fields may be introduced in later schema versions.

Consumers should validate according to declared:

```text
apiVersion
```

rather than accepting unknown fields blindly.

---

# 102. Manifest Formatting

Recommended style:

```text
2-space indentation

UTF-8

LF line endings

stable key order where practical
```

Formatting should be automated where possible.

---

# 103. Canonical Key Ordering

Recommended order:

```text
apiVersion
kind
metadata
spec
```

Inside `metadata`:

```text
id
name
description
```

Inside `spec`, order fields by semantic importance rather than alphabetically where readability benefits.

---

# 104. Catalog Validation Command

Conceptually:

```bash
ap catalog validate
```

or maintainer equivalent:

```bash
pnpm validate:catalog
```

V1 CLI naming may differ.

Validation should be reusable from CI.

---

# 105. Catalog Generation Command

Conceptually:

```bash
pnpm generate:catalog
```

should:

```text
load Provider/Package metadata

read catalog.lock

run source adapters

normalize Components

validate references

generate Component inventory

generate indexes
```

It must not automatically rewrite curated Capability mappings.

---

# 106. Catalog Check Pipeline

Recommended CI sequence:

```text
Schema Validate
      ↓
Discover / Load Components
      ↓
Reference Validate
      ↓
Graph Validate
      ↓
Semantic Validate
      ↓
Generate Indexes
      ↓
Check Drift
```

---

# 107. Catalog Drift

Generated Catalog artifacts are stale when:

```text
canonical metadata changed
```

or:

```text
catalog.lock changed
```

without regeneration.

CI should detect this.

---

# 108. Catalog Determinism

Given identical:

```text
Provider manifests

Package manifests

Capability manifests

catalog.lock

source adapter version

upstream immutable refs
```

Catalog generation must produce equivalent normalized output.

---

# 109. Discovery Determinism

Source adapters should operate against pinned immutable upstream state where possible.

Avoid building canonical generated inventory from:

```text
latest branch head
```

without a lock.

Preferred:

```text
commit SHA
```

---

# 110. Native Package Determinism

Native packages come from the current repository state.

For released distributions, the repository commit/release itself provides the immutable boundary.

---

# 111. Catalog Security Rules

Catalog loading must not execute arbitrary upstream code.

Discovery should inspect files and manifests as data.

Avoid:

```text
running install scripts

executing hooks

loading untrusted JS config through eval
```

during Catalog generation.

---

# 112. Declarative Discovery

Where possible, discovery should use:

```text
filesystem inspection

manifest parsing

known format parsing
```

rather than executing provider tooling.

---

# 113. Symlink Handling

Source adapters should define deterministic symlink behavior.

Recommended:

```text
do not follow symlinks outside the checked-out provider root
```

unless explicitly required and safely handled.

This avoids accidental traversal.

---

# 114. Path Safety

Normalized source paths must remain relative to the pinned source root.

Reject path traversal such as:

```text
../../outside
```

---

# 115. Capability Mapping Security Review

Mapping a Component does not automatically make it safe.

Maintainers should review security-sensitive Components such as:

```text
hooks
commands
scripts
MCP servers
```

Relevant factual metadata should be available to Policy evaluation.

---

# 116. Trust Metadata Must Be Explicit

Do not derive trust from:

```text
GitHub stars

download count

repository popularity
```

automatically.

Such metrics may someday inform maintainer review but are not trust classifications.

---

# 117. Initial Provider Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Provider

metadata:
  id: superpowers
  name: Superpowers
  description: Engineering workflow capabilities.

spec:
  ownership: third-party

  trust:
    baseline: curated

  source:
    type: git
    repository: obra/superpowers

  discovery:
    adapter: superpowers
```

---

# 118. Initial Package Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Package

metadata:
  id: superpowers
  name: Superpowers

spec:
  provider: superpowers

  source:
    path: .

  version:
    strategy: distribution-lock

  targets:
    - claude-code
```

---

# 119. Initial Capability Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.testing.tdd
  name: Test-Driven Development
  description: >
    Guides implementation using a test-first development cycle.

spec:
  cardinality: one

  stability: experimental

  aliases:
    - tdd
    - test-driven-development

  tags:
    - engineering
    - testing

  implementations:
    - component: superpowers/superpowers#skill:test-driven-development
      priority: 100

    - component: mattpocock/skills#skill:tdd
      priority: 80

    - component: ecc/ecc#skill:tdd-workflow
      priority: 70
```

---

# 120. Capability With Dependency Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.testing.e2e
  name: End-to-End Testing
  description: >
    Provides end-to-end testing capabilities.

spec:
  cardinality: many

  stability: experimental

  requires:
    - tooling.browser

  implementations:
    - component: ecc/ecc#agent:e2e-runner
      priority: 100
```

---

# 121. Deprecated Capability Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Capability

metadata:
  id: engineering.tdd
  name: TDD

spec:
  cardinality: one

  stability: deprecated

  replacement:
    capability: engineering.testing.tdd

  implementations: []
```

This enables controlled migration.

---

# 122. Native Package Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Package

metadata:
  id: second-brain
  name: Second Brain

spec:
  provider: agent-plugins

  source:
    path: plugins/native/second-brain

  version:
    strategy: native

  targets:
    - claude-code
```

---

# 123. Catalog Merge Model

The normalized Catalog is conceptually assembled from:

```text
Provider Manifests

        +

Package Manifests

        +

Discovered Component Inventory

        +

Capability Manifests

        +

Distribution Lock
```

The result is one coherent Resolver input model.

---

# 124. Catalog Loader Contract

Conceptually:

```ts
interface CatalogLoader {
  load(input: CatalogInput): Promise<Catalog>
}
```

`CatalogInput` may include:

```text
catalog root

generated Component inventory

distribution lock
```

The Catalog Loader should return only validated normalized state.

---

# 125. Invalid Catalog Must Not Partially Load

Recommended behavior:

```text
any hard validation error
→ Catalog load fails
```

Do not return a partially valid Catalog to the Resolver.

This prevents hidden omissions.

---

# 126. Error Location

Catalog diagnostics should include:

```text
file

field/path

entity ID

error code

message
```

Example:

```text
catalog/capabilities/engineering/testing/tdd.yaml

spec.implementations[2].component

UNKNOWN_COMPONENT
```

---

# 127. Catalog Diagnostic Codes

Recommended initial codes:

```text
INVALID_MANIFEST

DUPLICATE_PROVIDER

DUPLICATE_PACKAGE

DUPLICATE_CAPABILITY

DUPLICATE_COMPONENT

UNKNOWN_PROVIDER

UNKNOWN_PACKAGE

UNKNOWN_COMPONENT

UNKNOWN_CAPABILITY

INVALID_CAPABILITY_ID

INVALID_PROVIDER_ID

INVALID_PACKAGE_ID

INVALID_COMPONENT_REF

INVALID_CARDINALITY

INVALID_STABILITY

INVALID_PRIORITY

CAPABILITY_CYCLE

ALIAS_COLLISION

UNKNOWN_SOURCE_ADAPTER

MISSING_IMPLEMENTATION
```

---

# 128. Catalog Quality Checks

Beyond schema validation, CI should inspect quality conditions such as:

```text
unused Provider

Package with zero Components

Capability with zero active implementations

duplicate semantic aliases

deprecated mapping still preferred

missing documentation description
```

Some should remain warnings rather than errors.

---

# 129. Catalog Curation Principles

Catalog curation should prefer:

```text
semantic clarity

small representative provider set

explicit overlap modeling

high-confidence mappings

stable IDs

security visibility
```

over:

```text
maximum component count

automatic inclusion

provider popularity

taxonomy completeness
```

---

# 130. Curated Does Not Mean Exhaustive

A Provider may expose:

```text
300 Components
```

while only:

```text
20
```

are mapped into canonical Capabilities.

This is expected.

The Catalog is a curated semantic layer, not a complete upstream mirror.

---

# 131. Component Discovery vs Eligibility

A Component may exist in generated discovery state but remain ineligible for Resolution because:

```text
no Capability mapping exists
```

This is valid.

Discovery alone does not expose it through normal capability composition.

---

# 132. Direct Component References

V1 should generally discourage consumer Projects from referencing raw Components directly.

If future advanced escape hatches permit it, those references still must resolve through Catalog/Component identity.

The preferred user model remains:

```text
Capability
```

not:

```text
Component
```

---

# 133. Catalog Evolution

Catalog changes fall into several classes.

## Non-Semantic

Examples:

```text
description typo

documentation link
```

## Additive

Examples:

```text
new Provider

new Package

new Capability

new implementation
```

## Selection-Affecting

Examples:

```text
priority change

new higher-priority implementation

implementation deprecation
```

## Breaking

Examples:

```text
Capability ID removal

Capability semantic change

Component identity change
```

Selection-affecting and breaking changes deserve additional review.

---

# 134. Catalog Compatibility

A newer Catalog may remain compatible with an older Project Lock.

Normal sync should preserve the existing valid Project Lock according to `resolution-spec.md`.

Catalog change does not automatically imply project change.

---

# 135. Catalog Release

A Catalog release should ideally include:

```text
validated manifests

pinned catalog.lock

generated Component inventory

generated indexes

resolver tests

adapter tests
```

This creates a coherent curated distribution.

---

# 136. Catalog Diff

Maintainer tooling should eventually support semantic diffs.

Example:

```text
Provider added

Package version changed

Component added

Component removed

Capability mapping changed

Priority changed

Capability deprecated
```

This is more useful than raw YAML diff alone.

---

# 137. Catalog Impact Analysis

For a changed Component:

```text
Component
    ↓
Capabilities
    ↓
Presets
    ↓
Profiles
```

For a changed Capability:

```text
Capability
    ↓
Presets
    ↓
Profiles
```

Generated reverse indexes may support this.

---

# 138. Catalog Testing

Catalog tests should include:

```text
all manifests validate

all references resolve

all IDs unique

all Capability graphs acyclic

all mapped Components exist

all Packages belong to Providers

all generated inventory deterministic

all initial V1 Profiles resolve successfully
```

---

# 139. Representative Resolution Tests

The Catalog should provide fixture coverage for:

```text
TDD with multiple competing Providers

Capability with cardinality many

Policy filtering

Target incompatibility

deprecated implementation

Package containing selected and suppressed Components
```

This proves the Catalog is not only syntactically valid but semantically useful.

---

# 140. V1 Catalog Scope

Initial Providers:

```text
superpowers

mattpocock

ecc

anthropic

wshobson

agent-plugins
```

Initial Capability coverage should be deliberately limited to what is needed for representative Profiles.

---

# 141. V1 Capability Domains

Recommended initial domains:

```text
workflow

engineering

frontend

backend

security

knowledge

product

tooling
```

Additional domains such as:

```text
devops
gis
```

may be added when real V1 examples require them.

---

# 142. V1 Catalog Minimum

V1 Catalog must be sufficient to resolve at least:

```text
frontend-engineer

backend-engineer

product-manager

second-brain
```

with meaningful provider overlap.

---

# 143. V1 Catalog Success Criteria

The Catalog is ready for V1 when:

```text
Provider manifests validate

Package manifests validate

Capability manifests validate

all implementation references resolve

TDD overlap is represented correctly

policy metadata exists for security-sensitive sources

catalog.lock pins external sources

component discovery is deterministic

generated indexes have no drift

representative Profiles resolve successfully
```

---

# 144. Catalog Anti-Pattern — Provider-Centric Composition

Avoid:

```yaml
profile:
  plugins:
    - superpowers
    - ecc
```

Catalog should enable:

```text
Capability
→ implementations
```

not encourage provider bundles as the primary abstraction.

---

# 145. Catalog Anti-Pattern — Manual Component Mirror

Avoid manually copying every upstream Component into:

```text
catalog/components/
```

unless there is a strong technical reason.

Prefer adapter-driven discovery.

---

# 146. Catalog Anti-Pattern — Runtime Rendering Metadata in Capability

Avoid:

```yaml
claude:
  installPath: ...
```

inside a semantic Capability definition.

Such information belongs to Target Adapter or implementation metadata.

---

# 147. Catalog Anti-Pattern — Trust by Popularity

Avoid:

```yaml
trust: curated
```

because:

```text
repository has many stars
```

Trust classification must come from explicit curation.

---

# 148. Catalog Anti-Pattern — Capability Per Skill

Do not create a new canonical Capability merely because an upstream Skill exists.

A Skill may:

```text
map to an existing Capability

support another implementation

remain discovered but uncurated
```

---

# 149. Catalog Anti-Pattern — Provider Name in Capability ID

Avoid:

```text
superpowers.tdd

ecc.security-review
```

Use semantic identities:

```text
engineering.testing.tdd

security.review
```

---

# 150. Catalog Anti-Pattern — Latest Version as Desired State

Avoid Package metadata such as:

```yaml
version: latest
```

for curated external Packages.

Preferred:

```text
version selection
→ catalog.lock
```

---

# 151. Catalog Anti-Pattern — Generated Metadata as Canonical

Do not manually edit:

```text
generated/catalog/components.json
```

to fix semantic problems.

Fix:

```text
source adapter

canonical Catalog metadata

upstream pin
```

then regenerate.

---

# 152. Catalog Anti-Pattern — Hidden Semantic Defaults

Avoid significant semantic behavior inferred from file naming or directory placement alone.

Example:

```text
folder name security/
```

must not automatically assign:

```text
security.* capability
```

Canonical IDs must be explicit.

---

# 153. Catalog Invariants

The Catalog must preserve:

```text
1. Every Provider has a stable canonical ID.

2. Every Package belongs to exactly one Provider.

3. Every Component belongs to exactly one Package.

4. Every Capability has one canonical semantic ID.

5. Capability IDs are provider-independent.

6. Capability IDs are target-independent.

7. Implementation mappings reference valid Components.

8. Semantic mappings are curated, not automatically inferred.

9. Component discovery does not imply Capability eligibility.

10. Distribution versions are pinned outside semantic identity.

11. Generated inventories contain no unique semantic curation.

12. Catalog loading is deterministic.

13. Catalog validation happens before Resolution.

14. Upstream latest does not automatically become curated state.

15. Stable Capability semantics should evolve conservatively.
```

---

# 154. Catalog Processing Summary

```text
Provider Manifests
      │
      ├───────────────┐
      ▼               │
Package Manifests     │
      │               │
      ▼               │
catalog.lock          │
      │               │
      ▼               │
Source Adapters       │
      │               │
      ▼               │
Discovered Components │
      │               │
      └──────┐        │
             ▼        ▼
        Capability Manifests
             │
             ▼
          Validation
             │
             ▼
       Normalized Catalog
             │
       ┌─────┴─────┐
       ▼           ▼
   Resolver     Generators
```

---

# 155. Minimal Catalog Mental Model

```text
Provider
   ↓
Package
   ↓
Discovered Component
   ↓
Curated Capability Mapping
   ↓
Resolver Candidate
```

The critical separation is:

```text
what exists upstream
≠
what it means semantically
≠
what a Project selects
```

---

# 156. Catalog in One Sentence

> **The `agent-plugins` Catalog is a declarative, curated, version-controlled mapping from Providers and Packages to normalized Components and provider-independent Capabilities, with external versions pinned separately and all semantic mappings validated before they become Resolver candidates.**