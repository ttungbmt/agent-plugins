# Contributing

Thank you for contributing to Agent Plugins.

Agent Plugins is designed as a tool-neutral capability management platform for AI agent ecosystems. Contributions should preserve the project's core architectural properties:

```text
canonical semantics
+
deterministic resolution
+
reproducible builds
+
target portability
+
explicit trust
+
safe automation
```

This document explains how to contribute code, content, adapters, documentation, tests, and architectural changes.

---

# 1. Before You Contribute

Please understand the core architecture before making structural changes.

Recommended reading order:

```text
README.md

docs/problem.md
docs/vision.md
docs/goals.md
docs/non-goals.md

docs/architecture.md
docs/domain-model.md
docs/capability-model.md
docs/source-of-truth.md

docs/specs/manifest-spec.md
docs/specs/catalog-spec.md
docs/specs/resolution-spec.md
docs/specs/policy-spec.md
docs/specs/lockfile-spec.md
docs/specs/adapter-spec.md
docs/specs/cli-spec.md

docs/security-model.md
docs/trust-model.md
docs/testing-strategy.md
```

You do not need to read every document for a small typo or documentation fix.

For changes affecting architecture, domain semantics, resolution, adapters, security, trust, configuration, or compatibility, reading the relevant specifications is required.

---

# 2. Core Contribution Principles

All contributions should follow these rules.

## 2.1 Canonical First

The canonical model is the source of semantic truth.

Do not design features around one specific runtime.

Avoid:

```text
Claude-specific concepts
inside
canonical package definitions
```

Prefer:

```text
Canonical capability
        ↓
Target Adapter
        ↓
Claude representation
```

---

## 2.2 Thin Interfaces, Rich Core

CLI, TUI, IDE integrations, and future UIs are clients of the application/core layer.

Do not place business logic directly inside command handlers.

Preferred:

```text
CLI
 ↓
Application Service
 ↓
Core
```

Avoid:

```text
CLI command
 ↓
resolver logic
 ↓
filesystem mutation
```

---

## 2.3 Resolution Before Rendering

Target adapters consume an already-resolved canonical environment.

Adapters MUST NOT perform hidden dependency resolution.

---

## 2.4 No Hidden Execution

Package discovery, validation, resolution, build, and installation MUST NOT execute arbitrary package-provided code.

Packages are primarily declarative data.

---

## 2.5 Determinism

Equivalent inputs must produce equivalent outputs.

Avoid introducing output dependencies on:

```text
filesystem enumeration order
current time
machine hostname
absolute local paths
random values
network state
```

unless explicitly required.

---

## 2.6 Explicit Over Magical

Prefer explicit behavior for:

```text
updates
trust
sources
policy
filesystem mutation
target mappings
```

Avoid hidden side effects.

---

## 2.7 Preserve Explainability

Users should be able to understand:

```text
why a package exists
where it came from
which Profile selected it
which policy affected it
which adapter rendered it
which files changed
```

New features should preserve or improve this property.

---

# 3. Types of Contributions

Contributions generally fall into these categories:

```text
Core

Schemas

Catalog

Resolver

Policy

Trust

Lockfile

Adapters

CLI

First-party content

Vendor integrations

Tests

Documentation

Tooling
```

Different categories have different requirements.

---

# 4. Repository Structure

The exact structure may evolve, but contributors should expect boundaries similar to:

```text
packages/
├── core/
├── schemas/
├── catalog/
├── resolver/
├── policy/
├── lockfile/
├── adapter-kit/
├── adapters/
├── application/
├── cli/
└── test-kit/

first-party/
vendor/
overlays/

profiles/
presets/

docs/
tests/
```

See:

```text
docs/repository-structure.md
```

for the authoritative structure.

---

# 5. Development Setup

## Requirements

Use the repository-defined runtime and package manager versions.

Check:

```text
package.json
mise.toml
.tool-versions
.nvmrc
```

or equivalent files if present.

Do not assume a globally installed version is compatible.

---

# 6. Install Dependencies

Typical workflow:

```bash
pnpm install
```

Use the package manager configured by the repository.

