# Agent Registry — Technical Specification

> **Status:** Draft / Implementation Ready  
> **Version:** 0.1.0  
> **Primary target:** Claude Code + Agent Skills ecosystem  
> **Future targets:** Codex, OpenCode, Cursor, Gemini CLI, other agent runtimes  
> **Repository:** `agent-registry`

---

# 1. Overview

`agent-registry` là một registry cá nhân để quản lý, curate, phát triển, version và phân phối:

- Agent Skills.
- Claude Code subagents.
- Hooks.
- Rules/prompts.
- MCP configurations.
- Plugin bundles.
- Project profiles.
- Third-party/vendor skills.
- First-party skills và agents tự phát triển.

Registry đóng vai trò là **single source of truth** giữa upstream repositories và các project sử dụng agent.

Thay vì mỗi project trực tiếp cài:

```text
browser-use/browser-use
clerk/skills
mattpocock/skills
Leonxlnx/taste-skill
vercel-labs/agent-skills
github/awesome-copilot
affaan-m/ECC
...
```

mọi project chỉ phụ thuộc vào:

```text
agent-registry
```

Registry chịu trách nhiệm:

```text
discover
→ import
→ normalize
→ curate
→ review
→ version
→ compose
→ distribute
→ install
→ update
```

---

# 2. Problem Statement

Hiện tại các Agent Skills được phân tán trên nhiều repository.

Có hai cách cài phổ biến nhưng đều có vấn đề.

## 2.1 Global installation

Ví dụ:

```text
~/.claude/skills/
```

Ưu điểm:

- dễ update;
- dùng được ở mọi project.

Nhược điểm:

- mọi project đều nhìn thấy quá nhiều skill;
- tăng số lượng skill descriptions trong context;
- khó kiểm soát skill nào thực sự cần thiết cho project;
- dễ conflict;
- khó maintain theo domain.

---

## 2.2 Project-local installation

Ví dụ:

```text
mealops/.claude/skills/
lifeops/.claude/skills/
gtel-maps/.claude/skills/
```

Ưu điểm:

- project chỉ chứa skill cần thiết;
- dễ chia sẻ cùng team.

Nhược điểm:

- cùng một skill bị duplicated ở nhiều repository;
- update vendor phải thực hiện nhiều lần;
- khó theo dõi upstream;
- version drift giữa projects;
- khó quản lý bộ skill lớn.

---

# 3. Vision

Xây dựng:

> **A personal package registry and distribution system for agent capabilities.**

Registry tương tự về concept với:

```text
npm registry
Homebrew Tap
APT repository
VS Code Marketplace
Claude Plugin Marketplace
```

nhưng dành cho:

```text
Skills
Agents
Hooks
Rules
Prompts
MCP
Agent Plugins
Project Profiles
```

Kiến trúc tổng quát:

```text
Upstream repositories
        │
        ▼
    Vendor Layer
        │
        ▼
      Review
        │
        ▼
   Agent Registry
        ▲
        │
   First-party
 Skills / Agents
        │
        ▼
 Plugins / Profiles
        │
        ▼
      Adapters
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
Claude Codex OpenCode ...
        │
        ▼
     Projects
```

---

# 4. Goals

Hệ thống MUST hỗ trợ các mục tiêu sau.

## G1 — Centralized Management

Tất cả skills, agents và related resources được quản lý từ một registry.

---

## G2 — First-party Development

Cho phép phát triển:

```text
first-party skills
first-party agents
first-party hooks
first-party prompts
first-party rules
```

mà không phụ thuộc vendor.

---

## G3 — Vendor Curation

Có thể import một subset từ repository bên ngoài.

Ví dụ:

```text
mattpocock/skills
  40 skills
```

registry chỉ lấy:

```text
domain-modeling
codebase-design
research
handoff
```

---

## G4 — Controlled Updates

Vendor updates không được tự động overwrite registry.

Workflow bắt buộc:

```text
detect update
→ diff
→ validation
→ PR
→ review
→ merge
```

---

## G5 — Project Isolation

Project chỉ load components thực sự cần thiết.

Ví dụ:

```text
MealOps
  → core
  → architecture
  → nextjs
  → clerk
```

không load toàn bộ registry.

---

## G6 — Reproducibility

Một revision của registry phải có thể rebuild lại chính xác cùng version vendor.

---

## G7 — Multi-Agent Ready

Canonical content không được coupling chặt với Claude Code.

Platform-specific behavior phải nằm trong adapter layer.

---

## G8 — Composability

Phải có khả năng compose:

```text
skills
→ plugins
→ profiles
→ project configuration
```

---

## G9 — Local Developer Experience

Project mới phải có khả năng bootstrap bằng một command.

Ví dụ:

```bash
agent-registry init
```

hoặc:

```bash
agent-registry apply nextjs
```

---

# 5. Non-goals

Version đầu tiên KHÔNG cần:

- public marketplace;
- web UI;
- cloud backend;
- centralized SaaS registry;
- database server;
- arbitrary remote code execution;
- full dependency solver như npm;
- semantic version resolution phức tạp;
- cross-machine synchronization server.

Git repository là source of truth trong giai đoạn đầu.

---

# 6. Core Principles

## 6.1 Canonical Source ≠ Generated Output

Không chỉnh sửa generated files.

```text
source
   ↓
build
   ↓
distribution
```

---

## 6.2 First-party và Vendor phải tách biệt

```text
first-party/
vendor/
```

Không trộn hai loại.

---

## 6.3 Vendor là Immutable Snapshot

Không chỉnh trực tiếp:

```text
vendor/
```

Customization phải dùng:

```text
overlays/
```

---

## 6.4 Skills là Capability

