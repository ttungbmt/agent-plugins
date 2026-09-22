# Vấn đề

## Tổng quan

Hệ sinh thái AI coding và AI agent đang phát triển rất nhanh xoay quanh các thành phần có thể tái sử dụng như:

- plugin,
- skill,
- agent,
- command,
- hook,
- rule,
- MCP server,
- LSP integration,
- workflow.

Các thành phần này ngày càng được phân phối qua nhiều repository và marketplace độc lập.

Ví dụ:

- Superpowers,
- Matt Pocock Skills,
- Everything Claude Code,
- plugin chính thức của Anthropic,
- các bộ agent cộng đồng,
- skill nội bộ của tổ chức,
- plugin cá nhân.

Từng dự án riêng lẻ đều có thể cung cấp những capability rất hữu ích.

Vấn đề xuất hiện khi một developer muốn kết hợp chúng thành một môi trường làm việc nhất quán trên nhiều project, nhiều vai trò và nhiều agent runtime khác nhau.

---

# 1. Quản lý plugin thủ công không thể scale

Một developer có thể cần hàng chục capability tái sử dụng.

Ví dụ một dự án frontend có thể cần:

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

Một dự án backend có thể cần:

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

Trong khi một hệ thống Second Brain có thể cần:

```text
Second Brain

- research
- writing
- synthesis
- knowledge management
- Obsidian
- note maintenance
```

Hiện tại, các capability này thường phải được cài đặt và cấu hình riêng cho từng môi trường.

Điều này dẫn đến nhiều công việc lặp lại:

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

Khi số lượng project tăng lên, việc duy trì các cấu hình này ngày càng khó khăn.

---

# 2. Người dùng nghĩ theo capability, không phải repository

Thông thường người dùng không bắt đầu bằng câu hỏi:

> Repository nào nên cung cấp workflow TDD cho tôi?

Họ thường nghĩ theo nhu cầu:

```text
I need:

- TDD
- architecture
- security review
- frontend expertise
- research
```

Tuy nhiên, các hệ sinh thái plugin hiện tại thường expose trực tiếp các khái niệm ở tầng implementation:

```text
install superpowers
install ecc
install matt-skills
install frontend-plugin
```

Điều này buộc người dùng phải hiểu:

- upstream repository,
- cấu trúc package,
- capability bị trùng,
- định dạng cài đặt,
- khả năng tương thích với runtime.

Hiện đang thiếu một abstraction nằm giữa:

```text
What I need
```

và:

```text
Which plugin implements it
```

---

# 3. Capability bị trùng lặp

Nhiều repository khác nhau thường cùng giải quyết một vấn đề.

Ví dụ:

```text
TDD
├── Superpowers implementation
├── Matt Pocock implementation
└── ECC implementation
```

Tương tự:

```text
Code Review
├── Publisher A
├── Publisher B
└── Publisher C
```

hoặc:

```text
Planning
├── workflow A
├── workflow B
└── workflow C
```

Cài tất cả không nhất thiết làm hệ thống tốt hơn.

Ngược lại, nó có thể gây ra:

- instruction trùng lặp,
- methodology cạnh tranh nhau,
- prompt xung đột,
- command bị duplicate,
- agent chồng chéo chức năng,
- tiêu tốn context không cần thiết,
- hành vi thiếu nhất quán.

Hệ thống hiện thiếu một cơ chế chuẩn để quyết định:

```text
Which implementation should own a capability?
```

---

# 4. Cài nhiều hơn không đồng nghĩa tốt hơn

Agent tooling khác với dependency truyền thống.

Một dependency tree lớn trong ứng dụng thông thường chủ yếu ảnh hưởng đến:

- dung lượng đĩa,
- thời gian build,
- kích thước package.

Trong AI agent tooling, nó còn có thể ảnh hưởng trực tiếp đến working context của model.

Quá nhiều component có thể gây:

- context pollution,
- instruction mơ hồ,
- workflow trùng lặp,
- tool definition không cần thiết,
- rule xung đột,
- quá nhiều agent để lựa chọn.

Do đó:

```text
More plugins ≠ better agent
```

Một môi trường tốt nên chỉ expose **tập capability nhỏ nhất nhưng đủ dùng** cho role và project hiện tại.

---

# 5. Cấu hình project bị lặp lại

Nhiều project có chung một baseline.

Ví dụ một frontend engineer thường xuyên cần:

```text
workflow
testing
debugging
code review
TypeScript
frontend design
browser tools
```

Một backend engineer thường xuyên cần:

