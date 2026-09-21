# Non-Goals

## Overview

This document defines what `agent-plugins` intentionally does **not** aim to solve, especially in V1.

These non-goals exist to:

- prevent scope creep,
- protect architectural simplicity,
- keep implementation focused,
- reduce maintenance burden,
- preserve clear ownership boundaries,
- avoid prematurely solving ecosystem-wide problems.

A non-goal does not necessarily mean "never".

It means:

> **This is not required to validate the core product model and should not block V1.**

---

# 1. Not a Mega Plugin

`agent-plugins` is not intended to combine every supported capability into one large plugin.

The project should not produce:

```text
mega-plugin
├── all skills
├── all agents
├── all hooks
├── all commands
├── all MCP servers
└── all providers
```

This would reintroduce:

- unnecessary context,
- coupled releases,
- duplicated capabilities,
- difficult updates,
- larger security surface,
- poor composability.

The project should resolve the smallest coherent capability set instead.

---

# 2. Not Another Plugin Collection

The project is not primarily a repository whose value comes from having the largest number of:

```text
skills
agents
commands
plugins
```

Large catalogs may be integrated, but accumulation itself is not the product goal.

The project should prioritize:

```text
selection
composition
resolution
governance
reproducibility
```

over raw catalog size.

---

# 3. Not a Replacement for Upstream Providers

`agent-plugins` does not aim to replace projects such as:

- Superpowers,
- Matt Pocock Skills,
- ECC,
- Anthropic plugins,
- wshobson/agents,
- other community ecosystems.

These projects remain the owners of their implementations.

`agent-plugins` should act as:

```text
coordination layer
+
semantic layer
+
resolution layer
+
distribution layer
```

rather than becoming a replacement implementation.

---

# 4. Not a Fork of Every Third-Party Project

The project should not copy or fork every external provider into the repository.

Avoid:

```text
plugins/
├── copied-superpowers/
├── copied-ecc/
├── copied-matt/
└── copied-everything-else/
```

This creates:

- stale source copies,
- update burden,
- unclear provenance,
- licensing complexity,
- merge conflicts,
- maintenance ownership that does not belong to this project.

Prefer referencing upstream sources directly.

---

# 5. No General Vendor Tree in V1

V1 should not introduce a large `vendor/` tree for external plugin source code.

Example intentionally avoided:

```text
plugins/
├── native/
└── vendor/
    ├── superpowers/
    ├── ecc/
    └── matt/
```

Vendoring may be introduced later for specific technical reasons, but should not be the default integration model.

---

# 6. No Full Overlay or Patch Engine in V1

V1 should not implement a general-purpose patch system for modifying arbitrary upstream components.

Avoid building:

```text
overlay engine
patch merging
patch rebasing
automatic conflict repair
provider-specific patch DSL
```

These features introduce significant maintenance complexity.

Preferred alternatives are:

- capability selection,
- policy configuration,
- implementation replacement,
- native first-party component.

A patch mechanism may be added later as an explicit advanced escape hatch.

---

# 7. No Deep Profile Inheritance

Profiles should not form deep inheritance hierarchies.

Avoid:

```text
frontend-engineer
→ web-engineer
→ software-engineer
→ developer
→ technical-user
→ base
```

Deep inheritance makes configuration difficult to understand and override.

Prefer:

```text
profile
→ presets
```

Composition should remain the primary reuse mechanism.

---

# 8. No First-Class Addon Entity

`Addon` should not become a separate domain concept in V1.

Conceptually:

```text
addon = optional preset
```

The CLI may provide addon-like UX, but the underlying model should remain based on presets.

This avoids duplicate concepts such as:

```text
preset/security
addon/security
```

---

# 9. No Universal Agent File Format

The project should not attempt to create a universal format that completely replaces native configuration formats for:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

The shared model should represent semantic intent.

Target adapters should render native runtime artifacts.

The system should not force every runtime into a lowest-common-denominator representation.

---

# 10. No Runtime Feature Emulation

If one runtime supports a feature that another runtime does not, `agent-plugins` should not automatically emulate every missing feature.

Example:

```text
Runtime A supports hooks
Runtime B does not
```

The target adapter may report:

```text
unsupported
degraded
ignored by policy
```

rather than implementing an entirely new execution engine.

---

# 11. No Support for Every Runtime in V1

V1 does not need to support all AI agent runtimes.

Initial focus should remain narrow.

Recommended first target:

```text
Claude Code
```

Other targets such as:

```text
Codex
Gemini
OpenCode
Hermes
```

should be supported by architecture extension points, not necessarily implemented in V1.

---

# 12. No Support for Every Provider in V1

V1 should not attempt to index the entire agent ecosystem.

The first provider set should be representative rather than exhaustive.

For example:

```text
Superpowers
Matt Pocock
ECC
Anthropic
wshobson
native
```

The objective is to prove the provider abstraction, not maximize provider count.

---

# 13. No Automatic Import of Every Upstream Component

Supporting a provider does not mean every component from that provider must become part of the curated catalog.

Example:

```text
Provider contains 300 components
```

The project may initially curate only:

```text
20 relevant components
```

Provider discovery and catalog curation are separate concerns.

---

# 14. No Fully Automatic Capability Classification in V1

V1 should not depend on an AI system automatically determining what every external skill or agent does.

Automatic classification may be useful later, but canonical capability mapping should initially be:

```text
curated
reviewable
deterministic
version-controlled
```

AI-assisted suggestions may be introduced without making them authoritative.

---

# 15. No LLM Required for Core Resolution

Core dependency and capability resolution must not require an LLM.

The following should remain deterministic:

```text
dependency resolution
capability selection
policy evaluation
version selection
lockfile generation
```

AI may assist with future recommendations or classification, but not with reproducibility-critical resolution.

---

# 16. No Recommendation Engine in V1

V1 should not attempt to answer automatically:

```text
What is the perfect profile for me?
Which plugins should I install?
Which provider is objectively best?
```

The initial system should provide curated presets and profiles.

A recommendation system may be introduced later after sufficient metadata and usage experience exist.

---

# 17. No Automatic Project Understanding in V1

The CLI may eventually inspect a repository and suggest:

```text
Next.js
TypeScript
Cloudflare
PostgreSQL
```

But V1 does not require advanced automatic stack detection.

Users may configure presets explicitly.

Basic detection may be introduced only where simple and deterministic.

---

# 18. No Hosted Registry Requirement

The core product should not require:

```text
central server
hosted database
user account
cloud control plane
```

The initial system should work locally with:

```text
repository catalog
local CLI
project manifest
lockfiles
```

A hosted registry may be introduced later.

---

# 19. No Mandatory SaaS

`agent-plugins` should not require users to subscribe to a hosted service to use core functionality.

Core operations should remain usable locally:

```text
init
sync
resolve
validate
diff
doctor
```

Cloud services may enhance the experience later but should not be foundational.

---

# 20. No GUI Requirement in V1

V1 does not require:

```text
desktop application
web marketplace
visual dependency editor
profile builder UI
```

The CLI and declarative files should be sufficient to validate the product model.

A GUI may be added after the core model is stable.

---

# 21. No Plugin Rating Platform in V1

The project should not initially become a public review or ranking platform.

Avoid V1 features such as:

```text
star ratings
community voting
popularity ranking
provider leaderboard
```

Trust and curation should initially be explicit project-maintained metadata.

---

# 22. No Global "Best Plugin" Ranking

The system should not assume there is universally one best implementation of every capability.

Selection may depend on:

```text
target runtime
policy
project context
trust
compatibility
user override
```

Default implementation priority may exist, but it should remain contextual and explainable.

---

# 23. No Automatic Trust

External providers should not automatically become trusted simply because they are popular or public.

Trust remains a curated policy decision.

The system should not infer:

```text
popular = safe
```

or:

```text
GitHub stars = trusted
```

---

# 24. No Complete Security Sandbox

`agent-plugins` should help identify and govern security-sensitive components.

It is not intended to provide a complete sandbox for arbitrary third-party execution.

The project may detect and restrict:

```text
hooks
commands
scripts
MCP servers
```

but should not attempt to replace:

```text
OS sandboxing
container isolation
endpoint security
runtime permission systems
```

---

# 25. No Package Manager Replacement for General Software

The project should not become a general package manager similar to:

```text
npm
pnpm
Homebrew
apt
pip
```

It manages AI agent tooling composition.

Underlying software dependencies should continue to be managed by their native package ecosystems.

---

# 26. No General Dependency Build System

The project should not become a task runner or build orchestration platform.

Avoid expanding into:

```text
build system
CI engine
workflow scheduler
general task runner
```

unless required specifically for agent tooling integration.

---

# 27. No General Dotfiles Manager

Although some generated configuration may resemble dotfile management, the project should not attempt to replace:

```text
chezmoi
stow
Nix Home Manager
dotbot
```

