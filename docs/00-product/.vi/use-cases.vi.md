# Use Case

## Tổng quan

Tài liệu này định nghĩa các use case tiêu biểu mà `agent-plugins` phải hỗ trợ.

Các use case này dùng để kiểm chứng xem mô hình sản phẩm có thể hoạt động được trên nhiều yếu tố khác nhau hay không:

- role của người dùng,
- loại project,
- publisher,
- tổ hợp capability,
- trust policy,
- runtime target,
- kịch bản update.

Chúng được mô tả có chủ đích từ góc nhìn của người dùng.

Các chi tiết implementation thuộc về các tài liệu architecture và specification ở giai đoạn sau.

---

# 1. Actor

Hệ thống có một số actor chính.

## 1.1 Developer cá nhân

Một developer sử dụng agent tooling trên một hoặc nhiều software project.

Ví dụ:

```text
Frontend Engineer
Backend Engineer
Full-stack Engineer
Platform Engineer
```

---

## 1.2 Knowledge Worker

Một người dùng có use case chính không phải là phát triển phần mềm.

Ví dụ:

```text
Product Manager
Researcher
Writer
Second Brain user
```

---

## 1.3 Project Maintainer

Người chịu trách nhiệm định nghĩa và duy trì agent environment của một project.

Trách nhiệm có thể bao gồm:

```text
selecting profiles
selecting presets
reviewing updates
maintaining lockfiles
resolving conflicts
```

---

## 1.4 Catalog Maintainer

Contributor chịu trách nhiệm duy trì hệ sinh thái đã được curate.

Trách nhiệm bao gồm:

```text
adding publishers
registering packages
mapping capabilities
reviewing upstream changes
maintaining preferred implementations
```

---

## 1.5 Team / Organization Maintainer

Một người hoặc một team chịu trách nhiệm cho các yếu tố dùng chung như:

```text
policies
approved publishers
security requirements
shared presets
```

Actor này chủ yếu có liên quan khi vượt ra ngoài workflow tối thiểu dành cho người dùng cá nhân.

---

# 2. Hành trình người dùng cốt lõi

Workflow chính nên luôn đơn giản.

```text
Choose role
    ↓
Choose project needs
    ↓
Choose policy / target
    ↓
Resolve capabilities
    ↓
Review result
    ↓
Synchronize environment
```

Luồng CLI điển hình:

```bash
ap init
ap sync
```

Kiểm tra tùy chọn:

```bash
ap explain
ap diff
ap doctor
```

---

# 3. UC-001 — Khởi tạo một project frontend

## Actor

Frontend Engineer

## Mục tiêu

Cấu hình một AI agent environment hữu ích cho project frontend mà không cần chọn thủ công từng plugin.

## Kịch bản

Người dùng đang làm việc với:

```text
Next.js
TypeScript
Cloudflare
```

Họ khởi tạo project:

```bash
ap init
```

Người dùng chọn:

```text
Profile:
frontend-engineer

Presets:
stacks/nextjs
stacks/cloudflare

Target:
claude-code

Policy:
default
```

Project manifest thu được có thể trông như sau:

```yaml
profile: frontend-engineer

presets:
  - stacks/nextjs
  - stacks/cloudflare

targets:
  - claude-code

policy: default
```

## Kết quả mong đợi

Hệ thống resolve các capability như:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.review
frontend.design
frontend.react
frontend.typescript
```

thành các implementation phù hợp.

Người dùng không cần phải tự biết publisher nào implement từng capability.

## Requirement liên quan

```text
REQ-PRO-001
REQ-PRO-004
REQ-PRJ-001
REQ-PRJ-003
REQ-RES-001
REQ-TGT-002
```

---

# 4. UC-002 — Khởi tạo một project backend

## Actor

Backend Engineer

## Mục tiêu

Tạo một agent environment tập trung vào backend.

## Kịch bản

Project sử dụng:

```text
Node.js
TypeScript
PostgreSQL
```

Người dùng cấu hình:

```yaml
profile: backend-engineer

presets:
  - stacks/typescript
  - stacks/node
  - engineering/security

targets:
  - claude-code
```

## Capability mong đợi

Environment sau khi resolve có thể bao gồm:

```text
workflow.planning
engineering.testing.tdd
engineering.debugging
engineering.architecture

backend.api-design
backend.contracts

security.review
```

Các capability dành riêng cho frontend không nên được đưa vào trừ khi được yêu cầu rõ ràng.

## Kết quả mong đợi

Environment sau khi resolve nhỏ hơn và phù hợp hơn so với việc cài toàn bộ một plugin collection đa dụng.

## Requirement liên quan

```text
REQ-PRO-001
REQ-PRE-003
REQ-RES-009
REQ-SYNC-001
```

---

# 5. UC-003 — Sử dụng profile Second Brain

## Actor

Knowledge Worker

## Mục tiêu

Sử dụng cùng một hệ thống cho một môi trường không phải phát triển phần mềm.

## Kịch bản

Người dùng duy trì một hệ thống quản lý tri thức dựa trên Obsidian.

Họ cấu hình:

```yaml
profile: second-brain

presets:
  - knowledge/research
  - knowledge/writing
  - knowledge/synthesis
  - tools/obsidian
```

## Capability mong đợi

```text
knowledge.research
knowledge.writing
knowledge.synthesis
knowledge.management
```

Các implementation tiềm năng có thể đến từ:

```text
native agent-plugins
Matt Pocock
ECC
other curated publishers
```

## Kết quả mong đợi

Hệ thống không nên tự động đưa vào các capability phát triển phần mềm không liên quan như:

```text
TDD
Git worktrees
build error resolution
frontend testing
```

trừ khi được yêu cầu rõ ràng.

## Requirement liên quan

```text
REQ-PRO-001
REQ-CAP-004
REQ-RES-009
REQ-NAT-001
```

---

# 6. UC-004 — Sử dụng profile Product Manager

## Actor

Product Manager

## Mục tiêu

Cấu hình agent tooling xoay quanh product discovery, research, specification và writing.

## Kịch bản

Người dùng chọn:

```yaml
profile: product-manager