```text
workflow
testing
debugging
architecture
API design
database
security
```

Nếu không có các composition có thể tái sử dụng, các cấu hình này phải được dựng lại ở từng repository.

Điều này tạo ra duplication ở hai cấp:

```text
User level
+
Project level
```

Hệ sinh thái cần những đơn vị cấu hình tái sử dụng đại diện cho các use case phổ biến.

---

# 6. Mỗi role cần một tập capability khác nhau

Không phải người dùng hoặc workflow nào cũng cần cùng một bộ công cụ.

Ví dụ:

```text
Frontend Engineer
Backend Engineer
Platform Engineer
Product Manager
Researcher
Second Brain
```

Các role này có thể chia sẻ một số capability nhưng cũng cần những capability rất khác nhau.

Ví dụ:

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

Một bộ plugin global duy nhất không thể biểu diễn hiệu quả tất cả các context này.

---

# 7. Nhu cầu của project khác với role của người dùng

Ngay cả những người cùng role vẫn có thể làm việc trên các stack khác nhau.

Ví dụ:

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

Role của người dùng vẫn giữ nguyên:

```text
frontend-engineer
```

trong khi requirement của project thay đổi.

Hệ thống cần phân biệt rõ:

```text
Who the user is
```

và:

```text
What the current project requires
```

---

# 8. Các upstream publisher thay đổi độc lập

Các community repository liên tục thay đổi.

Chúng có thể:

- thêm skill,
- xóa skill,
- đổi tên command,
- thay đổi folder structure,
- thêm hook,
- tách package,
- gộp package,
- thay đổi cơ chế cài đặt.

Một cấu hình hoạt động tốt hôm nay có thể thay đổi hành vi sau một lần update upstream.

Nếu không có cơ chế version control ở tầng agent tooling, project sẽ mất tính reproducible.

---

# 9. Phiên bản mới nhất không đồng nghĩa với an toàn

Tự động theo phiên bản mới nhất của upstream có thể mang đến:

```text
breaking changes
behavior changes
removed capabilities
new executable hooks
new dependencies
```

Agent infrastructure cần một cơ chế update có kiểm soát giống các package manager trưởng thành.

Người dùng phải có khả năng trả lời:

```text
What changed?

Why did it change?

Which capabilities are affected?

Can I reproduce the previous environment?
```

---

# 10. Khó truy vết provenance

Khi nhiều external source được kết hợp, rất khó trả lời:

```text
Where did this skill come from?

Who maintains it?

Which version is installed?

Was it modified?

Is this first-party or third-party?

Which project enabled it?
```

Điều này đặc biệt quan trọng khi external component có thể chạy:

- hook,
- command,
- script,
- MCP server,
- binary bên ngoài.

Agent tooling cần provenance rõ ràng.

---

# 11. Security boundary chưa rõ ràng

Một AI plugin có thể nhiều hơn chỉ là prompt.

Nó có thể chứa:

```text
skills
agents
hooks
commands
MCP servers
scripts
dependencies
```

Mỗi người dùng hoặc tổ chức có thể có policy khác nhau.

Ví dụ:

```text
Personal environment
→ allow community plugins

Company environment
→ allow curated publishers only

Enterprise environment
→ forbid executable hooks from external sources
```

Các hệ thống cài đặt coi mọi plugin như nhau sẽ rất khó biểu diễn các policy này một cách rõ ràng.

---

# 12. Publisher lock-in

Cấu hình thường bị gắn trực tiếp với tên publisher.

Ví dụ:

```yaml
plugins:
  - superpowers
  - ecc
  - some-security-plugin
```

Nếu xuất hiện implementation tốt hơn, người dùng phải tự sửa lại configuration.

Trong khi requirement thực tế có thể chỉ là:

```text
planning
TDD
security review
```

Cấu hình phụ thuộc publisher tạo ra coupling không cần thiết giữa user intent và implementation.

---

# 13. Nhiều agent runtime làm vấn đề phân mảnh nghiêm trọng hơn

Vấn đề không còn giới hạn trong một runtime duy nhất.

Developer ngày càng làm việc với nhiều môi trường như:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

Mỗi runtime có thể sử dụng format khác nhau cho:

- skill,
- plugin,
- agent,
- command,
- configuration,
- installation.

Nếu không có semantic layer dùng chung, người dùng phải duy trì nhiều bộ cấu hình song song cho từng runtime.

Điều này làm tăng configuration drift.

---

# 14. Marketplace giải quyết discovery, không giải quyết composition

Marketplace hữu ích để trả lời:

> Có những plugin nào?

