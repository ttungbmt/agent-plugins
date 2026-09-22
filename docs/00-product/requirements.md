# Requirements

## Overview

This document defines the functional and non-functional requirements for `agent-plugins`.

The requirements are derived from:

- the problems identified in `problem.md`,
- the desired future state described in `vision.md`,
- the objectives defined in `goals.md`,
- the scope boundaries defined in `non-goals.md`.

The purpose of this document is to define **what the system must support** before deciding **how the system will implement it**.

---

# 1. Requirement Conventions

Each requirement has a stable identifier.

Format:

```text
REQ-<DOMAIN>-<NUMBER>
```

Examples:

```text
REQ-CAP-001
REQ-RES-003
REQ-CLI-002
```

Requirement keywords follow this convention:

```text
MUST
Required for the specified scope.

SHOULD
Strongly recommended but may be deferred with justification.

MAY
Optional capability.
```

---

# 2. Requirement Priorities

Requirements are grouped into three priority levels.

## P0 — Core

Required to validate the fundamental product model.

## P1 — Important

Required for a practical and reliable V1.

## P2 — Future

Architecturally supported but not necessarily implemented in V1.

---

# 3. Core Domain Requirements

## REQ-DOM-001 — Publisher Model

**Priority:** P0

The system MUST represent a Publisher as an external or first-party source of agent tooling.

A Publisher MUST have:

```text
stable ID
display name
source metadata
ownership classification
trust metadata
```

Examples:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

---

## REQ-DOM-002 — Package Model

**Priority:** P0

The system MUST represent a Package as an installable or distributable unit provided by a Publisher.

A Package MUST reference exactly one Publisher.

A Package SHOULD include:

```text
source location
version information
target compatibility
update strategy
```

---

## REQ-DOM-003 — Component Model

**Priority:** P0

The system MUST represent components contained within packages.

Initial component types SHOULD support:

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

The domain model MUST allow additional component types to be added later.

---

## REQ-DOM-004 — Capability Model

**Priority:** P0

The system MUST represent capabilities independently from publishers and packages.

A Capability MUST have:

```text
stable capability ID
semantic meaning
cardinality
one or more possible implementations
```

Example:

```text
engineering.testing.tdd
```

---

## REQ-DOM-005 — Stable Capability IDs

**Priority:** P0

Capability IDs MUST remain independent of publisher names.

Valid:

```text
engineering.testing.tdd
```

Invalid as canonical capability ID:

```text
superpowers.tdd
```

---

## REQ-DOM-006 — Capability Namespace

**Priority:** P0

Capabilities MUST use hierarchical namespaces.

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
security.review
knowledge.research
product.discovery
```

The namespace format MUST be deterministic and documented.

---

# 4. Capability Implementation Requirements

## REQ-CAP-001 — Multiple Implementations

**Priority:** P0

A capability MUST be able to reference multiple candidate implementations.

Example:

```text
engineering.testing.tdd

→ superpowers/test-driven-development
→ mattpocock/tdd
→ ecc/tdd-workflow
```

---

## REQ-CAP-002 — Capability Cardinality

**Priority:** P0

Capabilities MUST support at least:

```text
one
many
```

`one` means only one implementation should normally be selected.

`many` means multiple compatible implementations may coexist.

---

## REQ-CAP-003 — Implementation Priority

**Priority:** P0

Candidate implementations MUST support explicit resolution priority.

Example:

```text
Superpowers     100
Matt Pocock      80
ECC              70
```

Priority alone SHOULD NOT bypass policy or compatibility constraints.

---

## REQ-CAP-004 — Capability Metadata

**Priority:** P1

Capabilities SHOULD support metadata such as:

```text
description
category
tags
stability
documentation references
```

---

## REQ-CAP-005 — Capability Aliases

**Priority:** P2

The system MAY support aliases for common alternative names.

Example:

```text
tdd
test-driven-development

→ engineering.testing.tdd
```

Aliases MUST NOT create multiple canonical capability identities.

---

# 5. Preset Requirements

## REQ-PRE-001 — Preset Model

**Priority:** P0

The system MUST support reusable Presets.

A Preset MUST be able to reference:

```text
capabilities
other presets
```

---

## REQ-PRE-002 — Capability-Oriented Presets

**Priority:** P0

Presets SHOULD reference capabilities rather than publisher-specific components.

Preferred:

```yaml
capabilities:
  - engineering.testing.tdd
  - engineering.debugging
