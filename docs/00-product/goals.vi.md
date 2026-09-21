# Mục tiêu

## Tổng quan

Tài liệu này định nghĩa các mục tiêu mà `agent-plugins` phải đạt được.

Các mục tiêu được viết có chủ đích ở mức sản phẩm và hệ thống. Chúng mô tả những kết quả mà project cần hiện thực hóa thay vì quy định chi tiết implementation.

Project nên làm cho AI agent tooling:

- dễ compose hơn,
- dễ tái sử dụng hơn,
- dễ quản trị hơn,
- dễ tái tạo hơn,
- dễ hiểu hơn,
- dễ update an toàn hơn.

---

# 1. Cấu hình theo intent

Người dùng nên có thể mô tả những gì họ cần mà không phải tự chọn từng plugin hoặc repository.

Nên dùng:

```yaml
profile: frontend-engineer

presets:
  - nextjs
  - cloudflare
  - security
```

Thay vì:

```yaml
plugins:
  - superpowers
  - ecc
  - matt-skills
  - frontend-design
  - browser-plugin
  - security-plugin
```

Hệ thống nên chuyển intent ở mức cao thành các implementation cụ thể.

## Tiêu chí thành công

Một project điển hình nên có thể được cấu hình chủ yếu thông qua:

```text
profile
+
presets
+
policy
+
project overrides
```

mà không yêu cầu người dùng tự liệt kê phần lớn các component bên dưới.

---

# 2. Thiết lập một capability model ổn định

Project nên định nghĩa một semantic layer chuẩn hóa, biểu diễn những gì các component thực sự làm.

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.architecture
security.review
knowledge.research
product.discovery
```

Capability model này nên tương đối ổn định ngay cả khi provider thay đổi.

## Tiêu chí thành công

Các implementation khác nhau từ nhiều provider cho cùng một hành vi ngữ nghĩa có thể được map vào một capability chung.

Ví dụ:

```text
Superpowers TDD
Matt Pocock TDD
ECC TDD

        ↓

engineering.testing.tdd
```

---

# 3. Tách intent khỏi implementation

Cấu hình của người dùng và project không nên bị gắn chặt với từng provider riêng lẻ.

Chiều phụ thuộc được ưu tiên là:

```text
Profile
   ↓
Preset
   ↓
Capability
   ↓
Implementation
   ↓
Provider
```

chứ không phải:

```text
Profile
   ↓
Provider-specific plugin list
```

## Tiêu chí thành công

Implementation của một capability có thể được thay thế mà không cần sửa mọi profile hoặc project đang sử dụng nó.

---

# 4. Cung cấp các preset tái sử dụng

Project nên cung cấp các preset nhỏ, có ý nghĩa và có thể compose.

Ví dụ:

```text
workflow/core
engineering/core
engineering/security
engineering/testing

stacks/typescript
stacks/nextjs
stacks/python

domains/frontend
domains/backend
domains/product

knowledge/research
knowledge/writing
```

Preset nên giúp giảm việc cấu hình project lặp đi lặp lại.

## Tiêu chí thành công

Các nhóm capability phổ biến được định nghĩa một lần và tái sử dụng trên nhiều profile và project.

---

# 5. Cung cấp các profile dựa trên role

Project nên cung cấp profile cho các working context phổ biến.

Các profile ban đầu nên bao gồm:

```text
software-engineer
frontend-engineer
backend-engineer
fullstack-engineer
platform-engineer
product-manager
researcher
second-brain
```

Profile nên cung cấp các giá trị mặc định hợp lý trong khi vẫn có thể tùy chỉnh.

## Tiêu chí thành công

Một người dùng mới có thể chọn một profile và nhận được một baseline hữu ích mà không cần tự chọn từng capability.

---

# 6. Giữ tách biệt mối quan tâm của role và project

Profile nên mô tả các working role tương đối ổn định.

Project nên mô tả các requirement riêng của repository.

Ví dụ:

```text
Role
Frontend Engineer

Project A
Next.js + Cloudflare

Project B
React + Vite

