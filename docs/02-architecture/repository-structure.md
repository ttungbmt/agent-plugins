# Repository Structure

**Status:** Design note — ahead of implementation. The prose here describes intended behaviour; it is not the contract.

## Overview

This document defines the canonical repository structure for `agent-plugins`.

The repository should make the architecture visible through its filesystem.

The structure should clearly separate:

- product documentation,
- domain implementation,
- schemas,
- source adapters,
- target adapters,
- curated catalog metadata,
- reusable composition,
- native plugins,
- generated artifacts,
- tests,
- examples,
- maintainer tooling.

The repository should optimize for:

```text
clarity
separation of concerns
discoverability
scalability
low duplication
clear ownership
```

The filesystem should reinforce the architectural model rather than obscure it.

---

# 1. Canonical Repository Structure

```text
agent-plugins/
│
├── README.md
├── LICENSE
├── CHANGELOG.md
├── CONTRIBUTING.md
├── AGENTS.md
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── biome.json
│
├── apps/
│   └── cli/
│       ├── package.json
│       ├── src/
│       │   ├── commands/
│       │   │   ├── init/
│       │   │   ├── add/
│       │   │   ├── remove/
│       │   │   ├── sync/
│       │   │   ├── update/
│       │   │   ├── diff/
│       │   │   ├── doctor/
│       │   │   ├── list/
│       │   │   ├── search/
│       │   │   ├── explain/
│       │   │   ├── preset/
│       │   │   └── profile/
│       │   │
│       │   ├── ui/
│       │   ├── formatters/
│       │   ├── errors/
│       │   └── index.ts
│       │
│       └── test/
│
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   └── src/
│   │       ├── model/
│   │       ├── catalog/
│   │       ├── graph/
│   │       ├── resolver/
│   │       ├── policy/
│   │       ├── lockfile/
│   │       ├── diagnostics/
│   │       ├── explain/
│   │       ├── sync/
│   │       └── index.ts
│   │
│   ├── schemas/
│   │   ├── package.json
│   │   ├── src/
│   │   └── schemas/
│   │       ├── publisher.schema.json
│   │       ├── package.schema.json
│   │       ├── capability.schema.json
│   │       ├── preset.schema.json
│   │       ├── profile.schema.json
│   │       ├── policy.schema.json
│   │       ├── project.schema.json
│   │       └── lockfile.schema.json
│   │
│   ├── source-adapters/
│   │   ├── package.json
│   │   └── src/
│   │       ├── github/
│   │       ├── git/
│   │       ├── filesystem/
│   │       ├── claude-marketplace/
│   │       ├── agent-skills/
│   │       ├── superpowers/
│   │       ├── ecc/
│   │       └── index.ts
│   │
│   └── target-adapters/
│       ├── package.json
│       └── src/
│           ├── claude-code/
│           ├── codex/
│           ├── gemini/
│           ├── opencode/
│           ├── hermes/
│           └── index.ts
│
├── catalog/
│   ├── publishers/
│   │   ├── superpowers.yaml
│   │   ├── mattpocock.yaml
│   │   ├── ecc.yaml
│   │   ├── anthropic.yaml
│   │   ├── wshobson.yaml
│   │   └── agent-plugins.yaml
│   │
│   ├── packages/
│   │   ├── superpowers.yaml
│   │   ├── mattpocock-skills.yaml
│   │   ├── ecc.yaml
│   │   ├── anthropic-plugins.yaml
│   │   └── ...
│   │
│   └── capabilities/
│       ├── workflow/
│       ├── engineering/
│       ├── frontend/
│       ├── backend/
│       ├── security/
│       ├── knowledge/
│       ├── product/
│       ├── devops/
│       ├── tooling/
│       └── gis/
│
├── presets/
│   ├── workflow/
│   │   ├── core.yaml
│   │   ├── lightweight.yaml
│   │   └── rigorous.yaml
│   │
│   ├── engineering/
│   │   ├── core.yaml
│   │   ├── architecture.yaml
│   │   ├── testing.yaml
│   │   ├── security.yaml
│   │   └── research.yaml
│   │
│   ├── stacks/
│   │   ├── typescript.yaml
│   │   ├── nextjs.yaml
│   │   ├── node.yaml
│   │   ├── python.yaml
│   │   ├── cloudflare.yaml
│   │   └── kubernetes.yaml
│   │
│   ├── domains/
│   │   ├── frontend.yaml
│   │   ├── backend.yaml
│   │   ├── devops.yaml
│   │   ├── product.yaml
│   │   ├── gis.yaml
│   │   └── second-brain.yaml
│   │
│   ├── knowledge/
│   │   ├── research.yaml
│   │   ├── writing.yaml
│   │   ├── synthesis.yaml
│   │   └── knowledge-management.yaml
│   │
│   └── tools/
│       ├── github.yaml
│       ├── browser.yaml
│       └── obsidian.yaml
│
├── profiles/
│   ├── software-engineer.yaml
│   ├── frontend-engineer.yaml
│   ├── backend-engineer.yaml
│   ├── fullstack-engineer.yaml
│   ├── platform-engineer.yaml
│   ├── product-manager.yaml
│   ├── researcher.yaml
│   └── second-brain.yaml
│
├── policies/
│   ├── default.yaml
│   ├── strict.yaml
│   ├── personal.yaml
│   └── enterprise.yaml
│
├── plugins/
│   └── native/
│       ├── product-management/
│       ├── second-brain/
│       ├── gis/
│       └── ...
│
├── generated/
│   ├── catalog/
│   │   ├── components.json
│   │   ├── search-index.json
│   │   ├── capability-index.json
│   │   └── reverse-index.json
│   │
│   └── targets/
│       ├── claude-code/
│       ├── codex/
│       └── ...
│
├── .claude-plugin/
│   └── marketplace.json
│
├── tests/
│   ├── fixtures/
│   ├── schemas/
│   ├── catalog/
│   ├── graph/
│   ├── resolver/
│   ├── policy/
│   ├── adapters/
│   ├── integration/
│   └── e2e/
│
├── examples/
│   ├── frontend/
│   ├── backend/
│   ├── mealops/
│   ├── product-manager/
│   └── second-brain/
│
├── docs/
│   ├── index.md
│   │
│   ├── 00-product/
│   │   ├── problem.md
│   │   ├── problem.vi.md
│   │   ├── vision.md
│   │   ├── goals.md
│   │   ├── non-goals.md
│   │   ├── requirements.md
│   │   └── use-cases.md
│   │
│   ├── 01-domain/
│   │   ├── domain-model.md
│   │   ├── terminology.md
│   │   └── capability-model.md
│   │
│   ├── 02-architecture/
│   │   ├── architecture.md
│   │   ├── repository-structure.md
│   │   ├── source-of-truth.md
│   │   └── resolution-spec.md
│   │
│   ├── 03-specs/
│   │   ├── catalog-spec.md
│   │   ├── manifest-spec.md
│   │   ├── lockfile-spec.md
│   │   ├── policy-spec.md
│   │   ├── adapter-spec.md
│   │   ├── update-spec.md
│   │   └── cli-spec.md
│   │
│   ├── 04-security/
│   │   ├── security-model.md
│   │   └── trust-model.md
│   │
│   ├── 05-development/
│   │   ├── testing-strategy.md
│   │   ├── contributing.md
│   │   └── release-process.md
│   │
│   ├── 06-roadmap/
│   │   ├── roadmap.md
│   │   └── todo.md
│   │
│   └── decisions/
│       └── adr/
│           ├── 0001-capability-based-resolution.md
│           ├── 0002-publisher-package-component.md
│           ├── 0003-composition-over-inheritance.md
│           ├── 0004-no-addon-entity.md
│           ├── 0005-source-target-adapters.md
│           └── 0006-dual-lock-model.md
│
└── tools/
    ├── generate/
    ├── validate/
    ├── update/
    └── release/
```

