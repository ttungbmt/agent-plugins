# Manifest Specification

## Overview

This document defines the consumer project manifest format for `agent-plugins`.

The default project manifest is:

```text
agent-plugins.yaml
```

The manifest describes the **desired semantic state** of an agent environment.

It answers:

> **What capabilities should this project have, under which policy, for which target runtime?**

The manifest should remain:

- declarative,
- concise,
- human-readable,
- version-controlled,
- provider-independent by default,
- deterministic,
- machine-validatable.

The manifest describes intent.

It does not normally contain:

- resolved package versions,
- immutable upstream commits,
- generated runtime files,
- discovered component inventories,
- complete provider metadata.

Those belong to Catalog, Lockfile, or Target state.

---

# 1. Core Principle

The manifest should describe:

```text
role
+
project needs
+
constraints
+
explicit exceptions
```

rather than:

```text
raw plugin installation list
```

Preferred:

```yaml
profile: frontend-engineer

presets:
  - stacks/nextjs
  - engineering/security
```

Avoid:

```yaml
plugins:
  - superpowers
  - ecc
  - mattpocock
  - frontend-design
```

unless a future low-level escape hatch explicitly requires it.

---

# 2. Default Filename

The canonical filename is:

```text
agent-plugins.yaml
```

The CLI may optionally support:

```text
agent-plugins.yml
```

but documentation and generated examples should consistently use:

```text
agent-plugins.yaml
```

---

# 3. Manifest Location

The default location is the consumer repository root.

Example:

```text
my-project/
├── src/
├── package.json
├── agent-plugins.yaml
└── agent-plugins.lock
```

The CLI may support an explicit manifest path later.

---

# 4. Manifest Envelope

Recommended structure:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: mealops

spec:
  profile: frontend-engineer

  presets:
    - stacks/nextjs
    - engineering/security

  policy: default

  targets:
    - claude-code
```

Canonical top-level fields:

```text
apiVersion
kind
metadata
spec
```

---

# 5. `apiVersion`

Required:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
```

The API version controls:

```text
manifest structure
field semantics
migration behavior
validation rules
```

It does not identify the project.

---

# 6. `kind`

Required:

```yaml
kind: Project
```

V1 project manifests must use:

```text
Project
```

Unknown kinds must fail validation.

---

# 7. `metadata`

`metadata` contains non-resolution identity and descriptive information.

Recommended structure:

```yaml
metadata:
  name: mealops
  description: Internal team meal operations application.
```

Recommended fields:

```text
name
description
```

`name` may be optional if the repository name already provides sufficient identity.

---

# 8. Metadata Must Not Affect Resolution

Fields such as:

```text
name
description
```

must not alter semantic Resolution.

Changing:

```yaml
metadata:
  description: ...
```

should not change selected implementations.

---

# 9. `spec`

`spec` contains semantic desired-state configuration.

Core V1 fields:

```text
profile
presets
capabilities
policy
targets
overrides
```

Conceptually:

```yaml
spec:
  profile: frontend-engineer
  presets: []
  capabilities: {}
  policy: default
  targets:
    - claude-code
  overrides: {}
```

---

# 10. Minimal Manifest

A minimal project may use:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: frontend-engineer

  targets:
    - claude-code
```

If `policy` is omitted, a documented default may be applied.

---

# 11. Recommended Manifest

Typical:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: mealops

spec:
  profile: frontend-engineer

  presets:
    - stacks/nextjs
    - stacks/cloudflare
    - engineering/security

  policy: default

  targets:
    - claude-code
```

---

# 12. Profile

`spec.profile` selects one reusable Profile.

Example:

```yaml
profile: frontend-engineer
```

The Profile establishes role-level baseline intent.

---

# 13. Profile Cardinality

V1 should support:

```text
zero or one Profile
```

Not:

```text
multiple Profiles
```

by default.

This avoids ambiguous combinations such as:

```text
frontend-engineer
+
product-manager
+
researcher
```

For mixed needs, use additional Presets.

---

# 14. Optional Profile

A project may omit Profile and compose entirely from Presets or explicit Capabilities.

Example:

```yaml
spec:
  presets:
    - knowledge/research
    - knowledge/writing

  targets:
    - claude-code
```

At least one source of Capability intent must exist.

---

# 15. Profile Must Exist

The Profile reference must resolve to the active distribution.

Invalid:

```yaml
profile: nonexistent-role
```

Diagnostic:

```text
UNKNOWN_PROFILE
```

---

# 16. Presets

`spec.presets` adds Project-specific reusable compositions.

Example:

```yaml
presets:
  - stacks/nextjs
  - engineering/security
```

Preset IDs use canonical slash-separated IDs.

---

# 17. Preset Ordering

Preset list ordering must not affect semantic outcome.

These should resolve equivalently:

```yaml
presets:
  - engineering/security
  - stacks/nextjs
```

and:

```yaml
presets:
  - stacks/nextjs
  - engineering/security
```

The Resolver aggregates Capability intent before selection.

---

# 18. Duplicate Presets

Duplicate Preset entries should either:

```text
normalize to one reference
```

or fail validation.

Recommended V1 behavior:

```text
deduplicate with warning
```

or reject duplicates during schema/semantic validation for cleaner manifests.

No duplicate should create duplicate semantic behavior.

---

# 19. Project Presets vs Profile Presets

Effective Presets are conceptually:

```text
Profile Presets
+
Project Presets
```

They are expanded together before Capability Resolution.

Project Presets do not replace Profile Presets unless explicitly modeled in the future.

---

# 20. Explicit Capabilities

A Project may request individual Capabilities directly.

Recommended structure:

```yaml
capabilities:
  enable:
    - security.review
    - knowledge.research
```

This provides a precise escape hatch without creating a new Preset.

---

# 21. Capability Disable

A Project may disable inherited Capability intent.

Example:

```yaml
capabilities:
  disable:
    - tooling.browser
```

or under Overrides depending on the final schema.

To avoid duplicate concepts, V1 should choose one canonical location.

Recommended canonical design:

```yaml
overrides:
  capabilities:
    enable:
      - security.review

    disable:
      - tooling.browser
```

Therefore top-level `spec.capabilities` should be omitted in V1 unless a simpler manifest model is preferred.

---

# 22. Canonical V1 Override Location

Recommended:

```yaml
spec:
  overrides:
    capabilities:
      enable: []
      disable: []

    implementations: {}
```

This keeps all explicit exceptions together.

---

# 23. Why Overrides Are Separate

Normal composition:

```text
Profile
+
Presets
```

represents reusable intent.

Overrides represent:

```text
project-specific exception
```

Keeping them separate improves explainability.

Example:

```text
engineering.testing.tdd

required by:
frontend-engineer

implementation changed by:
project override
```

---

# 24. Policy

`spec.policy` selects a reusable Policy.

Example:

```yaml
policy: strict
```

The Policy defines eligibility and governance constraints.

---

# 25. Default Policy

If omitted, the system may use:

```text
default
```

Recommended behavior:

```yaml
policy: default
```

is semantically equivalent to omission if the default exists.

The applied default must always be visible in:

```text
ap explain
ap doctor
lockfile metadata
```

Avoid hidden policy behavior.

---

# 26. Unknown Policy

Invalid:

```yaml
policy: corporate-super-secure
```

when no such Policy exists.

Resolution must fail with:

```text
UNKNOWN_POLICY
```

---

# 27. Target

`spec.targets` declares runtime targets.

Example:

```yaml
targets:
  - claude-code
```

V1 requires Claude Code support.

---

# 28. Why Targets Is an Array

Although V1 may support one target, use:

```yaml
targets:
  - claude-code
```

rather than:

```yaml
target: claude-code
```

to leave a clean path toward future multi-runtime support.

---

# 29. V1 Target Cardinality

V1 should validate:

```text
exactly one target
```

unless multi-target support is implemented.

Therefore this is structurally future-ready:

```yaml
targets:
  - claude-code
```

while this may remain invalid in V1:

```yaml
targets:
  - claude-code
  - codex
```

with a clear diagnostic such as:

```text
MULTI_TARGET_NOT_SUPPORTED
```

---

# 30. Unknown Target

An unknown target must fail validation.

Example:

```yaml
targets:
  - unknown-runtime
```

Diagnostic:

```text
UNKNOWN_TARGET
```

---

# 31. Overrides

`spec.overrides` contains explicit Project-specific deviations from normal composition and selection.

Recommended V1 structure:

```yaml
overrides:
  capabilities:
    enable: []
    disable: []

  implementations: {}
```

Overrides should remain narrow and typed.

---

# 32. Capability Enable Override

Example:

```yaml
overrides:
  capabilities:
    enable:
      - security.review
```

This adds a Capability Requirement.

---

# 33. Capability Disable Override

Example:

```yaml
overrides:
  capabilities:
    disable:
      - tooling.browser
```

This suppresses inherited intent.

If another required Capability depends on it:

```text
resolution fails
```

rather than silently producing an invalid graph.

---

# 34. Duplicate Enable

If a Capability is already inherited from a Profile or Preset and also enabled explicitly:

```text
deduplicate semantic requirement
```

The Resolver should preserve multiple requirement sources for explanation.

---

# 35. Enable and Disable Same Capability

Invalid:

```yaml
overrides:
  capabilities:
    enable:
      - security.review

    disable:
      - security.review
```

Recommended diagnostic:

```text
CONFLICTING_CAPABILITY_OVERRIDE
```

Do not define implicit precedence between enable and disable.

---

# 36. Implementation Override

A Project may explicitly request a specific Component implementation.

Recommended structure:

```yaml
overrides:
  implementations:
    engineering.testing.tdd:
      component: mattpocock/skills#skill:tdd
```

The key is the canonical Capability ID.

---

# 37. Implementation Override Semantics

An implementation override means:

> For this Capability, prefer exactly this implementation for this Project.

It does not mean:

```text
bypass policy
bypass target support
ignore missing dependencies
```

Hard constraints still apply.

---

# 38. Invalid Implementation Override

Example:

```yaml
implementations:
  engineering.testing.tdd:
    component: unknown/package#skill:missing
```

must fail.