Project C
Astro
```

Cùng một profile nên hoạt động được trên nhiều project.

## Tiêu chí thành công

Thay đổi requirement về stack của project không đòi hỏi phải định nghĩa lại role profile của người dùng.

---

# 7. Resolve capability overlap một cách deterministic

Khi nhiều provider cùng implement một capability, hệ thống nên resolve phần overlap một cách có thể dự đoán được.

Ví dụ:

```text
engineering.testing.tdd

Candidates:
- Superpowers
- Matt Pocock
- ECC
```

Resolver nên chọn một implementation dựa trên các quy tắc tường minh.

Các yếu tố có thể bao gồm:

```text
capability priority
policy
trust level
target compatibility
version compatibility
project override
```

## Tiêu chí thành công

Các input giống hệt nhau luôn tạo ra cùng một implementation được chọn.

---

# 8. Hỗ trợ capability cardinality

Hệ thống nên phân biệt giữa các capability mà thông thường chỉ một implementation được active và các capability mà nhiều implementation có thể cùng tồn tại.

Ví dụ:

```text
cardinality: one

engineering.testing.tdd
workflow.planning
engineering.debugging
```

Ví dụ:

```text
cardinality: many

framework expertise
research tools
database knowledge
security knowledge
```

## Tiêu chí thành công

Resolver xử lý được cả capability loại trừ (exclusive) lẫn capability cộng dồn (additive) mà không dựa vào các trường hợp đặc biệt được hard-code.

---

# 9. Tối thiểu hóa kích thước agent environment

Hệ thống nên tránh cài đặt hoặc kích hoạt các component không cần thiết.

Mục tiêu không phải là:

```text
maximum number of plugins
```

mà là:

```text
minimum coherent capability set
```

cho role và project hiện tại.

## Tiêu chí thành công

Mặc định, các component không đáp ứng một capability đang active hoặc một dependency bắt buộc sẽ không được đưa vào resolved environment.

---

# 10. Giảm context pollution

Project nên giảm những thứ không cần thiết như:

- instruction,
- rule,
- agent,
- workflow,
- tool definition.

Capability deduplication nên giúp ngăn nhiều implementation cạnh tranh nhau cùng đi vào một environment một cách không cần thiết.

## Tiêu chí thành công

Các exclusive capability không kích hoạt nhiều implementation cạnh tranh nhau trừ khi được override một cách tường minh.

---

# 11. Bảo toàn provenance

Mọi component đã được resolve nên có thể truy vết về nguồn gốc của nó.

Hệ thống nên có khả năng trả lời:

```text
Who provides this component?

Which package contains it?

Which version is installed?

Which commit was selected?

Which capability does it implement?

Why was it included?
```

## Tiêu chí thành công

Các component đã resolve giữ lại metadata về provider, package, version, source và capability mapping.

---

# 12. Làm cho resolution có thể giải thích được

Resolver không được hoạt động như một black box.

Người dùng nên có thể kiểm tra các quyết định.

Ví dụ:

```bash
ap explain engineering.testing.tdd
```

Thông tin mong đợi:

```text
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

## Tiêu chí thành công

Mọi implementation được chọn đều có thể truy vết qua:

```text
Project
→ Profile
→ Preset
→ Capability
→ Implementation
```

---

# 13. Làm cho environment có thể tái tạo

Một project nên có thể tái dựng agent environment của nó trên nhiều máy khác nhau.

Workflow mong đợi:

```bash
git clone project
ap sync
```

Environment thu được nên resolve ra cùng:

- provider,
- package,
- component,
- version,
- capability mapping,
- quyết định policy.

## Tiêu chí thành công

Project lockfile chứa đủ thông tin để tái tạo resolved state một cách deterministic.

---

# 14. Kiểm soát upstream version

Các external provider không nên âm thầm trôi sang những phiên bản latest tùy ý.

Project nên hỗ trợ pin version và commit một cách tường minh.

## Tiêu chí thành công

Một trạng thái upstream đã được kiểm thử có thể được ghi lại và tái sử dụng thông qua một lock ở cấp distribution.

---

# 15. Hỗ trợ update an toàn

Người dùng nên có thể kiểm tra các thay đổi từ upstream trước khi áp dụng chúng.

Ví dụ:

```bash
ap update --check
```

Hệ thống nên hiển thị:

```text
provider version changes
added components
removed components
changed components
capability impact
potential conflicts
security-sensitive changes
```