---

# 2. Top-Level Design

The repository is organized around three major categories.

```text
Runtime Code
├── apps/
└── packages/

Domain Data
├── catalog/
├── presets/
├── profiles/
├── policies/
└── plugins/

Supporting Assets
├── generated/
├── tests/
├── examples/
├── docs/
└── tools/
```

This separation is intentional.

---

# 3. Root Files

Root files should contain repository-wide configuration and high-level project information.

```text
README.md
LICENSE
CHANGELOG.md
CONTRIBUTING.md
AGENTS.md
package.json
pnpm-workspace.yaml
tsconfig.json
biome.json
```

Avoid placing domain manifests or implementation modules directly in the repository root.

---

# 4. README.md

`README.md` is the public project entry point.

It should contain:

```text
project summary
positioning
quick start
basic installation
basic example
documentation link
```

Detailed design documentation belongs under:

```text
docs/
```

---

# 5. AGENTS.md

`AGENTS.md` provides instructions for coding agents working on the repository.

It may define:

```text
repository conventions
architecture rules
testing expectations
documentation requirements
generated-file rules
commands
```

It should not duplicate the full architecture documentation.

Instead, it should reference canonical docs.

---

# 6. apps/

`apps/` contains executable applications.

V1 contains:

```text
apps/cli/
```

Future applications could include:

```text
apps/web/
apps/registry/
```

but should only be introduced when they become real products.

---

# 7. apps/cli/

The CLI is the primary V1 user interface.

Responsibilities:

```text
command parsing
terminal UX
interactive prompts
formatting
exit codes
```

It should remain thin.

Business rules belong in `packages/core`.

---

# 8. CLI Command Structure

Commands should use oclif-style folders.

Example:

```text
apps/cli/src/commands/
├── init/
│   └── index.ts
├── sync/
│   └── index.ts
├── explain/
│   └── index.ts
└── ...
```

Subcommands may use deeper hierarchy where appropriate.

Example:

```text
preset/
├── add.ts
├── remove.ts
└── list.ts
```

Exact oclif conventions may influence the final physical structure.

---

# 9. CLI UI

Reusable interactive UI belongs under:

```text
apps/cli/src/ui/
```

