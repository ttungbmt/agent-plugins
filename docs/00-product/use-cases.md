# Use Cases

## Overview

This document defines the representative use cases that `agent-plugins` must support.

The use cases validate whether the product model can work across different:

- user roles,
- project types,
- publishers,
- capability combinations,
- trust policies,
- runtime targets,
- update scenarios.

They are intentionally described from the user's perspective.

Implementation details belong in later architecture and specification documents.

---

# 1. Actors

The system has several primary actors.

## 1.1 Individual Developer

A developer using agent tooling across one or more software projects.

Examples:

```text
Frontend Engineer
Backend Engineer
Full-stack Engineer
Platform Engineer
```

---

## 1.2 Knowledge Worker

A user whose primary use case is not software development.

Examples:

```text
Product Manager
Researcher
Writer
Second Brain user
```

---

## 1.3 Project Maintainer

A person responsible for defining and maintaining the agent environment of a project.

Responsibilities may include:

```text
selecting roles
selecting presets
reviewing updates
maintaining lockfiles
resolving conflicts
```

---

## 1.4 Catalog Maintainer

A contributor responsible for maintaining the curated ecosystem.

Responsibilities include:

```text
adding publishers
registering packages
mapping capabilities
reviewing upstream changes
maintaining preferred implementations
```

---

## 1.5 Team / Organization Maintainer

A person or team responsible for common:

```text
policies
approved publishers
security requirements
shared presets
```

This actor is primarily relevant beyond the minimal individual-user workflow.

---

# 2. Core User Journey

The primary workflow should remain simple.

```text
Choose role
    ↓
Choose project needs
    ↓
Choose policy / target
    ↓
Resolve capabilities
    ↓
Review result
    ↓
Synchronize environment
```

Typical CLI flow:

```bash
ap init
ap sync
```

Optional inspection:

```bash
ap explain
ap diff
ap doctor
```

---

# 3. UC-001 — Initialize a Frontend Project

## Actor

Frontend Engineer

## Goal

Configure a useful AI agent environment for a frontend project without manually selecting individual plugins.

## Scenario

The user is working on:

```text
Next.js
TypeScript
Cloudflare
```

They initialize the project:

```bash
ap init
```

The user selects:

```text
Role:
frontend-engineer

Presets:
stacks/nextjs
stacks/cloudflare

Target:
claude-code

Policy:
default
```

The resulting project manifest may resemble:

```yaml
role: frontend-engineer

presets:
  - stacks/nextjs
  - stacks/cloudflare

targets:
  - claude-code

policy: default
```

## Expected Outcome

The system resolves capabilities such as:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.review
frontend.design
frontend.react
frontend.typescript
```

into appropriate implementations.

The user does not need to manually know which publishers implement each capability.

## Related Requirements

```text
REQ-PRO-001
REQ-PRO-004
REQ-PRJ-001
REQ-PRJ-003
REQ-RES-001
REQ-TGT-002
```

---

# 4. UC-002 — Initialize a Backend Project

## Actor

Backend Engineer

## Goal

Create a backend-focused agent environment.

## Scenario

The project uses:

```text
Node.js
TypeScript
PostgreSQL
```

The user configures:

```yaml
role: backend-engineer

presets:
  - stacks/typescript
  - stacks/node
  - engineering/security

targets:
  - claude-code
```

## Expected Capabilities

The resolved environment may include:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.architecture

backend.api-design
backend.contracts

security.review
```

The frontend-specific capabilities should not be included unless explicitly requested.

## Expected Outcome

The resolved environment is smaller and more relevant than installing an entire general-purpose plugin collection.

## Related Requirements

```text
REQ-PRO-001
REQ-PRE-003
REQ-RES-009
REQ-SYNC-001
```

---

# 5. UC-003 — Use a Second Brain Role

## Actor

Knowledge Worker

## Goal

Use the same system for a non-software-development environment.

## Scenario

The user maintains an Obsidian-based knowledge system.

They configure:

```yaml
role: second-brain

presets:
  - knowledge/research
  - knowledge/writing
  - knowledge/synthesis
  - tools/obsidian
```

## Expected Capabilities

```text
knowledge.research
knowledge.writing
knowledge.synthesis
knowledge.management
```

Potential implementations may come from:

```text
native agent-plugins
Matt Pocock
ECC
other curated publishers
```

## Expected Outcome

The system should not automatically include irrelevant development capabilities such as:

```text
TDD
Git worktrees
build error resolution
frontend testing
```

unless explicitly requested.

## Related Requirements

```text
REQ-PRO-001
REQ-CAP-004
REQ-RES-009
REQ-NAT-001
```

---

# 6. UC-004 — Use a Product Manager Role

## Actor

Product Manager

## Goal

Configure agent tooling around product discovery, research, specification, and writing.

## Scenario

The user selects:

```yaml
role: product-manager

presets:
  - domains/product
  - knowledge/research
  - knowledge/writing
```

## Expected Capabilities

Possible capabilities include:

```text
product.discovery
product.requirements
product.prioritization

knowledge.research
knowledge.synthesis
knowledge.writing

engineering.domain-modeling
```

## Expected Outcome

The role should combine relevant capabilities from different publishers without requiring the Product Manager to understand their repository structure.

---

# 7. UC-005 — Reuse the Same Role Across Different Projects

## Actor

Frontend Engineer

## Goal

Reuse one working role across multiple project stacks.

## Scenario

The user works on three projects.

### Project A

```text
Next.js
Cloudflare
```

### Project B

```text
React
Vite
```

### Project C

```text
Astro
```

All three projects use:

```yaml
role: frontend-engineer
```

but different project presets.

## Expected Outcome

The role-level baseline remains consistent:

```text
workflow
testing
debugging
review
frontend practices
```

while project-specific capabilities vary.

The user should not need separate roles such as:

```text
frontend-nextjs-engineer
frontend-vite-engineer
frontend-astro-engineer
```

## Related Requirements

```text
REQ-PRO-004
REQ-PRJ-003
```

---

# 8. UC-006 — Add an Optional Capability Set

## Actor

Developer

## Goal

Add a cross-cutting capability to an existing project.

## Scenario

A frontend project already uses:

```yaml
role: frontend-engineer
```

The user wants additional security capabilities.

They add:

```yaml
presets:
  - engineering/security
```

## Expected Outcome

Security capabilities become part of resolution without modifying the frontend role.

The system does not need a separate first-class `Addon` entity.

Conceptually:

```text
optional feature
=
additional preset
```

## Related Requirements

```text
REQ-PRE-005
REQ-PRJ-003
```

---

# 9. UC-007 — Multiple Publishers Offer TDD

## Actor

Project Maintainer

## Goal

Avoid multiple competing TDD workflows.

## Preconditions

The catalog contains:

```text
engineering.testing.tdd

Implementations:
- Superpowers
- Matt Pocock
- ECC
```

and the capability has:

```yaml
cardinality: one
```

## Scenario

The frontend role requests:

```text
engineering.testing.tdd
```

The resolver discovers all candidate implementations.

## Expected Outcome

The resolver:

1. evaluates policy,
2. evaluates target compatibility,
3. evaluates implementation priority,
4. selects exactly one implementation.

Example:

```text
Selected:
Superpowers / test-driven-development

Suppressed:
Matt Pocock / tdd
ECC / tdd-workflow
```

## Expected Outcome

Only the selected TDD workflow becomes active.

## Related Requirements

```text
REQ-CAP-001
REQ-CAP-002
REQ-CAP-003
REQ-RES-003
REQ-RES-005
```

---

# 10. UC-008 — Multiple Implementations May Coexist

## Actor

Developer

## Goal

Use multiple complementary implementations for a non-exclusive capability.

## Preconditions

A capability is defined with:

```yaml
cardinality: many
```

Example:

```text
knowledge.research
```

Available implementations may provide:

```text
web research
documentation research
repository research
academic search
```

## Expected Outcome

The resolver may select multiple compatible implementations.

This should not be treated as a conflict.

## Related Requirements

```text
REQ-CAP-002
REQ-RES-004
```

---

# 11. UC-009 — Policy Rejects the Highest-Priority Candidate

## Actor

Project Maintainer

## Goal

Apply security policy before capability priority.

## Scenario

A capability has two candidates:

```text
Candidate A
priority: 100
trust: community

Candidate B
priority: 80
trust: curated
```

The selected policy allows only:

```text
first-party
official
curated
```

## Expected Outcome

Candidate A is rejected.

Candidate B is selected.

Priority must never override policy restrictions.

## Related Requirements

```text
REQ-POL-002
REQ-RES-005
```

---

# 12. UC-010 — Policy Rejects All Implementations

## Actor

Developer

## Goal

Receive a useful diagnostic when no implementation can satisfy policy.

## Scenario

The project requires:

```text
security.review
```

All available implementations are classified as:

```text
community
```

but the policy allows only:

```text
first-party
official
curated
```

## Expected Outcome

Resolution fails.

The error should explain:

```text
Unable to resolve:
security.review

Required by:
backend-engineer
→ engineering/security

Candidates:
Publisher A — rejected: community source
Publisher B — rejected: community source
```

The resolver must not silently remove the capability.

## Related Requirements

```text
REQ-RES-007
REQ-EXP-004
REQ-POL-002
```

---

# 13. UC-011 — Ambiguous Capability Resolution

## Actor

Project Maintainer

## Goal

Avoid hidden arbitrary selection.

## Scenario

Two candidates remain after all filters:

```text
Candidate A
priority: 100

Candidate B
priority: 100
```

