# Source of Truth

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.

## Tổng quan

Tài liệu này định nghĩa các quy tắc source-of-truth cho `agent-plugins`.

Dự án chứa nhiều loại state:

```text
authoritative metadata
discovered metadata
generated metadata
locked state
consumer configuration
runtime state
documentation
```

Các state này phải luôn được tách biệt rõ ràng.

Quy tắc cốt lõi là:

> **Mỗi thông tin quan trọng nên có đúng một owner có thẩm quyền (authoritative owner).**

Các biểu diễn khác có thể tham chiếu, chuẩn hóa, cache, suy ra hoặc materialize thông tin đó, nhưng không được âm thầm trở thành các source of truth độc lập.

---

# 1. Vì sao các quy tắc Source-of-Truth quan trọng

Nếu không có quyền sở hữu rõ ràng, cùng một thông tin có thể xuất hiện ở nhiều nơi.

Ví dụ:

```text
catalog/packages/superpowers.yaml

generated/catalog/components.json

.claude-plugin/marketplace.json

agent-plugins.lock
```

Nếu cả bốn file đều định nghĩa độc lập:

```text
version
repository
components
capability mapping
```

thì sớm muộn chúng sẽ bị lệch nhau (drift).

Các vấn đề điển hình bao gồm:

```text
duplicate metadata

conflicting versions

stale generated files

unclear update ownership

manual synchronization

unreproducible environments
```

Do đó kiến trúc phải phân biệt giữa:

```text
what humans maintain

what adapters discover

what generators derive

what resolvers compute

what lockfiles freeze

what target adapters materialize
```

---

# 2. Các loại State

`agent-plugins` sử dụng sáu loại state chính.

```text
1. Authoritative Source

2. Discovered State

3. Generated State

4. Resolution State

5. Consumer State

6. Runtime State
```

Documentation được xử lý riêng vì nó có thể mô tả bất kỳ loại nào ở trên.

---

# 3. Authoritative Source

Một **Authoritative Source** là vị trí canonical nơi các maintainer chủ đích định nghĩa thông tin.

Nếu tồn tại xung đột giữa một authoritative source và dữ liệu được suy ra:

```text
authoritative source wins
```

Ví dụ:

```text
catalog/publishers/
catalog/packages/
catalog/capabilities/

presets/
roles/
policies/

plugins/native/
```

Các vị trí này chứa những quyết định do dự án sở hữu.

---

# 4. Authoritative không có nghĩa là Upstream

Một repository bên ngoài có thể là authoritative đối với source code của chính nó.

Tuy nhiên, bên trong `agent-plugins`, upstream repository không phải là authoritative đối với các quyết định ngữ nghĩa do dự án sở hữu như:

```text
capability mapping
default priority
curation status
trust classification
preset composition
role composition
```

Ví dụ:

```text
Superpowers repository
→ authoritative for Superpowers source

agent-plugins catalog
→ authoritative for how Superpowers is modeled and curated
```

Các trách nhiệm này phải luôn tách biệt.

---

# 5. Publisher Metadata canonical

Source of truth:

```text
catalog/publishers/
```

Ví dụ:

```text
catalog/publishers/superpowers.yaml
```

File này sở hữu Publisher metadata do dự án duy trì như:

```text
canonical publisher ID
display name
ownership classification
default trust classification
source configuration
discovery strategy
documentation links
```

Nó không nên sao chép lại mọi Component đã được discover.

---

# 6. Package Metadata canonical

Source of truth:

```text
catalog/packages/
```

Ví dụ:

```text
catalog/packages/superpowers.yaml
```

Nơi này sở hữu metadata cấp Package đã được curate như:

```text
canonical package ID
publisher relationship
source location
supported discovery strategy
version constraints
curation metadata
target metadata when explicitly curated
```

Không nên sao chép thủ công các inventory thô từ upstream vào đây, trừ khi chúng là Package metadata có chủ đích.

---

# 7. Capability Metadata canonical

Source of truth:

```text
catalog/capabilities/
```

Đây là vị trí canonical cho:

```text
Capability ID
description
cardinality
stability
dependencies
aliases
implementation mappings
default implementation priorities
```

Ví dụ:

```text
catalog/capabilities/engineering/testing/tdd.yaml
```

sở hữu:

```text
engineering.testing.tdd
```

---

# 8. Quyền sở hữu Capability Mapping

Mapping:

```text
Component
→ Capability
```

là một quyết định ngữ nghĩa đã được curate.

Vì vậy source of truth của nó thuộc về capability catalog đã được curate, không phải upstream discovery.

Ví dụ:

```text
Superpowers skill:
test-driven-development
```

có thể được discover tự động.

Nhưng:

```text
test-driven-development
→ engineering.testing.tdd
```

là một semantic mapping do dự án duy trì.

---

# 9. Preset Metadata canonical

Source of truth:

```text
presets/
```

Preset sở hữu:

```text
Preset ID
included capabilities
included presets
preset metadata
```

Ví dụ:

```text
presets/engineering/core.yaml
```

Một index được generate có thể liệt kê các capability của nó, nhưng file Preset vẫn là authoritative.

---

# 10. Role Metadata canonical

Source of truth:

```text
roles/
```

Role sở hữu:

```text
Role ID
Preset composition
Role metadata
```

Ví dụ:

```text
roles/frontend-engineer.yaml
```

Các role index được generate không được trở thành các định nghĩa có thể chỉnh sửa độc lập.

---

# 11. Policy Metadata canonical

Source of truth:

```text
policies/
```

Policy sở hữu các quy tắc khai báo (declarative) cho:

```text
trust
publisher restrictions
security-sensitive components
review requirements
experimental components
preferences
```

Ví dụ:

```text
policies/strict.yaml
```

