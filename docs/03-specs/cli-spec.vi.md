# Đặc tả CLI

**Trạng thái:** Bản nháp  
**Phiên bản:** 0.1.0  
**Cập nhật lần cuối:** 2026-09-21

---

# 1. Mục đích

Tài liệu này định nghĩa giao diện dòng lệnh (command-line interface) cho hệ thống Agent Plugins.

CLI là giao diện chính hướng tới con người và tự động hóa, dùng để:

- khám phá package;
- quản lý cấu hình project;
- chọn Profile và Preset;
- resolve dependency;
- đánh giá policy;
- tạo và cập nhật lockfile;
- render artifact gốc của target (target-native) thông qua adapter;
- cài đặt các artifact được sinh ra;
- cập nhật các nguồn bên ngoài;
- validate trạng thái repository;
- kiểm tra các quyết định resolution;
- chẩn đoán các vấn đề của môi trường.

CLI MUST luôn là một lớp điều phối (orchestration) mỏng nằm trên core domain.

```text
User / CI / Script
        │
        ▼
┌─────────────────┐
│       CLI       │
└────────┬────────┘
         │
         ▼
┌────────────────────────────┐
│      Application API       │
├────────────────────────────┤
│ Catalog                    │
│ Resolver                   │
│ Policy Engine              │
│ Lockfile                   │
│ Adapter Engine             │
│ Update Engine              │
│ Validation                 │
└──────────────┬─────────────┘
               │
               ▼
        Domain / Storage
```

CLI MUST NOT trở thành nơi hiện thực các quy tắc nghiệp vụ cốt lõi.

---

# 2. Nguyên tắc thiết kế

CLI tuân theo các nguyên tắc sau:

1. **CLI mỏng, core phong phú**
2. **Command hướng theo ý định (intent)**
3. **An toàn theo mặc định**
4. **Hành vi deterministic**
5. **UX tương tác thân thiện với con người**
6. **Thân thiện với tự động hóa bằng máy**
7. **Có thể kiểm tra trước khi thay đổi**
8. **Thao tác phá hủy phải tường minh**
9. **Command có thể kết hợp (composable)**
10. **Exit code ổn định**
11. **Output có cấu trúc ổn định**
12. **Không có resolution ẩn**
13. **Không có thao tác mạng ẩn**
14. **Ưu tiên cấu hình thay vì làm CLI phức tạp**
15. **Tiết lộ dần (progressive disclosure)**

CLI SHOULD mang lại trải nghiệm dễ chịu cho:

```text
first-time user
      ↓
daily interactive use
      ↓
advanced automation
      ↓
CI/CD
```

mà không cần tạo các hệ thống command riêng biệt cho từng nhóm người dùng.

---

# 3. Phi mục tiêu

CLI không phải là:

- mô hình dữ liệu chuẩn (canonical data model);
- package resolver;
- policy engine;
- target renderer;
- source adapter;
- package registry;
- một framework viết shell script;
- một package manager đa dụng;
- một sự thay thế cho Git;
- một sự thay thế cho các runtime gốc của target.

Các command MUST ủy thác hành vi domain cho các application service.

---

# 4. Tên executable

Tên executable ban đầu là:

```bash
agent-plugins
```

Ví dụ:

```bash
agent-plugins init
agent-plugins resolve
agent-plugins build
```

Một alias ngắn hơn MAY được giới thiệu sau này.

Các alias khả dĩ:

```text
ap
apl
agentp
```

Alias nằm ngoài hợp đồng (contract) V1.

Tài liệu SHOULD sử dụng executable chuẩn:

```text
agent-plugins
```

---

# 5. Kiến trúc CLI

Kiến trúc khuyến nghị:

```text
CLI
 │
 ├── command parsing
 ├── argument validation
 ├── interaction
 ├── formatting
 ├── progress reporting
 └── exit handling
        │
        ▼
Application Layer
 │
 ├── catalog service
 ├── resolve service
 ├── build service
 ├── install service
 ├── update service
 ├── diagnostics service
 └── configuration service
        │
        ▼
Domain
```

Phần hiện thực command SHOULD có dạng:

```ts
async function run(args: Args) {
  const input = parseInput(args)

  const result = await application.resolve(input)

  return presenter.render(result)
}
```

Chúng SHOULD NOT có dạng:

```ts
async function run(args: Args) {
  // parse manifests
  // traverse dependencies
  // resolve versions
  // evaluate policy
  // modify lockfile
  // render Claude files
}
```

---

# 6. Mô hình command

Cú pháp tổng quát là:

```text
agent-plugins <command> [subcommand] [arguments] [options]
```

Ví dụ:

```bash
agent-plugins catalog list

agent-plugins profile show frontend

agent-plugins resolve --profile frontend

agent-plugins build --target claude

agent-plugins update

agent-plugins doctor
```

Command SHOULD dùng danh từ cho tài nguyên và động từ cho hành động.

---

# 7. Các nhóm command

Cây command V1 khuyến nghị:

```text
agent-plugins
│
├── init
│
├── catalog
│   ├── list
│   ├── search
│   └── show
│
├── package
│   ├── list
│   └── show
│
├── preset
│   ├── list
│   └── show
│
├── profile
│   ├── list
│   └── show
│
├── resolve
│
├── plan
│
├── build
│
├── install
│
├── diff
│
├── validate
│
├── doctor
│
├── lock
│   ├── show
│   └── verify
│
├── update
│
├── adapter
│   ├── list
│   ├── show
│   └── capabilities
│
├── source
│   ├── list
│   ├── show
│   └── refresh
│
├── cache
│   ├── status
│   ├── clean
│   └── prune
│
├── config
│   ├── get
│   ├── set
│   └── list
│
├── completion
│
└── version
```

Không phải mọi command đều MUST được phát hành trong mốc hiện thực đầu tiên.

---

# 8. Workflow cốt lõi

Workflow phổ biến cho một project SHOULD là:

```text
init
 ↓
inspect catalog
 ↓
select profile / preset
 ↓
resolve
 ↓
plan
 ↓
build
 ↓
diff
 ↓
install
```

Đối với một project đã tồn tại:

```text
update
 ↓
resolve
 ↓
lock
 ↓
build
 ↓
install
```

Về mặt khái niệm:

```bash
agent-plugins init

agent-plugins resolve

agent-plugins plan --target claude

agent-plugins build --target claude

agent-plugins install --target claude
```

---

# 9. `init`

## Mục đích

Khởi tạo cấu hình Agent Plugins bên trong một project.

```bash
agent-plugins init
```

Chế độ tương tác MAY hỏi về:

```text
Project name
Default profile
Target runtimes
Configuration location
Lockfile preference
```

Ví dụ cấu trúc kết quả:

```text
.agent-plugins/
└── config.yaml

agent-plugins.lock
```

Bố cục repository chính xác được định nghĩa bởi `repository-structure.md`.

---

# 10. An toàn khi Init

`init` MUST NOT ghi đè cấu hình hiện có khi chưa có sự cho phép tường minh.

Nếu cấu hình đã tồn tại:

```text
ERROR PROJECT_ALREADY_INITIALIZED
```

Hành vi tường minh khả dĩ:

```bash
agent-plugins init --force
```

`--force` MUST NOT âm thầm phá hủy các file không liên quan.

---

# 11. Khởi tạo không tương tác

Tự động hóa MUST có thể thực hiện được mà không cần prompt.

Ví dụ:

```bash
agent-plugins init \
  --profile frontend \
  --target claude \
  --target codex \
  --yes
```

Các câu hỏi tương tác MUST có tương đương dạng dòng lệnh khi khả thi.

---

# 12. `catalog`

Command `catalog` cung cấp toàn bộ tập package có thể khám phá.

```bash
agent-plugins catalog list
```

Output khả dĩ:

```text
ID                         TYPE       SOURCE
superpowers                plugin     first-party
typescript                 skill      first-party
ecc                        plugin     vendor
frontend-engineering       preset     first-party
```

---

