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
   Provider
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

---

### 04 — Security

22. [`security-model.md`](./04-security/security-model.md)

23. [`trust-model.md`](./04-security/trust-model.md)

---

### 05 — Development

24. [`testing-strategy.md`](./05-development/testing-strategy.md)

25. [`contributing.md`](./05-development/contributing.md)

26. [`release-process.md`](./05-development/release-process.md)

---

### 06 — Delivery

27. [`roadmap.md`](./06-roadmap/roadmap.md)

28. [`todo.md`](./06-roadmap/todo.md)

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
0002-provider-package-component.md
0003-composition-over-inheritance.md
0004-no-addon-entity.md
0005-source-target-adapters.md
0006-dual-lock-model.md
```

Accepted ADRs:

- [`0010-claude-code-materialization.md`](./decisions/adr/0010-claude-code-materialization.md) — V1 materializes into Claude Code through a per-project generated local marketplace; ecosystems installed whole, collections filtered to standalone components.

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