Examples:

```text
selectors
tables
status views
diff rendering
progress rendering
```

Ink-specific code should remain in this layer.

---

# 10. packages/

`packages/` contains reusable implementation modules.

V1 should intentionally remain small.

Recommended packages:

```text
core
schemas
source-adapters
target-adapters
```

Do not create a package merely because a folder exists conceptually.

---

# 11. packages/core/

`packages/core` is the most important implementation package.

It owns:

```text
domain model
catalog loading abstractions
dependency graphs
resolver
policy evaluation
lockfile logic
diagnostics
explainability
sync planning abstractions
```

It should contain minimal infrastructure dependencies.

---

# 12. core/model/

```text
packages/core/src/model/
```

Contains normalized domain types.

Examples:

```text
publisher.ts
package.ts
component.ts
capability.ts
preset.ts
profile.ts
project.ts
policy.ts
target.ts
resolution.ts
```

These types should not depend on oclif, Ink, GitHub APIs, or Claude-specific structures.

---

# 13. core/catalog/

```text
packages/core/src/catalog/
```

Owns:

```text
catalog loading
catalog normalization
catalog indexes
catalog validation contracts
```

It should operate on canonical metadata.

---

# 14. core/graph/

```text
packages/core/src/graph/
```

Owns reusable graph behavior.

Examples:

```text
preset graph
capability graph
cycle detection
topological ordering
dependency traversal
reverse references
```

Avoid implementing graph traversal independently inside resolver modules.

---

# 15. core/resolver/

```text
packages/core/src/resolver/
```

Owns deterministic resolution.

Possible internal structure:

```text
resolver/
├── resolve.ts
├── collect-requirements.ts
├── candidates.ts
├── eligibility.ts
├── conflicts.ts
├── selection.ts
├── package-resolution.ts
└── types.ts
```

The resolver should remain side-effect free where practical.

---

# 16. core/policy/

```text
packages/core/src/policy/
```

Owns:

```text
policy evaluation
trust rules
component restrictions
publisher restrictions
policy decisions
```

It must not depend on CLI prompts.

---

# 17. core/lockfile/

```text
packages/core/src/lockfile/
```

Owns semantic lockfile behavior:

```text
lock construction
lock validation
lock comparison
lock preservation logic
```

Filesystem serialization may live in application/infrastructure code if needed.

---

# 18. core/diagnostics/

```text
packages/core/src/diagnostics/
```

Owns structured diagnostic types and codes.

Examples:

```text
UNKNOWN_CAPABILITY
PRESET_CYCLE
POLICY_DENIED
AMBIGUOUS_RESOLUTION
TARGET_UNSUPPORTED
LOCKFILE_STALE
```

CLI rendering of diagnostics remains outside core.

---

# 19. core/explain/

```text
packages/core/src/explain/
```

Owns construction of resolution explanations from stored resolution decisions.

It should not rerun independent selection logic.

---

# 20. core/sync/

```text
packages/core/src/sync/
```

May own runtime-independent planning concepts such as:

```text
desired state
actual state
managed state
change set
materialization plan
```

Target-specific mutation belongs in target adapters.

---

# 21. packages/schemas/

`packages/schemas` owns serialized contract validation.

It should include schemas for canonical manifests.

```text
publisher
package
capability
preset
profile
policy
project
lockfile
```

Possible implementation:

```text
JSON Schema
+
TypeScript validators/types
```

The schema package must not contain resolver logic.

---

# 22. Schema Versioning

Version-specific schemas may eventually use:

```text
schemas/
└── v1alpha1/
    ├── publisher.schema.json
    ├── capability.schema.json
    └── ...
```

This becomes valuable once multiple manifest versions coexist.

V1 may begin flat and introduce version folders when necessary.

---

# 23. packages/source-adapters/

This package contains upstream normalization logic.

Structure:

```text
source-adapters/
└── src/
    ├── github/
    ├── git/
    ├── filesystem/
    ├── claude-marketplace/
    ├── agent-skills/
    ├── superpowers/
    └── ecc/
```

Adapters should implement common contracts defined by core or the adapter package boundary.

---

# 24. Generic Source Adapters

Prefer generic adapters where possible.

Examples:

```text
git/
github/
filesystem/
claude-marketplace/
agent-skills/
```

Do not create:

```text
publisher-a/
publisher-b/
publisher-c/
```

if all three use the same generic format.

---

# 25. Publisher-Specific Source Adapters

Use publisher-specific folders only when necessary.

Examples:

```text
superpowers/
ecc/
```

A publisher-specific adapter should adapt unusual publisher structure rather than encode semantic capability decisions.

---

# 26. packages/target-adapters/

This package owns materialization into agent runtimes.

Structure:

```text
target-adapters/
└── src/
    ├── claude-code/
    ├── codex/
    ├── gemini/
    ├── opencode/
    └── hermes/
```

Only implemented adapters should contain substantial code.

Future targets may remain absent until implementation starts.

---

# 27. claude-code/

Claude Code is the primary V1 target.

Possible structure:

```text
claude-code/
├── adapter.ts
├── inspect.ts
├── plan.ts
├── apply.ts
├── compatibility.ts
├── renderer.ts
└── types.ts
```

The adapter should own Claude-specific details.

---

# 28. catalog/

`catalog/` contains curated external ecosystem metadata.

It is one of the main authoritative domain-data areas.

Structure:

```text
catalog/
├── publishers/
├── packages/
└── capabilities/
```

---

# 29. catalog/publishers/

Contains Publisher definitions.

One file per Publisher is preferred.

Example:

```text
catalog/publishers/
├── superpowers.yaml
├── mattpocock.yaml
├── ecc.yaml
├── anthropic.yaml
└── wshobson.yaml
```

Publisher files should contain source and provenance metadata, not large component inventories.

---

# 30. catalog/packages/

Contains curated Package definitions.

Example:

```text
catalog/packages/
├── superpowers.yaml
├── mattpocock-skills.yaml
└── ecc.yaml
```

A package definition may specify:

```text
publisher
source
version constraints
target metadata
discovery information
```

---

# 31. No catalog/components/ by Default

Do not manually maintain:

```text
catalog/components/
```

for all third-party components unless there is a strong reason.

External Component metadata should generally be:

```text
discovered
normalized
generated
```

into:

```text
generated/catalog/components.json
```

This avoids manually synchronizing rapidly changing upstream inventories.

---

# 32. catalog/capabilities/

Contains canonical Capability definitions.

Structure should reflect capability namespaces.

Example:

```text
catalog/capabilities/
├── workflow/
│   ├── planning.yaml
│   └── verification.yaml
│
├── engineering/
│   ├── debugging.yaml
│   └── testing/
│       ├── tdd.yaml
│       ├── unit.yaml
│       ├── integration.yaml
│       └── e2e.yaml
│
├── security/
│   └── review.yaml
│
└── knowledge/
    ├── research.yaml
    └── synthesis.yaml
```

Capability files may define implementation mappings to discovered/native Components.

---

# 33. Capability File Path vs ID

A file path may mirror the semantic namespace.

Example:

```text
catalog/capabilities/engineering/testing/tdd.yaml
```

corresponds to:

```text
engineering.testing.tdd
```

However, the canonical ID must still be explicitly stored in the file.

Filesystem location should not be the sole source of identity.

---

# 34. presets/

`presets/` contains reusable semantic compositions.

It is authoritative.

Primary groups:

```text
workflow
engineering
stacks
domains
knowledge
tools
```

These categories are organizational only.

`Preset` remains one domain entity.

---

# 35. presets/workflow/

Contains reusable workflow compositions.

Examples:

```text
core.yaml
lightweight.yaml
rigorous.yaml
```

Avoid publisher-specific files such as:

```text
superpowers.yaml
```

unless explicitly needed for diagnostics rather than normal composition.

---

# 36. presets/engineering/

Examples:

```text
core.yaml
architecture.yaml
testing.yaml
security.yaml
research.yaml
```

Presets may include:

```text
Capabilities
other Presets
```

They should normally not reference publisher implementations.

---

# 37. presets/stacks/

Represents technology stack compositions.

Examples:

```text
typescript
nextjs
node
python
cloudflare
kubernetes
```

These are Presets because each stack generally represents multiple capabilities.

---

# 38. presets/domains/

Represents broader working domains.

Examples:

```text
frontend
backend
devops
product
gis
second-brain
```

Do not confuse `domains/` Presets with domain-model code.

This folder is a semantic composition category.

---

# 39. presets/knowledge/

Examples:

```text
research
writing
synthesis
knowledge-management
```

Useful for non-coding Profiles.

---

# 40. presets/tools/

Represents reusable capability sets centered around tooling contexts.

Examples:

```text
github
browser
obsidian
```

Use carefully.

If a tool corresponds to one simple semantic ability, it may instead be a Capability.

---

# 41. profiles/

Profiles represent working roles.

Each Profile should normally be one YAML file.

Example:

```text
profiles/frontend-engineer.yaml
```

Profiles should primarily contain:

```text
preset references
optional metadata
```

Avoid embedding large capability lists repeatedly.

---

# 42. Profile Naming

Use role-oriented names.

Good:

```text
frontend-engineer
backend-engineer
product-manager
researcher
second-brain
```

Avoid project-specific names:

```text
mealops-frontend
gtel-nextjs-dev
```

Project-specific composition belongs in Project manifests.

---

# 43. policies/

Policies represent reusable governance rules.

Example:

```text
default.yaml
personal.yaml
strict.yaml
enterprise.yaml
```

Policy filenames should represent behavior or trust posture.

Avoid embedding user identity in shared policies.

---

# 44. plugins/native/

Contains first-party implementation source owned by this repository.

Structure:

```text
plugins/native/
├── product-management/
├── second-brain/
├── gis/
└── ...
```

This folder should contain only actual implementations.

---

# 45. Why `native/`

`native` communicates source/origin.

Metadata should still use:

```text
ownership: first-party
```

This avoids ambiguity with external publishers that may themselves call their packages "official".