# 13. `catalog search`

Tìm kiếm metadata của catalog.

```bash
agent-plugins catalog search typescript
```

Tìm kiếm MAY xem xét:

- ID;
- tên;
- mô tả;
- tag;
- capability;
- provider;
- loại component.

Ví dụ:

```bash
agent-plugins catalog search \
  --capability testing
```

---

# 14. `catalog show`

Kiểm tra một mục trong catalog.

```bash
agent-plugins catalog show superpowers
```

Output cho con người SHOULD bao gồm:

```text
Identity
Source
Version
Provider
Components
Capabilities
Dependencies
Compatibility
Provenance
```

Output cho máy:

```bash
agent-plugins catalog show superpowers --json
```

---

# 15. `package`

`package` tập trung vào các Package chuẩn thay vì tất cả entity của catalog.

```bash
agent-plugins package list
agent-plugins package show superpowers
```

Nó SHOULD hữu ích khi debug các quan hệ dependency.

---

# 16. `preset`

Kiểm tra các Preset tái sử dụng được.

```bash
agent-plugins preset list

agent-plugins preset show frontend-core
```

Một Preset mô tả các lựa chọn có thể tái sử dụng.

CLI MUST NOT ngụ ý rằng Preset là runtime target.

---

# 17. `profile`

Kiểm tra các Profile.

```bash
agent-plugins profile list

agent-plugins profile show frontend
```

Output SHOULD giải thích sự kế thừa và kết hợp.

Ví dụ:

```text
frontend

Extends:
  engineering-base

Presets:
  web-core
  typescript
  frontend-quality

Packages:
  superpowers

Policies:
  standard
```

---

# 18. Kiểm tra Profile hiệu lực

CLI SHOULD hỗ trợ kiểm tra Profile hiệu lực (effective Profile) sau khi áp dụng kế thừa.

Ví dụ:

```bash
agent-plugins profile show frontend --resolved
```

Điều này trả lời câu hỏi:

> Profile này thực sự đại diện cho cấu hình nào?

Nó MUST NOT thực hiện render qua Target Adapter.

---

# 19. `resolve`

`resolve` tính toán dependency graph chuẩn hiệu lực.

```bash
agent-plugins resolve
```

Với Profile tường minh:

```bash
agent-plugins resolve --profile frontend
```

Resolution MUST sử dụng các quy tắc được định nghĩa bởi `resolution-spec.md`.

---

# 20. Output của Resolve

Output mặc định SHOULD tóm tắt:

```text
Profile: frontend

Packages        12
Skills          34
Agents           7
Commands         5
Hooks            2

Warnings         1
Conflicts        0
```

Chế độ chi tiết:

```bash
agent-plugins resolve --verbose
```

Chế độ cho máy:

```bash
agent-plugins resolve --json
```

---

# 21. Giải thích Resolution

Một trong những tính năng debug CLI quan trọng nhất SHOULD là:

```bash
agent-plugins resolve --explain
```

Ví dụ:

```text
skill:typescript
  selected because:
    profile:frontend
      → preset:web-core
        → plugin:typescript-suite
          → skill:typescript
```

Điều này giúp người dùng hiểu:

> Tại sao component này được cài đặt?

---

# 22. Giải thích một Component cụ thể

CLI SHOULD cuối cùng hỗ trợ:

```bash
agent-plugins resolve --why skill:typescript
```

Ví dụ:

```text
skill:typescript

frontend
└── web-core
    └── typescript-suite
        └── skill:typescript
```

Command bổ trợ khả dĩ trong tương lai:

```bash
agent-plugins resolve --why-not agent:foo
```

---

# 23. Resolution phải thuần túy

`resolve` SHOULD NOT sửa đổi các thư mục runtime của target.

Nó MAY:

- đọc manifest;
- đọc cấu hình project;
- đọc lockfile;
- đánh giá policy;
- tạo một resolution trong bộ nhớ;
- tùy chọn cập nhật lockfile khi được yêu cầu tường minh.

Nó MUST NOT ngầm cài đặt các artifact được sinh ra.

---

# 24. `plan`

`plan` tính toán các thao tác render cho target mà không áp dụng chúng.

```bash
agent-plugins plan --target claude
```

Ví dụ:

```text
Target: claude

CREATE .claude/skills/typescript/SKILL.md
CREATE .claude/agents/code-reviewer.md
UPDATE .claude/settings.json

3 operations
```

Command này là trung tâm của việc vận hành an toàn.

---

# 25. Plan đa target

```bash
agent-plugins plan \
  --target claude \
  --target codex
```

Resolver SHOULD chạy một lần.

Sau đó các target adapter sinh Render Plan một cách độc lập.

---

# 26. `build`

`build` render output gốc của target.

```bash
agent-plugins build --target claude
```

Vị trí output mặc định MAY là:

```text
dist/claude/
```

tùy thuộc vào cấu hình project.

`build` SHOULD NOT cài file vào vị trí project đang hoạt động của target trừ khi được cấu hình tường minh.

---

# 27. Build nhiều target

```bash
agent-plugins build \
  --target claude \
  --target codex \
  --target gemini
```

Kiến trúc:

```text
Profile
   │
   ▼
Resolver
   │
   ▼
Resolved Graph
   ├── Claude Adapter → dist/claude
   ├── Codex Adapter  → dist/codex
   └── Gemini Adapter → dist/gemini
```

---

# 28. Khả năng tái lập của Build

Theo mặc định, build SHOULD sử dụng lockfile.

Về mặt khái niệm:

```bash
agent-plugins build --frozen-lockfile
```

CI SHOULD dùng chế độ frozen theo mặc định.

Một frozen build MUST thất bại nếu trạng thái cấu hình và lockfile không nhất quán.

---

# 29. `install`

`install` áp dụng output đã render vào project hiện tại.

Ví dụ:

```bash
agent-plugins install --target claude
```

Về mặt khái niệm:

```text
resolve
  ↓
policy
  ↓
lock verification
  ↓
adapter validation
  ↓
render plan
  ↓
render
  ↓
apply filesystem operations
```

---

# 30. Xem trước Install

Người dùng SHOULD có thể kiểm tra việc cài đặt trước khi thay đổi:

```bash
agent-plugins install --target claude --dry-run
```

Pipeline khái niệm tương đương:

```text
everything except filesystem mutation
```

---

# 31. Xác nhận Install

Install tương tác MAY yêu cầu xác nhận khi phát hiện thay đổi đáng kể.

Ví dụ:

```text
12 files will be created
3 files will be updated
1 generated file will be removed

Proceed? [Y/n]
```

Những lệnh sau MUST hoạt động không tương tác:

```bash
agent-plugins install --yes
```

---

# 32. Quyền sở hữu file được sinh ra

CLI MUST phân biệt:

```text
files owned by agent-plugins
```

với:

```text
files owned by the user
```

Metadata của file được sinh ra SHOULD giúp xác định được quyền sở hữu.

Installer MUST NOT xóa hoặc ghi đè các file không xác định của người dùng chỉ vì chúng nằm trong một thư mục target.

---

# 33. `diff`

So sánh trạng thái mong muốn với trạng thái được sinh ra hiện tại.

```bash
agent-plugins diff --target claude
```

Output MAY chứa:

```text
+ create
~ update
- remove
= unchanged
```

Ví dụ:

```text
+ .claude/skills/react/SKILL.md
~ .claude/agents/reviewer.md
- .claude/commands/legacy.md
```

---

# 34. Các chế độ Diff

Các chế độ hữu ích MAY bao gồm:

```bash
agent-plugins diff --summary

agent-plugins diff --content

agent-plugins diff --json
```

Chế độ mặc định SHOULD tránh output quá mức.

---

# 35. `validate`

Validate repository chuẩn và cấu hình project.

```bash
agent-plugins validate
```

Validation SHOULD bao quát:

- schema;
- manifest;
- catalog;
- canonical ID;
- reference;
- khai báo dependency;
- ID trùng lặp;
- kế thừa Profile;
- reference tới Preset;
- policy;
- cấu trúc lockfile;
- cấu hình adapter.