presets:
  - domains/product
  - knowledge/research
  - knowledge/writing
```

## Capability mong đợi

Các capability có thể bao gồm:

```text
product.discovery
product.requirements
product.prioritization

knowledge.research
knowledge.synthesis
knowledge.writing

engineering.domain-modeling
```

## Kết quả mong đợi

Profile nên kết hợp các capability phù hợp từ nhiều publisher khác nhau mà không buộc Product Manager phải hiểu cấu trúc repository của chúng.

---

# 7. UC-005 — Tái sử dụng cùng một profile cho nhiều project khác nhau

## Actor

Frontend Engineer

## Mục tiêu

Tái sử dụng một role làm việc trên nhiều project stack.

## Kịch bản

Người dùng làm việc trên ba project.

### Project A

```text
Next.js
Cloudflare
```

### Project B

```text
React
Vite
```

### Project C

```text
Astro
```

Cả ba project đều dùng:

```yaml
profile: frontend-engineer
```

nhưng với các project preset khác nhau.

## Kết quả mong đợi

Baseline ở cấp role vẫn nhất quán:

```text
workflow
testing
debugging
review
frontend practices
```

trong khi các capability riêng của từng project thay đổi.

Người dùng không cần các profile riêng biệt như:

```text
frontend-nextjs-engineer
frontend-vite-engineer
frontend-astro-engineer
```

## Requirement liên quan

```text
REQ-PRO-004
REQ-PRJ-003
```

---

# 8. UC-006 — Thêm một tập capability tùy chọn

## Actor

Developer

## Mục tiêu

Thêm một capability cross-cutting vào một project hiện có.

## Kịch bản

Một project frontend đã sử dụng:

```yaml
profile: frontend-engineer
```

Người dùng muốn bổ sung các capability về security.

Họ thêm:

```yaml
presets:
  - engineering/security
```

## Kết quả mong đợi

Các capability security trở thành một phần của quá trình resolution mà không cần sửa đổi frontend profile.

Hệ thống không cần một entity first-class riêng là `Addon`.

Về mặt khái niệm:

```text
optional feature
=
additional preset
```

## Requirement liên quan

```text
REQ-PRE-005
REQ-PRJ-003
```

---

# 9. UC-007 — Nhiều publisher cùng cung cấp TDD

## Actor

Project Maintainer

## Mục tiêu

Tránh việc có nhiều workflow TDD cạnh tranh nhau.

## Điều kiện tiên quyết

Catalog chứa:

```text
engineering.testing.tdd

Implementations:
- Superpowers
- Matt Pocock
- ECC
```

và capability có:

```yaml
cardinality: one
```

## Kịch bản

Frontend profile yêu cầu:

```text
engineering.testing.tdd
```

Resolver tìm ra tất cả các implementation ứng viên.

## Kết quả mong đợi

Resolver sẽ:

1. đánh giá policy,
2. đánh giá khả năng tương thích với target,
3. đánh giá priority của implementation,
4. chọn đúng một implementation.

Ví dụ:

```text
Selected:
Superpowers / test-driven-development

Suppressed:
Matt Pocock / tdd
ECC / tdd-workflow
```

## Kết quả mong đợi

Chỉ workflow TDD được chọn mới trở nên active.

## Requirement liên quan

```text
REQ-CAP-001
REQ-CAP-002
REQ-CAP-003
REQ-RES-003
REQ-RES-005
```

---

# 10. UC-008 — Nhiều implementation có thể cùng tồn tại

## Actor

Developer

## Mục tiêu

Sử dụng nhiều implementation bổ trợ lẫn nhau cho một capability không độc quyền.

## Điều kiện tiên quyết

Một capability được định nghĩa với:

```yaml
cardinality: many
```

Ví dụ:

```text
knowledge.research
```

Các implementation có sẵn có thể cung cấp:

```text
web research
documentation research
repository research
academic search
```

## Kết quả mong đợi

Resolver có thể chọn nhiều implementation tương thích.

Điều này không nên bị coi là conflict.

## Requirement liên quan

```text
REQ-CAP-002
REQ-RES-004
```

---

# 11. UC-009 — Policy từ chối ứng viên có priority cao nhất

## Actor

Project Maintainer

## Mục tiêu

Áp dụng security policy trước capability priority.

## Kịch bản

Một capability có hai ứng viên:

```text
Candidate A
priority: 100
trust: community

Candidate B
priority: 80
trust: curated
```

Policy được chọn chỉ cho phép:

```text
first-party
official
curated
```

## Kết quả mong đợi

Candidate A bị từ chối.

Candidate B được chọn.

Priority không bao giờ được phép override các hạn chế của policy.

## Requirement liên quan

```text
REQ-POL-002
REQ-RES-005
```

---

# 12. UC-010 — Policy từ chối tất cả các implementation

## Actor

Developer

## Mục tiêu

Nhận được thông tin chẩn đoán hữu ích khi không có implementation nào thỏa mãn policy.

## Kịch bản

Project yêu cầu:

```text
security.review
```

Tất cả các implementation hiện có đều được phân loại là:

```text
community
```

nhưng policy chỉ cho phép:

```text
first-party
official
curated
```

## Kết quả mong đợi

Resolution thất bại.

Thông báo lỗi nên giải thích:

```text
Unable to resolve:
security.review

Required by:
backend-engineer
→ engineering/security

Candidates:
Publisher A — rejected: community source
Publisher B — rejected: community source
```

Resolver không được âm thầm loại bỏ capability.

## Requirement liên quan

```text
REQ-RES-007
REQ-EXP-004
REQ-POL-002
```

---

# 13. UC-011 — Resolution capability không rõ ràng

## Actor

Project Maintainer

## Mục tiêu

Tránh việc lựa chọn tùy ý một cách ngầm định.

## Kịch bản

Hai ứng viên vẫn còn lại sau khi áp dụng tất cả các bộ lọc:

```text
Candidate A
priority: 100

