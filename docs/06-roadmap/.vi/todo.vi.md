# TODO

**Trạng thái:** Đang hoạt động  
**Cập nhật lần cuối:** 2026-09-21

Tệp này theo dõi các công việc implementation có thể thực hiện được cho project Agent Plugins.

Các quyết định về roadmap và kiến trúc được định nghĩa trong:

```text
docs/roadmap.md
docs/architecture.md
docs/specs/
```

Tệp này trả lời câu hỏi:

> Nên implement điều gì tiếp theo?

---

# 1. Chú giải mức ưu tiên

```text
P0  Blocking / foundation
P1  Required for MVP
P2  Important after MVP
P3  Future / ecosystem expansion
```

Trạng thái:

```text
[ ] Todo
[-] In progress
[x] Done
[~] Deferred
```

---

# 2. Trọng tâm hiện tại

Trình tự implementation hiện tại:

```text
Documentation contracts
        ↓
Canonical domain
        ↓
Schemas + validation
        ↓
Catalog
        ↓
Resolver
        ↓
Policy
        ↓
Lockfile
        ↓
Adapter framework
        ↓
Claude adapter
        ↓
CLI MVP
        ↓
Codex adapter
```

Milestone hiện tại:

```text
M0 — Foundation
```

---

# 3. Tài liệu

## P0 — Tài liệu cốt lõi

- [x] `problem.md`
- [x] `problem.vi.md`
- [x] `vision.md`
- [x] `goals.md`
- [x] `non-goals.md`
- [x] `requirements.md`
- [x] `use-cases.md`
- [x] `domain-model.md`
- [x] `terminology.md`
- [x] `capability-model.md`
- [x] `architecture.md`
- [x] `repository-structure.md`
- [x] `source-of-truth.md`

## P0 — Đặc tả cốt lõi

- [x] `resolution-spec.md`
- [x] `catalog-spec.md`
- [x] `manifest-spec.md`
- [x] `lockfile-spec.md`
- [x] `policy-spec.md`
- [x] `adapter-spec.md`
- [x] `cli-spec.md`
- [x] `roadmap.md`
- [x] `todo.md`

## P0 — Các đặc tả còn lại

- [ ] Viết `configuration-spec.md`
- [ ] Viết `overlay-spec.md`
- [ ] Viết `source-spec.md`
- [ ] Viết `update-spec.md`
- [ ] Viết `error-model.md`
- [ ] Viết `security-model.md`
- [ ] Viết `testing-strategy.md`
- [ ] Viết `versioning-spec.md`
- [ ] Viết `migration-spec.md`

## P1 — Tài liệu cho người đóng góp

- [ ] Review `README.md`
- [ ] Review `AGENTS.md`
- [ ] Viết `CONTRIBUTING.md`
- [ ] Viết hướng dẫn thiết lập môi trường phát triển
- [ ] Viết tổng quan kiến trúc cho người đóng góp
- [ ] Viết hướng dẫn tạo plugin
- [ ] Viết hướng dẫn tạo skill
- [ ] Viết hướng dẫn tạo adapter

---

# 4. Nền tảng repository

## P0 — Workspace

- [ ] Khởi tạo workspace
- [ ] Chọn package manager
- [ ] Cấu hình các workspace package
- [ ] Cấu hình TypeScript
- [ ] Bật TypeScript strict mode
- [ ] Cấu hình module resolution
- [ ] Cấu hình package exports
- [ ] Cấu hình build pipeline

Cấu trúc mục tiêu:

```text
packages/
├── core/
├── schemas/
├── catalog/
├── resolver/
├── policy/
├── lockfile/
├── adapter-kit/
├── adapters/
├── application/
└── cli/
```

## P0 — Công cụ

- [ ] Cấu hình Biome
- [ ] Cấu hình Vitest
- [ ] Cấu hình test coverage
- [ ] Cấu hình package scripts
- [ ] Cấu hình kiểm tra dependency
- [ ] Cấu hình phát hiện code không dùng đến
- [ ] Cấu hình Git hooks nếu cần
- [ ] Cấu hình CI

## P1 — Công cụ phát hành

- [ ] Chọn chiến lược versioning
- [ ] Cấu hình Changesets hoặc công cụ tương đương
- [ ] Cấu hình tạo changelog
- [ ] Cấu hình workflow publish package
- [ ] Cấu hình release CI

---

# 5. Domain chuẩn tắc

## P0 — Các kiểu cơ sở

Tạo các domain type chuẩn tắc.

- [ ] `Package`
- [ ] `Component`
- [ ] `Capability`
- [ ] `Publisher`
- [ ] `Source`
- [ ] `Preset`
- [ ] `Role`
- [ ] `Policy`
- [ ] `Overlay`

## P0 — Các kiểu Component

- [ ] `Skill`
- [ ] `Agent`
- [ ] `Prompt`
- [ ] `Command`
- [ ] `Hook`

## P0 — Định danh chuẩn tắc

Implement các canonical reference:

```text
plugin:<id>
skill:<id>
agent:<id>
prompt:<id>
command:<id>
hook:<id>
preset:<id>
role:<id>
```

Công việc:

- [ ] Định nghĩa `CanonicalReference`
- [ ] Implement parser
- [ ] Implement serializer
- [ ] Implement validator
- [ ] Implement các helper so sánh bằng
- [ ] Implement sắp xếp ổn định

## P0 — Lỗi domain

- [ ] Định danh không hợp lệ
- [ ] Định danh trùng lặp
- [ ] Thiếu reference
- [ ] Dependency không hợp lệ
- [ ] Capability không hợp lệ
- [ ] Reference vòng lặp

