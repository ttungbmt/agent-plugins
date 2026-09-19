# Roadmap

> Repository: `agent-plugins`  
> Focus: First-party agent plugins, reusable skills, agents, hooks, vendor integrations, and overlays.

---

## Vision

Xây dựng `agent-plugins` thành bộ plugin cá nhân có cấu trúc rõ ràng, dễ tái sử dụng, dễ mở rộng và dễ phân phối cho nhiều project.

Trọng tâm:

```text
First-party Plugins
        ↓
Skills / Agents / Hooks
        ↓
Optional Vendor Components
        ↓
Overlays
        ↓
Profiles / Adapters / Distribution
```

Vendor integrations là phần mở rộng, không phải trung tâm của hệ thống.

---

# Phase 0 — Foundation

## Goal

Chốt nền tảng kiến trúc và conventions trước khi phát triển nhiều plugin.

## Deliverables

- [ ] Repository structure
- [ ] Naming conventions
- [ ] Plugin model
- [ ] Skill model
- [ ] Agent model
- [ ] Vendor model
- [ ] Overlay model
- [ ] Manifest schemas
- [ ] Validation rules
- [ ] Initial documentation

## Core docs

- [x] `specs.md`
- [ ] `architecture.md`
- [ ] `domain-model.md`
- [ ] `manifest-spec.md`
- [ ] `plugin-authoring.md`
- [ ] `vendor-management.md`

## Exit criteria

Có thể tạo một plugin first-party hoàn chỉnh bằng tay theo cùng một convention.

---

# Phase 1 — First-party Plugin System

## Goal

Xây được framework ổn định để tự viết plugin.

## Scope

Plugin có thể chứa:

```text
plugin/
├── skills/
├── agents/
├── hooks/
├── prompts/
└── references/
```

## Deliverables

- [ ] Plugin manifest
- [ ] Plugin loader
- [ ] Plugin validation
- [ ] Skill discovery
- [ ] Agent discovery
- [ ] Hook discovery
- [ ] Plugin dependency support
- [ ] Plugin metadata

## Initial plugins

Nên bắt đầu với một số plugin thực tế:

```text
core
architecture
research
frontend
backend
security
agentic-engineering
```

## Exit criteria

Có ít nhất 3 plugin first-party hoạt động ổn định.

---

# Phase 2 — Skill Authoring

## Goal

Chuẩn hóa cách tự viết skill.

## Deliverables

- [ ] Skill template
- [ ] Skill metadata
- [ ] Skill validation
- [ ] Skill references convention
- [ ] Skill scripts convention
- [ ] Skill examples
- [ ] Skill quality checklist

## Suggested first-party skills

```text
architecture-review
scalable-folder-design
technology-evaluation
library-comparison
repo-onboarding
codebase-review
requirements-analysis
technical-research
```

## Exit criteria

Có thể tạo skill mới nhanh mà không phải tự nghĩ lại cấu trúc.

---

# Phase 3 — Agent System

## Goal

Tạo các specialized agents sử dụng lại skill.

## Initial agents

```text
architect
researcher
code-reviewer
frontend-reviewer
security-reviewer
product-analyst
```

## Deliverables

- [ ] Canonical agent format
- [ ] Agent manifest
- [ ] Agent prompt convention
- [ ] Agent → Skill dependencies
- [ ] Agent validation
- [ ] Claude Code agent generation

## Exit criteria

Agent có thể compose nhiều skill mà không duplicate instructions.

---

# Phase 4 — Vendor Integration

## Goal

Cho phép curate third-party skills mà không làm vendor trở thành source of truth.

## Initial vendors

```text
mattpocock/skills
vercel-labs/agent-skills
clerk/skills
affaan-m/ECC
browser-use/browser-use
Leonxlnx/taste-skill
github/awesome-copilot
```

## Deliverables

- [ ] `sources.yaml`
- [ ] `sources.lock.json`
- [ ] Vendor importer
- [ ] Selective component import
- [ ] Git commit pinning
- [ ] Vendor update detection
- [ ] Vendor diff
- [ ] Vendor provenance metadata

## Exit criteria

Một vendor component có thể được import, pin và update có kiểm soát.

---

# Phase 5 — Overlay System

## Goal

Cho phép customize vendor content mà không chỉnh trực tiếp vendor snapshot.

## Deliverables

- [ ] Overlay directory convention
- [ ] Overlay metadata
- [ ] File replacement
- [ ] Overlay validation
- [ ] Overlay build resolution
- [ ] Conflict detection

## Future

Có thể bổ sung:

```text
merge
append
patch
delete
```

MVP chỉ cần:

```text
replace
```

## Exit criteria

Vendor update không overwrite customization của first-party.

---

# Phase 6 — Plugin Composition

## Goal

First-party plugin có thể reuse vendor components và first-party components.

Ví dụ:

```yaml
name: architecture

skills:
  - first-party:architecture-review
  - vendor:mattpocock/domain-modeling
  - vendor:ecc/api-design

agents:
  - first-party:architect
```

## Deliverables

- [ ] Component reference syntax
- [ ] Dependency resolver
- [ ] Deduplication
- [ ] Cycle detection
- [ ] Missing dependency detection
- [ ] Disabled component handling

## Exit criteria

Plugin graph resolve deterministic.

---

# Phase 7 — Profiles

## Goal

