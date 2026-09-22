# Vision

## Overview

`agent-plugins` aims to become a **curated capability resolver and distribution layer for AI agent tooling**.

The project is designed for a future where developers, teams, and knowledge workers use multiple AI agent runtimes, each with its own ecosystem of:

- plugins,
- skills,
- agents,
- commands,
- hooks,
- rules,
- MCP servers,
- workflows,
- integrations.

Instead of managing these building blocks directly, users should be able to describe **what they need**, while `agent-plugins` determines **how those needs are satisfied**.

The long-term vision is simple:

> **Users should compose AI agent environments by capability, role, and project — not by manually assembling repositories and plugins.**

---

# 1. Vision Statement

> **Make AI agent environments composable, reproducible, explainable, and portable across tools and projects.**

`agent-plugins` should provide a consistent semantic layer between user intent and the rapidly evolving ecosystem of AI agent tooling.

---

# 2. The Future We Want

Today, users think in terms such as:

```text
install Superpowers
install ECC
install Matt Pocock Skills
install frontend-design
```

The desired future is:

```text
I am a frontend engineer.

This project uses:
- Next.js
- TypeScript
- Cloudflare

I need:
- planning
- TDD
- debugging
- frontend design
- browser testing
- security review
```

The system then resolves these requirements into the most appropriate implementations.

```text
Intent
  ↓
Capabilities
  ↓
Resolution
  ↓
Publishers
  ↓
Runtime-specific installation
```

Users should not need to understand every upstream repository in order to build a high-quality agent environment.

---

# 3. Product Positioning

`agent-plugins` is not intended to be only a plugin collection.

It is not intended to be only a marketplace.

It is not intended to be another large bundle of skills.

Its role is the layer between:

```text
Agent Tooling Ecosystem
        ↓
    agent-plugins
        ↓
User / Project Environment
```

Its primary responsibility is to answer:

> **Given this role, project, policy, and target runtime, which capabilities should be active and which implementations should provide them?**

---

# 4. Core Product Idea

The project is built around a capability-first model.

```text
Publisher
   ↓
Package
   ↓
Component
   ↓
Capability
   ↓
Preset
   ↓
Profile + Project + Policy
   ↓
Resolver
   ↓
Lockfile
   ↓
Target Runtime
```

Publishers supply implementations.

Users operate at a higher abstraction level.

This separates:

```text
What the user needs
```

from:

```text
Who implements it
```

and:

```text
How it is installed
```

---

# 5. Capability-First Configuration

The central abstraction of `agent-plugins` is the **Capability**.

Examples:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.review
engineering.architecture

frontend.design
frontend.accessibility

security.review

knowledge.research
knowledge.synthesis

product.discovery
```

A capability may have multiple implementations.

For example:

```text
engineering.testing.tdd

├── Superpowers
├── Matt Pocock
└── ECC
```

Users should generally request:

```text
engineering.testing.tdd
```

rather than manually choosing and configuring every publisher.

---

# 6. Curated Rather Than Accumulated

The goal is not to maximize the number of installed plugins.

The goal is to produce the most coherent environment.

The project should favor:

```text
curation over accumulation
```

A high-quality profile may use components from many publishers without installing everything those publishers offer.

For example:

```text
Superpowers
→ workflow discipline

Matt Pocock
→ engineering depth

ECC
→ specialist agents and security

Anthropic
→ official integrations

Community publishers
→ specialized capabilities

Native plugins
→ project-owned capabilities
```

Each publisher should be used where it provides the strongest fit.

---

# 7. Smallest Coherent Environment

An important design goal is:

> **Build the smallest coherent agent environment that satisfies the current user, project, and task.**

The system should actively avoid unnecessary components.

Instead of:

```text
Install 100 skills
```

the preferred result may be:

```text
12 capabilities
implemented by
8 components
from
4 publishers
```

This reduces:

- context pollution,
- workflow conflicts,
- unnecessary instructions,
- maintenance cost,
- security surface.

---

# 8. Role-Based Experience

Users should be able to start from a role.

Examples:

```text
Frontend Engineer
Backend Engineer
Full-stack Engineer
Platform Engineer
Product Manager
Researcher
Second Brain
```

A profile represents a reusable working context.

Example:

```text
frontend-engineer

