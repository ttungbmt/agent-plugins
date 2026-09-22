# Yêu cầu

## Tổng quan

Tài liệu này định nghĩa các yêu cầu chức năng và phi chức năng cho `agent-plugins`.

Các yêu cầu được rút ra từ:

- các vấn đề được xác định trong `problem.md`,
- trạng thái tương lai mong muốn được mô tả trong `vision.md`,
- các mục tiêu được định nghĩa trong `goals.md`,
- các ranh giới phạm vi được định nghĩa trong `non-goals.md`.

Mục đích của tài liệu này là định nghĩa **hệ thống phải hỗ trợ những gì** trước khi quyết định **hệ thống sẽ implement điều đó như thế nào**.

---

# 1. Quy ước yêu cầu

Mỗi yêu cầu có một định danh ổn định.

Định dạng:

```text
REQ-<DOMAIN>-<NUMBER>
```

Ví dụ:

```text
REQ-CAP-001
REQ-RES-003
REQ-CLI-002
```

Các từ khóa yêu cầu tuân theo quy ước sau:

```text
MUST
Required for the specified scope.

SHOULD
Strongly recommended but may be deferred with justification.

MAY
Optional capability.
```

---

# 2. Mức ưu tiên của yêu cầu

Các yêu cầu được nhóm thành ba mức ưu tiên.

## P0 — Cốt lõi

Bắt buộc để kiểm chứng product model nền tảng.

## P1 — Quan trọng

Bắt buộc để có một V1 thực tế và đáng tin cậy.

## P2 — Tương lai

Được kiến trúc hỗ trợ nhưng không nhất thiết được implement trong V1.

---

# 3. Yêu cầu về core domain

## REQ-DOM-001 — Mô hình Publisher

**Mức ưu tiên:** P0

Hệ thống MUST biểu diễn Publisher như một nguồn agent tooling bên ngoài hoặc first-party.

Một Publisher MUST có:

```text
stable ID
display name
source metadata
ownership classification
trust metadata
```

Ví dụ:

```text
superpowers
mattpocock
ecc
anthropic
wshobson
agent-plugins
```

---

## REQ-DOM-002 — Mô hình Package

**Mức ưu tiên:** P0

Hệ thống MUST biểu diễn Package như một đơn vị có thể cài đặt hoặc phân phối được cung cấp bởi một Publisher.

Một Package MUST tham chiếu đúng một Publisher.

Một Package SHOULD bao gồm:

```text
source location
version information
target compatibility
update strategy
```

---

## REQ-DOM-003 — Mô hình Component

**Mức ưu tiên:** P0

Hệ thống MUST biểu diễn các component nằm trong package.

Các loại component ban đầu SHOULD hỗ trợ:

```text
skill
agent
command
hook
rule
mcp
lsp
workflow
```

Domain model MUST cho phép bổ sung thêm các loại component khác sau này.

---

## REQ-DOM-004 — Mô hình Capability

**Mức ưu tiên:** P0

Hệ thống MUST biểu diễn capability độc lập với publisher và package.

Một Capability MUST có:

```text
stable capability ID
semantic meaning
cardinality
one or more possible implementations
```

Ví dụ:

```text
engineering.testing.tdd
```

---

## REQ-DOM-005 — Capability ID ổn định

**Mức ưu tiên:** P0

Capability ID MUST luôn độc lập với tên publisher.

Hợp lệ:

```text
engineering.testing.tdd
```

Không hợp lệ khi dùng làm canonical capability ID:

```text
superpowers.tdd
```

---

## REQ-DOM-006 — Capability Namespace

**Mức ưu tiên:** P0

Capability MUST sử dụng namespace phân cấp.

Ví dụ:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
security.review
knowledge.research
product.discovery
```

Định dạng namespace MUST deterministic và được tài liệu hóa.

---

# 4. Yêu cầu về capability implementation

## REQ-CAP-001 — Nhiều implementation

**Mức ưu tiên:** P0

Một capability MUST có khả năng tham chiếu nhiều candidate implementation.

Ví dụ:

```text
engineering.testing.tdd

→ superpowers/test-driven-development
→ mattpocock/tdd
→ ecc/tdd-workflow
```

---

## REQ-CAP-002 — Capability Cardinality

**Mức ưu tiên:** P0

Capability MUST hỗ trợ tối thiểu:

```text
one
many
```

`one` nghĩa là thông thường chỉ một implementation được chọn.

`many` nghĩa là nhiều implementation tương thích có thể cùng tồn tại.

---

## REQ-CAP-003 — Implementation Priority

**Mức ưu tiên:** P0

Các candidate implementation MUST hỗ trợ resolution priority tường minh.

Ví dụ:

```text
Superpowers     100
Matt Pocock      80
ECC              70
```

Chỉ riêng priority SHOULD NOT vượt qua các ràng buộc về policy hoặc compatibility.

---

## REQ-CAP-004 — Capability Metadata

**Mức ưu tiên:** P1

Capability SHOULD hỗ trợ metadata như:

```text
description
category
tags
stability
documentation references
```

---

## REQ-CAP-005 — Capability Alias

**Mức ưu tiên:** P2

Hệ thống MAY hỗ trợ alias cho các tên thay thế phổ biến.

Ví dụ:

```text
tdd
test-driven-development