Candidate B
priority: 100
```

Cả hai đều thỏa mãn:

```text
policy
target compatibility
version constraints
```

Không có quy tắc tie-break tường minh nào.

## Kết quả mong đợi

Resolution nên thất bại hoặc yêu cầu một override tường minh.

Nó không được chọn ngẫu nhiên một implementation.

Ví dụ thông tin chẩn đoán:

```text
Ambiguous capability:
engineering.testing.tdd

Candidates:
A
B

Specify an explicit implementation override.
```

## Requirement liên quan

```text
REQ-RES-008
REQ-NFR-001
```

---

# 14. UC-012 — Giải thích vì sao một component được cài đặt

## Actor

Developer

## Mục tiêu

Hiểu vì sao một capability implementation cụ thể đang active.

## Kịch bản

Người dùng chạy:

```bash
ap explain engineering.testing.tdd
```

## Output mong đợi

```text
Capability:
engineering.testing.tdd

Required by:
frontend-engineer
→ engineering/core

Candidates:
Superpowers / test-driven-development
Matt Pocock / tdd
ECC / tdd-workflow

Selected:
Superpowers / test-driven-development

Reason:
compatible with claude-code
allowed by default policy
highest implementation priority

Package:
superpowers

Publisher:
superpowers
```

## Requirement liên quan

```text
REQ-EXP-001
REQ-EXP-002
REQ-EXP-003
```

---

# 15. UC-013 — Giải thích vì sao một package được cài đặt

## Actor

Developer

## Mục tiêu

Truy vết ngược một package về capability đã khiến nó được cài đặt.

## Kịch bản

Người dùng nhận thấy:

```text
superpowers
```

trong environment của họ.

Họ yêu cầu:

```bash
ap explain package superpowers
```

## Kết quả mong đợi

Hệ thống có thể hiển thị:

```text
Package:
superpowers

Required components:
test-driven-development
systematic-debugging
writing-plans

Capabilities:
engineering.testing.tdd
engineering.debugging
workflow.planning

Required through:
frontend-engineer
→ engineering/core
```

---

# 16. UC-014 — Tái tạo environment trên một máy khác

## Actor

Developer

## Mục tiêu

Dựng lại cùng một agent environment trên máy thứ hai.

## Điều kiện tiên quyết

Repository chứa:

```text
agent-plugins.yaml
agent-plugins.lock
```

## Kịch bản

Trên một máy khác:

```bash
git clone project
cd project
ap sync
```

## Kết quả mong đợi

Hệ thống khôi phục lại đúng các thành phần đã được resolve:

```text
publishers
packages
components
versions
capability mappings
policy-sensitive selections
```

tùy thuộc vào khả năng sẵn có của target/runtime.

## Requirement liên quan

```text
REQ-LOCK-001
REQ-LOCK-002
REQ-RES-001
REQ-SYNC-003
```

---

# 17. UC-015 — Sync lặp lại có tính idempotent

## Actor

Developer

## Mục tiêu

Chạy đồng bộ hóa nhiều lần một cách an toàn.

## Kịch bản

Người dùng thực thi:

```bash
ap sync
ap sync
ap sync
```

mà không sửa đổi configuration.

## Kết quả mong đợi

Lần chạy đầu tiên reconcile trạng thái.

Các lần chạy tiếp theo báo cáo không có thay đổi đáng kể nào.

Lockfile và cấu hình target được quản lý thu được vẫn tương đương.

## Requirement liên quan

```text
REQ-RES-010
REQ-SYNC-003
```

---

# 18. UC-016 — Phát hiện drift giữa manifest và lockfile

## Actor

Developer

## Mục tiêu

Biết khi nào desired state đã thay đổi sau khi chỉnh sửa configuration.

## Kịch bản

Ban đầu project chứa:

```yaml
presets:
  - stacks/nextjs
```

Người dùng thêm:

```yaml
  - engineering/security
```

nhưng không chạy sync.

## Kết quả mong đợi

Hệ thống phát hiện rằng:

```text
agent-plugins.yaml
```

và:

```text
agent-plugins.lock
```

không còn đồng bộ.

Các command như:

```bash
ap diff
ap doctor
```

nên hiển thị drift này.

## Requirement liên quan

```text
REQ-LOCK-005
REQ-CLI-007
REQ-CLI-008
```

---

# 19. UC-017 — Kiểm tra một upstream update

## Actor

Catalog Maintainer

## Mục tiêu

Kiểm tra các thay đổi từ upstream trước khi áp dụng chúng.

## Kịch bản

Maintainer chạy:

```bash
ap update --check superpowers
```

Trạng thái hiện tại:

```text
v6.3
```

Upstream hiện có:

```text
v6.4
```

## Kết quả mong đợi

Hệ thống báo cáo:

```text
Version:
6.3 → 6.4

Added:
+ component A

Changed:
~ writing-plans

Removed:
- legacy-component

Capability impact:
workflow.planning → changed implementation metadata
engineering.testing.tdd → unchanged
```

Không có update nào được áp dụng.

## Requirement liên quan

```text
REQ-UPD-001
REQ-UPD-002
REQ-UPD-003
```

---

# 20. UC-018 — Phát hiện các thay đổi upstream nhạy cảm về security

## Actor

Catalog Maintainer

## Mục tiêu

Review các thay đổi nhạy cảm về security trước khi update.

## Kịch bản

Một upstream package trước đây chứa:

```text
skills
agents
```

Phiên bản mới bổ sung:

```text
hook
MCP server
```

## Kết quả mong đợi

Phân tích update làm nổi bật các bổ sung này.

Ví dụ:

```text
Security-sensitive changes:

+ hook: post-tool-use
+ MCP server: external-service
```

Các thay đổi này nên có thể được review trước khi update distribution lock.

## Requirement liên quan

```text
REQ-UPD-004
REQ-SEC-001
REQ-SEC-004
```

---

# 21. UC-019 — Nâng cấp một publisher một cách có chủ đích

## Actor

Catalog Maintainer

## Mục tiêu

Áp dụng một phiên bản upstream đã được review.

## Điều kiện tiên quyết

`ap update --check` đã được review.

## Kịch bản

Maintainer chạy:

```bash
ap update superpowers
```

## Kết quả mong đợi

Hệ thống update distribution state liên quan.

Các artifact được sinh ra bị ảnh hưởng sẽ được build lại.

Catalog validation và test được chạy trước khi update được chấp nhận.

Lockfile của các project không nên âm thầm thay đổi cho đến khi các project reconcile một cách tường minh với catalog state mới.

---

# 22. UC-020 — Thêm một publisher mới

## Actor

Catalog Maintainer

## Mục tiêu

Tích hợp một upstream ecosystem mới.

## Kịch bản

Một repository mới cung cấp các agent skill hữu ích.

Maintainer thêm publisher metadata:

```text
catalog/publishers/new-publisher.yaml
```

cùng cấu hình source adapter phù hợp.

## Kết quả mong đợi

Hệ thống có thể:

```text
identify the publisher
discover packages
discover components
retain provenance
```

mà không cần thay đổi core domain model.

## Requirement liên quan

```text
REQ-DOM-001
REQ-SRC-001
REQ-SRC-003
REQ-NFR-005
```

---

# 23. UC-021 — Chỉ curate một phần của một publisher lớn

## Actor

Catalog Maintainer

## Mục tiêu

Sử dụng một subset hữu ích của publisher mà không expose mọi thứ.

## Kịch bản

Một upstream repository chứa:

```text
300 skills
70 agents
50 commands
```

Ban đầu project chỉ muốn:

```text
15 skills
4 agents
```

## Kết quả mong đợi

Source discovery có thể nhận diện tất cả các component.

Catalog đã được curate chỉ tham chiếu đến subset đã được phê duyệt.

Việc hỗ trợ một publisher không được ngụ ý rằng toàn bộ catalog của nó sẽ được enable.

## Requirement liên quan

```text
REQ-CAT-005
REQ-SRC-004
```

---

# 24. UC-022 — Map các component khác nhau vào một capability

## Actor

Catalog Maintainer

## Mục tiêu

Chuẩn hóa thuật ngữ khác nhau giữa các publisher.

## Kịch bản

Các publisher expose:

```text
test-driven-development
tdd
tdd-workflow
```

Maintainer map cả ba vào:

```text
engineering.testing.tdd
```

## Kết quả mong đợi

Profile và preset chỉ tham chiếu đến canonical capability.

Thuật ngữ riêng của từng publisher được cô lập bên trong catalog mapping.

## Requirement liên quan

```text
REQ-DOM-004
REQ-DOM-005
REQ-CAP-001
```

---

# 25. UC-023 — Thêm một native capability

## Actor

Project Maintainer / Catalog Maintainer

## Mục tiêu

Tạo một capability chưa được các external source cung cấp đầy đủ.

## Kịch bản

Project muốn có một:

```text
knowledge.obsidian.atomic-notes
```

implementation chuyên biệt.

Một native plugin được tạo trong:

```text
plugins/native/second-brain/
```

## Kết quả mong đợi

Native component:

1. nhận first-party provenance,
2. được map vào một canonical capability,
3. tham gia vào quá trình resolution thông thường,
4. có thể cạnh tranh với các external implementation nếu phù hợp.

## Requirement liên quan

```text
REQ-NAT-001
REQ-NAT-002
REQ-PRV-003
```

---

# 26. UC-024 — Thay thế một external implementation bằng một native implementation

## Actor

Catalog Maintainer

## Mục tiêu

Sử dụng một first-party implementation trong khi vẫn giữ nguyên cùng một semantic capability.

## Kịch bản

Trước đây:

```text
knowledge.synthesis
→ Publisher A
```

Một native implementation mới trở thành lựa chọn ưu tiên.

Capability mapping thay đổi thành:

```text
knowledge.synthesis
→ agent-plugins/native-synthesis
```

## Kết quả mong đợi

Profile và project manifest vẫn giữ nguyên.

Chỉ có implementation mapping và các lockfile sau đó thay đổi.

Điều này kiểm chứng tính độc lập với publisher.

---

# 27. UC-025 — Target không hỗ trợ một capability

## Actor

Developer

## Mục tiêu

Nhận được warning hoặc error tường minh khi tính portable chưa đầy đủ.

## Kịch bản

Project yêu cầu:

```text
workflow.some-special-hook
```

nhưng runtime được chọn không hỗ trợ primitive cần thiết.

## Kết quả mong đợi

Hệ thống báo cáo:

```text
Unsupported capability:
workflow.some-special-hook

Target:
<runtime>

Reason:
required component type not supported
```

Hệ thống không được âm thầm giả vờ rằng capability đang khả dụng.

## Requirement liên quan

```text
REQ-TGT-003
REQ-TGT-005
REQ-MRT-004
```

---

# 28. UC-026 — Project multi-runtime trong tương lai

## Actor

Developer

## Mục tiêu

Sử dụng một semantic project configuration trên nhiều runtime target.

## Kịch bản

Một project trong tương lai cấu hình:

```yaml
targets:
  - claude-code
  - codex
```

Các semantic capability được yêu cầu vẫn giữ nguyên.

## Kết quả mong đợi

Resolver có thể chọn implementation khác nhau cho từng target khi cần thiết.

Về mặt khái niệm:

```text
engineering.testing.tdd

├── Claude Code
│   └── implementation A
│
└── Codex
    └── implementation B