Compose plugins theo loại project.

## Initial profiles

```text
minimal
nextjs
cloudflare
fullstack
backend
frontend
research
product
```

Ví dụ:

```yaml
name: nextjs

plugins:
  - core
  - architecture
  - frontend

vendor:
  - clerk
```

## Deliverables

- [ ] Profile manifest
- [ ] Profile inheritance
- [ ] Include/exclude
- [ ] Profile resolver
- [ ] Profile validation

## Exit criteria

Project chỉ cần chọn profile thay vì từng skill.

---

# Phase 8 — Claude Code Adapter

## Goal

Biến canonical source thành cấu trúc dùng được trực tiếp trong Claude Code.

## Deliverables

- [ ] Skill adapter
- [ ] Agent adapter
- [ ] Hook adapter
- [ ] Plugin packaging
- [ ] Marketplace generation
- [ ] Project install
- [ ] Project sync

## Target output

```text
.claude/
├── skills/
├── agents/
└── settings.json
```

và khi cần:

```text
.claude-plugin/
└── marketplace.json
```

## Exit criteria

Project mới có thể dùng plugin collection qua một workflow đơn giản.

---

# Phase 9 — CLI

## Goal

Ẩn các thao tác thủ công phía sau CLI.

## Planned commands

```text
agent-plugins init
agent-plugins apply
agent-plugins sync
agent-plugins validate
agent-plugins doctor

agent-plugins plugin list
agent-plugins plugin create
agent-plugins plugin info

agent-plugins skill create
agent-plugins agent create

agent-plugins vendor list
agent-plugins vendor check
agent-plugins vendor sync
agent-plugins vendor diff

agent-plugins profile list
agent-plugins profile resolve
```

## Exit criteria

Các workflow chính không còn yêu cầu thao tác file thủ công.

---

# Phase 10 — Project Integration

## Goal

Mỗi project chỉ khai báo những gì cần dùng.

Project manifest:

```text
.agent-plugins.yaml
```

Ví dụ:

```yaml
profiles:
  - nextjs
  - cloudflare

plugins:
  - architecture
  - clerk

skills:
  exclude:
    - industrial-brutalist-ui
```

## Deliverables

- [ ] Project manifest
- [ ] Project lock
- [ ] Symlink installation
- [ ] Copy fallback
- [ ] Drift detection
- [ ] Safe cleanup
- [ ] Preserve unmanaged files

## Exit criteria

Một registry có thể phục vụ nhiều project mà không duplicate toàn bộ skill.

---

# Phase 11 — Vendor Automation

## Goal

Biến vendor update thành workflow tương tự Dependabot.

```text
Check
→ Detect
→ Diff
→ Validate
→ Audit
→ PR
→ Review
→ Merge
```

## Deliverables

- [ ] Scheduled vendor checks
- [ ] Automatic update branches
- [ ] Update PR generation
- [ ] Validation report
- [ ] Security audit report
- [ ] New upstream skill discovery

## Exit criteria

Không cần vào từng vendor repo để kiểm tra thủ công.

---

# Phase 12 — Quality & Security

## Goal

Đảm bảo plugin collection đủ an toàn để sử dụng lâu dài.

## Deliverables

- [ ] Security audit
- [ ] Path traversal detection
- [ ] Executable detection
- [ ] Shell command review
- [ ] Broken reference detection
- [ ] Dead component detection
- [ ] Component provenance
- [ ] Plugin health checks

---

# Phase 13 — Multi-Agent Adapters

Chỉ làm sau khi canonical model ổn định.

Potential targets:

```text
Claude Code
Codex
OpenCode
Cursor
Gemini CLI
```

Canonical plugin không được thay đổi chỉ để phù hợp một runtime.

---

# Phase 14 — Developer Experience

## Potential features

- [ ] Interactive CLI
- [ ] Ink TUI
- [ ] Plugin scaffolding
- [ ] Skill scaffolding
- [ ] Agent scaffolding
- [ ] Search
- [ ] Dependency visualization
- [ ] Plugin graph
- [ ] Update dashboard
- [ ] Compatibility matrix

---

# Phase 15 — Personal Plugin Ecosystem

Long-term target:

```text
agent-plugins
      │
      ├── first-party plugins
      ├── first-party skills
      ├── first-party agents
      │
      ├── curated vendor extensions
      ├── overlays
      │
      ├── profiles
      └── runtime adapters
```

Project experience:

```bash
agent-plugins init
agent-plugins apply
```

Sau đó developer chỉ cần tập trung vào plugin/capability, không phải quản lý distribution thủ công.

---

# Milestone Summary

```text
M0  Foundation
M1  Plugin System
M2  Skill Authoring
M3  Agent System
M4  Vendor Integration
M5  Overlay System
M6  Composition Resolver
M7  Profiles
M8  Claude Adapter
M9  CLI
M10 Project Integration
M11 Vendor Automation
M12 Quality & Security
M13 Multi-Agent
M14 Developer Experience
```

---

# MVP Boundary

MVP nên dừng tại:

```text
Foundation
+
First-party Plugins
+
Skills
+
Agents
+
Vendor Import
+
Overlay Replace
+
Plugin Resolver
+
Claude Code Adapter
+
Basic CLI
```

Không cần ngay:

```text
TUI
website
multi-agent adapters
AI recommendations
remote registry
complex patch engine