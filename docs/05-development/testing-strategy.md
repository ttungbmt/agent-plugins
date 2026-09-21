# Testing Strategy

**Status:** Draft  
**Version:** 0.1.0  
**Last Updated:** 2026-09-21

---

# 1. Purpose

This document defines the testing strategy for the Agent Plugins project.

The goal is to ensure that the system remains:

- correct;
- deterministic;
- secure;
- portable across targets;
- backward-compatible where required;
- explainable;
- safe to operate.

The testing strategy covers:

```text
canonical domain
schemas
manifests
catalog
profiles
presets
resolver
policy
trust
lockfile
source adapters
target adapters
render planning
filesystem apply
CLI
configuration
updates
overlays
security boundaries
```

The central testing principle is:

> Test architectural contracts and observable behavior, not implementation details.

---

# 2. Testing Goals

The test suite MUST provide confidence that:

1. canonical inputs produce deterministic outputs;
2. invalid configuration fails predictably;
3. dependencies resolve correctly;
4. policies cannot be bypassed;
5. trust decisions are reproducible;
6. lockfiles reproduce environments;
7. adapters preserve semantics;
8. generated filesystem operations are safe;
9. CLI behavior is stable for humans and automation;
10. security boundaries remain enforced;
11. new targets do not break existing targets;
12. external source changes cannot silently alter locked state.

---

# 3. Testing Principles

The project follows these principles.

## 3.1 Determinism First

Tests MUST verify that identical inputs produce identical outputs.

## 3.2 Contract Over Implementation

Tests SHOULD assert:

```text
input
→ behavior
→ output
```

rather than internal private functions unless those functions contain meaningful isolated logic.

## 3.3 Small Tests Near Logic

Pure domain logic SHOULD have fast unit tests.

## 3.4 Boundary Tests for Integrations

Adapters, filesystem operations, CLI, and source handling MUST have integration tests.

## 3.5 Golden Tests for Generated Output

Generated artifacts SHOULD be verified through golden fixtures or snapshots.

## 3.6 Security Tests Are First-Class

Security controls MUST have dedicated regression tests.

## 3.7 End-to-End Tests Validate the Product Loop

A small number of realistic E2E scenarios MUST validate the entire system.

---

# 4. Test Layers

Recommended test architecture:

```text
                E2E
                 ▲
                 │
          Integration Tests
                 ▲
                 │
           Contract Tests
                 ▲
                 │
             Unit Tests
```

Each layer serves a distinct purpose.

---

# 5. Unit Tests

Unit tests verify isolated deterministic logic.

Typical targets:

```text
canonical IDs
version constraints
dependency graph utilities
policy matching
trust evaluation
path normalization
schema transformations
merge algorithms
sorting
hash generation
diagnostics
```

Unit tests SHOULD:

- avoid filesystem access where possible;
- avoid network access;
- run quickly;
- use small fixtures;
- test edge cases thoroughly.

---

# 6. Integration Tests

Integration tests validate collaboration between modules.

Examples:

```text
manifest loader + schemas

repository scanner + catalog

catalog + resolver

resolver + policy

resolver + lockfile

resolved graph + target adapter

render plan + filesystem apply

CLI + application layer
```

Integration tests SHOULD use temporary isolated directories.

---

# 7. Contract Tests

Contract tests enforce shared interfaces.

Critical contracts include:

```text
TargetAdapter
SourceAdapter
ApplicationService
Diagnostic
CLI JSON output
Lockfile schema
Manifest schema
```

Contract tests are especially important for extensibility.

---

# 8. End-to-End Tests

E2E tests validate real user workflows.

Core E2E flow:

```text
init
 ↓
validate
 ↓
resolve
 ↓
plan
 ↓
build
 ↓
install
 ↓
diff
```

Final expected state:

```text
diff = clean
```

E2E tests SHOULD remain few but representative.

---

# 9. Test Pyramid

Recommended approximate distribution:

```text
60–70% Unit

20–30% Integration

5–10% E2E
```

This is guidance, not a strict quota.

Adapter-heavy parts of the system may require more integration and golden tests.

---

# 10. Test Organization

Recommended structure:

```text
packages/
├── core/
│   └── test/
├── catalog/
│   └── test/
├── resolver/
│   └── test/
├── policy/
│   └── test/
├── lockfile/
│   └── test/
├── adapters/
│   └── test/
└── cli/
    └── test/

tests/
├── fixtures/
├── golden/
├── integration/
├── e2e/
└── security/
```

Unit tests SHOULD stay near the package they test.

Cross-package tests SHOULD live under root-level `tests/`.

---

# 11. Test Naming

Recommended naming:

```text
*.test.ts
```

Examples:

```text
canonical-reference.test.ts
resolver.test.ts
policy-evaluator.test.ts
claude-adapter.test.ts
cli-resolve.test.ts
```

Large behavior groups MAY use nested test directories.

---

# 12. Canonical Identifier Tests

Test canonical IDs such as:

```text
plugin:superpowers
skill:typescript
agent:reviewer
profile:frontend
```

Cases MUST include:

- valid IDs;
- invalid prefixes;
- empty IDs;
- whitespace;
- traversal sequences;
- Unicode edge cases;
- duplicate IDs;
- case sensitivity.

Security-specific inputs:

```text
../../foo
..\foo
/absolute
C:\foo
```

MUST be rejected where applicable.

---

# 13. Schema Tests

Every schema MUST have:

```text
valid fixture
minimal valid fixture
fully populated fixture
invalid fixtures
boundary fixtures
```

Test:

- required fields;
- optional fields;
- unknown fields;
- invalid enum values;
- schema version;
- nested structures;
- invalid references.

---

# 14. Schema Compatibility Tests

When schemas evolve, fixtures SHOULD cover:

```text
current version
previous supported version
unsupported future version
unsupported obsolete version
```

This becomes critical before V1.

---

# 15. Manifest Parser Tests

Test:

```text
valid YAML
valid JSON if supported
malformed YAML
unsafe YAML tags
invalid encoding
missing file
unknown schema version
```

Parser MUST remain data-only.

Tests MUST verify that custom YAML tags cannot execute arbitrary behavior.

---

# 16. Repository Scanner Tests

Scanner tests SHOULD cover:

```text
empty repository

single package

multiple component types

nested directories

ignored files

duplicate identifiers

invalid manifests
```

Ordering MUST be deterministic regardless of filesystem enumeration order.

---

# 17. Cross-Platform Scanner Tests

At minimum, path logic SHOULD be tested for:

```text
POSIX paths
Windows paths
case-sensitive filesystem behavior
case-insensitive collision behavior
```

CI MAY run real tests on multiple operating systems.

---

# 18. Catalog Tests

Catalog MUST be tested for:

```text
lookup by ID
lookup by type
lookup by capability
provider lookup
duplicate rejection
missing reference detection
stable ordering
```

Search ranking tests SHOULD remain separate from resolver behavior.

---

# 19. Preset Tests

Test:

```text
single Preset
nested Preset
multiple Presets
duplicate selections
missing Preset
circular Preset
```

Example cycle:

```text
A → B → C → A
```

MUST fail deterministically.

---

# 20. Profile Tests

Test:

```text
simple Profile
Profile inheritance
multiple Presets
package additions
policy references
invalid parent
inheritance cycle
```

Effective Profile generation MUST be deterministic.

---

# 21. Resolver Tests

The resolver is one of the most critical test targets.

Required cases:

```text
direct dependency

transitive dependency

shared dependency

duplicate dependency

deep graph

missing dependency

dependency cycle

conflicting version

Profile inheritance

Preset expansion

provider selection
```

---

# 22. Resolver Determinism

Given the same logical input with different input order:

```text
A, B, C
```

and:

```text
C, A, B
```

the resolved graph SHOULD be equivalent and serialized identically.

This MUST have explicit tests.

---

# 23. Resolution Explanation Tests

`why()` and explainability output MUST reflect the real graph.

Example:

```text
profile:frontend
→ preset:web
→ plugin:typescript
→ skill:typescript
```

Tests SHOULD ensure that provenance edges are not lost after deduplication.

---

# 24. Resolver Property Tests

Where useful, property-based testing SHOULD be considered.

Potential properties:

```text
resolved graph contains no duplicate canonical IDs

resolved graph contains all required dependencies

resolved graph has no unresolved references

resolved graph order is stable
```

Property tests are especially useful for graph logic.

---

# 25. Policy Tests

Policies MUST be tested independently from resolver behavior.

Cases:

```text
allow package
deny package
allow source
deny source
capability restriction
target restriction
trust restriction
```

Policy precedence MUST have explicit tests.

---

# 26. Policy Bypass Regression Tests

Security-critical tests MUST verify that:

```text
Target Adapter cannot restore denied components

CLI flags cannot bypass Policy unintentionally

Update cannot introduce forbidden package

Overlay cannot bypass source restrictions
```

---

# 27. Trust Model Tests

Trust tests SHOULD cover:

```text
first-party
trusted-vendor
verified-community
community
unknown
blocked
revoked
```

Evidence combinations SHOULD be tested.

---

# 28. Trust Precedence Tests

Examples:

```text
publisher trusted
+
revision revoked
→ blocked
```

```text
source trusted
+
integrity failure
→ blocked
```

Negative evidence MUST dominate positive evidence where specified.

---

# 29. Trust Non-Transitivity Tests

Example:

```text
trusted package A
→ depends on community package B
```

B MUST remain community.

A's trust MUST NOT automatically propagate.

---

# 30. Lockfile Tests

Test:

```text
generation
serialization
deserialization
schema validation
stable ordering
integrity data
adapter metadata
```

Round-trip test:

```text
object
→ serialize
→ parse
→ object
```

SHOULD preserve semantics.

---

# 31. Lockfile Determinism

Two equivalent resolved environments MUST produce identical lockfile bytes.

This SHOULD be tested explicitly.

---

# 32. Frozen Lockfile Tests

Tests MUST verify that frozen mode fails when:

```text
configuration changed
package requirement changed
source revision differs
adapter requirement differs
lockfile missing entry
```

---

# 33. Lockfile Integrity Tests

Test:

```text
valid integrity
modified content
missing content
wrong digest
wrong revision
```

Integrity failure MUST fail closed.

---

# 34. Adapter Contract Tests

Every Target Adapter MUST pass a common conformance suite.

Conceptually:

```ts
targetAdapterConformance(adapter)
```

The suite SHOULD test:

```text
metadata

capabilities

validation

planning

rendering

determinism

path safety

collision handling

unsupported capability behavior
```

---

# 35. Target Adapter Golden Tests

Each adapter SHOULD have golden outputs.

Example:

```text
tests/golden/claude/basic-skill/
├── input/
└── expected/
```

Input:

```text
canonical resolved environment
```

Expected:

```text
target-native files
```

---

# 36. Golden Test Philosophy

Golden tests SHOULD validate meaningful representation.

Avoid snapshots of huge irrelevant metadata structures.

Good golden tests verify:

```text
file paths
content
metadata
ordering
generated structure
```

Golden outputs SHOULD be human-reviewable.

---

# 37. Snapshot Updates

Snapshot updates MUST be intentional.

CI MUST NOT automatically rewrite snapshots.

Developers SHOULD inspect diffs before accepting updated snapshots.

---

# 38. Adapter Semantic Tests

Adapters SHOULD test not only textual output but semantic behavior.

Example:

```text
canonical agent name
→ correct target agent identifier
```

```text
canonical command description
→ preserved in target output
```

---

# 39. Unsupported Capability Tests

For every unsupported capability:

```text
native
mapped
emulated
unsupported
```

adapter behavior MUST be tested.

Unsupported critical semantics MUST NOT disappear silently.

---

# 40. Adapter Collision Tests

Example:

```text
agent:reviewer
plugin:foo/reviewer
```

mapping to:

```text
.claude/agents/reviewer.md
```

MUST fail before filesystem mutation.

---

# 41. Adapter Path Safety Tests

Generated paths MUST be tested against:

```text
../
absolute paths
Windows drive paths
UNC paths
reserved filenames
case collisions
```

---

# 42. Source Adapter Contract Tests

Source adapters SHOULD share a conformance suite.

Conceptually:

```ts
sourceAdapterConformance(adapter)
```

Tests SHOULD cover:

```text
metadata
discover
fetch
normalize
verify
provenance
immutable revision handling
```

---

# 43. Source Adapter Network Tests

Network-dependent tests SHOULD be isolated.

CI SHOULD prefer:

```text
mock server
local Git repository
fixture archive
```

rather than relying on external public services.

External network tests MAY run separately as smoke tests.

---

# 44. Git Source Tests

Create temporary Git repositories to test:

```text
commit pinning
branch resolution
tag resolution
repository update
missing revision
repository transfer metadata where possible
```

Tests SHOULD NOT depend on GitHub availability.

---

# 45. Archive Security Tests

If archive sources are supported, test:

```text
zip slip
tar traversal
absolute paths
symlink escape
hardlink escape
archive bomb limits
```

These belong in the security suite.

---

# 46. Overlay Tests

Overlay tests MUST cover:

```text
add
replace
merge
remove
```

Additional cases:

```text
missing target
invalid target
merge conflict
ordering
multiple overlays
```

---

# 47. Overlay Security Tests

Explicitly test prototype pollution:

```text
__proto__
constructor
prototype
```

Unsafe merge keys MUST be rejected or safely ignored according to spec.

---

# 48. Update Tests

Update Engine tests SHOULD cover:

```text
no update
patch update
minor update
major update
revision update
source change
publisher change
trust change
new transitive dependency
```

---

# 49. Update Safety Tests

Verify that:

```text
update does not install

update does not execute code

update does not bypass Policy

update preserves overlays

update previews trust changes
```

---

# 50. Configuration Tests

Test configuration precedence:

```text
CLI
>
environment
>
project
>
workspace
>
user
>
defaults
```

Every precedence relationship SHOULD have explicit coverage.

---

# 51. Configuration Discovery Tests

Test execution from:

```text
project root
nested directory
workspace directory
outside project
```

Project-root discovery MUST be deterministic.

---

# 52. Environment Variable Tests

Verify:

```text
supported AGENT_PLUGINS_* variables
invalid values
precedence
secret redaction
```

Unrelated environment variables MUST NOT leak into generated artifacts.

---

# 53. Render Plan Tests

Render Plan MUST be tested independently from actual filesystem apply.

Test:

```text
create
update
remove
unchanged
```

Ordering MUST be deterministic.

---

# 54. Filesystem Apply Tests

Use temporary directories.

Test:

```text
create file
update owned file
remove owned stale file
preserve unknown file
collision
directory creation
atomic apply
```

---

# 55. Unknown File Protection Tests

Example:

```text
desired:
.claude/agent.md

existing:
user-created file
```

Expected:

```text
fail
```

unless explicit override semantics exist.

---

# 56. Idempotency Tests

The following sequence:

```text
install
install
```

with unchanged inputs MUST result in:

```text
second install = no changes
```

This MUST be a dedicated E2E regression test.

---

# 57. CLI Unit Tests

CLI package SHOULD test:

```text
argument parsing
flag parsing
defaults
invalid combinations
exit code mapping
presenters
```

CLI unit tests SHOULD NOT duplicate core domain tests.

---

# 58. CLI Integration Tests

Invoke commands programmatically or through a subprocess harness.

Test:

```text
init
validate
catalog
profile
resolve
plan
build
install
diff
doctor
lock
adapter
```

---

# 59. CLI JSON Contract Tests

Every stable `--json` command SHOULD have contract tests.

Verify:

```text
valid JSON
schemaVersion
command
success
data
diagnostics
```

No ANSI codes or progress output may appear in stdout.

---

# 60. CLI stdout/stderr Tests

Verify:

```text
stdout = requested result

stderr = diagnostics/progress/logging
```

This is essential for automation.

---

# 61. CLI Exit Code Tests

Test mapped exit codes:

```text
0 success
2 invalid CLI usage
3 configuration
4 validation
5 resolution
6 policy
7 lockfile
8 source
9 adapter
10 filesystem
```

Diagnostic codes provide finer detail.

---

# 62. CLI Interactive Tests

Interactive UI SHOULD have focused tests for:

```text
default selection
cancel behavior
confirmation
non-interactive fallback
```

Do not over-test visual terminal rendering.

---

# 63. TTY Tests

Behavior SHOULD be tested for:

```text
interactive TTY
non-TTY
CI
--json
--quiet
```

Spinners/prompts MUST NOT contaminate machine output.

---

# 64. Offline Tests

Commands supporting:

```text
--offline
```

MUST have tests ensuring no network access occurs.

A test SHOULD fail if an offline path attempts networking.

---

# 65. Security Test Suite

Maintain a dedicated security regression suite.

Recommended location:

```text
tests/security/
```

Cases MUST include:

```text
path traversal

symlink escape

unknown overwrite

archive traversal

prototype pollution

malicious YAML

secret leakage

integrity mismatch

policy bypass

trust escalation

dependency confusion
```

---

# 66. Path Traversal Tests

Inputs:

```text
../foo
../../foo
..\foo
C:\foo
/etc/foo
```

should fail wherever path confinement is required.

---

# 67. Symlink Tests

Where supported by CI/platform:

```text
target root
└── link → /outside
```

attempted write through link MUST fail.

---

# 68. Secret Leakage Tests

Inject fake secrets such as:

```text
TEST_SECRET_123456
```

into process environment.

Verify they do not appear in:

```text
logs
diagnostics
JSON output
lockfile
generated artifacts
```

unless explicitly intended.

---

# 69. Dependency Confusion Tests

Example:

```text
first-party package ID:
foo
```

plus remote package:

```text
community/foo
```

MUST NOT cause automatic source switching.

---

# 70. Trust Escalation Tests

Package metadata attempting:

```yaml
trust:
  level: first-party
```

MUST NOT elevate itself.

Effective trust comes from trusted configuration and evidence.

---

# 71. Malicious Manifest Tests

Fixtures SHOULD include:

```text
oversized strings
deep nesting
invalid Unicode
unexpected objects
unsafe YAML tags
prototype keys
```

---

# 72. Resource Limit Tests

When limits exist, test:

```text
max manifest size
max graph depth
max graph nodes
max archive files
max expanded archive size
```

Boundary behavior MUST be predictable.

---

# 73. Cross-Platform Tests

CI SHOULD ideally test:

```text
Linux
Windows
macOS
```

At minimum, Linux and Windows are strongly recommended because path behavior differs substantially.

---

# 74. Runtime Matrix

Recommended runtime CI matrix:

```text
current Node LTS
next supported Node version
```

Avoid excessively broad matrices until compatibility policy is defined.

---

# 75. Package Manager Tests

If only one package manager is officially supported, CI SHOULD use that one consistently.

Do not add multiple package-manager matrices without a product requirement.

---

# 76. Determinism Test Suite

Create explicit determinism tests for:

```text
catalog ordering
resolved graph
lockfile
render plan
generated artifacts
CLI JSON output
```

The test pattern is:

```text
run A
run B
compare bytes
```

---

# 77. Input Order Randomization

A useful determinism test is to randomize input discovery order.

Example:

```text
filesystem order A
filesystem order B
```

should still yield identical canonical output.

---

# 78. Time Independence

Generated artifacts SHOULD NOT depend on current time unless explicitly specified.

Tests SHOULD freeze or vary clock state and verify identical output.

---

# 79. Machine Independence

Where possible, verify output does not contain:

```text
absolute local paths
hostname
username
temporary directory
OS-specific separators
```

unless intentionally required.

---

# 80. Golden Canonical Fixtures

Maintain reusable canonical fixtures:

```text
fixtures/canonical/
├── empty/
├── simple-skill/
├── simple-agent/
├── full-plugin/
├── nested-presets/
├── profile-inheritance/
├── dependency-conflict/
├── policy-denied/
└── mixed-trust/
```

All adapters SHOULD be able to reuse these.

---

# 81. Cross-Adapter Fixtures

The same canonical fixture SHOULD be rendered by multiple adapters.

Example:

```text
full-plugin
├── Claude expected
├── Codex expected
└── Gemini expected
```

This tests portability.

---

# 82. Portability Gate

When adding a new adapter, run the complete canonical golden fixture suite.

If canonical fixtures require target-specific modifications, architecture review is required.

---

# 83. Architecture Regression Tests

Some tests SHOULD explicitly protect architectural boundaries.

Examples:

```text
core package does not import CLI

resolver does not import adapters

resolver does not import network modules

canonical domain does not import target-specific code
```

Static dependency tests MAY enforce these rules.

---

# 84. Package Boundary Tests

Dependency architecture SHOULD follow intended direction.

Example:

```text
cli
  → application
  → core
```

Disallow:

```text
core
  → cli
```

Tools such as dependency graph analyzers MAY enforce this.

---

# 85. No-Network Tests

Core packages SHOULD be testable under a network-blocked environment.

This proves:

```text
catalog
resolver
policy
lockfile
target rendering
```

do not require network access.

---

# 86. No-Execution Tests

Security tests SHOULD verify that package-provided scripts are never executed during:

```text
catalog
validate
resolve
build
install
```

Use sentinel scripts that fail the test if executed.

---

# 87. Performance Tests

Performance testing SHOULD begin after core behavior stabilizes.

Potential benchmarks:

```text
catalog load
manifest parsing
large dependency graph
resolution
multi-target rendering
```

Performance tests SHOULD not block ordinary unit-test runs unless thresholds are stable.

---

# 88. Large Graph Fixture

Maintain a synthetic large graph.

Example:

```text
1,000 packages
5,000 components
10,000 dependency edges
```

Use for:

```text
benchmark
stack safety
cycle handling
determinism
```

---

# 89. Stress Tests

Stress scenarios MAY include:

```text
very deep graph
very wide graph
many Profiles
many Presets
many target artifacts
```

These SHOULD run separately from normal fast tests.

---

# 90. Fuzz Testing

Future fuzz targets:

```text
canonical ID parser
manifest parser
path normalizer
overlay merge
version parser
archive extraction
```

Security-sensitive parsers deserve priority.

---

# 91. Mutation Testing

Mutation testing MAY be introduced later for critical pure logic such as:

```text
policy evaluation
trust rules
resolver conflicts
path security
```

It is not required for MVP.

---

# 92. Coverage

Code coverage is useful but MUST NOT become the primary quality metric.

Recommended targets:

```text
core domain: high
resolver: very high
policy: very high
security utilities: very high
adapters: meaningful behavior coverage
CLI presentation: moderate
```

Critical branches matter more than global percentage.

---

# 93. Coverage Gate

Before V1, consider enforcing approximately:

```text
statements >= 80%
branches   >= 75%
```

with higher expectations for security-critical modules.

Exact thresholds SHOULD be tuned after implementation begins.

---

# 94. Test Data Rules

Fixtures MUST NOT contain:

```text
real credentials
real private repository tokens
personal secrets
```

Use obvious fake values.

Example:

```text
test-token-not-secret
```

---

# 95. Fixture Ownership

Fixtures SHOULD be categorized by responsibility.

Avoid one giant fixture used by all tests.

Prefer:

```text
small unit fixture
shared canonical fixture
specific E2E fixture
```

---

# 96. Fixture Stability

Golden fixtures form part of the compatibility surface.

Changes to them SHOULD be reviewed as carefully as production code.

---

# 97. Mocking Strategy

Mock only external or unstable boundaries.

Good mock candidates:

```text
HTTP
remote registries
clock
process environment
```

Avoid mocking domain modules against one another excessively.

Prefer real core collaboration in integration tests.

---

# 98. Filesystem Strategy

Use real temporary filesystem directories rather than mocking filesystem APIs for most integration tests.

This catches:

```text
path bugs
permissions
case behavior
atomic operations
```

---

# 99. Network Strategy

Default tests MUST NOT rely on the public internet.

Use:

```text
local HTTP server
fixture Git server/repository
mock fetch implementation
```

for deterministic CI.

---

# 100. Clock Strategy

Inject or abstract time where timestamps are required.

Tests MUST NOT depend on wall-clock timing.

---

# 101. Randomness Strategy

Avoid randomness in production outputs.

If randomized test generation is used:

```text
seed MUST be logged
```

to allow reproduction.

---

# 102. Error Model Tests

Every stable diagnostic SHOULD have tests for:

```text
code
severity
message context
subject
suggestion where applicable
```

Tests SHOULD primarily assert diagnostic codes rather than full human text.

---

# 103. Human Message Tests

Human-readable messages MAY use snapshots.

These snapshots SHOULD tolerate intentional wording changes without destabilizing domain tests.

---

# 104. Diagnostic Compatibility

Once diagnostic codes are documented as stable, CI SHOULD detect accidental code changes or removal.

---

# 105. JSON Schema Tests

CLI machine output SHOULD have JSON schemas or equivalent runtime validators.

Tests SHOULD validate every command response against the expected output schema.

---

# 106. Backward Compatibility Tests

Before V1, compatibility tests SHOULD be added for:

```text
manifest schemas
lockfiles
CLI JSON
adapter API
configuration
```

---

# 107. Migration Tests

Migration tests MUST include:

```text
old fixture
→ migrate
→ current valid state
```

and:

```text
migration repeated
→ no additional changes
```

Migrations SHOULD be idempotent where possible.

---

# 108. Version Compatibility Matrix

Maintain fixtures for supported versions.

Example:

```text
manifest/v1
manifest/v2

lockfile/v1

cli-output/v1
```

Unsupported versions MUST fail clearly.

---

# 109. CI Stages

Recommended CI pipeline:

```text
Install
  ↓
Lint
  ↓
Typecheck
  ↓
Unit Tests
  ↓
Integration Tests
  ↓
Security Tests
  ↓
Build
  ↓
E2E
```

Adapter golden tests MAY run alongside integration tests.

---

# 110. Fast CI

Pull requests SHOULD prioritize fast feedback.

Recommended:

```text
lint
typecheck
unit
core integration
affected adapter tests
```

Then run broader suites separately.

---

# 111. Full CI

Main branch or release CI SHOULD run:

```text
all unit tests
all integration tests
all adapter conformance tests
all golden fixtures
all security tests
all E2E tests
cross-platform matrix
```

---

# 112. Release Gate

Before release:

```text
lint passes

typecheck passes

all tests pass

golden fixtures clean

no unexpected snapshots

security suite passes

determinism suite passes
```

---

# 113. PR Test Selection

Affected-package test selection MAY be introduced later.

Do not optimize CI complexity prematurely.

Full core tests SHOULD continue running for architectural changes.

---

# 114. Flaky Tests

Flaky tests are considered defects.

Do not solve flakiness by:

```text
retrying indefinitely
sleeping arbitrary durations
loosening assertions
```

Fix the nondeterministic dependency.

---

# 115. Test Isolation

Every test MUST avoid shared mutable state.

Temporary directories SHOULD be unique per test.

Environment variables SHOULD be restored after each test.

---

# 116. Parallel Execution

Tests SHOULD be safe to execute concurrently.

Tests that require serial execution MUST document why.

---

# 117. Snapshot Discipline

Snapshots SHOULD be used primarily for:

```text
generated target files
CLI human output
render plans
```

