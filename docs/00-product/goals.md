# Goals

## Overview

This document defines the goals that `agent-plugins` must achieve.

The goals are intentionally written at the product and system level. They describe the outcomes the project should enable rather than prescribing implementation details.

The project should make AI agent tooling:

- easier to compose,
- easier to reuse,
- easier to govern,
- easier to reproduce,
- easier to understand,
- easier to update safely.

---

# 1. Configure by Intent

Users should be able to describe what they need without manually selecting every plugin or repository.

Preferred:

```yaml
profile: frontend-engineer

presets:
  - nextjs
  - cloudflare
  - security
```

Rather than:

```yaml
plugins:
  - superpowers
  - ecc
  - matt-skills
  - frontend-design
  - browser-plugin
  - security-plugin
```

The system should translate higher-level intent into concrete implementations.

## Success Criteria

A typical project should be configurable primarily through:

```text
profile
+
presets
+
policy
+
project overrides
```

without requiring users to manually enumerate most underlying components.

---

# 2. Establish a Stable Capability Model

The project should define a normalized semantic layer representing what components actually do.

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.architecture
security.review
knowledge.research
product.discovery
```

This capability model should remain relatively stable even when providers change.

## Success Criteria

Different provider implementations of the same semantic behavior can be mapped to a shared capability.

Example:

```text
Superpowers TDD
Matt Pocock TDD
ECC TDD

        ↓

engineering.testing.tdd
```

---

# 3. Separate Intent From Implementation

User and project configuration should not be tightly coupled to individual providers.

The preferred dependency direction is:

```text
Profile
   ↓
Preset
   ↓
Capability
   ↓
Implementation
   ↓
Provider
```

not:

```text
Profile
   ↓
Provider-specific plugin list
```

## Success Criteria

A capability implementation can be replaced without requiring changes to every profile or project that uses it.

---

# 4. Provide Reusable Presets

The project should provide small, meaningful, composable presets.

Examples:

```text
workflow/core
engineering/core
engineering/security
engineering/testing

stacks/typescript
stacks/nextjs
stacks/python

domains/frontend
domains/backend
domains/product

knowledge/research
knowledge/writing
```

Presets should reduce repeated project configuration.

## Success Criteria

Common capability groups are defined once and reused across multiple profiles and projects.

---

# 5. Provide Role-Based Profiles

The project should provide profiles for common working contexts.

Initial profiles should include:

```text
software-engineer
frontend-engineer
backend-engineer
fullstack-engineer
platform-engineer
product-manager
researcher
second-brain
```

Profiles should provide sensible defaults while remaining customizable.

## Success Criteria

A new user can select a profile and receive a useful baseline without manually choosing individual capabilities.

---

# 6. Keep Role and Project Concerns Separate

Profiles should describe relatively stable working roles.

Projects should describe repository-specific requirements.

Example:

```text
Role
Frontend Engineer

Project A
Next.js + Cloudflare

Project B
React + Vite

Project C
Astro
```

The same profile should work across multiple projects.

## Success Criteria

Changing project stack requirements does not require redefining the user's role profile.

---

# 7. Resolve Capability Overlap Deterministically

When multiple providers implement the same capability, the system should resolve the overlap predictably.

Example:

```text
engineering.testing.tdd

Candidates:
- Superpowers
- Matt Pocock
- ECC
```

The resolver should select an implementation based on explicit rules.

Possible factors include:

```text
capability priority
policy
trust level
target compatibility
version compatibility
project override
```

## Success Criteria

Identical inputs always produce the same selected implementation.

---

# 8. Support Capability Cardinality

The system should distinguish between capabilities where only one implementation should normally be active and capabilities where multiple implementations may coexist.

Example:

```text
cardinality: one

engineering.testing.tdd
workflow.planning
engineering.debugging
```

Example:

```text
cardinality: many

