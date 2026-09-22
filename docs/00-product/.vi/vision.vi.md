# Tầm nhìn

## Tổng quan

`agent-plugins` hướng tới trở thành một **curated capability resolver và distribution layer cho AI agent tooling**.

Project được thiết kế cho một tương lai nơi developer, team và knowledge worker sử dụng nhiều AI agent runtime, mỗi runtime có hệ sinh thái riêng gồm:

- plugin,
- skill,
- agent,
- command,
- hook,
- rule,
- MCP server,
- workflow,
- integration.

Thay vì quản lý trực tiếp các thành phần này, người dùng nên có thể mô tả **họ cần gì**, trong khi `agent-plugins` quyết định **các nhu cầu đó được đáp ứng như thế nào**.

Tầm nhìn dài hạn rất đơn giản:

> **Người dùng nên compose AI agent environment theo capability, role và project — chứ không phải tự tay lắp ráp các repository và plugin.**

---

# 1. Tuyên bố tầm nhìn

> **Làm cho AI agent environment có thể compose, tái tạo, giải thích được và portable giữa các công cụ và project.**

`agent-plugins` nên cung cấp một semantic layer nhất quán nằm giữa user intent và hệ sinh thái AI agent tooling đang thay đổi rất nhanh.

---

# 2. Tương lai chúng ta mong muốn

Hiện nay, người dùng nghĩ theo kiểu:

```text
install Superpowers
install ECC
install Matt Pocock Skills
install frontend-design
```

Tương lai mong muốn là:

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

Sau đó hệ thống resolve các requirement này thành những implementation phù hợp nhất.

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

Người dùng không cần phải hiểu mọi upstream repository để xây dựng một agent environment chất lượng cao.

---

# 3. Định vị sản phẩm

`agent-plugins` không nhằm mục đích chỉ là một plugin collection.

Nó không nhằm mục đích chỉ là một marketplace.

Nó không nhằm mục đích trở thành thêm một bundle skill khổng lồ khác.

Vai trò của nó là tầng nằm giữa:

```text
Agent Tooling Ecosystem
        ↓
    agent-plugins
        ↓
User / Project Environment
```

Trách nhiệm chính của nó là trả lời:

> **Với role, project, policy và target runtime này, những capability nào nên được active và implementation nào nên cung cấp chúng?**

---

# 4. Ý tưởng cốt lõi của sản phẩm

Project được xây dựng xoay quanh một mô hình capability-first.

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
Resolver
   ↓
Lockfile
   ↓
Target Runtime
```

Publisher cung cấp implementation.

Người dùng làm việc ở mức abstraction cao hơn.

Điều này tách biệt:

```text
What the user needs
```

khỏi:

```text
Who implements it
```

và:

```text
How it is installed
```

---

# 5. Cấu hình theo capability-first

Abstraction trung tâm của `agent-plugins` là **Capability**.

Ví dụ:

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

Một capability có thể có nhiều implementation.

Ví dụ:

```text
engineering.testing.tdd

├── Superpowers
├── Matt Pocock
└── ECC
```

Người dùng nhìn chung nên yêu cầu:

```text
engineering.testing.tdd
```

thay vì tự chọn và cấu hình từng publisher.

---

# 6. Curated thay vì tích lũy

Mục tiêu không phải là tối đa hóa số lượng plugin được cài.

Mục tiêu là tạo ra environment nhất quán nhất.

Project nên ưu tiên:

```text
curation over accumulation
```

Một role chất lượng cao có thể dùng component từ nhiều publisher mà không cần cài mọi thứ các publisher đó cung cấp.

Ví dụ:

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

Mỗi publisher nên được dùng ở nơi nó phù hợp nhất.

---

# 7. Environment nhất quán nhỏ nhất

Một mục tiêu thiết kế quan trọng là:

> **Xây dựng agent environment nhất quán nhỏ nhất đáp ứng được user, project và task hiện tại.**

Hệ thống nên chủ động tránh các component không cần thiết.

Thay vì:

```text
Install 100 skills
```

kết quả được ưu tiên có thể là:

```text
12 capabilities
implemented by
8 components
from
4 publishers
```

Điều này giúp giảm:

- context pollution,
- xung đột workflow,
- instruction không cần thiết,
- chi phí bảo trì,
- bề mặt tấn công bảo mật.

---

# 8. Trải nghiệm dựa trên role

Người dùng nên có thể bắt đầu từ một role.

Ví dụ:

```text
Frontend Engineer
Backend Engineer
Full-stack Engineer
Platform Engineer
Product Manager
Researcher
Second Brain
```

Một role đại diện cho một working context có thể tái sử dụng.

Ví dụ:

```text
frontend-engineer