```

Intent vẫn portable ngay cả khi hành vi của runtime không hoàn toàn giống nhau.

## Mức độ ưu tiên

Sau V1 / kiểm chứng kiến trúc.

## Requirement liên quan

```text
REQ-MRT-001
REQ-MRT-003
REQ-MRT-004
```

---

# 29. UC-027 — Policy cho môi trường cá nhân và công việc

## Actor

Developer

## Mục tiêu

Sử dụng các trust boundary khác nhau trong các context khác nhau.

## Kịch bản

Các project cá nhân sử dụng:

```yaml
policy: personal
```

cho phép:

```text
curated
community
experimental components
```

Các project công việc sử dụng:

```yaml
policy: strict
```

chỉ cho phép:

```text
first-party
official
curated
```

và hạn chế external hook.

## Kết quả mong đợi

Cùng một profile và preset có thể được resolve khác nhau dưới các policy khác nhau.

Những khác biệt đó phải tường minh và giải thích được.

## Requirement liên quan

```text
REQ-POL-001
REQ-POL-002
REQ-POL-003
REQ-POL-005
```

---

# 30. UC-028 — Team chuẩn hóa một security preset dùng chung

## Actor

Team Maintainer

## Mục tiêu

Đảm bảo nhiều project cùng chia sẻ các yêu cầu security capability nhất quán.

## Kịch bản

Team định nghĩa:

```text
engineering/security
```

và yêu cầu các project compose nó.

Ngoài ra, các project có thể dùng các profile khác nhau:

```text
frontend-engineer
backend-engineer
platform-engineer
```

## Kết quả mong đợi

Tất cả các project tham gia đều nhận được cùng một bộ semantic security requirement, trong khi resolver chọn các implementation tương thích với target.

## Requirement liên quan

```text
REQ-TEAM-002
REQ-PRE-003
```

---

# 31. UC-029 — Team giới hạn publisher

## Actor

Organization Maintainer

## Mục tiêu

Ngăn các project resolve dựa trên các publisher chưa được phê duyệt.

## Kịch bản

Policy của tổ chức cho phép:

```text
first-party
official
approved curated publishers
```

nhưng từ chối:

```text
community
untrusted
```

## Kết quả mong đợi

Các project không thể vượt qua policy thông qua implementation priority cao hơn.

Các capability bắt buộc không được hỗ trợ sẽ thất bại với thông tin chẩn đoán rõ ràng.

## Mức độ ưu tiên

Chủ yếu sau V1, nhưng policy model phải hỗ trợ khái niệm này.

---

# 32. UC-030 — Tìm kiếm theo capability

## Actor

Developer

## Mục tiêu

Tìm chức năng mà không cần biết tên publisher.

## Kịch bản

Người dùng chạy:

```bash
ap search tdd
```

## Kết quả mong đợi

Kết quả có thể bao gồm:

```text
Capability:
engineering.testing.tdd

Preset:
engineering/testing

Implementations:
Superpowers / test-driven-development
Matt Pocock / tdd
ECC / tdd-workflow
```

Semantic capability nên được hiển thị trước các chi tiết implementation thô.

## Requirement liên quan

```text
REQ-CLI-005
```

---

# 33. UC-031 — Tìm kiếm theo stack

## Actor

Developer

## Mục tiêu

Tìm các preset có thể tái sử dụng cho một technology stack.

## Kịch bản

```bash
ap search nextjs
```

## Kết quả mong đợi

Người dùng có thể khám phá:

```text
Preset:
stacks/nextjs

Related capabilities:
frontend.react
frontend.nextjs
...
```

và sau đó thêm nó vào project.

---

# 34. UC-032 — Kiểm tra desired state so với actual state

## Actor

Developer

## Mục tiêu

Hiểu việc đồng bộ hóa sẽ thay đổi những gì.

## Kịch bản

Người dùng chạy:

```bash
ap diff
```

## Output mong đợi

```text
Desired vs Actual

+ security-reviewer

~ superpowers
  6.3 → 6.4

- stale-plugin
```

`diff` không áp dụng bất kỳ thay đổi nào.

## Requirement liên quan

```text
REQ-CLI-007
REQ-SYNC-001
```

---

# 35. UC-033 — Chẩn đoán một environment bị hỏng

## Actor

Developer

## Mục tiêu

Xác định vì sao agent environment của project không hợp lệ.

## Kịch bản

Người dùng chạy:

```bash
ap doctor
```

Project gặp phải:

```text
missing package
stale lockfile
unsupported target capability
```

## Kết quả mong đợi

Hệ thống báo cáo riêng từng vấn đề, kèm theo gợi ý khắc phục khi khả thi.

Ví dụ:

```text
✗ Lockfile is stale
  Run: ap sync

✗ Package unavailable
  publisher-x/package-y

✗ Unsupported capability
  target does not support external hook
```

## Requirement liên quan

```text
REQ-CLI-008
REQ-VAL-005
REQ-NFR-008
```

---

# 36. UC-034 — Tham chiếu preset không hợp lệ

## Actor

Developer

## Mục tiêu

Nhận được lỗi ngay lập tức khi configuration không hợp lệ.

## Kịch bản

Project manifest chứa:

```yaml
presets:
  - stacks/nonexistent
```

## Kết quả mong đợi

Validation thất bại trước khi cài đặt.

Ví dụ:

```text
Unknown preset:
stacks/nonexistent
```

## Requirement liên quan

```text
REQ-VAL-002
REQ-VAL-005
```

---

# 37. UC-035 — Vòng lặp dependency giữa các preset

## Actor

Preset Maintainer

## Mục tiêu

Ngăn chặn các composition graph không hợp lệ.

## Kịch bản

```text
Preset A
→ Preset B

Preset B
→ Preset C

Preset C
→ Preset A
```

## Kết quả mong đợi

Catalog validation thất bại.

Toàn bộ vòng lặp nên được hiển thị.

Ví dụ:

```text
Preset dependency cycle:

A → B → C → A
```

## Requirement liên quan

```text
REQ-PRE-004
REQ-VAL-003
```

---

# 38. UC-036 — Capability ID bị trùng lặp

## Actor

Catalog Maintainer

## Mục tiêu

Ngăn chặn các định nghĩa canonical capability mơ hồ.

## Kịch bản

Hai manifest cùng định nghĩa:

```text
engineering.testing.tdd
```

## Kết quả mong đợi

Catalog validation thất bại trước khi generation hoặc resolution diễn ra.

## Requirement liên quan

```text
REQ-VAL-004
```

---

# 39. UC-037 — External executable hook cần được review

## Actor

Developer

## Mục tiêu

Tránh âm thầm enable các hành vi thực thi từ bên ngoài.

## Kịch bản

Một implementation chứa một external hook.

Policy hiện tại quy định:

```text
external hooks:
review
```

## Kết quả mong đợi

Component không thể trở nên active nếu chưa thỏa mãn quy trình review bắt buộc.

Resolver nên xác định:

```text
publisher
package
component
hook
source
```

## Requirement liên quan

```text
REQ-POL-003
REQ-POL-004
REQ-SEC-001
REQ-SEC-002
```

---

# 40. UC-038 — Community package được cho phép trong personal policy

## Actor

Individual Developer

## Mục tiêu

Sử dụng một community capability trong môi trường cá nhân ít hạn chế hơn.

## Kịch bản

Policy đang active cho phép:

```text
community
```

Một capability hữu ích chỉ có community implementation.

## Kết quả mong đợi

Implementation đó có thể được chọn nếu tất cả các ràng buộc khác đều được thỏa mãn.

Provenance và trust classification của nó vẫn được hiển thị rõ.

---

# 41. UC-039 — CI kiểm tra configuration

## Actor

Project Maintainer

## Mục tiêu

Ngăn chặn việc merge agent configuration bị hỏng.

## Kịch bản

CI chạy một command không tương tác như:

```bash
ap validate
```

hoặc validation tương đương thông qua CLI.

## Kết quả mong đợi

CI thất bại khi gặp:

```text
invalid schema
unknown capability
broken package reference
dependency cycle
unresolvable required capability
```

Không cần bất kỳ prompt tương tác nào.

## Requirement liên quan

```text
REQ-CLI-010
REQ-VAL-001
REQ-VAL-002
```

---

# 42. UC-040 — CI kiểm chứng reproducibility

## Actor

Project Maintainer

## Mục tiêu

Đảm bảo project resolution không bị drift.

## Kịch bản

CI resolve project dựa trên các input đã được commit.

## Kết quả mong đợi

Kết quả được sinh ra khớp với lock state đã được commit.

Các thay đổi không mong muốn sẽ khiến bước kiểm tra thất bại.

## Requirement liên quan

```text
REQ-TST-003
REQ-LOCK-005
```

---

# 43. UC-041 — Sinh các artifact dành riêng cho runtime

## Actor

Developer

## Mục tiêu

Materialize environment đã được resolve cho Claude Code.

## Kịch bản

Resolver tạo ra resolved state nội bộ.

Claude Code target adapter nhận state đó.

## Kết quả mong đợi

Adapter tạo ra các native runtime artifact cần thiết mà không làm thay đổi semantic domain model.

Về mặt khái niệm:

```text
Resolution
    ↓
Claude Code Adapter
    ↓