Both satisfy:

```text
policy
target compatibility
version constraints
```

No explicit tie-break rule exists.

## Expected Outcome

Resolution should fail or request an explicit override.

It must not randomly select an implementation.

Example diagnostic:

```text
Ambiguous capability:
engineering.testing.tdd

Candidates:
A
B

Specify an explicit implementation override.
```

## Related Requirements

```text
REQ-RES-008
REQ-NFR-001
```

---

# 14. UC-012 — Explain Why a Component Is Installed

## Actor

Developer

## Goal

Understand why a particular capability implementation is active.

## Scenario

The user runs:

```bash
ap explain engineering.testing.tdd
```

## Expected Output

```text
Capability:
engineering.testing.tdd

Required by:
frontend-engineer
→ engineering/core

Candidates:
Superpowers / test-driven-development
Matt Pocock / tdd
ECC / tdd-workflow

Selected:
Superpowers / test-driven-development

Reason:
compatible with claude-code
allowed by default policy
highest implementation priority

Package:
superpowers

Publisher:
superpowers
```

## Related Requirements

```text
REQ-EXP-001
REQ-EXP-002
REQ-EXP-003
```

---

# 15. UC-013 — Explain Why a Package Is Installed

## Actor

Developer

## Goal

Trace a package back to the capability that caused installation.

## Scenario

The user notices:

```text
superpowers
```

in their environment.

They request:

```bash
ap explain package superpowers
```

## Expected Outcome

The system may show:

```text
Package:
superpowers

Required components:
test-driven-development
systematic-debugging
writing-plans

Capabilities:
engineering.testing.tdd
engineering.debugging
workflow.planning

Required through:
frontend-engineer
→ engineering/core
```

---

# 16. UC-014 — Reproduce an Environment on Another Machine

## Actor

Developer

## Goal

Reconstruct the same agent environment on a second machine.

## Preconditions

The repository contains:

```text
agent-plugins.yaml
agent-plugins.lock
```

## Scenario

On another machine:

```bash
git clone project
cd project
ap sync
```

## Expected Outcome

The system restores the same resolved:

```text
publishers
packages
components
versions
capability mappings
policy-sensitive selections
```

subject to target/runtime availability.

## Related Requirements

```text
REQ-LOCK-001
REQ-LOCK-002
REQ-RES-001
REQ-SYNC-003
```

---

# 17. UC-015 — Repeated Sync Is Idempotent

## Actor

Developer

## Goal

Run synchronization safely multiple times.

## Scenario

The user executes:

```bash
ap sync
ap sync
ap sync
```

without modifying configuration.

## Expected Outcome

The first run reconciles state.

Subsequent runs report no meaningful changes.

The resulting lockfile and managed target configuration remain equivalent.

## Related Requirements

```text
REQ-RES-010
REQ-SYNC-003
```

---

# 18. UC-016 — Detect Manifest and Lockfile Drift

## Actor

Developer

## Goal

Know when desired state changed after editing configuration.

## Scenario

The project originally contains:

```yaml
presets:
  - stacks/nextjs
```

The user adds:

```yaml
  - engineering/security
```

but does not run sync.

## Expected Outcome

The system detects that:

```text
agent-plugins.yaml
```

and:

```text
agent-plugins.lock
```

are out of sync.

Commands such as:

```bash
ap diff
ap doctor
```

should surface the drift.

## Related Requirements

```text
REQ-LOCK-005
REQ-CLI-007
REQ-CLI-008
```

---

# 19. UC-017 — Check an Upstream Update

## Actor

Catalog Maintainer

## Goal

Inspect upstream changes before adopting them.

## Scenario

The maintainer runs:

```bash
ap update --check superpowers
```

Current state:

```text
v6.3
```

Available upstream:

```text
v6.4
```

## Expected Outcome

The system reports:

```text
Version:
6.3 → 6.4

Added:
+ component A

Changed:
~ writing-plans

Removed:
- legacy-component

Capability impact:
workflow.planning → changed implementation metadata
engineering.testing.tdd → unchanged
```

No update is applied.

## Related Requirements

```text
REQ-UPD-001
REQ-UPD-002
REQ-UPD-003
```

---

# 20. UC-018 — Detect Security-Sensitive Upstream Changes

## Actor

Catalog Maintainer

## Goal

Review security-sensitive changes before updating.

## Scenario

An upstream package previously contained:

```text
skills
agents
```

The new version introduces:

```text
hook
MCP server
```

## Expected Outcome

Update analysis highlights these additions.

Example:

```text
Security-sensitive changes:

+ hook: post-tool-use
+ MCP server: external-service
```

The changes should be reviewable before updating the distribution lock.

## Related Requirements

```text
REQ-UPD-004
REQ-SEC-001
REQ-SEC-004
```

---