---

# 6. Schema

## P0 — Chiến lược schema

- [ ] Chọn thư viện runtime schema
- [ ] Định nghĩa quy ước versioning cho schema
- [ ] Định nghĩa chiến lược tương thích
- [ ] Định nghĩa định dạng lỗi schema

## P0 — Schema

- [ ] Schema cho package manifest
- [ ] Schema cho Skill
- [ ] Schema cho Agent
- [ ] Schema cho Prompt
- [ ] Schema cho Command
- [ ] Schema cho Hook
- [ ] Schema cho Preset
- [ ] Schema cho Role
- [ ] Schema cho Policy
- [ ] Schema cho cấu hình Project
- [ ] Schema cho adapter manifest
- [ ] Schema cho lockfile

## P1 — Fixture cho schema

- [ ] Fixture hợp lệ
- [ ] Fixture không hợp lệ
- [ ] Fixture biên
- [ ] Fixture tương thích phiên bản

---

# 7. Hệ thống manifest

## P0 — Manifest loader

- [ ] Đọc các tệp manifest
- [ ] Parse YAML
- [ ] Parse JSON nếu được hỗ trợ
- [ ] Kiểm tra phiên bản schema
- [ ] Chuyển manifest thành các kiểu chuẩn tắc
- [ ] Giữ lại vị trí nguồn

## P0 — Chẩn đoán manifest

Diagnostic nên bao gồm:

```text
file
line if available
field
code
message
suggestion
```

Công việc:

- [ ] Diagnostic schema không hợp lệ
- [ ] Diagnostic field không xác định
- [ ] Diagnostic thiếu field bắt buộc
- [ ] Diagnostic canonical reference không hợp lệ

## P1 — Test manifest

- [ ] Unit test
- [ ] Fixture test
- [ ] Snapshot cho manifest không hợp lệ

---

# 8. Repository scanner

## P0 — Quét repository chuẩn tắc

Phát hiện:

```text
plugins/
skills/
agents/
prompts/
commands/
hooks/
presets/
roles/
policies/
```

Công việc:

- [ ] Định nghĩa scanner API
- [ ] Duyệt các thư mục chuẩn tắc
- [ ] Bỏ qua các tệp không được hỗ trợ
- [ ] Phát hiện ID trùng lặp
- [ ] Giữ lại nguồn gốc tệp
- [ ] Tạo thứ tự xác định

## P1 — Cấu hình scanner

- [ ] Repository root tùy chỉnh
- [ ] Ignore pattern
- [ ] Thư mục tùy chọn
- [ ] Abstraction sẵn sàng cho monorepo

---

# 9. Validation engine

## P0 — Kiểm tra cấu trúc

- [ ] Kiểm tra manifest
- [ ] Kiểm tra canonical ID
- [ ] Kiểm tra ID trùng lặp
- [ ] Kiểm tra reference
- [ ] Kiểm tra kiểu component
- [ ] Kiểm tra cú pháp dependency

## P0 — Kiểm tra đồ thị

- [ ] Thiếu dependency
- [ ] Vòng lặp dependency
- [ ] Vòng lặp kế thừa Role
- [ ] Vòng lặp compose Preset
- [ ] Capability publisher không hợp lệ

## P1 — Các chế độ kiểm tra

- [ ] Chế độ thường
- [ ] Chế độ nghiêm ngặt
- [ ] Diagnostic máy đọc được

---

# 10. Catalog

## P0 — Mô hình catalog

Implement:

```ts
Catalog
├── packages
├── components
├── presets
├── roles
├── policies
└── publishers
```

Công việc:

- [ ] Xây dựng catalog từ repository
- [ ] Đánh chỉ mục theo canonical ID
- [ ] Đánh chỉ mục theo kiểu component
- [ ] Đánh chỉ mục theo capability
- [ ] Đánh chỉ mục theo publisher
- [ ] Thứ tự xác định ổn định

## P1 — Truy vấn catalog

- [ ] `get()`
- [ ] `has()`
- [ ] `list()`
- [ ] `search()`
- [ ] `findByCapability()`
- [ ] `findByPublisher()`

## P1 — Test catalog

- [ ] Repository rỗng
- [ ] Repository hợp lệ
- [ ] Mục trùng lặp
- [ ] Thiếu reference
- [ ] Output catalog xác định

---

# 11. Hệ thống Preset

## P0

- [ ] Parse Preset
- [ ] Resolve các tham chiếu Preset
- [ ] Hỗ trợ chọn package
- [ ] Hỗ trợ chọn capability
- [ ] Hỗ trợ Preset lồng nhau
- [ ] Phát hiện vòng lặp
- [ ] Thứ tự compose ổn định

## P1

Tạo các Preset ban đầu:

- [ ] `mental-models`
- [ ] `engineering-base`
- [ ] `typescript`
- [ ] `testing`
- [ ] `code-review`
- [ ] `frontend-quality`

---

# 12. Hệ thống Role

## P0

- [ ] Parse Role
- [ ] Hỗ trợ kế thừa Role
- [ ] Hỗ trợ tham chiếu Preset
- [ ] Hỗ trợ chọn package tường minh
- [ ] Hỗ trợ tham chiếu policy
- [ ] Phát hiện vòng lặp kế thừa
- [ ] Tạo Role hiệu lực

## P1

Các Role ban đầu:

- [ ] `software-engineer`
- [ ] `frontend`
- [ ] `backend`
- [ ] `product-manager`
- [ ] `second-brain`

---

# 13. Resolver

