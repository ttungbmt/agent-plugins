# Policy Specification

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.  
**Normative contract:** `packages/schemas/schemas/policy.schema.json` (source-of-truth.md §16, §55)

## Overview

This document defines the Policy model used by `agent-plugins`.

A Policy controls which implementations are allowed, restricted, preferred, or require additional review during Resolution.

Policy answers:

> **Given a set of possible implementations, which ones are acceptable under the current governance rules?**

Policy is intentionally separate from:

- Capability semantics,
- Profile composition,
- Preset composition,
- Project intent,
- implementation priority,
- target compatibility.

The core relationship is:

```text
Project Intent
      ↓
Capability Requirements
      ↓
Candidate Implementations
      ↓
Policy Evaluation
      ↓
Eligible Candidates
      ↓
Resolver Preference
      ↓
Selection
```

The central rule is:

> **Policy determines eligibility before resolver preference determines selection.**

---

# 1. Scope

This specification defines:

```text
Policy manifests

trust rules

ownership rules

Publisher restrictions

Package restrictions

Component restrictions

security-sensitive Component handling

experimental/deprecated behavior

allow / deny / review / prompt outcomes

policy preference

policy evaluation

non-interactive behavior

diagnostics

validation
```

This specification does not define:

```text
Capability taxonomy

Project composition

Catalog discovery

Target rendering

runtime sandboxing

operating-system security
```

---

# 2. Policy Source of Truth

Reusable Policies live under:

```text
policies/
```

Examples:

```text
policies/default.yaml
policies/personal.yaml
policies/strict.yaml
policies/enterprise.yaml
```

The Project Manifest selects a Policy by ID.

Example:

```yaml
spec:
  policy: strict
```

Policy files are authoritative for reusable governance semantics.

---

# 3. Policy Is Declarative

Policies must remain declarative.

Avoid:

```yaml
evaluate:
  script: ./policy.js
```

or:

```yaml
rule:
  command: ./security-check.sh
```

Core Policy evaluation must not depend on arbitrary executable code.

This preserves:

```text
determinism
reviewability
portability
security
```

---

# 4. Policy Manifest Envelope

Recommended format:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict
  description: Conservative policy for trusted development environments.

spec:
  ...
```

Required:

```text
apiVersion
kind
metadata.id
metadata.name
spec
```

---

# 5. Policy IDs

Policy IDs use lowercase kebab-case.

Examples:

```text
default
personal
strict
enterprise
```

Recommended pattern:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Policy IDs are globally unique within the active distribution.

---

# 6. Policy Does Not Define Capabilities

A Policy must not say:

```text
enable TDD
enable security review
```

Those are desired-state decisions.

Policy may instead say:

```text
TDD implementations from untrusted Publishers are denied
```

The distinction is:

```text
Project / Profile / Preset
→ what is needed

Policy
→ what may satisfy it
```

---

# 7. Policy Does Not Select the Final Winner

Policy may:

```text
reject candidates

require review

express preferences
```

but the Resolver remains responsible for final selection.

Example:

```text
Candidate A
trust: community

Candidate B
trust: curated

Policy:
prefer curated
allow community
```

Policy does not directly declare:

```text
select B
```

It declares a preference.

The Resolver applies the complete precedence rules.

---

# 8. Policy Evaluation Inputs

A Policy Evaluator may consider normalized metadata such as:

```text
Publisher

Package

Component

Capability Implementation

ownership

trust

Component type

security classification

Target

lifecycle status

source type
```

Policy evaluation must not rely on hidden network state.

---

# 9. Policy Evaluation Output

Conceptually:

```text
PolicyDecision

├── outcome
├── rule
├── reason
├── severity
└── metadata
```

Recommended outcomes:

```text
allow
deny
review
prompt
```

---

# 10. `allow`

`allow` means:

```text
Policy places no blocking restriction on this Candidate.
```

It does not mean:

```text
Candidate must be selected.
```

Other Resolver rules still apply.

---

# 11. `deny`

`deny` is a hard constraint.

A denied Candidate becomes:

```text
Rejected
```

It cannot be selected regardless of:

```text
Catalog priority

existing lock

Target preference

Project implementation override
```

unless a future Policy explicitly introduces a higher-level exemption mechanism.

V1 should not support implicit exemptions.

---

# 12. `review`

`review` means the Candidate requires explicit review or approval before activation.

It is not equivalent to:

```text
allow
```

and should not silently pass in unattended environments.

---

# 13. `prompt`

`prompt` means an interactive consumer may be asked for a decision.

The Policy engine itself must not display the prompt.

Instead:

```text
Policy Evaluator
      ↓
prompt-required decision
      ↓
Application / CLI
```

The Application layer determines whether interactive approval is possible.

---

# 14. Review vs Prompt

Suggested distinction:

```text
review
→ governance approval is required

prompt
→ interactive user confirmation may satisfy the rule
```

Examples:

```text
third-party executable hook
→ review

community MCP in personal mode
→ prompt
```

V1 may simplify these if implementation cost is too high.

---

# 15. Non-Interactive Behavior

Commands used in CI or non-interactive mode must never block waiting for approval.

For:

```text
review
prompt
```

the default non-interactive behavior should be:

```text
fail unresolved approval
```

unless an explicit pre-recorded approval mechanism exists.

Recommended diagnostic:

```text
POLICY_APPROVAL_REQUIRED
```

---

# 16. Policy Outcome Ordering

Recommended severity:

```text
deny
>
review
>
prompt
>
allow
```

When multiple matching rules apply, the most restrictive hard outcome should normally win.

Example:

```text
Rule A → allow
Rule B → deny
```

Result:

```text
deny
```

---

# 17. Policy Rule Specificity

Policy rules should be evaluated with explicit, documented precedence.

Recommended conceptual model:

```text
more specific rule
can refine
less specific rule
```

Example:

```text
all community publishers → deny