Skill chứa:

```text
knowledge
workflow
instructions
references
scripts
```

Skill không đại diện cho một worker độc lập.

---

## 6.5 Agent là Worker

Agent định nghĩa:

```text
role
responsibility
tools
model/runtime configuration
skills
behavior
```

Concept:

```text
Agent
 =
Role
+ Instructions
+ Tools
+ Skills
+ Runtime configuration
```

---

## 6.6 Plugin là Distribution Unit

Plugin bundle nhiều thành phần:

```text
Plugin
├── skills
├── agents
├── hooks
├── rules
└── MCP
```

---

## 6.7 Profile là Composition

Profile mô tả loại project.

Ví dụ:

```text
nextjs
cloudflare
backend
research
product
fullstack
```

Profile không phải distribution package.

---

# 7. Domain Model

Core entities:

```text
Source
Component
Skill
Agent
Hook
Plugin
Profile
Adapter
Project
Lock
Overlay
```

Quan hệ:

```text
Source
  │
  └── provides
       │
       ▼
    Component
       │
       ├── Skill
       ├── Agent
       ├── Hook
       └── Rule
            │
            ▼
          Plugin
            │
            ▼
          Profile
            │
            ▼
          Project
```

---

# 8. Component Types

Registry SHOULD hỗ trợ:

```yaml
skill
agent
hook
rule
prompt
mcp
plugin
profile
```

MVP REQUIRED:

```yaml
skill
agent
plugin
profile
```

Phase sau:

```yaml
hook
rule
prompt
mcp
```

---

# 9. Component Ownership

Mỗi component có một ownership type.

```yaml
ownership:
  first-party
  vendor
```

Có thể thêm:

```yaml
ownership:
  fork
```

trong tương lai.

---

# 10. Repository Structure

Cấu trúc canonical:

```text
agent-registry/
│
├── README.md
├── specs.md
├── CHANGELOG.md
├── LICENSE
│
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
│
├── registry.yaml
├── sources.yaml
├── sources.lock.json
│
├── first-party/
│   │
│   ├── skills/
│   │   ├── architecture/
│   │   │   ├── architecture-review/
│   │   │   │   ├── SKILL.md
│   │   │   │   ├── references/
│   │   │   │   └── scripts/
│   │   │   │
│   │   │   └── scalable-folder-design/
│   │   │       └── SKILL.md
│   │   │
│   │   ├── engineering/
│   │   ├── product/
│   │   └── research/
│   │
│   ├── agents/
│   │   ├── architect/
│   │   │   ├── agent.yaml
│   │   │   └── prompt.md
│   │   │
│   │   ├── researcher/
│   │   └── code-reviewer/
│   │
│   ├── hooks/
│   ├── rules/
│   └── prompts/
│
├── vendor/
│   │
│   ├── mattpocock/
│   │   ├── domain-modeling/
│   │   ├── research/
│   │   └── codebase-design/
│   │
│   ├── vercel/
│   ├── clerk/
│   ├── ecc/
│   ├── browser-use/
│   └── taste-skill/
│
├── overlays/
│   │
│   ├── mattpocock/
│   │   └── domain-modeling/
│   │       └── ...
│   │
│   └── ecc/
│
├── plugins/
│   ├── core.yaml
│   ├── architecture.yaml
│   ├── frontend.yaml
│   ├── backend.yaml
│   ├── security.yaml
│   ├── agentic-engineering.yaml
│   └── browser.yaml
│
├── profiles/
│   ├── minimal.yaml
│   ├── fullstack.yaml
│   ├── nextjs.yaml
│   ├── cloudflare.yaml
│   ├── product.yaml
│   └── research.yaml
│
├── adapters/
│   ├── agent-skills/
│   ├── claude-code/
│   ├── codex/
│   └── opencode/
│
├── dist/
│
├── schemas/
│   ├── registry.schema.json
│   ├── sources.schema.json
│   ├── plugin.schema.json
│   ├── profile.schema.json
│   └── project.schema.json
│
├── src/
│   ├── cli/
│   ├── core/
│   ├── registry/
│   ├── source/
│   ├── resolver/
│   ├── sync/
│   ├── overlay/
│   ├── build/
│   ├── adapters/
│   ├── installer/
│   ├── validator/
│   ├── audit/
│   └── lock/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
└── .github/
    └── workflows/
        ├── validate.yml
        ├── vendor-check.yml
        ├── vendor-update.yml
        └── release.yml
```

---

# 11. Registry Manifest

`registry.yaml` là index cấp cao của toàn registry.

Ví dụ:

```yaml
version: 1

registry:
  name: agent-registry
  description: Personal agent capability registry

components:

  architecture-review:
    type: skill
    ownership: first-party
    category: architecture
    path: first-party/skills/architecture/architecture-review
    stability: stable

  domain-modeling:
    type: skill
    ownership: vendor
    category: architecture
    source: mattpocock
    path: vendor/mattpocock/domain-modeling
    stability: stable

  architect:
    type: agent
    ownership: first-party
    category: architecture
    path: first-party/agents/architect
    stability: experimental
```

---

# 12. Component Identity

Mỗi component phải có globally unique ID.

Format:

```text
[a-z0-9-]+
```

Ví dụ:

```text
domain-modeling
architecture-review
vercel-react-best-practices
clerk-webhooks
solution-architect
```

Không dùng:

```text
DomainModeling
domain_modeling
domain.modeling
```

---

# 13. Component Stability

Mỗi component SHOULD có lifecycle:

```yaml
experimental
stable
deprecated
disabled
```

Ý nghĩa:

### experimental

Có thể thay đổi breaking.

### stable

Dùng bình thường.