## P0 — Lõi resolver

Implement:

```text
Role
   ↓
Preset expansion
   ↓
Package selection
   ↓
Dependency expansion
   ↓
Deduplication
   ↓
Conflict detection
   ↓
Resolved Graph
```

Công việc:

- [ ] Định nghĩa input của resolver
- [ ] Định nghĩa output của resolver
- [ ] Resolve các dependency trực tiếp
- [ ] Resolve các dependency bắc cầu
- [ ] Loại bỏ component trùng lặp
- [ ] Phát hiện xung đột
- [ ] Phát hiện vòng lặp
- [ ] Thứ tự đồ thị ổn định

## P0 — Nguồn gốc Resolution

Theo dõi:

```text
selectedBy
dependsOn
providedBy
inheritedFrom
```

Ví dụ:

```text
role:frontend
→ preset:typescript
→ plugin:typescript
→ skill:typescript
```

Công việc:

- [ ] Ghi lại các cạnh resolution
- [ ] Ghi lại lý do lựa chọn
- [ ] Hỗ trợ truy vết đường đi dependency

## P1 — Khả năng giải thích

- [ ] `why(component)`
- [ ] cây dependency đầy đủ
- [ ] giải thích xung đột
- [ ] tóm tắt resolution

## P1 — Test resolver

- [ ] Package trực tiếp
- [ ] Package bắc cầu
- [ ] Preset lồng nhau
- [ ] Kế thừa Role
- [ ] Dependency trùng lặp
- [ ] Vòng lặp dependency
- [ ] Xung đột
- [ ] Resolution xác định

---

# 14. Policy engine

## P0 — Đánh giá Policy

- [ ] Cho phép package
- [ ] Từ chối package
- [ ] Cho phép component
- [ ] Từ chối component
- [ ] Cho phép source
- [ ] Từ chối source
- [ ] Hạn chế capability
- [ ] Hạn chế target

## P0 — Chẩn đoán

- [ ] Mã từ chối của policy
- [ ] Giải thích policy khớp
- [ ] Giải thích component bị chặn
- [ ] Kèm gợi ý khắc phục

## P1 — Compose Policy

- [ ] Policy cơ sở
- [ ] Policy workspace
- [ ] Policy Project
- [ ] Định nghĩa thứ tự ưu tiên

---

# 15. Lockfile

## P0 — Mô hình lockfile

Ghi lại:

- [ ] Phiên bản schema
- [ ] Phiên bản package
- [ ] Revision của source
- [ ] Integrity hash
- [ ] Các dependency đã resolve
- [ ] Phiên bản adapter
- [ ] Metadata của target

## P0 — Thao tác

- [ ] Đọc lockfile
- [ ] Kiểm tra lockfile
- [ ] Tạo lockfile
- [ ] So sánh lockfile với config
- [ ] Xác minh integrity
- [ ] Phát hiện lockfile lỗi thời

## P1 — Tính xác định

- [ ] Thứ tự key ổn định
- [ ] Serialization ổn định
- [ ] Test round-trip lockfile
- [ ] Test khả năng tái tạo

---

# 16. Hệ thống cấu hình

## P0

Bị chặn bởi:

```text
configuration-spec.md
```

Công việc:

- [ ] Định nghĩa schema config của project
- [ ] Định nghĩa Role mặc định
- [ ] Định nghĩa danh sách target
- [ ] Định nghĩa source
- [ ] Định nghĩa policy
- [ ] Định nghĩa overlay
- [ ] Định nghĩa chế độ lockfile
- [ ] Định nghĩa đường dẫn output

## P0 — Thứ tự ưu tiên cấu hình

Implement:

```text
CLI
↓
environment
↓
project
↓
workspace
↓
user
↓
defaults
```

## P1

- [ ] Tự động tìm config
- [ ] Đường dẫn config tường minh
- [ ] Tự động tìm project root
- [ ] Chẩn đoán cấu hình

---

# 17. Adapter SDK

## P0 — Các contract dùng chung

- [ ] `AdapterMetadata`
- [ ] `AdapterCapabilities`
- [ ] `SourceAdapter`
- [ ] `TargetAdapter`
- [ ] `RenderPlan`
- [ ] `RenderedArtifact`

## P0 — Target adapter API

Implement:

```text
metadata
capabilities
validate
plan
render
```

## P1 — Tiện ích

- [ ] Kiểm tra đường dẫn
- [ ] Phát hiện va chạm
- [ ] Helper cho integrity
- [ ] Helper cho diagnostic
- [ ] Helper render xác định
- [ ] Helper cho test

## P1 — Bộ kiểm thử tuân thủ

- [ ] Test metadata
- [ ] Test khai báo capability
- [ ] Test tính xác định
- [ ] Test path traversal
- [ ] Test va chạm
- [ ] Test capability không được hỗ trợ

---

# 18. Render plan

## P0

Định nghĩa các thao tác:

```text
create
update
remove
unchanged
```

Công việc:

- [ ] Mô hình render plan
- [ ] Thứ tự thao tác ổn định
- [ ] Phát hiện va chạm
- [ ] Metadata sở hữu đường dẫn
- [ ] Metadata component nguồn

## P1

- [ ] Hash của render plan
- [ ] Formatter dễ đọc cho người
- [ ] Formatter JSON

---

# 19. Tầng áp dụng vào filesystem

## P0

- [ ] Kiểm tra đường dẫn đích
- [ ] Ngăn chặn path traversal
- [ ] Tạo thư mục
- [ ] Ghi các tệp được sinh ra
- [ ] Xóa các tệp lỗi thời thuộc sở hữu
- [ ] Giữ nguyên các tệp do người dùng sở hữu
- [ ] Phát hiện va chạm