specific publisher X → allow
```

However, exception semantics can become dangerous.

V1 should prefer simple rule composition and explicit final outcomes over complex CSS-style specificity.

---

# 18. Recommended V1 Rule Model

A simpler and safer V1 model is:

```text
baseline constraints
+
explicit deny rules
+
explicit review/prompt rules
+
preference rules
```

Where:

```text
deny always wins
```

and allowlists constrain the Candidate universe.

This avoids complicated exception chains.

---

# 19. Trust

Trust is a governance classification.

Recommended trust levels:

```text
first-party
official
curated
community
untrusted
```

Trust is distinct from ownership.

---

# 20. Ownership

Ownership answers:

> Who maintains this implementation relative to `agent-plugins`?

Recommended values:

```text
first-party
third-party
```

Examples:

```text
agent-plugins native Component
→ first-party

Superpowers Component
→ third-party
```

---

# 21. Trust vs Ownership

Example:

```text
ownership: third-party
trust: official
```

is valid.

Likewise:

```text
ownership: third-party
trust: curated
```

Therefore:

```text
third-party
≠
untrusted
```

---

# 22. Meaning of `first-party` Trust

Trust:

```text
first-party
```

means implementation is owned and maintained by the `agent-plugins` project.

It usually corresponds to:

```text
ownership: first-party
```

---

# 23. Meaning of `official`

`official` means maintained by the organization responsible for the corresponding external runtime, product, or ecosystem.

Example conceptually:

```text
Anthropic-published Claude tooling
→ official
```

Do not use:

```text
official
```

as a synonym for `agent-plugins` first-party code.

---

# 24. Meaning of `curated`

`curated` means explicitly reviewed and approved by `agent-plugins` maintainers.

The implementation may still be externally maintained.

---

# 25. Meaning of `community`

`community` means externally maintained and not given the stronger `official` or `curated` classification.

Community does not automatically mean unsafe.

---

# 26. Meaning of `untrusted`

`untrusted` means insufficient trust has been established for ordinary use under most Policies.

It does not necessarily mean malicious.

A strict Policy should normally deny it.

---

# 27. Trust Is Not a Universal Security Score

Avoid treating:

```text
first-party > official > curated > community > untrusted
```

as a universal numeric quality ranking.

These levels describe governance context.

Policy may decide how to treat each level.

---

# 28. Baseline Trust

Catalog Publisher or Package metadata may define baseline trust.

Example:

```yaml
trust:
  baseline: curated
```

Policy determines whether that trust level is acceptable.

---

# 29. Trust Overrides

Curated metadata may define more specific trust for:

```text
Package
Component
```

where justified.

Conceptual specificity:

```text
Component trust
>
Package trust
>
Publisher baseline trust
```

Only explicit canonical metadata should refine trust.

---

# 30. Effective Trust

Conceptually:

```text
effectiveTrust(candidate)
=
most specific explicit trust classification
```

Possible sources:

```text
Component annotation

Package annotation

Publisher baseline
```

Policy does not rewrite provenance; it evaluates the resulting classification.

---

# 31. Allowed Trust Levels

A Policy may define:

```yaml
trust:
  allow:
    - first-party
    - official
    - curated
```

Candidate with:

```text
community
```

is then denied.

---

# 32. Denied Trust Levels

Alternative schema:

```yaml
trust:
  deny:
    - untrusted
```

V1 should avoid supporting contradictory allow and deny models without clear precedence.

Recommended approach:

```text
allowlist
```

for trust levels.

---

# 33. Recommended Trust Schema

Example:

```yaml
spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
```

This is easy to understand.

---

# 34. Personal Policy Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: personal
  name: Personal

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
      - community
```

---

# 35. Strict Policy Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
```

---

# 36. Publisher Rules

Policy may restrict Publishers directly.

Example:

```yaml
publishers:
  deny:
    - publisher-x
```

This allows governance independent from trust class.

---

# 37. Publisher Allowlist

A highly restrictive Policy may use:

```yaml
publishers:
  allow:
    - agent-plugins
    - anthropic
    - superpowers
```

If `allow` exists, Publishers outside the allowlist are denied.

---

# 38. Publisher Rule Recommendation

Avoid configuring both large:

```text
allow
```

and:

```text
deny
```

lists unnecessarily.

If both are supported, recommended semantics:

```text
Publisher must be in allowlist if allowlist exists
AND
must not be in denylist
```

So:

```text
deny wins
```

---

# 39. Package Rules

Policy may restrict specific Packages.

Example:

```yaml
packages:
  deny:
    - publisher-x/unsafe-tools
```

This is more specific than Publisher-level rules.

---

# 40. Component Rules

Policy may explicitly restrict a Component.

Example:

```yaml
components:
  deny:
    - publisher/package#hook:post-tool-use
```

This provides precise governance without blocking an entire Package.

---

# 41. Capability Policy Rules

Policies should generally govern implementations, not semantic Capabilities.

However, a Policy may sometimes forbid classes of behavior.

Example:

```text
external code execution
```

should be modeled through Component/security metadata rather than:

```text
deny capability X
```

because different implementations of the same Capability may have different risk.

---

# 42. Security-Sensitive Components

Components with executable or external side effects should be classified as security-sensitive.

Examples:

```text
hook

script

command

MCP server

external binary integration

network-enabled automation
```

---

# 43. Component Type Policy

Policy may govern Component types.

Example:

```yaml
components:
  types:
    hook: review
    command: allow
    mcp: prompt
```

This allows broad behavior by type.

---

# 44. Recommended Type Outcomes

A default Policy may use:

```text
skill
→ allow

agent
→ allow

rule
→ allow

workflow
→ allow

hook
→ review

command
→ review or allow depending on execution semantics

mcp
→ review/prompt

lsp
→ allow/review depending on implementation
```

Exact defaults belong to Policy files, not this specification.

---

# 45. Security Classification

Component metadata may expose normalized security attributes.

Examples:

```text
executesCommands

runsHooks

networkAccess

externalService

filesystemWrite

requiresCredential