framework expertise
research tools
database knowledge
security knowledge
```

## Success Criteria

The resolver handles both exclusive and additive capabilities without relying on hard-coded special cases.

---

# 9. Minimize Agent Environment Size

The system should avoid installing or activating unnecessary components.

The objective is not:

```text
maximum number of plugins
```

but:

```text
minimum coherent capability set
```

for the current role and project.

## Success Criteria

Components that do not satisfy an active capability or required dependency are not included in the resolved environment by default.

---

# 10. Reduce Context Pollution

The project should reduce unnecessary:

- instructions,
- rules,
- agents,
- workflows,
- tool definitions.

Capability deduplication should help prevent multiple competing implementations from entering the same environment unnecessarily.

## Success Criteria

Exclusive capabilities do not activate multiple competing implementations unless explicitly overridden.

---

# 11. Preserve Provenance

Every resolved component should be traceable to its source.

The system should be able to answer:

```text
Who provides this component?

Which package contains it?

Which version is installed?

Which commit was selected?

Which capability does it implement?

Why was it included?
```

## Success Criteria

Resolved components retain provider, package, version, source, and capability mapping metadata.

---

# 12. Make Resolution Explainable

The resolver must not behave as a black box.

Users should be able to inspect decisions.

Example:

```bash
ap explain engineering.testing.tdd
```

Expected information:

```text
Required by:
frontend-engineer
→ engineering/core

Candidates:
Superpowers
Matt Pocock
ECC

Selected:
Superpowers

Reason:
highest-priority compatible implementation
allowed by current policy
```

## Success Criteria

Every selected implementation can be traced through:

```text
Project
→ Profile
→ Preset
→ Capability
→ Implementation
```

---

# 13. Make Environments Reproducible

A project should be able to reconstruct its agent environment across machines.

Expected workflow:

```bash
git clone project
ap sync
```

The resulting environment should resolve to the same:

- providers,
- packages,
- components,
- versions,
- capability mappings,
- policy decisions.

## Success Criteria

The project lockfile contains sufficient information to reproduce resolved state deterministically.

---

# 14. Control Upstream Versions

External providers should not silently drift to arbitrary latest versions.

The project should support explicit version and commit pinning.

## Success Criteria

A tested upstream state can be recorded and reused through a distribution-level lock.

---

# 15. Support Safe Updates

Users should be able to inspect upstream changes before adopting them.

Example:

```bash
ap update --check
```

The system should surface:

```text
provider version changes
added components
removed components
changed components
capability impact
potential conflicts
security-sensitive changes
```

## Success Criteria

An upstream update does not silently change the resolved project environment.

---

# 16. Support Trust and Security Policies

The system should allow environments to define which external behavior is permitted.

Examples:

```text
external hooks
MCP servers
commands
scripts
experimental providers
community sources
```

Different contexts should be able to apply different policies.

Example:

```text
Personal
Work
Enterprise
```

## Success Criteria

Security-sensitive components are visible to policy evaluation before installation or activation.

---

# 17. Support Multiple Trust Levels

Providers and packages should be classifiable into trust categories.

Initial model:

```text
first-party
official
curated
community
untrusted
```

## Success Criteria

Trust classification can influence resolution and installation behavior.

---

# 18. Support Native First-Party Capabilities

The project should be able to own and maintain capabilities that are specific to its ecosystem.

Examples may include:

```text
product-management
second-brain
GIS
project architecture
documentation workflows
agent development
```

These should coexist with external providers under the same capability model.

## Success Criteria

Native and external implementations participate in the same resolution system.

---

# 19. Avoid Unnecessary Forking

The project should prefer referencing and integrating upstream providers rather than copying their source.

External source should only be vendored or forked when there is a clear technical or maintenance reason.

## Success Criteria

Most third-party packages remain linked to their upstream provenance.

---

# 20. Separate Source Discovery From Target Distribution

The system should distinguish between:

```text
Where capabilities come from
```

and:

```text
Where capabilities are installed
```

This means maintaining separate abstractions for:

```text
Source Adapters
Target Adapters
```

## Success Criteria

A provider integration can evolve independently from a runtime integration.

---

# 21. Support Multiple Agent Runtimes

The architecture should support multiple target runtimes over time.

Target environments may include:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

V1 may support only a subset, but the core domain model must not depend exclusively on one runtime.

## Success Criteria

Adding a new target runtime does not require redesigning the capability or preset model.

---

# 22. Preserve Native Runtime Semantics

Target runtimes should receive native artifacts whenever possible.

The system should not force every runtime into a lowest-common-denominator representation.

## Success Criteria

Target-specific features can be represented through target adapters without polluting the shared semantic domain model.

---

# 23. Maintain One Source of Truth

Authoritative metadata must be clearly separated from generated artifacts.

Conceptually:

```text
Authoritative
↓
Generated
↓
Consumer State
```

Example:

```text
catalog/
presets/
profiles/
policies/

        ↓