## P1

- [ ] Apply nguyên tử
- [ ] Staging tạm thời
- [ ] Chiến lược rollback
- [ ] Ghi idempotent
- [ ] So sánh integrity của tệp

---

# 20. Claude target adapter

## P1 — Nghiên cứu

- [ ] Xác nhận cấu trúc Claude plugin hiện tại
- [ ] Xác nhận cách biểu diễn Skills
- [ ] Xác nhận cách biểu diễn Agents
- [ ] Xác nhận cách biểu diễn Commands
- [ ] Xác nhận cách biểu diễn Hooks
- [ ] Xác nhận hành vi của project instructions

## P1 — Implementation

- [ ] Adapter manifest
- [ ] Khai báo capability
- [ ] Renderer cho skill
- [ ] Renderer cho agent
- [ ] Renderer cho command
- [ ] Renderer cho hook
- [ ] Renderer cho project instructions

## P1 — Kiểm tra

- [ ] Xử lý metadata không được hỗ trợ
- [ ] Kiểm tra tên tệp
- [ ] Phát hiện va chạm
- [ ] Đường dẫn dành riêng

## P1 — Test

Golden fixture:

- [ ] Một skill
- [ ] Nhiều skill
- [ ] Agent
- [ ] Command
- [ ] Hook
- [ ] Plugin đầy đủ
- [ ] Trường hợp va chạm
- [ ] Trường hợp không được hỗ trợ
- [ ] Output xác định

---

# 21. Tầng ứng dụng

## P1

Tạo các service độc lập với CLI:

- [ ] `InitService`
- [ ] `CatalogService`
- [ ] `ResolveService`
- [ ] `PlanService`
- [ ] `BuildService`
- [ ] `InstallService`
- [ ] `DiffService`
- [ ] `ValidateService`
- [ ] `DoctorService`

Sau này:

- [ ] `UpdateService`
- [ ] `SourceService`

Tầng ứng dụng MUST điều phối các domain service.

CLI MUST NOT chứa logic này.

---

# 22. Nền tảng CLI

## P1 — oclif

- [ ] Khởi tạo project oclif
- [ ] Cấu hình command discovery
- [ ] Cấu hình global flag
- [ ] Cấu hình xử lý lỗi
- [ ] Cấu hình help
- [ ] Cấu hình version
- [ ] Cấu hình completion

## P1 — Output

- [ ] Presenter cho người đọc
- [ ] Presenter JSON
- [ ] Presenter diagnostic
- [ ] Helper bảng
- [ ] Helper cây

## P1 — Hành vi

- [ ] `--json`
- [ ] `--quiet`
- [ ] `--verbose`
- [ ] `--no-color`
- [ ] `--offline`
- [ ] `--yes`
- [ ] `--dry-run`

## P1 — Exit code

Implement:

```text
0  success
1  general
2  CLI usage
3  configuration
4  validation
5  resolution
6  policy
7  lockfile
8  source
9  adapter
10 filesystem
```

---

# 23. Các command CLI MVP

## P1 — `init`

- [ ] Khởi tạo config
- [ ] Phát hiện project đã tồn tại
- [ ] Tránh ghi đè
- [ ] Hỗ trợ flag không tương tác

## P1 — `validate`

- [ ] Kiểm tra repository
- [ ] Kiểm tra config của project
- [ ] `--strict`
- [ ] `--json`

## P1 — `catalog`

- [ ] `catalog list`
- [ ] `catalog show`

## P1 — `role`

- [ ] `role list`
- [ ] `role show`
- [ ] `role show --resolved`

## P1 — `resolve`

- [ ] Resolution cơ bản
- [ ] Output dạng tóm tắt
- [ ] `--json`
- [ ] `--verbose`
- [ ] `--explain`
- [ ] `--why`

## P1 — `adapter`

- [ ] `adapter list`
- [ ] `adapter show`
- [ ] `adapter capabilities`

## P1 — `plan`

- [ ] Chọn target
- [ ] Tạo Render Plan
- [ ] Hiển thị các thay đổi
- [ ] Output JSON

## P1 — `build`

- [ ] Build một target
- [ ] Xuất ra `dist`
- [ ] Chế độ frozen lockfile
- [ ] Output xác định

## P1 — `install`

- [ ] Render target
- [ ] Xem trước thay đổi
- [ ] Xác nhận
- [ ] `--yes`
- [ ] `--dry-run`
- [ ] Áp dụng an toàn vào filesystem

## P1 — `diff`

- [ ] Diff dạng tóm tắt
- [ ] Diff nội dung
- [ ] `--check`
- [ ] Chế độ JSON

## P1 — `lock`

- [ ] `lock show`
- [ ] `lock verify`

## P1 — `doctor`

- [ ] Kiểm tra config
- [ ] Kiểm tra lockfile
- [ ] Kiểm tra adapter
- [ ] Kiểm tra filesystem
- [ ] Kiểm tra runtime

---

# 24. Ink / UX tương tác

## P2

Không để MVP bị chặn bởi TUI nâng cao.

Cách dùng Ink ban đầu:

- [ ] Wizard cho `init`
- [ ] Bộ chọn Role
- [ ] Bộ chọn target
- [ ] UI xác nhận

Sau này:

- [ ] Trình khám phá catalog
- [ ] Trình duyệt đồ thị dependency
- [ ] UI review update
- [ ] UI tương thích capability