### deprecated

Vẫn tồn tại nhưng không nên thêm vào project mới.

### disabled

Không được build/install.

---

# 14. Source Manifest

`sources.yaml` quản lý upstream.

Ví dụ:

```yaml
version: 1

sources:

  mattpocock:
    type: github
    repository: mattpocock/skills
    ref: main

    components:
      - type: skill
        name: research

      - type: skill
        name: domain-modeling

      - type: skill
        name: codebase-design

      - type: skill
        name: improve-codebase-architecture

      - type: skill
        name: writing-for-agents

      - type: skill
        name: handoff

  vercel:
    type: github
    repository: vercel-labs/agent-skills
    ref: main

    components:
      - type: skill
        name: vercel-composition-patterns

      - type: skill
        name: vercel-react-best-practices

  clerk:
    type: github
    repository: clerk/skills
    ref: main

    components:
      - type: skill
        name: clerk-backend-api
      - type: skill
        name: clerk-cli
      - type: skill
        name: clerk-custom-ui
      - type: skill
        name: clerk-orgs
      - type: skill
        name: clerk-react-patterns
      - type: skill
        name: clerk-setup
      - type: skill
        name: clerk-testing
      - type: skill
        name: clerk-webhooks
```

---

# 15. Lock File

`sources.lock.json` đảm bảo reproducibility.

Ví dụ:

```json
{
  "version": 1,
  "sources": {
    "mattpocock": {
      "repository": "mattpocock/skills",
      "requestedRef": "main",
      "resolvedCommit": "abc123",
      "syncedAt": "2026-09-20T00:00:00Z"
    },
    "vercel": {
      "repository": "vercel-labs/agent-skills",
      "requestedRef": "main",
      "resolvedCommit": "def456",
      "syncedAt": "2026-09-20T00:00:00Z"
    }
  }
}
```

Lock file MUST:

- được commit;
- chỉ thay đổi khi vendor sync được approve;
- lưu resolved Git commit;
- không chỉ lưu branch name.

---

# 16. Vendor Storage

Vendor directory chỉ chứa components được chọn.

Ví dụ upstream:

```text
mattpocock/skills
├── skill-a
├── skill-b
├── domain-modeling
├── research
└── 50 others
```

Registry:

```text
vendor/mattpocock/
├── domain-modeling/
└── research/
```

Không mirror toàn repository nếu không cần.

---

# 17. Vendor Update Flow

Update MUST theo quy trình:

```text
fetch
  ↓
resolve latest commit
  ↓
compare lock
  ↓
detect changed selected components
  ↓
download temporary snapshot
  ↓
validate
  ↓
diff
  ↓
update vendor/
  ↓
update lock
  ↓
create PR
```

Không được:

```text
cron
→ overwrite main
```

---

# 18. Vendor Cache

Temporary repositories không lưu trong source tree.

Cache:

```text
~/.cache/agent-registry/
```

Ví dụ:

```text
~/.cache/agent-registry/
└── sources/
    └── github.com/
        └── mattpocock/
            └── skills/
```

Cache MUST gitignored.

---

# 19. Overlay System

Không chỉnh vendor directly.

Nếu cần customize:

```text
overlays/<source>/<component>/
```

Overlay có thể:

```yaml
replace
merge
append
delete
```

MVP chỉ cần hỗ trợ:

```text
replace files
```

Ví dụ:

```text
vendor/mattpocock/domain-modeling/SKILL.md
```

và:

```text
overlays/mattpocock/domain-modeling/SKILL.md
```

Build result dùng overlay version.

Phase sau có thể hỗ trợ patch:

```text
patches/
```

---

# 20. First-party Skills

Canonical structure:

```text
first-party/skills/<category>/<skill>/
│
├── SKILL.md
├── references/
├── scripts/
├── templates/
└── assets/
```

Minimum:

```text
SKILL.md
```

Example:

```markdown
---
name: scalable-folder-design
description: Design scalable repository and application folder structures.
---

# Scalable Folder Design

...
```

---

# 21. Skill Design Guidelines

Một skill SHOULD:

- giải quyết một capability rõ ràng;
- có description cụ thể;
- tránh quá rộng;
- không chứa project-specific secrets;
- không hardcode absolute paths;
- không phụ thuộc implicit global state;
- có references nếu knowledge dài;
- có scripts nếu workflow deterministic;
- mô tả rõ when-to-use;
- mô tả rõ when-not-to-use.

---

# 22. First-party Agents

Canonical representation không nên phụ thuộc hoàn toàn vào Claude.

```text
first-party/agents/architect/
├── agent.yaml
└── prompt.md
```

Ví dụ `agent.yaml`:

```yaml
version: 1

name: architect
description: Reviews and designs software architecture.

category: architecture

skills:
  - domain-modeling
  - architecture-review
  - api-design
  - architecture-decision-records

capabilities:
  filesystem: read
  shell: limited
  web: optional

runtime:
  isolation: preferred
```

Prompt:

```text
prompt.md
```

chứa behavior/instructions.

---

# 23. Agent Dependency Resolution

Agent có thể depend vào skills:

```text
architect
   │
   ├── domain-modeling
   ├── api-design
   ├── architecture-review
   └── adr
```

Resolver MUST verify:

- skill tồn tại;
- skill không disabled;
- không có unknown dependency.

---

# 24. Plugins

Plugin là logical distribution bundle.

Ví dụ:

```yaml
# plugins/architecture.yaml

version: 1

name: architecture
description: Architecture design and review toolkit.

skills:
  - domain-modeling
  - codebase-design
  - improve-codebase-architecture
  - architecture-review
  - architecture-decision-records
  - api-design

agents:
  - architect
  - architecture-reviewer
```