Its scope is agent tooling state.

---

# 28. No General Development Environment Manager

The project should not manage all developer tooling such as:

```text
Node.js
Python
Docker
Git
editors
shell configuration
system packages
```

Those concerns belong to workstation or environment management tools.

`agent-plugins` should only manage dependencies required specifically by its agent components where appropriate.

---

# 29. No Full Workflow Engine

The project coordinates which workflows are available.

It should not itself become a general workflow execution engine.

For example:

```text
TDD workflow
planning workflow
review workflow
```

remain implemented by their selected components/providers.

The resolver selects them; it does not replace them.

---

# 30. No Hidden Resolution Behavior

The project should not optimize for "magic" at the expense of predictability.

Avoid resolution that depends on:

```text
hidden heuristics
non-deterministic AI selection
unrecorded environment state
implicit remote configuration
```

Important decisions should remain inspectable and reproducible.

---

# 31. No Silent Conflict Resolution

Conflicts should not disappear without trace.

Even when the resolver selects a deterministic winner, users should be able to inspect:

```text
candidate implementations
selected implementation
suppressed implementations
selection reason
```

The project should prefer visible resolution over hidden suppression.

---

# 32. No Unbounded Configuration Flexibility

The system should not support arbitrary configuration mechanisms simply because they are theoretically possible.

Too much flexibility creates:

```text
hard-to-test states
unpredictable resolution
maintenance complexity
poor documentation
```

V1 configuration should remain constrained and opinionated.

---

# 33. No Arbitrary User Scripts in Core Resolution

The resolver should not allow arbitrary scripts to participate in dependency resolution.

Example intentionally avoided:

```yaml
resolve:
  run: ./custom-script.sh
```

This would undermine determinism and portability.

Extension points should use defined interfaces.

---

# 34. No Plugin Mutation During Resolution

Resolution should be primarily declarative.

The resolver should not rewrite or mutate third-party component source as part of normal operation.

Resolution should choose components, not transform them.

---

# 35. No Automatic Upstream Updates

The system should not silently update providers to the latest version.

Avoid:

```text
sync
→ automatically pull latest
→ silently change behavior
```

Updates should be explicit and reviewable.

---

# 36. No Breaking Changes Without Migration Strategy

As the manifest and lockfile formats evolve, the project should avoid casually introducing incompatible changes.

However, V1 alpha development does not require permanent backward compatibility.

Before stable `v1`, schema evolution is expected.

Once stable, breaking changes should include:

```text
versioning
migration documentation
migration tooling where practical
```

---

# 37. No Premature Stable API

The initial manifest should use an experimental version such as:

```text
agent-plugins.dev/v1alpha1
```

The project should not declare a stable API before real-world usage validates the model.

---

# 38. No Premature Package Fragmentation

The monorepo should not immediately become dozens of independently versioned packages.

V1 should keep package boundaries coarse.

Preferred:

```text
core
schemas
source-adapters
target-adapters
cli
```

Only split packages when independent lifecycle or dependency boundaries justify it.

---

# 39. No Premature Performance Optimization

V1 should prioritize:

```text
correctness
determinism
clarity
testability
```

over advanced performance optimization.

The expected catalog size in V1 should not require distributed resolution or complex indexing infrastructure.

---

# 40. No Remote State Requirement

Project resolution should not depend on hidden server-side state.

A project should be understandable from version-controlled artifacts such as:

```text
agent-plugins.yaml
agent-plugins.lock
catalog version
```

Remote services may enrich the system later but should not be required for deterministic reproduction.

---

# 41. No Mandatory Global User Profile

The system may eventually support user-level preferences.

However, project reproducibility must not depend on undocumented global state.

A project should not resolve differently merely because:

```text
Machine A has hidden profile settings
Machine B does not
```

Global preferences may influence interactive defaults but should not silently alter locked project state.

---

# 42. No Mixing Profile and Project Semantics

Profiles should not become a place to encode specific repository stacks.

Avoid profiles such as:

```text
tung-mealops-nextjs-cloudflare-profile
```

Profiles represent reusable roles.

Project configuration represents repository-specific needs.

---

# 43. No Provider-Specific Profiles

Avoid:

```text
superpowers-developer
ecc-backend-engineer
matt-frontend-engineer
```

Profiles should depend on capabilities and presets, not providers.

Provider choice belongs to resolution.

---

# 44. No Provider-Specific Presets by Default

Avoid presets such as:

```text
all-ecc
all-superpowers
all-matt
```

for normal capability composition.