Avoid snapshotting domain objects where explicit assertions are clearer.

---

# 118. Security Regression Policy

Every discovered security defect MUST receive a regression test before or with the fix.

Example:

```text
path traversal vulnerability
→ dedicated fixture
→ test permanently retained
```

---

# 119. Bug Regression Policy

Significant bugs SHOULD receive minimal reproducing tests.

This prevents recurring behavioral regressions.

---

# 120. Adapter Addition Checklist

A new Target Adapter is not complete until:

```text
[ ] contract suite passes
[ ] capability metadata tested
[ ] canonical fixtures rendered
[ ] golden outputs reviewed
[ ] unsupported features tested
[ ] path safety tested
[ ] collision tests pass
[ ] deterministic output verified
```

---

# 121. Source Adapter Addition Checklist

A new Source Adapter is not complete until:

```text
[ ] contract suite passes
[ ] immutable revision behavior tested
[ ] provenance tested
[ ] integrity tested
[ ] network failures tested
[ ] malicious path handling tested
[ ] cache behavior tested
[ ] offline behavior tested where relevant
```

---

# 122. New Package Schema Checklist

Any schema addition MUST include:

```text
[ ] schema
[ ] valid fixture
[ ] invalid fixture
[ ] parser tests
[ ] diagnostics
[ ] compatibility review
```

---

# 123. New CLI Command Checklist

Every stable CLI command SHOULD include:

```text
[ ] command unit tests
[ ] success integration test
[ ] failure test
[ ] --json test
[ ] exit code test
[ ] no-TTY test where relevant
[ ] help example
```

---

# 124. Test Commands

Recommended package scripts:

```bash
pnpm test

pnpm test:unit

pnpm test:integration

pnpm test:e2e

pnpm test:security

pnpm test:adapters

pnpm test:coverage
```

Exact names may differ.

---

# 125. Watch Mode

Local development SHOULD support:

```bash
pnpm test --watch
```

or equivalent.

Fast unit tests SHOULD be optimized for this workflow.

---

# 126. E2E Fixture Structure

Recommended:

```text
tests/e2e/fixtures/
└── frontend-project/
    ├── input/
    └── expected/
```

Test creates an isolated working directory from `input`.

Then runs CLI commands.

---

# 127. Core E2E Scenario

Scenario:

```text
Given
  frontend project

When
  validate
  resolve
  build Claude
  install Claude

Then
  generated output matches golden fixture
  lockfile is valid
  second install has no changes
```

---

# 128. Policy E2E Scenario

```text
Given
  community package
  policy denies community

When
  install

Then
  install fails
  no target files are mutated
```

---

# 129. Trust E2E Scenario

```text
Given
  trusted-vendor package
  integrity mismatch

When
  resolve/build

Then
  trust becomes blocked
  policy prevents installation
```

---

# 130. Multi-Target E2E Scenario

```text
Given
  one frontend Profile

When
  build Claude
  build Codex

Then
  resolver graph identity is the same
  target outputs differ appropriately
```

---

# 131. Update E2E Scenario

```text
Given
  locked vendor package v1

When
  update preview finds v2

Then
  lockfile remains unchanged during dry run

When
  update applied

Then
  lockfile changes
  install remains separate
```

---

# 132. Offline E2E Scenario

```text
Given
  valid cache + lockfile

When
  build --offline

Then
  no network access occurs
  build succeeds
```

Another case:

```text
missing locked source
→ build --offline fails
```

---

# 133. Test Observability

Failed tests SHOULD provide enough context to debug:

```text
fixture name
command
exit code
stdout
stderr
diagnostic codes
diff
```

Golden test failures SHOULD show readable file diffs.

---

# 134. Deterministic Temp Paths in Output

Tests SHOULD normalize temporary paths before snapshots.

Production behavior SHOULD avoid exposing temporary paths where possible.

---

# 135. CI Artifact Retention

On failure, CI MAY retain:

```text
generated fixtures
CLI logs
diff output
coverage
```

Never retain actual secrets.

---

# 136. Test Documentation

Complex fixtures SHOULD contain a short README explaining their purpose.

Avoid undocumented magic fixture structures.

---

# 137. Test Code Quality

Test code is production infrastructure.

It SHOULD follow normal quality standards:

```text
clear names
minimal duplication
typed helpers
stable fixtures
explicit assertions
```

---

# 138. Shared Test Kit

The project SHOULD provide:

```text
packages/test-kit/
```

or equivalent.

Potential helpers:

```text
createTempProject()

loadFixture()

assertDiagnostic()

assertGoldenTree()

runCLI()

createTestCatalog()

createResolvedEnvironment()
```

---

# 139. Adapter Test Kit

`adapter-kit` MAY expose dedicated testing utilities:

```text
targetAdapterConformance()

sourceAdapterConformance()

assertSafeRenderPlan()
```

These should be reusable by future adapters.

---

# 140. Test Builders

Domain builders MAY simplify fixtures.

Example:

```ts
packageBuilder()
  .id("plugin:foo")
  .withSkill("skill:bar")
  .build()
```

Builders SHOULD not hide important semantics.

---

# 141. Avoid Over-Mocking

Bad:

```text
mock catalog
mock resolver
mock policy
mock adapter
```

then test CLI success.

Better:

```text
real application stack
+
temporary filesystem
+
fake remote boundary only
```

Integration tests should exercise real internal collaboration.

---

# 142. Architecture Test Suite

Create explicit tests for forbidden dependencies.

Example rules:

```text
core MUST NOT import cli

resolver MUST NOT import target adapters

target adapter MUST NOT import source adapter

domain MUST NOT import filesystem apply
```

