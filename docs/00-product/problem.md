# Problem

## Overview

AI coding and agent ecosystems are rapidly expanding around reusable building blocks such as:

- plugins,
- skills,
- agents,
- commands,
- hooks,
- rules,
- MCP servers,
- LSP integrations,
- workflows.

These components are increasingly distributed across many independent repositories and marketplaces.

Examples include ecosystems such as:

- Superpowers,
- Matt Pocock Skills,
- Everything Claude Code,
- Anthropic plugins,
- community agent collections,
- organization-specific skills,
- personal plugins.

Individually, these projects provide useful capabilities.

The problem emerges when a developer wants to combine them into a consistent working environment across multiple projects, roles, and agent runtimes.

---

# 1. Plugin Management Does Not Scale

A developer may use dozens of reusable capabilities.

For example:

```text
Frontend project

- planning
- TDD
- debugging
- code review
- React
- TypeScript
- frontend design
- browser testing
- accessibility
- security review
```

A backend project may require:

```text
Backend project

- planning
- TDD
- debugging
- API design
- database design
- security
- contract testing
- architecture
```

A personal knowledge system may instead require:

```text
Second Brain

- research
- writing
- synthesis
- knowledge management
- Obsidian
- note maintenance
```

Today, these capabilities are usually installed and configured independently for every environment.

This leads to repeated manual work:

```text
Project A
├── install plugin A
├── install plugin B
├── install plugin C
└── configure everything

Project B
├── install plugin A
├── install plugin D
├── install plugin E
└── configure everything again
```

As the number of projects grows, maintaining this configuration becomes increasingly difficult.

---

# 2. Users Think in Capabilities, Not Repositories

Users usually do not start with questions such as:

> Which repository should provide my TDD workflow?

They think in terms of needs:

```text
I need:

- TDD
- architecture
- security review
- frontend expertise
- research
```

However, existing plugin ecosystems typically expose implementation-level concepts:

```text
install superpowers
install ecc
install matt-skills
install frontend-plugin
```

This forces users to understand:

- upstream repositories,
- package structures,
- overlapping capabilities,
- installation formats,
- runtime compatibility.

There is a missing abstraction between:

```text
What I need
```

and:

```text
Which plugin implements it
```

---

# 3. Capability Duplication

Different repositories frequently solve the same problem.

For example:

```text
TDD
├── Superpowers implementation
├── Matt Pocock implementation
└── ECC implementation
```

Similarly:

```text
Code Review
├── Publisher A
├── Publisher B
└── Publisher C
```

and:

```text
Planning
├── workflow A
├── workflow B
└── workflow C
```

Installing all of them does not necessarily improve the system.

It can instead introduce:

- duplicated instructions,
- competing methodologies,
- conflicting prompts,
- duplicated commands,
- overlapping agents,
- excessive context consumption,
- inconsistent behavior.

The system lacks a standard mechanism for deciding:

```text
Which implementation should own a capability?
```

---

# 4. Installing More Is Not Always Better

AI agent tooling differs from traditional libraries.

A large dependency tree in a normal application may primarily affect:

- disk usage,
- build time,
- package size.

Agent tooling can additionally affect the model's working environment.

Too many installed components may introduce:

- context pollution,
- ambiguous instructions,
- duplicated workflows,
- unnecessary tool definitions,
- conflicting rules,
- excessive agent choices.

Therefore:

```text
More plugins ≠ better agent
```

A better environment should expose the **smallest useful set of capabilities** for the current role and project.

---

# 5. Project Configuration Is Repetitive

Many projects share the same baseline.

For example, a frontend engineer may repeatedly need:

```text
workflow
testing
debugging
code review
TypeScript
frontend design
browser tools
```

A backend engineer may repeatedly need:

```text
workflow
testing
debugging
architecture
API design
database
security
```

Without reusable composition, this configuration must be reconstructed in every repository.

This creates duplication at two levels:

```text
User level
+
Project level
```

The ecosystem needs reusable configuration units representing common use cases.

---

# 6. Roles Need Different Capability Sets

Not every user or workflow needs the same tools.

Examples:

```text
Frontend Engineer
Backend Engineer
Platform Engineer
Product Manager
Researcher
Second Brain
```

These roles may share some capabilities while requiring very different others.

For example:

```text
Frontend Engineer
→ TDD
→ React
→ accessibility
→ browser testing

Backend Engineer
→ TDD
→ API design
→ database
→ security

Second Brain
→ research
→ writing
→ synthesis
→ knowledge management
```

A single global plugin installation cannot efficiently represent all of these contexts.

---

# 7. Project Needs Differ From User Roles

Even users with the same role may work on different stacks.

For example:

```text
Frontend Engineer

Project A
→ Next.js
→ TypeScript
→ Cloudflare

Project B
→ React SPA
→ Vite

Project C
→ Astro
```

The user's role remains stable:

```text
frontend-engineer
```

while project requirements change.

The system must distinguish between:

```text
Who the user is
```

and:

```text
What the current project requires
```

---

# 8. Upstream Publishers Evolve Independently

Community repositories change continuously.