```

Avoid:

```yaml
plugins:
  - superpowers
  - ecc
```

---

## REQ-PRE-003 — Preset Composition

**Priority:** P0

Presets MUST be composable.

Example:

```text
engineering/core
+
engineering/security
+
stacks/typescript
```

---

## REQ-PRE-004 — Preset Cycle Detection

**Priority:** P0

Preset dependency graphs MUST be acyclic.

The system MUST reject:

```text
Preset A
→ Preset B
→ Preset C
→ Preset A
```

---

## REQ-PRE-005 — Optional Preset Usage

**Priority:** P1

Users SHOULD be able to add or remove presets from a project without redefining a role.

---

# 6. Role Requirements

## REQ-PRO-001 — Role Model

**Priority:** P0

The system MUST support reusable Role baselines.

Initial representative roles SHOULD include:

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

## REQ-PRO-002 — Roles Compose Presets

**Priority:** P0

Roles MUST primarily compose Presets.

Roles SHOULD NOT directly depend on Publisher implementations.

---

## REQ-PRO-003 — Composition Over Inheritance

**Priority:** P0

Role composition SHOULD be preferred over role inheritance.

If inheritance is supported, it SHOULD remain shallow.

---

## REQ-PRO-004 — Role Reusability

**Priority:** P0

A Role MUST be reusable across multiple projects.

Project-specific technology stacks MUST NOT require redefining the Role.

---

# 7. Project Requirements

## REQ-PRJ-001 — Project Manifest

**Priority:** P0

A consumer project MUST be able to define its desired agent environment through a declarative project manifest.

Recommended filename:

```text
agent-plugins.yaml
```

---

## REQ-PRJ-002 — Project Role Selection

**Priority:** P0

A project MUST be able to select a Role.

Example:

```yaml
role: frontend-engineer
```

---

## REQ-PRJ-003 — Project Presets

**Priority:** P0

A project MUST be able to add project-specific Presets.

Example:

```yaml
presets:
  - stacks/nextjs
  - stacks/cloudflare
```

---

## REQ-PRJ-004 — Project Policy

**Priority:** P1

A project SHOULD be able to select a Policy.

Example:

```yaml
policy: default
```

---

## REQ-PRJ-005 — Project Targets

**Priority:** P0

A project MUST declare one or more target runtimes when required.

Example:

```yaml
targets:
  - claude-code
```

---

## REQ-PRJ-006 — Capability Overrides

**Priority:** P1

Projects SHOULD be able to explicitly enable or disable capabilities.

Example:

```yaml
overrides:
  capabilities:
    enable:
      - security.review

    disable:
      - devops.kubernetes