spawnsProcess
```

Policy can evaluate these facts.

---

# 46. Security Facts vs Policy Rules

Component metadata says:

```text
this Component performs network access
```

Policy says:

```text
network-access Components require review
```

Keep facts and governance separate.

---

# 47. Recommended Security Rule Shape

Conceptually:

```yaml
security:
  executable:
    external: review

  network:
    external: review

  credentials:
    required: review
```

Exact field structure may be simplified based on real Component metadata.

---

# 48. Avoid `safe: true`

Do not model security as:

```yaml
safe: true
```

or:

```yaml
trusted: true
```

Security is multi-dimensional.

Prefer factual metadata plus Policy decisions.

---

# 49. Transitive Security Evaluation

Policy must evaluate transitive implementation dependencies.

Example:

```text
Selected Skill
    ↓
requires Hook
```

The Hook must pass Policy independently.

The Skill cannot implicitly whitelist it.

---

# 50. Dependency Does Not Bypass Policy

Invariant:

> **Every Component entering the final Resolution, whether directly selected or transitively required, must satisfy Policy.**

This is especially important for:

```text
hooks
MCP
commands
scripts
```

---

# 51. Experimental Components

Policy may govern experimental Components or implementations.

Example:

```yaml
lifecycle:
  experimental: deny
```

or:

```yaml
lifecycle:
  experimental: review
```

---

# 52. Deprecated Implementations

Policy may decide how deprecated implementations are treated.

Example:

```yaml
lifecycle:
  deprecated: review
```

Recommended general semantics:

```text
fresh/update resolution
→ avoid deprecated if active alternative exists

existing lock
→ may preserve if still allowed
```

Policy may choose stricter behavior.

---

# 53. Removed Implementations

Removed implementations should normally be unavailable regardless of Policy.

Policy cannot make unavailable source available.

Therefore:

```text
availability
```

is a hard constraint before Policy preference.

---

# 54. Policy Preferences

Policy may express soft preferences among otherwise allowed Candidates.

Examples:

```text
prefer first-party

prefer official

prefer curated

prefer certain Publishers
```

Preference must remain separate from prohibition.

---

# 55. Trust Preference

Conceptual:

```yaml
preferences:
  trust:
    - first-party
    - official
    - curated
    - community
```

This indicates preference ordering.

It does not automatically deny levels absent from the list unless the trust allowlist does.

---

# 56. Publisher Preference

Example:

```yaml
preferences:
  publishers:
    - agent-plugins
    - anthropic
```

This can influence ranking among eligible Candidates.

It must not override explicit Project implementation override.

---

# 57. Policy Preference Precedence

Resolver summary:

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

Policy preference therefore applies only among already eligible Candidates.

---

# 58. Policy Preference vs Existing Lock

Normal sync should generally preserve a valid existing lock even if current Policy preference would now rank another allowed Candidate higher.

Example:

```text
Locked:
community Candidate

Policy:
community allowed
curated preferred

New curated Candidate exists
```

Normal sync:

```text
preserve lock
```

Explicit update:

```text
Policy preference may influence replacement
```

---

# 59. Policy Restriction vs Existing Lock

If Policy changes from:

```text
community allowed
```

to:

```text
community denied
```

existing lock cannot be preserved.

Hard restriction beats lock stability.

---

# 60. Project Override vs Policy

Example:

```text
Project:
TDD → Candidate X

Policy:
Candidate X denied
```

Result:

```text
resolution failure
```

not fallback.

Recommended diagnostic:

```text
INVALID_IMPLEMENTATION_OVERRIDE
```

with Policy denial as cause.

---

# 61. Policy Evaluation Order

Recommended order per Candidate:

```text
1. Availability

2. Explicit Publisher/Package/Component deny

3. Trust eligibility

4. Lifecycle restrictions

5. Security-sensitive rules

6. Component-type rules

7. Approval requirements

8. Preference extraction
```

Some stages may be combined internally.

---

# 62. Deny Rules Win

If any applicable hard rule returns:

```text
deny
```

the final Policy result is:

```text
deny
```

No preference or allow rule may override it in V1.

This simplifies reasoning.

---

# 63. Approval Outcomes

If no deny exists but at least one applicable rule requires:

```text
review
```

recommended result:

```text
review
```

If only `prompt` applies:

```text
prompt
```

Otherwise:

```text
allow
```

Conceptually:

```text
deny
>
review
>
prompt
>
allow
```

---

# 64. Multiple Security Conditions

Example:

```text
Component:
community
MCP
network access
```

Rules:

```text
community → allow

MCP → prompt

network access → review
```

Result:

```text
review
```

because it is the strongest non-deny outcome.

---

# 65. Approval Resolution

Policy evaluation itself should produce:

```text
review
```

or:

```text
prompt
```

The Application layer may later supply an Approval Context.

Conceptually:

```text
Policy Decision
+
Approved Exception
→ effective allow
```

V1 may defer persisted approvals.

---

# 66. V1 Approval Simplification

If implementing approval persistence is too complex, V1 may treat:

```text
review
prompt
```

as:

```text
error requiring manifest/policy change
```

in non-interactive mode and allow temporary interactive approval only during CLI execution.

The effective decision must still remain visible.

---

# 67. Reproducibility of Interactive Approval

Interactive approval creates reproducibility concerns.

If an approval changes the effective Resolution, that approval must be:

```text
recorded
or
required again
```

on another machine.

Do not rely on invisible terminal history.

---

# 68. Persisted Approval

Future options:

```text
Project manifest approval

separate approval file

organization policy approval

lockfile decision record
```

V1 should not introduce this until needed.

---

# 69. Policy in CI

CI should operate without interactive prompts.

Recommended:

```text
allow
→ continue

deny
→ fail

review
→ fail

prompt
→ fail
```

unless explicit approval state exists.

---

# 70. Policy Diagnostic

Example:

```text
POLICY_DENIED

Component:
publisher-x/package-x#mcp:external-system

Policy:
strict