---

# 46. No `vendor/` in V1

Do not create:

```text
plugins/vendor/
```

for mirrored third-party source by default.

External tooling should be represented through:

```text
catalog
source references
source adapters
distribution lock
```

Vendoring is an advanced exception, not the primary integration model.

---

# 47. No `overlays/` in V1

Do not create:

```text
overlays/
```

as a first-class architecture concept.

Prefer:

```text
capability selection
policy
implementation override
native replacement
```

A future patch system should be introduced only with a clear validated need.

---

# 48. generated/

`generated/` contains derived artifacts.

Nothing under `generated/` should be authoritative.

Deleting the directory and regenerating it should be safe.

---

# 49. generated/catalog/

Possible files:

```text
components.json
search-index.json
capability-index.json
reverse-index.json
```

These files are optimized for:

```text
runtime loading
search
impact analysis
developer tooling
```

---

# 50. generated/catalog/components.json

Contains normalized Component metadata discovered from upstream sources.

It may include:

```text
publisher
package
component ID
component type
source location
target metadata
security metadata
```

Capability mappings remain authoritative in the canonical catalog.

---

# 51. generated/catalog/search-index.json

Contains denormalized search data for commands such as:

```bash
ap search tdd
```

It may combine:

```text
capabilities
aliases
publishers
packages
components
presets
profiles
```

---

# 52. generated/catalog/reverse-index.json

May contain reverse mappings such as:

```text
Capability → Presets
Preset → Profiles
Component → Capabilities
Package → Components
```

Useful for:

```text
impact analysis
explainability
documentation generation
```

---

# 53. generated/targets/

Contains generated target-specific distribution artifacts when needed.

Example:

```text
generated/targets/claude-code/
```

Do not store consumer project runtime state here.

This directory belongs to distribution generation.

---

# 54. .claude-plugin/

Claude Code may require repository-level marketplace metadata.

Example:

```text
.claude-plugin/marketplace.json
```

This should preferably be generated.

Its authoritative inputs should come from:

```text
catalog
plugins/native
catalog.lock
```

---

# 55. marketplace.json Rule

Do not manually encode unique domain metadata only in:

```text
.claude-plugin/marketplace.json
```

If information matters to the domain, it should exist in canonical metadata and be rendered into the marketplace file.

---

# 56. catalog.lock

The repository should eventually include a distribution lock.

Recommended location:

```text
catalog.lock
```

at repository root.

Alternative:

```text
catalog/catalog.lock
```

is possible, but root is preferred because the lock represents the entire curated distribution rather than only one catalog subfolder.

---

# 57. Project Lockfile Location

Consumer projects use:

```text
agent-plugins.lock
```

at the consumer repository root.

It does not belong in this repository's:

```text
generated/
```

directory.

Examples under `examples/` may contain representative lockfiles.

---

# 58. tests/

Tests are organized primarily by architectural concern rather than mirroring every source directory exactly.

```text
tests/
├── fixtures/
├── schemas/
├── catalog/
├── graph/
├── resolver/
├── policy/
├── adapters/
├── integration/
└── e2e/
```

Unit tests may also live close to implementation where convenient.

The key requirement is clear responsibility.

---

# 59. tests/fixtures/

Contains stable test input.

Possible structure:

```text
fixtures/
├── catalogs/
├── projects/
├── publishers/
├── upstream/
├── locks/
└── targets/
```

Fixtures should remain intentionally small.

Avoid copying huge real-world repositories into test fixtures.

---

# 60. tests/schemas/

Tests:

```text
valid manifests
invalid manifests
schema migrations
ID validation
```

---

# 61. tests/catalog/

Tests:

```text
catalog loading
reference integrity
duplicate IDs
implementation mappings
```

---

# 62. tests/graph/

Tests:

```text
cycle detection
topological ordering
dependency expansion
reverse references
```

---

# 63. tests/resolver/

Tests:

```text
candidate selection
cardinality
priority
ambiguity
deduplication
overrides
lock stability
```

This should become one of the strongest test suites.

---

# 64. tests/policy/

Tests:

```text
trust filtering
security-sensitive components
deny behavior
review behavior
publisher preference
```

---

# 65. tests/adapters/

Split by adapter type if useful.

Example:

```text
adapters/
├── source/
└── target/
```

Target adapters should use golden fixtures where possible.

---

# 66. tests/integration/

Tests interactions across several layers.

Example:

```text
Project
→ Catalog
→ Resolver
→ Lockfile
→ Claude Adapter
```

---

# 67. tests/e2e/

Runs actual CLI flows against isolated fixture repositories.

Examples:

```bash
ap init
ap sync
ap explain
ap diff
ap doctor
```

---

# 68. examples/

`examples/` contains human-readable reference projects.

Recommended:

```text
frontend/
backend/
mealops/
product-manager/
second-brain/
```

Each example may contain:

```text
agent-plugins.yaml
expected explanation
optional lockfile fixture
README.md
```

---

# 69. Examples Are Not Tests

Examples should optimize for learning.

Tests optimize for validation.