→ engineering.testing.tdd
```

Alias MUST NOT tạo ra nhiều canonical capability identity.

---

# 5. Yêu cầu về Preset

## REQ-PRE-001 — Mô hình Preset

**Mức ưu tiên:** P0

Hệ thống MUST hỗ trợ các Preset có thể tái sử dụng.

Một Preset MUST có khả năng tham chiếu:

```text
capabilities
other presets
```

---

## REQ-PRE-002 — Preset hướng capability

**Mức ưu tiên:** P0

Preset SHOULD tham chiếu capability thay vì các component gắn với publisher cụ thể.

Nên dùng:

```yaml
capabilities:
  - engineering.testing.tdd
  - engineering.debugging
```

Tránh:

```yaml
plugins:
  - superpowers
  - ecc
```

---

## REQ-PRE-003 — Preset Composition

**Mức ưu tiên:** P0

Preset MUST có thể compose được.

Ví dụ:

```text
engineering/core
+
engineering/security
+
stacks/typescript
```

---

## REQ-PRE-004 — Phát hiện cycle trong Preset

**Mức ưu tiên:** P0

Preset dependency graph MUST không có chu trình (acyclic).

Hệ thống MUST từ chối:

```text
Preset A
→ Preset B
→ Preset C
→ Preset A
```

---

## REQ-PRE-005 — Sử dụng preset tùy chọn

**Mức ưu tiên:** P1

Người dùng SHOULD có thể thêm hoặc bớt preset khỏi một project mà không cần định nghĩa lại role.

---

# 6. Yêu cầu về Role

## REQ-PRO-001 — Mô hình Role

**Mức ưu tiên:** P0

Hệ thống MUST hỗ trợ các Role baseline tái sử dụng.

Các role đại diện ban đầu SHOULD bao gồm:

```text
frontend-engineer
backend-engineer
fullstack-engineer
platform-engineer
product-manager
researcher
second-brain
```

---

## REQ-PRO-002 — Role compose Preset

**Mức ưu tiên:** P0

Role MUST chủ yếu compose các Preset.

Role SHOULD NOT phụ thuộc trực tiếp vào implementation của Publisher.

---

## REQ-PRO-003 — Composition thay vì Inheritance

**Mức ưu tiên:** P0

Role composition SHOULD được ưu tiên hơn role inheritance.

Nếu inheritance được hỗ trợ, nó SHOULD luôn nông.

---

## REQ-PRO-004 — Khả năng tái sử dụng Role

**Mức ưu tiên:** P0

Một Role MUST có thể tái sử dụng trên nhiều project.

Technology stack riêng của project MUST NOT đòi hỏi phải định nghĩa lại Role.

---

# 7. Yêu cầu về Project

## REQ-PRJ-001 — Project Manifest

**Mức ưu tiên:** P0

Một consumer project MUST có khả năng định nghĩa agent environment mong muốn thông qua một project manifest dạng khai báo.

Tên file được khuyến nghị:

```text
agent-plugins.yaml
```

---

## REQ-PRJ-002 — Chọn Role cho Project

**Mức ưu tiên:** P0

Một project MUST có khả năng chọn một Role.

Ví dụ:

```yaml
role: frontend-engineer
```

---

## REQ-PRJ-003 — Preset của Project

**Mức ưu tiên:** P0

Một project MUST có khả năng thêm các Preset riêng của project.

Ví dụ:

```yaml
presets:
  - stacks/nextjs
  - stacks/cloudflare
```

---

## REQ-PRJ-004 — Policy của Project

**Mức ưu tiên:** P1

Một project SHOULD có khả năng chọn một Policy.

Ví dụ:

```yaml
policy: default
```

---

## REQ-PRJ-005 — Target của Project

**Mức ưu tiên:** P0

Một project MUST khai báo một hoặc nhiều target runtime khi cần.

Ví dụ:

```yaml
targets:
  - claude-code
```

---

## REQ-PRJ-006 — Capability Override

**Mức ưu tiên:** P1

Project SHOULD có khả năng bật hoặc tắt capability một cách tường minh.

Ví dụ:

```yaml
overrides:
  capabilities:
    enable:
      - security.review

    disable:
      - devops.kubernetes