Likewise, if the Component exists but is not mapped as an implementation of:

```text
engineering.testing.tdd
```

the override should fail unless a future unsafe/raw mode explicitly exists.

---

# 39. Override Does Not Rewrite Catalog

Project override:

```text
TDD → Matt Pocock
```

affects only the current Project.

It does not modify the default Catalog mapping or priority.

---

# 40. Provider-Specific Override

Provider selection should happen indirectly through Component implementation override.

Prefer:

```yaml
implementations:
  engineering.testing.tdd:
    component: superpowers/superpowers#skill:test-driven-development
```

Avoid a separate construct such as:

```yaml
providers:
  tdd: superpowers
```

because Component identity is more precise.

---

# 41. No Arbitrary Package Override in V1

V1 should not support arbitrary fields such as:

```yaml
packages:
  force:
    - some-package
```

as a normal workflow.

This bypasses the Capability model.

If low-level escape hatches are introduced later, they should be clearly separated from semantic composition.

---

# 42. No Raw Plugin Lists

Avoid:

```yaml
plugins:
  - superpowers
  - ecc
```

as the primary manifest model.

Provider and Package selection should be Resolver output.

---

# 43. No Provider Lists as Desired State

Avoid:

```yaml
providers:
  - superpowers
  - ecc
```

unless configuring source availability in a future advanced manifest.

The normal consumer should not need to know Provider names.

---

# 44. Manifest Semantic Precedence

Capability intent is built from:

```text
Profile
   +
Project Presets
   +
Capability Enable Overrides
   -
Capability Disable Overrides
```

Conceptually:

```text
Base Intent
   ↓
Overrides
   ↓
Effective Capability Requirements
```

---

# 45. Implementation Selection Precedence

The manifest contributes one key preference:

```text
Explicit Implementation Override
```

Full Resolver precedence is defined in `resolution-spec.md`.

Summary:

```text
Hard Constraints
>
Project Implementation Override
>
Existing Valid Lock
>
Policy Preference
>
Target Preference
>
Catalog Priority
```

---

# 46. Manifest Does Not Own Lock Preference

The manifest does not need fields such as:

```yaml
preserveLock: true
```

for normal V1 behavior.

Lock stability is Resolver behavior.

If update semantics later require explicit control, they should be introduced carefully.

---

# 47. Manifest Does Not Own Versions

Normal project manifest should not contain:

```yaml
versions:
  superpowers: 6.4.0
```

Package versions belong to Resolution and Lockfile.

Users express semantic intent.

---

# 48. Manifest Does Not Own Integrity

Do not place:

```yaml
sha256:
commit:
checksum:
```

for normal resolved Packages in the Project Manifest.

These belong in:

```text
agent-plugins.lock
```

---

# 49. Manifest Does Not Own Runtime Paths

Avoid fields such as:

```yaml
claude:
  installDir: .claude/plugins
```

in the semantic manifest unless a Target genuinely requires configurable path behavior.

Runtime-specific configuration should preferably belong to target configuration or adapter settings.

---

# 50. Target-Specific Configuration

Some Target-specific configuration may eventually be necessary.

Recommended extension:

```yaml
targets:
  - id: claude-code
    config:
      ...
```

However, V1 should keep:

```yaml
targets:
  - claude-code
```

if no real target-specific options are necessary.

Do not introduce configuration structure before use cases require it.

---

# 51. Optional Manifest Features

Potential future fields:

```text
extends
imports
variables
target configuration
update policy
task-level capabilities
organization policy references
```

These are not required in V1.

---

# 52. No Deep Manifest Inheritance

Avoid:

```yaml
extends:
  - ../../base.yaml
  - ../team.yaml
  - personal.yaml
```

in V1.

Deep configuration inheritance creates:

```text
hidden state
difficult precedence
poor explainability
```

Reuse should happen through:

```text
Profiles
Presets
Policies
```

---

# 53. No Arbitrary Includes

Avoid a generic:

```yaml
include:
  - anything.yaml
```

mechanism in V1.

This would introduce an uncontrolled second composition system.

---

# 54. Manifest Comments

YAML comments are allowed.

Example:

```yaml
presets:
  # Project uses Cloudflare Workers.
  - stacks/cloudflare
```

Comments are informational only.

They must not affect Resolution.

---

# 55. Environment Variable Expansion

V1 should not perform arbitrary environment-variable interpolation in semantic fields.

Avoid:

```yaml
profile: ${AGENT_PROFILE}
```

because hidden environment state can make Resolution non-reproducible.

If interpolation is added later, it must be explicit and included in Resolution Context.

---

# 56. Arbitrary Code Is Forbidden

The manifest must remain declarative.

Invalid concept:

```yaml
resolve:
  run: ./choose-plugins.js
```

or:

```yaml
policy:
  eval: |
    ...
```

Arbitrary code would undermine deterministic Resolution and portability.

---

# 57. Unknown Fields

Recommended V1 behavior:

```text
reject unknown fields
```

Example:

```yaml
spec:
  profle: frontend-engineer
```

must not silently ignore the typo.

It should produce:

```text
UNKNOWN_FIELD
```

or schema validation failure.

---