```

---

# 8. Policy Requirements

## REQ-POL-001 — Policy Model

**Priority:** P0

The system MUST support Policy as a first-class configuration concept.

Policies govern resolution and security-sensitive behavior.

---

## REQ-POL-002 — Source Trust

**Priority:** P0

Policy MUST be able to constrain allowed source trust levels.

Initial trust levels SHOULD support:

```text
first-party
official
curated
community
untrusted
```

---

## REQ-POL-003 — Executable Components

**Priority:** P0

Policy MUST be able to control security-sensitive component types such as:

```text
hooks
commands
scripts
MCP servers
```

---

## REQ-POL-004 — Policy Outcomes

**Priority:** P0

Policy evaluation SHOULD support outcomes equivalent to:

```text
allow
deny
prompt
review
```

where appropriate.

---

## REQ-POL-005 — Experimental Components

**Priority:** P1

Policy SHOULD be able to allow or reject experimental publishers or components.

---

## REQ-POL-006 — Publisher Preference

**Priority:** P1

Policy SHOULD support publisher or trust-class preference during resolution.

---

# 9. Resolution Requirements

## REQ-RES-001 — Deterministic Resolution

**Priority:** P0

Given identical:

```text
catalog
project manifest
role
presets
policy
version constraints
```

the resolver MUST produce the same result.

---

## REQ-RES-002 — Resolution Pipeline

**Priority:** P0

The resolver MUST conceptually process:

```text
Project
↓
Role
↓
Presets
↓
Capabilities
↓
Candidate implementations
↓
Policy filtering
↓
Conflict resolution
↓
Package resolution
↓
Target compatibility
↓
Lockfile
```

---

## REQ-RES-003 — Exclusive Capability Resolution

**Priority:** P0

For capabilities with:

```text
cardinality: one
```

the resolver MUST select no more than one active implementation unless explicitly overridden.

---

## REQ-RES-004 — Additive Capability Resolution

**Priority:** P0

For capabilities with:

```text
cardinality: many
```

the resolver MUST support multiple compatible implementations.

---

## REQ-RES-005 — Policy Before Selection

**Priority:** P0

Candidates rejected by policy MUST NOT be selected even if they have higher priority.

---

## REQ-RES-006 — Target Compatibility

**Priority:** P0

The resolver MUST exclude implementations incompatible with the selected target runtime.

---

## REQ-RES-007 — Resolution Failure

**Priority:** P0

If no valid implementation remains for a required capability, resolution MUST fail with an actionable diagnostic.

---

## REQ-RES-008 — Ambiguous Resolution

**Priority:** P0

If resolution remains ambiguous after all deterministic rules are applied, the system MUST fail or request an explicit override.

It MUST NOT silently guess.

---

## REQ-RES-009 — Minimal Resolution

**Priority:** P1

The resolver SHOULD avoid selecting components that do not satisfy an active capability or required dependency.

---

## REQ-RES-010 — Idempotence

**Priority:** P0

Repeated resolution of unchanged input MUST produce equivalent output.

---

# 10. Explainability Requirements

## REQ-EXP-001 — Resolution Trace

**Priority:** P0

Every selected capability implementation MUST be traceable through:

```text
Project
→ Role
→ Preset
→ Capability
→ Implementation
→ Package
→ Publisher
```

---

## REQ-EXP-002 — Explain Capability

**Priority:** P1

Users SHOULD be able to request an explanation of a resolved capability.

Example:

```bash
ap explain engineering.testing.tdd
```

---

## REQ-EXP-003 — Candidate Visibility

**Priority:** P1

Explanation output SHOULD show:

```text
all candidates
filtered candidates
selected implementation
suppressed implementations
selection reason
```

---

## REQ-EXP-004 — Error Paths

**Priority:** P0

Resolution errors MUST include the dependency path that caused the failure where practical.

Example:

```text
backend-engineer
→ engineering/security
→ security.review
→ no allowed implementation
```

---

# 11. Catalog Requirements

## REQ-CAT-001 — Catalog Publisher Registry

**Priority:** P0

The catalog MUST register supported Publishers.

---

## REQ-CAT-002 — Catalog Package Registry

**Priority:** P0

The catalog MUST register supported Packages.

---

## REQ-CAT-003 — Catalog Capability Registry

**Priority:** P0

The catalog MUST define canonical capabilities and their implementation mappings.

---

## REQ-CAT-004 — Catalog Validation

**Priority:** P0

The catalog MUST be validated before resolution.

Validation MUST detect at least:

```text
unknown publishers
unknown packages
invalid implementation references
duplicate IDs
invalid capability references
```

---

## REQ-CAT-005 — Curated Catalog

**Priority:** P0

Publisher support MUST NOT imply automatic inclusion of every upstream component.

Catalog curation MAY select only a subset of discovered components.

---

# 12. Source Adapter Requirements

## REQ-SRC-001 — Source Adapter Abstraction

**Priority:** P0

The system MUST define an abstraction for discovering external package and component metadata.

---

## REQ-SRC-002 — Publisher-Specific Discovery

**Priority:** P1

Publisher-specific adapters SHOULD be supported where generic discovery is insufficient.

Examples:

```text
Superpowers
ECC
Claude marketplace
```

---

## REQ-SRC-003 — Normalized Output

**Priority:** P0

Source adapters MUST normalize upstream data into the internal domain model.

---

## REQ-SRC-004 — Discovery Without Ownership Transfer

**Priority:** P0

Discovering an external component MUST NOT imply that the project owns or vendors that component.

---

# 13. Target Adapter Requirements

## REQ-TGT-001 — Target Adapter Abstraction

**Priority:** P0

The system MUST define a target adapter abstraction for materializing resolved state into runtime-specific artifacts.

---

## REQ-TGT-002 — Claude Code Target

**Priority:** P0

V1 MUST support Claude Code as the initial target runtime.

---

## REQ-TGT-003 — Target Validation

**Priority:** P0

A target adapter MUST validate whether the resolved components can be represented on that runtime.

---

## REQ-TGT-004 — Native Output

**Priority:** P1

Target adapters SHOULD preserve runtime-native functionality where practical.

---

## REQ-TGT-005 — Unsupported Capabilities

**Priority:** P0

If a capability cannot be represented on a target, the system MUST report it explicitly.

The system MUST NOT silently claim full support.

---

# 14. Lockfile Requirements

## REQ-LOCK-001 — Project Lockfile

**Priority:** P0

Resolution MUST be representable in a project lockfile.

Recommended filename:

```text
agent-plugins.lock
```

---

## REQ-LOCK-002 — Reproducible Metadata

**Priority:** P0

The project lockfile MUST record sufficient metadata to reproduce resolved state.

At minimum:

```text
publisher
package
component
capability
version or immutable reference
target information
```

---

## REQ-LOCK-003 — Immutable Upstream Reference

**Priority:** P1

Where supported, external packages SHOULD be pinned using immutable references such as:

```text
commit SHA
checksum
integrity hash
```

---

## REQ-LOCK-004 — Distribution Lock

**Priority:** P1

The distribution repository SHOULD maintain a separate catalog/distribution lock for tested upstream versions.

---

## REQ-LOCK-005 — Lockfile Drift Detection

**Priority:** P1

The CLI SHOULD detect when the project manifest and project lockfile no longer represent the same desired state.

---

# 15. Update Requirements

## REQ-UPD-001 — Explicit Updates

**Priority:** P0

Upstream updates MUST NOT silently change project state during normal synchronization.

---

## REQ-UPD-002 — Update Check

**Priority:** P1

The CLI SHOULD support checking for upstream changes without applying them.

Example:

```bash
ap update --check
```

---

## REQ-UPD-003 — Change Summary

**Priority:** P1

An update check SHOULD report:

```text
version changes
added components
removed components
changed components
affected capabilities
```

---

## REQ-UPD-004 — Security-Sensitive Changes

**Priority:** P1

Update analysis SHOULD identify changes involving:

```text
hooks
commands
scripts
MCP servers
```

where metadata is available.

---

## REQ-UPD-005 — Controlled Apply

**Priority:** P1

Applying an update SHOULD explicitly update the relevant distribution or project lock state.

---

# 16. Provenance Requirements

## REQ-PRV-001 — Publisher Provenance

**Priority:** P0

Every external package MUST retain its upstream Publisher identity.

---

## REQ-PRV-002 — Source Provenance

**Priority:** P0

External packages SHOULD retain:

```text
repository
version
commit
source location
```

where available.

---

## REQ-PRV-003 — Ownership Classification

**Priority:** P0

Components MUST be distinguishable by ownership classification.

At minimum:

```text
first-party
third-party
```

---

## REQ-PRV-004 — Derived Components

**Priority:** P2

First-party components derived from external work MAY record `derivedFrom` provenance.

---

# 17. Native Plugin Requirements

## REQ-NAT-001 — Native Plugin Support

**Priority:** P0

The repository MUST support first-party/native packages.

Recommended location:

```text
plugins/native/
```

---

## REQ-NAT-002 — Unified Resolution

**Priority:** P0

Native implementations MUST participate in the same capability resolution process as external implementations.

---

## REQ-NAT-003 — No External Copy Requirement

**Priority:** P0

External packages MUST NOT need to be copied into `plugins/native/` to participate in the system.

---

# 18. CLI Requirements

## REQ-CLI-001 — CLI Entry Point

**Priority:** P0

The project MUST provide a command-line interface.

Recommended executable:

```text
ap
```

---

## REQ-CLI-002 — Initialization

**Priority:** P0

The CLI MUST support:

```bash
ap init
```

to create an initial project manifest.

---

## REQ-CLI-003 — Synchronization

**Priority:** P0

The CLI MUST support:

```bash
ap sync
```

as the primary desired-state reconciliation operation.

---

## REQ-CLI-004 — List

**Priority:** P1

The CLI SHOULD support listing relevant domain entities.

---

## REQ-CLI-005 — Search

**Priority:** P1

The CLI SHOULD support search across:

```text
capabilities
presets
roles
publishers
packages
components
```

---

## REQ-CLI-006 — Explain

**Priority:** P1

The CLI SHOULD support resolution explanation.

---

## REQ-CLI-007 — Diff

**Priority:** P1

The CLI SHOULD support displaying desired vs actual state.

---

## REQ-CLI-008 — Doctor

**Priority:** P1

The CLI SHOULD support diagnostics for configuration and environment problems.

---

## REQ-CLI-009 — Update Check

**Priority:** P1

The CLI SHOULD support checking upstream updates.

---

## REQ-CLI-010 — Non-Interactive Operation

**Priority:** P0

Core commands such as:

```text
sync
validate
resolve
```

MUST support non-interactive execution suitable for CI.

---

# 19. Synchronization Requirements

## REQ-SYNC-001 — Desired State

**Priority:** P0

The project manifest MUST represent desired state.

---

## REQ-SYNC-002 — Reconciliation

**Priority:** P0

`ap sync` MUST reconcile runtime-managed state with resolved desired state.

---

## REQ-SYNC-003 — Idempotent Sync

**Priority:** P0

Running `ap sync` repeatedly with unchanged inputs MUST converge to the same state.

---

## REQ-SYNC-004 — Managed State Boundary

**Priority:** P1

The system SHOULD distinguish between state managed by `agent-plugins` and state managed manually by the user.

---

## REQ-SYNC-005 — No Implicit Upstream Upgrade

**Priority:** P0

`ap sync` MUST NOT implicitly upgrade external publisher versions unless explicitly configured to do so.

---

# 20. Validation Requirements

## REQ-VAL-001 — Schema Validation

**Priority:** P0

All authoritative manifest types MUST have machine-readable schemas or equivalent runtime validation.

---

## REQ-VAL-002 — Reference Validation

**Priority:** P0

The system MUST validate references between:

```text
publishers
packages
components
capabilities
presets
roles
policies
```

---

## REQ-VAL-003 — Cycle Detection

**Priority:** P0

The system MUST detect cycles in compositional dependency graphs.

---

## REQ-VAL-004 — Duplicate ID Detection

**Priority:** P0

Duplicate canonical IDs MUST fail validation.

---

## REQ-VAL-005 — Actionable Errors

**Priority:** P0

Validation errors MUST identify:

```text
what failed
where it failed
why it failed
```

---

# 21. Security Requirements

## REQ-SEC-001 — Security-Sensitive Component Classification

**Priority:** P0

The system MUST distinguish components that may execute code or interact with external systems.

Examples:

```text
hooks
scripts
commands
MCP servers
```

---

## REQ-SEC-002 — Pre-Execution Policy Evaluation

**Priority:** P0

Security-sensitive external components MUST be evaluated against policy before activation.

---

## REQ-SEC-003 — No Automatic Trust

**Priority:** P0

Popularity, repository stars, or public availability MUST NOT automatically grant trusted status.

---

## REQ-SEC-004 — Visible Provenance

**Priority:** P0

Users MUST be able to identify the origin of security-sensitive components.

---

## REQ-SEC-005 — No Sandbox Guarantee

**Priority:** P0

The system MUST NOT claim to provide a complete execution sandbox unless such a sandbox is actually implemented.

---

# 22. Generated Artifact Requirements

## REQ-GEN-001 — Generated State Separation

**Priority:** P0

Generated artifacts MUST be distinguishable from authoritative source data.

---

## REQ-GEN-002 — Regenerability

**Priority:** P0

Generated artifacts MUST be recreatable from authoritative inputs.

---

## REQ-GEN-003 — No Unique Generated Metadata

**Priority:** P0

Generated files MUST NOT contain unique configuration information that cannot be reproduced from authoritative sources.

---

## REQ-GEN-004 — Drift Detection

**Priority:** P1

CI SHOULD verify that committed generated artifacts are up to date.

---

# 23. Source-of-Truth Requirements

## REQ-SOT-001 — Canonical Metadata

**Priority:** P0

The project MUST define which files are authoritative.

---

## REQ-SOT-002 — Runtime Manifests Are Derived

**Priority:** P0

Runtime-specific marketplace or configuration artifacts SHOULD be generated from canonical data where practical.

---

## REQ-SOT-003 — No Duplicate Authority

**Priority:** P0

The same semantic metadata MUST NOT be maintained manually in multiple authoritative locations.

---

# 24. Non-Functional Requirements

## REQ-NFR-001 — Determinism

**Priority:** P0

Core resolution MUST be deterministic.

---

## REQ-NFR-002 — Offline Core Resolution

**Priority:** P1

Resolution SHOULD work without requiring an LLM or hosted control plane when all required catalog data is available locally.

---

## REQ-NFR-003 — Testability

**Priority:** P0

Core resolution logic MUST be testable independently of CLI and target runtime installation.

---

## REQ-NFR-004 — Modularity

**Priority:** P0

Core domain logic MUST remain separated from:

```text
CLI presentation
source-specific discovery
target-specific rendering
```

---

## REQ-NFR-005 — Extensibility

**Priority:** P1

The architecture SHOULD allow new:

```text
publishers
component types
capability domains
targets
policies
```

without redesigning unrelated core concepts.

---

## REQ-NFR-006 — Human Readability

**Priority:** P1

Primary configuration files SHOULD remain understandable and editable by humans.

---

## REQ-NFR-007 — Machine Validation

**Priority:** P0

Human-readable configuration MUST also be machine-validatable.

---

## REQ-NFR-008 — Clear Diagnostics

**Priority:** P0

Errors and conflicts MUST provide useful context rather than generic failure messages.

---

## REQ-NFR-009 — Reasonable Performance

**Priority:** P1

Local resolution SHOULD remain responsive for expected V1 catalog sizes without requiring distributed infrastructure.

---

## REQ-NFR-010 — Backward Evolution

**Priority:** P1

Manifest schemas SHOULD be versioned to support controlled evolution.

Initial API version:

```text
agent-plugins.dev/v1alpha1
```

---

# 25. Multi-Runtime Requirements

## REQ-MRT-001 — Runtime-Independent Core

**Priority:** P0

The core domain model MUST NOT depend exclusively on Claude Code concepts.

---

## REQ-MRT-002 — Initial Target Scope

**Priority:** P0

V1 MAY implement only Claude Code as the first target.

---

## REQ-MRT-003 — Additional Targets

**Priority:** P2

The architecture SHOULD support future adapters for:

```text
Codex
Gemini
OpenCode
Hermes
```

---

## REQ-MRT-004 — No Guaranteed Parity

**Priority:** P1

The system MUST be able to report differences in capability support across target runtimes.

---

# 26. Team and Organization Requirements

## REQ-TEAM-001 — Shared Policies

**Priority:** P2

The architecture SHOULD allow reusable shared policies across multiple projects.

---

## REQ-TEAM-002 — Shared Presets

**Priority:** P1

Presets SHOULD be reusable across multiple projects and teams.

---

## REQ-TEAM-003 — Local Operation

**Priority:** P0

Team features MUST NOT be required for individual local usage.

---

# 27. Documentation Requirements

## REQ-DOC-001 — Canonical Documentation

**Priority:** P0

Core concepts MUST have canonical documentation.

At minimum:

```text
Publisher
Package
Component
Capability
Preset
Role
Policy
Project
Resolver
Lockfile
```

---

## REQ-DOC-002 — Architecture Decisions

**Priority:** P1

Significant architectural decisions SHOULD be recorded as ADRs.

---

## REQ-DOC-003 — Example Configurations

**Priority:** P1

Documentation SHOULD contain realistic examples for at least:

```text
Frontend Engineer
Backend Engineer
Product Manager
Second Brain
```

---

# 28. Testing Requirements

## REQ-TST-001 — Schema Tests

**Priority:** P0

All manifest schemas MUST have automated tests.

---

## REQ-TST-002 — Resolver Tests

**Priority:** P0

The resolver MUST have automated tests for:

```text
exclusive capability resolution
additive capabilities
policy rejection
target incompatibility
ambiguous resolution
preset composition
cycle detection
```

---

## REQ-TST-003 — Reproducibility Tests

**Priority:** P0

Tests MUST verify that identical inputs produce equivalent resolved output.

---

## REQ-TST-004 — Adapter Tests

**Priority:** P0

Target adapters MUST have tests validating generated artifacts.

---

## REQ-TST-005 — End-to-End Test

**Priority:** P1

V1 SHOULD include at least one end-to-end test covering:

```text
project manifest
→ resolution
→ lockfile
→ Claude Code materialization
```

---

# 29. V1 Required User Flow

V1 MUST support the following conceptual workflow:

```text
1. Initialize project

   ap init