## Tiêu chí thành công

Một update từ upstream không âm thầm thay đổi resolved project environment.

---

# 16. Hỗ trợ trust và security policy

Hệ thống nên cho phép environment định nghĩa những external behavior nào được phép.

Ví dụ:

```text
external hooks
MCP servers
commands
scripts
experimental providers
community sources
```

Các context khác nhau nên có thể áp dụng các policy khác nhau.

Ví dụ:

```text
Personal
Work
Enterprise
```

## Tiêu chí thành công

Các component nhạy cảm về bảo mật được hiển thị cho policy evaluation trước khi cài đặt hoặc kích hoạt.

---

# 17. Hỗ trợ nhiều trust level

Provider và package nên có thể được phân loại vào các nhóm trust.

Mô hình ban đầu:

```text
first-party
official
curated
community
untrusted
```

## Tiêu chí thành công

Việc phân loại trust có thể ảnh hưởng đến hành vi resolution và cài đặt.

---

# 18. Hỗ trợ native first-party capability

Project nên có thể sở hữu và duy trì các capability đặc thù cho hệ sinh thái của nó.

Ví dụ có thể bao gồm:

```text
product-management
second-brain
GIS
project architecture
documentation workflows
agent development
```

Những capability này nên cùng tồn tại với external provider dưới cùng một capability model.

## Tiêu chí thành công

Implementation native và external tham gia vào cùng một hệ thống resolution.

---

# 19. Tránh fork không cần thiết

Project nên ưu tiên tham chiếu và tích hợp upstream provider thay vì sao chép source của chúng.

External source chỉ nên được vendor hoặc fork khi có lý do rõ ràng về kỹ thuật hoặc bảo trì.

## Tiêu chí thành công

Phần lớn các third-party package vẫn được liên kết với upstream provenance của chúng.

---

# 20. Tách source discovery khỏi target distribution

Hệ thống nên phân biệt giữa:

```text
Where capabilities come from
```

và:

```text
Where capabilities are installed
```

Điều này có nghĩa là duy trì các abstraction riêng biệt cho:

```text
Source Adapters
Target Adapters
```

## Tiêu chí thành công

Một provider integration có thể phát triển độc lập với một runtime integration.

---

# 21. Hỗ trợ nhiều agent runtime

Kiến trúc nên hỗ trợ nhiều target runtime theo thời gian.

Các target environment có thể bao gồm:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

V1 có thể chỉ hỗ trợ một phần, nhưng core domain model không được phụ thuộc hoàn toàn vào một runtime duy nhất.

## Tiêu chí thành công

Thêm một target runtime mới không đòi hỏi phải thiết kế lại capability model hoặc preset model.

---

# 22. Bảo toàn native runtime semantics

Target runtime nên nhận được native artifact bất cứ khi nào có thể.

Hệ thống không nên ép mọi runtime vào một biểu diễn lowest-common-denominator.

## Tiêu chí thành công

Các tính năng riêng của target có thể được biểu diễn thông qua target adapter mà không làm ô nhiễm shared semantic domain model.

---

# 23. Duy trì một source of truth duy nhất

Metadata có thẩm quyền (authoritative) phải được tách biệt rõ ràng khỏi các artifact được generate.

Về mặt khái niệm:

```text
Authoritative
↓
Generated
↓
Consumer State
```

Ví dụ:

```text
catalog/
presets/
profiles/
policies/

        ↓

generated/
marketplace files

        ↓

project manifest
project lockfile
```

## Tiêu chí thành công

Cùng một metadata không được duy trì thủ công ở nhiều vị trí authoritative.

---

# 24. Generate các artifact dẫn xuất

Các file dẫn xuất như:

```text
component indexes
search indexes
target registries
marketplace manifests
```

nên được generate từ canonical metadata.

## Tiêu chí thành công

Các artifact được generate có thể bị xóa và tạo lại mà không mất thông tin.

---

# 25. Cung cấp validation chặt chẽ

Hệ thống nên validate:

- schema,
- tham chiếu provider,
- tham chiếu package,
- capability mapping,
- tham chiếu preset,
- tham chiếu profile,
- target compatibility,
- dependency cycle,
- implementation xung đột.