Do not regenerate the package-manager lockfile using another package manager.

---

# 7. Verify the Environment

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All checks should pass before starting significant changes.

---

# 8. Recommended Development Loop

A normal development cycle is:

```text
understand specification
        ↓
write or update tests
        ↓
implement smallest coherent change
        ↓
run focused tests
        ↓
run affected integration tests
        ↓
update documentation
        ↓
run full required checks
```

For architectural work:

```text
spec
→ tests
→ implementation
```

is strongly preferred.

---

# 9. Branches

Use short-lived feature branches.

Recommended names:

```text
feat/resolver-explain

feat/claude-adapter

fix/path-traversal

docs/trust-model

test/adapter-conformance

refactor/catalog-index
```

Avoid vague names such as:

```text
changes
update
work
test2
```

---

# 10. Commit Style

Keep commits focused.

Recommended style:

```text
feat(resolver): add resolution provenance

fix(adapter): reject target path traversal

docs(trust): clarify revision-level trust

test(policy): cover transitive trust denial

refactor(core): separate canonical identifiers
```

Conventional Commits are recommended if the repository adopts them.

---

# 11. Small Commits

Prefer commits that represent one coherent change.

Good:

```text
add canonical reference parser
add parser tests
```

Avoid mixing:

```text
resolver rewrite
CLI colors
README changes
dependency upgrade
```

in one commit unless they are inseparable.

---

# 12. Pull Requests

A pull request should explain:

```text
what changed

why it changed

which architectural area is affected

how it was tested

whether compatibility changes exist

whether security/trust implications exist
```

Keep descriptions concise but complete.

---

# 13. Pull Request Checklist

Before requesting review:

```text
[ ] Code builds

[ ] Lint passes

[ ] Typecheck passes

[ ] Relevant unit tests pass

[ ] Relevant integration tests pass

[ ] Security tests pass if applicable

[ ] Golden fixtures reviewed if changed

[ ] Documentation updated

[ ] No unrelated changes included

[ ] No secrets committed

[ ] Compatibility impact considered
```

---

# 14. Spec-First Changes

A specification update is required before or together with implementation when changing:

```text
canonical domain semantics

manifest format

resolution behavior

policy semantics

trust semantics

lockfile format

adapter contract

CLI machine interface

configuration format

update semantics
```

Do not introduce architectural behavior solely through implementation.

---

# 15. Architecture Decision Rule

If a change affects more than one major subsystem, first determine whether an architecture/spec update is needed.

Examples:

```text
new dependency semantics
→ resolution-spec.md

new trust level
→ trust-model.md

new adapter capability state
→ adapter-spec.md

new CLI JSON contract
→ cli-spec.md

new source trust rule
→ trust-model.md + source-spec.md
```

---

# 16. Core Domain Contributions

Changes to canonical domain types require extra care.

Core MUST remain:

```text
runtime-neutral
filesystem-neutral
CLI-neutral
source-neutral
```

Do not add fields such as:

```yaml
claudeCommandPath:
codexAgentFile:
geminiMode:
```

to canonical domain types.

Target-specific representation belongs in adapters.

---

# 17. Canonical IDs

All domain entities should use canonical identifiers where applicable.

Examples:

```text
plugin:superpowers
skill:typescript
agent:reviewer
prompt:research
preset:frontend-core
profile:frontend
```

Do not use filesystem paths as entity identity.

---

# 18. Schema Contributions

Every schema change requires:

```text
schema update

valid fixture

invalid fixture

parser test

validation diagnostics

compatibility review
```

Breaking schema changes may require:

```text
schema version bump
migration
release note
```

---

# 19. Manifest Contributions

Manifest changes must remain declarative.

Avoid executable configuration such as:

```js
export default function configure() {}
```

Canonical manifests should use safe data formats such as:

```text
YAML
JSON
```

as defined by project specifications.

---

# 20. Catalog Contributions

Catalog behavior must remain deterministic.

Adding catalog features MUST NOT change resolution behavior implicitly.

For example:

```text
search ranking
```

must not become:

```text
publisher resolution ranking
```