```

---

# 8. Yêu cầu về Policy

## REQ-POL-001 — Mô hình Policy

**Mức ưu tiên:** P0

Hệ thống MUST hỗ trợ Policy như một khái niệm cấu hình hạng nhất.

Policy chi phối resolution và các hành vi nhạy cảm về bảo mật.

---

## REQ-POL-002 — Source Trust

**Mức ưu tiên:** P0

Policy MUST có khả năng giới hạn các source trust level được phép.

Các trust level ban đầu SHOULD hỗ trợ:

```text
first-party
official
curated
community
untrusted
```

---

## REQ-POL-003 — Executable Component

**Mức ưu tiên:** P0

Policy MUST có khả năng kiểm soát các loại component nhạy cảm về bảo mật như:

```text
hooks
commands
scripts
MCP servers
```

---

## REQ-POL-004 — Kết quả của Policy

**Mức ưu tiên:** P0

Policy evaluation SHOULD hỗ trợ các kết quả tương đương với:

```text
allow
deny
prompt
review
```

ở những nơi phù hợp.

---

## REQ-POL-005 — Experimental Component

**Mức ưu tiên:** P1

Policy SHOULD có khả năng cho phép hoặc từ chối các publisher hoặc component thử nghiệm.

---

## REQ-POL-006 — Publisher Preference

**Mức ưu tiên:** P1

Policy SHOULD hỗ trợ ưu tiên publisher hoặc trust class trong quá trình resolution.

---

# 9. Yêu cầu về Resolution

## REQ-RES-001 — Deterministic Resolution

**Mức ưu tiên:** P0

Với cùng:

```text
catalog
project manifest
role
presets
policy
version constraints
```

resolver MUST tạo ra cùng một kết quả.

---

## REQ-RES-002 — Resolution Pipeline

**Mức ưu tiên:** P0

Về mặt khái niệm, resolver MUST xử lý:

```text
Project
↓
Role
↓
Presets
↓
Capabilities
↓
Candidate implementations
↓
Policy filtering
↓
Conflict resolution
↓
Package resolution
↓
Target compatibility
↓
Lockfile
```

---

## REQ-RES-003 — Exclusive Capability Resolution

**Mức ưu tiên:** P0

Với các capability có:

```text
cardinality: one
```

resolver MUST chọn không quá một implementation active trừ khi được override một cách tường minh.

---

## REQ-RES-004 — Additive Capability Resolution

**Mức ưu tiên:** P0

Với các capability có:

```text
cardinality: many
```

resolver MUST hỗ trợ nhiều implementation tương thích.

---

## REQ-RES-005 — Policy trước Selection

**Mức ưu tiên:** P0

Các candidate bị policy từ chối MUST NOT được chọn ngay cả khi chúng có priority cao hơn.

---

## REQ-RES-006 — Target Compatibility

**Mức ưu tiên:** P0

Resolver MUST loại trừ các implementation không tương thích với target runtime đã chọn.

---

## REQ-RES-007 — Resolution thất bại

**Mức ưu tiên:** P0

Nếu không còn implementation hợp lệ nào cho một capability bắt buộc, resolution MUST fail kèm một chẩn đoán có thể hành động được.

---

## REQ-RES-008 — Resolution mơ hồ

**Mức ưu tiên:** P0

Nếu resolution vẫn còn mơ hồ sau khi đã áp dụng tất cả các quy tắc deterministic, hệ thống MUST fail hoặc yêu cầu một override tường minh.

Nó MUST NOT âm thầm đoán.

---

## REQ-RES-009 — Minimal Resolution

**Mức ưu tiên:** P1

Resolver SHOULD tránh chọn các component không đáp ứng một capability đang active hoặc một dependency bắt buộc.

---

## REQ-RES-010 — Tính idempotent

**Mức ưu tiên:** P0

Resolution lặp lại trên input không thay đổi MUST tạo ra output tương đương.

---

# 10. Yêu cầu về khả năng giải thích

## REQ-EXP-001 — Resolution Trace

**Mức ưu tiên:** P0

Mọi capability implementation được chọn MUST có thể truy vết qua:

```text
Project
→ Role
→ Preset
→ Capability
→ Implementation
→ Package
→ Publisher
```

---

## REQ-EXP-002 — Giải thích capability

**Mức ưu tiên:** P1

Người dùng SHOULD có thể yêu cầu giải thích cho một capability đã được resolve.

Ví dụ:

```bash
ap explain engineering.testing.tdd
```

---

## REQ-EXP-003 — Hiển thị candidate

**Mức ưu tiên:** P1

Output giải thích SHOULD hiển thị:

```text
all candidates
filtered candidates
selected implementation
suppressed implementations
selection reason
```

---

## REQ-EXP-004 — Đường dẫn lỗi

**Mức ưu tiên:** P0

Lỗi resolution MUST bao gồm dependency path gây ra lỗi ở những nơi khả thi.

Ví dụ:

```text
backend-engineer
→ engineering/security
→ security.review
→ no allowed implementation
```

---

# 11. Yêu cầu về Catalog

## REQ-CAT-001 — Catalog Publisher Registry

**Mức ưu tiên:** P0

Catalog MUST đăng ký các Publisher được hỗ trợ.

---

## REQ-CAT-002 — Catalog Package Registry

**Mức ưu tiên:** P0

Catalog MUST đăng ký các Package được hỗ trợ.

---

## REQ-CAT-003 — Catalog Capability Registry

**Mức ưu tiên:** P0

Catalog MUST định nghĩa các canonical capability và implementation mapping của chúng.

---

## REQ-CAT-004 — Catalog Validation

**Mức ưu tiên:** P0

Catalog MUST được validate trước khi resolution.

Validation MUST phát hiện tối thiểu:

```text
unknown publishers
unknown packages
invalid implementation references
duplicate IDs
invalid capability references
```

---

## REQ-CAT-005 — Curated Catalog

**Mức ưu tiên:** P0

Việc hỗ trợ một publisher MUST NOT ngụ ý tự động bao gồm mọi upstream component.

Catalog curation MAY chỉ chọn một tập con của các component đã được khám phá.

---

# 12. Yêu cầu về Source Adapter

## REQ-SRC-001 — Source Adapter Abstraction

**Mức ưu tiên:** P0

Hệ thống MUST định nghĩa một abstraction để khám phá metadata của external package và component.

---

## REQ-SRC-002 — Discovery riêng theo publisher

**Mức ưu tiên:** P1

Các adapter riêng cho từng publisher SHOULD được hỗ trợ ở những nơi generic discovery không đủ.

Ví dụ:

```text
Superpowers
ECC
Claude marketplace
```

---

## REQ-SRC-003 — Output chuẩn hóa

**Mức ưu tiên:** P0

Source adapter MUST chuẩn hóa dữ liệu upstream vào internal domain model.

---

## REQ-SRC-004 — Discovery không chuyển giao quyền sở hữu

**Mức ưu tiên:** P0

Việc khám phá một external component MUST NOT ngụ ý rằng project sở hữu hoặc vendor component đó.

---

# 13. Yêu cầu về Target Adapter

## REQ-TGT-001 — Target Adapter Abstraction

**Mức ưu tiên:** P0

Hệ thống MUST định nghĩa một target adapter abstraction để materialize resolved state thành các artifact riêng của runtime.

---

## REQ-TGT-002 — Target Claude Code

**Mức ưu tiên:** P0

V1 MUST hỗ trợ Claude Code làm target runtime ban đầu.

---

## REQ-TGT-003 — Target Validation

**Mức ưu tiên:** P0

Một target adapter MUST validate xem các component đã resolve có thể được biểu diễn trên runtime đó hay không.

---

## REQ-TGT-004 — Native Output

**Mức ưu tiên:** P1

Target adapter SHOULD bảo toàn các chức năng native của runtime ở những nơi khả thi.

---

## REQ-TGT-005 — Capability không được hỗ trợ

**Mức ưu tiên:** P0

Nếu một capability không thể được biểu diễn trên một target, hệ thống MUST báo cáo điều đó một cách tường minh.

Hệ thống MUST NOT âm thầm tuyên bố hỗ trợ đầy đủ.

---

# 14. Yêu cầu về Lockfile

## REQ-LOCK-001 — Project Lockfile

**Mức ưu tiên:** P0

Resolution MUST có thể được biểu diễn trong một project lockfile.

Tên file được khuyến nghị:

```text
agent-plugins.lock
```

---

## REQ-LOCK-002 — Metadata có thể tái tạo

**Mức ưu tiên:** P0

Project lockfile MUST ghi lại đủ metadata để tái tạo resolved state.

Tối thiểu:

```text
publisher
package
component
capability
version or immutable reference
target information
```

---

## REQ-LOCK-003 — Immutable Upstream Reference

**Mức ưu tiên:** P1

Ở những nơi được hỗ trợ, external package SHOULD được pin bằng các immutable reference như:

```text
commit SHA
checksum
integrity hash
```

---

## REQ-LOCK-004 — Distribution Lock

**Mức ưu tiên:** P1

Distribution repository SHOULD duy trì một catalog/distribution lock riêng cho các upstream version đã được kiểm thử.

---

## REQ-LOCK-005 — Phát hiện Lockfile Drift

**Mức ưu tiên:** P1

CLI SHOULD phát hiện khi project manifest và project lockfile không còn biểu diễn cùng một desired state.

---

# 15. Yêu cầu về Update

## REQ-UPD-001 — Update tường minh

**Mức ưu tiên:** P0

Các update từ upstream MUST NOT âm thầm thay đổi project state trong quá trình đồng bộ thông thường.

---

## REQ-UPD-002 — Update Check

**Mức ưu tiên:** P1

CLI SHOULD hỗ trợ kiểm tra thay đổi từ upstream mà không áp dụng chúng.

Ví dụ:

```bash
ap update --check
```

---

## REQ-UPD-003 — Tóm tắt thay đổi

**Mức ưu tiên:** P1

Một update check SHOULD báo cáo:

```text
version changes
added components
removed components
changed components
affected capabilities
```

---

## REQ-UPD-004 — Thay đổi nhạy cảm về bảo mật

**Mức ưu tiên:** P1

Phân tích update SHOULD xác định các thay đổi liên quan đến:

```text
hooks
commands
scripts
MCP servers
```

ở những nơi có sẵn metadata.

---

## REQ-UPD-005 — Áp dụng có kiểm soát

**Mức ưu tiên:** P1

Việc áp dụng một update SHOULD cập nhật một cách tường minh distribution lock state hoặc project lock state liên quan.

---

# 16. Yêu cầu về Provenance

## REQ-PRV-001 — Publisher Provenance

**Mức ưu tiên:** P0

Mọi external package MUST giữ lại danh tính upstream Publisher của nó.

---

## REQ-PRV-002 — Source Provenance

**Mức ưu tiên:** P0

External package SHOULD giữ lại:

```text
repository
version
commit
source location
```

ở những nơi có sẵn.

---

## REQ-PRV-003 — Phân loại quyền sở hữu

**Mức ưu tiên:** P0

Component MUST có thể được phân biệt theo phân loại quyền sở hữu.

Tối thiểu:

```text
first-party
third-party
```

---

## REQ-PRV-004 — Derived Component

**Mức ưu tiên:** P2

Các first-party component được dẫn xuất từ công việc bên ngoài MAY ghi lại provenance `derivedFrom`.

---

# 17. Yêu cầu về Native Plugin

## REQ-NAT-001 — Hỗ trợ Native Plugin

**Mức ưu tiên:** P0

Repository MUST hỗ trợ các package first-party/native.

Vị trí được khuyến nghị:

```text
plugins/native/
```

---

## REQ-NAT-002 — Resolution hợp nhất

**Mức ưu tiên:** P0

Native implementation MUST tham gia vào cùng quy trình capability resolution như external implementation.

---

## REQ-NAT-003 — Không yêu cầu sao chép external

**Mức ưu tiên:** P0

External package MUST NOT cần phải được sao chép vào `plugins/native/` để tham gia vào hệ thống.

---

# 18. Yêu cầu về CLI

## REQ-CLI-001 — CLI Entry Point

**Mức ưu tiên:** P0

Project MUST cung cấp một command-line interface.

Executable được khuyến nghị:

```text
ap
```

---

## REQ-CLI-002 — Khởi tạo

**Mức ưu tiên:** P0

CLI MUST hỗ trợ:

```bash
ap init
```

để tạo một project manifest ban đầu.

---

## REQ-CLI-003 — Đồng bộ

**Mức ưu tiên:** P0

CLI MUST hỗ trợ:

```bash
ap sync
```

như thao tác reconciliation desired-state chính.

---

## REQ-CLI-004 — List

**Mức ưu tiên:** P1

CLI SHOULD hỗ trợ liệt kê các domain entity liên quan.

---

## REQ-CLI-005 — Search

**Mức ưu tiên:** P1

CLI SHOULD hỗ trợ tìm kiếm trên:

```text
capabilities
presets
roles
publishers
packages
components
```

---

## REQ-CLI-006 — Explain

**Mức ưu tiên:** P1

CLI SHOULD hỗ trợ giải thích resolution.

---

## REQ-CLI-007 — Diff

**Mức ưu tiên:** P1

CLI SHOULD hỗ trợ hiển thị desired state so với actual state.

---

## REQ-CLI-008 — Doctor

**Mức ưu tiên:** P1

CLI SHOULD hỗ trợ chẩn đoán các vấn đề về cấu hình và environment.

---

## REQ-CLI-009 — Update Check

**Mức ưu tiên:** P1

CLI SHOULD hỗ trợ kiểm tra update từ upstream.

---

## REQ-CLI-010 — Hoạt động không tương tác

**Mức ưu tiên:** P0

Các command cốt lõi như:

```text
sync
validate
resolve
```

MUST hỗ trợ thực thi không tương tác, phù hợp cho CI.

---

# 19. Yêu cầu về đồng bộ

## REQ-SYNC-001 — Desired State

**Mức ưu tiên:** P0

Project manifest MUST biểu diễn desired state.

---

## REQ-SYNC-002 — Reconciliation

**Mức ưu tiên:** P0

`ap sync` MUST reconcile state do runtime quản lý với resolved desired state.

---

## REQ-SYNC-003 — Idempotent Sync

**Mức ưu tiên:** P0

Chạy `ap sync` nhiều lần với input không thay đổi MUST hội tụ về cùng một state.

---

## REQ-SYNC-004 — Ranh giới Managed State

**Mức ưu tiên:** P1

Hệ thống SHOULD phân biệt giữa state do `agent-plugins` quản lý và state do người dùng quản lý thủ công.

---

## REQ-SYNC-005 — Không upgrade upstream ngầm định

**Mức ưu tiên:** P0

`ap sync` MUST NOT ngầm upgrade version của external publisher trừ khi được cấu hình tường minh để làm vậy.

---

# 20. Yêu cầu về Validation

## REQ-VAL-001 — Schema Validation

**Mức ưu tiên:** P0

Tất cả các loại authoritative manifest MUST có schema máy đọc được hoặc runtime validation tương đương.

---

## REQ-VAL-002 — Reference Validation

**Mức ưu tiên:** P0

Hệ thống MUST validate các tham chiếu giữa:

```text
publishers
packages
components
capabilities
presets
roles
policies
```

---

## REQ-VAL-003 — Cycle Detection

**Mức ưu tiên:** P0

Hệ thống MUST phát hiện cycle trong các compositional dependency graph.

---

## REQ-VAL-004 — Phát hiện ID trùng lặp

**Mức ưu tiên:** P0

Canonical ID trùng lặp MUST khiến validation fail.

---

## REQ-VAL-005 — Lỗi có thể hành động được

**Mức ưu tiên:** P0

Lỗi validation MUST xác định:

```text
what failed
where it failed
why it failed
```

---

# 21. Yêu cầu về bảo mật

## REQ-SEC-001 — Phân loại component nhạy cảm về bảo mật

**Mức ưu tiên:** P0

Hệ thống MUST phân biệt các component có thể thực thi code hoặc tương tác với hệ thống bên ngoài.

Ví dụ:

```text
hooks
scripts
commands
MCP servers
```

---

## REQ-SEC-002 — Policy evaluation trước khi thực thi

**Mức ưu tiên:** P0

Các external component nhạy cảm về bảo mật MUST được đánh giá theo policy trước khi kích hoạt.

---

## REQ-SEC-003 — Không tự động trust

**Mức ưu tiên:** P0

Mức độ phổ biến, số star của repository hoặc việc được công khai MUST NOT tự động cấp trạng thái trusted.

---

## REQ-SEC-004 — Provenance hiển thị rõ ràng

**Mức ưu tiên:** P0

Người dùng MUST có thể xác định nguồn gốc của các component nhạy cảm về bảo mật.

---

## REQ-SEC-005 — Không đảm bảo sandbox

**Mức ưu tiên:** P0

Hệ thống MUST NOT tuyên bố cung cấp một execution sandbox hoàn chỉnh trừ khi sandbox đó thực sự được implement.

---

# 22. Yêu cầu về Generated Artifact

## REQ-GEN-001 — Tách biệt Generated State

**Mức ưu tiên:** P0

Các artifact được generate MUST có thể phân biệt được với dữ liệu nguồn authoritative.

---

## REQ-GEN-002 — Khả năng generate lại

**Mức ưu tiên:** P0

Các artifact được generate MUST có thể được tạo lại từ các input authoritative.

---

## REQ-GEN-003 — Không có metadata duy nhất trong file generate

**Mức ưu tiên:** P0

Các file được generate MUST NOT chứa thông tin cấu hình duy nhất mà không thể tái tạo từ các nguồn authoritative.

---

## REQ-GEN-004 — Phát hiện Drift

**Mức ưu tiên:** P1

CI SHOULD kiểm tra rằng các generated artifact đã commit là cập nhật mới nhất.

---

# 23. Yêu cầu về Source-of-Truth

## REQ-SOT-001 — Canonical Metadata

**Mức ưu tiên:** P0

Project MUST định nghĩa những file nào là authoritative.

---

## REQ-SOT-002 — Runtime Manifest là dẫn xuất

**Mức ưu tiên:** P0

Các artifact marketplace hoặc cấu hình riêng của runtime SHOULD được generate từ canonical data ở những nơi khả thi.

---

## REQ-SOT-003 — Không trùng lặp thẩm quyền

**Mức ưu tiên:** P0

Cùng một semantic metadata MUST NOT được duy trì thủ công ở nhiều vị trí authoritative.

---

# 24. Yêu cầu phi chức năng

## REQ-NFR-001 — Tính deterministic

**Mức ưu tiên:** P0

Core resolution MUST deterministic.

---

## REQ-NFR-002 — Core Resolution offline

**Mức ưu tiên:** P1

Resolution SHOULD hoạt động mà không cần LLM hoặc hosted control plane khi tất cả dữ liệu catalog cần thiết đã có sẵn cục bộ.

---

## REQ-NFR-003 — Khả năng kiểm thử

**Mức ưu tiên:** P0

Core resolution logic MUST có thể được kiểm thử độc lập với CLI và việc cài đặt target runtime.

---

## REQ-NFR-004 — Tính module

**Mức ưu tiên:** P0

Core domain logic MUST luôn được tách biệt khỏi:

```text
CLI presentation
source-specific discovery
target-specific rendering
```

---

## REQ-NFR-005 — Khả năng mở rộng

**Mức ưu tiên:** P1

Kiến trúc SHOULD cho phép bổ sung mới:

```text
publishers
component types
capability domains
targets
policies
```

mà không cần thiết kế lại các core concept không liên quan.

---

## REQ-NFR-006 — Dễ đọc với con người

**Mức ưu tiên:** P1

Các file cấu hình chính SHOULD luôn dễ hiểu và con người có thể chỉnh sửa được.

---

## REQ-NFR-007 — Validation bằng máy

**Mức ưu tiên:** P0

Cấu hình dễ đọc với con người MUST đồng thời có thể được validate bằng máy.

---

## REQ-NFR-008 — Chẩn đoán rõ ràng

**Mức ưu tiên:** P0

Lỗi và conflict MUST cung cấp context hữu ích thay vì các thông báo lỗi chung chung.

---

## REQ-NFR-009 — Hiệu năng hợp lý

**Mức ưu tiên:** P1

Local resolution SHOULD luôn phản hồi nhanh với kích thước catalog dự kiến của V1 mà không cần hạ tầng phân tán.

---

## REQ-NFR-010 — Tiến hóa tương thích ngược

**Mức ưu tiên:** P1

Manifest schema SHOULD được version để hỗ trợ tiến hóa có kiểm soát.

API version ban đầu:

```text
agent-plugins.dev/v1alpha1
```

---

# 25. Yêu cầu về đa runtime

## REQ-MRT-001 — Core độc lập với runtime

**Mức ưu tiên:** P0

Core domain model MUST NOT phụ thuộc hoàn toàn vào các khái niệm của Claude Code.

---

## REQ-MRT-002 — Phạm vi target ban đầu

**Mức ưu tiên:** P0

V1 MAY chỉ implement Claude Code làm target đầu tiên.

---

## REQ-MRT-003 — Các target bổ sung

**Mức ưu tiên:** P2

Kiến trúc SHOULD hỗ trợ các adapter trong tương lai cho:

```text
Codex
Gemini
OpenCode
Hermes
```

---

## REQ-MRT-004 — Không đảm bảo tương đương

**Mức ưu tiên:** P1

Hệ thống MUST có khả năng báo cáo sự khác biệt về mức hỗ trợ capability giữa các target runtime.

---

# 26. Yêu cầu về team và tổ chức

## REQ-TEAM-001 — Policy dùng chung

**Mức ưu tiên:** P2

Kiến trúc SHOULD cho phép các shared policy có thể tái sử dụng trên nhiều project.

---

## REQ-TEAM-002 — Preset dùng chung

**Mức ưu tiên:** P1

Preset SHOULD có thể tái sử dụng trên nhiều project và team.

---

## REQ-TEAM-003 — Hoạt động cục bộ

**Mức ưu tiên:** P0

Các tính năng team MUST NOT là bắt buộc đối với việc sử dụng cục bộ của cá nhân.

---

# 27. Yêu cầu về tài liệu

## REQ-DOC-001 — Tài liệu chuẩn

**Mức ưu tiên:** P0

Các core concept MUST có tài liệu chuẩn (canonical documentation).

Tối thiểu:

```text
Publisher
Package
Component
Capability
Preset
Role
Policy
Project
Resolver
Lockfile
```

---

## REQ-DOC-002 — Quyết định kiến trúc

**Mức ưu tiên:** P1

Các quyết định kiến trúc quan trọng SHOULD được ghi lại dưới dạng ADR.

---

## REQ-DOC-003 — Cấu hình mẫu

**Mức ưu tiên:** P1

Tài liệu SHOULD chứa các ví dụ thực tế cho tối thiểu:

```text
Frontend Engineer
Backend Engineer
Product Manager
Second Brain
```

---

# 28. Yêu cầu về kiểm thử

## REQ-TST-001 — Schema Test

**Mức ưu tiên:** P0

Tất cả manifest schema MUST có test tự động.

---

## REQ-TST-002 — Resolver Test

**Mức ưu tiên:** P0

Resolver MUST có test tự động cho:

```text
exclusive capability resolution
additive capabilities
policy rejection
target incompatibility
ambiguous resolution
preset composition
cycle detection
```

---

## REQ-TST-003 — Reproducibility Test

**Mức ưu tiên:** P0

Test MUST kiểm chứng rằng các input giống hệt nhau tạo ra resolved output tương đương.

---

## REQ-TST-004 — Adapter Test

**Mức ưu tiên:** P0

Target adapter MUST có test kiểm chứng các artifact được generate.

---

## REQ-TST-005 — End-to-End Test

**Mức ưu tiên:** P1

V1 SHOULD bao gồm ít nhất một end-to-end test bao quát:

```text
project manifest
→ resolution
→ lockfile
→ Claude Code materialization
```

---

# 29. Luồng người dùng bắt buộc của V1

V1 MUST hỗ trợ workflow khái niệm sau:

```text
1. Initialize project

   ap init