# 58. Stable Key Ordering

Recommended human-facing order:

```yaml
apiVersion:
kind:

metadata:

spec:
  profile:
  presets:
  policy:
  targets:
  overrides:
```

Formatting does not affect semantics.

---

# 59. Manifest Validation Stages

Validation should proceed through:

```text
1. File parsing

2. Schema validation

3. ID syntax validation

4. Reference validation

5. Override validation

6. Semantic validation

7. Resolution validation
```

---

# 60. YAML Parse Errors

Malformed YAML must fail before schema processing.

Diagnostic should identify:

```text
file
line
column
```

where available.

---

# 61. Schema Validation

Schema validates:

```text
required fields
field types
allowed enums
unknown fields
array structure
```

---

# 62. Reference Validation

Validate:

```text
Profile exists

Preset exists

Policy exists

Target exists

Capability override exists

Implementation override Component exists
```

---

# 63. Semantic Validation

Examples:

```text
enable + disable same Capability

implementation override for non-implementation Component

duplicate Target

unsupported multi-target configuration

manifest with no source of Capability intent
```

---

# 64. Empty Manifest Intent

This should normally be invalid:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  targets:
    - claude-code
```

because no Profile, Preset, or Capability intent exists.

Possible exception:

```text
explicit empty environment
```

could be supported later if useful.

---

# 65. Profile-Only Project

Valid:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: backend-engineer

  targets:
    - claude-code
```

Profile provides Capability intent.

---

# 66. Preset-Only Project

Valid:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  presets:
    - knowledge/research
    - knowledge/writing

  targets:
    - claude-code
```

---

# 67. Override-Only Enable Project

Potentially valid:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  targets:
    - claude-code

  overrides:
    capabilities:
      enable:
        - knowledge.research
```

This enables minimal custom composition.

---

# 68. Disable-Only Project

Invalid if there is no inherited Capability intent.

Example:

```yaml
spec:
  targets:
    - claude-code

  overrides:
    capabilities:
      disable:
        - tooling.browser
```

There is nothing meaningful to resolve.

---

# 69. Manifest Reference IDs

Profile:

```text
frontend-engineer
```

Preset:

```text
stacks/nextjs
```

Policy:

```text
strict
```

Target:

```text
claude-code
```

Capability:

```text
engineering.testing.tdd
```

Component:

```text
superpowers/superpowers#skill:test-driven-development
```

Each field uses the canonical domain identifier for its entity.

---

# 70. Profile Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: web-app

spec:
  profile: frontend-engineer

  targets:
    - claude-code
```

---

# 71. Frontend Project Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: mealops

spec:
  profile: frontend-engineer

  presets:
    - stacks/nextjs
    - stacks/cloudflare
    - engineering/security

  policy: default

  targets:
    - claude-code
```

---

# 72. Backend Project Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: api-service

spec:
  profile: backend-engineer

  presets:
    - stacks/typescript
    - stacks/node
    - engineering/security

  policy: strict

  targets:
    - claude-code
```

---

# 73. Product Manager Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: product-workspace

spec:
  profile: product-manager

  presets:
    - knowledge/research
    - knowledge/writing

  policy: default

  targets:
    - claude-code
```

---

# 74. Second Brain Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: personal-knowledge-system

spec:
  profile: second-brain

  presets:
    - knowledge/research
    - knowledge/writing
    - knowledge/synthesis
    - tools/obsidian

  policy: personal

  targets:
    - claude-code
```

---

# 75. Capability Enable Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: frontend-engineer

  targets:
    - claude-code

  overrides:
    capabilities:
      enable:
        - security.review
```

---

# 76. Capability Disable Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: frontend-engineer

  targets:
    - claude-code

  overrides:
    capabilities:
      disable:
        - tooling.browser
```

If another Capability requires `tooling.browser`, Resolution fails.

---

# 77. Implementation Override Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: frontend-engineer

  targets:
    - claude-code

  overrides:
    implementations:
      engineering.testing.tdd:
        component: mattpocock/skills#skill:tdd
```

---

# 78. Combined Override Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: custom-web-app

spec:
  profile: frontend-engineer

  presets:
    - stacks/nextjs

  policy: strict

  targets:
    - claude-code

  overrides:
    capabilities:
      enable:
        - security.review

      disable:
        - tooling.browser

    implementations:
      engineering.testing.tdd:
        component: mattpocock/skills#skill:tdd
```

This may still fail if a required Capability depends on `tooling.browser`.

---

# 79. Manifest Normalization

Raw manifest:

```text
YAML
```

should be converted through:

```text
Parse
↓
Schema Validate
↓
Reference Validate
↓
Normalize Defaults
↓
Project Domain Object
```

The Resolver consumes the normalized Project object.

---

# 80. Normalized Project

Conceptually:

```text
Project

profile:
  frontend-engineer

presets:
  [stacks/nextjs]

policy:
  default

targets:
  [claude-code]

overrides:
  capabilities:
    enable: []
    disable: []

  implementations:
    {}
```

Defaults should be explicit after normalization.

---

# 81. Defaults

Recommended V1 defaults:

```text
policy
→ default

presets
→ []

capability enable
→ []