# 21. UC-019 — Upgrade a Publisher Intentionally

## Actor

Catalog Maintainer

## Goal

Adopt a reviewed upstream version.

## Preconditions

`ap update --check` has already been reviewed.

## Scenario

The maintainer runs:

```bash
ap update superpowers
```

## Expected Outcome

The system updates relevant distribution state.

Affected generated artifacts are rebuilt.

Catalog validation and tests run before the update is accepted.

Project lockfiles should not silently change until projects explicitly reconcile against the new catalog state.

---

# 22. UC-020 — Add a New Publisher

## Actor

Catalog Maintainer

## Goal

Integrate a new upstream ecosystem.

## Scenario

A new repository provides useful agent skills.

The maintainer adds publisher metadata:

```text
catalog/publishers/new-publisher.yaml
```

and appropriate source adapter configuration.

## Expected Outcome

The system can:

```text
identify the publisher
discover packages
discover components
retain provenance
```

without changing the core domain model.

## Related Requirements

```text
REQ-DOM-001
REQ-SRC-001
REQ-SRC-003
REQ-NFR-005
```

---

# 23. UC-021 — Curate Only Part of a Large Publisher

## Actor

Catalog Maintainer

## Goal

Use a useful subset of a publisher without exposing everything.

## Scenario

An upstream repository contains:

```text
300 skills
70 agents
50 commands
```

The project initially wants only:

```text
15 skills
4 agents
```

## Expected Outcome

Source discovery may identify all components.

The curated catalog references only the approved subset.

Supporting a publisher must not imply enabling its entire catalog.

## Related Requirements

```text
REQ-CAT-005
REQ-SRC-004
```

---

# 24. UC-022 — Map Different Components to One Capability

## Actor

Catalog Maintainer

## Goal

Normalize different publisher terminology.

## Scenario

Publishers expose:

```text
test-driven-development
tdd
tdd-workflow
```

The maintainer maps all three to:

```text
engineering.testing.tdd
```

## Expected Outcome

Roles and presets reference only the canonical capability.

Publisher-specific terminology remains isolated within catalog mapping.

## Related Requirements

```text
REQ-DOM-004
REQ-DOM-005
REQ-CAP-001
```

---

# 25. UC-023 — Add a Native Capability

## Actor

Project Maintainer / Catalog Maintainer

## Goal

Create a capability not adequately provided by external sources.

## Scenario

The project wants a specialized:

```text
knowledge.obsidian.atomic-notes
```

implementation.

A native plugin is created under:

```text
plugins/native/second-brain/
```

## Expected Outcome

The native component:

1. receives first-party provenance,
2. maps to a canonical capability,
3. participates in normal resolution,
4. may compete with external implementations if applicable.

## Related Requirements

```text
REQ-NAT-001
REQ-NAT-002
REQ-PRV-003
```

---

# 26. UC-024 — Replace an External Implementation With a Native One

## Actor

Catalog Maintainer

## Goal

Use a first-party implementation while preserving the same semantic capability.

## Scenario

Previously:

```text
knowledge.synthesis
→ Publisher A
```

A new native implementation becomes preferred.

The capability mapping changes to:

```text
knowledge.synthesis
→ agent-plugins/native-synthesis
```

## Expected Outcome

Roles and project manifests remain unchanged.

Only the implementation mapping and subsequent lockfiles change.

This validates publisher independence.

---

# 27. UC-025 — Target Does Not Support a Capability

## Actor

Developer

## Goal

Receive an explicit warning or error when portability is incomplete.

## Scenario

The project requests:

```text
workflow.some-special-hook
```

but the selected runtime does not support the required primitive.

## Expected Outcome

The system reports:

```text
Unsupported capability:
workflow.some-special-hook

Target:
<runtime>

Reason:
required component type not supported
```

The system must not silently pretend the capability is available.

## Related Requirements

```text
REQ-TGT-003
REQ-TGT-005
REQ-MRT-004
```

---

# 28. UC-026 — Future Multi-Runtime Project

## Actor

Developer

## Goal

Use one semantic project configuration across multiple runtime targets.

## Scenario

A future project configures:

```yaml
targets:
  - claude-code
  - codex
```

The requested semantic capabilities remain the same.

## Expected Outcome

The resolver may choose different implementations per target where necessary.

Conceptually:

```text
engineering.testing.tdd

├── Claude Code
│   └── implementation A
│
└── Codex
    └── implementation B
```

Intent remains portable even if runtime behavior is not identical.

## Priority

Post-V1 / architectural validation.

## Related Requirements

```text
REQ-MRT-001
REQ-MRT-003
REQ-MRT-004
```

---

# 29. UC-027 — Personal and Work Policies

## Actor

Developer

## Goal

Use different trust boundaries in different contexts.

## Scenario

Personal projects use:

```yaml
policy: personal
```

allowing:

```text
curated
community
experimental components
```

Work projects use:

```yaml
policy: strict
```

allowing only:

```text
first-party
official
curated
```

and restricting external hooks.

## Expected Outcome

The same role and presets may resolve differently under different policies.

Those differences must be explicit and explainable.

## Related Requirements

```text
REQ-POL-001
REQ-POL-002
REQ-POL-003
REQ-POL-005
```

---

# 30. UC-028 — Team Standardizes a Shared Security Preset

## Actor

Team Maintainer

## Goal

Ensure multiple projects share consistent security capability requirements.

## Scenario

The team defines:

```text
engineering/security
```

and requires projects to compose it.

Projects may otherwise use different roles:

```text
frontend-engineer
backend-engineer
platform-engineer
```

## Expected Outcome

All participating projects receive the same semantic security requirements while the resolver chooses target-compatible implementations.

## Related Requirements

```text
REQ-TEAM-002
REQ-PRE-003
```

---

# 31. UC-029 — Team Restricts Publishers

## Actor

Organization Maintainer

## Goal

Prevent projects from resolving against unapproved publishers.

## Scenario

Organization policy allows:

```text
first-party
official
approved curated publishers
```

but denies:

```text
community
untrusted
```

## Expected Outcome

Projects cannot bypass the policy through higher implementation priority.

Unsupported required capabilities fail with clear diagnostics.

## Priority

Primarily post-V1, but policy model must support the concept.

---

# 32. UC-030 — Search by Capability

## Actor

Developer

## Goal

Find functionality without knowing publisher names.

## Scenario

The user runs:

```bash
ap search tdd
```

## Expected Outcome

Results may include:

```text
Capability:
engineering.testing.tdd

Preset:
engineering/testing

Implementations:
Superpowers / test-driven-development
Matt Pocock / tdd
ECC / tdd-workflow
```

The semantic capability should be shown before raw implementation details.

## Related Requirements

```text
REQ-CLI-005
```

---

# 33. UC-031 — Search for a Stack

## Actor

Developer

## Goal

Find reusable presets for a technology stack.

## Scenario

```bash
ap search nextjs
```

## Expected Outcome

The user can discover:

```text
Preset:
stacks/nextjs

Related capabilities:
frontend.react
frontend.nextjs
...
```

and then add it to the project.

---

# 34. UC-032 — Inspect Desired vs Actual State

## Actor

Developer

## Goal

Understand what synchronization would change.

## Scenario

The user runs:

```bash
ap diff
```

## Expected Output

```text
Desired vs Actual

+ security-reviewer

~ superpowers
  6.3 → 6.4

- stale-plugin
```

No change is applied by `diff`.

## Related Requirements

```text
REQ-CLI-007
REQ-SYNC-001
```

---

# 35. UC-033 — Diagnose a Broken Environment

## Actor

Developer

## Goal

Identify why the project agent environment is invalid.

## Scenario

The user runs:

```bash
ap doctor
```

The project has:

```text
missing package
stale lockfile
unsupported target capability
```

## Expected Outcome

The system reports each issue separately with suggested remediation where practical.

Example:

```text
✗ Lockfile is stale
  Run: ap sync

✗ Package unavailable
  publisher-x/package-y

✗ Unsupported capability
  target does not support external hook
```

## Related Requirements

```text
REQ-CLI-008
REQ-VAL-005
REQ-NFR-008
```

---

# 36. UC-034 — Invalid Preset Reference

## Actor

Developer

## Goal

Receive an immediate error for invalid configuration.

## Scenario

Project manifest contains:

```yaml
presets:
  - stacks/nonexistent
```

## Expected Outcome

Validation fails before installation.

Example:

```text
Unknown preset:
stacks/nonexistent
```

## Related Requirements

```text
REQ-VAL-002
REQ-VAL-005
```

---

# 37. UC-035 — Preset Dependency Cycle

## Actor

Preset Maintainer

## Goal

Prevent invalid composition graphs.

## Scenario

```text
Preset A
→ Preset B

Preset B
→ Preset C

Preset C
→ Preset A
```

## Expected Outcome

Catalog validation fails.

The complete cycle should be displayed.

Example:

```text
Preset dependency cycle:

A → B → C → A
```

## Related Requirements

```text
REQ-PRE-004
REQ-VAL-003
```

---

# 38. UC-036 — Duplicate Capability ID

## Actor

Catalog Maintainer

## Goal

Prevent ambiguous canonical capability definitions.

## Scenario

Two manifests define:

```text
engineering.testing.tdd
```

## Expected Outcome

Catalog validation fails before generation or resolution.

## Related Requirements

```text
REQ-VAL-004
```

---

# 39. UC-037 — External Executable Hook Requires Review

## Actor

Developer

## Goal

Avoid silently enabling executable external behavior.

## Scenario

An implementation contains an external hook.