Không runtime adapter nào được tự định nghĩa lại ngữ nghĩa của các policy này.

---

# 12. Native Implementation Source canonical

Source of truth:

```text
plugins/native/
```

Source code của native plugin và các định nghĩa native Component thuộc về nơi này.

Ví dụ:

```text
plugins/native/second-brain/
```

Thư mục này là authoritative cho implementation first-party thực tế.

Catalog metadata có thể tham chiếu đến nó.

Các target manifest được generate có thể expose nó.

Không cái nào trong số đó được sở hữu trùng lặp source code của nó.

---

# 13. Source Adapter Code

Source of truth cho hành vi chuẩn hóa upstream:

```text
packages/source-adapters/
```

Adapter định nghĩa:

```text
how upstream formats are discovered
how upstream metadata is normalized
how Package/Component identity is extracted
```

Output discovery được generate không phải là authoritative cho hành vi của adapter.

---

# 14. Target Adapter Code

Source of truth cho logic materialization đặc thù theo runtime:

```text
packages/target-adapters/
```

Target adapter định nghĩa:

```text
how Resolution maps into runtime-native artifacts
how Actual State is inspected
how Managed State is identified
how changes are applied
```

Các runtime file được generate không định nghĩa ngữ nghĩa của adapter.

---

# 15. Logic Domain và Resolver

Source of truth cho hành vi domain:

```text
packages/core/
```

Ví dụ:

```text
Capability semantics
resolution ordering
policy evaluation
conflict behavior
lockfile construction
diagnostic rules
```

Documentation giải thích hành vi này, nhưng các quy tắc thực thi cuối cùng sẽ nằm trong code sau khi được implement.

Nếu documentation và implementation khác nhau:

```text
the divergence is a bug
```

thay vì là lý do để duy trì hai định nghĩa cạnh tranh nhau.

---

# 16. Schema Contract

Source of truth cho cấu trúc manifest được serialize:

```text
packages/schemas/
```

Schema định nghĩa cấu trúc hợp lệ về mặt máy cho:

```text
Publisher
Package
Capability
Preset
Role
Policy
Project
Lockfile
```

Documentation nên giải thích schema nhưng không nên định nghĩa lại các field contract không tương thích.

---

# 17. Discovered State

**Discovered State** là thông tin thu được từ các nguồn bên ngoài.

Ví dụ:

```text
upstream component inventories
upstream manifests
repository metadata
release metadata
component locations
```

Discovered state không tự động được tin cậy hay được curate.

Về mặt khái niệm:

```text
Upstream
   ↓
Source Adapter
   ↓
Discovered State
```

---

# 18. Discovered State không phải là Canonical Curation

Các state sau phải luôn tách biệt:

```text
discovered
curated
selected
```

Ví dụ:

```text
Publisher contains 300 Components

300 discovered

25 curated

8 selected for current project
```

Một kết quả discovery không bao giờ được tự động định nghĩa lại curated catalog.

---

# 19. Component Inventory được generate

Vị trí khuyến nghị:

```text
generated/catalog/components.json
```

File này có thể chứa dữ liệu Component third-party đã được chuẩn hóa, discover từ upstream.

Nó là:

```text
generated
rebuildable
non-authoritative
```

Nó không được chứa các curation thủ công không thể thay thế.

---

# 20. Generated Metadata

Generated metadata tồn tại để phục vụ hiệu năng, khả năng tương thích, discovery hoặc sự tiện lợi khi phân phối.

Ví dụ:

```text
generated/catalog/components.json

generated/catalog/search-index.json

generated/catalog/reverse-index.json

generated/catalog/capability-index.json
```

Các file này được suy ra từ các authoritative source và/hoặc dữ liệu upstream đã được lock.

---

# 21. Quy tắc Generated State

Một generated artifact phải thỏa mãn:

```text
delete artifact
+
run generator
=
equivalent artifact
```

Nếu việc xóa một generated artifact làm mất thông tin được duy trì thủ công, kiến trúc đó là sai.

---

# 22. Generated File phải khai báo Generator của nó

Mỗi generated file được commit nên có một đường generate đã biết.

Về mặt khái niệm:

```text
generated/catalog/components.json
← generate:catalog

.claude-plugin/marketplace.json
← generate:claude-marketplace
```

Mối quan hệ này nên được ghi lại trong documentation hoặc được mã hóa trong tooling của repository.

---

# 23. Generated File là Read-Only theo quy ước

Con người nhìn chung không nên chỉnh sửa:

```text
generated/
```

một cách trực tiếp.

Thay vào đó:

```text
edit authoritative source
↓
run generator
↓
review generated diff
```

Điều này giữ cho hướng phụ thuộc được rõ ràng.

---

# 24. Marketplace Metadata được generate

Ví dụ:

```text
.claude-plugin/marketplace.json
```

nên được ưu tiên suy ra từ:

```text
catalog/publishers/
catalog/packages/
plugins/native/
catalog.lock
```

File marketplace tồn tại vì Claude Code cần một định dạng native.

Nó không nên trở thành một catalog độc lập thứ hai.

---

# 25. Các file đặc thù theo Target là dữ liệu được suy ra

Các manifest đặc thù theo runtime nhìn chung nên tuân theo:

```text
Canonical Domain Metadata
        ↓
Target Adapter / Generator
        ↓
Runtime-Specific Artifact
```

Ví dụ:

```text
Claude marketplace manifest

Codex configuration

Gemini configuration

future runtime metadata
```

Định dạng target không nên định nghĩa core model.

---

# 26. Distribution Lock

Nguồn khuyến nghị:

```text
catalog.lock
```

File này là authoritative cho **baseline upstream đã được chọn và kiểm thử** của bản phân phối `agent-plugins`.

Nó sở hữu các thông tin pin cụ thể như:

```text
Publisher/package version

commit SHA

content integrity

resolved upstream reference
```

Nó không sở hữu các định nghĩa Capability về mặt ngữ nghĩa.

---

# 27. Ngữ nghĩa của Distribution Lock

Mối quan hệ là:

```text
Catalog Metadata
        +
Maintainer Update Decision
        ↓
catalog.lock
```

Distribution Lock trả lời câu hỏi:

> Bản phân phối này đã chủ đích chọn và kiểm thử upstream state chính xác nào?

Nó không trả lời câu hỏi:

> Người dùng cần những capability nào?

---

# 28. Catalog và Distribution Lock

Hai thứ này phải luôn tách biệt.

```text
catalog/packages/
```

trả lời:

```text
What Package is this?
Where does it come from?
How is it modeled?
```

`catalog.lock` trả lời:

```text
Which exact version/ref of this Package is currently curated?
```

Sự tách biệt này cho phép cập nhật có kiểm soát.

---

# 29. Consumer Manifest

Source of truth cho semantic state mong muốn của một consumer project:

```text
agent-plugins.yaml
```

Nó sở hữu ý định (intent) của project như:

```text
role
presets
policy
targets
overrides
```

Đây là cấu hình chính do consumer quản lý.

---

# 30. Consumer Manifest phải luôn hướng theo Intent

Consumer manifest thông thường không nên sao chép lại:

```text
publisher repositories
component inventories
resolved package versions
generated target paths
```

Những thứ đó thuộc về nơi khác.

Nên dùng:

```yaml
role: frontend-engineer

presets:
  - stacks/nextjs
  - engineering/security
```

Tránh các danh sách plugin lớn được resolve thủ công.

---

# 31. Project Lockfile

Source of truth cho resolved state cụ thể của một consumer project:

```text
agent-plugins.lock
```

Lockfile ghi lại kết quả của quá trình resolution tất định (deterministic).

Nó có thể sở hữu:

```text
selected implementations
resolved packages
resolved versions
immutable refs
integrity metadata
target-specific resolved state
```

---

# 32. Manifest và Lockfile

Hai thứ này biểu diễn những sự thật khác nhau.

```text
agent-plugins.yaml
→ desired semantic intent

agent-plugins.lock
→ resolved concrete state
```

Lockfile không được thay thế manifest.

Manifest không được cố gắng mã hóa mọi chi tiết implementation đã được lock.

---

# 33. Desired State và Resolved State

Về mặt khái niệm:

```text
Desired State
agent-plugins.yaml

        ↓

Resolver

        ↓

Resolved State
agent-plugins.lock
```

Sự phân biệt này mang tính nền tảng.

---

# 34. Lockfile được generate nhưng là Authoritative cho việc tái tạo

Lockfile được tạo ra bởi resolver, nhưng một khi đã được commit, nó trở thành authoritative cho việc tái tạo resolved state đó của project.

Điều này khiến lockfile khác với các generated index thông thường.

Chúng là:

```text
derived
but intentionally persisted
and semantically authoritative for concrete reproduction
```

Do đó:

```text
generated index
≠
lockfile
```

---

# 35. Lockfile không được sở hữu User Intent

Nếu người dùng muốn thêm:

```text
security.review
```

họ nên chỉnh sửa:

```text
agent-plugins.yaml
```

chứ không chỉnh sửa trực tiếp:

```text
agent-plugins.lock
```

Lockfile là state do resolver sở hữu.

---

# 36. Quy tắc chỉnh sửa Lockfile

Việc chỉnh sửa lockfile thủ công nên không được hỗ trợ hoặc bị phản đối mạnh mẽ.

Luồng khuyến nghị:

```text
edit manifest
↓
resolve
↓
write lockfile
```

hoặc:

```text
request update
↓
resolve new state
↓
write lockfile
```

---

# 37. Resolution State

Một Resolution được tính toán trong bộ nhớ từ:

```text
Catalog

Distribution Lock

Project Manifest

Role

Presets

Policy

Target

Existing Project Lock
```

Bản thân Resolution có thể không cần một file độc lập được lưu trữ lâu dài.

Biểu diễn bền vững của nó chủ yếu là:

```text
agent-plugins.lock
```

cùng với target materialization state.

---

# 38. Resolution Decision

Các resolution decision nên được generate bởi resolver.

Ví dụ:

```text
selected

suppressed

rejected

policy denied

target incompatible

priority winner
```

Lý do canonical cho một resolution decision là thuật toán resolver cùng với các input đã được chuẩn hóa của nó.

Không duy trì thủ công các file decision độc lập.

---

# 39. Dữ liệu Explainability

Explainability nên được suy ra từ:

```text
Resolution Decisions

Project Manifest

Catalog

Lockfile
```

thay vì từ metadata giải thích được viết thủ công.

Ví dụ:

```bash
ap explain engineering.testing.tdd
```

nên kiểm tra dữ liệu do resolver tạo ra.

---

# 40. Runtime State

Runtime state là state đã được materialize bên trong:

```text
Claude Code
Codex
Gemini
OpenCode
Hermes
```

Nó biểu diễn:

```text
what currently exists
```

chứ không phải:

```text
what the project intends
```

Vì vậy runtime state không được trở thành source of truth chính.

---

# 41. Actual State

**Actual State** được discover bởi một Target Adapter.

Ví dụ:

```text
installed package A

installed package B

manual package C
```

Actual State mang tính quan sát.

Nó có thể chứa cấu hình người dùng không được quản lý (unmanaged).

---

# 42. Managed State

Managed State là tập con của Actual State do `agent-plugins` kiểm soát.

Ví dụ:

```text
Actual State

├── A ← agent-plugins managed
├── B ← agent-plugins managed
└── C ← manually managed
```

Managed State nên có thể được tái dựng từ:

```text
Project Lockfile
+
Target Adapter conventions
```

khi khả thi.

---

# 43. Runtime State không được ghi đè Desired State

Nếu runtime state khác với manifest:

```text
Desired State
≠
Actual Managed State
```

hệ thống nên báo cáo drift.

Nó không nên âm thầm viết lại user intent để khớp với runtime state.

---

# 44. Hướng đồng bộ

Hướng reconciliation thông thường là:

```text
Desired State
      ↓
Resolution
      ↓
Materialization Plan
      ↓
Managed Runtime State
```

Không phải:

```text
Runtime State
      ↓
silently redefine Desired State
```

---

# 45. Import Runtime State hiện có

Một command import/adopt trong tương lai có thể chủ đích tạo cấu hình từ runtime state hiện có.

Ví dụ:

```text
ap import
```

Nếu được hỗ trợ, đây là một thao tác chuyển đổi tường minh.

Nó không được làm mờ hướng source-of-truth thông thường.

---

# 46. Phân cấp Source-of-Truth

Phân cấp cốt lõi là:

```text
Human-maintained Intent / Curation
        ↓
Authoritative Metadata
        ↓
Normalized Domain Model
        ↓
Resolver
        ↓
Lock State
        ↓
Target Adapter
        ↓
Managed Runtime State
```

Discovery từ bên ngoài đi vào trước bước curation:

```text
External Source
      ↓
Discovery
      ↓
Review / Curation
      ↓
Authoritative Catalog Mapping
```

---

# 47. Luồng dữ liệu đầy đủ

```text
                    External Publisher
                           │
                           ▼
                    Source Adapter
                           │
                           ▼
                 Discovered Components
                           │
                           │
                  Maintainer Curation
                           │
                           ▼
┌────────────────────────────────────────────┐
│           Authoritative Metadata           │
│                                            │
│ catalog/                                   │
│ presets/                                   │
│ roles/                                  │
│ policies/                                  │
│ plugins/native/                            │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
                 Validation
                      │
                      ▼
              Normalized Domain
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
       Generators            Resolver
            │                   │
            ▼                   ▼
      generated/        agent-plugins.lock
            │                   │
            ▼                   ▼
runtime distribution      Target Adapter
artifacts                   │
                            ▼
                     Managed Runtime State
```

---

# 48. Ma trận quyền sở hữu dữ liệu

| Dữ liệu | Source of Truth | Suy ra từ |
|---|---|---|
| Định danh Publisher | `catalog/publishers/` | Curation của maintainer |
| Định danh Package | `catalog/packages/` | Curation của maintainer |
| Định danh Capability | `catalog/capabilities/` | Curation của maintainer |
| Cardinality của Capability | `catalog/capabilities/` | Quyết định của maintainer |
| Implementation mapping | `catalog/capabilities/` | Curation của maintainer |
| Độ ưu tiên implementation mặc định | `catalog/capabilities/` | Curation của maintainer |
| Thành phần của Preset | `presets/` | Curation của maintainer |
| Thành phần của Role | `roles/` | Curation của maintainer |
| Các quy tắc Policy | `policies/` | Curation của maintainer |
| Native source code | `plugins/native/` | Implementation first-party |
| Component inventory third-party | Discovery state được generate | Source adapter + upstream |
| Phiên bản upstream đã curate | `catalog.lock` | Quyết định cập nhật của maintainer |
| Search index | `generated/` | Metadata canonical |
| Reverse index | `generated/` | Metadata canonical |
| Output Claude marketplace | `.claude-plugin/marketplace.json` | Catalog/native/lock |
| Intent của project | `agent-plugins.yaml` | Consumer |
| Resolution của project | `agent-plugins.lock` | Resolver |
| Runtime state thực tế | Runtime | Target inspection |
| Runtime state được quản lý | Runtime + lock metadata | Target adapter |
| Các quy tắc kiến trúc | `docs/` + implementation | Maintainer/code |

---

# 49. Phân loại Filesystem

## Authoritative Domain Data

```text
catalog/
presets/
roles/
policies/
plugins/native/
```

## Authoritative Implementation

```text
apps/
packages/
tools/
```

## Authoritative Documentation

```text
docs/
```

## Locked State

```text
catalog.lock
agent-plugins.lock
```

## Generated State

```text
generated/
.claude-plugin/marketplace.json
```

## Consumer Intent

```text
agent-plugins.yaml
```

## Runtime State

```text
target-specific managed files
```

---

# 50. Source of Truth của Documentation

Documentation có phân cấp riêng của nó.

`docs/index.md` là authoritative cho:

```text
documentation navigation
reading order
authoring order
```

Các định nghĩa domain chủ yếu thuộc về:

```text
docs/01-domain/
```

Các quyết định kiến trúc chủ yếu thuộc về:

```text
docs/02-architecture/
```

Các technical contract chủ yếu thuộc về:

```text
docs/03-specs/
```

---

# 51. Tránh trùng lặp Documentation

Một khái niệm nên có một phần giải thích chuyên sâu canonical duy nhất.

Ví dụ:

```text
Capability semantics
→ capability-model.md
```

Các tài liệu khác có thể tóm tắt nó nhưng nên link ngược lại thay vì định nghĩa lại theo cách khác.

Tương tự:

```text
Resolver algorithm
→ resolution-spec.md

Lockfile format
→ lockfile-spec.md

Policy semantics
→ policy-spec.md
```

---

# 52. README không phải là Source of Truth về kiến trúc

Root:

```text
README.md
```

nên cung cấp:

```text
overview
quick start
basic concepts
links
```

Nó không nên trở thành nguồn canonical cho các quyết định chi tiết về domain hoặc kiến trúc.

---

# 53. Source of Truth của ADR

Một ADR ghi lại:

```text
why an important architectural decision was made
```

Documentation kiến trúc hiện tại ghi lại:

```text
what the architecture is now
```

Do đó:

```text
ADR
→ historical decision context

architecture.md
→ current architectural model
```

Nếu một ADR bị thay thế (superseded), documentation kiến trúc nên phản ánh trạng thái hiện tại.

---

# 54. Code và Documentation

Một khi implementation đã tồn tại:

```text
specification
and
implementation
```

phải thống nhất với nhau.

Khi chúng không thống nhất:

```text
do not silently treat implementation as new specification
```

Thay vào đó:

```text
determine intended behavior

update code or spec

record architectural change if necessary
```

---

# 55. Schema và Example

Schema là authoritative cho cấu trúc hợp lệ về mặt máy.

Example mang tính minh họa, giáo dục.

Do đó:

```text
example accepted by docs
but rejected by schema
```

là một lỗi documentation.

Example không được tự định nghĩa lại cấu trúc hợp lệ một cách độc lập.

---

# 56. Catalog và Generated Component Index

Ví dụ:

```text
catalog/capabilities/engineering/testing/tdd.yaml
```

có thể tham chiếu:

```text
superpowers/...#skill:test-driven-development
```

Sự tồn tại và metadata thô của Component đó có thể đến từ:

```text
generated/catalog/components.json
```

Semantic mapping vẫn là authoritative trong file Capability.

Như vậy:

```text
Generated Component Index
→ what exists

Capability Catalog
→ what it means to agent-plugins
```

---

# 57. Phiên bản Upstream và Distribution Lock

Một upstream repository có thể phát hành:

```text
v6.4
```

nhưng `agent-plugins` có thể vẫn được pin ở:

```text
v6.3
```

Phiên bản latest hiện tại của upstream không phải là source of truth của bản phân phối.

Đối với resolution thông thường:

```text
catalog.lock
```

được ưu tiên cho đến khi có một lần cập nhật có chủ đích.

---

# 58. Latest mang tính quan sát, không phải Authoritative

Source adapter có thể báo cáo:

```text
latest available version
```

Thông tin này hữu ích cho:

```text
ap update --check
```

nhưng không được tự động thay đổi:

```text
catalog.lock
```

hoặc lockfile của consumer project.

---

# 59. Hướng cập nhật

Một lần cập nhật publisher nên đi theo luồng:

```text
Upstream Change
      ↓
Discovery
      ↓
Update Report
      ↓
Maintainer Review
      ↓
catalog.lock Update
      ↓
Generated Artifact Update
```

Không phải:

```text
Upstream Change
      ↓
automatic lock mutation
```

---

# 60. Hướng cập nhật Project

Một lần cập nhật consumer project nên đi theo luồng:

```text
New curated distribution state
        ↓
Explicit project update
        ↓
Resolver
        ↓
New agent-plugins.lock
        ↓
Target materialization
```

Thao tác thông thường:

```text
ap sync
```

nên giữ nguyên locked state hợp lệ.

---

# 61. Source of Truth của Resolver

Resolver hoạt động trên các input đã được chuẩn hóa.

Nó không nên kiểm tra các target file được generate một cách tùy tiện để suy ra semantic intent.

Các input canonical của resolver là:

```text
Catalog
Distribution Lock
Project Manifest
Role
Presets
Policy
Target descriptor
Existing Project Lock
Overrides
```

---

# 62. Quyền sở hữu Output của Resolver

Resolver sở hữu:

```text
Selected Implementations

Suppressed Implementations

Rejected Implementations

Resolution Decisions

Resolution Diagnostics
```

Target adapter tiêu thụ các kết quả đó.

Chúng không được tự chọn các publisher thay thế một cách độc lập.

---

# 63. Quy tắc Source-of-Truth cho Target Adapter

Một Target Adapter có thể quyết định:

```text
how
```

để biểu diễn state đã được chọn.

Nó không được quyết định:

```text
what semantic implementation wins
```

Ví dụ:

```text
Resolver:
TDD → Superpowers
```

Claude Code adapter không được thay thế bằng ECC TDD chỉ vì nó dễ render hơn.

---

# 64. Quy tắc Source-of-Truth cho Source Adapter

Một Source Adapter có thể xác định:

```text
what exists upstream
```

Nó không được xác định:

```text
what semantic capability that Component should own
```

Mapping đó là thứ được curate.

---

# 65. Thứ tự ưu tiên của Publisher Metadata

Khi upstream metadata đã chuẩn hóa và Publisher metadata đã curate chồng lấn nhau:

```text
curated metadata
```

nhìn chung nên được ưu tiên đối với các field ngữ nghĩa do dự án sở hữu.

Ví dụ:

```text
display name
trust classification
curation status
```

Upstream metadata thô vẫn hữu ích như dữ liệu nguồn được quan sát.

---

# 66. Thứ tự ưu tiên của Package Metadata

Một Package có thể có:

```text
upstream metadata
+
curated metadata
```

Những thứ này nên được merge bằng các quy tắc ưu tiên tường minh.

Về mặt khái niệm:

```text
immutable upstream facts
+
curated annotations
=
normalized package
```

Ví dụ:

```text
upstream repository URL
→ discovered fact

trust level
→ curated annotation
```

Không để metadata đã curate viết lại các sự kiện nguồn bất biến khi không có một override model tường minh.

---

# 67. Source of Truth của Trust

Trust metadata mặc định do dự án duy trì thuộc về:

```text
catalog
and/or
policy
```

tùy theo ngữ nghĩa.

Ví dụ:

```text
Publisher baseline classification
→ catalog/publishers/

Allowed trust levels
→ policies/
```

Runtime adapter không được tự đặt ra các giá trị trust.

---

# 68. Source of Truth của Ownership