capability disable
→ []

implementation overrides
→ {}
```

Targets should not default silently.

Require:

```yaml
targets:
  - claude-code
```

so runtime intent remains explicit.

---

# 82. Why Target Should Be Explicit

A default Target could cause surprising behavior when multi-runtime support appears.

Therefore:

```text
Profile may default
Policy may default
Target should remain explicit
```

Recommended.

---

# 83. Profile Default

V1 should not default a Profile.

The system cannot safely assume:

```text
software-engineer
```

for every consumer.

`ap init` may recommend or interactively select one, but the resulting manifest should contain the explicit Profile.

---

# 84. Manifest Canonicalization

The CLI may support:

```bash
ap format
```

or equivalent later.

Canonicalization may:

```text
sort lists where order is irrelevant

insert normalized formatting

remove duplicates
```

It must not change semantic intent.

---

# 85. Stable List Ordering

For version-control readability, generated or normalized manifests may sort:

```text
presets
Capability enable list
Capability disable list
```

by canonical ID.

However, user-authored order may be preserved if formatting policy prefers readability.

Semantic Resolution must ignore order.

---

# 86. Lockfile Relationship

The relationship is:

```text
agent-plugins.yaml
        ↓
Resolver
        ↓
agent-plugins.lock
```

Manifest:

```text
desired semantic state
```

Lockfile:

```text
resolved concrete state
```

---

# 87. Manifest Change Detection

Changes that may require re-resolution include:

```text
Profile change

Preset change

Policy change

Target change

Capability override change

Implementation override change
```

Pure metadata changes such as:

```text
description
```

should not require semantic re-resolution.

---

# 88. Resolution Input Fingerprint

The Project Lockfile may contain a digest of normalized resolution-relevant manifest data.

For example, hash:

```text
profile
presets
policy
targets
overrides
```

but exclude:

```text
description
comments
formatting
```

This helps distinguish semantic changes from cosmetic edits.

---

# 89. Manifest Change: Profile

Example:

```text
frontend-engineer
→ backend-engineer
```

This is a major semantic change.

Existing lock state may be reused only for still-valid overlapping requirements according to Resolver rules.

---

# 90. Manifest Change: Add Preset

Example:

```text
+ engineering/security
```

The Resolver should preserve existing valid selections where possible while resolving new Capability requirements.

---

# 91. Manifest Change: Remove Preset

Capabilities only required by that Preset may disappear from desired state.

Packages no longer required may later be removed from Managed State during sync.

---

# 92. Manifest Change: Policy

Example:

```text
default
→ strict
```

This may invalidate existing locked implementations.

Policy is a hard Resolution input.

The lock must be revalidated.

---

# 93. Manifest Change: Target

Example:

```text
claude-code
→ codex
```

This requires target-specific Resolution.

Existing implementation selections may no longer be compatible.

---

# 94. Manifest Change: Capability Disable

The Capability is removed from direct/inherited intent unless still required transitively.

If still hard-required:

```text
Resolution failure
```

---

# 95. Manifest Change: Implementation Override

An explicit implementation override should cause the relevant Capability to be reconsidered even in normal sync mode.

Override takes precedence over existing lock preference.

---

# 96. Unknown Component in Override

The manifest should fail before Resolution.

Example diagnostic:

```text
UNKNOWN_COMPONENT

spec.overrides.implementations.engineering.testing.tdd.component
```

---

# 97. Wrong Capability Mapping

If:

```text
Component X
```

exists but does not implement:

```text
engineering.testing.tdd
```

the override must fail.

Recommended code:

```text
INVALID_IMPLEMENTATION_OVERRIDE
```

---

# 98. Deprecated Capability Override

If a Project explicitly enables a deprecated Capability:

```text
warning
```

plus migration suggestion where available.

A removed Capability should fail.

---

# 99. Deprecated Implementation Override

Explicitly selecting a deprecated implementation may be allowed with warning if still valid.

Policy may forbid deprecated implementations.

---

# 100. Policy-Controlled Overrides

Policy may constrain whether Projects can choose arbitrary implementation overrides.

For example, an enterprise Policy could conceptually allow only approved implementations.

This should be enforced during Resolution, not by changing manifest syntax.

---

# 101. Security-Sensitive Override

If a Project explicitly chooses a security-sensitive Component:

```text
hook
MCP
command
script
```

the Component must still pass Policy.

Explicit user intent does not automatically mean security approval.

---

# 102. Manifest Portability

A Project Manifest should ideally remain usable across machines.

Avoid machine-specific fields such as:

```text
C:\Users\Tung\...
/home/user/...
```

unless explicitly part of target-local configuration.

Semantic manifest content should be portable.

---

# 103. Repository-Relative Paths

If future fields accept local paths, paths should be repository-relative by default.

Example:

```text
./agent-config/...
```

Absolute paths should be discouraged or rejected for portable configuration.

---

# 104. No Credentials

Never store credentials in:

```text
agent-plugins.yaml
```

Examples to avoid:

```text
API keys
access tokens
passwords
private SSH keys
```

Authentication belongs to environment/tool-specific credential mechanisms.

---

# 105. Secret References

If future targets require secrets, the manifest may eventually refer to named secret sources.

Example concept:

```yaml
credentials:
  source: environment