Rule:
external MCP servers are denied
```

---

# 71. Approval Diagnostic

Example:

```text
POLICY_APPROVAL_REQUIRED

Component:
publisher-x/package-x#hook:post-tool-use

Policy:
default

Reason:
third-party executable hooks require review
```

---

# 72. Policy Evaluation Trace

For explainability, record:

```text
Policy ID

matched rules

effective trust

effective outcome

preferences
```

Not every internal implementation detail must be persisted in the Project Lock.

---

# 73. Policy Manifest Structure

Recommended V1 conceptual shape:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict
  description: Conservative policy.

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated

  publishers:
    deny: []

  packages:
    deny: []

  components:
    deny: []

    types:
      hook: review
      mcp: review

  lifecycle:
    experimental: deny
    deprecated: review

  preferences:
    trust:
      - first-party
      - official
      - curated
```

Exact schema may be narrowed for V1.

---

# 74. Default Policy Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: default
  name: Default
  description: Balanced default policy.

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
      - community

  components:
    types:
      hook: review
      mcp: prompt

  lifecycle:
    experimental: review
    deprecated: allow

  preferences:
    trust:
      - first-party
      - official
      - curated
      - community
```

---

# 75. Personal Policy Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: personal
  name: Personal
  description: Flexible policy for personal projects.

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated
      - community

  components:
    types:
      hook: prompt
      mcp: prompt

  lifecycle:
    experimental: prompt
    deprecated: allow

  preferences:
    trust:
      - first-party
      - official
      - curated
      - community
```

---

# 76. Strict Policy Example

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict
  description: Restrictive policy for controlled projects.

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated

  components:
    types:
      hook: review
      mcp: review

  lifecycle:
    experimental: deny
    deprecated: review

  preferences:
    trust:
      - first-party
      - official
      - curated
```

---

# 77. Enterprise Policy

A future enterprise Policy may include:

```text
Publisher allowlist

Package allowlist

strict trust levels

no interactive approval

organization-approved Components

signed source requirements

integrity requirements
```

It must not require centralized enterprise infrastructure merely to validate the core Policy model.

---

# 78. Integrity Policy

Future Policy may require integrity guarantees.

Example:

```yaml
integrity:
  requireHashForExternalPackages: true
```

A Candidate whose Package cannot meet the requirement becomes ineligible.

This is optional for V1.

---

# 79. Immutable Reference Policy

Future strict Policy may require:

```text
immutable source refs
```

for all external Packages.

This can reject Packages locked only to mutable branch names.

---

# 80. Source Type Policy

Policy may restrict source types.

Example:

```yaml
sources:
  deny:
    - filesystem-external
```

Useful for environments where arbitrary local source loading is undesirable.

---

# 81. Network Access Policy

If security metadata identifies network behavior, Policy may define:

```text
external network access
→ review
```

This should use normalized factual metadata rather than Publisher-specific rules when possible.

---

# 82. Credential Requirement Policy

A Component requiring credentials may be treated specially.

Example:

```text
requires credentials
→ review
```

Policy should not access actual secrets.

It evaluates only metadata.

---

# 83. Filesystem Write Policy

Future:

```text
filesystem write
→ review
```

may be useful for highly restrictive environments.

Again, security fact belongs to Component metadata.

---

# 84. Process Execution Policy

Possible rule:

```text
spawns process
→ review
```

This is more precise than denying all Commands categorically.

---

# 85. Target-Specific Policy

A Policy may need Target-aware behavior.

Example:

```text
hook support in Claude Code
```

has a specific runtime risk model.

However, Target-specific Policy should remain minimal.

Prefer normalized security properties where possible.

---

# 86. Policy and Target Compatibility

Policy answers:

```text
may we use it?
```

Target compatibility answers:

```text
can this Target support it?
```

These are independent hard filters.

Both must pass.

---

# 87. Policy and Catalog Priority

Catalog priority:

```text
default implementation preference
```

Policy:

```text
governance
```

Example:

```text
Candidate A
priority: 100
trust: community

Candidate B
priority: 80
trust: curated
```

Strict Policy:

```text
community denied
```

Result:

```text
A rejected

B eligible
```

---

# 88. Policy and Cardinality

Policy filtering happens before cardinality selection.

Example:

```text
engineering.testing.tdd
cardinality: one

3 candidates
↓
Policy rejects 2
↓
1 eligible
↓
selected
```

---

# 89. Policy and `cardinality: many`

For a `many` Capability, only Policy-eligible candidates may participate.

Policy may reduce:

```text
5 candidates
```

to:

```text
2 eligible
```

Then normal `many` semantics apply.

---

# 90. Policy and Package Installation

A Package can be required by several Components.

If any required Component is denied, that Component cannot become active.

However, the same Package may still be installed because another allowed Component requires it.

Therefore:

```text
Package installed
≠
all Package Components approved
```

---

# 91. Policy Must Evaluate Active Components

Policy governs:

```text
Components entering resolved active/dependency state
```

not every dormant Component physically present inside a Package.

However, a strict future Policy may govern Package-level risk when mere installation has side effects.

---

# 92. Package-Level Risk

If Package installation itself executes scripts or creates side effects, this should be modeled as Package security metadata.

Policy can then reject or require review before installation.

This is separate from Component activation.

---

# 93. Publisher-Level Risk

Blocking an entire Publisher is appropriate when:

```text
organization forbids source

Publisher trust is revoked

supply-chain incident occurs
```

Do not duplicate per-Component deny rules if Publisher-level denial expresses the real constraint.

---

# 94. Trust Revocation

If a Publisher changes from:

```text
curated
```

to:

```text
untrusted
```

an existing Project Lock must be revalidated.

If current Policy does not allow `untrusted`:

```text
locked implementation becomes invalid
```

---

# 95. Existing Lock Policy Revalidation

Normal sync always re-evaluates locked implementations against current hard Policy constraints.

Lock stability never exempts Policy.

---

# 96. Policy Change Detection

Project Lock Resolution input digest should include normalized effective Policy content.

Therefore:

```text
same Policy ID
+
changed Policy content
```

can still invalidate or stale the lock.

---

# 97. Policy Preference Change

A Policy preference change alone should not necessarily make a currently allowed lock stale.

Example:

```text
previous:
prefer curated