---

# 25. Initial Plugins

MVP SHOULD có:

```text
core
architecture
frontend
backend
security
browser
agentic-engineering
clerk
```

Possible future:

```text
product
research
devops
cloudflare
database
testing
gis
documentation
```

---

# 26. Core Plugin

`core` phải rất nhỏ.

Ví dụ:

```yaml
skills:
  - research
  - writing-for-agents
  - handoff
  - codebase-onboarding
```

Không được biến `core` thành:

```text
everything
```

Target:

```text
~5–10 capabilities
```

---

# 27. Profiles

Profile compose plugins/components cho một loại project.

Ví dụ:

```yaml
# profiles/nextjs.yaml

version: 1

name: nextjs

plugins:
  - core
  - architecture
  - frontend
  - security

skills:
  - clerk-setup
  - clerk-react-patterns

agents:
  - architect
  - frontend-reviewer
```

---

# 28. Profile Inheritance

Profile MUST hỗ trợ inheritance.

Ví dụ:

```yaml
# profiles/cloudflare-nextjs.yaml

extends:
  - nextjs
  - cloudflare
```

Resolver cần:

```text
extends
→ plugins
→ explicit skills
→ explicit agents
```

---

# 29. Resolution Rules

Resolution SHOULD follow:

```text
profile parents
        ↓
plugins
        ↓
plugin dependencies
        ↓
agents
        ↓
agent skill dependencies
        ↓
explicit project additions
        ↓
project excludes
```

Sau đó:

```text
deduplicate
→ validate
→ install
```

---

# 30. Project Manifest

Project không commit generated absolute symlinks.

Project commit:

```text
.agent-registry.yaml
```

Ví dụ:

```yaml
version: 1

registry:
  source: ~/workspace/personal/agent-registry

targets:
  - claude-code

profiles:
  - nextjs
  - cloudflare

plugins:
  - clerk

skills:
  include:
    - browser-use

  exclude:
    - industrial-brutalist-ui

agents:
  include:
    - architect

install:
  strategy: symlink
```

---

# 31. Project-local Overrides

Cho phép:

```yaml
skills:
  include: []
  exclude: []

agents:
  include: []
  exclude: []
```

Priority:

```text
profile
< plugin
< project explicit include/exclude
```

Project-level exclusion thắng.

---

# 32. Installation Strategy

Supported:

```yaml
symlink
copy
```

Default:

```yaml
symlink
```

---

# 33. Symlink Strategy

Canonical registry:

```text
~/workspace/personal/agent-registry/
```

Project:

```text
mealops/
└── .claude/
    └── skills/
        ├── domain-modeling -> registry/...
        └── api-design -> registry/...
```

Lợi ích:

```text
single canonical copy
central updates
no duplication
```

---

# 34. Generated Files

Generated files SHOULD contain header where possible:

```text
GENERATED BY agent-registry.
DO NOT EDIT MANUALLY.
```

Generated state MUST NOT trở thành canonical data.

---

# 35. Adapters

Core registry không biết chi tiết runtime.

Interface:

```ts
interface Adapter {
  id: string

  detect(): Promise<boolean>

  validate(
    graph: ResolvedGraph
  ): Promise<ValidationResult>

  build(
    graph: ResolvedGraph
  ): Promise<BuildResult>

  install(
    build: BuildResult,
    target: InstallTarget
  ): Promise<void>

  uninstall(
    target: InstallTarget
  ): Promise<void>
}
```

---

# 36. Agent Skills Adapter

Responsibilities:

- expose portable skills;
- preserve valid `SKILL.md`;
- generate/install to supported Agent Skills locations;
- avoid Claude-specific conversion unless required.

Canonical skills SHOULD remain compatible with Agent Skills format whenever possible.

---

# 37. Claude Code Adapter

Claude adapter handles:

```text
skills
agents
hooks
plugin definitions
marketplace
settings integration
```

Target paths may include:

```text
.claude/skills/
.claude/agents/
.claude/settings.json
.claude-plugin/
```

---

# 38. Claude Skill Generation

Portable skills SHOULD be reused directly.

Không duplicate content nếu không cần.

Claude-specific extensions có thể được bổ sung ở adapter stage.

---

# 39. Claude Agent Generation

Canonical:

```text
first-party/agents/architect/
├── agent.yaml
└── prompt.md
```

Adapter generate:

```text
.claude/agents/architect.md
```

---

# 40. Claude Marketplace Generation

Generate:

```text
.claude-plugin/marketplace.json
```

từ:

```text
plugins/*.yaml
```

Không maintain marketplace manifest bằng tay.

Pipeline:

```text
plugins/*.yaml
      ↓
registry resolver
      ↓
Claude adapter
      ↓
marketplace.json
```

---

# 41. Distribution without Duplication

Tránh tạo nhiều physical copies của cùng skill.

Preferred:

```text
canonical skill
     │
     ├── referenced by registry
     ├── referenced by plugin
     └── installed via adapter
```

Không:

```text
first-party/skill
dist/skill
plugin/skill
copy-of-skill
```

trừ khi runtime bắt buộc.

---

# 42. Internal Build Graph

Resolver tạo graph:

```text
ResolvedGraph
├── sources
├── skills
├── agents
├── hooks
├── plugins
├── profiles
└── dependencies
```

Example:

```text
profile: nextjs
   │
   ├─ plugin: core
   │    ├─ research
   │    └─ handoff
   │
   ├─ plugin: architecture
   │    ├─ domain-modeling
   │    └─ architect
   │          └─ api-design
   │
   └─ plugin: frontend
        └─ react-best-practices
```

---