Current policy states:

```text
external hooks:
review
```

## Expected Outcome

The component cannot become active without satisfying the required review process.

The resolver should identify:

```text
publisher
package
component
hook
source
```

## Related Requirements

```text
REQ-POL-003
REQ-POL-004
REQ-SEC-001
REQ-SEC-002
```

---

# 40. UC-038 — Community Package Allowed in Personal Policy

## Actor

Individual Developer

## Goal

Use a community capability in a less restrictive personal environment.

## Scenario

The active policy permits:

```text
community
```

A useful capability only has a community implementation.

## Expected Outcome

The implementation may be selected if all other constraints are satisfied.

Its provenance and trust classification remain visible.

---

# 41. UC-039 — CI Validates Configuration

## Actor

Project Maintainer

## Goal

Prevent broken agent configuration from being merged.

## Scenario

CI runs a non-interactive command such as:

```bash
ap validate
```

or equivalent validation through the CLI.

## Expected Outcome

CI fails for:

```text
invalid schema
unknown capability
broken package reference
dependency cycle
unresolvable required capability
```

No interactive prompt is required.

## Related Requirements

```text
REQ-CLI-010
REQ-VAL-001
REQ-VAL-002
```

---

# 42. UC-040 — CI Verifies Reproducibility

## Actor

Project Maintainer

## Goal

Ensure project resolution has not drifted.

## Scenario

CI resolves the project against its committed inputs.

## Expected Outcome

The generated result matches the committed lock state.

Unexpected changes fail the check.

## Related Requirements

```text
REQ-TST-003
REQ-LOCK-005
```

---

# 43. UC-041 — Generate Runtime-Specific Artifacts

## Actor

Developer

## Goal

Materialize the resolved environment for Claude Code.

## Scenario

The resolver produces internal resolved state.

The Claude Code target adapter receives that state.

## Expected Outcome

The adapter produces the necessary native runtime artifacts without changing the semantic domain model.

Conceptually:

```text
Resolution
    ↓
Claude Code Adapter
    ↓
Claude-native configuration
```

## Related Requirements

```text
REQ-TGT-001
REQ-TGT-002
REQ-TGT-004
```

---

# 44. UC-042 — Regenerate Derived Catalog Artifacts

## Actor

Catalog Maintainer

## Goal

Rebuild generated indexes from canonical metadata.

## Scenario

The maintainer modifies:

```text
catalog/
presets/
roles/
```

and runs the generation process.

## Expected Outcome

Artifacts such as:

```text
component indexes
search indexes
marketplace manifests
```

are regenerated.

Deleting these generated files and regenerating them must not lose information.

## Related Requirements

```text
REQ-GEN-001
REQ-GEN-002
REQ-GEN-003
```

---

# 45. UC-043 — Detect Generated Artifact Drift

## Actor

Maintainer / CI

## Goal

Ensure generated artifacts remain synchronized with source metadata.

## Scenario

A catalog file changes but generated artifacts are not rebuilt.

CI runs:

```text
generate
+
git diff --exit-code
```

## Expected Outcome

CI fails and reports generated drift.

## Related Requirements

```text
REQ-GEN-004
```

---

# 46. UC-044 — Managed and Manual Runtime State Coexist

## Actor

Developer

## Goal

Allow `agent-plugins` to manage its own state without accidentally deleting unrelated manually configured tooling.

## Scenario

The runtime contains:

```text
agent-plugins-managed plugin A
agent-plugins-managed plugin B
manually installed plugin C
```

Project configuration no longer requires plugin B.

## Expected Outcome

Sync may remove or deactivate B.

It must not automatically remove C if C is outside the managed-state boundary.

## Related Requirements

```text
REQ-SYNC-004
```

---

# 47. UC-045 — A Publisher Changes Internal Structure

## Actor

Catalog Maintainer

## Goal

Adapt to upstream changes without modifying the entire domain model.

## Scenario

An upstream publisher changes:

```text
folder structure
manifest layout
component discovery mechanism
```

but its semantic capabilities remain the same.

## Expected Outcome

The source adapter is updated.

Roles, presets, and capability IDs remain unchanged wherever possible.

This validates the source adapter boundary.

---

# 48. UC-046 — A Runtime Changes Its Configuration Format

## Actor

Maintainer

## Goal

Adapt to target-runtime changes without redesigning core concepts.

## Scenario

Claude Code changes part of its native plugin configuration format.

## Expected Outcome

The Claude Code target adapter is updated.

The following remain stable:

```text
capabilities
presets
roles
project intent
```

This validates the target adapter boundary.

---

# 49. UC-047 — Publisher Implementation Is Removed

## Actor

Catalog Maintainer

## Goal

Understand the impact of upstream component removal.

## Scenario

The current preferred implementation of:

```text
engineering.debugging
```

is removed upstream.