Ink MUST vẫn là tùy chọn đối với các command không tương tác.

---

# 25. Fixture end-to-end đầu tiên

## P1

Tạo fixture:

```text
fixtures/
└── frontend-project/
```

Bao gồm:

```text
Role: frontend

Preset:
  engineering-base
  typescript
  testing

Packages:
  first-party
```

Luồng kỳ vọng:

```bash
agent-plugins validate

agent-plugins resolve

agent-plugins plan --target claude

agent-plugins build --target claude

agent-plugins install --target claude

agent-plugins diff --target claude --check
```

Kết quả cuối cùng:

```text
No changes.
```

Fixture này định nghĩa vòng lặp sản phẩm hoàn chỉnh đầu tiên.

---

# 26. Checklist nghiệm thu MVP

MVP hoàn thành khi:

- [ ] Các canonical manifest đã ổn định
- [ ] Catalog tải được các first-party package
- [ ] Role hoạt động
- [ ] Preset hoạt động
- [ ] Resolver hoạt động một cách xác định
- [ ] Policy hoạt động
- [ ] Lockfile hoạt động
- [ ] Claude adapter hoạt động
- [ ] Render Plan hoạt động
- [ ] Safe apply hoạt động
- [ ] CLI hoạt động end-to-end
- [ ] `--json` hoạt động cho tự động hóa
- [ ] CI workflow pass
- [ ] Golden fixture pass
- [ ] Cài đặt lặp lại là idempotent

Câu chuyện MVP cốt lõi:

```text
canonical content
    ↓
role
    ↓
resolve
    ↓
policy
    ↓
lock
    ↓
Claude adapter
    ↓
install
```

---

# 27. Codex adapter

## P2 — Nghiên cứu

- [ ] Xác nhận mô hình project instruction hiện tại của Codex
- [ ] Xác nhận hỗ trợ Skills
- [ ] Xác nhận hỗ trợ Agent
- [ ] Xác nhận hành vi tool/config
- [ ] Xây dựng ánh xạ capability

## P2 — Implementation

- [ ] Adapter manifest
- [ ] Khai báo capability
- [ ] Kiểm tra
- [ ] Lập render plan
- [ ] Render
- [ ] Golden fixture
- [ ] Test tuân thủ

## Cổng kiểm soát kiến trúc

- [ ] Xác minh không có giả định chuẩn tắc đặc thù cho Claude
- [ ] Xác minh cùng một đồ thị đã resolve có thể target cả Claude và Codex
- [ ] Refactor các chỗ rò rỉ abstraction trước khi tiếp tục

---

# 28. Hỗ trợ nhiều target

## P2

- [ ] Nhiều `--target`
- [ ] Resolve một lần
- [ ] Render từng target độc lập
- [ ] Diagnostic riêng cho từng target
- [ ] Tóm tắt build đa target
- [ ] Metadata lockfile đa target

Ví dụ:

```bash
agent-plugins build \
  --target claude \
  --target codex
```

---

# 29. Hệ thống source adapter

## P2 — Contract của source

- [ ] `discover`
- [ ] `fetch`
- [ ] `normalize`
- [ ] `verify`

## P2 — Local adapter

- [ ] Implement `source/local`
- [ ] Kiểm tra các package cục bộ chuẩn tắc

## P2 — Git adapter

- [ ] Config cho Git source
- [ ] Fetch revision bất biến
- [ ] Chuẩn hóa package
- [ ] Ghi lại nguồn gốc
- [ ] Xác minh integrity
- [ ] Cache cục bộ

## P2 — Chẩn đoán source

- [ ] Fetch thất bại
- [ ] Revision không khả dụng
- [ ] Integrity không khớp
- [ ] Cấu trúc repository không được hỗ trợ
- [ ] Chuẩn hóa thất bại

---

# 30. Tầng vendor

## P2

- [ ] Định nghĩa bố cục thư mục vendor
- [ ] Định nghĩa nguồn gốc vendor
- [ ] Định nghĩa import workflow
- [ ] Định nghĩa vendor ID
- [ ] Ngăn chỉnh sửa trực tiếp khi có thể

Nghiên cứu vendor ban đầu:

- [ ] Superpowers
- [ ] Hệ sinh thái Matt Pocock
- [ ] ECC
- [ ] Các repository được tuyển chọn khác

---

# 31. Overlay engine

## P2

Bị chặn bởi:

```text
overlay-spec.md
```

Implement các thao tác:

- [ ] Add
- [ ] Replace
- [ ] Merge
- [ ] Remove

Công việc bổ sung:

- [ ] Thứ tự overlay
- [ ] Xung đột overlay
- [ ] Nguồn gốc overlay
- [ ] Kiểm tra overlay
- [ ] Test overlay

Bất biến kiến trúc:

```text
Overlay
    = semantic modification

Adapter
    = target representation
```

---

# 32. Update engine

## P2

Bị chặn bởi:

```text
update-spec.md
```

Implement:

- [ ] Phát hiện version/revision mới hơn
- [ ] So sánh với lock hiện tại
- [ ] Chọn ứng viên
- [ ] Kiểm tra tương thích
- [ ] Resolve lại
- [ ] Đánh giá policy
- [ ] Xem trước
- [ ] Cập nhật lockfile

CLI:

- [ ] `update`
- [ ] `update <package>`
- [ ] `update --dry-run`

Sau này:

- [ ] `--patch`
- [ ] `--minor`
- [ ] `--major`

---

# 33. Source CLI

## P2

- [ ] `source list`
- [ ] `source show`
- [ ] `source refresh`

Quan trọng:

```text
source refresh
    !=
update
```

---

# 34. Cache

## P2

- [ ] Định nghĩa vị trí cache
- [ ] Định nghĩa cấu trúc cache
- [ ] Implement source cache
- [ ] Kiểm tra integrity
- [ ] Dọn dẹp cache

CLI:

- [ ] `cache status`
- [ ] `cache clean`
- [ ] `cache prune`

---

# 35. Thư viện first-party

## P2 — Mental model

- [ ] Debugging
- [ ] Giải quyết vấn đề
- [ ] Tư duy hệ thống
- [ ] Phân tích trade-off
- [ ] Phân tích nguyên nhân gốc rễ
- [ ] Lập luận từ nguyên lý cơ bản

## P2 — Kỹ thuật

- [ ] Kỹ thuật phần mềm
- [ ] Kiến trúc
- [ ] Code review
- [ ] Testing
- [ ] Bảo mật
- [ ] Tài liệu

## P2 — Frontend

- [ ] TypeScript
- [ ] React
- [ ] Next.js
- [ ] Accessibility
- [ ] Hiệu năng
- [ ] Frontend testing

## P2 — Backend

- [ ] Thiết kế API
- [ ] Thiết kế cơ sở dữ liệu
- [ ] Hệ thống phân tán
- [ ] Observability
- [ ] Backend testing

## P2 — Sản phẩm

- [ ] Product discovery
- [ ] Yêu cầu
- [ ] Ưu tiên hóa
- [ ] Lập roadmap
- [ ] Chỉ số
- [ ] Quản lý stakeholder

## P2 — Tri thức

- [ ] Nghiên cứu
- [ ] Viết
- [ ] Quản lý tri thức
- [ ] Second brain

---

# 36. Mô hình Publisher

## P2

- [ ] Publisher ID
- [ ] Metadata của Publisher
- [ ] Mức tin cậy của Publisher
- [ ] Mức ưu tiên của Publisher

## P3 — Chọn Capability Publisher

- [ ] Nhiều publisher cho mỗi capability
- [ ] Publisher ưu tiên
- [ ] Ghi đè publisher
- [ ] Lựa chọn xác định
- [ ] Ràng buộc policy

---

# 37. Các target adapter bổ sung

## P3 — Gemini

- [ ] Nghiên cứu
- [ ] Ma trận capability
- [ ] Adapter
- [ ] Test

## P3 — OpenCode

- [ ] Nghiên cứu
- [ ] Ma trận capability
- [ ] Adapter
- [ ] Test

## P3 — Hermes

- [ ] Nghiên cứu
- [ ] Ma trận capability
- [ ] Adapter
- [ ] Test

---

# 38. CLI nâng cao

## P3

- [ ] `inspect`
- [ ] `graph`
- [ ] `add`
- [ ] `remove`
- [ ] `sync`
- [ ] `migrate`

Có thể:

```bash
agent-plugins inspect skill:typescript
agent-plugins graph --format mermaid
```

Không implement trước khi ngữ nghĩa cốt lõi ổn định.

---

# 39. TUI phong phú

## P3

- [ ] Trình khám phá catalog
- [ ] Trình khám phá Role
- [ ] Cây dependency
- [ ] Ma trận capability
- [ ] Xem trước cài đặt
- [ ] Review update
- [ ] Bộ chọn component có thể tìm kiếm

TUI MUST sử dụng các Application API.

---

# 40. Bảo mật

## P1 — Baseline

- [ ] Bảo vệ khỏi path traversal
- [ ] Kiểm tra đường dẫn được sinh ra
- [ ] Che giấu secret
- [ ] Bảo vệ tệp có quyền sở hữu không xác định
- [ ] Không thực thi package tùy ý
- [ ] Hỗ trợ integrity

## P2

- [ ] Mức tin cậy của source
- [ ] Phát hiện nội dung thực thi được
- [ ] Metadata giấy phép
- [ ] Hook cho security policy

## P3

- [ ] Chữ ký package
- [ ] Publisher đã xác minh
- [ ] Mô hình tin cậy của registry

---

# 41. Testing

## P0 — Unit test

- [ ] Canonical reference
- [ ] Schema
- [ ] Manifest parser
- [ ] Catalog
- [ ] Compose Role
- [ ] Compose Preset

## P1 — Test cốt lõi

- [ ] Resolver
- [ ] Policy
- [ ] Lockfile
- [ ] Render Plan
- [ ] Áp dụng vào filesystem

## P1 — Test adapter

- [ ] Test tuân thủ
- [ ] Golden fixture
- [ ] Snapshot test
- [ ] Test tính xác định

## P1 — Test CLI

- [ ] Parse argument
- [ ] Exit code
- [ ] Contract JSON
- [ ] Trình bày cho người đọc
- [ ] Hành vi trong CI

## P1 — End-to-end

- [ ] Init → Resolve → Build
- [ ] Build → Install → Diff
- [ ] Cài đặt lặp lại
- [ ] Frozen lockfile
- [ ] Policy từ chối
- [ ] Tính năng adapter không được hỗ trợ

---

# 42. CI

## P0

Pipeline:

```text
install
 ↓
lint
 ↓
typecheck
 ↓
test
 ↓
build
```

Công việc:

- [ ] Lint
- [ ] Typecheck
- [ ] Unit test
- [ ] Integration test
- [ ] Build

## P1

Bổ sung:

- [ ] Schema fixture
- [ ] Tuân thủ adapter
- [ ] Golden fixture
- [ ] Kiểm tra tính xác định
- [ ] Test contract CLI