without an explicit resolver specification.

---

# 21. Resolver Contributions

The resolver is a critical subsystem.

Resolver changes MUST include tests for:

```text
direct dependency behavior

transitive dependencies

deduplication

conflicts

cycles

stable ordering

explainability
```

Where relevant, also test different input orderings.

---

# 22. Resolver Restrictions

The resolver MUST NOT:

```text
access the network

render target files

write project files

execute package content

invoke target adapters
```

It computes canonical effective state.

---

# 23. Resolver Explainability

When adding new resolution behavior, also consider how the decision is explained.

A resolution rule that cannot explain:

```text
why this component was selected
```

is incomplete.

---

# 24. Policy Contributions

Policy rules must be:

```text
deterministic
explicit
machine-readable
explainable
```

Every deny result SHOULD identify:

```text
matching policy
rule
subject
reason
```

Policy MUST remain authoritative over adapters and CLI convenience commands.

---

# 25. Trust Contributions

Trust is evidence and confidence.

It is NOT:

```text
permission
risk
quality
popularity
```

Do not introduce implicit trust based on:

```text
GitHub stars
download count
README claims
package self-declaration
```

Trust changes should preserve evidence and explainability.

---

# 26. Security Contributions

Security-sensitive changes require dedicated regression tests.

Security-sensitive areas include:

```text
path handling
filesystem mutation
source fetching
archives
symlinks
overlays
object merging
integrity
secrets
shell execution
trust
policy
```

If fixing a security bug, add a test that reproduces the bug.

---

# 27. Lockfile Contributions

Lockfile output must remain deterministic.

Changes affecting lockfile structure require:

```text
schema update

round-trip tests

determinism tests

compatibility review
```

Do not include machine-specific or volatile values unless explicitly required.

---

# 28. Target Adapter Contributions

Target adapters convert:

```text
Resolved Canonical Environment
        ↓
Target-Native Representation
```

They do not redefine canonical semantics.

A Target Adapter MUST:

```text
declare capabilities

validate input

produce a Render Plan

render deterministically

detect collisions

respect Policy

remain inside approved target roots
```

---

# 29. Adding a Target Adapter

A new Target Adapter should normally live under:

```text
packages/adapters/target/<target>/
```

or the repository-defined equivalent.

Required components:

```text
adapter manifest

capability declaration

validation

planning

rendering

tests

golden fixtures
```

---

# 30. Adapter Conformance

Every production adapter MUST pass the shared conformance suite.

Expected checks include:

```text
metadata

capabilities

determinism

path safety

collision detection

unsupported feature handling
```

Do not create target-specific exceptions to core adapter contracts without architectural review.

---

# 31. Target-Native Design

Adapters should use native target semantics where practical.

Avoid flattening everything into generic Markdown solely for portability.

Correct model:

```text
Canonical semantics
      ↓
Target-specific mapping
      ↓
Native output
```

---

# 32. Unsupported Features

Target adapters MUST NOT silently drop meaningful unsupported capabilities.

Use:

```text
native

mapped

emulated

unsupported
```

and emit appropriate diagnostics.

---

# 33. Source Adapter Contributions

Source adapters convert external content into canonical packages.

They MUST separate:

```text
discover

fetch

normalize

verify
```

Source adapters MUST preserve provenance.

---

# 34. Source Safety

Source adapters MUST NOT:

```text
execute repository hooks

run arbitrary package scripts

trust package self-declared trust level

extract archives outside controlled roots
```

External content is untrusted until validated.

---

# 35. First-Party Content Contributions

First-party content should optimize for:

```text
quality
clarity
reuse
target neutrality
composability
```

rather than quantity.

Avoid duplicating near-identical skills or agents.

Prefer reusable capabilities.

---

# 36. Content Placement

Before adding content, decide whether it is:

```text
Skill

Agent

Prompt

Command

Hook

Plugin

Preset

Profile
```

Use the domain model rather than choosing based on folder convenience.

---

# 37. Skills

A Skill should represent reusable expertise, workflow, or capability.

Good examples:

```text
typescript-best-practices

root-cause-analysis

product-discovery

technical-writing
```

Avoid overly broad catch-all skills.

---

# 38. Agents

An Agent should represent a meaningful role or specialized execution context.

Examples:

```text
code-reviewer

architecture-reviewer

product-researcher
```

Avoid creating an Agent when a Skill is sufficient.

---

# 39. Presets

Presets should be:

```text
small
composable
capability-oriented
target-neutral
```

Examples:

```text
typescript

testing

frontend-quality

mental-models
```

Avoid giant presets that attempt to represent an entire organization.

---

# 40. Profiles

Profiles describe effective user/project roles or environments.

Examples:

```text
frontend

backend

product-manager

second-brain
```

Profiles MAY compose multiple Presets and packages.

Avoid target-specific Profiles such as:

```text
frontend-claude
frontend-codex
```

unless the semantic environment genuinely differs.

---

# 41. Vendor Contributions

Vendor content represents curated upstream sources.

Contributors MUST preserve:

```text
upstream provenance

revision

integrity

license metadata where available
```

Do not directly modify vendored upstream content when an Overlay can express the change.

---

# 42. Overlay Contributions

Overlays change semantics.

Adapters change representation.

Keep this distinction strict:

```text
Overlay
    = what the content means

Adapter
    = how the content is rendered
```

Overlay behavior must remain deterministic and testable.

---

# 43. CLI Contributions

The CLI is an orchestration and presentation layer.

Command implementations SHOULD:

```text
parse input

call application service

present result
```

They SHOULD NOT implement domain rules directly.

---

# 44. CLI Command Design

Prefer:

```bash
agent-plugins build --target claude
```

over:

```bash
agent-plugins claude build
```

Targets are adapter parameters, not top-level domain categories.

---

# 45. CLI Machine Compatibility

Changes to:

```text
--json
exit codes
diagnostic codes
```

are API changes.

Treat them more carefully than human formatting changes.

---

# 46. CLI Output

Use:

```text
stdout
    result

stderr
    diagnostics
    logging
    progress
```

Do not corrupt JSON output with spinners, ANSI formatting, or prose.

---

# 47. Documentation Contributions

Documentation changes are welcome.

Use consistent terminology from:

```text
docs/terminology.md
```

Do not introduce new synonyms for established domain concepts without reason.

---

# 48. Documentation Style

Prefer:

```text
short sections

explicit terminology

concrete examples

ASCII diagrams where useful

normative MUST / SHOULD / MAY for specifications
```

Avoid unnecessary marketing language in technical specifications.

---

# 49. Normative Language

Specifications use:

```text
MUST
MUST NOT

SHOULD
SHOULD NOT

MAY
```

Use these deliberately.

`MUST` indicates architectural or behavioral requirements.

---

# 50. Code Style

Follow repository automation.

Do not manually fight the formatter.

Expected tools may include:

```text
Biome
TypeScript strict mode
```

Use explicit types at important public boundaries.

Avoid unnecessary type assertions.

---

# 51. TypeScript Guidelines

Prefer:

```text
unknown
```

over:

```text
any
```

at untrusted boundaries.

Validate external data before converting it into domain types.

Do not rely solely on compile-time types for:

```text
files
network responses
user input
manifests
configuration
```

---

# 52. Error Handling

Use structured diagnostics for expected domain/application failures.

Avoid using unstructured exceptions as normal control flow.

A diagnostic should generally contain:

```text
code
severity
message
context
suggestion where useful
```

---

# 53. Diagnostic Codes

Stable diagnostics should use clear namespaces.

Examples:

```text
MANIFEST_INVALID

RESOLVE_DEPENDENCY_CONFLICT

POLICY_DENIED

TRUST_LEVEL_TOO_LOW

ADAPTER_PATH_COLLISION

SEC_PATH_TRAVERSAL
```

Tests should generally assert codes rather than exact human wording.

---

# 54. Testing Requirements

Follow:

```text
docs/testing-strategy.md
```

A change should include the appropriate combination of:

```text
unit
integration
contract
golden
security
E2E
```

tests.

---

# 55. Test Location