```

but actual secret values should remain outside the manifest.

Not required in V1.

---

# 106. Local Overrides

A future user may want machine-specific configuration.

Do not introduce:

```text
agent-plugins.local.yaml
```

in V1 unless a validated need exists.

Local semantic overrides could undermine reproducibility.

Prefer runtime adapter settings separate from semantic desired state.

---

# 107. Team Configuration

A future organization may want shared configuration.

Prefer reusable:

```text
Profiles
Presets
Policies
```

rather than generic manifest inheritance.

A Project still produces an explicit effective desired state.

---

# 108. Workspace / Monorepo Support

Future monorepos may want:

```text
root Project manifest
+
package-specific intent
```

V1 does not require nested manifests.

Recommended V1 rule:

```text
one agent-plugins.yaml per managed project root
```

---

# 109. Nested Manifest Discovery

Do not automatically merge parent and child manifests in V1.

That would create hidden precedence and difficult explainability.

If nested projects are introduced later, semantics must be explicit.

---

# 110. Manifest Discovery

CLI behavior should search:

```text
current working directory
```

for:

```text
agent-plugins.yaml
```

V1 should avoid walking arbitrarily far up the filesystem unless behavior is clearly documented.

---

# 111. Explicit Manifest Path

A future CLI option may support:

```bash
ap sync --manifest ./config/agent-plugins.yaml
```

This does not change manifest semantics.

---

# 112. API Version Evolution

Expected lifecycle:

```text
v1alpha1
→ v1beta1
→ v1
```

Alpha versions may change.

Stable versions should use migration strategy for breaking changes.

---

# 113. Manifest Migration

Conceptually:

```text
Old Manifest
    ↓
Migration
    ↓
Current Manifest DTO
    ↓
Normalization
    ↓
Project
```

Migration may be provided by:

```text
ap migrate
```

in the future.

---

# 114. Unsupported API Version

If the CLI does not understand:

```yaml
apiVersion: agent-plugins.dev/v99
```

it must fail clearly.

Recommended diagnostic:

```text
UNSUPPORTED_API_VERSION
```

Do not attempt best-effort parsing.

---

# 115. Manifest Schema

Recommended schema location:

```text
packages/schemas/schemas/project.schema.json
```

or versioned:

```text
packages/schemas/schemas/v1alpha1/project.schema.json
```

---

# 116. Conceptual V1 Schema

Conceptually:

```yaml
apiVersion: string
kind: Project

metadata:
  name?: string
  description?: string

spec:
  profile?: ProfileId

  presets?: PresetId[]

  policy?: PolicyId

  targets: TargetId[]

  overrides?:
    capabilities?:
      enable?: CapabilityId[]
      disable?: CapabilityId[]

    implementations?:
      <CapabilityId>:
        component: ComponentRef
```

This is descriptive, not the actual JSON Schema.

---

# 117. At-Least-One Intent Rule

The manifest must contain at least one of:

```text
profile

preset

enabled Capability
```

after normalization.

Otherwise the Project has no semantic desired state.

---

# 118. Target Required Rule

At least one Target is required.

V1:

```text
exactly one
```

---

# 119. Policy Reference Rule

If Policy is omitted:

```text
normalize to default
```

if the distribution defines the default Policy.

If the default Policy is missing, manifest normalization fails.

---

# 120. Duplicate ID Rule

Arrays that represent sets must not contain duplicate IDs.

Examples:

```text
presets

targets

Capability enable

Capability disable
```

Recommended schema or semantic validation:

```text
uniqueItems: true
```

---

# 121. Canonical ID Validation

References must follow entity-specific syntax before lookup.

Examples:

Capability:

```text
engineering.testing.tdd
```

Preset:

```text
engineering/security
```

Profile:

```text
frontend-engineer
```

This allows clearer diagnostics.

---

# 122. Manifest Diagnostic Codes

Recommended initial codes:

```text
INVALID_PROJECT_MANIFEST

UNSUPPORTED_API_VERSION

UNKNOWN_FIELD

UNKNOWN_PROFILE

UNKNOWN_PRESET

UNKNOWN_POLICY

UNKNOWN_TARGET

UNKNOWN_CAPABILITY

UNKNOWN_COMPONENT

DUPLICATE_PRESET

DUPLICATE_TARGET

CONFLICTING_CAPABILITY_OVERRIDE

INVALID_IMPLEMENTATION_OVERRIDE

EMPTY_PROJECT_INTENT

MULTI_TARGET_NOT_SUPPORTED
```

---

# 123. Diagnostic Location

Diagnostics should include paths such as:

```text
spec.profile

spec.presets[1]

spec.overrides.capabilities.disable[0]