Claude-native configuration
```

## Requirement liên quan

```text
REQ-TGT-001
REQ-TGT-002
REQ-TGT-004
```

---

# 44. UC-042 — Sinh lại các derived catalog artifact

## Actor

Catalog Maintainer

## Mục tiêu

Build lại các index được sinh ra từ canonical metadata.

## Kịch bản

Maintainer sửa đổi:

```text
catalog/
presets/
profiles/
```

và chạy quá trình generation.

## Kết quả mong đợi

Các artifact như:

```text
component indexes
search indexes
marketplace manifests
```

được sinh lại.

Việc xóa các file được sinh ra này rồi sinh lại chúng không được làm mất thông tin.

## Requirement liên quan

```text
REQ-GEN-001
REQ-GEN-002
REQ-GEN-003
```

---

# 45. UC-043 — Phát hiện drift của generated artifact

## Actor

Maintainer / CI

## Mục tiêu

Đảm bảo các generated artifact luôn đồng bộ với source metadata.

## Kịch bản

Một catalog file thay đổi nhưng các generated artifact không được build lại.

CI chạy:

```text
generate
+
git diff --exit-code
```

## Kết quả mong đợi

CI thất bại và báo cáo generated drift.

## Requirement liên quan

```text
REQ-GEN-004
```

---

# 46. UC-044 — Runtime state được quản lý và thủ công cùng tồn tại

## Actor

Developer

## Mục tiêu

Cho phép `agent-plugins` quản lý state của riêng nó mà không vô tình xóa các tooling được cấu hình thủ công không liên quan.

## Kịch bản

Runtime chứa:

```text
agent-plugins-managed plugin A
agent-plugins-managed plugin B
manually installed plugin C
```

Project configuration không còn yêu cầu plugin B.

## Kết quả mong đợi

Sync có thể xóa hoặc deactivate B.

Nó không được tự động xóa C nếu C nằm ngoài ranh giới managed state.

## Requirement liên quan

```text
REQ-SYNC-004
```

---

# 47. UC-045 — Một publisher thay đổi cấu trúc nội bộ

## Actor

Catalog Maintainer

## Mục tiêu

Thích ứng với các thay đổi từ upstream mà không cần sửa đổi toàn bộ domain model.

## Kịch bản

Một upstream publisher thay đổi:

```text
folder structure
manifest layout
component discovery mechanism
```

nhưng các semantic capability của nó vẫn giữ nguyên.

## Kết quả mong đợi

Source adapter được cập nhật.

Profile, preset và capability ID vẫn được giữ nguyên ở mức tối đa có thể.

Điều này kiểm chứng ranh giới của source adapter.

---

# 48. UC-046 — Một runtime thay đổi định dạng configuration

## Actor

Maintainer

## Mục tiêu

Thích ứng với các thay đổi của target runtime mà không cần thiết kế lại các khái niệm cốt lõi.

## Kịch bản

Claude Code thay đổi một phần định dạng native plugin configuration của nó.

## Kết quả mong đợi

Claude Code target adapter được cập nhật.

Những thành phần sau vẫn ổn định:

```text
capabilities
presets
profiles
project intent
```

Điều này kiểm chứng ranh giới của target adapter.

---

# 49. UC-047 — Publisher implementation bị gỡ bỏ

## Actor

Catalog Maintainer

## Mục tiêu

Hiểu tác động của việc upstream gỡ bỏ một component.

## Kịch bản

Implementation được ưu tiên hiện tại của:

```text
engineering.debugging
```

bị gỡ bỏ ở upstream.

## Kết quả mong đợi

Phân tích update xác định:

```text
removed component
affected capability
available alternatives
affected profiles/presets
```

Nếu tồn tại một implementation hợp lệ khác, catalog maintainer có thể chủ động promote nó.

Nếu không có implementation nào, validation nên chỉ ra capability chưa được resolve.

---

# 50. UC-048 — Implementation được ưu tiên thay đổi

## Actor

Catalog Maintainer

## Mục tiêu

Thay đổi publisher implementation mà không thay đổi intent của bên sử dụng.

## Kịch bản

Mapping hiện tại:

```text
engineering.architecture
→ Publisher A
```

Quyết định curate mới:

```text
engineering.architecture
→ Publisher B
```

## Kết quả mong đợi

Các profile tiếp tục tham chiếu đến:

```text
engineering.architecture
```

Các project không cần thay đổi manifest.

Các project chỉ nhận implementation mới khi resolution/lock state của chúng được update một cách có chủ đích.

---

# 51. UC-049 — Profile sử dụng các preset dùng chung

## Actor

Profile Maintainer

## Mục tiêu

Tái sử dụng các tập capability mà không bị trùng lặp.

## Kịch bản

Cả:

```text
frontend-engineer
backend-engineer
```

đều yêu cầu:

```text
workflow/core
engineering/core
```

## Kết quả mong đợi

Các capability này được định nghĩa một lần trong các preset có thể tái sử dụng.

Các profile compose chúng thay vì lặp lại danh sách capability.

---

# 52. UC-050 — Resolution environment tối thiểu

## Actor

Developer

## Mục tiêu

Tránh cài đặt package không cần thiết.

## Kịch bản

Profile và preset được chọn chỉ yêu cầu:

```text
planning
TDD
debugging
frontend design
```

Một publisher package expose nhiều capability không liên quan.

## Kết quả mong đợi

Khi packaging model của target/publisher cho phép, chỉ những component được yêu cầu mới nên trở nên active.

Nếu đơn vị cài đặt nhất thiết phải chứa thêm các component không active, hệ thống nên phân biệt:

```text
installed package
```

với:

```text
active/resolved capabilities
```

Resolver không nên chủ động kích hoạt các capability không liên quan.

## Requirement liên quan

```text
REQ-RES-009
```

---

# 53. UC-051 — Package chứa nhiều component được yêu cầu

## Actor

Resolver

## Mục tiêu

Tránh cài đặt dư thừa cùng một package.

## Kịch bản

Ba capability được resolve vào các component nằm trong:

```text
superpowers
```

## Kết quả mong đợi

Package nên được cài đặt một lần.

Nhiều component được chọn có thể tham chiếu đến cùng một package.

Về mặt khái niệm:

```text
Capability A ─┐
Capability B ─┼→ Package X
Capability C ─┘
```

Package resolution phải hoạt động tách biệt với capability selection.

---

# 54. UC-052 — Cùng một package cung cấp cả component được chọn và bị suppress

## Actor

Resolver

## Mục tiêu

Phân biệt việc cài đặt package với việc kích hoạt component.

## Kịch bản

Package X chứa:

```text
TDD implementation
debugging implementation
planning implementation
```

Resolver chọn:

```text
debugging
planning
```

nhưng TDD thuộc quyền sở hữu của một publisher khác.

## Kết quả mong đợi

Package X có thể vẫn cần được cài đặt cho debugging và planning.

Tuy nhiên, TDD component của nó không được coi là implementation đang active của:

```text
engineering.testing.tdd
```

Đây là lý do then chốt khiến model phân biệt:

```text
Package
```

với:

```text
Component
```

---

# 55. UC-053 — Project override một implementation một cách tường minh

## Actor

Advanced User / Project Maintainer

## Mục tiêu

Chọn một implementation không phải mặc định cho một project cụ thể.

## Kịch bản

Implementation mặc định là:

```text
engineering.testing.tdd
→ Superpowers
```

Một project cần một cách tường minh:

```text
Matt Pocock TDD
```

## Kết quả mong đợi

Project có thể cung cấp một override tường minh nếu policy cho phép.

Lựa chọn thu được phải:

```text
visible
locked
explainable
```

Capability mapping toàn cục nên được giữ nguyên.

## Mức độ ưu tiên

P1/P2 tùy thuộc vào phạm vi V1.

---

# 56. UC-054 — Project vô hiệu hóa một capability được kế thừa

## Actor

Developer

## Mục tiêu

Loại bỏ một capability được kế thừa từ profile hoặc preset.

## Kịch bản

Một profile thường bao gồm:

```text
browser testing
```

nhưng một project cụ thể không cần nó.

Project cấu hình một lệnh disable capability tường minh.

## Kết quả mong đợi

Capability bị loại bỏ khỏi desired state, trừ khi một dependency không tùy chọn khác yêu cầu nó.

Hệ thống nên có khả năng giải thích cả:

```text
where it came from
```

và:

```text
why it was disabled
```

---

# 57. UC-055 — Capability bắt buộc không thể bị vô hiệu hóa

## Actor

Developer

## Mục tiêu

Tránh tạo ra một environment thiếu nhất quán về mặt nội tại.

## Kịch bản

Người dùng cố gắng disable:

```text
capability B
```

nhưng capability đã được chọn:

```text
capability A
```

yêu cầu B như một hard dependency.

## Kết quả mong đợi

Hệ thống nên từ chối configuration hoặc yêu cầu loại bỏ capability phụ thuộc trước.

Nó không được tạo ra một graph không hợp lệ.

---

# 58. UC-056 — Liệt kê environment đang active

## Actor

Developer

## Mục tiêu

Xem agent environment đã được resolve hiện tại.

## Kịch bản

Người dùng chạy:

```bash
ap list
```

## Kết quả mong đợi

Output nên ưu tiên thông tin semantic.

Ví dụ:

```text
Profile
frontend-engineer

Presets
workflow/core
engineering/core
stacks/nextjs