---

# 36. Validation theo target

Validation cho một target cụ thể:

```bash
agent-plugins validate --target claude
```

Điều này gọi thêm các kiểm tra tương thích của Target Adapter.

Nó SHOULD NOT ghi output.

---

# 37. Validation nghiêm ngặt

CI MAY sử dụng:

```bash
agent-plugins validate --strict
```

Chế độ strict MAY chuyển một số cảnh báo được chọn thành lỗi.

Policy cảnh báo chính xác MUST deterministic và được ghi lại trong tài liệu.

---

# 38. `doctor`

`doctor` chẩn đoán môi trường cục bộ.

```bash
agent-plugins doctor
```

Nó MAY kiểm tra:

```text
CLI version
Node/runtime version
Project configuration
Lockfile state
Adapter availability
Target runtime availability
Filesystem permissions
Cache state
Schema compatibility
```

Ví dụ:

```text
✓ agent-plugins 0.1.0
✓ configuration found
✓ lockfile valid
✓ Claude adapter available
! Codex runtime not detected
✓ cache healthy
```

---

# 39. Doctor so với Validate

Hai command này có trách nhiệm khác nhau.

```text
validate
    = Is project data/configuration valid?

doctor
    = Is my environment healthy enough to operate?
```

Sự phân biệt này MUST luôn rõ ràng.

---

# 40. `lock`

Kiểm tra và xác minh trạng thái lockfile.

```bash
agent-plugins lock show
```

Ví dụ:

```text
Lockfile version: 1

Packages: 14
Sources: 5
Targets: 2

Generated with:
  agent-plugins 0.1.0
```

---

# 41. Xác minh Lock

```bash
agent-plugins lock verify
```

Nó SHOULD phát hiện:

- schema không hợp lệ;
- sai lệch cấu hình (configuration drift);
- không khớp tính toàn vẹn của source;
- package đã lock không còn khả dụng;
- adapter không tương thích;
- phiên bản lockfile không được hỗ trợ.

---

# 42. Thay đổi Lockfile

Việc thay đổi lockfile SHOULD chủ yếu diễn ra thông qua các command như:

```text
resolve
update
install
```

thay vì các thao tác `lock update` thủ công.

Một command chuyên biệt MAY tồn tại sau này:

```bash
agent-plugins lock regenerate
```

nhưng SHOULD luôn tường minh.

---

# 43. `update`

`update` cập nhật các lựa chọn package/source theo `update-spec.md`.

Ví dụ:

```bash
agent-plugins update
```

Package cụ thể:

```bash
agent-plugins update superpowers
```

Source cụ thể:

```bash
agent-plugins update --source community
```

---

# 44. Xem trước Update

Update SHOULD hỗ trợ:

```bash
agent-plugins update --dry-run
```

Ví dụ:

```text
superpowers
  2.1.0 → 2.2.0

ecc
  a42f01c → b391af2

No files have been changed.
```

---

# 45. Phạm vi Update

Các tùy chọn hữu ích trong tương lai:

```bash
agent-plugins update --patch

agent-plugins update --minor

agent-plugins update --major
```

Ngữ nghĩa chính xác được định nghĩa bởi `update-spec.md`.

CLI MUST NOT tự tạo ra ngữ nghĩa update độc lập.

---

# 46. `adapter`

Kiểm tra các adapter khả dụng.

```bash
agent-plugins adapter list
```

Ví dụ:

```text
TARGET

claude      1.0.0
codex       1.0.0
gemini      0.3.0

SOURCE

local       1.0.0
git         0.5.0
```

---

# 47. Kiểm tra Adapter

```bash
agent-plugins adapter show claude
```

Output SHOULD chứa:

```text
ID
Version
Adapter API version
Type
Capabilities
Configuration
Compatibility
```

---

# 48. Capability của Adapter

```bash
agent-plugins adapter capabilities claude
```

Ví dụ:

```text
skills                 native
agents                 native
commands               native
hooks                  native
project-instructions   native
nested-agents          unsupported
```

Điều này đặc biệt hữu ích khi so sánh hành vi giữa các target.

---

# 49. `source`

Kiểm tra các package source đã cấu hình.

```bash
agent-plugins source list
```

Output khả dĩ:

```text
first-party
vendor
community
github
```

---

# 50. Kiểm tra Source

```bash
agent-plugins source show community
```

Output MAY bao gồm:

```text
Adapter
Location
Revision strategy
Trust level
Cache status
Last refresh
```

---

# 51. Làm mới Source

```bash
agent-plugins source refresh
```

Thao tác này làm mới metadata của source.

Nó SHOULD NOT tự động cập nhật các lựa chọn package đã lock.

Phân biệt quan trọng:

```text
source refresh
    = learn what exists

update
    = change selected versions/revisions
```

---

# 52. `cache`

Các source bên ngoài MAY sử dụng cache cục bộ.

Các command hữu ích:

```bash
agent-plugins cache status

agent-plugins cache clean

agent-plugins cache prune
```

---

# 53. An toàn của Cache

`cache clean` SHOULD NOT thay đổi:

- các source chuẩn;
- cấu hình project;
- các file target được sinh ra;
- lockfile.

Chỉ dữ liệu cache có thể tái tạo mới được phép xóa.

---

# 54. `config`

Kiểm tra cấu hình CLI/project.

Ví dụ:

```bash
agent-plugins config list

agent-plugins config get defaultTarget

agent-plugins config set defaultTarget claude
```

Không phải mọi cấu hình đều nhất thiết SHOULD ghi được thông qua CLI trong V1.

---

# 55. Phạm vi cấu hình

CLI SHOULD phân biệt:

```text
global
workspace
project
command
```

Cú pháp khả dĩ trong tương lai:

```bash
agent-plugins config set \
  defaultTarget claude \
  --global
```

Cấu hình cục bộ của project SHOULD thông thường được ưu tiên hơn các tùy chọn toàn cục.

---

# 56. Thứ tự ưu tiên cấu hình

Thứ tự ưu tiên khuyến nghị:

```text
CLI arguments
      ↓
Environment variables
      ↓
Project configuration
      ↓
Workspace configuration
      ↓
User configuration
      ↓
Built-in defaults
```

Các lớp cao hơn ghi đè các lớp thấp hơn.

Thứ tự ưu tiên này MUST deterministic.

---

# 57. Biến môi trường

Biến môi trường SHOULD dùng một tiền tố ổn định:

```text
AGENT_PLUGINS_
```

Ví dụ:

```text
AGENT_PLUGINS_LOG_LEVEL
AGENT_PLUGINS_CACHE_DIR
AGENT_PLUGINS_CONFIG
AGENT_PLUGINS_NO_COLOR
```

Secret SHOULD NOT được lưu trong cấu hình project thông thường.

---

# 58. Tùy chọn toàn cục

Các tùy chọn toàn cục khuyến nghị:

```text
--help
--version

--config <path>

--profile <id>

--target <id>

--json

--quiet
--verbose

--no-color

--offline

--yes

--dry-run
```

Không phải tùy chọn nào cũng áp dụng cho mọi command.

Command MUST từ chối các tùy chọn vô nghĩa thay vì âm thầm bỏ qua chúng.

---

# 59. `--json`

Output có cấu trúc là bắt buộc cho tự động hóa.

Ví dụ:

```bash
agent-plugins resolve --json
```

Output JSON MUST là JSON hợp lệ.

Nó MUST NOT chứa:

- spinner;
- màu ANSI;
- văn bản tiến trình;
- banner;
- văn xuôi cho con người trước hoặc sau tài liệu JSON.

---

# 60. Hợp đồng Output có cấu trúc

Các phản hồi máy đọc được SHOULD tuân theo một envelope ổn định.

Ví dụ:

```json
{
  "schemaVersion": "cli-output/v1",
  "command": "resolve",
  "success": true,
  "data": {},
  "diagnostics": []
}
```