An example may also be used by integration tests, but avoid coupling all documentation examples to complex test machinery.

---

# 70. docs/

`docs/` contains canonical documentation.

Entry point:

```text
docs/index.md
```

Documentation is organized from product reasoning to implementation details.

---

# 71. docs/00-product/

Contains:

```text
problem.md
problem.vi.md
vision.md
goals.md
non-goals.md
requirements.md
use-cases.md
```

This layer answers:

```text
Why are we building this?

What must it achieve?
```

---

# 72. docs/01-domain/

Contains:

```text
domain-model.md
terminology.md
capability-model.md
```

This layer answers:

```text
What concepts exist?

What do they mean?

How do they relate?
```

---

# 73. docs/02-architecture/

Contains:

```text
architecture.md
repository-structure.md
source-of-truth.md
resolution-spec.md
```

This layer answers:

```text
How is the system organized?
```

---

# 74. docs/03-specs/

Contains implementation-facing contracts.

```text
catalog-spec.md
manifest-spec.md
lockfile-spec.md
policy-spec.md
adapter-spec.md
update-spec.md
cli-spec.md
```

These documents should be precise enough to guide implementation and testing.

---

# 75. docs/04-security/

Contains:

```text
security-model.md
trust-model.md
```

Security concerns should remain explicit rather than scattered only throughout architecture docs.

---

# 76. docs/05-development/

Contains engineering workflow documentation.

```text
testing-strategy.md
contributing.md
release-process.md
```

---

# 77. docs/06-roadmap/

Contains:

```text
roadmap.md
todo.md
```

These files are delivery-oriented.

They should not redefine architecture.

---

# 78. docs/decisions/adr/

Contains Architecture Decision Records.

Structure:

```text
docs/decisions/adr/
```

ADRs record decisions rather than replacing architecture documentation.

---

# 79. ADR Naming

Use:

```text
NNNN-short-decision-name.md
```

Example:

```text
0001-capability-based-resolution.md
```

Keep numbering monotonic.

Do not reorganize ADR numbering by architecture section.

---

# 80. tools/

`tools/` contains repository-maintainer tooling.

Recommended:

```text
tools/
├── generate/
├── validate/
├── update/
└── release/
```

These are not consumer CLI commands.

---

# 81. tools/generate/

Maintainer scripts for:

```text
component discovery
generated indexes
marketplace manifests
documentation indexes
```

Example:

```text
pnpm generate
```

may call these internally.

---

# 82. tools/validate/

Maintainer validation orchestration.

Examples:

```text
validate catalog
validate manifests
check generated drift
check capability mappings
```

Reusable validation logic should still live in packages.

`tools/validate` only orchestrates repository workflows.

---

# 83. tools/update/

Maintainer tooling for upstream publisher updates.

Examples:

```text
discover new upstream version
compare component inventory
generate update report
update distribution lock
```

---

# 84. tools/release/

Release automation.

Examples:

```text
version checks
changelog validation
build
publish
release artifact generation
```

---

# 85. Authoritative vs Generated Directories

Authoritative:

```text
catalog/
presets/
profiles/
policies/
plugins/native/
docs/
```

Implementation source:

```text
apps/
packages/
tools/
```

Generated:

```text
generated/
.claude-plugin/marketplace.json
```

Consumer state:

```text
agent-plugins.yaml
agent-plugins.lock
```

The consumer state normally exists in downstream repositories rather than this distribution repository.

---

# 86. Directory Ownership Summary

| Directory | Responsibility | Authoritative |
|---|---|---|
| `apps/` | Executable applications | Yes |
| `packages/` | Reusable implementation code | Yes |
| `catalog/` | Curated ecosystem metadata | Yes |
| `presets/` | Capability compositions | Yes |
| `profiles/` | Role compositions | Yes |
| `policies/` | Resolution/governance rules | Yes |
| `plugins/native/` | First-party implementations | Yes |
| `generated/` | Derived indexes/artifacts | No |
| `.claude-plugin/` | Target-specific distribution output | Prefer generated |
| `tests/` | Test suites and fixtures | Yes |
| `examples/` | Reference configurations | Yes |
| `docs/` | Canonical documentation | Yes |
| `tools/` | Maintainer automation | Yes |

---

# 87. Dependency Direction by Directory

The intended dependency direction is:

```text
apps/cli
    ↓
packages/core
    ↑
    ├── packages/source-adapters
    └── packages/target-adapters
```

More precisely:

```text
CLI
→ core application APIs

source-adapters
→ core contracts

target-adapters
→ core contracts

core
→ schemas / minimal shared utilities
```

Data directories are loaded by appropriate application/core services.

---

# 88. Data Dependency Direction

```text
catalog/
presets/
profiles/
policies/
plugins/native/
        ↓
Validation / Normalization
        ↓
Core Domain
        ↓
Resolution
        ↓
generated / target materialization
```

Generated artifacts must never flow backward and become authoritative input unless explicitly treated as cache.

---

# 89. Naming Conventions

Use:

```text
kebab-case
```

for:

```text
filenames
directory names
profile IDs
publisher IDs
package IDs
preset names
policy IDs
target IDs
```

Examples:

```text
frontend-engineer.yaml
second-brain.yaml
claude-code/
```

---

# 90. Capability Naming

Use dot-separated namespaces:

```text
engineering.testing.tdd
knowledge.research
security.review
```

Filesystem path may mirror namespace:

```text
engineering/testing/tdd.yaml
```

---

# 91. Preset Naming

Canonical Preset IDs use slash hierarchy:

```text
workflow/core
engineering/security
stacks/nextjs
knowledge/research
```

Corresponding file:

```text
presets/engineering/security.yaml
```

---

# 92. Publisher Naming

Publisher ID:

```text
superpowers
```

Display name:

```text
Superpowers
```

Do not use display names as stable references.

---

# 93. Package Naming

Package IDs should be stable within Publisher scope.

Canonical reference may use:

```text
publisher/package
```

Example:

```text
anthropic/frontend-design
```

---

# 94. Component Naming

Canonical Component references should remain globally unambiguous.

Conceptual syntax:

```text
publisher/package#type:name
```

Example:

```text
superpowers/superpowers#skill:test-driven-development
```

This syntax may evolve before stable V1, but ambiguity must not.

---

# 95. No Generic `src/utils/` Dumping Ground

Avoid large generic folders such as:

```text
src/utils/
src/helpers/
src/common/
```

Prefer organizing code around responsibility.

For example:

```text
graph/topological-sort.ts
resolver/candidate-selection.ts
```

instead of:

```text
utils/graph.ts
helpers/resolver.ts
```

---

# 96. Shared Utilities

If genuinely reusable low-level utilities emerge, introduce them only when justified.

Do not create:

```text
packages/shared
```

on day one.

Premature shared packages often become dependency dumping grounds.

---

# 97. No `services/` Mega Folder

Avoid:

```text
src/services/
```

containing every business operation.

Use domain-oriented folders:

```text
resolver/
policy/
catalog/
lockfile/
```

The filesystem should reveal architecture.

---

# 98. No `types/` Mega Folder

Prefer keeping types near their domain.

Good:

```text
resolver/types.ts
policy/types.ts
```

Avoid putting every interface into:

```text
src/types/
```

unless it truly represents shared foundational contracts.

---

# 99. Colocation Rule

Implementation-specific files should generally be colocated.

Example:

```text
resolver/
├── resolve.ts
├── candidates.ts
├── conflicts.ts
└── resolve.test.ts
```

Repository-wide integration tests may still live under:

```text
tests/
```

---

# 100. Public API Rule

Every package should expose a deliberate public API.

Example:

```text
packages/core/src/index.ts
```

Internal modules should not automatically become public simply because they are importable.

Avoid deep imports such as:

```text
@agent-plugins/core/src/resolver/internal/foo
```

from other packages.

---

# 101. Package Dependency Rule

Avoid circular package dependencies.

Desired:

```text
schemas
   ↑
 core
   ↑
applications / adapters
```

If:

```text
core ↔ target-adapters
```

appears, the abstraction boundary is incorrect.

---

# 102. Catalog Dependency Rule

Catalog metadata should not import code.

Catalog files are declarative data.

Avoid embedding executable JS/TS expressions in YAML manifests.

This preserves:

```text
portability
validation
determinism
reviewability
```

---

# 103. Policy Dependency Rule

Policies should remain declarative.

Avoid:

```yaml
evaluate:
  script: ./custom-policy.js
```

in V1.

Custom executable policy logic would weaken reproducibility and security.

---

# 104. Generated File Rule

Every committed generated file must have a documented generator.

Example:

```text
generated/catalog/components.json
← pnpm generate:catalog
```

If no generator exists, the file should not be considered generated.

---

# 105. Generation Ownership

Generators belong under:

```text
tools/generate/
```

Reusable generation logic may live in packages.

The tool should orchestrate rather than duplicate domain logic.

---

# 106. Generated Drift Rule

CI should eventually enforce:

```text
generate
↓
git diff --exit-code
```

so committed generated artifacts cannot become stale silently.

---

# 107. Example Consumer Repository

A downstream project might look like:

```text
mealops/
├── src/
├── package.json
├── ...
│
├── agent-plugins.yaml
├── agent-plugins.lock
│
└── .claude/
    └── ...
```

`agent-plugins` manages only its declared runtime state.

It does not require the consumer project to adopt this monorepo structure.

---

# 108. Consumer Manifest Boundary

Consumer-facing configuration should remain small.

Avoid exposing internal distribution directories such as:

```text
catalog/
publishers/
packages/
```

inside every consumer repository.

A consumer should mainly need:

```text
agent-plugins.yaml
agent-plugins.lock
```

plus runtime-generated state.

---

# 109. V1 Minimal Repository Structure

Although the full target structure is larger, V1 can begin with:

```text
agent-plugins/
├── apps/
│   └── cli/
│
├── packages/
│   ├── core/
│   ├── schemas/
│   ├── source-adapters/
│   └── target-adapters/
│
├── catalog/
│   ├── publishers/
│   ├── packages/
│   └── capabilities/
│
├── presets/
├── profiles/
├── policies/
├── plugins/
│   └── native/
├── generated/
├── tests/
├── examples/
├── docs/
└── tools/
```

Do not create empty deep folder trees unless implementation or data already requires them.

---

# 110. V1 Creation Order

Recommended implementation order:

```text
1. docs/

2. packages/schemas/

3. packages/core/model/

4. catalog/

5. presets/

6. profiles/

7. policies/

8. packages/core/graph/

9. packages/core/resolver/

10. packages/core/policy/

11. packages/core/lockfile/

12. packages/source-adapters/

13. packages/target-adapters/claude-code/

14. apps/cli/

15. generated/

16. tests/integration/

17. tests/e2e/
```

The repository should grow alongside implemented functionality rather than creating unnecessary empty abstraction layers.

---

# 111. V1 Publisher Data

Initial publisher manifests may include:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

This set is intended to validate different publisher styles rather than maximize ecosystem coverage.

---

# 112. V1 Capability Data

Start with a deliberately small capability set sufficient to validate:

```text
workflow ownership

TDD conflicts

debugging

architecture

security

frontend

research

product

second-brain
```

Do not attempt to define the full future taxonomy before testing the model.

---

# 113. V1 Presets

Initial useful Presets:

```text
workflow/core

engineering/core
engineering/testing
engineering/security

stacks/typescript
stacks/nextjs

domains/frontend
domains/backend
domains/product
domains/second-brain

knowledge/research
knowledge/writing
knowledge/synthesis
```

---

# 114. V1 Profiles

Initial representative Profiles:

```text
frontend-engineer

backend-engineer

product-manager

second-brain
```

These validate different semantic compositions.

---

# 115. V1 Policies

Initial policies:

```text
default

personal

strict
```

`enterprise` may exist as an example but should not require enterprise infrastructure.

---

# 116. V1 Native Plugins

Native plugins should be introduced only where they provide genuine unique value.

Do not create native copies merely to fill every domain.

Possible early areas:

```text
product-management
second-brain
```

GIS may be introduced when real use cases are implemented.

---

# 117. Structure Evolution

Directories should be introduced because a real architectural boundary exists.

Before adding a new top-level directory, ask:

```text
Does this represent a distinct source of truth?

Does this represent a distinct architectural responsibility?

Will multiple files meaningfully live here?

Does the existing structure become unclear without it?
```

If not, keep the current structure.

---

# 118. Structure Anti-Patterns

Avoid:

```text
too many top-level folders

publisher names spread everywhere

one folder per hypothetical concept

deep profile inheritance directories

duplicate catalog metadata

runtime-specific domain folders

manual generated files

generic shared utility dumps
```

---

# 119. Repository Structure Invariants

The structure should preserve these invariants:

```text
1. Runtime-independent core lives under packages/core.

2. CLI-specific behavior stays under apps/cli.

3. Source-specific behavior stays in source adapters.

4. Target-specific behavior stays in target adapters.

5. Curated publisher/package/capability metadata stays under catalog.

6. Presets and Profiles never live inside publisher folders.

7. Native implementation source stays under plugins/native.

8. Third-party source is not copied into plugins/native.

9. Generated artifacts stay clearly separated.

10. Generated artifacts are never authoritative.

11. Documentation has one entry point: docs/index.md.

12. Architectural decisions live under docs/decisions/adr.

13. Consumer state is separate from distribution state.

14. Tests mirror architectural responsibilities.

15. Package boundaries remain coarse until real complexity requires further splitting.
```

---

# 120. Repository Map by Question

When asking:

> Where does publisher metadata go?

```text
catalog/publishers/
```

> Where does package metadata go?

```text
catalog/packages/
```

> Where does semantic capability metadata go?

```text
catalog/capabilities/
```

> Where does reusable capability composition go?

```text
presets/
```

> Where does role composition go?

```text
profiles/
```

> Where do trust and governance rules go?

```text
policies/
```

> Where does first-party implementation source go?

```text
plugins/native/
```

> Where does deterministic business logic go?

```text
packages/core/
```

> Where does upstream parsing go?

```text
packages/source-adapters/
```

> Where does Claude Code rendering go?

```text
packages/target-adapters/src/claude-code/
```

> Where does CLI UX go?

```text
apps/cli/
```

> Where does derived metadata go?

```text
generated/
```

> Where does architecture documentation go?

```text
docs/02-architecture/
```

---

# 121. Repository Structure Summary

The repository can be summarized as:

```text
Code
├── apps/
└── packages/

Canonical Domain Data
├── catalog/
├── presets/
├── profiles/
├── policies/
└── plugins/native/

Derived Data
└── generated/

Quality
├── tests/
└── examples/

Knowledge
└── docs/

Maintenance
└── tools/
```

---

# 122. Repository Structure in One Sentence

> **`agent-plugins` separates executable code, canonical capability metadata, reusable composition, first-party implementations, generated artifacts, documentation, and tests so that each architectural responsibility has one clear and predictable home.**