# Documentation

This directory contains the canonical documentation for `agent-plugins`.

The documentation is organized from product intent to domain modeling, architecture, technical specifications, security, development, and delivery.

## Documentation Flow

```text
Why
↓
Problem
Vision
Goals

What
↓
Requirements
Use Cases

Model
↓
Domain Model
Capability Model
Terminology

How
↓
Architecture
Resolution
Technical Specs
Security

Build
↓
Testing
Release
Roadmap
Todo
```

## Recommended Reading and Authoring Order

### 00 — Product

1. [`problem.md`](./00-product/problem.md)  
   Defines the problems this project exists to solve.

2. [`problem.vi.md`](./00-product/.vi/problem.vi.md)  
   Vietnamese translation of the problem statement.

3. [`vision.md`](./00-product/vision.md)  
   Defines the long-term product direction and positioning.

4. [`goals.md`](./00-product/goals.md)  
   Defines what the project must achieve.

5. [`non-goals.md`](./00-product/non-goals.md)  
   Defines what the project intentionally does not solve.

6. [`requirements.md`](./00-product/requirements.md)  
   Defines functional and non-functional requirements.

7. [`use-cases.md`](./00-product/use-cases.md)  
   Describes representative user, project, team, and runtime scenarios.

---

### 01 — Domain

8. [`domain-model.md`](./01-domain/domain-model.md)  
   Defines the canonical domain model:

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
   Role + Project + Policy
      ↓
   Resolution
   ```

9. [`terminology.md`](./01-domain/terminology.md)  
   Defines canonical terminology used throughout the project.

10. [`capability-model.md`](./01-domain/capability-model.md)  
    Defines capability namespaces, implementations, cardinality, priority, and ownership.

---

### 02 — Architecture

11. [`architecture.md`](./02-architecture/architecture.md)  
    Defines the overall system architecture and boundaries.

12. [`repository-structure.md`](./02-architecture/repository-structure.md)  
    Defines the repository and monorepo structure.

13. [`source-of-truth.md`](./02-architecture/source-of-truth.md)  
    Defines authoritative, generated, and consumer-managed state.

14. [`resolution-spec.md`](./02-architecture/resolution-spec.md)  
    Defines deterministic capability resolution and conflict handling.

---

### 03 — Technical Specifications

15. [`catalog-spec.md`](./03-specs/catalog-spec.md)

16. [`manifest-spec.md`](./03-specs/manifest-spec.md)

17. [`lockfile-spec.md`](./03-specs/lockfile-spec.md)

18. [`policy-spec.md`](./03-specs/policy-spec.md)

19. [`adapter-spec.md`](./03-specs/adapter-spec.md)

20. [`update-spec.md`](./03-specs/update-spec.md)

21. [`cli-spec.md`](./03-specs/cli-spec.md)

22. [`provisioning-spec.md`](./03-specs/provisioning-spec.md)  
    Defines server-provisioned Components (MCP): the `provisioning` facet, the canonical
    `server` block, project bindings, secret references, and target support.

---

### 04 — Security

23. [`security-model.md`](./04-security/security-model.md)

24. [`trust-model.md`](./04-security/trust-model.md)

---

### 05 — Development

25. [`testing-strategy.md`](./05-development/testing-strategy.md)

26. [`contributing.md`](./05-development/contributing.md)

27. [`release-process.md`](./05-development/release-process.md)

---

### 06 — Delivery

28. [`roadmap.md`](./06-roadmap/roadmap.md)

29. [`todo.md`](./06-roadmap/todo.md)

---

## Architecture Decisions

Architecture Decision Records are stored under:

```text
decisions/adr/
```

ADRs should be created when an important architectural decision is made.

Initial ADRs:

```text
0001-capability-based-resolution.md
0002-publisher-package-component.md
0003-composition-over-inheritance.md
0004-no-addon-entity.md
0005-source-target-adapters.md
0006-dual-lock-model.md
```

Accepted ADRs:

- [`0010-claude-code-materialization.md`](./decisions/adr/0010-claude-code-materialization.md) — V1 materializes into Claude Code through a per-project generated local marketplace; ecosystems installed whole, collections filtered to standalone components.
- [`0011-publisher-terminology.md`](./decisions/adr/0011-publisher-terminology.md) — the `Provider` entity becomes `Publisher` and the word "provider" is retired; fetch coordinates stay on `Package.spec.source` and the access mechanism stays an enum, not an entity.
- [`0012-role-terminology.md`](./decisions/adr/0012-role-terminology.md) — the `Profile` entity becomes `Role`, matching the word its own definition already used; `spec.profile` becomes `spec.role`.
- [`0013-component-discovery-and-typing.md`](./decisions/adr/0013-component-discovery-and-typing.md) — discovery declares `strategy: manifest | convention`; Components carry a real `type`, so Policy's `componentTypes` stop being a false control. Closes two of ADR 0011's open questions.
- [`0014-api-version.md`](./decisions/adr/0014-api-version.md) — `apiVersion` settles on `agent-plugins.dev/v1alpha1`; `v1` is the name reserved for the stable milestone, and `UNSUPPORTED_API_VERSION` is implemented rather than merely described.
- [`0015-mcp-as-component.md`](./decisions/adr/0015-mcp-as-component.md) — MCP stays a Component with a `provisioning: server` facet rather than becoming an `Integration` kind; requirement edges may name a Capability or a Component, resolved in one pass.
- [`0016-secret-by-reference.md`](./decisions/adr/0016-secret-by-reference.md) — secrets exist only as references; the adapter materializes the reference and never resolves the value, with no plaintext fallback.
- [`0017-v1-mcp-scope.md`](./decisions/adr/0017-v1-mcp-scope.md) — the "V1 ships no hooks/MCP" decision is relaxed for `mcp` under Policy conditions; `hook: deny` is unchanged.

ADRs are written alongside the main documentation rather than at the end of the documentation process.

## Minimum Documentation Before Implementation

Before implementing the core resolver, the following documents should be sufficiently stable:

```text
problem.md
vision.md
goals.md
non-goals.md
requirements.md
use-cases.md
domain-model.md
architecture.md
resolution-spec.md
```

After these documents are established, implementation can begin with:

```text
schemas
↓
catalog
↓
domain model
↓
resolver
↓
lockfile
↓
Claude Code adapter
↓
CLI
```

Technical specifications can then be completed immediately before implementing their corresponding modules.

## Documentation Principles

Documentation should follow these principles:

```text
Problem before solution
Intent before implementation
Domain model before architecture
Architecture before framework decisions
Specification before implementation
ADR for important decisions
One source of truth
Generated documentation must not become authoritative
```

The documentation hierarchy should remain understandable from this file alone.