Dữ liệu riêng của từng command nằm dưới:

```text
data
```

Cảnh báo và lỗi SHOULD sử dụng diagnostic có cấu trúc.

---

# 61. Tiến hóa JSON

Output CLI có cấu trúc MUST được đối xử như một API.

Thay đổi phá vỡ tương thích (breaking change) SHOULD yêu cầu thay đổi phiên bản schema.

Ví dụ:

```text
cli-output/v1
cli-output/v2
```

Output cho con người đọc không mang cùng mức đảm bảo tương thích.

---

# 62. Chế độ Quiet

```bash
agent-plugins build --quiet
```

Chế độ quiet SHOULD ẩn các output tiến trình và thông tin không thiết yếu.

Lỗi vẫn MUST được hiển thị.

---

# 63. Chế độ Verbose

```bash
agent-plugins resolve --verbose
```

Chế độ verbose SHOULD hiển thị các chi tiết vận hành hữu ích.

Nó MUST NOT làm lộ secret.

Một chế độ sâu hơn trong tương lai MAY tồn tại:

```bash
--debug
```

Output debug SHOULD được ghi ra stderr.

---

# 64. Màu sắc

Màu sắc SHOULD được bật cho các terminal tương tác tương thích.

Người dùng MUST có thể tắt nó:

```bash
--no-color
```

CLI SHOULD tôn trọng:

```text
NO_COLOR
```

khi phù hợp.

Output cho máy MUST không bao giờ dựa vào màu sắc để truyền đạt ý nghĩa.

---

# 65. Chế độ tương tác

Các workflow hướng tới con người MAY sử dụng:

- prompt lựa chọn;
- prompt xác nhận;
- danh sách có thể tìm kiếm;
- chỉ báo tiến trình;
- checkbox.

Ví dụ:

```text
Select targets:

◉ Claude
◉ Codex
○ Gemini
○ OpenCode
```

UI tương tác chỉ là lớp trình bày.

Nó MUST tạo ra cùng một application request như request có thể được tạo thông qua flag.

---

# 66. Chế độ không tương tác

CLI MUST hoạt động hoàn toàn mà không cần tương tác TTY.

Môi trường CI MUST NOT bị chặn khi chờ prompt.

Việc phát hiện SHOULD xem xét:

```text
stdin/stdout TTY
CI environment
--yes
explicit non-interactive configuration
```

Khi thiếu input bắt buộc ở chế độ không tương tác, phải thất bại một cách rõ ràng.

---

# 67. Prompt

Prompt MUST có:

- mô tả rõ ràng;
- giá trị mặc định an toàn;
- cảnh báo tường minh cho thao tác phá hủy;
- tương tác truy cập được bằng bàn phím.

Câu trả lời prompt MUST NOT thay đổi ngữ nghĩa domain so với các flag tương đương.

---

# 68. Dry Run

Các command thay đổi trạng thái SHOULD hỗ trợ:

```bash
--dry-run
```

Ví dụ:

```bash
agent-plugins install --dry-run

agent-plugins update --dry-run

agent-plugins cache clean --dry-run
```

Dry run MUST NOT thay đổi trạng thái bền vững.

---

# 69. Chế độ Offline

```bash
agent-plugins build --offline
```

Chế độ offline cấm truy cập mạng.

Nó MAY sử dụng:

- repository cục bộ chuẩn;
- lockfile;
- source cache cục bộ.

Nếu nội dung cần thiết không khả dụng:

```text
ERROR OFFLINE_SOURCE_UNAVAILABLE
```

CLI MUST NOT âm thầm kết nối mạng.

---

# 70. Minh bạch về mạng

Command SHOULD phân biệt rõ ràng các thao tác có khả năng dùng mạng.

Ví dụ dự kiến:

```text
catalog list
    normally local

resolve
    normally local when locked

build
    local

install
    local

source refresh
    network possible

update
    network possible
```

Render target MUST NOT yêu cầu truy cập mạng.

---

# 71. Chỉ báo tiến trình

Các thao tác tương tác chạy lâu MAY hiển thị tiến trình:

```text
Resolving packages...
Fetching sources...
Validating Claude target...
Rendering artifacts...
```

Tiến trình MUST bị tắt đối với:

```text
--json
non-TTY output
```

và SHOULD bị ẩn đối với:

```text
--quiet
```

---

# 72. Logging

Log và output của command là các kênh khác nhau.

Mô hình khuyến nghị:

```text
stdout → requested command result
stderr → diagnostics / logs / progress
```

Điều này cho phép:

```bash
agent-plugins resolve --json > result.json
```

mà không làm hỏng output JSON.

---

# 73. Diagnostic

Mọi lỗi ứng dụng SHOULD cuối cùng được ánh xạ sang diagnostic có cấu trúc.

Ví dụ:

```text
AP_RESOLVE_VERSION_CONFLICT
AP_ADAPTER_UNSUPPORTED_CAPABILITY
AP_MANIFEST_INVALID
AP_LOCK_OUTDATED
AP_SOURCE_UNAVAILABLE
AP_PATH_COLLISION
```

Mã diagnostic SHOULD luôn ổn định.

---

# 74. Định dạng lỗi cho con người

Ví dụ:

```text
Error: Target does not support required capability.

Code:
  AP_ADAPTER_UNSUPPORTED_CAPABILITY

Target:
  codex

Component:
  hook:session-start

Suggestion:
  Remove the hook or choose a compatible target.
```

Lỗi SHOULD giải thích:

```text
what happened
where
why
what the user can do next
```

---

# 75. Exit Code

CLI MUST sử dụng exit code ổn định.

Hợp đồng ban đầu khuyến nghị:

```text
0   Success

1   General failure

2   Invalid CLI usage

3   Configuration error

4   Validation failure

5   Resolution failure

6   Policy rejection

7   Lockfile failure

8   Source failure

9   Adapter failure

10  Filesystem/apply failure
```

Ý nghĩa lỗi cụ thể bổ sung SHOULD chủ yếu dùng mã diagnostic thay vì tạo ra hàng chục exit code cho process.

---

# 76. Cảnh báo

Cảnh báo MUST NOT tạo ra exit code khác 0 theo mặc định.

Ví dụ:

```text
WARNING AP_ADAPTER_CAPABILITY_DEGRADED
```

Chế độ strict MAY nâng cấp cảnh báo:

```bash
agent-plugins validate --strict
```

---

# 77. Xử lý Signal

CLI SHOULD xử lý một cách êm thấm:

```text
SIGINT
SIGTERM
```

Khi bị ngắt giữa một thao tác thay đổi trạng thái, nó SHOULD tránh để lại trạng thái được sinh ra mới áp dụng một phần bất cứ khi nào khả thi.

---

# 78. Áp dụng nguyên tử (Atomic Apply)

Việc cài đặt SHOULD sử dụng hành vi filesystem nguyên tử hoặc giống transaction khi khả thi.

Về mặt khái niệm:

```text
create plan
    ↓
render temporary artifacts
    ↓
validate
    ↓
apply
```

Một lần render thất bại SHOULD NOT để lại cấu hình target được sinh ra dở dang.

---

# 79. Sao lưu

Hệ thống SHOULD thông thường tránh sửa đổi các file mà nó không sở hữu.

Khi sửa đổi một artifact được sinh ra mà hệ thống sở hữu, việc sinh lại được ưu tiên hơn việc tạo bản sao lưu tùy tiện.

Đối với các thao tác ảnh hưởng tới file do người dùng quản lý, cần có các biện pháp bảo vệ tường minh.

Việc tự động tích tụ:

```text
file.bak
file.bak2
file.old
```

SHOULD được tránh.

---

# 80. Tính lũy đẳng (Idempotency)

Các command lặp lại SHOULD có tính lũy đẳng khi áp dụng được.

Ví dụ:

```bash
agent-plugins install --target claude
agent-plugins install --target claude
```

khi không có input nào thay đổi SHOULD tạo ra:

```text
No changes.
```