## Expected Outcome

The update analysis identifies:

```text
removed component
affected capability
available alternatives
affected roles/presets
```

If another valid implementation exists, the catalog maintainer may deliberately promote it.

If none exists, validation should expose the unresolved capability.

---

# 50. UC-048 — Preferred Implementation Changes

## Actor

Catalog Maintainer

## Goal

Change publisher implementation without changing consumer intent.

## Scenario

Current mapping:

```text
engineering.architecture
→ Publisher A
```

New curated decision:

```text
engineering.architecture
→ Publisher B
```

## Expected Outcome

Roles continue referencing:

```text
engineering.architecture
```

Projects do not require manifest changes.

Projects receive the new implementation only when their resolution/lock state is intentionally updated.

---

# 51. UC-049 — Role Uses Shared Presets

## Actor

Role Maintainer

## Goal

Reuse capability sets without duplication.

## Scenario

Both:

```text
frontend-engineer
backend-engineer
```

require:

```text
workflow/core
engineering/core
```

## Expected Outcome

These capabilities are defined once in reusable presets.

Roles compose them rather than duplicating capability lists.

---

# 52. UC-050 — Minimal Environment Resolution

## Actor

Developer

## Goal

Avoid unnecessary package installation.

## Scenario

The selected role and presets require only:

```text
planning
TDD
debugging
frontend design
```

A publisher package exposes many unrelated capabilities.

## Expected Outcome

Where the target/publisher packaging model allows it, only required components should become active.

If the installation unit necessarily contains additional inactive components, the system should distinguish:

```text
installed package
```

from:

```text
active/resolved capabilities
```

The resolver should not intentionally activate unrelated capabilities.

## Related Requirements

```text
REQ-RES-009
```

---

# 53. UC-051 — Package Contains Multiple Required Components

## Actor

Resolver

## Goal

Avoid redundant installation of the same package.

## Scenario

Three capabilities resolve to components inside:

```text
superpowers
```

## Expected Outcome

The package should be installed once.

Multiple selected components may reference the same package.

Conceptually:

```text
Capability A ─┐
Capability B ─┼→ Package X
Capability C ─┘
```

Package resolution must operate separately from capability selection.

---

# 54. UC-052 — Same Package Provides Selected and Suppressed Components

## Actor

Resolver

## Goal

Distinguish package installation from component activation.

## Scenario

Package X contains:

```text
TDD implementation
debugging implementation
planning implementation
```

The resolver selects:

```text
debugging
planning
```

but TDD is owned by another publisher.

## Expected Outcome

Package X may still need installation for debugging and planning.

However, its TDD component must not be considered the active implementation of:

```text
engineering.testing.tdd
```

This is a key reason the model distinguishes:

```text
Package
```

from:

```text
Component
```

---

# 55. UC-053 — Project Explicitly Overrides an Implementation

## Actor

Advanced User / Project Maintainer

## Goal

Choose a non-default implementation for a specific project.

## Scenario

The default implementation is:

```text
engineering.testing.tdd
→ Superpowers
```

One project explicitly needs:

```text
Matt Pocock TDD
```

## Expected Outcome

The project may provide an explicit override if the policy allows it.

The resulting choice must be:

```text
visible
locked
explainable
```

The global capability mapping should remain unchanged.

## Priority

P1/P2 depending on V1 scope.

---

# 56. UC-054 — Project Disables an Inherited Capability

## Actor

Developer

## Goal

Remove a capability inherited from a role or preset.

## Scenario

A role normally includes:

```text
browser testing
```

but a particular project does not need it.

The project configures an explicit capability disable.

## Expected Outcome

The capability is removed from desired state unless another non-optional dependency requires it.

The system should be able to explain both:

```text
where it came from
```

and:

```text
why it was disabled
```

---

# 57. UC-055 — Required Capability Cannot Be Disabled

## Actor

Developer

## Goal

Avoid creating an internally inconsistent environment.

## Scenario

The user attempts to disable:

```text
capability B
```

but selected:

```text
capability A
```

requires B as a hard dependency.

## Expected Outcome

The system should reject the configuration or require the dependent capability to be removed first.

It must not create an invalid graph.

---

# 58. UC-056 — List Active Environment

## Actor

Developer

## Goal

See the current resolved agent environment.

## Scenario

The user runs:

```bash
ap list
```

## Expected Outcome

The output should prioritize semantic information.

Example:

```text
Role
frontend-engineer

Presets
workflow/core
engineering/core
stacks/nextjs

Capabilities
workflow.planning
engineering.testing.tdd
engineering.debugging
frontend.design

Packages
superpowers
frontend-design
...
```

The user should be able to understand both high-level intent and underlying implementation.

---

# 59. UC-057 — Use Agent Plugins Without a Hosted Service

## Actor

Individual Developer

## Goal

Use the complete core workflow locally.