Prefer package-local tests for package behavior.

Example:

```text
packages/resolver/test/
```

Use root-level tests for cross-system behavior:

```text
tests/integration/
tests/e2e/
tests/security/
```

---

# 56. Unit Tests

Use unit tests for pure behavior.

Examples:

```text
ID parsing

policy matching

graph algorithms

trust derivation

path normalization
```

---

# 57. Integration Tests

Use integration tests for boundaries such as:

```text
manifest → catalog

catalog → resolver

resolved graph → adapter

render plan → filesystem
```

---

# 58. Golden Tests

Target adapters should use golden fixtures.

Never update golden output blindly.

Review every diff.

---

# 59. Security Tests

Security bugs require regression tests.

Examples:

```text
path traversal

unknown file overwrite

trust escalation

policy bypass

prototype pollution

integrity mismatch
```

---

# 60. Test Determinism

Tests should not rely on:

```text
current time

public internet

machine-specific paths

random filesystem order
```

unless explicitly controlled.

---

# 61. Public Internet

Normal tests MUST NOT depend on public internet availability.

Use:

```text
local Git repositories

local HTTP fixtures

mock servers

fixture archives
```

Network smoke tests may exist separately.

---

# 62. Temporary Filesystems

Filesystem integration tests should use isolated temporary directories.

Never write test data into the contributor's actual project configuration or runtime directories.

---

# 63. No Real Secrets

Tests and examples MUST use fake credentials.

Never commit:

```text
API keys
tokens
SSH keys
private URLs with embedded credentials
```

---

# 64. Architectural Dependency Rules

Dependencies should flow inward.

Typical direction:

```text
CLI
 ↓
Application
 ↓
Domain/Core
```

Examples of forbidden coupling:

```text
core → cli

resolver → target adapter

domain → filesystem apply

target adapter → source adapter
```

Architecture tests may enforce these rules.

---

# 65. Dependency Additions

Before adding a dependency, ask:

```text
Is this necessary?

Can the standard library solve it?

Is it maintained?

Does it affect security-sensitive behavior?

Does it significantly increase package weight?
```

Be particularly cautious with dependencies handling:

```text
YAML

archives

Git

templates

process execution

filesystem paths
```

---

# 66. Dependency Upgrades

Dependency upgrades SHOULD be isolated when practical.

For significant upgrades, note:

```text
breaking behavior

security implications

runtime requirements
```

Avoid mixing major dependency upgrades into unrelated feature PRs.

---

# 67. Security Review Triggers

A change requires explicit security consideration if it adds or modifies:

```text
network access

process execution

filesystem write

archive extraction

symlinks

secrets

authentication

trust elevation

policy bypass

third-party executable code
```

---

# 68. Trust Review Triggers

Review trust semantics when changing:

```text
source identity

publisher handling

provenance

integrity

trust levels

trust precedence

revocation

dependency trust propagation
```

---

# 69. Compatibility Review

Consider compatibility when changing:

```text
manifest schemas

project configuration

lockfile

CLI flags

CLI JSON

diagnostic codes

Adapter API

Source Adapter API
```

Breaking stable interfaces require deliberate versioning.

---

# 70. Versioning

Follow:

```text
versioning-spec.md
```

once finalized.

Until then, avoid unnecessary breaking changes to established contracts.

---

# 71. Generated Files

Do not manually edit generated artifacts as source-of-truth content.

Generated files should be reproducible from canonical input.

If generated output is wrong:

```text
fix canonical source
or
fix adapter
```

rather than patching `dist/`.

---

# 72. Formatting Generated Output

Generated output SHOULD have deterministic:

```text
ordering
newline behavior
serialization
```

Do not introduce cosmetic randomness.

---

# 73. Filesystem Safety

All filesystem writes must originate from validated plans.

Avoid direct writes scattered through domain code.

Preferred:

```text
Resolved State
     ↓
Render Plan
     ↓
Validated Operations
     ↓
Filesystem Apply
```

---

# 74. File Ownership

Never assume a file belongs to Agent Plugins solely because it exists in a target directory.

