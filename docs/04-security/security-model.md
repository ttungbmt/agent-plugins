# Security Model

**Status:** Draft  
**Version:** 0.1.0  
**Last Updated:** 2026-09-21

---

# 1. Purpose

This document defines the security model for the Agent Plugins platform.

The platform manages reusable AI-agent capabilities sourced from:

```text
first-party content
vendor repositories
community repositories
local project content
external registries
```

and transforms them into runtime-specific artifacts for systems such as:

```text
Claude
Codex
Gemini
OpenCode
Hermes
future agent runtimes
```

Because external packages may contain instructions, hooks, scripts, tool declarations, or generated configuration, the system MUST treat package ingestion and target rendering as security-sensitive operations.

The primary security goal is:

> Agent Plugins must never turn package discovery, resolution, or rendering into implicit code execution or uncontrolled filesystem mutation.

---

# 2. Security Principles

The security model follows these principles:

1. **Untrusted by default**
2. **No implicit execution**
3. **Explicit trust boundaries**
4. **Least privilege**
5. **Policy before execution**
6. **Integrity before use**
7. **Deterministic builds**
8. **Safe filesystem boundaries**
9. **Provenance everywhere**
10. **No secret propagation by default**
11. **Target isolation**
12. **Fail closed for critical ambiguity**
13. **Human-visible dangerous behavior**
14. **Defense in depth**

---

# 3. Threat Model

The platform may process content controlled by third parties.

Potential adversaries include:

```text
malicious package author
compromised upstream repository
compromised dependency
malicious marketplace entry
supply-chain attacker
malicious local repository contributor
misconfigured project
compromised adapter
```

The system MUST assume that external metadata and package content can be malicious.

---

# 4. Assets to Protect

Primary protected assets include:

```text
user source code

project files

credentials

environment variables

API keys

SSH keys

tokens

runtime configuration

agent instructions

lockfiles

package integrity metadata

local filesystem

CI environment

developer workstation
```

Secondary assets include:

```text
repository integrity
generated artifact correctness
build reproducibility
package provenance
policy configuration
```

---

# 5. Security Boundaries

The primary trust boundaries are:

```text
Internet
   │
   ▼
Source Adapter
   │
   ▼
Source Cache
   │
   ▼
Normalization
   │
   ▼
Canonical Model
   │
   ▼
Resolver
   │
   ▼
Policy Engine
   │
   ▼
Target Adapter
   │
   ▼
Render Plan
   │
   ▼
Filesystem Apply
   │
   ▼
Target Runtime
```

Each transition MUST be treated as a separate security boundary.

---

# 6. Trust Zones

Recommended trust zones:

```text
Zone 0 — First Party
Zone 1 — Trusted Vendor
Zone 2 — Verified Community
Zone 3 — Community
Zone 4 — Untrusted / Unknown
Zone 5 — Local Project
```

Example trust levels:

```yaml
trust:
  first-party: highest
  trusted-vendor: high
  verified-community: medium
  community: low
  unknown: untrusted
```

Trust level MUST NOT automatically imply execution permission.

---

# 7. First-Party Content

First-party content is authored and maintained within the canonical repository.

It MAY receive a higher default trust level.

However, first-party content MUST still pass:

```text
schema validation
path validation
policy evaluation
adapter validation
```

First-party status MUST NOT bypass core security controls.

---

# 8. Vendor Content

Vendor content includes curated upstream packages such as external skill or agent repositories.

Vendor packages MUST preserve:

```text
original source
revision
integrity
license
import metadata
```

Example:

```yaml
provenance:
  type: git
  repository: https://github.com/example/project
  revision: abc123
  integrity: sha256-...
```

Vendor packages SHOULD be pinned to immutable revisions.

---

# 9. Community Content

Community packages MUST be treated as untrusted by default.

Community content SHOULD NOT be allowed to:

```text
execute scripts during install
run shell commands during discovery
write outside managed target directories
read arbitrary local files
access credentials
modify project configuration
```

without explicit authorization.

---

# 10. Source Trust

Every configured source SHOULD have an explicit trust classification.

Example:

```yaml
sources:
  community:
    adapter: git
    trust: community
```

Policy MAY restrict sources:

```yaml
allow:
  sources:
    - first-party
    - trusted-vendor
```

---

# 11. Source Ingestion Security

Source Adapters MAY interact with remote systems.

They MUST:

```text
validate URLs
validate protocols
pin revisions where possible
avoid arbitrary command execution
validate archive extraction paths
validate symbolic links
verify integrity when available
```

They MUST NOT implicitly execute repository-provided installation hooks.

---

# 12. Allowed Source Protocols

Implementations SHOULD explicitly allow supported schemes.

Example:

```text
https
ssh
file
```

Dangerous or unsupported schemes MUST be rejected.

Examples:

```text
javascript:
data:
custom executable protocols
```