# 43. Dependency Graph Rules

Resolver MUST detect:

- missing references;
- cyclic profile inheritance;
- cyclic plugin dependencies;
- duplicate IDs;
- conflicting component ownership;
- invalid paths.

Build fails on these conditions.

---

# 44. CLI

Binary:

```text
agent-registry
```

Optional short alias:

```text
areg
```

---

# 45. CLI Command Structure

Target command set:

```text
agent-registry
│
├── init
├── list
├── search
├── info
│
├── source
│   ├── list
│   ├── add
│   ├── remove
│   ├── check
│   └── sync
│
├── skill
│   ├── list
│   ├── create
│   └── info
│
├── agent
│   ├── list
│   ├── create
│   └── info
│
├── plugin
│   ├── list
│   └── info
│
├── profile
│   ├── list
│   └── resolve
│
├── apply
├── sync
├── build
├── validate
├── diff
├── audit
├── doctor
└── clean
```

---

# 46. `init`

Initialize project.

```bash
agent-registry init
```

Interactive:

```text
Select targets:
[x] Claude Code
[ ] Codex
[ ] OpenCode

Select profiles:
[x] nextjs
[x] cloudflare

Install strategy:
[x] symlink
[ ] copy
```

Creates:

```text
.agent-registry.yaml
```

then runs apply.

---

# 47. `apply`

Resolve project manifest and install required components.

```bash
agent-registry apply
```

Optional:

```bash
agent-registry apply nextjs
```

Flow:

```text
read project manifest
→ resolve graph
→ validate
→ adapter build
→ diff existing state
→ install
```

---

# 48. `sync`

Synchronize generated/project installation with registry.

```bash
agent-registry sync
```

Must:

- add missing components;
- update changed links;
- remove no-longer-selected managed components;
- preserve unmanaged user files.

---

# 49. Managed State

Project SHOULD store:

```text
.agent-registry.lock.json
```

Example:

```json
{
  "registryCommit": "abc123",
  "targets": {
    "claude-code": {
      "skills": [
        "domain-modeling",
        "api-design"
      ],
      "agents": [
        "architect"
      ]
    }
  }
}
```

Purpose:

- track installed components;
- safe removal;
- detect drift;
- reproducibility.

---

# 50. `source check`

Check upstream without modifying registry.

```bash
agent-registry source check
```

Output:

```text
SOURCE       CURRENT   LATEST    STATUS
mattpocock   abc123    def456    update
vercel       111aaa    111aaa    current
clerk        aaa999    bbb999    update
```

---

# 51. `source sync`

Example:

```bash
agent-registry source sync mattpocock
```

Behavior:

```text
fetch
resolve
diff
validate
update vendor snapshot
update lock
```

Default MUST NOT silently commit.

---

# 52. `diff`

Examples:

```bash
agent-registry diff mattpocock
```

Output SHOULD show:

```text
domain-modeling
  SKILL.md
    + 12 lines
    - 5 lines

research
  unchanged
```

Optional:

```bash
agent-registry diff --semantic
```

future feature.

---

# 53. `validate`

```bash
agent-registry validate
```

Validate:

```text
registry schema
source schema
SKILL.md
agent definitions
plugin references
profile references
dependency graph
duplicate names
missing files
unsafe paths
```

Exit:

```text
0 valid
1 invalid
```

CI-compatible.

---

# 54. `audit`

Security-oriented validation:

```bash
agent-registry audit
```

Checks SHOULD include:

- unexpected executable files;
- shell scripts;
- network commands;
- destructive shell commands;
- credential references;
- suspicious instructions;
- absolute paths;
- path traversal;
- hidden files;
- oversized artifacts.

Audit SHOULD report, not automatically delete.

---

# 55. `doctor`

Environment diagnostics:

```bash
agent-registry doctor
```

Checks:

```text
git
node
pnpm
Claude Code
filesystem symlink support
registry path
project manifest
broken links
lock consistency
adapter availability
```

---

# 56. Technology Stack

Recommended:

```text
Runtime       Node.js
Language      TypeScript
Package mgr   pnpm
CLI           oclif
Validation    Zod
YAML          yaml
Process       execa
Git           git CLI via execa
Testing       Vitest
Formatting    Biome
```

Ink MAY be added for richer interactive CLI.

Do not make Ink required for core command execution.

Commands MUST work non-interactively in CI.

---

# 57. Internal Modules

Suggested architecture:

```text
src/
├── domain/
├── application/
├── infrastructure/
└── cli/
```

Alternative expanded:

```text
src/
├── core/
├── registry/
├── source/
├── resolver/
├── sync/
├── build/
├── adapters/
├── installer/
├── validator/
├── audit/
└── cli/
```

Prefer domain boundaries over generic:

```text
utils/
helpers/
common/
```

---

# 58. Core Services

## RegistryLoader

Responsibilities:

```text
load registry
load manifests
schema validation
```

---

## SourceResolver

Responsibilities:

```text
resolve Git source
branch → commit
repository authentication
```

---

## VendorSynchronizer

Responsibilities:

```text
fetch upstream
extract selected components
compare snapshots
update vendor/
```

---

## DependencyResolver

Responsibilities:

```text
profile resolution
plugin expansion
agent dependencies
deduplication
cycle detection
```

---

## OverlayEngine

Responsibilities:

```text
vendor + overlays
→ effective component
```

---

## AdapterManager

Responsibilities:

```text
find adapter
build runtime-specific artifact
```

---

## Installer

Responsibilities:

```text
symlink
copy
remove managed files
repair installation
```

---

## LockManager

Responsibilities:

```text
sources.lock.json
project lock
atomic updates
```

---

# 59. Filesystem Safety