2. Select or define:

   role
   presets
   target
   policy

3. Resolve environment

   ap sync

4. Produce:

   agent-plugins.lock

5. Materialize target configuration

6. Inspect:

   ap explain
   ap diff
   ap doctor
```

---

# 30. V1 Required Domain Scope

The following domain entities MUST be supported in V1:

```text
Publisher
Package
Component
Capability
Preset
Role
Policy
Project
Resolution
Lockfile
```

---

# 31. V1 Required Infrastructure

V1 MUST include:

```text
schemas
catalog loader
catalog validation

dependency graph
resolver
conflict resolution
policy evaluation

project lockfile

source adapter abstraction
Claude Code target adapter

CLI foundation
```

---

# 32. V1 Publisher Scope

V1 SHOULD demonstrate integration with multiple publisher types.

Recommended publishers:

```text
Superpowers
Matt Pocock Skills
ECC
Anthropic
wshobson/agents
agent-plugins native
```

Full ingestion of every publisher component is NOT required.

---

# 33. V1 Role Scope

V1 SHOULD include at least:

```text
frontend-engineer
backend-engineer
product-manager
second-brain
```

These roles should validate that the composition model works across significantly different use cases.

---

# 34. V1 Exit Criteria

V1 should not be considered functionally complete until all of the following are true:

```text
✓ project manifest validates