new:
prefer official

locked Candidate:
curated and allowed
```

Normal sync may preserve lock.

Explicit update may reconsider preference.

---

# 98. Policy Hard Rule Change

Hard eligibility change should invalidate affected lock state.

Example:

```text
community
allowed → denied
```

Existing community implementation must be reconsidered.

---

# 99. Policy Rule Matching

Rules should match canonical normalized fields.

Examples:

```text
Publisher ID

Package ref

Component ref

Component type

trust level

ownership

lifecycle

security facts
```

Avoid matching unstructured descriptions.

---

# 100. Pattern Matching

V1 should avoid arbitrary regex-based Policy unless real needs emerge.

Prefer exact IDs and enumerated categories.

This reduces ambiguity.

---

# 101. Namespace Rules

Future Policy may support Capability namespace constraints.

Example:

```text
security.*
```

But wildcard semantics add complexity.

Not required for V1.

---

# 102. Policy Inheritance

Avoid deep Policy inheritance.

Do not begin with:

```text
enterprise-strict
extends strict
extends default
```

If reuse becomes necessary, consider:

```text
Policy fragments
```

or a shallow composition model later.

V1 should use standalone explicit Policies.

---

# 103. No Policy Scripts

Policies must never depend on:

```text
shell commands

JavaScript callbacks

LLM judgments

remote arbitrary webhooks
```

for core Resolution.

Those mechanisms would undermine reproducibility.

---

# 104. No LLM Policy Decisions

Core decisions such as:

```text
trusted enough?

security-sensitive?

allowed?
```

must not be delegated dynamically to an LLM.

AI may assist maintainers during curation, but canonical metadata and Policy remain deterministic.

---

# 105. No Popularity-Based Automatic Trust

Do not implement:

```text
GitHub stars > 10000
→ curated
```

Trust remains explicit human curation.

---

# 106. Policy Validation

Validate:

```text
Policy ID syntax

valid trust values

valid outcomes

valid Publisher refs

valid Package refs

valid Component refs

valid lifecycle outcomes

no duplicate references
```

---

# 107. Unknown Publisher in Policy

Example:

```yaml
publishers:
  deny:
    - does-not-exist
```

Recommended:

```text
UNKNOWN_PUBLISHER
```

unless Policy intentionally supports future/unavailable references.

V1 should require valid references.

---

# 108. Unknown Package in Policy

Fail:

```text
UNKNOWN_PACKAGE
```

for invalid exact Package refs.

---

# 109. Unknown Component in Policy

Fail:

```text
UNKNOWN_COMPONENT
```

for exact Component rules that do not resolve.

This catches stale Policy after Publisher updates.

---

# 110. Invalid Outcome

Example:

```yaml
hook: maybe
```

must fail schema validation.

Allowed:

```text
allow
deny
review
prompt
```

---

# 111. Contradictory Rules

Example:

```yaml
publishers:
  allow:
    - superpowers

  deny:
    - superpowers
```

Recommended:

```text
POLICY_CONTRADICTION
```

rather than silently defining precedence.

This keeps Policies understandable.

---

# 112. Trust Contradiction

If:

```text
allowed trust:
- curated
```

but Publisher-specific rules explicitly allow a `community` Publisher, V1 should not use this as an exemption.

Trust hard constraint remains active.

If exceptions are needed later, define them explicitly rather than accidentally.

---

# 113. Default-Deny vs Default-Allow

Trust policy should usually use explicit allowed trust levels.

For Publisher/Package/Component exact rules:

```text
not mentioned
→ no additional restriction
```

unless an explicit allowlist is present.

---

# 114. Publisher Allowlist Semantics

If:

```yaml
publishers:
  allow:
    - anthropic
    - superpowers
```

then every other Publisher is denied.

This should be obvious from schema/docs.

---

# 115. Empty Allowlist

An explicit:

```yaml
publishers:
  allow: []
```

would mean:

```text
allow no Publishers
```

which is probably not intended.

Recommended schema:

```text
non-empty allowlist if field is present
```

---

# 116. Empty Deny List

Valid but unnecessary:

```yaml
deny: []
```

Generators may omit empty structures.

---

# 117. Policy Defaults

Missing sections should have documented neutral defaults.

Example:

```text
publishers missing
→ no Publisher-specific restriction

packages missing
→ no Package-specific restriction

components missing
→ no Component-specific restriction

preferences missing
→ no Policy preference
```

Trust may be required explicitly to avoid accidental overly permissive behavior.

---

# 118. Recommended Trust Requirement

V1 Policy should require:

```yaml
trust:
  allowed: [...]
```

rather than silently choosing allowed trust levels.

The built-in `default` Policy can supply the standard behavior.

---

# 119. Policy Normalization

Raw YAML:

```text
Policy Manifest
```

becomes:

```text
Schema Validate
↓
Reference Validate
↓
Normalize Defaults
↓
Policy Domain Object
```

Resolver consumes normalized Policy.

---

# 120. Effective Policy

V1 has one selected Policy.

Therefore:

```text
Effective Policy
=
selected Policy
```

Future organization/team overlays may require Policy composition.

Do not implement this until required.

---

# 121. Project-Specific Policy Overrides

V1 should not allow arbitrary inline Project policy overrides.

Avoid:

```yaml
policy:
  base: strict
  overrides:
    hook: allow
```

Prefer selecting a named Policy.

This improves governance and reviewability.

---

# 122. Why Avoid Inline Policy Overrides

Inline overrides create:

```text
per-project drift

harder review

policy duplication

unclear ownership
```

For exceptional Projects, define a separate explicit Policy.

---

# 123. Policy Explainability

`ap explain` should show relevant Policy decisions.

Example:

```text
Candidate:
Publisher X / TDD

Policy:
strict