Any write operation MUST:

1. resolve target path;
2. ensure target belongs to allowed root;
3. refuse path traversal;
4. avoid following unexpected external symlinks;
5. use atomic write where reasonable.

Never blindly:

```text
rm -rf generatedPath
```

without validating ownership.

---

# 60. Managed File Ownership

Registry MUST know which files it owns.

Never delete files not recorded in project lock.

Example:

```text
.claude/skills/my-personal-project-skill
```

nếu không do registry tạo thì:

```text
agent-registry sync
```

không được xóa.

---

# 61. Security Model

Third-party skills phải được coi tương tự dependency code.

Vendor updates MAY contain:

- shell commands;
- prompt injection-like instructions;
- network actions;
- credential access;
- destructive workflows.

Vì vậy:

```text
vendor update
≠ trusted automatically
```

---

# 62. Trust Levels

Source có thể có:

```yaml
trust: trusted
trust: reviewed
trust: untrusted
```

Example:

```yaml
sources:
  vercel:
    trust: trusted

  random-github-repo:
    trust: untrusted
```

Trust SHOULD affect audit policy, không bypass validation hoàn toàn.

---

# 63. Update Automation

GitHub Actions:

```text
vendor-check.yml
```

Schedule:

```text
daily or weekly
```

Process:

```text
source check
   ↓
updates?
   ↓
generate update branch
   ↓
sync
   ↓
validate
   ↓
audit
   ↓
open PR
```

---

# 64. Update PR

Example:

```text
chore(vendor): update mattpocock skills
```

Description:

```text
Source:
mattpocock/skills

Previous:
abc123

New:
def456

Changed:
- domain-modeling
- research

Added:
- none

Removed:
- none

Validation:
✓ schemas
✓ references
✓ skill format

Audit:
⚠ domain-modeling introduced new shell script
```

---

# 65. Discover New Vendor Skills

Updater SHOULD also detect:

```text
new skills available upstream
```

nhưng không tự import.

Output:

```text
New upstream skills:

mattpocock:
  + debugging-workflows
  + package-design

Not imported.
```

Future command:

```bash
agent-registry source discover mattpocock
```

---

# 66. Adding a Vendor Skill

Target UX:

```bash
agent-registry source add-skill \
  mattpocock \
  debugging-workflows
```

Result:

1. update `sources.yaml`;
2. import snapshot;
3. validate;
4. update registry;
5. update lock.

---

# 67. Creating a First-party Skill

```bash
agent-registry skill create architecture-review
```

Interactive:

```text
Category: architecture
Description:
Stability: experimental
```

Creates:

```text
first-party/skills/architecture/architecture-review/
├── SKILL.md
├── references/
└── scripts/
```

and updates:

```text
registry.yaml
```

---

# 68. Creating an Agent

```bash
agent-registry agent create architect
```

Creates:

```text
first-party/agents/architect/
├── agent.yaml
└── prompt.md
```

Interactive selection:

```text
Select skills:
[x] domain-modeling
[x] architecture-review
[x] api-design
```

---

# 69. Search

```bash
agent-registry search architecture
```

Result:

```text
SKILL   domain-modeling
SKILL   architecture-review
AGENT   architect
PLUGIN  architecture
PROFILE fullstack
```

---

# 70. Info

```bash
agent-registry info domain-modeling
```

Output:

```text
ID: domain-modeling
Type: skill
Owner: vendor
Source: mattpocock/skills
Category: architecture
Stability: stable
Used by:
  plugin/architecture
  agent/architect
  profile/fullstack
```

---

# 71. Context Budget Awareness

Registry SHOULD avoid enabling excessive skills globally.

Rules:

```text
global installation
→ minimal

project installation
→ preferred

manual-only skill
→ supported
```

Profiles phải curate carefully.

Target:

```text
project sees only relevant skills
```

not:

```text
project sees registry/*
```

---

# 72. Naming Conventions

Directories:

```text
kebab-case
```

Skills:

```text
domain-modeling
architecture-review
```

Agents:

```text
architect
code-reviewer
researcher
```

Plugins:

```text
architecture
frontend
security
```

Profiles:

```text
nextjs
cloudflare
fullstack
```

Sources:

```text
mattpocock
vercel
clerk
ecc
```

---

# 73. Category Taxonomy

Initial categories:

```text
core
architecture
frontend
backend
database
security
testing
devops
cloud
product
research
documentation
agentic
browser
auth
design
```

Avoid tạo category quá cụ thể sớm.

---

# 74. Versioning

Registry uses SemVer:

```text
MAJOR.MINOR.PATCH
```

### MAJOR

Breaking manifest/schema/CLI changes.

### MINOR

New compatible functionality/components.

### PATCH

Fixes/vendor updates/non-breaking metadata changes.

---

# 75. Component Versioning

MVP không cần independent SemVer cho mỗi skill.

Component identity được xác định bằng:

```text
registry commit
+
source commit
```

Future MAY add:

```yaml
version: 1.2.0
```

per component.

---

# 76. Git Strategy

Recommended:

```text
main
```

protected.

Changes via:

```text
feature/*
vendor/*
chore/*
```

Vendor automation always uses PR.

---

# 77. CI

Every PR MUST run:

```text
pnpm lint
pnpm typecheck
pnpm test
agent-registry validate
agent-registry audit
agent-registry build
```

Build SHOULD be deterministic.

---

# 78. Build Determinism

Given:

```text
same registry commit
same lock file
same adapter version
```

output SHOULD be equivalent.

Generated timestamps SHOULD NOT appear unless required.

---

# 79. Testing Strategy

## Unit Tests

Cover:

```text
manifest parsing
dependency resolver
cycle detection
overlay resolution
path validation
lock handling
```

---

## Integration Tests

Cover:

```text
vendor sync
Claude adapter
symlink installation
project sync
profile resolution
```

---

## Fixtures

Example:

```text
tests/fixtures/
├── registry-basic/
├── vendor-repo/
├── project-empty/
├── project-existing-skills/
└── invalid-cycle/
```

---

# 80. Acceptance Test — Main Scenario

Given registry:

```text
profile nextjs
  → core
  → architecture
  → frontend
```

When:

```bash
cd mealops
agent-registry init
agent-registry apply
```

Then:

```text
.agent-registry.yaml
.agent-registry.lock.json

.claude/
├── skills/
│   ├── research
│   ├── domain-modeling
│   └── vercel-react-best-practices
│
└── agents/
    └── architect.md
```

must be created correctly.

---

# 81. Acceptance Test — Central Update

Given:

```text
MealOps
LifeOps
GTEL Maps
```

all symlink:

```text
domain-modeling
```

to canonical registry.

After vendor update:

```bash
agent-registry source sync mattpocock
```

and registry change is approved.

Projects SHOULD receive the new canonical skill without copying it into each project again.

Project manifest remains unchanged.

---

# 82. Acceptance Test — Project Isolation

Given:

```text
MealOps profile:
nextjs
```

and:

```text
GTEL Maps profile:
gis
```

MealOps MUST NOT receive GIS-only components.

GTEL Maps MUST NOT automatically receive Clerk-only components.

---

# 83. Acceptance Test — Vendor Safety

When upstream adds:

```text
scripts/delete-home.sh
```

audit MUST flag the executable/script addition.

Update must remain reviewable before merge.

---

# 84. MVP Scope

MVP MUST implement only:

### Registry

- `registry.yaml`
- `sources.yaml`
- `sources.lock.json`

### Components

- first-party skills
- vendor skills
- first-party agents

### Composition

- plugins
- profiles

### Operations

- source check
- source sync
- validate
- list
- info
- init
- apply
- sync

### Targets

- Agent Skills compatible output
- Claude Code

### Installation

- symlink
- copy fallback

---

# 85. MVP Explicitly Deferred

Do NOT implement initially:

```text
web dashboard
remote registry server
component marketplace search
semantic search
automatic AI review
component ratings
usage telemetry
complex patch language
MCP management
multi-user permissions
cloud synchronization
```

---

# 86. Phase 1 — Registry Foundation

Deliver:

```text
repository structure
schemas
registry loader
source manifest
lock file
first-party skill support
vendor import
validation
```

Success:

```bash
agent-registry validate
```

works.

---

# 87. Phase 2 — Vendor Management

Deliver:

```text
source check
source sync
vendor snapshots
diff
Git commit resolution
GitHub Action update check
```

Success:

One command updates selected vendor skills safely.

---

# 88. Phase 3 — Composition

Deliver:

```text
plugins
profiles
dependency graph
inheritance
include/exclude
```

Success:

```bash
agent-registry profile resolve nextjs
```

returns deterministic component graph.

---

# 89. Phase 4 — Claude Code

Deliver:

```text
Claude adapter
skill installation
agent generation
plugin generation
marketplace generation
```

Success:

A generated plugin/profile works in Claude Code.

---

# 90. Phase 5 — Project Management

Deliver:

```text
.agent-registry.yaml
project lock
init
apply
sync
doctor
```

Success:

A new project can bootstrap in one command.

---

# 91. Phase 6 — Automation

Deliver:

```text
scheduled vendor check
automatic update PR
audit report
release workflow
```

Success:

Registry requires minimal manual vendor maintenance.

---

# 92. Phase 7 — Multi-Agent

Add adapters:

```text
Codex
OpenCode
Cursor
Gemini CLI
```

Only after canonical domain model stabilizes.

---

# 93. Future Feature — Collections

Could introduce:

```text
collections/
```

Difference:

```text
plugin     runtime/distribution concern
profile    project composition
collection human-curated discovery group
```

Example:

```text
collections/
├── recommended.yaml
├── experimental.yaml
└── favorites.yaml
```

Not required for MVP.

---

# 94. Future Feature — Quality Metadata

Component metadata:

```yaml
quality:
  reviewed: true
  tested: true
  securityReviewed: true

compatibility:
  claude-code: full
  codex: partial
  opencode: full
```

---

# 95. Future Feature — Provenance

Every vendor component SHOULD eventually expose:

```yaml
provenance:
  repository: mattpocock/skills
  commit: abc123
  originalPath: skills/domain-modeling
  importedAt: 2026-09-20
```

Could be stored in registry metadata instead of modifying upstream `SKILL.md`.

---

# 96. Future Feature — Registry Website

Potential static catalog:

```text
agent-registry.dev
```

Pages:

```text
Skills
Agents
Plugins
Profiles
Sources
Updates
```

Can be generated directly from manifests.

No database required.

---

# 97. Future Feature — AI Review

Vendor PR could invoke agent reviewers:

```text
security-reviewer
skill-reviewer
compatibility-reviewer
```

Outputs:

```text
Behavior changes
New tools requested
New shell commands
Potential risks
Breaking changes
```

Human remains final approver.

---

# 98. ADRs Required During Implementation

Create ADRs for:

```text
ADR-001 Canonical registry model
ADR-002 Vendor snapshot strategy
ADR-003 Symlink vs copy installation
ADR-004 Canonical agent representation
ADR-005 Adapter architecture
ADR-006 Plugin/profile separation
ADR-007 Lock-file strategy
ADR-008 Generated artifact policy
```

---

# 99. Definition of Done — MVP