✓ publishers/packages/components can be represented

✓ capabilities can map to multiple implementations

✓ presets compose capabilities

✓ roles compose presets

✓ policy can reject candidates

✓ exclusive capability conflicts resolve deterministically

✓ unresolved capabilities fail clearly

✓ project lockfile is generated

✓ repeated resolution is stable

✓ Claude Code target can be materialized

✓ ap sync is idempotent

✓ ap explain can show resolution provenance

✓ automated resolver tests pass

✓ at least four representative roles resolve successfully
```

---

# 35. Deferred Requirements

The following are intentionally deferred beyond V1:

```text
hosted registry

GUI

cloud control plane

organization accounts

RBAC

SSO

AI recommendation engine

automatic capability classification

advanced project auto-detection

overlay / patch engine

full source vendoring

runtime parity across all agent systems

public plugin ratings

usage telemetry

monetization infrastructure
```

The architecture MAY leave extension points for these capabilities.

---

# 36. Requirement Traceability

Requirements should eventually be traceable through:

```text
Problem
   ↓
Goal
   ↓
Requirement
   ↓
Use Case
   ↓
Architecture / Specification
   ↓
Implementation
   ↓
Test
```

Example:

```text
Problem:
Capability duplication

↓

Goal:
Resolve overlap deterministically

↓

Requirement:
REQ-RES-003

↓

Use Case:
Frontend Engineer with multiple TDD publishers

↓

Test:
resolver selects one implementation
```

---

# 37. Requirement Change Rule

A requirement SHOULD be changed only when at least one of the following changes:

```text
problem understanding
product goal
scope boundary
validated user need
architectural constraint
runtime capability
```

Implementation difficulty alone SHOULD NOT silently redefine product requirements.

If implementation reveals an important design trade-off, the decision SHOULD be documented explicitly.

---

# 38. Requirements Summary

The core requirements can be summarized as:

```text
Declare intent
      ↓
Compose reusable roles and presets
      ↓
Normalize into capabilities
      ↓
Resolve implementations deterministically
      ↓
Apply policy and trust constraints
      ↓
Record provenance and versions
      ↓
Generate reproducible lock state
      ↓
Materialize native target configuration
      ↓
Explain every important decision
```

---

# 39. Requirement in One Sentence

> **`agent-plugins` must allow users to declare the capabilities they need and deterministically transform that intent into a minimal, policy-compliant, explainable, reproducible agent environment.**