Trust:
community

Decision:
rejected

Reason:
community trust level is not allowed
```

---

# 124. Policy Listing

Future:

```bash
ap list policies
```

may show:

```text
default
personal
strict
```

with concise summaries.

---

# 125. Policy Inspection

Future:

```bash
ap policy show strict
```

could render normalized Policy semantics.

Exact CLI belongs in `cli-spec.md`.

---

# 126. Policy Diff

Policy changes can affect many Projects.

Future semantic diff should show:

```text
trust community:
allow → deny

hooks:
prompt → review
```

This supports governance review.

---

# 127. Policy Impact Analysis

Given a Policy change:

```text
Policy
↓
Affected Candidates
↓
Capabilities
↓
Profiles / Projects
```

Generated indexes may later support this.

---

# 128. Security-Sensitive Change Detection

When a Publisher update introduces:

```text
new Hook

new MCP

new executable Command
```

the Catalog update process should expose these facts.

Policy determines how Projects treat them.

---

# 129. Policy Does Not Replace Security Review

Policy can enforce governance rules.

It cannot prove arbitrary third-party code is safe.

The system does not provide a full sandbox.

---

# 130. Policy Does Not Replace OS Security

Policy is not:

```text
container isolation

filesystem sandboxing

network sandboxing

endpoint security
```

It is a deterministic decision layer before materialization.

---

# 131. Policy Does Not Replace Target Permissions

If a Target runtime has its own permission system:

```text
Target Adapter
```

should preserve and use it where practical.

Policy and runtime permission controls can complement each other.

---

# 132. Policy Decision Cache

Policy evaluation is deterministic and generally cheap.

V1 does not need a persistent Policy decision cache.

In-memory reuse during one Resolution is sufficient.

---

# 133. Stable Policy Decisions

Same:

```text
Candidate metadata
+
Policy
+
relevant Target context
```

must produce the same Policy Decision.

---

# 134. Policy Determinism

Policy evaluation must not depend on:

```text
current time

remote popularity metrics

LLM interpretation

random values

interactive state
```

Approval state, if later introduced, must be explicit Resolution input.

---

# 135. Policy and Resolution Input Digest

Effective normalized Policy must contribute to:

```text
resolutionInputDigest
```

used by Project Lock validation.

---

# 136. Policy and Lockfile

Project Lock need not duplicate the complete Policy.

It should record:

```text
Policy identity

Resolution input digest
```

and optionally:

```text
Policy digest
```

for diagnostics.

---

# 137. Policy Digest

A deterministic Policy digest may be computed from normalized Policy content.

Conceptually:

```text
policyDigest =
sha256(canonical normalized policy)
```

Useful for:

```text
lock drift

audit

debugging
```

---

# 138. Policy Change Without ID Change

Example:

```text
strict.yaml
```

keeps ID:

```text
strict
```

but changes trust rules.

Policy digest changes.

Existing Project Lock must be revalidated.

---

# 139. Built-In Policies

Recommended initial Policies:

```text
default

personal

strict
```

`enterprise` may be included as an example/future posture but should not require enterprise infrastructure.

---

# 140. Default Policy Goals

`default` should aim for:

```text
reasonable safety

good usability

curated/community interoperability

review for security-sensitive behavior
```

It should not silently allow everything.

---

# 141. Personal Policy Goals

`personal` may allow more experimentation.

Example:

```text
community allowed

experimental prompt/review

MCP prompt
```

but should still avoid automatic trust.

---

# 142. Strict Policy Goals

`strict` should emphasize:

```text
trusted sources

restricted executable behavior

no experimental Components

explicit review
```

Useful for work or controlled environments.

---

# 143. Enterprise Policy Goals

Future:

```text
approved Publisher allowlist

no community

no interactive prompt

organization-approved executable Components

integrity requirements

possibly signature requirements
```

---

# 144. Example — Trust Filtering

Candidates:

```text
A
trust: community
priority: 100

B
trust: curated
priority: 80
```

Policy:

```text
allowed:
first-party
official
curated
```

Evaluation:

```text
A → deny

B → allow
```

Resolver:

```text
B → selected
```

---

# 145. Example — Security Review

Candidate:

```text
trust: curated

type: hook
```

Policy:

```text
hook → review
```

Interactive mode:

```text
approval required
```

CI:

```text
fail until explicit approval mechanism exists
```

---

# 146. Example — Publisher Denial

Candidate:

```text
Publisher:
publisher-x

Trust:
curated
```

Policy:

```text
publisher-x → deny
```

Result:

```text
Candidate rejected
```

Publisher-specific denial is stronger than trust eligibility.

---

# 147. Example — Existing Lock Invalidated

Existing lock:

```text
TDD → Community Publisher
```

Old Policy:

```text
community allowed
```

New Policy:

```text
community denied
```

Result:

```text
existing lock cannot be preserved
```

Resolver searches other eligible Candidates.

---

# 148. Example — Existing Lock Preserved Despite Preference

Existing lock:

```text
TDD → curated Candidate
```

New Policy preference:

```text
prefer official
```

Both remain allowed.

Normal sync:

```text
preserve current lock
```

Explicit update:

```text
official Candidate may become preferred
```

---

# 149. Example — Explicit Override Denied

Project:

```text
TDD → Candidate X
```

Policy:

```text
Candidate X Publisher denied
```

Result:

```text
resolution fails
```

Do not silently select Candidate Y.

---

# 150. Example — Transitive MCP Denial

Selected candidate:

```text
research-skill
```

requires:

```text
external MCP
```

Policy:

```text
MCP → deny
```

Result:

```text
research-skill candidate rejected
```

because its required dependency cannot satisfy Policy.

---

# 151. Example — Package Still Installed

Package X contains:

```text
allowed planning skill

denied hook
```

Planning skill is selected.

If the Package can be installed without activating the Hook:

```text
Package X may still be installed
Hook remains inactive
```

If Package installation automatically executes the Hook:

```text
Package-level security metadata must cause Policy evaluation
```

This distinction is Target/Package dependent.

---

# 152. Policy Rule Categories

Recommended categories:

```text
trust