generated/
marketplace files

        ↓

project manifest
project lockfile
```

## Success Criteria

The same metadata is not manually maintained in multiple authoritative locations.

---

# 24. Generate Derived Artifacts

Derived files such as:

```text
component indexes
search indexes
target registries
marketplace manifests
```

should be generated from canonical metadata.

## Success Criteria

Generated artifacts can be deleted and recreated without losing information.

---

# 25. Provide Strong Validation

The system should validate:

- schemas,
- provider references,
- package references,
- capability mappings,
- preset references,
- profile references,
- target compatibility,
- dependency cycles,
- conflicting implementations.

## Success Criteria

Invalid configuration fails early with actionable diagnostics.

---

# 26. Detect Dependency Cycles

Composition graphs must remain acyclic.

Invalid example:

```text
Preset A
→ Preset B
→ Preset C
→ Preset A
```

## Success Criteria

Cycles are detected before resolution or installation.

---

# 27. Provide Useful Diagnostics

Errors should explain both the problem and the relevant dependency path.

Example:

```text
Unable to resolve security.review

Required by:
backend-engineer
→ engineering/security

Reason:
all implementations rejected by policy
```

## Success Criteria

Users can identify the source of a resolution failure without manually inspecting the full dependency graph.

---

# 28. Provide a Simple CLI Experience

The system should expose common operations through a small, predictable CLI.

Initial command surface:

```text
ap init
ap sync
ap add
ap remove

ap list
ap search
ap explain
ap diff
ap doctor

ap preset ...
ap profile ...

ap update
```

## Success Criteria

The most common workflows require only a few high-level commands.

---

# 29. Make `sync` the Primary Reconciliation Operation

Users should not need to manually maintain runtime installation state.

The project manifest describes desired state.

`ap sync` reconciles actual state with desired state.

Conceptually:

```text
Desired State
      ↓
Resolution
      ↓
Actual State
```

## Success Criteria

Repeated execution of `ap sync` is safe and converges toward the same result.

---

# 30. Support Search and Discovery

Users should be able to search across:

```text
capabilities
presets
profiles
providers
packages
components
```

without knowing exact repository names.

## Success Criteria

A search such as:

```bash
ap search tdd
```

can reveal relevant capability and implementation information.

---

# 31. Support Team Standardization

Teams should eventually be able to share:

```text
approved providers
preferred implementations
required presets
security policies
version constraints
```

without duplicating configuration in every project.

## Success Criteria

Shared policy and composition layers can be reused across multiple projects.

---

# 32. Remain Useful for Individual Users

The architecture must not require enterprise infrastructure.

A single developer should be able to use the project locally for:

```text
software development
Second Brain
research
product management
automation
personal AI workflows
```

## Success Criteria

The core system operates without requiring a hosted control plane or account.

---

# 33. Keep the Core Deterministic

AI may assist with future recommendations, but deterministic configuration and resolution must remain the foundation.

The project should not require an LLM to:

```text
resolve dependencies
select locked versions
apply policies
reproduce environments
```

## Success Criteria

Core resolution works offline against available catalog and lock data.

---

# 34. Keep the Architecture Extensible

The design should support future additions such as:

```text
new providers
new component types
new capability domains
new target runtimes
new policy fields
new source formats
```

without redesigning the core model.

## Success Criteria

Extensions can be introduced through defined interfaces rather than modifying unrelated layers.

---

# 35. Keep V1 Focused

V1 should prove the core model before expanding the ecosystem.

The initial focus should be:

```text
Provider
Package
Component
Capability
Preset
Profile
Policy
Project