2. Select or define:

   role
   presets
   target
   policy

3. Resolve environment

   ap sync

4. Produce:

   agent-plugins.lock

5. Materialize target configuration

6. Inspect:

   ap explain
   ap diff
   ap doctor
```

---

# 30. Phạm vi domain bắt buộc của V1

Các domain entity sau MUST được hỗ trợ trong V1:

```text
Publisher
Package
Component
Capability
Preset
Role
Policy
Project
Resolution
Lockfile
```

---

# 31. Hạ tầng bắt buộc của V1

V1 MUST bao gồm:

```text
schemas
catalog loader
catalog validation

dependency graph
resolver
conflict resolution
policy evaluation

project lockfile

source adapter abstraction
Claude Code target adapter

CLI foundation
```

---

# 32. Phạm vi publisher của V1

V1 SHOULD minh họa việc tích hợp với nhiều loại publisher.

Các publisher được khuyến nghị:

```text
Superpowers
Matt Pocock Skills
ECC
Anthropic
wshobson/agents
agent-plugins native
```

Việc ingest toàn bộ mọi component của publisher là KHÔNG bắt buộc.

---

# 33. Phạm vi role của V1

V1 SHOULD bao gồm tối thiểu:

```text
frontend-engineer
backend-engineer
product-manager
second-brain
```

Các role này nên kiểm chứng rằng composition model hoạt động trên những use case khác nhau đáng kể.

---

# 34. Tiêu chí hoàn thành V1

V1 không nên được coi là hoàn chỉnh về mặt chức năng cho đến khi tất cả những điều sau đều đúng:

```text
✓ project manifest validates