publishers

packages

components

component types

lifecycle

security

preferences
```

Avoid adding fields until a real governance use case exists.

---

# 153. Policy Schema Concept

Conceptually:

```yaml
apiVersion: agent-plugins.dev/v1alpha1
kind: Policy

metadata:
  id: strict
  name: Strict

spec:
  trust:
    allowed:
      - first-party
      - official
      - curated

  publishers:
    allow: []
    deny: []

  packages:
    allow: []
    deny: []

  components:
    allow: []
    deny: []

    types:
      hook: review
      mcp: review

  lifecycle:
    experimental: deny
    deprecated: review

  security:
    network-access: review
    requires-credentials: review

  preferences:
    trust:
      - first-party
      - official
      - curated

    publishers: []
```

The final V1 schema may omit unused fields.

---

# 154. Recommended Minimal V1 Schema

To avoid premature complexity, initial V1 may support only:

```text
trust.allowed

publishers.deny

packages.deny

components.deny

components.types

lifecycle.experimental

lifecycle.deprecated

preferences.trust

preferences.publishers
```

Add richer security facts once real Component metadata supports them.

---

# 155. Why Start Narrow

Policy systems become complex quickly.

V1 should validate the core distinction:

```text
eligibility
vs
preference
```

before becoming a general security policy language.

---

# 156. Policy Schema Location

Recommended:

```text
packages/schemas/schemas/policy.schema.json
```

or versioned:

```text
packages/schemas/schemas/v1alpha1/policy.schema.json
```

---

# 157. Policy Implementation Location

Recommended:

```text
packages/core/src/policy/
```

Possible modules:

```text
evaluate.ts

trust.ts

publishers.ts

components.ts

lifecycle.ts

preferences.ts

types.ts
```

Exact source layout is not normative.

---

# 158. Policy Evaluator Contract

Conceptually:

```ts
interface PolicyEvaluator {
  evaluate(
    candidate: Candidate,
    policy: Policy,
    context: PolicyContext
  ): PolicyDecision
}
```

The function should be deterministic.

---

# 159. Policy Context

Possible normalized context:

```text
Target

resolution mode

dependency role
```

Avoid including unrelated Project state unless required.

---

# 160. Candidate vs Dependency Policy

Both direct Candidate Components and transitive dependency Components must be evaluated.

The evaluator may receive:

```text
role:
selected
dependency
```

if Policies eventually distinguish them.

V1 should normally apply the same hard security constraints.

---

# 161. Policy Preference Contract

Policy evaluation may output:

```text
preference rank
```

separate from:

```text
eligibility outcome
```

Example:

```text
decision:
allow

preference:
trustRank: 2
publisherRank: 1
```

Resolver combines this deterministically.

---

# 162. Do Not Use One Magic Policy Score

Avoid:

```text
policyScore: 87
```

for all governance dimensions.

Prefer explicit ordered preference dimensions.

This improves explainability.

---

# 163. Preference Tuple

Conceptually:

```text
PolicyPreference

trustRank
publisherRank
```

Resolver may compare them lexicographically in a documented order.

---

# 164. Policy Explain Output

Example:

```text
Policy:
strict

Candidate:
superpowers/superpowers#skill:test-driven-development

Ownership:
third-party

Trust:
curated

Component Type:
skill

Result:
allowed

Preference:
curated rank 3
```

---

# 165. Policy Rejection Output

Example:

```text
Candidate:
community-x/package#agent:tdd

Policy:
strict

Result:
rejected

Reason:
trust level "community" is not in allowed trust levels
```

---

# 166. Policy Approval Output

Example:

```text
Candidate:
publisher/package#mcp:github

Policy:
default

Result:
approval required

Reason:
third-party MCP Components require confirmation
```

---

# 167. Policy Diagnostic Codes

Recommended initial codes:

```text
UNKNOWN_POLICY

INVALID_POLICY

POLICY_CONTRADICTION

POLICY_DENIED

POLICY_APPROVAL_REQUIRED

POLICY_PUBLISHER_DENIED

POLICY_PACKAGE_DENIED

POLICY_COMPONENT_DENIED

POLICY_TRUST_DENIED

POLICY_COMPONENT_TYPE_RESTRICTED

POLICY_EXPERIMENTAL_DENIED

POLICY_DEPRECATED_REVIEW

POLICY_NON_INTERACTIVE_APPROVAL_REQUIRED
```

Exact code set may be simplified.

---

# 168. Diagnostic Requirements

Diagnostics should identify:

```text
Policy ID

Candidate

matched rule

effective metadata

outcome

dependency path
```

where applicable.

---

# 169. Dependency Path Example

```text
Candidate denied:

publisher/package#mcp:external

Required by:
security-review-agent
→ security.review
→ engineering/security
→ backend-engineer
```

This is far more useful than:

```text
MCP denied
```

alone.

---

# 170. Policy Validation Warnings

Potential warnings:

```text
Policy allows no trust levels

Publisher allowlist makes all current Capabilities unresolvable

Preference references denied trust level

deprecated outcome configured but no deprecated implementations exist
```

Not all warnings should block Policy loading.

---

# 171. Policy Reachability Validation

Advanced validation may simulate representative Profiles against a Policy.

Example:

```text
strict Policy
+
frontend-engineer
```

should ideally resolve.

This belongs to integration tests, not Policy schema validation.

---

# 172. Policy Unit Tests

Test:

```text
allowed trust

denied trust

Publisher denial

Package denial

Component denial

Component type review

experimental denial

deprecated review

preference ordering

multiple rule outcome combination

non-interactive behavior
```

---

# 173. Resolver Integration Tests

Test scenarios:

```text
high-priority Candidate rejected by Policy

next eligible Candidate selected

existing lock invalidated by Policy

existing lock preserved when only preference changes

explicit override denied by Policy

transitive dependency denied