├── workflow/core
├── engineering/core
├── engineering/testing
├── frontend
└── typescript
```

Profiles provide sensible defaults without locking users into a rigid environment.

---

# 9. Project-Aware Composition

Profiles describe the user or working role.

Projects describe the current repository.

The two should remain separate.

Example:

```text
User
Frontend Engineer

Project A
Next.js + Cloudflare

Project B
React + Vite

Project C
Astro
```

The profile remains stable while project-specific presets change.

This enables:

```text
Role defaults
+
Project requirements
+
Policy
=
Resolved environment
```

---

# 10. Presets as Reusable Building Blocks

Presets provide reusable compositions of capabilities.

Examples:

```text
workflow/core
engineering/core
engineering/security

stacks/typescript
stacks/nextjs
stacks/python

domains/frontend
domains/backend
domains/product

knowledge/research
knowledge/writing
```

Presets should be small enough to compose but meaningful enough to reuse.

The preferred model is:

```text
small composable presets
```

rather than:

```text
large monolithic bundles
```

---

# 11. Publisher Independence

User configuration should survive publisher changes.

For example, if today:

```text
engineering.testing.tdd
→ Superpowers
```

but a better implementation becomes available later:

```text
engineering.testing.tdd
→ Publisher X
```

a project should not need to rewrite its intent.

Its configuration should remain:

```text
engineering.testing.tdd
```

This is one of the most important long-term properties of the system.

---

# 12. Deterministic Resolution

The same inputs should produce the same result.

Given:

```text
catalog
+
project manifest
+
profile
+
policy
+
lockfile constraints
```

the resolver should produce a deterministic environment.

Resolution should consider:

```text
capability requirements
publisher preference
implementation priority
trust level
target compatibility
version constraints
project overrides
```

The result must be reproducible and testable.

---

# 13. Explainability

Automation must not make the system opaque.

Users should always be able to ask:

```text
Why is this installed?

Which capability does it provide?

Which preset requested it?

Which profile requested that preset?

Why was this implementation selected?

What alternatives were available?
```

The project should make resolution explainable by design.

Example:

```text
engineering.testing.tdd

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

---

# 14. Reproducibility

An agent environment should be reproducible like an application dependency environment.

A project should be able to contain:

```text
agent-plugins.yaml
agent-plugins.lock
```

so that:

```bash
git clone project
ap sync
```

reconstructs the same environment.

Reproducibility should include:

- publisher,
- package,
- component,
- version,
- commit,
- capability mapping,
- policy-sensitive decisions.

---

# 15. Safe and Controlled Updates

Upstream publishers change continuously.

Updates should therefore be intentional.

The desired experience is:

```bash
ap update --check
```

followed by:

```text
Publisher changed

Added components
Changed components
Removed components

Affected capabilities
Potential conflicts
Security-sensitive changes
```

The user or maintainer can then decide whether to adopt the update.

The project should favor:

```text
controlled updates
```

over:

```text
silent latest-version drift
```

---

# 16. Trust-Aware Agent Tooling

AI agent components may execute more than prompts.

They may include:

```text
hooks
commands
scripts
MCP servers
external binaries
```

The system should make trust and execution boundaries explicit.

A personal environment might allow:

```text
community components
experimental publishers
external hooks
```

while an enterprise environment might require:

```text
approved publishers only
pinned versions
restricted execution
no external hooks
```

Trust should therefore be part of the resolution model.

---

# 17. Multi-Runtime Future

The long-term system should not be tied to one agent runtime.

The semantic configuration should eventually support:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
future runtimes
```

The architecture should remain:

```text
Shared semantic model
        ↓
Resolved capabilities
        ↓
Target adapter
        ↓
Native runtime configuration
```

Each runtime should receive artifacts designed for its native model rather than being forced into a universal lowest-common-denominator format.

---

# 18. Native and External Capabilities

The system should support both:

```text
External publishers
```

and:

```text
Native first-party capabilities
```

External publishers may include established open-source or official ecosystems.

Native capabilities should exist where this project has genuine ownership or specialized requirements.

Examples may include:

```text
product-management
second-brain
GIS
project architecture
documentation workflows
agent development
```

The project should avoid copying third-party capabilities simply to make them appear native.

---

# 19. A Stable Layer Above a Fast-Moving Ecosystem

Individual repositories may:

```text
appear
disappear
rename
split
merge
change formats
change installation models
```

The capability layer should remain comparatively stable.

For example:

```text
Publisher implementation changes
         ↓