---

# 13. Git Security

Git-based Source Adapters SHOULD:

- fetch only necessary objects;
- resolve symbolic references to immutable commits;
- record the commit hash;
- avoid repository hooks;
- avoid automatically executing submodule scripts;
- validate submodule sources if submodules are supported.

Git metadata MUST be treated as untrusted input.

---

# 14. Archive Extraction

If packages are distributed as archives, extraction MUST prevent:

```text
../ traversal
absolute paths
symlink escape
hardlink escape
device files
unexpected executable placement
```

Every extracted path MUST remain within the designated extraction root.

---

# 15. Path Traversal Protection

Any path originating from a package MUST be normalized and validated.

Reject:

```text
../../secret
/etc/passwd
C:\Users\...
\\server\share
```

unless explicitly allowed by a trusted local configuration mechanism.

Canonical package paths MUST be relative.

---

# 16. Symlink Security

Symlinks MUST be handled carefully.

By default, externally sourced packages SHOULD NOT be allowed to create symlinks during installation.

If symlinks are supported:

```text
resolved target MUST remain inside allowed root
```

Symlink traversal outside managed directories MUST fail.

---

# 17. Canonical Normalization Boundary

Source content becomes trusted enough for normal system processing only after:

```text
fetch
↓
integrity verification
↓
schema validation
↓
normalization
```

Normalization MUST NOT execute package logic.

Normalization is a pure data transformation.

---

# 18. Canonical Model Safety

The canonical domain model MUST remain declarative.

It SHOULD contain:

```text
metadata
instructions
dependencies
capabilities
configuration
```

It SHOULD NOT contain arbitrary executable code as core domain semantics.

Executable behavior MUST be explicitly classified.

---

# 19. Executable Components

Some component types may eventually represent executable behavior.

Examples:

```text
hooks
scripts
commands
tool integrations
```

Such components MUST declare their security characteristics.

Example:

```yaml
security:
  executable: true

  permissions:
    - filesystem:read
    - shell:execute
```

The exact permission model MAY evolve.

---

# 20. No Execution During Resolution

The Resolver MUST NOT:

```text
execute shell commands
execute package scripts
load arbitrary package code
invoke target runtime hooks
run generated agents
```

Resolution MUST remain a pure dependency computation.

---

# 21. No Execution During Cataloging

Catalog operations MUST NOT execute package code.

The following command:

```bash
agent-plugins catalog list
```

MUST be safe to run against untrusted metadata.

---

# 22. No Execution During Validation

Validation MUST inspect declarative structures only.

Validation MUST NOT invoke package-provided:

```text
scripts
hooks
commands
agents
tools
```

---

# 23. Rendering Security

Target Adapters MAY generate files that will later be interpreted by target runtimes.

Therefore, adapters MUST validate:

```text
output paths
filenames
metadata
target syntax
executable declarations
```

Adapters MUST NOT directly execute rendered output.

---

# 24. Adapter Trust

Adapters are privileged components.

A malicious Target Adapter could potentially write arbitrary files.

Therefore:

```text
Target Adapters SHOULD be first-party or explicitly trusted.
```

Community adapters SHOULD NOT be executed automatically.

---

# 25. Adapter Isolation

Long term, third-party adapters SHOULD run in a restricted execution environment.

Possible techniques:

```text
process isolation
restricted filesystem access
sandbox
capability-based API
WASM
```

This is not required for V1 but SHOULD influence API design.

---

# 26. Adapter Permissions

Future adapter metadata MAY declare:

```yaml
permissions:
  filesystem:
    read:
      - project
    write:
      - target-root

  network: false
```

The core SHOULD eventually be able to enforce these permissions.

---

# 27. Target Root Boundary

Target Adapters MUST produce paths relative to a configured target root.

Example:

```text
targetRoot = .claude/
```

Generated paths MUST remain within this root unless an explicit trusted configuration permits otherwise.

---

# 28. Filesystem Ownership

The system MUST track ownership of generated files.

Files fall into categories:

```text
agent-plugins owned
user owned
unknown
```

The installer MUST NOT overwrite unknown files silently.

---

# 29. Generated File Marker

Generated artifacts SHOULD contain metadata identifying their origin where supported.

Example:

```text
Generated by agent-plugins
Source: skill:typescript
```

Alternatively, ownership MAY be stored in a manifest.

---

# 30. Managed Artifact Manifest

The system SHOULD maintain a record of managed files.

Example:

```yaml
artifacts:
  - path: .claude/skills/typescript/SKILL.md
    source: skill:typescript
    integrity: sha256-...
```

This allows safe cleanup and drift detection.

---

# 31. Unknown File Protection

If a generated path already contains an unknown file:

```text
FAIL
```

unless the user explicitly authorizes overwrite.

Default behavior MUST NOT be overwrite.

---