├── workflow/core
├── engineering/core
├── engineering/testing
├── frontend
└── typescript
```

Role cung cấp các giá trị mặc định hợp lý mà không khóa người dùng vào một environment cứng nhắc.

---

# 9. Composition nhận biết project

Role mô tả bối cảnh làm việc của người dùng.

Project mô tả repository hiện tại.

Hai khái niệm này nên được giữ tách biệt.

Ví dụ:

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

Role giữ ổn định trong khi các preset riêng của project thay đổi.

Điều này cho phép:

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

# 10. Preset là các khối xây dựng tái sử dụng

Preset cung cấp các composition capability có thể tái sử dụng.

Ví dụ:

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

Preset nên đủ nhỏ để compose nhưng đủ ý nghĩa để tái sử dụng.

Mô hình được ưu tiên là:

```text
small composable presets
```

thay vì:

```text
large monolithic bundles
```

---

# 11. Độc lập với publisher

Cấu hình của người dùng nên tồn tại được qua những thay đổi của publisher.

Ví dụ, nếu hôm nay:

```text
engineering.testing.tdd
→ Superpowers
```

nhưng sau này xuất hiện một implementation tốt hơn:

```text
engineering.testing.tdd
→ Publisher X
```

thì project không cần phải viết lại intent của mình.

Cấu hình của nó vẫn giữ nguyên:

```text
engineering.testing.tdd
```

Đây là một trong những thuộc tính dài hạn quan trọng nhất của hệ thống.

---

# 12. Resolution deterministic

Cùng một input nên tạo ra cùng một kết quả.

Với:

```text
catalog
+
project manifest
+
role
+
policy
+
lockfile constraints
```

resolver nên tạo ra một environment deterministic.

Resolution nên xem xét:

```text
capability requirements
publisher preference
implementation priority
trust level
target compatibility
version constraints
project overrides
```

Kết quả phải có khả năng tái tạo và kiểm thử được.

---

# 13. Khả năng giải thích

Tự động hóa không được làm hệ thống trở nên khó hiểu.

Người dùng luôn phải có thể hỏi:

```text
Why is this installed?

Which capability does it provide?

Which preset requested it?

Which role requested that preset?

Why was this implementation selected?

What alternatives were available?
```

Project nên làm cho resolution có thể giải thích được ngay từ thiết kế.

Ví dụ:

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

# 14. Khả năng tái tạo

Một agent environment nên có thể tái tạo được giống như dependency environment của một ứng dụng.

Một project nên có thể chứa:

```text
agent-plugins.yaml
agent-plugins.lock
```

để:

```bash
git clone project
ap sync
```

tái dựng lại cùng một environment.

Khả năng tái tạo nên bao gồm:

- publisher,
- package,
- component,
- version,
- commit,
- capability mapping,
- các quyết định phụ thuộc policy.

---

# 15. Update an toàn và có kiểm soát

Các upstream publisher thay đổi liên tục.

Do đó update nên là hành động có chủ đích.

Trải nghiệm mong muốn là:

```bash
ap update --check
```

tiếp theo là:

```text
Publisher changed

Added components
Changed components
Removed components

Affected capabilities
Potential conflicts
Security-sensitive changes
```

Sau đó người dùng hoặc maintainer có thể quyết định có áp dụng update hay không.

Project nên ưu tiên:

```text
controlled updates
```

thay vì:

```text
silent latest-version drift
```

---

# 16. Agent tooling nhận biết trust

Các AI agent component có thể thực thi nhiều thứ hơn là prompt.

Chúng có thể bao gồm:

```text
hooks
commands
scripts
MCP servers
external binaries
```

Hệ thống nên làm rõ ràng trust và execution boundary.

Một personal environment có thể cho phép:

```text
community components
experimental publishers
external hooks
```

trong khi một enterprise environment có thể yêu cầu:

```text
approved publishers only
pinned versions
restricted execution
no external hooks
```

Do đó trust nên là một phần của resolution model.

---

# 17. Tương lai đa runtime

Hệ thống dài hạn không nên bị gắn với một agent runtime duy nhất.

Semantic configuration cuối cùng nên hỗ trợ:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
future runtimes
```

Kiến trúc nên giữ nguyên dạng:

```text
Shared semantic model
        ↓
Resolved capabilities
        ↓
Target adapter
        ↓
Native runtime configuration
```

Mỗi runtime nên nhận được các artifact được thiết kế cho native model của nó thay vì bị ép vào một universal lowest-common-denominator format.

---

# 18. Capability native và external

Hệ thống nên hỗ trợ cả:

```text
External publishers
```

và:

```text
Native first-party capabilities
```

External publisher có thể bao gồm các hệ sinh thái open-source hoặc chính thức đã được khẳng định.