spec.overrides.implementations.engineering.testing.tdd.component
```

This improves editor and CLI usability.

---

# 124. JSON Representation

YAML is the preferred human-facing format.

The schema should ideally allow equivalent JSON representation.

Example:

```json
{
  "apiVersion": "agent-plugins.dev/v1alpha1",
  "kind": "Project",
  "spec": {
    "profile": "frontend-engineer",
    "targets": ["claude-code"]
  }
}
```

Supporting JSON as an input file is optional.

---

# 125. Canonical Format

Even if JSON becomes supported, documentation should use YAML.

Canonical filename remains:

```text
agent-plugins.yaml
```

---

# 126. Manifest and `ap init`

`ap init` should create a valid Project Manifest.

Conceptual flow:

```text
select Profile
↓
select optional Presets
↓
select Policy
↓
select Target
↓
write agent-plugins.yaml
```

The generated manifest should be minimal.

---

# 127. `ap add`

Future:

```bash
ap add preset engineering/security
```

should modify:

```text
spec.presets
```

rather than writing runtime configuration directly.

Likewise:

```bash
ap add capability security.review
```

should map to:

```text
spec.overrides.capabilities.enable
```

---

# 128. `ap remove`

Removing a Project Preset should edit:

```text
spec.presets
```

Removing an inherited Profile Capability may require adding:

```text
spec.overrides.capabilities.disable
```

The CLI should preserve the semantic model rather than flattening the Profile.

---

# 129. `ap sync`

`ap sync` reads the Manifest.

It should not silently rewrite semantic manifest configuration as part of ordinary Resolution.

Formatting or migrations should be explicit operations.

---

# 130. `ap explain`

Explanation should show how Manifest intent contributed.

Example:

```text
engineering.testing.tdd

Required by:
profile frontend-engineer
→ preset engineering/core

Implementation:
Superpowers
```

If an override exists:

```text
Selected because:
project implementation override
```

---

# 131. `ap diff`

`ap diff` compares:

```text
Manifest desired state
+
Resolution
```

against:

```text
Lock / Managed Runtime State
```

It should not compare raw YAML formatting.

---

# 132. `ap doctor`

Manifest diagnostics should be surfaced clearly.

Example:

```text
✗ Unknown preset
  spec.presets[2]
  stacks/nonexistent
```

---

# 133. Manifest Source of Truth

`agent-plugins.yaml` is authoritative for:

```text
Project desired semantic state
```

It is not authoritative for:

```text
Catalog semantics

Provider versions

Component discovery

resolved package versions

actual runtime state
```

---

# 134. Manifest vs Profile

Manifest selects:

```text
Profile
```

Profile defines:

```text
reusable role baseline
```

Do not inline Profile contents into every Manifest.

---

# 135. Manifest vs Preset

Manifest selects additional Presets.

Preset owns reusable grouping.

If the same set of direct Capability enables appears in many Projects, create a Preset rather than copying them repeatedly.

---

# 136. Manifest vs Policy

Manifest selects Policy.

Policy owns governance rules.

Avoid embedding full Policy rules directly into every Project Manifest in V1.

Bad:

```yaml
policy:
  allowedTrust:
    - ...
```

Preferred:

```yaml
policy: strict
```

---

# 137. Why Named Policies

Named reusable Policies improve:

```text
consistency
reviewability
team reuse
manifest simplicity
```

Project-specific policy overrides may be added later only if real use cases demand them.

---

# 138. Manifest vs Lockfile

Manifest:

```text
what should exist
```

Lockfile:

```text
what exact implementation was selected
```

Neither replaces the other.

Both should normally be committed to version control.

---

# 139. Version-Control Recommendation

Recommended:

```text
commit agent-plugins.yaml
commit agent-plugins.lock
```

This provides:

```text
intent
+
reproducibility
```

---

# 140. Manifest Formatting Changes

Formatting-only changes should not cause lockfile changes.

Example:

```text
whitespace

comments

list formatting
```

must not affect normalized Resolution input.

---

# 141. Semantic Fingerprint

Normalized Manifest fingerprint should include:

```text
profile

presets

effective policy reference

targets

Capability overrides

Implementation overrides
```

and exclude:

```text
comments

formatting

metadata.description
```

unless metadata later becomes semantically relevant.

---

# 142. Manifest Portability Invariant

A committed manifest should resolve consistently across machines when:

```text
same distribution

same lock context

same target availability

same policy
```

Machine-specific implicit state must not alter semantic desired state.

---

# 143. Example — Minimal Frontend

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: frontend-engineer

  targets:
    - claude-code
```

---

# 144. Example — Next.js + Security

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: web-platform

spec:
  profile: frontend-engineer

  presets:
    - stacks/nextjs
    - engineering/security

  policy: strict

  targets:
    - claude-code
```

---

# 145. Example — Backend

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: backend-service

spec:
  profile: backend-engineer

  presets:
    - stacks/typescript
    - stacks/node

  policy: default

  targets:
    - claude-code
```

---

# 146. Example — No Profile

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: research-workspace

spec:
  presets:
    - knowledge/research
    - knowledge/writing
    - knowledge/synthesis

  policy: personal

  targets:
    - claude-code
```

---

# 147. Example — Project-Specific Capability

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: backend-engineer

  targets:
    - claude-code

  overrides:
    capabilities:
      enable:
        - security.threat-modeling
```

---

# 148. Example — Project-Specific Disable

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: frontend-engineer

  targets:
    - claude-code

  overrides:
    capabilities:
      disable:
        - frontend.visual-testing