# 32. Safe Deletion

The system MAY delete files only when:

```text
the file is known to be agent-plugins managed
AND
the desired state no longer contains it
```

Unknown files MUST NOT be removed.

---

# 33. Atomic Apply

Filesystem mutation SHOULD be transactional where possible.

Recommended flow:

```text
render
↓
stage
↓
validate
↓
compare
↓
apply
```

A failed install SHOULD avoid leaving partial state.

---

# 34. Secret Handling

Package content MUST NOT automatically receive access to:

```text
environment variables
credential stores
API keys
SSH keys
cloud credentials
```

The system itself SHOULD minimize reading secrets.

---

# 35. Secret Redaction

Diagnostics and logs MUST redact known secret-like values.

Examples:

```text
API tokens
authorization headers
passwords
private keys
```

No structured output SHOULD include secret values unless explicitly requested and securely supported.

---

# 36. Environment Variables

The CLI MAY read its own configuration variables such as:

```text
AGENT_PLUGINS_*
```

It MUST NOT serialize unrelated environment variables into generated target artifacts.

---

# 37. Configuration Secrets

Project configuration SHOULD NOT contain plaintext secrets.

Configuration SHOULD instead reference external secret mechanisms where necessary.

Example:

```yaml
tokenEnv: GITHUB_TOKEN
```

rather than:

```yaml
token: ghp_secretvalue
```

---

# 38. Logging

Logging MUST avoid printing:

```text
credentials
raw authorization headers
private keys
full secret-bearing URLs
```

Debug mode MUST obey the same security requirements.

---

# 39. Integrity

Externally sourced packages SHOULD be integrity-verified.

Recommended digest:

```text
SHA-256
```

Example:

```yaml
integrity: sha256-abc...
```

Integrity MUST be recorded in the lockfile where applicable.

---

# 40. Integrity Scope

Integrity MAY cover:

```text
source archive
normalized package
individual artifacts
```

V1 SHOULD at minimum support integrity for fetched immutable source content.

---

# 41. Integrity Failure

If integrity differs from the lockfile:

```text
ERROR SOURCE_INTEGRITY_MISMATCH
```

The system MUST fail closed.

It MUST NOT silently regenerate the hash.

---

# 42. Immutable References

Preferred external references:

```text
Git commit SHA
content hash
immutable release artifact
```

Discouraged for lockfiles:

```text
main
latest
master
HEAD
```

Floating references SHOULD resolve to immutable identifiers before locking.

---

# 43. Lockfile Security

The lockfile is a security-sensitive artifact.

It records:

```text
versions
revisions
integrity
source origins
adapter versions
```

Unexpected lockfile changes SHOULD be reviewable.

---

# 44. Lockfile Verification

CI SHOULD run:

```bash
agent-plugins lock verify
```

Verification SHOULD include:

```text
schema
source revisions
integrity
configuration compatibility
adapter versions
```

---

# 45. Policy Security Role

Policy is the primary declarative enforcement layer.

Examples:

```yaml
deny:
  trust:
    - community

  capabilities:
    - shell-execute

  sources:
    - unknown
```

Policy evaluation MUST happen before target rendering.

---

# 46. Policy Cannot Be Bypassed

Target Adapters MUST NOT restore packages or capabilities rejected by Policy.

Source Adapters MUST NOT mark content as trusted beyond configured trust policy.

CLI convenience commands MUST NOT bypass Policy.

---

# 47. Capability Risk Classification

Capabilities SHOULD eventually include security risk metadata.

Example:

```yaml
capability:
  id: shell-execution

  risk:
    level: high
```

Suggested classes:

```text
informational
low
medium
high
critical
```

Risk classification MAY influence policy.

---

# 48. Suggested Sensitive Capabilities

The system SHOULD recognize capabilities such as:

```text
filesystem-read
filesystem-write
shell-execute
network-access
secret-access
git-write
process-spawn
browser-control
external-api
runtime-hook
```

These represent security semantics rather than target-specific features.

---

# 49. Permission Model

A future canonical permission model SHOULD be capability-based.

Example:

```yaml
permissions:
  filesystem:
    read:
      - project

    write:
      - generated-root

  network:
    allow:
      - api.github.com

  process:
    spawn: false
```

V1 MAY only model permissions without enforcing all of them.

---

# 50. Default Permissions

Default should be restrictive:

```text
network: denied
shell execution: denied
secret access: denied
arbitrary filesystem write: denied
```

Explicit target/runtime execution may later expand these permissions.

---

# 51. Hooks

Hooks are inherently security-sensitive.

A hook MAY execute automatically due to lifecycle events.

Therefore hooks SHOULD require:

```text
explicit declaration
policy approval
target support
clear diagnostics
```

Unknown executable hooks SHOULD fail or be disabled.

---

# 52. Hook Transparency

CLI planning SHOULD clearly surface hooks.