Capabilities
workflow.planning
engineering.testing.tdd
engineering.debugging
frontend.design

Packages
superpowers
frontend-design
...
```

Người dùng nên có khả năng hiểu cả intent ở mức cao lẫn implementation bên dưới.

---

# 59. UC-057 — Sử dụng Agent Plugins mà không cần hosted service

## Actor

Individual Developer

## Mục tiêu

Sử dụng toàn bộ core workflow ở local.

## Kịch bản

Người dùng có:

```text
repository catalog
CLI
project manifest
lockfiles
```

nhưng không có tài khoản hay hosted registry.

## Kết quả mong đợi

Các chức năng cốt lõi vẫn khả dụng:

```text
init
validate
resolve
sync
diff
doctor
explain
```

tùy thuộc vào khả năng sẵn có của các external package source cần thiết.

## Requirement liên quan

```text
REQ-NFR-002
REQ-TEAM-003
```

---

# 60. UC-058 — Core resolution không cần LLM

## Actor

Developer / CI

## Mục tiêu

Resolve environment một cách deterministic mà không cần gọi AI model.

## Kịch bản

CI thực thi project resolution.

## Kết quả mong đợi

Hệ thống resolve:

```text
presets
capabilities
policy
implementations
versions
lockfile
```

bằng logic chương trình deterministic.

Không cần bất kỳ LLM call nào.

Điều này đảm bảo reproducibility và hành vi cốt lõi có thể hoạt động offline.

---

# 61. Ma trận bao phủ use case

Ma trận sau tóm tắt các lĩnh vực chính được các use case kiểm chứng.

| Lĩnh vực | Use case tiêu biểu |
|---|---|
| Profile | UC-001, UC-002, UC-003, UC-004 |
| Project composition | UC-005, UC-006 |
| Capability resolution | UC-007, UC-008, UC-011 |
| Policy | UC-009, UC-010, UC-027 |
| Khả năng giải thích | UC-012, UC-013 |
| Reproducibility | UC-014, UC-015, UC-040 |
| Lockfile drift | UC-016 |
| Update | UC-017, UC-018, UC-019 |
| Tích hợp publisher | UC-020, UC-021, UC-045 |
| Chuẩn hóa capability | UC-022 |
| Native plugin | UC-023, UC-024 |
| Tương thích target | UC-025, UC-026, UC-046 |
| Quản trị team | UC-028, UC-029 |
| Discovery | UC-030, UC-031 |
| Chẩn đoán | UC-032, UC-033 |
| Validation | UC-034, UC-035, UC-036 |
| Security | UC-037, UC-038 |
| CI | UC-039, UC-040 |
| Target generation | UC-041 |
| Generated artifact | UC-042, UC-043 |
| Managed state | UC-044 |
| Sự thay đổi của publisher | UC-047, UC-048 |
| Tái sử dụng composition | UC-049 |
| Environment tối thiểu | UC-050 |
| Phân biệt package/component | UC-051, UC-052 |
| Override | UC-053, UC-054, UC-055 |
| Kiểm tra | UC-056 |
| Local-first | UC-057 |
| Core deterministic | UC-058 |

---

# 62. Các use case quan trọng cho V1

Các use case sau được coi là quan trọng để kiểm chứng V1:

```text
UC-001  Frontend project initialization

UC-002  Backend project initialization

UC-003  Second Brain profile

UC-004  Product Manager profile

UC-007  Exclusive capability conflict resolution

UC-009  Policy filters implementation

UC-010  Required capability becomes unresolvable

UC-012  Explain resolution

UC-014  Reproduce environment

UC-015  Idempotent sync

UC-016  Detect manifest/lock drift

UC-017  Check publisher update

UC-020  Add publisher

UC-022  Normalize multiple publisher implementations

UC-023  Native capability

UC-025  Unsupported target capability

UC-033  Diagnose broken environment

UC-035  Detect dependency cycle

UC-037  Security-sensitive component policy

UC-039  CI validation

UC-041  Claude Code materialization

UC-050  Minimal environment resolution

UC-051  Package deduplication
```

Các use case khác có thể được implement sau, nhưng kiến trúc không nên khiến chúng trở nên khó khăn một cách không cần thiết.

---

# 63. Hành trình nghiệm thu chính của V1

Kịch bản kiểm chứng end-to-end mạnh nhất cho V1 là:

```text
Frontend Engineer
        ↓
Next.js Project
        ↓
Select Profile
        ↓
Add Project Presets
        ↓
Resolve Capabilities
        ↓
Detect TDD overlap
        ↓
Apply Policy
        ↓
Select Implementations
        ↓
Deduplicate Packages
        ↓
Generate Lockfile
        ↓
Materialize Claude Code
        ↓
Explain Resolution
        ↓
Run Sync Again
        ↓
No Changes
```

Nếu hành trình này hoạt động deterministic và có thể test đầy đủ, kiến trúc cốt lõi là khả thi.

---

# 64. Hành trình kiểm chứng xuyên domain

Một kịch bản kiểm chứng quan trọng thứ hai là:

```text
Second Brain
      ↓
Research
Writing
Synthesis
Obsidian
      ↓
Resolve capabilities
      ↓
Use native + external publishers
      ↓
No unrelated engineering workflows
      ↓
Generate reproducible environment
```

Điều này kiểm chứng rằng model thực sự hướng theo capability, chứ không phải vô tình chỉ được thiết kế cho coding agent.

---

# 65. Nguyên tắc thiết kế use case

Các use case nên tiếp tục tuân theo những nguyên tắc sau:

```text
describe user intent before implementation

capabilities before publishers

profiles before plugin lists

explicit failure over hidden fallback

policy before priority

reproducibility over latest

explainability over magic

composition over specialization explosion
```

---

# 66. Use case trong một câu

> **`agent-plugins` nên cho phép những người dùng khác nhau mô tả role và nhu cầu project của họ, sau đó resolve một cách deterministic tập agent capability nhỏ nhất tuân thủ policy, đồng thời giữ cho mọi quyết định quan trọng đều có thể giải thích và tái tạo được.**