và không ghi lại file một cách không cần thiết.

---

# 81. Tính deterministic

CLI MUST bảo toàn tính deterministic từ core bên dưới.

Các lệnh sau:

```bash
agent-plugins build --target claude
```

với các yếu tố giống hệt nhau:

```text
configuration
catalog
lockfile
adapter version
source content
```

SHOULD sinh ra các artifact giống hệt nhau.

---

# 82. Phát hiện thư mục làm việc

Khi được thực thi từ một thư mục lồng bên trong:

```text
repo/
├── agent-plugins.yaml
└── apps/
    └── web/
        └── src/
```

việc chạy:

```bash
cd apps/web/src
agent-plugins resolve
```

SHOULD có thể phát hiện được thư mục gốc của project.

Việc phát hiện MUST có các quy tắc ranh giới deterministic.

Nó SHOULD dừng tại:

- thư mục gốc cấu hình;
- thư mục gốc của Git repository;
- thư mục gốc của filesystem;

theo thứ tự ưu tiên được ghi lại trong tài liệu.

---

# 83. Đường dẫn project tường minh

Người dùng SHOULD có thể ghi đè cơ chế phát hiện.

Ví dụ:

```bash
agent-plugins resolve --project /workspace/my-project
```

hoặc một tùy chọn project-root tương đương.

Tên tùy chọn cuối cùng SHOULD nhất quán giữa các command.

---

# 84. Hỗ trợ Monorepo

CLI SHOULD được thiết kế cho việc sử dụng monorepo trong tương lai.

Mô hình khả dĩ:

```text
repository configuration
        │
        ├── app A profile
        ├── app B profile
        └── shared defaults
```

V1 MAY chỉ hỗ trợ một ngữ cảnh project cho mỗi lần gọi.

Mô hình dữ liệu MUST NOT ngăn cản việc hỗ trợ workspace trong tương lai.

---

# 85. Chế độ CI

CLI SHOULD tự động hoạt động một cách thận trọng trong CI.

Các đặc điểm CI khuyến nghị:

```text
no prompts
no spinner
stable output
frozen lockfile
deterministic build
non-zero failure codes
```

Cấu hình tường minh SHOULD ghi đè việc phát hiện tự động khi hợp lý.

---

# 86. Workflow CI khuyến nghị

Ví dụ:

```bash
agent-plugins validate --strict

agent-plugins lock verify

agent-plugins build \
  --target claude \
  --frozen-lockfile

agent-plugins diff --check
```

Ngữ nghĩa khả dĩ của `--check`:

```text
exit non-zero if generated state differs
```

---

# 87. `diff --check`

Cho CI:

```bash
agent-plugins diff --target claude --check
```

Hành vi mong đợi:

```text
0 → generated state is current

non-zero → drift exists
```

Điều này cho phép thực thi ràng buộc trên repository mà không thay đổi file.

---

# 88. Completion

CLI SHOULD cung cấp shell completion.

```bash
agent-plugins completion bash

agent-plugins completion zsh

agent-plugins completion fish
```

Completion MAY bao gồm:

- command;
- flag;
- Profile ID;
- Preset ID;
- Target Adapter ID.

Completion SHOULD NOT yêu cầu truy cập mạng.

---

# 89. Trợ giúp

Mọi command MUST cung cấp:

```bash
--help
```

Ví dụ:

```bash
agent-plugins --help

agent-plugins resolve --help

agent-plugins adapter --help
```

Văn bản trợ giúp SHOULD ngắn gọn và hướng theo tác vụ.

---

# 90. Ví dụ trong phần trợ giúp

Các command quan trọng SHOULD bao gồm ví dụ về cách gọi.

Ví dụ:

```text
Examples:

  agent-plugins resolve --profile frontend

  agent-plugins resolve --profile backend --json
```

Phần trợ giúp SHOULD tránh trở thành tài liệu đầy đủ.

---

# 91. Phiên bản

```bash
agent-plugins version
```

và:

```bash
agent-plugins --version
```

SHOULD hiển thị:

```text
CLI version
Core version
Adapter API version
```

Dạng verbose MAY hiển thị thông tin runtime.

---

# 92. Kiểm tra tương thích

Các phiên bản tương lai MAY hỗ trợ:

```bash
agent-plugins version --verbose
```

Ví dụ:

```text
agent-plugins        1.3.0
core                 1.3.0
adapter API          1

node                 24.x

claude adapter       2.1.0
codex adapter        1.8.0
```

---

# 93. Alias của Command

V1 SHOULD tránh quá nhiều alias.

Ưu tiên:

```bash
agent-plugins catalog list
```

thay vì hỗ trợ nhiều biến thể:

```text
ls
list
l
show-all
packages
pkg-ls
```

Một số ít alias hiển nhiên MAY xuất hiện sau này.

Khả năng khám phá quan trọng hơn việc tiết kiệm vài lần gõ phím.

---

# 94. Định danh tài nguyên

Command SHOULD sử dụng reference chuẩn khi có sự mơ hồ.

Ví dụ:

```text
plugin:superpowers
skill:typescript
agent:code-reviewer
preset:frontend-core
profile:frontend
```

ID ngắn MAY được chấp nhận khi không mơ hồ.

Ví dụ:

```bash
agent-plugins catalog show superpowers
```

Nếu mơ hồ:

```text
ERROR AMBIGUOUS_REFERENCE

Matches:
  plugin:superpowers
  preset:superpowers
```

---

# 95. Chọn Target

Việc chọn target MAY đến từ:

```text
CLI
Project config
Profile
Default config
```

Target được chỉ định tường minh qua CLI có độ ưu tiên cao nhất.

Ví dụ:

```bash
agent-plugins build --target claude
```

Nhiều target:

```bash
agent-plugins build \
  --target claude \
  --target codex
```

---

# 96. Chọn Profile

Tương tự:

```bash
agent-plugins resolve --profile frontend
```

Nếu project định nghĩa:

```yaml
defaultProfile: frontend
```

thì:

```bash
agent-plugins resolve
```

sử dụng Profile đó.

Profile được chọn SHOULD hiển thị trong output verbose hoặc output tóm tắt.

---

# 97. Ghi đè Preset

CLI MAY cuối cùng hỗ trợ việc bổ sung Preset tạm thời:

```bash
agent-plugins resolve \
  --profile frontend \
  --with security
```

Tuy nhiên, V1 SHOULD tránh quá nhiều tính năng kết hợp ở cấp command.

Việc kết hợp bền vững thuộc về cấu hình project.

---

# 98. CLI so với Cấu hình

Một nguyên tắc then chốt:

```text
Configuration
    = persistent intent

CLI arguments
    = invocation-specific intent
```

Ví dụ:

```yaml
defaultProfile: frontend

targets:
  - claude
  - codex
```

nên tránh việc yêu cầu:

```bash
agent-plugins build \
  --profile frontend \
  --target claude \
  --target codex
```

ở mỗi lần gọi.

Command đơn giản hơn trở thành:

```bash
agent-plugins build
```

---

# 99. Ranh giới thay đổi trạng thái

Command có thể được phân loại:

### Chỉ đọc

```text
catalog list
catalog search
catalog show

package list
package show

preset list
preset show

profile list
profile show

resolve

plan

diff

validate

doctor

lock show
lock verify

adapter list
adapter show
adapter capabilities

source list
source show

cache status

config get
config list
```

### Thay đổi trạng thái

```text
init

build
install

update

source refresh

cache clean
cache prune

config set
```

Sự phân biệt này SHOULD được phản ánh trong tài liệu và test.

---

# 100. Minh bạch khi thay đổi trạng thái

Trước một thay đổi đáng kể, CLI SHOULD biết:

```text
what will change
where it will change
who owns those files
whether operation is reversible
```

Thông tin này bắt nguồn từ plan của ứng dụng chứ không phải từ phỏng đoán của CLI.

---

# 101. Bảo mật

CLI MUST:

- validate mọi đường dẫn bên ngoài;
- ngăn chặn path traversal;
- tránh thực thi tùy ý từ metadata của package;
- tránh ghi log secret;
- tôn trọng Policy;
- xác minh tính toàn vẹn của source khi có thể;
- tránh âm thầm thực thi hook trong quá trình khám phá;
- hiển thị rõ ràng nội dung có thể thực thi;
- tránh ghi đè tự động không an toàn.

---

# 102. Mã từ xa

Việc fetch một package MUST NOT ngụ ý thực thi mã từ package đó.

Những việc sau phải luôn tách biệt:

```text
fetch
normalize
validate
resolve
render
execute
```

Bản thân Agent Plugins CLI SHOULD nói chung không thực thi logic runtime do package định nghĩa.

Việc thực thi thuộc về target runtime.

---

# 103. Telemetry

V1 SHOULD NOT yêu cầu telemetry.

Nếu telemetry được đưa vào sau này:

- nó MUST được ghi lại trong tài liệu;
- nó SHOULD bảo vệ quyền riêng tư;
- secret và nội dung package MUST NOT bị thu thập;
- quyền kiểm soát của người dùng MUST tường minh.

Telemetry MUST NOT ảnh hưởng tới hành vi deterministic của command.

---

# 104. Thông báo cập nhật

CLI MAY thông báo cho người dùng rằng đã có phiên bản CLI mới.

Ví dụ:

```text
A newer agent-plugins version is available.
```

Điều này MUST NOT chặn các thao tác bình thường.

Các kiểm tra qua mạng SHOULD bị tắt trong:

```text
offline mode
CI where appropriate
```

và SHOULD có thể cache được.

---

# 105. Kiến trúc Package của CLI

Cấu trúc TypeScript khuyến nghị:

```text
packages/
└── cli/
    ├── src/
    │   ├── commands/
    │   │   ├── init.ts
    │   │   ├── resolve.ts
    │   │   ├── plan.ts
    │   │   ├── build.ts
    │   │   ├── install.ts
    │   │   ├── update.ts
    │   │   └── ...
    │   │
    │   ├── presenters/
    │   │   ├── human/
    │   │   └── json/
    │   │
    │   ├── prompts/
    │   ├── progress/
    │   ├── errors/
    │   └── index.ts
    │
    └── test/
```

Các core service SHOULD nằm bên ngoài `packages/cli`.

---

# 106. Ranh giới Package của Core

Ví dụ:

```text
packages/
├── cli/
├── core/
├── resolver/
├── policy/
├── adapters/
├── catalog/
└── config/
```

hoặc cấu trúc module tương đương.

Cấu trúc package chính xác được định nghĩa bởi `repository-structure.md`.

Quy tắc kiến trúc quan trọng hơn tên package:

```text
CLI → Application/Core

Core -X→ CLI
```

Core MUST NOT phụ thuộc vào các thư viện trình bày của CLI.

---

# 107. Lớp trình bày

Output cho con người và cho máy SHOULD là các presenter riêng biệt.

Ví dụ:

```text
ResolveResult
     │
     ├── HumanPresenter
     │
     └── JsonPresenter
```

Điều này tránh việc logic nghiệp vụ như:

```ts
if (args.json) ...
```

bị rải rác khắp mã domain.

---

# 108. Công nghệ UI tương tác

Nếu phần hiện thực sử dụng:

```text
TypeScript
+
oclif
+
Ink
```

trách nhiệm khuyến nghị là:

```text
oclif
    command discovery
    argument/flag parsing
    help
    completion
    lifecycle

Ink
    optional richer interactive UI

Core packages
    all domain behavior
```

Ink MUST NOT trở thành bắt buộc cho việc sử dụng không tương tác.

Các command đơn giản SHOULD luôn nhẹ.

---

# 109. Output terminal phong phú

CLI MAY sử dụng:

- bảng;
- cây;
- badge;
- ký hiệu;
- chỉ báo tiến trình;
- diagnostic được định dạng.

Ví dụ:

```text
frontend

├─ superpowers
│  ├─ debugging
│  └─ testing
│
├─ typescript
│  └─ strict-types
│
└─ ecc
   └─ code-review
```

Định dạng MUST suy giảm một cách êm thấm trên các terminal hạn chế.

---

# 110. Unicode

Ký hiệu Unicode MAY cải thiện UX tương tác:

```text
✓
✗
!
→
├─
└─
```

Output tương thích ASCII SHOULD khả dụng khi cần thiết.

Output cho máy MUST không phụ thuộc vào các trang trí Unicode.

---

# 111. Thứ tự ổn định

Mọi danh sách của CLI SHOULD sử dụng cách sắp xếp deterministic.

Ví dụ:

```text
catalog list
adapter list
profile list
```

MUST NOT phụ thuộc vào thứ tự liệt kê của filesystem.

Thứ tự SHOULD thông thường là:

```text
explicit declared order
then stable lexical order
```

tùy thuộc vào ngữ nghĩa của tài nguyên.

---

# 112. Phân trang

Catalog cục bộ của V1 nhiều khả năng không cần phân trang.

Nếu catalog từ xa trở nên lớn, phân trang MAY được đưa vào cho các command tương tác.

Output cho máy SHOULD cho phép truy xuất đầy đủ và deterministic khi khả thi.

---

# 113. Xếp hạng tìm kiếm

`catalog search` MAY xếp hạng kết quả.

Việc xếp hạng MUST chỉ ảnh hưởng tới phần trình bày.

Nó MUST NOT ảnh hưởng tới resolution.

Việc lựa chọn của resolver dựa trên ngữ nghĩa dependency tường minh, không dựa trên xếp hạng tìm kiếm.

---

# 114. UX cài đặt Plugin

Một workflow tiện lợi trong tương lai MAY hỗ trợ:

```bash
agent-plugins add plugin:superpowers
```

và:

```bash
agent-plugins remove plugin:superpowers
```

Các command này sẽ thay đổi ý định (intent) bền vững của project.

Tuy nhiên, V1 SHOULD cân nhắc liệu việc chỉnh sửa manifest trực tiếp có phù hợp hơn hay không trước khi cam kết với các API này.

Nếu được hiện thực:

```text
add/remove
```

MUST sửa đổi cấu hình rồi gọi pipeline resolution thông thường.

Chúng MUST NOT sao chép trực tiếp các file target.

---

# 115. `add` trong tương lai

Ngữ nghĩa tiềm năng:

```bash
agent-plugins add superpowers
```

Về mặt khái niệm:

```text
modify project selection
        ↓
resolve
        ↓
update lock
        ↓
show resulting plan
```

Việc cài đặt vẫn tách biệt trừ khi một chế độ tiện lợi tường minh được đưa vào.

---

# 116. `remove` trong tương lai

Ngữ nghĩa tiềm năng:

```bash
agent-plugins remove superpowers
```

CLI MUST hiển thị các tác động lên những thành phần phụ thuộc.

Ví dụ:

```text
Removing plugin:superpowers also removes:

  skill:debugging
  skill:testing
  agent:reviewer
```

Việc dọn dẹp orphan ngầm định SHOULD tuân theo các quy tắc của resolver.

---

# 117. Command tiện lợi

Cách viết tắt trong tương lai MAY tồn tại:

```bash
agent-plugins sync
```

Về mặt khái niệm:

```text
resolve
→ update lock if allowed
→ build
→ install
```

Tuy nhiên, các command tiện lợi MUST luôn là sự kết hợp của các primitive hiện có.

Chúng MUST NOT đưa vào ngữ nghĩa mới.

---

# 118. Khuyến nghị về `sync`

V1 SHOULD trì hoãn `sync` cho tới khi các primitive riêng lẻ ổn định.

Người dùng trước tiên nên có mô hình tư duy rõ ràng về:

```text
resolve
build
install
update
```

Sau khi các ngữ nghĩa đó ổn định, `sync` có thể điều phối chúng một cách an toàn.

---

# 119. Độ ổn định của Command

Command SHOULD được phân loại nội bộ:

```text
stable
experimental
deprecated
```

Các command thử nghiệm SHOULD được đánh dấu rõ ràng.

Việc phá vỡ cú pháp CLI ổn định SHOULD tuân theo các quy tắc semantic versioning.

---

# 120. Ngừng hỗ trợ (Deprecation)

Các command bị deprecate SHOULD:

1. tiếp tục hoạt động trong một khoảng thời gian xác định;
2. hiển thị thông báo migration;
3. chỉ tới command thay thế;
4. cuối cùng chỉ bị loại bỏ trong một bản phát hành breaking phù hợp.

Ví dụ:

```text
`agent-plugins render` is deprecated.

Use:
  agent-plugins build
```

---

# 121. Tương thích API của CLI

CLI cung cấp ba bề mặt tương thích:

```text
1. command syntax
2. exit codes
3. structured output
```

Định dạng cho con người MAY tiến hóa tự do hơn.

Tự động hóa SHOULD dựa vào:

```text
--json
diagnostic codes
documented exit codes
```

thay vì phân tích văn bản dành cho con người.

---

# 122. Chiến lược kiểm thử

Test của CLI SHOULD bao gồm:

### Unit test

```text
argument parsing
presenters
diagnostic formatting
configuration precedence
```

### Command test

```text
resolve
build
install
update
```

### Integration test

```text
CLI → core → adapter → filesystem
```

### Snapshot test

Hữu ích cho output dành cho con người đọc.

### Contract test

Bắt buộc cho output JSON và exit code.

---

# 123. Fixture của CLI

Các fixture khuyến nghị:

```text
tests/
└── fixtures/
    ├── empty-project/
    ├── basic-project/
    ├── frontend-profile/
    ├── conflict/
    ├── outdated-lock/
    ├── unsupported-target/
    └── multi-target/
```

Test SHOULD sử dụng các thư mục tạm cô lập.

---

# 124. Test workflow chuẩn (Golden Workflow)

Các workflow đầy đủ quan trọng SHOULD được kiểm thử.

Ví dụ:

```text
init
 ↓
resolve
 ↓
build
 ↓
install
 ↓
diff
```

Kết quả cuối cùng mong đợi:

```text
diff = clean
```

---

# 125. Hiệu năng

Các command cục bộ phổ biến SHOULD có cảm giác phản hồi tức thì.

Các ưu tiên về hiệu năng:

```text
catalog inspection
configuration loading
resolution
validation
incremental build
```

Các thao tác mạng SHOULD hiển thị tiến trình tách biệt với tính toán cục bộ.

---

# 126. Lazy Loading

Các dependency nặng SHOULD chỉ được nạp bởi những command cần đến chúng.

Ví dụ:

```text
catalog show
```

SHOULD NOT khởi tạo:

```text
all target adapters
interactive UI runtime
network clients
```

trừ khi cần thiết.

---

# 127. Caching

Caching ở cấp CLI SHOULD luôn ở mức tối thiểu.

Caching source ở cấp domain thuộc về hạ tầng source.

CLI có thể hiển thị trạng thái cache nhưng MUST NOT tạo ra một kiến trúc cache thứ hai cạnh tranh.

---

# 128. Các command bắt buộc cho V1

Tối thiểu khuyến nghị cho V1:

```text
agent-plugins init

agent-plugins catalog list
agent-plugins catalog show

agent-plugins profile list
agent-plugins profile show

agent-plugins resolve

agent-plugins plan

agent-plugins build

agent-plugins install

agent-plugins diff

agent-plugins validate

agent-plugins doctor

agent-plugins lock verify

agent-plugins adapter list
agent-plugins adapter show

agent-plugins version
```

---

# 129. Các command cho V1.1

Giai đoạn tiếp theo khuyến nghị:

```text
catalog search

update

source list
source show
source refresh

cache status
cache prune

config get
config list

completion
```

---

# 130. Các command về sau

Các bổ sung khả dĩ về sau:

```text
add
remove
sync

why-not

graph

inspect

migrate

adapter test

source add
source remove
```

Chúng SHOULD NOT được hiện thực trước khi ngữ nghĩa domain ổn định.

---

# 131. UX hằng ngày khuyến nghị

Đối với người dùng thông thường, con đường thuận lợi (happy path) SHOULD cuối cùng trở nên rất gọn.

Thiết lập ban đầu:

```bash
agent-plugins init
```

Kiểm tra:

```bash
agent-plugins resolve
```

Xem trước:

```bash
agent-plugins plan
```

Áp dụng:

```bash
agent-plugins install
```

Về sau:

```bash
agent-plugins update
```

Phần lớn sự phức tạp SHOULD vẫn khả dụng nhưng không bắt buộc.

---

# 132. UX khuyến nghị cho developer

Người đóng góp cho repository MAY thường dùng:

```bash
agent-plugins validate

agent-plugins resolve --explain

agent-plugins build

agent-plugins diff

agent-plugins doctor
```

Developer phát triển adapter MAY dùng:

```bash
agent-plugins adapter show claude

agent-plugins validate --target claude
```

---

# 133. UX khuyến nghị cho CI

CI SHOULD thường dùng:

```bash
agent-plugins validate --strict

agent-plugins lock verify

agent-plugins build --frozen-lockfile

agent-plugins diff --check
```

Không cho phép bất kỳ prompt tương tác nào trong luồng này.

---

# 134. Ngữ nghĩa cốt lõi của Command

Sự phân biệt quan trọng nhất là:

```text
catalog
    discover what exists

profile / preset
    inspect intended composition

resolve
    determine canonical effective graph

plan
    determine target filesystem changes

build
    render target artifacts

install
    apply target artifacts

diff
    compare desired and current state

update
    change selected source versions/revisions

validate
    check correctness

doctor
    check environment health
```

Các ý nghĩa này SHOULD luôn ổn định.

---

# 135. Anti-Pattern

CLI MUST tránh:

### Command "béo"

```text
500-line command handlers containing domain logic
```

### Command cấp cao nhất riêng cho từng target

Tránh:

```text
agent-plugins claude-install
agent-plugins codex-install
```

Ưu tiên:

```text
agent-plugins install --target claude
```

### Hành vi update ẩn

Tránh:

```text
build automatically pulling latest packages
```

### Cài đặt ẩn

Tránh:

```text
resolve writing .claude files
```

### Phân tích output dành cho con người

Tự động hóa SHOULD NOT phải cào (scrape) output terminal đã được định dạng.

### Bùng nổ flag

Đừng expose mọi tùy chọn nội bộ của resolver thành CLI flag.

---

# 136. CLI độc lập với Target

Mô hình command MUST luôn độc lập với các hệ sinh thái target.

Đúng:

```bash
agent-plugins build --target claude

agent-plugins build --target codex
```

Hướng kiến trúc không đúng:

```bash
agent-plugins claude build
agent-plugins codex resolve
agent-plugins gemini install
```

vì điều này sẽ để các hệ sinh thái target chi phối kiến trúc command.

Target là tham số của các thao tác.

Chúng không phải là phân cấp domain chính.

---

# 137. CLI độc lập với Source

Tương tự, người dùng thông thường SHOULD không cần các command riêng cho từng source như:

```text
github-install
marketplace-install
git-install
```

Thay vào đó:

```text
source adapters
```

trừu tượng hóa biểu diễn bên ngoài.

Cấu hình riêng cho từng source thuộc về cấu hình của Source Adapter.

---

# 138. Khả năng giải thích

CLI SHOULD làm cho các quyết định quan trọng của hệ thống có thể kiểm tra được.

Người dùng nên có thể trả lời được:

```text
Why is this package here?

Where did it come from?

Which profile selected it?

Which policy affected it?

Which version/revision was chosen?

Which adapter rendered it?

Why was a feature omitted?

Which files will change?
```

Đây là một yêu cầu sản phẩm cốt lõi chứ không phải một ý tưởng debug bổ sung về sau.

---

# 139. `inspect` trong tương lai