These rules SHOULD mirror `architecture.md`.

---

# 143. Dependency Cycle Tests

Static package dependencies MUST be cycle-free according to architecture.

CI SHOULD detect workspace dependency cycles.

---

# 144. Test Ownership

Each package owner is responsible for its local tests.

Cross-cutting architectural tests SHOULD be owned centrally.

---

# 145. Definition of Done

A feature is not complete until applicable tests exist.

Definition of Done:

```text
[ ] unit behavior tested

[ ] invalid input tested

[ ] diagnostics tested

[ ] integration boundary tested

[ ] deterministic behavior verified

[ ] security impact reviewed

[ ] compatibility impact reviewed

[ ] E2E updated if user-visible workflow changed
```

---

# 146. MVP Testing Requirements

Before MVP:

```text
canonical ID tests

schema tests

manifest parser tests

catalog tests

Profile/Preset tests

resolver tests

policy tests

lockfile tests

Claude adapter conformance

Claude golden fixtures

filesystem safety tests

CLI core tests

security regression suite

one full E2E project
```

---

# 147. Pre-Codex Requirements

Before adding the second production Target Adapter:

```text
adapter conformance framework

shared canonical fixtures

golden fixture tooling

architecture dependency tests

determinism suite
```

must already exist.

---

# 148. Pre-Community Requirements

Before broad community content support:

```text
Source Adapter conformance tests

archive security tests

trust tests

integrity tests

dependency confusion tests

resource limit tests

policy bypass tests
```

MUST be mature.

---

# 149. Pre-V1 Requirements

Before V1:

```text
cross-platform CI

schema compatibility tests

lockfile compatibility tests

CLI JSON contract tests

migration tests

adapter API compatibility tests

security suite

determinism suite

release E2E suite
```

---

# 150. Quality Gates

Recommended merge gates:

```text
lint

typecheck

unit tests

integration tests

architecture tests
```

For adapter changes:

```text
adapter conformance
golden tests
```

For security-sensitive changes:

```text
security regression suite
```

---

# 151. Critical Modules

Modules requiring strongest test confidence:

```text
resolver

policy

trust

lockfile

path handling

filesystem apply

source normalization

adapter render planning
```

These directly affect correctness, reproducibility, or security.

---

# 152. What Not to Over-Test

Avoid spending excessive effort snapshot-testing:

```text
colors

spinner frames

terminal spacing

internal private method sequence

framework implementation details
```

unless they form a stable user contract.

---

# 153. Testing Philosophy

The desired confidence chain is:

```text
Schemas
  prove inputs are valid

Unit Tests
  prove isolated rules

Integration Tests
  prove modules collaborate

Contract Tests
  prove extensions remain compatible

Golden Tests
  prove target output

Security Tests
  prove boundaries

E2E Tests
  prove the product works
```

No single test layer can replace the others.

---

# 154. Reference Test Matrix

| Subsystem | Unit | Integration | Contract | Golden | Security | E2E |
|---|---:|---:|---:|---:|---:|---:|
| Canonical Domain | High | Low | — | — | Medium | — |
| Schemas | High | Medium | High | — | Medium | — |
| Catalog | High | High | — | — | Low | Medium |
| Resolver | Very High | High | — | — | Medium | High |
| Policy | Very High | High | — | — | Very High | High |
| Trust | Very High | High | — | — | Very High | High |
| Lockfile | High | High | High | Medium | High | High |
| Source Adapter | Medium | High | Very High | Medium | Very High | Medium |
| Target Adapter | Medium | High | Very High | Very High | High | High |
| Filesystem Apply | High | Very High | — | — | Very High | Very High |
| CLI | Medium | High | High | Medium | Medium | Very High |

---

# 155. Recommended Tooling

For the planned TypeScript stack:

```text
Vitest
```

is suitable for:

```text
unit
integration
snapshot
coverage
```

Additional tooling MAY include:

```text
fast-check
    property-based testing

dependency-cruiser / madge / knip
    architecture and dependency checks

temporary Git repositories
    Source Adapter integration

Node subprocess test harness
    CLI integration
```

Tool choice SHOULD remain secondary to the testing contracts.

---

# 156. Test Execution Layers

Recommended local workflow:

```bash
pnpm test
```

should run fast tests.

Pre-push:

```bash
pnpm test:integration
```

CI:

```bash
pnpm test:ci
```

Release:

```bash
pnpm test:release
```

Exact script names can be decided during implementation.

---

# 157. Recommended CI Test Groups

```text
Group A — Static

lint
typecheck
architecture


Group B — Core

unit
resolver
policy
trust


Group C — Integration

catalog
lockfile
filesystem
CLI


Group D — Adapters

conformance
golden


Group E — Security

security regressions


Group F — E2E

critical product workflows
```

This structure allows later CI parallelization.

---

# 158. Failure Classification

Test failures SHOULD make their category obvious.

Example:

```text
UNIT

CONTRACT

GOLDEN

SECURITY

E2E
```

This improves triage in CI.

---

# 159. Golden Output Review Rule

A golden-output change SHOULD answer:

```text
Why did target output change?

Was canonical behavior changed?

Was adapter behavior changed?

Is the change backward compatible?

Does the lockfile need to reflect anything?
```

Golden changes MUST NOT be accepted mechanically.

---

# 160. Regression Test Rule

Every meaningful production bug SHOULD create:

```text
bug reproduction
+
regression test
+
fix
```

The regression test MUST fail before the fix and pass after it.

---

# 161. Security Regression Rule