## Tiêu chí thành công

Cấu hình không hợp lệ bị fail sớm với các chẩn đoán có thể hành động được.

---

# 26. Phát hiện dependency cycle

Composition graph phải luôn không có chu trình (acyclic).

Ví dụ không hợp lệ:

```text
Preset A
→ Preset B
→ Preset C
→ Preset A
```

## Tiêu chí thành công

Cycle được phát hiện trước khi resolution hoặc cài đặt.

---

# 27. Cung cấp chẩn đoán hữu ích

Lỗi nên giải thích cả vấn đề lẫn dependency path liên quan.

Ví dụ:

```text
Unable to resolve security.review

Required by:
backend-engineer
→ engineering/security

Reason:
all implementations rejected by policy
```

## Tiêu chí thành công

Người dùng có thể xác định nguồn gốc của một lỗi resolution mà không cần tự kiểm tra toàn bộ dependency graph.

---

# 28. Cung cấp trải nghiệm CLI đơn giản

Hệ thống nên expose các thao tác phổ biến thông qua một CLI nhỏ gọn và có thể dự đoán được.

Command surface ban đầu:

```text
ap init
ap sync
ap add
ap remove

ap list
ap search
ap explain
ap diff
ap doctor

ap preset ...
ap profile ...

ap update
```

## Tiêu chí thành công

Các workflow phổ biến nhất chỉ cần một vài command ở mức cao.

---

# 29. Biến `sync` thành thao tác reconciliation chính

Người dùng không cần phải tự duy trì trạng thái cài đặt của runtime.

Project manifest mô tả desired state.

`ap sync` đối chiếu (reconcile) actual state với desired state.

Về mặt khái niệm:

```text
Desired State
      ↓
Resolution
      ↓
Actual State
```

## Tiêu chí thành công

Chạy `ap sync` nhiều lần là an toàn và hội tụ về cùng một kết quả.

---

# 30. Hỗ trợ search và discovery

Người dùng nên có thể tìm kiếm trên:

```text
capabilities
presets
profiles
providers
packages
components
```

mà không cần biết chính xác tên repository.

## Tiêu chí thành công

Một lệnh search như:

```bash
ap search tdd
```

có thể hiển thị thông tin liên quan về capability và implementation.

---

# 31. Hỗ trợ chuẩn hóa trong team

Về lâu dài, team nên có thể chia sẻ:

```text
approved providers
preferred implementations
required presets
security policies
version constraints
```

mà không phải lặp lại cấu hình trong mọi project.

## Tiêu chí thành công

Các tầng policy và composition dùng chung có thể được tái sử dụng trên nhiều project.

---

# 32. Vẫn hữu ích cho người dùng cá nhân

Kiến trúc không được đòi hỏi hạ tầng enterprise.

Một developer đơn lẻ nên có thể dùng project cục bộ cho:

```text
software development
Second Brain
research
product management
automation
personal AI workflows
```

## Tiêu chí thành công

Core system hoạt động mà không cần hosted control plane hay tài khoản.

---

# 33. Giữ core deterministic

AI có thể hỗ trợ đưa ra recommendation trong tương lai, nhưng cấu hình và resolution deterministic phải luôn là nền tảng.

Project không nên yêu cầu LLM để:

```text
resolve dependencies
select locked versions
apply policies
reproduce environments
```

## Tiêu chí thành công

Core resolution hoạt động offline dựa trên dữ liệu catalog và lock sẵn có.

---

# 34. Giữ kiến trúc có khả năng mở rộng

Thiết kế nên hỗ trợ các bổ sung trong tương lai như:

```text
new providers
new component types
new capability domains
new target runtimes
new policy fields
new source formats
```

mà không cần thiết kế lại core model.

## Tiêu chí thành công

Các phần mở rộng có thể được đưa vào thông qua các interface đã định nghĩa thay vì sửa đổi các tầng không liên quan.

---

# 35. Giữ V1 tập trung

V1 nên chứng minh core model trước khi mở rộng hệ sinh thái.

Trọng tâm ban đầu nên là:

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