Unknown files must be preserved or cause a safe collision failure.

---

# 75. Performance Changes

Do not optimize prematurely.

For performance work:

```text
measure
→ identify bottleneck
→ optimize
→ benchmark
```

Avoid architectural complexity solely for hypothetical speed.

---

# 76. Refactoring

Refactoring should preserve observable behavior unless explicitly stated otherwise.

For large refactors:

```text
existing tests should continue passing
```

before changing semantics.

---

# 77. Large Changes

For substantial changes, split work into:

```text
spec

foundational refactor

behavior change

migration

documentation
```

when practical.

This makes review safer.

---

# 78. Breaking Changes

Breaking changes require:

```text
clear motivation

affected contract

migration path

updated specification

updated tests

release note
```

Avoid breaking changes solely for cosmetic preferences.

---

# 79. New Feature Checklist

Before adding a feature, confirm:

```text
[ ] It fits project goals

[ ] It is not explicitly a non-goal

[ ] Correct architectural layer identified

[ ] Specification impact considered

[ ] Security impact considered

[ ] Trust impact considered

[ ] Determinism preserved

[ ] Tests planned

[ ] Documentation planned
```

---

# 80. New Adapter Checklist

```text
[ ] Adapter manifest

[ ] Capability declaration

[ ] Validation

[ ] Render Plan

[ ] Deterministic rendering

[ ] Conformance tests

[ ] Golden fixtures

[ ] Collision tests

[ ] Path-safety tests

[ ] Unsupported features documented
```

---

# 81. New Source Adapter Checklist

```text
[ ] Discover

[ ] Fetch

[ ] Normalize

[ ] Verify

[ ] Provenance

[ ] Immutable revision support

[ ] Integrity support

[ ] Offline behavior

[ ] Contract tests

[ ] Security tests
```

---

# 82. New First-Party Package Checklist

```text
[ ] Correct package/component type

[ ] Unique canonical ID

[ ] Target-neutral semantics

[ ] Clear capability metadata

[ ] Dependencies minimal

[ ] No hidden executable behavior

[ ] Validation passes

[ ] Relevant Profile/Preset integration reviewed
```

---

# 83. New Preset Checklist

```text
[ ] Clear capability purpose

[ ] Small and composable

[ ] No target-specific semantics

[ ] No unnecessary duplicate packages

[ ] Nested composition tested
```

---

# 84. New Profile Checklist

```text
[ ] Represents a meaningful role/environment

[ ] Reuses Presets where possible

[ ] Avoids duplicating another Profile

[ ] Inheritance is clear

[ ] Policy requirements are intentional

[ ] Target-independent unless semantically necessary
```

---

# 85. New CLI Command Checklist

```text
[ ] Clear user intent

[ ] Does not duplicate existing command semantics

[ ] Calls application layer

[ ] Help included

[ ] Error handling included

[ ] Exit code tested

[ ] JSON output added where appropriate

[ ] Non-TTY behavior tested

[ ] Mutation is explicit
```

---

# 86. Documentation Checklist

```text
[ ] Uses canonical terminology

[ ] Links relevant specs

[ ] Examples match current architecture

[ ] No deprecated commands

[ ] No target-specific claim presented as canonical

[ ] Diagrams reflect current flow
```

---

# 87. Review Priorities

Reviewers should prioritize:

```text
correctness

architecture

security

determinism

compatibility

tests

maintainability

style
```

Style concerns should not distract from architectural or correctness issues.

---

# 88. Review Questions

Useful review questions include:

```text
Does this belong in this layer?

Does this introduce target-specific leakage?

Could this behavior be nondeterministic?

Can Policy still enforce this?

Could this overwrite user files?

Can this be explained to users?

Does this change a compatibility surface?

Is this tested at the right level?
```

---

# 89. Architectural Red Flags

Contributors and reviewers should flag patterns such as:

```text
target-specific conditionals in core

network calls inside resolver

filesystem writes inside catalog

package code execution during install

trust assigned by package metadata

Policy bypass flags

implicit remote dependency discovery

silent unsupported capability dropping
```