cardinality-many filtered by Policy
```

---

# 174. Property Tests

Useful invariants:

```text
denied Candidate is never selected

Policy preference never makes a denied Candidate eligible

explicit override never bypasses denial

transitive dependency cannot bypass Policy

same Candidate + Policy produces same decision
```

---

# 175. Policy Migration

Schema evolution may require:

```text
v1alpha1
→ v1beta1
```

Migration must preserve effective governance semantics where practical.

---

# 176. Policy API Stability

Changing semantics of:

```text
deny
review
prompt
allow
```

would be highly breaking.

These core meanings should stabilize early.

---

# 177. Trust Model Stability

Trust categories should also evolve conservatively.

If future needs require more nuance, prefer:

```text
additional factual metadata
```

over endlessly adding trust levels.

---

# 178. Trust Is Coarse Governance

Trust levels intentionally provide a coarse baseline.

Fine-grained security behavior belongs to:

```text
Component metadata
+
security Policy rules
```

This prevents trust taxonomy explosion.

---

# 179. Policy Anti-Pattern — Profile as Policy

Avoid:

```text
strict-backend-engineer
secure-frontend-engineer
```

Profiles define role.

Policies define governance.

Compose:

```text
backend-engineer
+
strict
```

---

# 180. Policy Anti-Pattern — Publisher Preference as Capability Mapping

Avoid hardcoding:

```text
TDD always uses Superpowers
```

inside Policy.

That belongs to:

```text
Catalog priority
```

or explicit Project override.

Policy may prefer Publisher classes, but should not become another semantic mapping layer.

---

# 181. Policy Anti-Pattern — Inline Project Rules

Avoid many Projects each defining:

```text
allow this Publisher
deny this hook
```

inline.

Prefer shared named Policies.

---

# 182. Policy Anti-Pattern — Arbitrary Scripts

Never use custom executable Policy callbacks in core Resolution.

---

# 183. Policy Anti-Pattern — Trust Equals Popularity

Do not use stars, downloads, or popularity directly as trust.

---

# 184. Policy Anti-Pattern — Trust Equals Ownership

Do not assume:

```text
third-party
→ community
```

or:

```text
first-party
→ universally safe
```

Ownership and security are separate concerns.

---

# 185. Policy Anti-Pattern — Lock Beats Policy

Incorrect:

```text
locked before
→ always allowed
```

Correct:

```text
locked before
→ preferred only if still policy-valid
```

---

# 186. Policy Anti-Pattern — Prompt in Core Resolver

Core Resolver must never pause for terminal input.

It returns a structured decision.

---

# 187. Policy Anti-Pattern — Silent Approval

Do not transform:

```text
review
```

into:

```text
allow
```

silently.

Approval must be explicit.

---

# 188. Policy Anti-Pattern — Policy as Sandbox

Policy cannot prevent arbitrary code from misbehaving after execution.

It governs whether Components are allowed to enter Resolution.

---

# 189. Policy Invariants

The Policy system must preserve:

```text
1. Policy governs eligibility and preference, not Capability semantics.

2. Policy evaluation is deterministic.

3. Policy denial is a hard constraint.

4. Denied Candidates are never selected.

5. Explicit Project overrides cannot bypass denial.

6. Existing locks cannot bypass denial.

7. Target compatibility remains independent from Policy.

8. Trust and ownership are separate concepts.

9. Trust is not a universal quality score.

10. Security-sensitive transitive dependencies are evaluated.

11. Review and prompt do not silently become allow.

12. Non-interactive mode never waits for user approval.

13. Policy preference applies only among eligible Candidates.

14. Policy does not mutate Catalog metadata.

15. Policy does not mutate Project intent.

16. Policy manifests remain declarative.

17. Policy does not require an LLM.

18. Policy does not execute arbitrary code.

19. Policy content contributes to Resolution reproducibility.

20. Runtime security remains separate from Policy governance.
```

---

# 190. V1 Required Policy Features

V1 should support:

```text
named Policies

allowed trust levels

Publisher denial

Package denial

Component denial

Component type rules

experimental lifecycle rule

deprecated lifecycle rule

trust preference

Publisher preference

structured Policy decisions

non-interactive failure for unresolved approval
```

---

# 191. V1 May Defer

V1 may defer:

```text
organization Policy inheritance

persisted approvals

signature requirements

complex security-fact expressions

regex matching

Capability namespace rules

time-based rules

remote policy server

RBAC

policy-as-code scripting

full audit trail
```

---

# 192. V1 Acceptance Criteria

Policy V1 is ready when:

```text
strict can reject community Candidate

default can allow community Candidate

Policy can reject a specific Publisher

Policy can reject a specific Component

hook/MCP can require review or prompt

CI fails safely for unresolved approval

high-priority denied Candidate never wins

next eligible Candidate can be selected

explicit override denied by Policy fails

existing lock denied by new Policy is invalidated

transitive security-sensitive dependency is evaluated

Policy preferences affect update/fresh selection without overriding hard constraints
```

---

# 193. Evaluation Summary

For each Candidate:

```text
Candidate
   ↓
Publisher / Package / Component explicit restrictions
   ↓
Trust
   ↓
Lifecycle
   ↓
Security-sensitive rules
   ↓
Component-type rules
   ↓
Approval requirements
   ↓
Policy Outcome
   ↓
Preference Metadata
```

The Resolver then consumes:

```text
eligible Candidate
+
Policy preference
```

alongside its other preference layers.

---

# 194. Policy Mental Model

The shortest useful mental model is:

```text
Capability asks:
"What do I need?"

Catalog asks:
"What can provide it?"

Policy asks:
"What am I willing to use?"

Resolver asks:
"Which allowed option should win?"
```

---

# 195. Policy in One Sentence

> **A Policy is a deterministic, declarative governance layer that filters Candidate implementations by trust, provenance, lifecycle, and security characteristics, optionally expresses preferences among allowed Candidates, and never allows implementation priority, project overrides, or existing locks to bypass hard restrictions.**