✓ publishers/packages/components can be represented

✓ capabilities can map to multiple implementations

✓ presets compose capabilities

✓ roles compose presets

✓ policy can reject candidates

✓ exclusive capability conflicts resolve deterministically

✓ unresolved capabilities fail clearly

✓ project lockfile is generated

✓ repeated resolution is stable

✓ Claude Code target can be materialized

✓ ap sync is idempotent

✓ ap explain can show resolution provenance

✓ automated resolver tests pass

✓ at least four representative roles resolve successfully
```

---

# 35. Các yêu cầu được hoãn lại

Những điều sau được hoãn lại có chủ đích sang sau V1:

```text
hosted registry

GUI

cloud control plane

organization accounts

RBAC

SSO

AI recommendation engine

automatic capability classification

advanced project auto-detection

overlay / patch engine

full source vendoring

runtime parity across all agent systems

public plugin ratings

usage telemetry

monetization infrastructure
```

Kiến trúc MAY chừa sẵn các extension point cho những capability này.

---

# 36. Truy vết yêu cầu

Về lâu dài, các yêu cầu nên có thể truy vết qua:

```text
Problem
   ↓
Goal
   ↓
Requirement
   ↓
Use Case
   ↓
Architecture / Specification
   ↓
Implementation
   ↓
Test
```

Ví dụ:

```text
Problem:
Capability duplication