Example:

```text
Executable behavior detected:

hook:session-start
  source: vendor/example
  action: shell command
```

Dangerous behavior MUST NOT be buried in verbose output only.

---

# 53. Commands

Agent commands may contain instructions that encourage tool execution.

The platform itself SHOULD treat command definitions as data.

It MUST NOT execute them during:

```text
catalog
resolve
build
install
```

Execution belongs to the target runtime.

---

# 54. Prompt Injection

External instruction content may contain malicious prompts.

Agent Plugins cannot fully prevent runtime prompt injection.

However, it SHOULD reduce risk by preserving boundaries.

External packages MUST NOT be allowed to alter unrelated canonical components silently.

---

# 55. Instruction Provenance

Generated instructions SHOULD retain provenance where practical.

This enables users to answer:

```text
Where did this instruction come from?
```

Example:

```text
agent:reviewer
source: vendor/ecc
revision: abc123
```

---

# 56. Semantic Overlay Security

Overlays may intentionally modify imported content.

Overlay application MUST be explicit and deterministic.

An upstream package MUST NOT be able to define an overlay that modifies another package unless permitted by the canonical model.

---

# 57. Overlay Boundary

Overlay target references MUST be validated.

Example:

```yaml
target: plugin:example
```

An overlay MUST NOT use filesystem traversal to target arbitrary files.

---

# 58. Supply Chain Threats

The platform MUST consider:

```text
upstream repository compromise
maintainer account compromise
dependency takeover
malicious release
tag retargeting
registry compromise
DNS compromise
```

Mitigations include:

```text
immutable revisions
integrity hashes
provenance
policy
manual review
trusted sources
```

---

# 59. Dependency Confusion

Canonical package IDs MUST be resolved within explicitly configured source namespaces.

The resolver MUST NOT automatically query arbitrary remote registries when a local dependency is missing.

This prevents dependency confusion.

---

# 60. Source Namespace

Sources SHOULD have explicit identity.

Example:

```text
first-party:typescript
vendor:mattpocock/typescript
community:foo/typescript
```

Even if canonical aliases exist, provenance MUST remain distinguishable.

---

# 61. Source Precedence

Source precedence MUST be explicit.

The system MUST NOT implicitly prefer a remote package over a local or first-party package with the same ID.

Collisions SHOULD fail unless policy/configuration explicitly resolves them.

---

# 62. Typosquatting

Community package ecosystems may contain similar names.

The CLI SHOULD display:

```text
provider
source
trust level
```

during package selection.

It SHOULD avoid silently selecting packages based solely on fuzzy search.

---

# 63. Update Security

Updates are a major supply-chain risk.

`update` MUST:

```text
discover candidate
verify provenance
fetch
verify integrity
normalize
validate
resolve
apply policy
show change
update lockfile
```

It MUST NOT automatically install runtime artifacts unless explicitly requested.

---

# 64. Update Preview

Users SHOULD see:

```text
version changes
revision changes
source changes
capability changes
permission changes
executable behavior changes
```

before critical updates.

---

# 65. Security-Sensitive Update Diff

An update SHOULD be highlighted if it adds:

```text
hooks
shell execution
new network access
new source
new permissions
new executable components
```

These SHOULD be treated as security-relevant changes.

---

# 66. Trust Downgrade Detection

The system SHOULD detect when an update changes trust characteristics.

Example:

```text
trusted-vendor
→ unknown source
```

This SHOULD fail by default.

---

# 67. Adapter Supply Chain

Adapter versions SHOULD be pinned.

Target adapter changes may significantly alter generated runtime configuration.

The lockfile SHOULD record adapter versions.

---

# 68. Adapter Upgrade Review

Adapter upgrades SHOULD be reviewable independently from package updates.

Example:

```text
Claude adapter:
1.2.0 → 2.0.0
```

A major adapter upgrade SHOULD trigger regeneration preview.

---

# 69. CLI Security

The CLI MUST:

```text
validate all user paths
avoid shell interpolation
avoid command injection
separate arguments from command strings
avoid eval
avoid dynamic arbitrary imports from untrusted sources
```

---

# 70. Shell Commands

If the implementation ever needs to invoke system commands:

```text
arguments MUST be passed as argument arrays
```

Avoid:

```text
exec("git clone " + userInput)
```

Prefer structured subprocess APIs.

---

# 71. Configuration Injection

Config values MUST NOT be blindly inserted into shell commands, generated scripts, or executable configuration.

Adapters MUST escape or validate target syntax appropriately.

---

# 72. Temporary Files

Temporary directories SHOULD:

```text
use secure random names
have restrictive permissions where appropriate
be cleaned after use
```

Sensitive content SHOULD not persist in temporary locations unnecessarily.

---

# 73. Cache Security

Source cache MUST NOT be treated as trusted merely because it already exists locally.