They may:

- add skills,
- remove skills,
- rename commands,
- change folder structure,
- introduce hooks,
- split packages,
- merge packages,
- modify installation mechanisms.

A configuration that works today may silently behave differently after an upstream update.

Without version control at the agent tooling layer, projects lose reproducibility.

---

# 9. Latest Does Not Mean Safe

Automatically following the latest upstream version can introduce:

```text
breaking changes
behavior changes
removed capabilities
new executable hooks
new dependencies
```

Agent infrastructure needs controlled update behavior similar to mature package management systems.

Users should be able to answer:

```text
What changed?

Why did it change?

Which capabilities are affected?

Can I reproduce the previous environment?
```

---

# 10. Provenance Is Difficult to Track

When many external sources are combined, it becomes difficult to answer:

```text
Where did this skill come from?

Who maintains it?

Which version is installed?

Was it modified?

Is this first-party or third-party?

Which project enabled it?
```

This becomes especially important when external components can execute:

- hooks,
- commands,
- scripts,
- MCP servers,
- external binaries.

Agent tooling needs clear provenance.

---

# 11. Security Boundaries Are Unclear

An AI plugin can be more than just a prompt.

It may contain:

```text
skills
agents
hooks
commands
MCP servers
scripts
dependencies
```

Different users or organizations may have different policies.

For example:

```text
Personal environment
→ allow community plugins

Company environment
→ allow curated publishers only

Enterprise environment
→ forbid executable hooks from external sources
```

Installation systems that treat every plugin the same make these policies very difficult to express clearly.

---

# 12. Publisher Lock-in

Configuration is often tied directly to publisher names.

For example:

```yaml
plugins:
  - superpowers
  - ecc
  - some-security-plugin
```

If a better implementation appears, users must rewrite the configuration themselves.

Meanwhile, the actual requirement may simply be:

```text
planning
TDD
security review
```

Publisher-dependent configuration creates unnecessary coupling between user intent and implementation.

---

# 13. Multiple Agent Runtimes Make Fragmentation Worse

The problem is no longer limited to a single runtime.

Developers increasingly work with multiple environments such as:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

Each runtime may use different formats for:

- skills,
- plugins,
- agents,
- commands,
- configuration,
- installation.

Without a shared semantic layer, users must maintain multiple parallel configurations for each runtime.

This increases configuration drift.

---

# 14. Marketplaces Solve Discovery, Not Composition

Marketplaces are useful for answering:

> What plugins exist?

But they usually cannot answer:

```text
Which plugins should be used together?

Which capabilities are duplicated?

Which implementation should be selected?

Which configuration suits a frontend engineer?

Which configuration suits a Second Brain?

Which components are allowed to run under the current policy?
```

Discovery alone does not solve the composition problem.

---

# 15. Collections Do Not Solve Resolution

Large repositories containing hundreds of agents or skills improve discoverability.

But they create a new problem:

```text
Which subset should I actually use?
```

A collection may have:

```text
300 skills
70 agents
50 commands
```

While a project may only need:

```text
8–15 capabilities
```

What is missing is not another collection.

What is missing is **selection and resolution**.

---

# 16. Manual Curation Becomes a Maintenance Burden

Advanced users often solve these problems themselves with:

```text
personal lists
copy-pasted folders
custom install scripts
shell aliases
project templates
internal documentation
```

These approaches work well early on but become hard to maintain as the system grows.

Common problems include:

```text
configuration drift
duplicate dependencies
stale copies
unknown provenance
manual upgrades
broken upstream references
```

There is no shared model connecting all of these decisions.

---

# 17. There Is No Standard Capability Vocabulary

Different publishers may use different names for the same concept.

For example:

```text
test-driven-development
tdd
tdd-workflow
testing-discipline
```

Yet they may all implement the same semantic capability:

```text
engineering.testing.tdd
```

Without a normalized capability model, automated composition and conflict resolution are very difficult.

---

# 18. It Is Hard to Explain Why a Configuration Exists

When an environment contains many plugins, users often struggle to answer:

```text
Why is this plugin installed?

Which preset requires it?

Which capability does it implement?

Why was it selected over another implementation?
```

A package manager for agent tooling should not behave like a black box.

Resolution must be explainable.

---

# 19. Environments Are Hard to Reproduce

Developers should be able to clone a project and restore the same agent environment.

Ideally:

```bash
git clone project
ap sync
```

should reproduce:

```text
same capabilities
same publishers
same packages
same versions
same components
same policy decisions
```

Without a lockfile and a deterministic resolver, this cannot be guaranteed.

---

# 20. Team Standardization Is Difficult

Teams may want to standardize:

```text
engineering workflow
security review
testing methodology
approved publishers
agent behavior
```

while still allowing customization by role and project.

Today, teams often have to choose between:

```text
fully centralized configuration
```

and:

```text
fully personal configuration
```

A scalable system needs to support layered composition.

---

# 21. Personal and Work Environments Need Different Policies

The same developer may use agent tooling in different contexts.

For example:

```text
Personal
→ allow community publishers
→ allow experimentation

Work
→ curated publishers
→ pinned versions
→ restricted hooks

Enterprise
→ allowlisted sources only
→ strict execution policy
```

These differences should be expressed through declarative configuration rather than multiple separate ad hoc installations.

---

# 22. The Core Problem

The core problem is not:

> The ecosystem lacks AI plugins.

In reality, many good implementations already exist.

The real problem is:

> There is no consistent abstraction for selecting, composing, resolving, governing, and reproducing capabilities across many publishers, projects, roles, and agent runtimes.

---

# 23. Problem Decomposition

The problem can be divided into six major groups:

```text
1. Discovery
   What exists?

2. Normalization
   What capability does each component provide?

3. Composition
   Which capabilities should go together?

4. Resolution
   Which implementation should be selected?

5. Governance
   Which sources and behaviors are allowed?

6. Distribution
   How is the resolved environment installed into the target runtime?
```

Current solutions typically address only one or two of these layers.

---

# 24. Desired User Experience

Users should not have to understand every publisher.

Instead of:

```text
Install:
- repository A
- repository B
- repository C
- plugin D
- skill E
```

users should only need to describe:

```text
I am a frontend engineer.

This project uses:
- Next.js
- TypeScript
- Cloudflare

I also need:
- security
- browser testing
```

The system decides the concrete implementations.

---

# 25. Desired Project Experience

A project should contain only a small declarative manifest.

For example:

```yaml
role: frontend-engineer

presets:
  - nextjs
  - cloudflare
  - security

target:
  - claude-code
```

The remaining details should be derivable.

---

# 26. Desired Team Experience

A team should be able to define:

```text
approved publishers
preferred implementations
required workflows
security policies
version constraints
```

without forcing every project to repeat those decisions.

---

# 27. Desired Maintenance Experience

When an upstream publisher changes, maintainers must be able to understand the impact before upgrading.

For example:

```text
Superpowers v6.3 → v6.4

Added:
+ capability X

Changed:
~ planning component

Removed:
- legacy workflow

Impact:
✓ TDD unaffected
✓ Debugging unaffected
⚠ Planning implementation changed
```

Updates should be intentional actions rather than implicit changes.

---

# 28. Desired Resolution Experience

When multiple implementations exist:

```text
engineering.testing.tdd

Candidates:
- Superpowers
- Matt Pocock
- ECC
```

the system must be able to choose deterministically based on:

```text
capability priority
policy
trust
target compatibility
version
user/project override
```

and explain that decision.

---

# 29. Desired Reproducibility

Given:

```text
catalog version
project manifest
policy
lockfile
```

the resulting agent environment must be reproducible across different machines.

---

# 30. Constraints

The system should not solve the problem by creating yet another mega-plugin.

A solution that bundles everything into:

```text
one giant plugin
```

would recreate many of the current problems:

- unnecessary capabilities,
- coupled releases,
- context bloat,
- difficult updates,
- unclear provenance,
- reduced composability.

---

# 31. Non-goals

The project's primary goals are not to:

- replace upstream plugin repositories,
- fork all community skills,
- create a universal prompt format,
- merge all plugins into a single artifact,
- rewrite all third-party skills,
- force every runtime into the same lowest-common-denominator format.

The project should remain a coordination and resolution layer.

---

# 32. Success Criteria

The problem can be considered well solved when users can:

### Configure by Intent

```text
role + presets
```

instead of listing dozens of plugins by hand.

### Avoid Capability Duplication

When publishers overlap, only the appropriate implementation is active.

### Reproduce Environments

The lockfile can reconstruct the resolved state.

### Understand Decisions

Every selected package/component can be traced back:

```text
project
→ role
→ preset
→ capability
→ implementation
```

### Update Safely

Upstream changes can be reviewed before being applied.

### Enforce Policy

Users and teams can restrict trusted publishers and executable behavior.

### Support Multiple Runtimes

Semantic configuration can gradually be materialized into many different target environments.

---

# 33. Problem Statement

> The AI agent ecosystem offers an increasing number of powerful plugins, skills, agents, and workflows, but users lack a scalable way to compose them into consistent environments.

Manual installation leads to configuration duplication, capability overlap, publisher coupling, context bloat, security ambiguity, update risk, and poor reproducibility.

`agent-plugins` exists to address the layer between **discovering agent tooling** and **operating a consistent agent environment in practice**.

The core problem is therefore:

> **How can users declare the capabilities they need, compose them by role and project, deterministically resolve overlapping implementations, apply trust policies, and reproduce configurations across multiple agent runtimes without being tightly coupled to any specific plugin publisher?**

---

# 34. The Problem in One Sentence

> **There are many good agent plugins; what is missing is a scalable way to decide which plugins should work together.**

---

# 35. Guiding Principles

The project should optimize for:

```text
intent over implementation
capabilities over repositories
composition over bundles
curation over accumulation
determinism over implicit behavior
provenance over opaque installation
reproducibility over latest
```

The goal is not to install more tooling.

The goal is to build **the smallest agent environment that is still consistent and powerful enough for the right user, the right project, and the current task**.