Provider-oriented presets may exist for diagnostics or compatibility purposes, but they should not be the primary user abstraction.

---

# 45. No Duplicate Authoritative Metadata

The project should not manually maintain the same metadata in:

```text
catalog files
marketplace files
generated indexes
documentation tables
```

Only one representation should be authoritative.

Other representations should be generated where practical.

---

# 46. No Hand-Maintained Generated Artifacts

Files under:

```text
generated/
```

must not contain unique information unavailable elsewhere.

Deleting and regenerating them should be safe.

---

# 47. No Marketplace as the Domain Model

Claude marketplace manifests, Codex configuration, or any other runtime-specific format should not define the core domain model.

The dependency direction must remain:

```text
Core Domain
   ↓
Target Adapter
   ↓
Runtime Format
```

not:

```text
Runtime Format
   ↓
Core Domain
```

---

# 48. No Target-Specific Logic in Core Capabilities

Capability definitions should remain semantic.

Avoid:

```text
claude.tdd
codex.tdd
gemini.tdd
```

when the capability is conceptually:

```text
engineering.testing.tdd
```

Target compatibility belongs to implementation metadata and adapters.

---

# 49. No Requirement to Solve Every Capability Conflict Automatically

Some conflicts may be genuinely ambiguous.

The resolver may require an explicit override when:

```text
multiple candidates have equal priority
policy cannot choose safely
implementations are mutually incompatible
```

Failing with a useful diagnostic is preferable to guessing.

---

# 50. No Guarantee That Every Capability Exists on Every Target

A profile may request capabilities that are unavailable on a particular runtime.

The system should report:

```text
unsupported capability
partial support
missing implementation
```

rather than pretending full portability exists.

---

# 51. No Perfect Cross-Runtime Parity

The long-term goal is portability of intent, not identical behavior across all runtimes.

For example:

```text
Same capability intent
        ↓
Claude implementation
Codex implementation
Gemini implementation
```

These implementations may differ in behavior because the underlying runtimes differ.

---

# 52. No Automatic Replacement of Human Curation

Human curation remains important for:

```text
capability taxonomy
preferred implementations
trust classification
security-sensitive changes
provider integration
```

Automation should assist maintainers, not remove review from critical decisions.

---

# 53. No Enterprise Complexity in V1

V1 should not require:

```text
SSO
RBAC
multi-tenant organizations
central policy server
audit service
enterprise admin UI
```

The architecture may leave room for these capabilities later.

---

# 54. No Telemetry Requirement

The core system should not depend on usage telemetry.

Resolution should function correctly without sending project or usage information to a central service.

Telemetry may be introduced later only as an optional feature with explicit privacy considerations.

---

# 55. No Monetization Requirement

V1 should focus on validating the product and architecture.

It does not need to solve:

```text
billing
subscriptions
commercial marketplace
paid plugins
revenue sharing
licensing marketplace infrastructure
```

---

# 56. No Attempt to Standardize the Entire Ecosystem

`agent-plugins` may define a useful internal capability vocabulary.

It does not need to convince every upstream provider to adopt the same schema.

Source adapters exist precisely because external ecosystems will remain heterogeneous.

---

# 57. V1 Scope Boundary

The V1 boundary should remain approximately:

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

Source adapter abstraction
Claude Code target adapter

CLI
Validation
Testing
```

Everything beyond this boundary should require explicit justification.

---

# 58. Deferred Capabilities

The following are intentionally deferred:

```text
Hosted registry
GUI
Cloud control plane

Codex adapter
Gemini adapter
OpenCode adapter
Hermes adapter

AI recommendation engine
Automatic capability classification
Advanced project detection

Patch / overlay engine
Full vendoring system

Organization accounts
RBAC
SSO

Usage analytics
Telemetry

Plugin marketplace ratings
Community reviews

Context optimization engine
Provider health scoring
Security scoring

Signed package infrastructure
SBOM-like inventory
```

These may become future roadmap candidates after the core model is validated.

---

# 59. Decision Rule for New Features

When evaluating a new feature, ask:

> Does this feature directly improve capability composition, deterministic resolution, governance, reproducibility, or distribution?

If not, it should generally remain outside the core scope.

A second question should be:

> Is this necessary to validate V1?

If the answer is no, it should normally be deferred.

---

# 60. Non-Goals in One Sentence

> **`agent-plugins` should solve capability composition and resolution well before attempting to become a marketplace platform, cloud service, universal agent runtime, or all-purpose developer environment manager.**