MVP is complete when all conditions below are true.

- [ ] Registry supports first-party skills.
- [ ] Registry supports first-party agents.
- [ ] Registry can import selected vendor skills.
- [ ] Vendor sources are commit-locked.
- [ ] Vendor update can be diffed before applying.
- [ ] Vendor files are not manually modified.
- [ ] Plugins compose skills and agents.
- [ ] Profiles compose plugins/components.
- [ ] Profile inheritance works.
- [ ] Dependency cycles are detected.
- [ ] Claude Code adapter works.
- [ ] Agent Skills compatible skills remain portable.
- [ ] Project manifest exists.
- [ ] Project lock exists.
- [ ] Symlink installation works.
- [ ] Copy fallback works.
- [ ] Sync does not delete unmanaged files.
- [ ] `validate` is CI-compatible.
- [ ] Scheduled vendor update check exists.
- [ ] Vendor changes can create reviewable PRs.
- [ ] README documents end-user workflow.

---

# 100. Target End-user Workflow

## Bootstrap registry

```bash
git clone <agent-registry>
cd agent-registry

pnpm install
pnpm build
```

---

## Add first-party skill

```bash
agent-registry skill create architecture-review
```

Develop:

```text
first-party/skills/architecture/architecture-review/SKILL.md
```

Validate:

```bash
agent-registry validate
```

---

## Add vendor skill

```bash
agent-registry source add-skill \
  mattpocock \
  domain-modeling
```

---

## Check vendor updates

```bash
agent-registry source check
```

---

## Update vendor

```bash
agent-registry source sync mattpocock
```

Review:

```bash
agent-registry diff mattpocock
```

---

## Create project

```bash
cd mealops

agent-registry init
```

Select:

```text
Claude Code
nextjs
cloudflare
clerk
```

Then:

```bash
agent-registry apply
```

---

## Daily usage

Normally no action required.

When project config changes:

```bash
agent-registry sync
```

When diagnosing:

```bash
agent-registry doctor
```

---

# 101. Final Architecture

```text
                         ┌──────────────────┐
                         │ Upstream Vendors │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │     Sources      │
                         │ sources.yaml     │
                         └────────┬─────────┘
                                  │
                        fetch / diff / lock
                                  │
                                  ▼
                         ┌──────────────────┐
                         │      Vendor      │
                         │ immutable snaps  │
                         └────────┬─────────┘
                                  │
                              overlays
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐
│   First-party    │────▶│     Registry     │
│ skills / agents  │     │ registry.yaml    │
└──────────────────┘     └────────┬─────────┘
                                  │
                     dependency resolution
                                  │
                 ┌────────────────┼────────────────┐
                 ▼                ▼                ▼
              Skills            Agents          Hooks
                 │                │                │
                 └────────────────┼────────────────┘
                                  ▼
                              Plugins
                                  │
                                  ▼
                              Profiles
                                  │
                                  ▼
                           Resolved Graph
                                  │
                      ┌───────────┼───────────┐
                      ▼           ▼           ▼
                  Claude       Agent Skills   Future
                  Adapter       Adapter       Adapters
                      │           │
                      └─────┬─────┘
                            ▼
                         Projects
```

---

# 102. Architecture Rules

These rules are considered architectural invariants.

1. **Registry is the single source of truth.**
2. **Vendor content is never manually edited.**
3. **Customization goes through overlays or first-party components.**
4. **Generated artifacts are never canonical.**
5. **Skills represent reusable capabilities.**
6. **Agents represent specialized workers.**
7. **Plugins represent installable capability bundles.**
8. **Profiles represent project compositions.**
9. **Adapters contain platform-specific behavior.**
10. **Projects never depend directly on third-party vendor repositories.**
11. **Vendor upgrades are reviewed before becoming canonical.**
12. **Project installation must not require all registry skills to be globally loaded.**
13. **Project manifests are portable; machine-specific absolute symlinks are generated locally.**
14. **Unmanaged project files must never be deleted by registry synchronization.**
15. **The canonical model must remain platform-neutral wherever practical.**

---

# 103. Implementation Priority

Build in this exact order:

```text
1. Schema + manifests
2. Registry loader
3. Vendor import
4. Lock management
5. Validation
6. Dependency resolver
7. Plugins
8. Profiles
9. Agent Skills adapter
10. Claude Code adapter
11. Project manifest
12. Symlink installer
13. Project sync
14. Vendor update automation
15. Audit
16. Additional adapters
```

Do **not** start with:

```text
UI
marketplace website
AI recommendations
complex TUI
multi-agent adapters
```

before the registry core is stable.

---

# 104. MVP Architecture Summary

The smallest production-worthy version is:

```text
agent-registry
│
├── registry.yaml
├── sources.yaml
├── sources.lock.json
│
├── first-party/
│   ├── skills/
│   └── agents/
│
├── vendor/
│
├── plugins/
├── profiles/
│
├── adapters/
│   ├── agent-skills/
│   └── claude-code/
│
└── CLI
    ├── validate
    ├── list
    ├── source check
    ├── source sync
    ├── init
    ├── apply
    └── sync
```

Everything else should evolve around this core rather than change it.

---

# 105. Long-term Direction

The intended evolution is:

```text
Skill Collection
       ↓
Agent Registry
       ↓
Agent Package Manager
       ↓
Personal Agent Development Platform
```

The registry should eventually allow a project to express only its intent:

```yaml
profiles:
  - nextjs
  - cloudflare

plugins:
  - clerk
  - architecture
```

while the registry handles:

```text
discovery
dependency resolution
versioning
provenance
security
installation
updates
runtime compatibility
```

That abstraction is the primary architectural goal of the project.