Cache entries SHOULD be associated with:

```text
source
revision
integrity
```

Corrupt cache entries MUST fail integrity verification.

---

# 74. Cache Poisoning

Cache keys SHOULD include immutable identifiers or strong hashes.

Avoid cache identity based solely on:

```text
package name
branch name
```

---

# 75. Offline Mode

Offline mode SHOULD strengthen reproducibility.

```bash
agent-plugins build --offline
```

must prevent network access.

If locked content is unavailable:

```text
fail
```

rather than fetching.

---

# 76. CI Security

CI SHOULD use:

```text
frozen lockfile
offline mode where possible
strict validation
policy enforcement
integrity verification
```

Recommended:

```bash
agent-plugins validate --strict

agent-plugins lock verify

agent-plugins build \
  --frozen-lockfile \
  --offline
```

---

# 77. CI Secrets

CI secrets MUST NOT be exposed to package content during catalog, resolution, or rendering.

Source adapters MAY need credentials to fetch private repositories.

These credentials SHOULD remain scoped to the fetch operation only.

---

# 78. Credential Scope

Source credentials SHOULD follow least privilege.

Example GitHub token SHOULD have:

```text
read-only repository access
```

rather than broad organization privileges.

---

# 79. Private Sources

Private source metadata SHOULD not be accidentally emitted into public logs.

Repositories MAY be displayed by name, but embedded credentials MUST be removed.

For example:

```text
https://token@github.com/org/repo
```

must be sanitized before logging.

---

# 80. Local Project Trust

Local repository content MAY be malicious.

Running Agent Plugins in an untrusted cloned project SHOULD NOT automatically:

```text
execute scripts
load arbitrary JavaScript configuration
execute custom adapters
run hooks
```

Configuration SHOULD preferably remain declarative.

---

# 81. Configuration as Data

Project configuration SHOULD use declarative formats such as:

```text
YAML
JSON
TOML
```

rather than executable:

```text
JavaScript
TypeScript
Python
```

for the default configuration path.

This significantly reduces configuration-based arbitrary code execution.

---

# 82. Plugin Author Security

Package authors SHOULD declare:

```text
required capabilities
security-sensitive behaviors
external resources
runtime requirements
```

Undeclared permissions SHOULD not be assumed.

---

# 83. Target Runtime Responsibility

Agent Plugins controls package management and artifact generation.

It does not fully control the security model of the runtime consuming those artifacts.

Therefore:

```text
Agent Plugins security
+
Target runtime security
```

together determine final runtime risk.

---

# 84. Capability Degradation

When a Target Adapter cannot safely represent a security-sensitive capability:

```text
fail
```

is preferred over silent omission.

Example:

```text
hook requiring shell execution
```

must not quietly become an unrestricted prompt.

---

# 85. Fail-Closed Conditions

The system SHOULD fail closed for:

```text
integrity mismatch
unknown critical schema
path traversal
artifact collision
policy rejection
unsafe executable capability
trust downgrade
ambiguous source identity
unsupported security-sensitive mapping
```

---

# 86. Fail-Open Conditions

Fail-open behavior MAY be acceptable only for non-critical presentation issues.

Example:

```text
missing optional package description
```

Security semantics MUST NOT fail open.

---

# 87. Diagnostics

Security-related diagnostics SHOULD have dedicated codes.

Recommended examples:

```text
SEC_PATH_TRAVERSAL

SEC_INTEGRITY_MISMATCH

SEC_UNTRUSTED_SOURCE

SEC_EXECUTABLE_COMPONENT

SEC_PERMISSION_ESCALATION

SEC_UNKNOWN_FILE_COLLISION

SEC_SECRET_EXPOSURE

SEC_ADAPTER_UNTRUSTED

SEC_TRUST_DOWNGRADE

SEC_SOURCE_NAMESPACE_COLLISION
```

---

# 88. Security Diagnostic Severity

Recommended severity levels:

```text
info
warning
error
critical
```

Critical diagnostics SHOULD immediately block mutation.

---

# 89. Security Review Output

Future command:

```bash
agent-plugins inspect --security
```

could display:

```text
Sources
Trust levels
Executable components
Permissions
Hooks
Network requirements
Integrity status
```

This MAY later become:

```bash
agent-plugins security audit
```

---

# 90. Security Audit Command

Potential future interface:

```text
agent-plugins security audit
```

It MAY inspect:

```text
package trust
integrity
dangerous capabilities
adapter permissions
source changes
lockfile anomalies
generated executable artifacts
```

This is post-MVP.

---

# 91. License Security

License metadata is primarily legal/compliance data but may influence organization policy.

External packages SHOULD record license information where known.

Policy MAY eventually restrict:

```text
unknown licenses
forbidden licenses
```

---

# 92. Provenance Requirements

Every external package SHOULD answer:

```text
Who published it?

Where did it come from?

Which exact revision?

Was it modified?

Which overlays were applied?
```

The system MUST preserve enough information to reconstruct this chain.

---

# 93. Provenance Chain

Example:

```text
GitHub repository
      ↓
commit abc123
      ↓
vendor import
      ↓
overlay organization/security
      ↓
canonical package
      ↓
resolved graph
      ↓
Claude adapter
      ↓
.claude/agents/reviewer.md
```

This chain SHOULD remain inspectable.

---

# 94. Generated Artifact Provenance

A generated artifact SHOULD be traceable back to:

```text
canonical component
package
provider
source
revision
adapter
```

This enables incident investigation.

---

# 95. Security Incident Response

If a package is discovered to be malicious:

The system SHOULD make it possible to:

```text
identify affected projects
identify locked revisions
identify generated artifacts
disable source
deny package via policy
regenerate safe state
```

Remote revocation infrastructure MAY come later.

---

# 96. Denylist

A future security service MAY support package or revision denylists.

Example:

```yaml
deny:
  revisions:
    - source: vendor/foo
      revision: compromised-sha
```

Local policy MUST remain usable without remote services.

---

# 97. Security Advisory Metadata

Future registries MAY publish:

```text
security advisories
affected versions
severity
recommended fixed versions
```

Update tooling MAY surface them.

It MUST NOT silently upgrade without respecting update policy.

---

# 98. Package Signatures

Future versions MAY support cryptographic signatures.

Possible model:

```text
publisher key
      ↓
package signature
      ↓
verification
```

Signatures complement, but do not replace:

```text
integrity
provenance
policy
review
```

---

# 99. Trusted Publisher Model

A future registry MAY distinguish:

```text
verified publisher
trusted vendor
community publisher
unknown
```

Verified identity MUST NOT imply a package is safe.

It only strengthens provenance.

---

# 100. Sandboxing

If Agent Plugins eventually executes third-party code, execution MUST occur in a sandbox.

Possible boundaries:

```text
filesystem
network
process
environment
secrets
CPU
memory
time
```

Arbitrary host execution MUST NOT become the default.

---

# 101. Runtime Hooks and Sandboxing

Runtime hooks present the highest likely execution risk.

If the platform later supports executing hooks itself, the minimum security architecture SHOULD include:

```text
permission declaration
user approval
policy evaluation
sandboxing
resource limits
audit trail
```

V1 MUST NOT execute arbitrary package hooks.

---

# 102. Network Security

Source Adapters SHOULD use secure transports.

Prefer:

```text
HTTPS
SSH
```

Plaintext protocols SHOULD be rejected unless explicitly allowed for local development.

---

# 103. SSRF

If remote URLs can be configured, hosted implementations MUST consider SSRF.

Potential mitigations:

```text
protocol allowlist
private IP restrictions
DNS validation
redirect validation
network sandbox
```

This is especially relevant for future cloud services.

---

# 104. Redirects

HTTP Source Adapters SHOULD limit redirect chains and revalidate destination security after redirects.

A redirect from trusted public URL to internal infrastructure MUST NOT automatically inherit trust.

---

# 105. Resource Limits

External packages MAY attempt denial-of-service through:

```text
huge files
huge archives
deep directory trees
cyclic structures
large manifests
dependency explosions
```

Implementations SHOULD impose reasonable limits.

---

# 106. Dependency Graph Limits

Resolver SHOULD defend against pathological graphs.

Possible limits:

```text
maximum depth
maximum nodes
maximum edges
```

Limits SHOULD be configurable but have safe defaults.

---

# 107. Archive Limits

Source Adapters SHOULD protect against decompression bombs.

Possible checks:

```text
compressed size
expanded size
file count
path depth
```

---

# 108. Manifest Limits

Manifest parsers SHOULD limit unreasonable:

```text
document size
nesting depth
string length
array size
```

where parser libraries support such controls.

---

# 109. Denial of Service

Security testing SHOULD include:

```text
deep dependency graph
cyclic graph
huge manifest
many files
pathological YAML
large archive
```

---

# 110. YAML Security

If YAML is used:

```text
unsafe custom tags MUST be disabled
```

The parser MUST load data only.

It MUST NOT instantiate arbitrary objects or execute constructors.

---

# 111. JSON Security

JSON parsers MUST avoid unsafe prototype behavior.

Object merging MUST defend against prototype pollution keys such as:

```text
__proto__
constructor
prototype
```

especially in overlay operations.

---

# 112. Overlay Merge Security

Merge operations MUST use safe object merge semantics.

Prototype pollution MUST be prevented.

Fields such as:

```text
__proto__
prototype
constructor
```

SHOULD be rejected when inappropriate.

---

# 113. Template Injection

Target adapters that use templates MUST treat canonical content as data.

Avoid unsafe template engines that permit arbitrary code execution.