↓

Goal:
Resolve overlap deterministically

↓

Requirement:
REQ-RES-003

↓

Use Case:
Frontend Engineer with multiple TDD publishers

↓

Test:
resolver selects one implementation
```

---

# 37. Quy tắc thay đổi yêu cầu

Một yêu cầu SHOULD chỉ được thay đổi khi ít nhất một trong những điều sau thay đổi:

```text
problem understanding
product goal
scope boundary
validated user need
architectural constraint
runtime capability
```

Chỉ riêng độ khó khi implement SHOULD NOT âm thầm định nghĩa lại các yêu cầu sản phẩm.

Nếu quá trình implement bộc lộ một design trade-off quan trọng, quyết định đó SHOULD được ghi lại một cách tường minh.

---

# 38. Tóm tắt yêu cầu

Các yêu cầu cốt lõi có thể được tóm tắt như sau:

```text
Declare intent
      ↓
Compose reusable roles and presets
      ↓
Normalize into capabilities
      ↓
Resolve implementations deterministically
      ↓
Apply policy and trust constraints
      ↓
Record provenance and versions
      ↓
Generate reproducible lock state
      ↓
Materialize native target configuration
      ↓
Explain every important decision
```

---

# 39. Yêu cầu trong một câu

> **`agent-plugins` phải cho phép người dùng khai báo các capability họ cần và chuyển đổi intent đó một cách deterministic thành một agent environment tối thiểu, tuân thủ policy, có thể giải thích và có thể tái tạo.**