Phân loại ownership thuộc về metadata canonical.

Ví dụ:

```text
agent-plugins
→ first-party

Superpowers
→ third-party
```

Ownership không nên được suy ra từ vị trí cài đặt.

Một Package third-party được cache cục bộ vẫn là third-party.

---

# 69. Source of Truth của Native

Một native Component được định nghĩa bởi:

```text
actual repository source
+
canonical metadata
```

Biểu diễn Claude plugin được generate của nó không phải là authoritative.

Ví dụ:

```text
plugins/native/product-management/
```

được ưu tiên hơn:

```text
generated/targets/claude-code/...
```

---

# 70. Source of Truth của Dependency

Các loại dependency khác nhau có các owner khác nhau.

```text
Preset → Preset
→ preset manifest

Preset → Capability
→ preset manifest

Capability → Capability
→ capability manifest

Component → Component
→ normalized component/package metadata

Package → Package
→ package/source metadata
```

Không gộp tất cả các quan hệ dependency vào một dependency file được generate duy nhất.

---

# 71. Source of Truth của Conflict

Conflict ngầm định:

```text
Capability cardinality
```

nguồn:

```text
catalog/capabilities/
```

Conflict tường minh giữa các Component:

```text
Component metadata
or curated Package/Component annotations
```

Lựa chọn implementation đặc thù theo project:

```text
Project override
```

Đây nên là các khái niệm tách biệt.

---

# 72. Source of Truth của Priority

Độ ưu tiên implementation mặc định thuộc về:

```text
Capability implementation mapping
```

Preference đặc thù theo project thuộc về:

```text
Project override
```

Preference về publisher ở cấp policy thuộc về:

```text
Policy
```

Độ ưu tiên hiệu lực của resolver được tính toán từ các nguồn này.

Bản thân nó không được lưu trữ thủ công như một authoritative file khác.

---

# 73. Effective Configuration là dữ liệu được suy ra

Không nên có file được duy trì thủ công nào biểu diễn:

```text
fully expanded final project configuration
```

như một source of truth khác.

Effective configuration nên được tính toán từ:

```text
Project
+
Role
+
Presets
+
Policy
+
Catalog
```

Điều này tránh được configuration drift.

---

# 74. Normalized Domain State là dữ liệu được suy ra

Các manifest thô là input được serialize có tính authoritative.

Các normalized domain object là các biểu diễn tại runtime.

Về mặt khái niệm:

```text
YAML
↓
Schema Validation
↓
Normalization
↓
Domain Object
```

Normalized object không cần được lưu trữ thành các file có thể chỉnh sửa độc lập.

---

# 75. Cache không bao giờ là Authoritative

Các cache trong tương lai có thể lưu trữ:

```text
downloaded metadata
parsed manifests
search indexes
remote responses
```

Mọi cache phải có thể bị xóa bỏ một cách an toàn.

Về mặt khái niệm:

```text
rm -rf cache
```

không được phá hủy user intent hoặc metadata đã được curate.

---

# 76. Package Cache đã tải về

Nếu source của Package được cache cục bộ:

```text
cache/
```

thì cache không phải là source of truth của Package.

Lockfile cùng với immutable reference của upstream quyết định những gì cần được truy xuất.

---

# 77. State trên máy cục bộ

State trên máy cục bộ như:

```text
cache
temporary files
credentials
runtime installation paths
```

không được ảnh hưởng đến semantic resolution, trừ khi được biểu diễn tường minh như một input.

Điều này bảo đảm khả năng tái tạo (reproducibility).

---

# 78. Biến môi trường

Biến môi trường có thể cung cấp:

```text
credentials
network configuration
target paths
```

nhưng không nên âm thầm thay đổi việc lựa chọn capability về mặt ngữ nghĩa.

Nếu một biến môi trường ảnh hưởng đến ngữ nghĩa của resolution, nó nên được xem như một input tường minh của Resolution Context và được ghi lại trong documentation.

Nên tránh hành vi như vậy trong V1.

---

# 79. Cấu hình Global ẩn

Resolution của project không được phụ thuộc vào global state không được ghi lại trong documentation.

Nếu trong tương lai có cấu hình cấp người dùng:

```text
global role defaults
preferred policy
```

nó nên tường minh và có thể quan sát được.

Một project lockfile đã commit nên vẫn đủ để tái tạo khi có thể.

---

# 80. Consumer Override

Các override của project thuộc về:

```text
agent-plugins.yaml
```

Chúng không nên bị giấu bên trong các file được generate đặc thù theo runtime.

Ví dụ:

```yaml
overrides:
  implementations:
    engineering.testing.tdd:
      component: mattpocock/skills#skill:tdd
```

---

# 81. Không dùng Runtime Override thủ công làm Canonical Intent

Nếu người dùng chỉnh sửa thủ công các runtime file được generate:

```text
.claude/...
```

các chỉnh sửa đó không nên âm thầm trở thành Project intent.

Các kết quả có thể xảy ra:

```text
preserve unmanaged change

report managed drift

require explicit adoption
```

tùy theo ownership.

---

# 82. Phát hiện Drift

Drift có thể tồn tại giữa:

```text
authoritative source
and
generated state
```

hoặc:

```text
desired state
and
managed runtime state
```

Ví dụ:

```text
catalog changed
but search index stale

manifest changed
but lockfile stale

lockfile unchanged
but managed runtime files modified
```

Những drift này nên có thể được phát hiện.

---

# 83. Generated Drift

Phát hiện:

```text
generate
↓
compare
↓
difference
```

Nếu output được generate khác với output đã commit:

```text
generated state is stale
```

CI nên fail ở những nơi phù hợp.

---

# 84. Manifest-Lock Drift

Nếu:

```text
agent-plugins.yaml
```