Templates SHOULD NOT evaluate package-provided expressions.

---

# 114. Filename Injection

Package names and IDs MUST NOT become filenames without normalization.

Example canonical ID:

```text
../../evil
```

must never produce a filesystem path.

ID grammar SHOULD prevent such values before adapter rendering.

---

# 115. Case Sensitivity

The system SHOULD detect collisions caused by case-insensitive filesystems.

Example:

```text
Reviewer.md
reviewer.md
```

may collide on Windows/macOS.

Collision detection SHOULD consider target filesystem behavior.

---

# 116. Reserved Filenames

Adapters SHOULD protect against platform-reserved filenames.

Examples on Windows include:

```text
CON
PRN
AUX
NUL
COM1
LPT1
```

Cross-platform builds SHOULD validate these where relevant.

---

# 117. File Permissions

Generated files SHOULD use conservative permissions.

Executable bits MUST NOT be set unless explicitly required.

Secret-bearing files, if ever supported, SHOULD receive stricter permissions.

---

# 118. Source Cache Permissions

Cache directories SHOULD be user-private where possible.

Shared caches require explicit security review.

---

# 119. Temporary Credential Handling

Credentials used for remote fetch SHOULD exist only as long as necessary.

They SHOULD NOT be copied into:

```text
lockfiles
cache metadata
generated artifacts
logs
diagnostics
```

---

# 120. Security and Explainability

Users SHOULD be able to understand security decisions.

Example:

```text
plugin:foo was blocked

Reason:
  source trust = community

Policy:
  organization-security

Rule:
  deny community sources with shell-execute capability
```

Security enforcement SHOULD not feel arbitrary.

---

# 121. Security and Determinism

Security decisions MUST be deterministic.

Given identical:

```text
configuration
policy
catalog
lockfile
source metadata
```

the policy/security result SHOULD be identical.

---

# 122. Security Configuration

Security controls SHOULD be configurable through Policy rather than scattered CLI flags.

Avoid:

```bash
--allow-dangerous-hooks
--allow-random-source
--ignore-integrity
```

as routine flags.

Persistent security intent belongs in policy configuration.

---

# 123. Emergency Override

Rare emergency overrides MAY exist.

They MUST be:

```text
explicit
high visibility
non-default
auditable
```

Example concept:

```bash
agent-plugins install \
  --override-policy SEC_XYZ
```

This SHOULD NOT exist in early versions unless a strong use case emerges.

---

# 124. Security Test Strategy

Security tests SHOULD include:

```text
path traversal

symlink escape

archive traversal

integrity mismatch

package collision

unknown file overwrite

policy bypass attempt

source trust downgrade

prototype pollution

malicious YAML

dangerous filenames

dependency explosion
```

---

# 125. Fuzzing

Future implementations SHOULD consider fuzzing:

```text
manifest parser
canonical reference parser
overlay merge logic
path normalization
archive handling
```

---

# 126. Static Analysis

The repository SHOULD use automated security checks where practical.

Potential tools:

```text
dependency vulnerability scanning
secret scanning
static analysis
license scanning
```

Exact tooling is implementation-specific.

---

# 127. Dependency Hygiene

Runtime dependencies SHOULD be minimized.

Particularly sensitive modules include:

```text
archive extraction
Git wrappers
template engines
YAML parsers
filesystem utilities
process execution
```

Dependencies in these areas deserve higher review.

---

# 128. Dependency Pinning

Project dependencies SHOULD use reproducible lockfiles.

CI SHOULD verify package-manager lockfile integrity.

This is separate from the Agent Plugins domain lockfile.

---

# 129. Build Security

Release builds SHOULD be reproducible where practical.

Release pipelines SHOULD restrict who can publish official CLI and adapters.

---

# 130. Release Signing

Future releases MAY include:

```text
artifact signatures
provenance attestations
SBOM
```

These are recommended before ecosystem-scale distribution.

---

# 131. Security Responsibility Matrix

```text
Source Adapter
    → secure retrieval and normalization

Catalog
    → safe indexing

Resolver
    → pure deterministic dependency selection

Policy
    → security enforcement

Lockfile
    → integrity and reproducibility

Target Adapter
    → safe target representation

Filesystem Layer
    → safe mutation

CLI
    → safe orchestration and transparent UX

Target Runtime
    → execution-time enforcement
```

---

# 132. Security Invariants

The following are normative.

## Invariant 1 — No implicit execution

Fetching, cataloging, resolving, validating, building, or installing MUST NOT execute package-provided arbitrary code.

## Invariant 2 — No arbitrary filesystem writes

All generated writes MUST remain inside approved target roots.

## Invariant 3 — No unknown overwrite

Unknown user-owned files MUST NOT be overwritten silently.

## Invariant 4 — Integrity enforcement

Pinned external content MUST fail if integrity verification fails.