Một command hợp nhất trong tương lai MAY cung cấp:

```bash
agent-plugins inspect skill:typescript
```

Output khả dĩ:

```text
Canonical ID
Provider
Source
Version
Selected by
Capabilities
Dependencies
Policy status
Target mappings
Generated artifacts
```

Đây có thể trở thành giao diện debug chuyên sâu chính.

---

# 140. `graph` trong tương lai

Một command trong tương lai MAY hiển thị dependency graph.

```bash
agent-plugins graph
```

Các định dạng khả dĩ:

```bash
agent-plugins graph --format tree

agent-plugins graph --format json

agent-plugins graph --format mermaid
```

Việc trực quan hóa graph MUST sử dụng output của resolver thay vì tự dựng lại dependency một cách độc lập.

---

# 141. Application Service API

CLI SHOULD cuối cùng phụ thuộc vào một application API ổn định có dạng:

```ts
interface AgentPluginsApplication {
  init(input: InitInput): Promise<InitResult>

  catalog(input: CatalogInput): Promise<CatalogResult>

  resolve(input: ResolveInput): Promise<ResolveResult>

  plan(input: PlanInput): Promise<PlanResult>

  build(input: BuildInput): Promise<BuildResult>

  install(input: InstallInput): Promise<InstallResult>

  diff(input: DiffInput): Promise<DiffResult>

  update(input: UpdateInput): Promise<UpdateResult>

  validate(input: ValidateInput): Promise<ValidateResult>

  doctor(input: DoctorInput): Promise<DoctorResult>
}
```

API này sau này có thể được tái sử dụng bởi:

```text
CLI
TUI
Desktop UI
Web UI
IDE extension
automation API
```

---

# 142. CLI là một client

Về mặt kiến trúc:

```text
                  ┌──────── CLI
                  │
                  ├──────── TUI
Application API ──┼──────── GUI
                  │
                  ├──────── IDE
                  │
                  └──────── Automation
```

Do đó CLI là một client hạng nhất của nền tảng, không phải bản thân nền tảng.

Điều này quan trọng cho khả năng mở rộng lâu dài.

---

# 143. Các bất biến cốt lõi

Các bất biến sau mang tính quy phạm (normative).

### Bất biến 1 — CLI mỏng

Các quy tắc core domain MUST NOT nằm trong command handler.

### Bất biến 2 — Thay đổi trạng thái tường minh

Các command chỉ đọc MUST NOT thay đổi trạng thái project một cách bất ngờ.

### Bất biến 3 — Resolution trước khi render

Các thao tác trên target MUST sử dụng trạng thái đã resolve chuẩn.

### Bất biến 4 — Trung lập với adapter

Kiến trúc CLI cấp cao nhất MUST luôn độc lập với target.

### Bất biến 5 — Trung lập với source

CLI MUST NOT hard-code ngữ nghĩa của source bên ngoài vào các command thông thường.

### Bất biến 6 — Tự động hóa deterministic

Việc thực thi không tương tác MUST deterministic.

### Bất biến 7 — Giao diện máy đọc được

Các command quan trọng MUST hỗ trợ output có cấu trúc ổn định khi tự động hóa được hưởng lợi.

### Bất biến 8 — Không có thao tác mạng ẩn

Các thao tác mạng MUST tường minh hoặc có thể dự đoán được.

### Bất biến 9 — Áp dụng an toàn

Các thay đổi trên filesystem MUST bắt nguồn từ các plan đã được validate.

### Bất biến 10 — Khả năng giải thích

Người dùng MUST có thể kiểm tra các quyết định quan trọng về resolution và render.

---

# 144. Workflow tham chiếu

Kiến trúc hoàn chỉnh trở thành:

```text
User
 │
 ▼
CLI
 │
 ▼
Configuration
 │
 ▼
Catalog
 │
 ▼
Profile / Preset
 │
 ▼
Resolver
 │
 ▼
Policy Engine
 │
 ▼
Resolved Graph
 │
 ├──────────────► Lockfile
 │
 ▼
Target Adapter
 │
 ▼
Render Plan
 │
 ▼
Rendered Artifacts
 │
 ▼
Filesystem Apply
```

Luồng source bên ngoài:

```text
External Repository
       │
       ▼
Source Adapter
       │
       ▼
Canonical Package
       │
       ▼
Catalog
```

CLI điều phối các component này nhưng không định nghĩa lại ngữ nghĩa của chúng.

---

# 145. Luồng command tham chiếu

Đối với:

```bash
agent-plugins install \
  --profile frontend \
  --target claude
```

luồng khái niệm nội bộ là:

```text
CLI

↓ parse arguments

Project Configuration

↓ load

Catalog

↓ resolve profile

Resolver

↓ produce canonical graph

Policy Engine

↓ filter / validate

Lockfile

↓ verify/update according to mode

Claude Target Adapter

↓ validate

Render Plan

↓ inspect collisions

Renderer

↓ produce artifacts

Filesystem Layer

↓ apply atomically

Install Result

↓ present

CLI
```

Mỗi lớp có một trách nhiệm riêng biệt.

---

# 146. Phân loại command cuối cùng

Phân loại dài hạn khuyến nghị:

```text
DISCOVER

catalog
package
preset
profile
adapter
source


UNDERSTAND

resolve
plan
diff
inspect
graph


VERIFY

validate
doctor
lock


CHANGE

init
add
remove
update
build
install
sync


MAINTAIN

cache
config
completion
version
```

Phân loại này mang tính khái niệm.

Nó không cần xuất hiện trực tiếp trong cú pháp command.

---

# 147. Tóm tắt quyết định

Kiến trúc CLI áp dụng:

```text
CLI
    = orchestration + interaction + presentation

Core
    = business semantics

Resolver
    = effective environment

Policy
    = permissions and constraints

Lockfile
    = reproducible state

Source Adapter
    = external → canonical

Target Adapter
    = canonical → target-native

Filesystem Layer
    = controlled mutation
```

Vòng đời command khuyến nghị là:

```text
discover
    ↓
resolve
    ↓
plan
    ↓
build
    ↓
diff
    ↓
install
```

với:

```text
update
```

được tách biệt tường minh khỏi:

```text
build/install
```

để bảo toàn khả năng tái lập.

---

# 148. Các đặc tả liên quan

Đặc tả này SHOULD được đọc cùng với:

```text
domain-model.md
capability-model.md

architecture.md
repository-structure.md
source-of-truth.md

resolution-spec.md
catalog-spec.md
manifest-spec.md
lockfile-spec.md
policy-spec.md
adapter-spec.md
update-spec.md

cli-spec.md
```

Ranh giới trách nhiệm:

```text
manifest-spec
    → defines package metadata

catalog-spec
    → defines discoverability

resolution-spec
    → determines the effective canonical graph

policy-spec
    → determines what is permitted

lockfile-spec
    → records reproducible resolved state

adapter-spec
    → translates system boundaries

update-spec
    → evolves versions and revisions

cli-spec
    → exposes these capabilities to humans and automation
```

---

# 149. Hướng hiện thực khuyến nghị

Đối với stack đã lên kế hoạch:

```text
TypeScript
+
oclif
+
Ink
```

trách nhiệm khuyến nghị là:

```text
oclif
├── command routing
├── args / flags
├── help
├── completion
└── command lifecycle

Ink
├── init wizard
├── interactive selection
├── rich resolution explorer
└── future advanced TUI flows

Application/Core
├── catalog
├── resolver
├── policy
├── lockfile
├── update
├── adapters
└── filesystem planning
```

Quy tắc hiện thực quan trọng nhất vẫn là:

```text
Command
    ↓
Application Service
    ↓
Domain
```

không bao giờ:

```text
Command
    ↓
business logic
    ↓
filesystem
```

Điều này giữ cho hệ thống đủ khả năng mở rộng cho một tương lai:

```text
CLI
TUI
VS Code extension
Web UI
Desktop application
Agent/MCP interface
```

tất cả cùng chia sẻ một nền tảng bên dưới.