## Scenario

The user has:

```text
repository catalog
CLI
project manifest
lockfiles
```

but no account or hosted registry.

## Expected Outcome

Core functionality remains available:

```text
init
validate
resolve
sync
diff
doctor
explain
```

subject to availability of required external package sources.

## Related Requirements

```text
REQ-NFR-002
REQ-TEAM-003
```

---

# 60. UC-058 — Core Resolution Without an LLM

## Actor

Developer / CI

## Goal

Resolve the environment deterministically without invoking an AI model.

## Scenario

CI executes project resolution.

## Expected Outcome

The system resolves:

```text
presets
capabilities
policy
implementations
versions
lockfile
```

using deterministic program logic.

No LLM call is required.

This ensures reproducibility and offline-capable core behavior.

---

# 61. Use Case Coverage Matrix

The following matrix summarizes the major areas exercised by the use cases.

| Area | Representative Use Cases |
|---|---|
| Roles | UC-001, UC-002, UC-003, UC-004 |
| Project composition | UC-005, UC-006 |
| Capability resolution | UC-007, UC-008, UC-011 |
| Policies | UC-009, UC-010, UC-027 |
| Explainability | UC-012, UC-013 |
| Reproducibility | UC-014, UC-015, UC-040 |
| Lockfile drift | UC-016 |
| Updates | UC-017, UC-018, UC-019 |
| Publisher integration | UC-020, UC-021, UC-045 |
| Capability normalization | UC-022 |
| Native plugins | UC-023, UC-024 |
| Target compatibility | UC-025, UC-026, UC-046 |
| Team governance | UC-028, UC-029 |
| Discovery | UC-030, UC-031 |
| Diagnostics | UC-032, UC-033 |
| Validation | UC-034, UC-035, UC-036 |
| Security | UC-037, UC-038 |
| CI | UC-039, UC-040 |
| Target generation | UC-041 |
| Generated artifacts | UC-042, UC-043 |
| Managed state | UC-044 |
| Publisher evolution | UC-047, UC-048 |
| Composition reuse | UC-049 |
| Minimal environment | UC-050 |
| Package/component distinction | UC-051, UC-052 |
| Overrides | UC-053, UC-054, UC-055 |
| Inspection | UC-056 |
| Local-first | UC-057 |
| Deterministic core | UC-058 |

---

# 62. V1 Critical Use Cases

The following use cases are considered critical for validating V1:

```text
UC-001  Frontend project initialization

UC-002  Backend project initialization

UC-003  Second Brain role

UC-004  Product Manager role

UC-007  Exclusive capability conflict resolution

UC-009  Policy filters implementation

UC-010  Required capability becomes unresolvable

UC-012  Explain resolution

UC-014  Reproduce environment

UC-015  Idempotent sync

UC-016  Detect manifest/lock drift

UC-017  Check publisher update

UC-020  Add publisher

UC-022  Normalize multiple publisher implementations

UC-023  Native capability

UC-025  Unsupported target capability

UC-033  Diagnose broken environment

UC-035  Detect dependency cycle

UC-037  Security-sensitive component policy

UC-039  CI validation

UC-041  Claude Code materialization

UC-050  Minimal environment resolution

UC-051  Package deduplication
```

Other use cases may be implemented later, but the architecture should not make them unnecessarily difficult.

---

# 63. Primary V1 Acceptance Journey

The strongest end-to-end V1 validation scenario is:

```text
Frontend Engineer
        ↓
Next.js Project
        ↓
Select Role
        ↓
Add Project Presets
        ↓
Resolve Capabilities
        ↓
Detect TDD overlap
        ↓
Apply Policy
        ↓
Select Implementations
        ↓
Deduplicate Packages
        ↓
Generate Lockfile
        ↓
Materialize Claude Code
        ↓
Explain Resolution
        ↓
Run Sync Again
        ↓
No Changes
```

If this journey works deterministically and is fully testable, the core architecture is viable.

---

# 64. Cross-Domain Validation Journey

A second important validation scenario is:

```text
Second Brain
      ↓
Research
Writing
Synthesis
Obsidian
      ↓
Resolve capabilities
      ↓
Use native + external publishers
      ↓
No unrelated engineering workflows
      ↓
Generate reproducible environment
```

This validates that the model is genuinely capability-oriented rather than accidentally designed only for coding agents.

---

# 65. Use Case Design Principles

Use cases should continue to follow these principles:

```text
describe user intent before implementation

capabilities before publishers

roles before plugin lists

explicit failure over hidden fallback

policy before priority

reproducibility over latest

explainability over magic

composition over specialization explosion
```

---

# 66. Use Cases in One Sentence

> **`agent-plugins` should let different users describe their role and project needs, then deterministically resolve the smallest policy-compliant set of agent capabilities while keeping every important decision explainable and reproducible.**