## Invariant 5 — Provenance preservation

External content MUST preserve source identity and revision.

## Invariant 6 — Policy authority

Security Policy MUST be evaluated before rendering or installation.

## Invariant 7 — Adapter isolation

Adapters MUST NOT bypass filesystem or policy boundaries.

## Invariant 8 — Secret isolation

Package content MUST NOT automatically gain access to secrets.

## Invariant 9 — Explicit executable behavior

Executable capabilities MUST be visible and classifiable.

## Invariant 10 — Fail closed

Critical security ambiguity MUST block the operation.

---

# 133. MVP Security Requirements

Before MVP release, the following MUST exist:

```text
path traversal protection

canonical ID validation

safe YAML parsing

no package execution

safe render paths

unknown file protection

policy engine

source provenance

lockfile integrity support

secret-safe logging

adapter validation

collision detection
```

---

# 134. Pre-Community Requirements

Before community sources are enabled broadly:

```text
source trust classification

integrity verification

vendor/community distinction

security-sensitive capability metadata

policy enforcement

update security diff

source namespace collision handling

security documentation
```

---

# 135. Pre-Registry Requirements

Before a public registry exists:

```text
publisher identity

package integrity

namespace ownership

trust metadata

license metadata

security advisories

malicious package response process
```

---

# 136. Pre-Third-Party Adapter Requirements

Before arbitrary third-party adapters can run:

```text
adapter trust model

permission model

sandbox strategy

adapter signing/provenance

filesystem enforcement

network enforcement
```

Until then:

> Adapters SHOULD be treated as trusted application code.

---

# 137. Security Roadmap

Recommended implementation order:

```text
1. Safe canonical IDs

2. Path validation

3. Declarative configuration

4. Safe schema parsing

5. No execution guarantees

6. Provenance model

7. Integrity model

8. Policy enforcement

9. Safe render planning

10. File ownership tracking

11. Source trust classification

12. Security-sensitive capabilities

13. Update security diff

14. Community trust model

15. Adapter sandboxing
```

---

# 138. Threat-to-Control Matrix

| Threat | Primary Control |
|---|---|
| Path traversal | Path validation |
| Malicious install script | No implicit execution |
| Upstream tampering | Immutable revisions + integrity |
| Unknown file overwrite | Ownership tracking |
| Dependency confusion | Explicit source namespaces |
| Malicious hooks | Capability classification + policy |
| Secret leakage | Secret isolation + redaction |
| Adapter abuse | Trusted adapters + future sandbox |
| Cache poisoning | Integrity-keyed cache |
| Trust downgrade | Trust metadata + policy |
| Prompt injection | Provenance + isolation + runtime policy |
| Prototype pollution | Safe merge logic |
| Archive bomb | Resource limits |
| Dependency explosion | Resolver limits |

---

# 139. Recommended Security Defaults

Default configuration SHOULD approximate:

```yaml
security:
  allowNetworkDuringBuild: false

  executePackageCode: false

  unknownFileOverwrite: deny

  integrity:
    requiredForExternalSources: true

  trust:
    allowed:
      - first-party
      - trusted-vendor

  executableCapabilities:
    default: deny
```

Exact syntax belongs in `configuration-spec.md` and `policy-spec.md`.

---

# 140. Security Posture

The intended security posture is:

```text
Discover broadly
Trust selectively
Resolve deterministically
Verify integrity
Enforce policy
Render safely
Mutate minimally
Execute elsewhere
```

Agent Plugins should operate primarily as a:

> declarative package, resolution, and rendering system

rather than an execution framework.

This boundary significantly reduces the attack surface.

---

# 141. Related Specifications

This document should be read together with:

```text
architecture.md
source-of-truth.md

manifest-spec.md
catalog-spec.md
resolution-spec.md
policy-spec.md
lockfile-spec.md
adapter-spec.md
cli-spec.md
source-spec.md
update-spec.md
overlay-spec.md
configuration-spec.md
```

Security responsibilities:

```text
source-spec
    → secure ingestion

manifest-spec
    → safe declarative package structure

resolution-spec
    → pure dependency selection

policy-spec
    → declarative authorization

lockfile-spec
    → integrity + reproducibility

adapter-spec
    → safe boundary translation

overlay-spec
    → controlled semantic modification

update-spec
    → secure dependency evolution

cli-spec
    → safe orchestration

security-model
    → system-wide threat and control model
```

---

# 142. Final Decision Summary

The security architecture is based on five fundamental boundaries:

```text
External content is untrusted.

Packages are data, not executable installers.

Resolution is pure.

Policy controls permission.

Filesystem mutation occurs only through validated plans.
```

The most important invariant is:

```text
download ≠ trust
trust ≠ execute
resolve ≠ install
install ≠ execute
```

Maintaining these separations is the foundation of the Agent Plugins security model.