Nhưng thường không trả lời được:

```text
Which plugins should be used together?

Which capabilities are duplicated?

Which implementation should be selected?

Which configuration suits a frontend engineer?

Which configuration suits a Second Brain?

Which components are allowed to run under the current policy?
```

Discovery đơn thuần chưa giải quyết được bài toán composition.

---

# 15. Collection không giải quyết được resolution

Các repository lớn chứa hàng trăm agent hoặc skill giúp tăng khả năng khám phá.

Nhưng chúng tạo ra một bài toán mới:

```text
Which subset should I actually use?
```

Một collection có thể có:

```text
300 skills
70 agents
50 commands
```

Trong khi một project có thể chỉ cần:

```text
8–15 capabilities
```

Thứ còn thiếu không phải là một collection khác.

Thứ còn thiếu là **selection và resolution**.

---

# 16. Manual curation trở thành gánh nặng bảo trì

Người dùng nâng cao thường tự giải quyết các vấn đề trên bằng:

```text
personal lists
copy-pasted folders
custom install scripts
shell aliases
project templates
internal documentation
```

Những cách này hoạt động tốt ở giai đoạn đầu nhưng khó duy trì khi hệ thống lớn lên.

Các vấn đề phổ biến gồm:

```text
configuration drift
duplicate dependencies
stale copies
unknown provenance
manual upgrades
broken upstream references
```

Không có một model chung để kết nối tất cả các quyết định này.

---

# 17. Chưa có vocabulary chuẩn cho capability

Các publisher khác nhau có thể đặt tên khác nhau cho cùng một khái niệm.

Ví dụ:

```text
test-driven-development
tdd
tdd-workflow
testing-discipline
```

Nhưng chúng có thể đều đang implement cùng một semantic capability:

```text
engineering.testing.tdd
```

Nếu không có capability model chuẩn hóa, automated composition và conflict resolution sẽ rất khó thực hiện.

---

# 18. Khó giải thích vì sao một configuration tồn tại

Khi một môi trường chứa nhiều plugin, người dùng thường khó trả lời:

```text
Why is this plugin installed?

Which preset requires it?

Which capability does it implement?

Why was it selected over another implementation?
```

Một package manager cho agent tooling không nên hoạt động như black box.

Resolution phải có khả năng giải thích.

---

# 19. Khó tái tạo environment

Developer nên có khả năng clone một project và khôi phục lại cùng một agent environment.

Lý tưởng:

```bash
git clone project
ap sync
```

phải tái tạo được:

```text
same capabilities
same publishers
same packages
same versions
same components
same policy decisions
```

Nếu không có lockfile và deterministic resolver, điều này không thể được đảm bảo.

---

# 20. Khó chuẩn hóa trong team

Team có thể muốn chuẩn hóa:

```text
engineering workflow
security review
testing methodology
approved publishers
agent behavior
```

nhưng vẫn cho phép tùy chỉnh theo role và project.

Hiện tại team thường phải chọn giữa:

```text
fully centralized configuration
```

và:

```text
fully personal configuration
```

Một hệ thống scalable cần hỗ trợ layered composition.

---

# 21. Môi trường cá nhân và công việc cần policy khác nhau

Cùng một developer có thể sử dụng agent tooling trong các context khác nhau.

Ví dụ:

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

Các khác biệt này nên được biểu diễn bằng declarative configuration thay vì nhiều installation ad hoc riêng biệt.

---

# 22. Vấn đề cốt lõi

Vấn đề cốt lõi không phải là:

> Hệ sinh thái thiếu AI plugin.

Thực tế đã có rất nhiều implementation tốt.

Vấn đề thực sự là:

> Chưa có một abstraction nhất quán để lựa chọn, compose, resolve, quản trị và tái tạo capability từ nhiều publisher, project, role và agent runtime khác nhau.

---

# 23. Phân rã vấn đề

Có thể chia bài toán thành sáu nhóm lớn:

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

Các giải pháp hiện tại thường chỉ giải quyết được một hoặc hai tầng trong số này.

---

# 24. Trải nghiệm người dùng mong muốn

Người dùng không nên phải hiểu toàn bộ publisher.

Thay vì:

```text
Install:
- repository A
- repository B
- repository C
- plugin D
- skill E
```

người dùng chỉ cần mô tả:

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

Hệ thống sẽ quyết định implementation cụ thể.

---

# 25. Trải nghiệm project mong muốn

Một project chỉ nên chứa một manifest khai báo nhỏ.

Ví dụ:

```yaml
role: frontend-engineer

presets:
  - nextjs
  - cloudflare
  - security

target:
  - claude-code
```

Các chi tiết còn lại phải có thể được derive.

---

# 26. Trải nghiệm team mong muốn

Một team nên có khả năng định nghĩa:

```text
approved publishers
preferred implementations
required workflows
security policies
version constraints
```

mà không buộc từng project phải lặp lại các quyết định đó.

---

# 27. Trải nghiệm maintenance mong muốn

Khi upstream publisher thay đổi, maintainer phải có thể hiểu tác động trước khi upgrade.

Ví dụ:

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

Update phải là hành động có chủ đích thay vì thay đổi ngầm.

---

# 28. Trải nghiệm resolution mong muốn

Khi có nhiều implementation:

```text
engineering.testing.tdd

Candidates:
- Superpowers
- Matt Pocock
- ECC
```

hệ thống phải có thể chọn deterministically dựa trên:

```text
capability priority
policy
trust
target compatibility
version
user/project override
```

và giải thích được quyết định đó.

---

# 29. Reproducibility mong muốn

Với:

```text
catalog version
project manifest
policy
lockfile
```

agent environment thu được phải có khả năng tái tạo trên nhiều máy khác nhau.

---

# 30. Các ràng buộc

Hệ thống không nên giải quyết bài toán bằng cách tạo thêm một mega-plugin.

Một giải pháp gom tất cả thành:

```text
one giant plugin
```

sẽ tái tạo lại nhiều vấn đề hiện tại:

- capability không cần thiết,
- release bị coupled,
- context bloat,
- khó update,
- provenance kém rõ ràng,
- giảm khả năng composition.

---

# 31. Non-goals

Project không nhằm mục tiêu chính là:

- thay thế các upstream plugin repository,
- fork toàn bộ community skill,
- tạo một universal prompt format,
- merge toàn bộ plugin thành một artifact,
- rewrite tất cả third-party skill,
- ép mọi runtime về cùng một lowest-common-denominator format.

Project nên giữ vai trò là một coordination và resolution layer.

---

# 32. Tiêu chí thành công

Có thể coi bài toán được giải quyết tốt khi người dùng có thể:

### Cấu hình theo intent

```text
role + presets
```

thay vì tự liệt kê hàng chục plugin.

### Tránh capability duplication

Khi publisher bị overlap, chỉ implementation phù hợp được active.

### Tái tạo environment

Lockfile có thể reconstruct lại trạng thái đã resolve.

### Hiểu được quyết định

Mọi package/component được chọn đều có thể trace ngược:

```text
project
→ role
→ preset
→ capability
→ implementation
```

### Update an toàn

Thay đổi từ upstream có thể được review trước khi áp dụng.

### Áp dụng policy

User và team có thể giới hạn trusted publisher và executable behavior.

### Hỗ trợ nhiều runtime

Semantic configuration có thể dần được materialize sang nhiều target environment khác nhau.

---

# 33. Problem Statement

> Hệ sinh thái AI agent cung cấp ngày càng nhiều plugin, skill, agent và workflow mạnh mẽ, nhưng người dùng chưa có một cách scalable để compose chúng thành các environment nhất quán.

Cài đặt thủ công dẫn đến configuration duplication, capability overlap, publisher coupling, context bloat, security ambiguity, update risk và khả năng reproducibility kém.

`agent-plugins` tồn tại để giải quyết lớp nằm giữa **việc khám phá agent tooling** và **việc vận hành một agent environment nhất quán trong thực tế**.

Bài toán cốt lõi vì vậy là:

> **Làm thế nào để người dùng có thể khai báo các capability họ cần, compose chúng theo role và project, resolve các implementation bị overlap một cách deterministic, áp dụng trust policy, và tái tạo configuration trên nhiều agent runtime mà không bị phụ thuộc chặt vào từng plugin publisher cụ thể?**

---

# 34. Vấn đề trong một câu

> **Có rất nhiều agent plugin tốt; thứ còn thiếu là một cách scalable để quyết định plugin nào nên hoạt động cùng nhau.**

---

# 35. Nguyên tắc định hướng

Project nên tối ưu cho:

```text
intent over implementation
capabilities over repositories
composition over bundles
curation over accumulation
determinism over implicit behavior
provenance over opaque installation
reproducibility over latest
```

Mục tiêu không phải là cài nhiều tooling hơn.

Mục tiêu là xây dựng **agent environment nhỏ nhất nhưng nhất quán và đủ mạnh cho đúng user, đúng project và đúng task hiện tại**.