Every security defect MUST have a permanent regression test unless technically impossible.

Security regression tests SHOULD be tagged or grouped for easy execution.

---

# 162. Test Tags

Future test metadata MAY classify tests:

```text
unit
integration
security
slow
e2e
adapter
```

This helps local selection and CI parallelization.

---

# 163. Slow Test Policy

Slow tests SHOULD NOT silently enter the default unit-test suite.

They SHOULD be explicitly classified.

Examples:

```text
large Git fixture
large dependency graph
cross-platform E2E
```

---

# 164. Release Candidate Validation

A release candidate SHOULD pass:

```text
full test matrix

cross-platform tests

fresh install E2E

upgrade E2E

frozen lockfile build

offline build

security regression suite

determinism check
```

---

# 165. Upgrade Testing

Before stable releases, test:

```text
previous release
      ↓
upgrade CLI
      ↓
existing config
      ↓
existing lockfile
      ↓
validate/build/install
```

This catches compatibility regressions.

---

# 166. Fresh Install Testing

Also test a clean environment:

```text
no cache
no prior config
no lockfile
```

Then:

```text
init
resolve
install
```

---

# 167. Reproduction Testing

Given:

```text
same repository
same lockfile
same adapter versions
```

two clean environments SHOULD produce the same generated tree.

This SHOULD be verified before V1.

---

# 168. Target Compatibility Tests

Adapters MAY declare supported runtime versions.

Fixtures SHOULD validate:

```text
supported runtime

old unsupported runtime

future unknown runtime
```

when target runtime version compatibility becomes relevant.

---

# 169. Trust Change Regression Tests

Updates MUST be tested against changes such as:

```text
publisher changed

repository changed

signature missing

new community dependency

revoked revision
```

These changes MUST remain visible.

---

# 170. Test Strategy Invariants

The following are normative.

## Invariant 1 — Core logic has no network-dependent tests

Pure core functionality MUST be testable offline.

## Invariant 2 — Adapters pass shared contracts

Every adapter MUST pass conformance tests.

## Invariant 3 — Generated output is golden-tested

Production Target Adapters MUST maintain representative golden fixtures.

## Invariant 4 — Determinism is tested explicitly

Determinism MUST NOT be assumed.

## Invariant 5 — Security boundaries have regression tests

Critical security controls MUST have dedicated tests.

## Invariant 6 — E2E validates real product workflows

The main product loop MUST have E2E coverage.

## Invariant 7 — Machine interfaces have contract tests

CLI JSON, lockfile, schemas, and adapter APIs MUST be treated as compatibility surfaces.

## Invariant 8 — Tests are network-independent by default

Public network dependencies MUST NOT make ordinary CI unreliable.

## Invariant 9 — Tests preserve architecture

Dependency boundaries SHOULD be enforced automatically.

## Invariant 10 — Flaky tests are defects

Nondeterministic tests MUST be fixed, not normalized.

---

# 171. Initial Implementation Order

Implement testing infrastructure in this order:

```text
1. Vitest baseline

2. shared fixture utilities

3. schema tests

4. canonical ID tests

5. repository scanner tests

6. catalog tests

7. resolver tests

8. policy tests

9. lockfile tests

10. adapter conformance kit

11. Claude golden fixtures

12. filesystem safety tests

13. CLI integration harness

14. E2E fixture

15. security regression suite

16. determinism suite
```

---

# 172. Recommended First Fixtures

Create:

```text
tests/fixtures/
├── minimal-valid/
├── invalid-manifest/
├── frontend-profile/
├── dependency-cycle/
├── policy-denied/
├── mixed-trust/
├── path-traversal/
└── multi-target/
```

These can support multiple test layers.

---

# 173. First E2E Definition

The first E2E test SHOULD prove:

```text
Given
  a valid first-party frontend Profile

When
  the project is resolved
  and rendered for Claude
  and installed

Then
  generated files equal expected output
  lockfile verifies
  no unknown files are modified
  second install produces no changes
```

This is the MVP's most important automated test.

---

# 174. Testing Success Criteria

The testing architecture is working well when:

```text
new target
→ mostly adds adapter tests

new source
→ mostly adds Source Adapter tests

new CLI surface
→ does not require retesting domain semantics manually

new bug
→ can be reproduced with a small fixture

same locked environment
→ always produces the same output
```

---

# 175. Final Decision Summary

The project adopts a layered testing model:

```text
Unit
    → rules

Integration
    → collaboration

Contract
    → extensibility

Golden
    → representation

Security
    → boundaries

E2E
    → product behavior
```

The highest-priority areas are:

```text
Resolver correctness
Policy enforcement
Trust evaluation
Lockfile reproducibility
Adapter conformance
Filesystem safety
Deterministic output
```

The central rule is:

> If a behavior is part of an architectural contract, reproducibility guarantee, or security boundary, it must be testable automatically.

---

# 176. Related Documents

This document should be read with:

```text
architecture.md

security-model.md
trust-model.md

manifest-spec.md
catalog-spec.md
resolution-spec.md
policy-spec.md
lockfile-spec.md
adapter-spec.md
cli-spec.md

versioning-spec.md
migration-spec.md
```

Responsibilities:

```text
architecture.md
    → defines boundaries

testing-strategy.md
    → proves those boundaries remain true

security-model.md
    → defines security controls

testing-strategy.md
    → regression-tests those controls

adapter-spec.md
    → defines adapter contracts

testing-strategy.md
    → defines adapter conformance

cli-spec.md
    → defines CLI contracts

testing-strategy.md
    → validates those contracts
```