Catalog
Resolver
Lockfile

Claude Code target
CLI
```

## Success Criteria

The core resolution workflow works end to end before advanced platform features are introduced.

---

# 36. V1 Product Goals

V1 should enable the following workflow:

```bash
ap init
```

Create:

```text
agent-plugins.yaml
```

Then:

```bash
ap sync
```

Resolve:

```text
Project
+
Profile
+
Presets
+
Policy
        ↓
Capabilities
        ↓
Implementations
        ↓
Packages
        ↓
Components
        ↓
Claude Code environment
```

and generate:

```text
agent-plugins.lock
```

Users should also be able to run:

```bash
ap explain
ap diff
ap doctor
ap update --check
```

---

# 37. V1 Technical Goals

The first implementation should establish:

```text
canonical schemas

catalog loader

dependency graph

capability resolver

conflict resolver

policy evaluator

lockfile writer

source adapter abstraction

Claude Code target adapter

CLI foundation

validation framework
```

These components should establish the foundation for future runtimes.

---

# 38. V1 Provider Goals

The initial curated catalog should demonstrate integration with multiple provider styles.

Recommended initial providers:

```text
Superpowers
Matt Pocock Skills
ECC
Anthropic
wshobson/agents
native agent-plugins
```

The objective is not to integrate everything each provider offers.

The objective is to prove:

```text
discovery
normalization
capability mapping
overlap resolution
version pinning
```

across heterogeneous sources.

---

# 39. V1 Profile Goals

At minimum, V1 should provide representative profiles for different types of work:

```text
frontend-engineer
backend-engineer
product-manager
second-brain
```

These four profiles intentionally test very different capability compositions.

They demonstrate that the model is not limited to software engineering alone.

---

# 40. V1 Quality Goals

Before V1 is considered stable:

```text
all manifests validate

resolution is deterministic

dependency cycles are detected

exclusive capability conflicts resolve consistently

lockfiles reproduce selected state

generated files have no drift

core resolution has automated tests

Claude Code integration passes end-to-end testing
```

---

# 41. Long-Term Goals

Beyond V1, the project should gradually support:

```text
more target runtimes

more providers

organization policies

shared catalogs

compatibility analysis

context optimization

provider health analysis

security metadata

update impact analysis

preset recommendations

project auto-detection
```

These capabilities should build on the deterministic core rather than replace it.

---

# 42. North Star Goal

The primary product goal is:

> **A user should be able to describe their role, project, and desired capabilities, then reliably obtain the smallest coherent AI agent environment that satisfies those needs.**

All major product decisions should be evaluated against this goal.

---

# 43. Goal Hierarchy

The goals can be summarized as:

```text
User Intent
    ↓
Simple configuration
    ↓
Reusable composition
    ↓
Stable capability model
    ↓
Deterministic resolution
    ↓
Minimal coherent environment
    ↓
Explainable decisions
    ↓
Reproducible state
    ↓
Controlled updates
    ↓
Portable distribution
```

---

# 44. Guiding Goal Principles

The project should optimize for:

```text
intent over implementation

capabilities over repositories

composition over duplication

curation over accumulation

minimal environments over maximal installation

determinism over implicit selection

explainability over hidden automation

provenance over opaque dependencies

controlled updates over latest-by-default

reproducibility over configuration drift

stable semantics over provider coupling

native runtime support over lowest-common-denominator output
```

---

# 45. Goals in One Sentence

> **Make AI agent environments easy to declare, intelligently compose, deterministically resolve, safely govern, reliably reproduce, and eventually distribute across runtimes.**