Native capability nên tồn tại ở những nơi project này thực sự sở hữu hoặc có requirement chuyên biệt.

Ví dụ có thể bao gồm:

```text
product-management
second-brain
GIS
project architecture
documentation workflows
agent development
```

Project nên tránh sao chép capability của bên thứ ba chỉ để khiến chúng trông như native.

---

# 19. Một tầng ổn định phía trên một hệ sinh thái thay đổi nhanh

Các repository riêng lẻ có thể:

```text
appear
disappear
rename
split
merge
change formats
change installation models
```

Capability layer nên tương đối ổn định hơn.

Ví dụ:

```text
Publisher implementation changes
         ↓

engineering.testing.tdd

         ↑
remains stable
```

Semantic layer ổn định này là một trong những giá trị dài hạn chính của `agent-plugins`.

---

# 20. Sử dụng trong team và tổ chức

Về lâu dài, project nên hỗ trợ các team muốn có tiêu chuẩn chung mà không loại bỏ sự linh hoạt của từng cá nhân.

Ví dụ:

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

Điều này cho phép governance và customization cùng tồn tại.

---

# 21. Sử dụng cá nhân

Cùng một kiến trúc nên vẫn hữu ích cho cá nhân.

Ví dụ:

```text
Software development
Personal AI OS
Second Brain
Research
Writing
Automation
Product management
```

Người dùng nên có thể duy trì một capability ecosystem duy nhất và tái sử dụng nó trên nhiều project và working context.

---

# 22. Trải nghiệm developer

Trải nghiệm người dùng cuối cùng nên giống một package manager hơn là quản lý prompt thủ công.

Ví dụ:

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

Sau đó:

```bash
ap sync
```

Và kiểm tra:

```bash
ap list
ap explain engineering.testing.tdd
ap diff
ap doctor
```

Độ phức tạp nên nằm bên trong resolver thay vì bị đẩy sang người dùng.

---

# 23. Trải nghiệm maintainer

Maintainer nên có thể:

- thêm một publisher,
- khám phá các component của nó,
- map component vào capability,
- định nghĩa implementation được ưu tiên,
- xây dựng preset,
- định nghĩa role,
- kiểm thử resolution,
- review thay đổi từ upstream,
- publish update.

Kiến trúc nên giảm thiểu việc đồng bộ thủ công giữa nhiều bản sao của cùng một metadata.

---

# 24. Mô hình hệ sinh thái

Hệ sinh thái dài hạn có thể được hình dung như sau:

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
                         Roles
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

# 25. Khác biệt chiến lược

Giá trị chính của `agent-plugins` không nên đến từ việc có collection lớn nhất.

Nó nên đến từ việc có **composition và resolution model** tốt nhất.

Khác biệt chiến lược là:

```text
Capability abstraction
+
Curated implementation mapping
+
Composable presets
+
Role baseline tái sử dụng
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

Một repository chứa 1.000 skill không nhất thiết hữu ích hơn một repository có thể chọn đúng 10 skill một cách đáng tin cậy.

---

# 26. Định hướng sản phẩm dài hạn

Project có thể phát triển qua nhiều giai đoạn.

## Giai đoạn 1 — Curated Distribution

```text
Catalog
Capabilities
Presets
Roles
Resolver
Lockfile
Claude Code support
```

## Giai đoạn 2 — Multi-Runtime Distribution

```text
Codex
Gemini
OpenCode
Hermes
```

## Giai đoạn 3 — Team Governance

```text
Organization policies
Approved catalogs
Team presets
Security controls
```

## Giai đoạn 4 — Ecosystem Intelligence

Các capability tiềm năng:

```text
capability recommendations
compatibility analysis
context optimization
publisher health
update impact analysis
security scoring
```

Những điều này nên được xây dựng trên nền tảng deterministic thay vì thay thế nó.

---

# 27. Thành công trông như thế nào

Project thành công khi người dùng thôi nghĩ:

> Tôi nên cài mười plugin nào cho repository này?

mà thay vào đó nghĩ:

> Đây là một project Next.js và tôi đang làm việc với vai trò frontend engineer.

Các quyết định còn lại nên được hệ thống derive.

Thành công có nghĩa là:

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

North star của project là:

> **Người dùng nên có thể mô tả role, project và các capability mong muốn, rồi nhận được một cách đáng tin cậy AI agent environment nhất quán nhỏ nhất đáp ứng những nhu cầu đó.**

Mọi thứ khác nên phục vụ mục tiêu này.

---

# 29. Nguyên tắc định hướng

Sản phẩm nên nhất quán ưu tiên:

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

# 30. Tầm nhìn trong một câu

> **`agent-plugins` làm cho AI agent tooling có thể compose theo capability, tái sử dụng theo role, tái tạo theo project và portable giữa các runtime.**