These normally indicate an architecture violation.

---

# 90. Scope Discipline

Keep PRs focused.

If unrelated improvements are discovered, prefer opening a separate issue or follow-up PR unless they block the current change.

Small reviewable changes scale better than giant rewrites.

---

# 91. Experimental Features

Experimental features MUST be clearly identified.

They should avoid prematurely freezing public APIs.

Experimental status does not permit bypassing security or architecture boundaries.

---

# 92. Deprecated Features

When deprecating behavior:

```text
document replacement

provide migration path

add warning

maintain compatibility for defined period
```

Do not silently remove established behavior.

---

# 93. Issues

Good issues should include:

```text
problem

expected behavior

current behavior

reproduction if applicable

affected subsystem

relevant specification
```

Bug reports benefit greatly from minimal fixtures.

---

# 94. Feature Proposals

Feature proposals should focus first on the problem.

Prefer:

```text
Problem:
Users cannot inspect why a publisher was selected.
```

over:

```text
Feature:
Add command X with flags Y and Z.
```

Implementation should follow from the problem and architecture.

---

# 95. Architecture Proposals

Large architectural changes should describe:

```text
current limitation

proposed model

alternatives

trade-offs

migration

security implications

compatibility implications
```

Updating an existing specification is preferable to creating parallel undocumented rules.

---

# 96. Security Reports

Potential security vulnerabilities should not be discussed publicly before appropriate review if exploitation could put users at risk.

Follow the repository security reporting process if one is defined in:

```text
SECURITY.md
```

If `SECURITY.md` does not yet exist, maintainers should add one before public ecosystem distribution.

---

# 97. AI-Assisted Contributions

AI tools may be used to assist development.

Contributors remain responsible for:

```text
correctness

security

licenses

tests

architecture compliance

reviewing generated code
```

Do not submit large generated changes without understanding them.

---

# 98. AI-Generated Content

When adding Skills, Agents, Prompts, or documentation created with AI assistance:

```text
review semantics

remove hallucinated claims

verify upstream references

ensure license compatibility

ensure target neutrality
```

Generated content receives no special trust.

---

# 99. License

By contributing, you agree that your contribution is provided under the repository's license and contribution terms.

Do not submit third-party content unless its license permits inclusion or redistribution.

Vendor imports MUST preserve licensing information where required.

---

# 100. Attribution

Preserve attribution and provenance for upstream-derived content.

Do not remove:

```text
author information

source repository

license notices

required copyright notices
```

where applicable.

---

# 101. Definition of Done

A contribution is considered complete when applicable criteria are satisfied:

```text
[ ] Correct architectural layer

[ ] Specification aligned

[ ] Implementation complete

[ ] Validation complete

[ ] Diagnostics complete

[ ] Tests complete

[ ] Security reviewed

[ ] Trust reviewed

[ ] Determinism verified

[ ] Compatibility reviewed

[ ] Documentation updated

[ ] CI passing
```

---

# 102. Recommended Contribution Flow

```text
Find problem
    ↓
Read relevant docs
    ↓
Confirm architectural layer
    ↓
Update spec if required
    ↓
Add failing test
    ↓
Implement
    ↓
Run focused tests
    ↓
Run integration/security tests
    ↓
Update docs
    ↓
Open focused PR
```

---

# 103. Project Invariants

Contributors should protect these invariants above all else.

```text
Canonical packages remain target-neutral.

Resolution remains deterministic.

Resolver remains free of network/rendering behavior.

Policy remains authoritative.

Trust never equals permission.

Adapters translate representation, not semantics.

Source ingestion never implies execution.

Unknown user files are never silently overwritten.

External provenance is preserved.

Generated state is reproducible.
```

---

# 104. Final Contribution Principle

When several implementations appear possible, prefer the one that preserves:

```text
clear boundaries
    ↓
determinism
    ↓
explainability
    ↓
reproducibility
    ↓
security
    ↓
extensibility
```

The project should scale by adding:

```text
new content
new sources
new adapters
new clients
```

without continuously redesigning the canonical core.

That property is more important than optimizing for the fastest short-term implementation.