Kiểm tra project được khuyến nghị trong tương lai:

```bash
agent-plugins validate --strict

agent-plugins lock verify

agent-plugins build --frozen-lockfile

agent-plugins diff --check
```

---

# 43. Hiệu năng

## P2

- [ ] Đo thời gian tải catalog
- [ ] Đo hiệu năng resolver
- [ ] Tránh parse manifest lặp lại
- [ ] Cache các manifest đã parse
- [ ] Lazy-load adapter
- [ ] Render tăng dần

Không tối ưu trước khi profiling.

---

# 44. Versioning

## P2

Bị chặn bởi:

```text
versioning-spec.md
```

Định nghĩa phiên bản cho:

- [ ] CLI
- [ ] Core
- [ ] Các schema chuẩn tắc
- [ ] Adapter API
- [ ] Từng adapter riêng lẻ
- [ ] Lockfile
- [ ] Output JSON của CLI

---

# 45. Migration

## P3

Bị chặn bởi:

```text
migration-spec.md
```

- [ ] Phát hiện schema cũ
- [ ] Lập kế hoạch migration
- [ ] Xem trước migration
- [ ] Áp dụng migration
- [ ] Kiểm tra project đã migrate
- [ ] CLI `migrate`

---

# 46. Hệ sinh thái cộng đồng

## P3

Không bắt đầu cho đến khi mô hình security/provenance ổn định.

- [ ] Thiết kế community catalog
- [ ] Chỉ mục metadata của package
- [ ] Metadata tin cậy
- [ ] Metadata integrity
- [ ] Metadata giấy phép
- [ ] Community source adapter
- [ ] Tìm kiếm
- [ ] Khám phá package

---

# 47. Registry

## P3

- [ ] Kiến trúc registry
- [ ] Mô hình namespace
- [ ] Quyền sở hữu package
- [ ] Metadata phiên bản package
- [ ] Lưu trữ integrity
- [ ] Registry API
- [ ] Chiến lược cache offline

---

# 48. Publish

## P3

CLI tiềm năng:

```text
package validate
package pack
package publish
```

Công việc:

- [ ] Định nghĩa định dạng archive của package
- [ ] Kiểm tra package
- [ ] Integrity của package
- [ ] Danh tính publisher
- [ ] Phân quyền publish

---

# 49. Tích hợp IDE

## P3

- [ ] Khám phá VS Code
- [ ] Bộ chọn Role
- [ ] Trình duyệt catalog
- [ ] Diagnostic
- [ ] Xem trước artifact được sinh ra

Phải tái sử dụng Application API.

---

# 50. Giao diện MCP / Agent

## P3

Các thao tác đọc tiềm năng:

- [ ] Tìm kiếm catalog
- [ ] Kiểm tra package
- [ ] Kiểm tra capability
- [ ] Resolve Role
- [ ] Hiển thị Render Plan

Các thao tác ghi tiềm năng cần một đợt security review riêng.

---

# 51. Rà soát chất lượng tài liệu

Trước V1:

- [ ] Đảm bảo thuật ngữ nhất quán
- [ ] Loại bỏ các khái niệm trùng lặp
- [ ] Liên kết chéo các đặc tả
- [ ] Thêm sơ đồ kiến trúc
- [ ] Thêm ví dụ chuẩn tắc
- [ ] Thêm ví dụ CLI
- [ ] Thêm tutorial end-to-end
- [ ] Thêm phần xử lý sự cố
- [ ] Thêm FAQ

---

# 52. Các cổng review kiến trúc

## Sau Domain chuẩn tắc

- [ ] Không có field đặc thù cho target trong core
- [ ] Canonical ID ổn định
- [ ] Phân biệt package/component rõ ràng

## Sau Resolver

- [ ] Không có logic render trong resolver
- [ ] Không có logic network trong resolver
- [ ] Resolution xác định
- [ ] Resolution có thể giải thích

## Sau Claude adapter

- [ ] Ngữ nghĩa target được cô lập
- [ ] Nội dung chuẩn tắc không thay đổi
- [ ] Tuân thủ adapter pass

## Sau Codex adapter

- [ ] Không có giả định về Claude rò rỉ vào core
- [ ] Cùng một đồ thị đã resolve hoạt động cho cả hai target

## Trước hệ sinh thái bên ngoài

- [ ] Mô hình provenance hoàn chỉnh
- [ ] Mô hình integrity hoàn chỉnh
- [ ] Mô hình policy hoàn chỉnh
- [ ] Mô hình tin cậy source đã được định nghĩa

## Trước Community Registry

- [ ] Mô hình bảo mật đã được review
- [ ] Không thực thi package từ xa
- [ ] Kiểm tra integrity hoạt động
- [ ] Metadata tin cậy khả dụng

---

# 53. Checklist V0.1

Mục tiêu:

```text
first end-to-end build
```

Bắt buộc:

- [ ] Nền tảng repository
- [ ] Mô hình chuẩn tắc
- [ ] Schema
- [ ] Manifest loader
- [ ] Repository scanner
- [ ] Kiểm tra
- [ ] Catalog
- [ ] Preset
- [ ] Role
- [ ] Resolver
- [ ] Claude adapter cơ bản
- [ ] CLI cơ bản
- [ ] Command build
- [ ] Fixture end-to-end

---

# 54. Checklist V0.2

Mục tiêu:

```text
reproducible + safe
```

- [ ] Policy
- [ ] Lockfile
- [ ] Giải thích resolution
- [ ] Render Plan
- [ ] Áp dụng an toàn vào filesystem
- [ ] Install
- [ ] Diff
- [ ] Doctor
- [ ] Frozen lockfile
- [ ] Test idempotency