Claude Code target
CLI
```

## Tiêu chí thành công

Core resolution workflow hoạt động end to end trước khi đưa vào các tính năng platform nâng cao.

---

# 36. Mục tiêu sản phẩm V1

V1 nên hỗ trợ workflow sau:

```bash
ap init
```

Tạo:

```text
agent-plugins.yaml
```

Sau đó:

```bash
ap sync
```

Resolve:

```text
Project
+
Profile
+
Presets
+
Policy
        ↓
Capabilities
        ↓
Implementations
        ↓
Packages
        ↓
Components
        ↓
Claude Code environment
```

và generate:

```text
agent-plugins.lock
```

Người dùng cũng nên có thể chạy:

```bash
ap explain
ap diff
ap doctor
ap update --check
```

---

# 37. Mục tiêu kỹ thuật V1

Implementation đầu tiên nên thiết lập:

```text
canonical schemas

catalog loader

dependency graph

capability resolver

conflict resolver

policy evaluator

lockfile writer

source adapter abstraction

Claude Code target adapter

CLI foundation

validation framework
```

Các component này nên tạo nền tảng cho các runtime trong tương lai.

---

# 38. Mục tiêu provider V1

Curated catalog ban đầu nên minh họa việc tích hợp với nhiều kiểu provider khác nhau.

Các provider ban đầu được khuyến nghị:

```text
Superpowers
Matt Pocock Skills
ECC
Anthropic
wshobson/agents
native agent-plugins
```

Mục tiêu không phải là tích hợp mọi thứ mà mỗi provider cung cấp.

Mục tiêu là chứng minh:

```text
discovery
normalization
capability mapping
overlap resolution
version pinning
```

trên các nguồn không đồng nhất.

---

# 39. Mục tiêu profile V1

Tối thiểu, V1 nên cung cấp các profile đại diện cho các loại công việc khác nhau:

```text
frontend-engineer
backend-engineer
product-manager
second-brain
```

Bốn profile này được chọn có chủ đích để kiểm thử các capability composition rất khác nhau.

Chúng chứng minh rằng model không chỉ giới hạn trong software engineering.

---

# 40. Mục tiêu chất lượng V1

Trước khi V1 được coi là ổn định:

```text
all manifests validate

resolution is deterministic

dependency cycles are detected

exclusive capability conflicts resolve consistently

lockfiles reproduce selected state

generated files have no drift

core resolution has automated tests

Claude Code integration passes end-to-end testing
```

---

# 41. Mục tiêu dài hạn

Sau V1, project nên dần hỗ trợ:

```text
more target runtimes

more providers

organization policies

shared catalogs

compatibility analysis

context optimization

provider health analysis

security metadata

update impact analysis

preset recommendations

project auto-detection
```

Những capability này nên được xây dựng trên deterministic core thay vì thay thế nó.

---

# 42. Mục tiêu North Star

Mục tiêu sản phẩm chính là:

> **Người dùng nên có thể mô tả role, project và các capability mong muốn, rồi nhận được một cách đáng tin cậy AI agent environment nhất quán nhỏ nhất đáp ứng những nhu cầu đó.**

Mọi quyết định sản phẩm quan trọng nên được đánh giá dựa trên mục tiêu này.

---

# 43. Phân cấp mục tiêu

Các mục tiêu có thể được tóm tắt như sau:

```text
User Intent
    ↓
Simple configuration
    ↓
Reusable composition
    ↓
Stable capability model
    ↓
Deterministic resolution
    ↓
Minimal coherent environment
    ↓
Explainable decisions
    ↓
Reproducible state
    ↓
Controlled updates
    ↓
Portable distribution
```

---

# 44. Nguyên tắc định hướng mục tiêu

Project nên tối ưu cho:

```text
intent over implementation

capabilities over repositories

composition over duplication

curation over accumulation

minimal environments over maximal installation

determinism over implicit selection

explainability over hidden automation

provenance over opaque dependencies

controlled updates over latest-by-default

reproducibility over configuration drift

stable semantics over provider coupling

native runtime support over lowest-common-denominator output
```

---

# 45. Mục tiêu trong một câu

> **Làm cho AI agent environment dễ khai báo, compose một cách thông minh, resolve một cách deterministic, quản trị an toàn, tái tạo đáng tin cậy và về lâu dài có thể phân phối trên nhiều runtime.**