thay đổi mà không có cập nhật lock tương thích:

```text
agent-plugins.lock
```

trở nên lỗi thời (stale).

Các command như:

```text
ap diff
ap doctor
ap sync
```

nên phát hiện được điều này.

---

# 85. Runtime Drift

Nếu managed runtime state khác với kỳ vọng đã lock/materialize:

```text
runtime drift
```

nên được báo cáo.

Adapter có thể reconcile nó trong quá trình:

```text
ap sync
```

---

# 86. Bảo toàn State thủ công

Unmanaged runtime state nên được giữ nguyên theo mặc định.

Ví dụ:

```text
manual plugin C
```

không nên bị xóa chỉ vì nó không xuất hiện trong:

```text
agent-plugins.lock
```

Ownership phải tường minh.

---

# 87. Các quy tắc ưu tiên

Khi tồn tại nhiều biểu diễn, hãy sử dụng thứ tự ưu tiên khái niệm sau.

Đối với semantic intent:

```text
Project explicit override
        ↓
Project Presets
        ↓
Role Presets
```

Đối với tính đủ điều kiện (eligibility) của implementation:

```text
Hard Constraints
        ↓
Policy
        ↓
Target Compatibility
```

Đối với preference về implementation:

```text
Explicit Project Override
        ↓
Existing Valid Lock
        ↓
Policy Preference
        ↓
Catalog Priority
```

Ngữ nghĩa chính xác của resolver thuộc về `resolution-spec.md`.

---

# 88. Thứ tự ưu tiên nguồn không phải là thứ tự ưu tiên file

Tránh suy nghĩ:

```text
file A always overrides file B
```

một cách tổng quát.

Thứ tự ưu tiên thuộc về các field ngữ nghĩa và các giai đoạn resolution cụ thể.

Ví dụ:

```text
Policy cannot redefine Capability ID.

Project override cannot rewrite Publisher provenance.

Target adapter cannot override selected implementation.
```

Ranh giới mang tính ngữ nghĩa, không chỉ đơn thuần dựa trên filesystem.

---

# 89. Thay đổi Authoritative Metadata

Authoritative metadata chỉ thay đổi thông qua việc bảo trì có chủ đích.

Ví dụ:

```text
edit capability mapping

add Publisher

change Preset composition

change Policy

add native implementation
```

Discovery tự động không nên trực tiếp commit các thay đổi ngữ nghĩa mà không qua review.

---

# 90. Thay đổi Generated Artifact

Generated artifact thay đổi thông qua generator.

Đúng:

```text
canonical change
↓
generator
↓
generated diff
```

Tránh:

```text
manual generated edit
↓
later overwritten
```

---

# 91. Thay đổi Lockfile

Lockfile thay đổi thông qua:

```text
resolution
explicit update
sync requiring resolution change
```

chứ không thông qua curation thủ công.

---

# 92. Thay đổi Runtime

Managed runtime state thay đổi thông qua:

```text
Target Adapter
```

sau khi một materialization plan được tạo ra.

Core domain code không nên trực tiếp thay đổi runtime file.

---

# 93. Source-of-Truth theo từng thao tác

## Thêm Publisher

Chỉnh sửa:

```text
catalog/publishers/
catalog/packages/
```

Có thể cả:

```text
source adapter configuration
```

Sau đó generate lại dữ liệu discovery.

---

## Thêm Capability

Chỉnh sửa:

```text
catalog/capabilities/
```

Sau đó validate và generate lại các index.

---

## Thêm Preset

Chỉnh sửa:

```text
presets/
```

Sau đó validate thành phần (composition).

---

## Thêm Role

Chỉnh sửa:

```text
roles/
```

---

## Thay đổi Policy

Chỉnh sửa:

```text
policies/
```

---

## Thêm Native Plugin

Chỉnh sửa:

```text
plugins/native/
```

và các Package/Capability mapping canonical tương ứng.

---

## Cập nhật phiên bản Publisher

Không viết lại định danh ngữ nghĩa trong catalog.

Cập nhật:

```text
catalog.lock
```

sau khi review.

---

## Thay đổi nhu cầu của Consumer

Chỉnh sửa:

```text
agent-plugins.yaml
```

Sau đó resolve và cập nhật:

```text
agent-plugins.lock
```

---

# 94. Những gì không bao giờ được là Source of Truth

Những thứ sau không bao giờ nên sở hữu độc lập dữ liệu ngữ nghĩa canonical:

```text
generated/

search indexes

runtime-generated manifests

Claude marketplace output

cache directories

CLI output

temporary update reports

terminal selections

uncommitted actual runtime state
```

---

# 95. Documentation được generate

Nếu trong tương lai reference documentation được generate từ schema/catalog metadata, documentation được generate đó không phải là authoritative cho dữ liệu nền tảng.

Ví dụ:

```text
Generated Capability Reference
```

nên đến từ:

```text
catalog/capabilities/
```

Con người nên chỉnh sửa source của Capability, sau đó generate lại documentation.

---

# 96. Quy tắc dữ liệu trùng lặp

Trùng lặp là chấp nhận được khi:

```text
one copy is authoritative

other copies are generated or locked representations

generation path is explicit
```

Trùng lặp là có vấn đề khi:

```text
multiple copies are manually editable
```

và không có owner rõ ràng.

---

# 97. Quy tắc Denormalization

Dữ liệu được generate có thể chủ đích denormalize dữ liệu canonical cho:

```text
performance
search
runtime compatibility
human convenience
```

Ví dụ:

```text
search-index.json
```

có thể lặp lại:

```text
Capability ID
Preset names
Publisher names
```

Sự trùng lặp này là chấp nhận được vì nó là dữ liệu được suy ra.

---

# 98. Source of Truth của Provenance

Provenance của upstream được tổng hợp từ:

```text
canonical Publisher/Package identity
+
discovered upstream facts
+
distribution lock
```

Lockfile lưu trữ provenance cụ thể cần thiết cho việc tái tạo.

Không một generated index đơn lẻ nào được tự định nghĩa lại provenance một cách độc lập.

---

# 99. Source of Truth của Integrity

Khi có integrity metadata:

```text
checksum
commit SHA
signature
```

giá trị bất biến được chọn thuộc về lock state.

Discovery có thể quan sát integrity.

Lock ghi lại integrity cụ thể đã được chấp nhận để phục vụ tái tạo.

---

# 100. Quyền sở hữu Security Metadata

Security metadata có thể bắt nguồn từ:

```text
discovery

curation

policy
```

Chúng đóng các vai trò khác nhau.

Ví dụ:

```text
Component type = hook
→ discovered fact

Risk annotation = executable
→ normalized/curated metadata

External hooks denied
→ Policy
```

Không gộp chúng thành một giá trị boolean duy nhất như:

```text
safe: true
```

---

# 101. Trust và Provenance

Provenance trả lời:

```text
Where did this come from?
```

Trust trả lời:

```text
How is this source treated?
```

Provenance nên mang tính sự thật khách quan.

Trust mang tính ngữ cảnh và phụ thuộc vào policy.

Không cái nào được ghi đè cái còn lại.

---

# 102. Validation Source-of-Truth

Validation của repository nên kiểm tra:

```text
no duplicate canonical IDs

all references resolve

all generated files are reproducible

generated files are not required as unique input

lockfiles conform to schemas

Capability mappings reference valid Components

Preset/Role references are valid
```

---

# 103. Thực thi trong CI

CI cuối cùng nên bao gồm:

```text
validate schemas

validate catalog

validate graph

generate derived artifacts

git diff --exit-code
```

Điều này bảo đảm:

```text
canonical source
=
committed derived state
```

---

# 104. Checklist review Source-of-Truth

Khi thêm một file hoặc field mới, hãy hỏi:

```text
1. Is this authoritative or derived?

2. Who owns it?

3. Can it be generated?

4. Is this information already authoritative somewhere else?

5. What happens if the two copies disagree?

6. Can this file be safely deleted and recreated?

7. Does this represent intent, curation, resolution, or runtime state?

8. Should a human edit it directly?

9. Should it be committed?

10. Which process updates it?
```

Nếu các câu hỏi này không có câu trả lời rõ ràng, quyền sở hữu dữ liệu vẫn chưa được thiết kế tốt.

---

# 105. Bảng quyết định

| Câu hỏi | Vị trí canonical |
|---|---|
| Publisher này là ai? | `catalog/publishers/` |
| Package nào tồn tại? | `catalog/packages/` |
| Capability này có nghĩa là gì? | `catalog/capabilities/` |
| Component nào implement nó? | Mapping trong `catalog/capabilities/` |
| Những component nào tồn tại ở upstream? | Component inventory đã discover/được generate |
| Phiên bản upstream nào được curate? | `catalog.lock` |
| Những capability nào thuộc về cùng nhau? | `presets/` |
| Role này sử dụng những gì? | `roles/` |
| Những gì được cho phép? | `policies/` |
| Source first-party nằm ở đâu? | `plugins/native/` |
| Project này muốn gì? | `agent-plugins.yaml` |
| Chính xác cái gì đã được resolve? | `agent-plugins.lock` |
| Hiện tại những gì tồn tại trong runtime? | Actual State của target |
| `agent-plugins` sở hữu những gì trong runtime? | Managed State metadata |
| Claude nên nhận được gì? | Output của target adapter |
| Những gì có thể được tìm kiếm hiệu quả? | Search index được generate |
| Vì sao implementation X được chọn? | Resolution decision |

---

# 106. Các bất biến Source-of-Truth

Dự án phải bảo toàn các bất biến (invariant) sau:

```text
1. Each semantic fact has one authoritative owner.

2. Generated files never contain unique irreplaceable information.

3. Discovery does not automatically become curation.

4. Curation does not automatically become project selection.

5. Project intent lives in the Project Manifest.

6. Concrete project resolution lives in the Project Lockfile.

7. Distribution version selection lives in the Distribution Lock.

8. Capability semantics live in the Capability Catalog.

9. Publisher/package source identity remains separate from capability meaning.

10. Target-specific artifacts are derived from resolved state.

11. Runtime state does not silently redefine project intent.

12. Managed runtime state is distinct from unmanaged runtime state.

13. Lockfiles are resolver-owned and should not be hand-maintained.

14. Source adapters observe upstream; they do not decide semantic mappings.

15. Target adapters materialize decisions; they do not make semantic selections.

16. CLI output is never a source of truth.

17. Caches are disposable.

18. Generated indexes are disposable.

19. Upstream latest versions never automatically replace locked versions.

20. Documentation should point to canonical definitions rather than create competing ones.
```

---

# 107. Mô hình Source-of-Truth tối giản

Mô hình cốt lõi có thể được rút gọn thành:

```text
Curated Intent
│
├── catalog/
├── presets/
├── roles/
├── policies/
└── plugins/native/
        │
        ▼
     Resolver
        │
        ▼
   Project Lock
        │
        ▼
  Target Adapter
        │
        ▼
 Managed Runtime
```

Các publisher bên ngoài đi vào thông qua:

```text
Upstream
   ↓
Discovery
   ↓
Curation
```

---

# 108. Source-of-Truth trong một câu

> **`agent-plugins` giữ cho intent và curation do con người duy trì là authoritative, xem discovery và các generated artifact là dữ liệu được suy ra, sử dụng lockfile để cố định resolution cụ thể, và xem runtime state là output đã được materialize thay vì là sự thật ngữ nghĩa.**