```

---

# 149. Example — Specific TDD Implementation

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

spec:
  profile: frontend-engineer

  targets:
    - claude-code

  overrides:
    implementations:
      engineering.testing.tdd:
        component: superpowers/superpowers#skill:test-driven-development
```

---

# 150. Invalid Example — Provider-Centric Manifest

Avoid:

```yaml
plugins:
  - superpowers
  - mattpocock
  - ecc
```

Why:

```text
provider selection leaks into consumer intent

duplicate workflows become likely

Profiles/Presets are bypassed

Resolver loses semantic context
```

---

# 151. Invalid Example — Pinned Version in Manifest

Avoid:

```yaml
packages:
  superpowers:
    version: 6.4.0
```

Version belongs in:

```text
agent-plugins.lock
```

or distribution locking.

---

# 152. Invalid Example — Inline Policy

Avoid in V1:

```yaml
policy:
  allowedTrust:
    - official
    - curated

  hooks:
    external: deny
```

Preferred:

```yaml
policy: strict
```

---

# 153. Invalid Example — Scripted Resolution

Never:

```yaml
resolver:
  command: ./choose-agent-stack.sh
```

Core Resolution must remain deterministic and declarative.

---

# 154. Invalid Example — Multiple Competing Profiles

Avoid:

```yaml
profiles:
  - frontend-engineer
  - backend-engineer
  - product-manager
```

Use:

```text
one Profile
+
additional Presets
```

for mixed project needs.

---

# 155. Invalid Example — Hidden Target

Avoid omitting Target and assuming:

```text
Claude Code forever
```

Runtime should remain explicit.

---

# 156. Manifest Design Principles

The manifest should follow:

```text
intent over implementation

Capability over Provider

composition over inheritance

Profile for role

Preset for reusable composition

Policy for governance

Override for exception

Lockfile for concrete versions

Target Adapter for runtime detail
```

---

# 157. Manifest Anti-Patterns

Avoid:

```text
large plugin arrays

provider-specific Profiles

provider-specific Presets

manual package version pins

runtime rendering instructions

deep inheritance

arbitrary imports

environment-dependent semantics

embedded scripts

duplicated Policy definitions

lockfile data copied into manifest
```

---

# 158. V1 Required Fields

Required top-level:

```text
apiVersion
kind
spec
```

Required under `spec`:

```text
targets
```

Additionally, at least one semantic intent source is required:

```text
profile

preset

Capability enable override
```

---

# 159. V1 Optional Fields

```text
metadata

spec.profile

spec.presets

spec.policy

spec.overrides
```

Policy omission normalizes to:

```text
default
```

---

# 160. V1 Unsupported Features

V1 should not require:

```text
multiple Profiles

nested manifest inheritance

remote manifest imports

arbitrary Package installation

arbitrary Provider enable lists

inline Policy definitions

version pinning in Project manifest

task-level profiles

automatic stack detection fields

runtime scripts

templating
```

---

# 161. Manifest Processing Pipeline

```text
agent-plugins.yaml
        ↓
Parse
        ↓
Schema Validate
        ↓
Reference Validate
        ↓
Semantic Validate
        ↓
Apply Defaults
        ↓
Normalize
        ↓
Project Domain Object
        ↓
Resolution Context
        ↓
Resolver
```

---

# 162. Manifest Invariants

The Project Manifest must preserve:

```text
1. It expresses desired semantic intent.

2. It remains provider-independent by default.

3. It does not contain resolved Package versions.

4. It does not contain generated runtime state.

5. It selects at most one Profile in V1.

6. Profiles and Presets remain reusable external entities.

7. Policy is selected by reference.

8. Target is explicit.

9. Overrides are explicit and narrow.

10. Capability enable/disable conflicts are invalid.

11. Implementation overrides cannot bypass hard constraints.

12. Ordering of semantic set-like arrays does not affect Resolution.

13. Unknown fields are rejected.

14. Hidden machine state does not alter semantic meaning.

15. The manifest is suitable for version control.
```

---

# 163. Recommended V1 Manifest

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: my-project

spec:
  profile: frontend-engineer

  presets:
    - stacks/nextjs
    - engineering/security

  policy: default

  targets:
    - claude-code

  overrides:
    capabilities:
      enable: []
      disable: []

    implementations: {}
```

In normal use, empty optional structures should be omitted.

Therefore a cleaner equivalent is:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Project

metadata:
  name: my-project

spec:
  profile: frontend-engineer

  presets:
    - stacks/nextjs
    - engineering/security

  policy: default

  targets:
    - claude-code
```

---

# 164. Manifest Success Criteria

The format is successful when a user can understand a Project without knowing:

```text
which Provider wins

which Package version is installed

where Components physically live

how Claude Code stores configuration
```

while the Resolver still has enough semantic information to determine all of those details deterministically.

---

# 165. Manifest in One Sentence

> **`agent-plugins.yaml` is a concise, declarative description of a project's role, reusable capability composition, governance policy, runtime target, and explicit exceptions—leaving concrete provider, component, package, and version selection to deterministic resolution and the lockfile.**