engineering.testing.tdd

         ↑
remains stable
```

This stable semantic layer is one of the main long-term values of `agent-plugins`.

---

# 20. Team and Organization Use

The project should eventually support teams that want shared standards without eliminating individual flexibility.

For example:

```text
Organization Policy
├── approved publishers
├── required security review
├── pinned workflow
└── restricted hooks

Team Presets
├── backend
├── frontend
└── platform

Project
├── nextjs
└── cloudflare

Developer
└── optional research preset
```

This allows governance and customization to coexist.

---

# 21. Personal Use

The same architecture should remain useful for individuals.

Examples:

```text
Software development
Personal AI OS
Second Brain
Research
Writing
Automation
Product management
```

A user should be able to maintain one capability ecosystem and reuse it across many projects and working contexts.

---

# 22. Developer Experience

The final user experience should feel closer to a package manager than to manual prompt management.

Example:

```bash
ap init
```

```text
Role:
Frontend Engineer

Stack:
Next.js
TypeScript
Cloudflare

Optional:
Security
Browser
Product
```

Then:

```bash
ap sync
```

And inspect:

```bash
ap list
ap explain engineering.testing.tdd
ap diff
ap doctor
```

The complexity should exist inside the resolver rather than being pushed onto the user.

---

# 23. Maintainer Experience

Maintainers should be able to:

- add a publisher,
- discover its components,
- map components to capabilities,
- define preferred implementations,
- build presets,
- define profiles,
- test resolution,
- review upstream changes,
- publish updates.

The architecture should minimize manual synchronization between multiple copies of the same metadata.

---

# 24. Ecosystem Model

The long-term ecosystem can be visualized as:

```text
                         Publishers
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    Superpowers          Matt Pocock          ECC
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                        Packages
                            │
                        Components
                            │
                        Capabilities
                            │
                         Presets
                            │
                         Profiles
                            │
                          Projects
                            │
                         Resolver
                            │
                         Lockfile
                            │
                       Target Adapter
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
      Claude Code         Codex              Gemini
```

---

# 25. Strategic Differentiation

The main value of `agent-plugins` should not come from having the largest collection.

It should come from having the best **composition and resolution model**.

The strategic differentiation is:

```text
Capability abstraction
+
Curated implementation mapping
+
Composable presets
+
Role-based profiles
+
Policy-aware resolution
+
Conflict handling
+
Explainability
+
Reproducibility
+
Cross-runtime distribution
```

A repository containing 1,000 skills is not necessarily more useful than one that can reliably select the correct 10.

---

# 26. Long-Term Product Direction

The project may eventually evolve through several stages.

## Stage 1 — Curated Distribution

```text
Catalog
Capabilities
Presets
Profiles
Resolver
Lockfile
Claude Code support
```

## Stage 2 — Multi-Runtime Distribution

```text
Codex
Gemini
OpenCode
Hermes
```

## Stage 3 — Team Governance

```text
Organization policies
Approved catalogs
Team presets
Security controls
```

## Stage 4 — Ecosystem Intelligence

Potential capabilities:

```text
capability recommendations
compatibility analysis
context optimization
publisher health
update impact analysis
security scoring
```

These should build on the deterministic foundation rather than replace it.

---

# 27. What Success Looks Like

The project is successful when users stop thinking:

> Which ten plugins should I install for this repository?

and instead think:

> This is a Next.js project and I am working as a frontend engineer.

The remaining decisions should be derived by the system.

Success means:

```text
less manual configuration

less duplication

fewer conflicting workflows

smaller agent environments

better reproducibility

safer updates

clear provenance

more portable configuration
```

---

# 28. North Star

The project's north star is:

> **A user should be able to describe their role, project, and desired capabilities, then reliably obtain the smallest coherent AI agent environment that satisfies those needs.**

Everything else should support this objective.

---

# 29. Guiding Principles

The product should consistently favor:

```text
intent over implementation

capabilities over repositories

composition over bundles

curation over accumulation

stable semantics over publisher-specific configuration

determinism over implicit behavior

explainability over magic

provenance over opaque installation

controlled updates over automatic latest

reproducibility over environment drift

native runtime support over lowest-common-denominator abstraction
```

---

# 30. Vision in One Sentence

> **`agent-plugins` makes AI agent tooling composable by capability, reusable by role, reproducible by project, and portable across runtimes.**