---

# 55. Checklist V0.3

Mục tiêu:

```text
prove portability
```

- [ ] Codex adapter
- [ ] Build đa target
- [ ] Ma trận capability của adapter
- [ ] Fixture liên target

---

# 56. Checklist V0.4

Mục tiêu:

```text
external sources
```

- [ ] Source Adapter API
- [ ] Git adapter
- [ ] Provenance
- [ ] Integrity
- [ ] Source cache
- [ ] Mô hình vendor

---

# 57. Checklist V0.5

Mục tiêu:

```text
maintain upstream content
```

- [ ] Overlay engine
- [ ] Update engine
- [ ] Xem trước update
- [ ] Workflow update vendor

---

# 58. Checklist V0.6

Mục tiêu:

```text
better daily UX
```

- [ ] Thư viện Role hoàn thiện
- [ ] Thư viện Preset
- [ ] Thư viện capability first-party
- [ ] Wizard init được cải thiện

---

# 59. Checklist V0.7

Mục tiêu:

```text
broader target support
```

- [ ] Gemini adapter
- [ ] OpenCode adapter
- [ ] Hermes adapter

---

# 60. Checklist V0.8

Mục tiêu:

```text
ecosystem expansion
```

- [ ] Community catalog
- [ ] Metadata tin cậy
- [ ] Source policy
- [ ] Tăng cường bảo mật

---

# 61. Checklist V0.9

Mục tiêu:

```text
release candidate
```

- [ ] Review hiệu năng
- [ ] Framework migration
- [ ] Review tài liệu
- [ ] DX cho tác giả adapter
- [ ] DX cho tác giả plugin
- [ ] Review tương thích CLI
- [ ] Security review

---

# 62. Checklist V1.0

Trước V1.0:

- [ ] API canonical manifest ổn định
- [ ] API Role ổn định
- [ ] API Preset ổn định
- [ ] Ngữ nghĩa resolver ổn định
- [ ] Ngữ nghĩa policy ổn định
- [ ] Định dạng lockfile ổn định
- [ ] Adapter API ổn định
- [ ] Các command CLI cốt lõi ổn định
- [ ] Output JSON của CLI được versioning
- [ ] Claude adapter sẵn sàng cho production
- [ ] Codex adapter sẵn sàng cho production
- [ ] Ít nhất một adapter bổ sung đã được kiểm chứng
- [ ] Chiến lược migration đã được tài liệu hóa
- [ ] Mô hình bảo mật đã được tài liệu hóa
- [ ] Toàn bộ test suite pass
- [ ] Tài liệu hoàn chỉnh

---

# 63. Chưa xây dựng

Hoãn những mục này cho đến khi core ổn định:

- [ ] Public marketplace từ xa
- [ ] Đồng bộ cloud
- [ ] Ứng dụng web
- [ ] Ứng dụng desktop
- [ ] Gợi ý package bằng AI
- [ ] Tự động chọn package
- [ ] Tự động thực thi từ xa
- [ ] TUI toàn màn hình
- [ ] Public registry
- [ ] Dashboard cho doanh nghiệp

Lý do:

```text
core correctness
    >
feature breadth
```

---

# 64. 10 công việc tiếp theo

Thực hiện những việc sau đây tiếp theo, theo thứ tự:

1. [ ] Viết `configuration-spec.md`
2. [ ] Viết `overlay-spec.md`
3. [ ] Viết `source-spec.md`
4. [ ] Viết `update-spec.md`
5. [ ] Hoàn thiện cấu trúc package của repository
6. [ ] Implement định danh chuẩn tắc
7. [ ] Implement các domain type chuẩn tắc
8. [ ] Implement manifest schema
9. [ ] Implement manifest loader
10. [ ] Implement repository scanner

Sau những việc này:

```text
validation
→ catalog
→ resolver
```

nên trở thành trọng tâm kỹ thuật chính.

---

# 65. Critical path trước mắt

Critical path hiện tại là:

```text
configuration-spec
       ↓
canonical types
       ↓
schemas
       ↓
manifest loader
       ↓
repository scanner
       ↓
validation
       ↓
catalog
       ↓
resolver
       ↓
policy
       ↓
lockfile
       ↓
adapter SDK
       ↓
Claude adapter
       ↓
CLI MVP
```

Mọi thứ nằm ngoài path này SHOULD nhìn chung giữ vai trò thứ yếu cho đến khi MVP hoạt động.

---

# 66. Định nghĩa hoàn thành

Với mọi công việc implementation, hãy xác minh:

- [ ] Đúng tầng kiến trúc
- [ ] Các type đã được định nghĩa
- [ ] Có bao gồm kiểm tra
- [ ] Diagnostic ổn định
- [ ] Unit test
- [ ] Integration test khi phù hợp
- [ ] Hành vi xác định
- [ ] Tài liệu đã được cập nhật
- [ ] Không rò rỉ đặc thù target vào core
- [ ] Không có truy cập network ẩn
- [ ] Không thay đổi filesystem một cách không an toàn

---

# 67. Quy tắc của project

Khi không chắc nên implement gì tiếp theo, hãy ưu tiên công việc củng cố:

```text
canonical correctness

→ deterministic resolution

→ reproducibility

→ portability

→ explainability

→ safe automation

→ ecosystem growth
```

Không tối ưu cho số lượng plugin hoặc runtime được hỗ trợ trước khi kiến trúc có thể hỗ trợ chúng một cách gọn gàng.