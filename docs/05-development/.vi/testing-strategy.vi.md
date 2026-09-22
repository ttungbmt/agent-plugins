# Chiến lược kiểm thử

**Trạng thái:** Bản nháp
**Phiên bản:** 0.1.0
**Cập nhật lần cuối:** 2026-09-21

---

# 1. Mục đích

Tài liệu này định nghĩa chiến lược kiểm thử cho dự án Agent Plugins.

Mục tiêu là đảm bảo hệ thống luôn:

- đúng đắn;
- deterministic;
- an toàn;
- khả chuyển giữa các target;
- tương thích ngược khi cần;
- có khả năng giải thích;
- an toàn khi vận hành.

Chiến lược kiểm thử bao gồm:

```text
canonical domain
schemas
manifests
catalog
profiles
presets
resolver
policy
trust
lockfile
source adapters
target adapters
render planning
filesystem apply
CLI
configuration
updates
overlays
security boundaries
```

Nguyên tắc kiểm thử trung tâm là:

> Kiểm thử các hợp đồng kiến trúc và hành vi quan sát được, không kiểm thử chi tiết implementation.

---

# 2. Mục tiêu kiểm thử

Bộ test MUST mang lại sự tin cậy rằng:

1. các input chuẩn tạo ra output deterministic;
2. cấu hình không hợp lệ thất bại một cách có thể dự đoán;
3. các dependency được resolve chính xác;
4. các policy không thể bị vượt qua;
5. các quyết định trust có thể tái lập;
6. lockfile tái tạo được môi trường;
7. adapter bảo toàn ngữ nghĩa;
8. các thao tác filesystem được sinh ra là an toàn;
9. hành vi CLI ổn định cho cả con người và tự động hóa;
10. các ranh giới bảo mật luôn được thực thi;
11. target mới không làm hỏng các target hiện có;
12. thay đổi từ nguồn bên ngoài không thể âm thầm thay đổi trạng thái đã khóa.

---

# 3. Nguyên tắc kiểm thử

Dự án tuân theo các nguyên tắc sau.

## 3.1 Ưu tiên tính deterministic

Test MUST xác minh rằng các input giống hệt nhau tạo ra các output giống hệt nhau.

## 3.2 Hợp đồng hơn implementation

Test SHOULD khẳng định:

```text
input
→ behavior
→ output
```

thay vì các hàm private nội bộ, trừ khi các hàm đó chứa logic độc lập có ý nghĩa.

## 3.3 Test nhỏ, đặt gần logic

Logic domain thuần SHOULD có các unit test nhanh.

## 3.4 Test ranh giới cho các tích hợp

Adapter, thao tác filesystem, CLI và việc xử lý source MUST có integration test.

## 3.5 Golden test cho output được sinh ra

Các artifact được sinh ra SHOULD được xác minh thông qua golden fixture hoặc snapshot.

## 3.6 Test bảo mật là công dân hạng nhất

Các cơ chế kiểm soát bảo mật MUST có regression test riêng.

## 3.7 Test end-to-end xác nhận vòng lặp sản phẩm

Một số ít kịch bản E2E thực tế MUST xác nhận toàn bộ hệ thống.

---

# 4. Các tầng kiểm thử

Kiến trúc kiểm thử được khuyến nghị:

```text
                E2E
                 ▲
                 │
          Integration Tests
                 ▲
                 │
           Contract Tests
                 ▲
                 │
             Unit Tests
```

Mỗi tầng phục vụ một mục đích riêng biệt.

---

# 5. Unit test

Unit test xác minh logic deterministic độc lập.

Các đối tượng điển hình:

```text
canonical IDs
version constraints
dependency graph utilities
policy matching
trust evaluation
path normalization
schema transformations
merge algorithms
sorting
hash generation
diagnostics
```

Unit test SHOULD:

- tránh truy cập filesystem khi có thể;
- tránh truy cập mạng;
- chạy nhanh;
- dùng fixture nhỏ;
- kiểm thử kỹ các trường hợp biên.

---

# 6. Integration test

Integration test xác nhận sự phối hợp giữa các module.

Ví dụ:

```text
manifest loader + schemas

repository scanner + catalog

catalog + resolver

resolver + policy

resolver + lockfile

resolved graph + target adapter

render plan + filesystem apply

CLI + application layer
```

Integration test SHOULD sử dụng các thư mục tạm cô lập.

---

# 7. Contract test

Contract test thực thi các interface dùng chung.

Các hợp đồng quan trọng bao gồm:

```text
TargetAdapter
SourceAdapter
ApplicationService
Diagnostic
CLI JSON output
Lockfile schema
Manifest schema
```

Contract test đặc biệt quan trọng đối với khả năng mở rộng.

---

# 8. Test end-to-end

E2E test xác nhận các workflow thực tế của người dùng.

Luồng E2E cốt lõi:

```text
init
 ↓
validate
 ↓
resolve
 ↓
plan
 ↓
build
 ↓
install
 ↓
diff
```

Trạng thái cuối cùng mong đợi:

```text
diff = clean
```

E2E test SHOULD ít về số lượng nhưng mang tính đại diện.

---

# 9. Kim tự tháp kiểm thử

Phân bổ gần đúng được khuyến nghị:

```text
60–70% Unit

20–30% Integration

5–10% E2E
```

Đây là hướng dẫn, không phải hạn mức cứng.

Các phần của hệ thống phụ thuộc nhiều vào adapter có thể cần nhiều integration test và golden test hơn.

---

# 10. Tổ chức test

Cấu trúc được khuyến nghị:

```text
packages/
├── core/
│   └── test/
├── catalog/
│   └── test/
├── resolver/
│   └── test/
├── policy/
│   └── test/
├── lockfile/
│   └── test/
├── adapters/
│   └── test/
└── cli/
    └── test/

tests/
├── fixtures/
├── golden/
├── integration/
├── e2e/
└── security/
```

Unit test SHOULD nằm gần package mà chúng kiểm thử.

Các test xuyên package SHOULD nằm dưới `tests/` ở cấp root.

---

# 11. Đặt tên test

Cách đặt tên được khuyến nghị:

```text
*.test.ts
```

Ví dụ:

```text
canonical-reference.test.ts
resolver.test.ts
policy-evaluator.test.ts
claude-adapter.test.ts
cli-resolve.test.ts
```

Các nhóm hành vi lớn MAY dùng thư mục test lồng nhau.

---

# 12. Test định danh chuẩn

Kiểm thử các ID chuẩn như:

```text
plugin:superpowers
skill:typescript
agent:reviewer
profile:frontend
```

Các trường hợp MUST bao gồm:

- ID hợp lệ;
- prefix không hợp lệ;
- ID rỗng;
- khoảng trắng;
- chuỗi traversal;
- các trường hợp biên Unicode;
- ID trùng lặp;
- phân biệt hoa thường.

Các input đặc thù về bảo mật:

```text
../../foo
..\foo
/absolute
C:\foo
```

MUST bị từ chối khi áp dụng.

---

# 13. Test schema

Mọi schema MUST có:

```text
valid fixture
minimal valid fixture
fully populated fixture
invalid fixtures
boundary fixtures
```

Kiểm thử:

- các trường bắt buộc;
- các trường tùy chọn;
- các trường không xác định;
- giá trị enum không hợp lệ;
- phiên bản schema;
- cấu trúc lồng nhau;
- tham chiếu không hợp lệ.

---

# 14. Test tương thích schema

Khi schema tiến hóa, fixture SHOULD bao phủ:

```text
current version
previous supported version
unsupported future version
unsupported obsolete version
```

Điều này trở nên then chốt trước V1.

---

# 15. Test parser manifest

Kiểm thử:

```text
valid YAML
valid JSON if supported
malformed YAML
unsafe YAML tags
invalid encoding
missing file
unknown schema version
```

Parser MUST chỉ xử lý dữ liệu.

Test MUST xác minh rằng các custom YAML tag không thể thực thi hành vi tùy ý.

---

# 16. Test repository scanner

Test scanner SHOULD bao phủ:

```text
empty repository

single package

multiple component types

nested directories

ignored files

duplicate identifiers

invalid manifests
```

Thứ tự MUST deterministic bất kể thứ tự liệt kê của filesystem.

---

# 17. Test scanner đa nền tảng

Tối thiểu, logic đường dẫn SHOULD được kiểm thử cho:

```text
POSIX paths
Windows paths
case-sensitive filesystem behavior
case-insensitive collision behavior
```

CI MAY chạy test thực trên nhiều hệ điều hành.

---

# 18. Test catalog

Catalog MUST được kiểm thử cho:

```text
lookup by ID
lookup by type
lookup by capability
provider lookup
duplicate rejection
missing reference detection
stable ordering
```

Test xếp hạng tìm kiếm SHOULD tách biệt khỏi hành vi của resolver.

---

# 19. Test Preset

Kiểm thử:

```text
single Preset
nested Preset
multiple Presets
duplicate selections
missing Preset
circular Preset
```

Ví dụ về chu trình:

```text
A → B → C → A
```

MUST thất bại một cách deterministic.

---

# 20. Test Profile

Kiểm thử:

```text
simple Profile
Profile inheritance
multiple Presets
package additions
policy references
invalid parent
inheritance cycle
```

Việc sinh Effective Profile MUST deterministic.

---

# 21. Test resolver

Resolver là một trong những đối tượng kiểm thử quan trọng nhất.

Các trường hợp bắt buộc:

```text
direct dependency

transitive dependency

shared dependency

duplicate dependency

deep graph

missing dependency

dependency cycle

conflicting version

Profile inheritance

Preset expansion

provider selection
```

---

# 22. Tính deterministic của resolver

Với cùng một input logic nhưng thứ tự input khác nhau:

```text
A, B, C
```

và:

```text
C, A, B
```

graph đã resolve SHOULD tương đương và được serialize giống hệt nhau.

Điều này MUST có test tường minh.

---

# 23. Test giải thích Resolution

`why()` và output giải thích MUST phản ánh graph thực.

Ví dụ:

```text
profile:frontend
→ preset:web
→ plugin:typescript
→ skill:typescript
```

Test SHOULD đảm bảo rằng các cạnh provenance không bị mất sau khi khử trùng lặp.

---

# 24. Property test cho resolver

Khi hữu ích, SHOULD cân nhắc kiểm thử dựa trên thuộc tính (property-based testing).

Các thuộc tính tiềm năng:

```text
resolved graph contains no duplicate canonical IDs

resolved graph contains all required dependencies

resolved graph has no unresolved references

resolved graph order is stable
```

Property test đặc biệt hữu ích cho logic graph.

---

# 25. Test Policy

Policy MUST được kiểm thử độc lập với hành vi của resolver.

Các trường hợp:

```text
allow package
deny package
allow source
deny source
capability restriction
target restriction
trust restriction
```

Thứ tự ưu tiên của policy MUST có test tường minh.

---

# 26. Regression test cho việc vượt qua policy

Các test quan trọng về bảo mật MUST xác minh rằng:

```text
Target Adapter cannot restore denied components

CLI flags cannot bypass Policy unintentionally

Update cannot introduce forbidden package

Overlay cannot bypass source restrictions
```

---

# 27. Test mô hình trust

Test trust SHOULD bao phủ:

```text
first-party
trusted-vendor
verified-community
community
unknown
blocked
revoked
```

Các tổ hợp bằng chứng SHOULD được kiểm thử.

---

# 28. Test thứ tự ưu tiên trust

Ví dụ:

```text
publisher trusted
+
revision revoked
→ blocked
```

```text
source trusted
+
integrity failure
→ blocked
```

Bằng chứng tiêu cực MUST lấn át bằng chứng tích cực khi được quy định.

---

# 29. Test tính không bắc cầu của trust

Ví dụ:

```text
trusted package A
→ depends on community package B
```

B MUST vẫn là community.

Trust của A MUST NOT tự động lan truyền.

---

# 30. Test lockfile

Kiểm thử:

```text
generation
serialization
deserialization
schema validation
stable ordering
integrity data
adapter metadata
```

Test khứ hồi (round-trip):

```text
object
→ serialize
→ parse
→ object
```

SHOULD bảo toàn ngữ nghĩa.

---

# 31. Tính deterministic của lockfile

Hai môi trường đã resolve tương đương MUST tạo ra các byte lockfile giống hệt nhau.

Điều này SHOULD được kiểm thử tường minh.

---

# 32. Test frozen lockfile

Test MUST xác minh rằng chế độ frozen thất bại khi:

```text
configuration changed
package requirement changed
source revision differs
adapter requirement differs
lockfile missing entry
```

---

# 33. Test toàn vẹn lockfile

Kiểm thử:

```text
valid integrity
modified content
missing content
wrong digest
wrong revision
```

Lỗi toàn vẹn MUST thất bại theo hướng đóng (fail closed).

---

# 34. Contract test cho adapter

Mọi Target Adapter MUST vượt qua một bộ kiểm tra tuân thủ chung.

Về mặt khái niệm:

```ts
targetAdapterConformance(adapter)
```

Bộ test SHOULD kiểm thử:

```text
metadata

capabilities

validation

planning

rendering

determinism

path safety

collision handling

unsupported capability behavior
```

---

# 35. Golden test cho Target Adapter

Mỗi adapter SHOULD có các golden output.

Ví dụ:

```text
tests/golden/claude/basic-skill/
├── input/
└── expected/
```

Input:

```text
canonical resolved environment
```

Mong đợi:

```text
target-native files
```

---

# 36. Triết lý golden test

Golden test SHOULD xác nhận phần biểu diễn có ý nghĩa.

Tránh snapshot các cấu trúc metadata khổng lồ không liên quan.

Golden test tốt xác minh:

```text
file paths
content
metadata
ordering
generated structure
```

Golden output SHOULD có thể được con người review.

---

# 37. Cập nhật snapshot

Việc cập nhật snapshot MUST có chủ đích.

CI MUST NOT tự động ghi đè snapshot.

Developer SHOULD kiểm tra diff trước khi chấp nhận các snapshot đã cập nhật.

---

# 38. Test ngữ nghĩa của adapter

Adapter SHOULD kiểm thử không chỉ output dạng văn bản mà cả hành vi ngữ nghĩa.

Ví dụ:

```text
canonical agent name
→ correct target agent identifier
```

```text
canonical command description
→ preserved in target output
```

---

# 39. Test capability không được hỗ trợ

Với mọi capability không được hỗ trợ:

```text
native
mapped
emulated
unsupported
```

hành vi của adapter MUST được kiểm thử.

Các ngữ nghĩa quan trọng không được hỗ trợ MUST NOT biến mất một cách âm thầm.

---

# 40. Test xung đột adapter

Ví dụ:

```text
agent:reviewer
plugin:foo/reviewer
```

ánh xạ tới:

```text
.claude/agents/reviewer.md
```

MUST thất bại trước khi thay đổi filesystem.

---

# 41. Test an toàn đường dẫn của adapter

Các đường dẫn được sinh ra MUST được kiểm thử với:

```text
../
absolute paths
Windows drive paths
UNC paths
reserved filenames
case collisions
```

---

# 42. Contract test cho Source Adapter

Các source adapter SHOULD dùng chung một bộ kiểm tra tuân thủ.

Về mặt khái niệm:

```ts
sourceAdapterConformance(adapter)
```

Test SHOULD bao phủ:

```text
metadata
discover
fetch
normalize
verify
provenance
immutable revision handling
```

---

# 43. Test mạng cho Source Adapter

Các test phụ thuộc mạng SHOULD được cô lập.

CI SHOULD ưu tiên:

```text
mock server
local Git repository
fixture archive
```

thay vì phụ thuộc vào các dịch vụ công cộng bên ngoài.

Test mạng bên ngoài MAY chạy riêng dưới dạng smoke test.

---

# 44. Test Git source

Tạo các Git repository tạm thời để kiểm thử:

```text
commit pinning
branch resolution
tag resolution
repository update
missing revision
repository transfer metadata where possible
```

Test SHOULD NOT phụ thuộc vào tính khả dụng của GitHub.

---

# 45. Test bảo mật archive

Nếu archive source được hỗ trợ, kiểm thử:

```text
zip slip
tar traversal
absolute paths
symlink escape
hardlink escape
archive bomb limits
```

Những test này thuộc về bộ test bảo mật.

---

# 46. Test overlay

Test overlay MUST bao phủ:

```text
add
replace
merge
remove
```

Các trường hợp bổ sung:

```text
missing target
invalid target
merge conflict
ordering
multiple overlays
```

---

# 47. Test bảo mật overlay

Kiểm thử tường minh prototype pollution:

```text
__proto__
constructor
prototype
```

Các merge key không an toàn MUST bị từ chối hoặc bị bỏ qua một cách an toàn theo spec.

---

# 48. Test cập nhật

Test cho Update Engine SHOULD bao phủ:

```text
no update
patch update
minor update
major update
revision update
source change
publisher change
trust change
new transitive dependency
```

---

# 49. Test an toàn khi cập nhật

Xác minh rằng:

```text
update does not install

update does not execute code

update does not bypass Policy

update preserves overlays

update previews trust changes
```

---

# 50. Test cấu hình

Kiểm thử thứ tự ưu tiên cấu hình:

```text
CLI
>
environment
>
project
>
workspace
>
user
>
defaults
```

Mọi quan hệ ưu tiên SHOULD có độ bao phủ tường minh.

---

# 51. Test phát hiện cấu hình

Kiểm thử việc thực thi từ:

```text
project root
nested directory
workspace directory
outside project
```

Việc phát hiện project root MUST deterministic.

---

# 52. Test biến môi trường

Xác minh:

```text
supported AGENT_PLUGINS_* variables
invalid values
precedence
secret redaction
```

Các biến môi trường không liên quan MUST NOT rò rỉ vào các artifact được sinh ra.

---

# 53. Test Render Plan

Render Plan MUST được kiểm thử độc lập với việc apply thực tế lên filesystem.

Kiểm thử:

```text
create
update
remove
unchanged
```

Thứ tự MUST deterministic.

---

# 54. Test apply lên filesystem

Sử dụng thư mục tạm.

Kiểm thử:

```text
create file
update owned file
remove owned stale file
preserve unknown file
collision
directory creation
atomic apply
```

---

# 55. Test bảo vệ file không xác định

Ví dụ:

```text
desired:
.claude/agent.md

existing:
user-created file
```

Mong đợi:

```text
fail
```

trừ khi tồn tại ngữ nghĩa override tường minh.

---

# 56. Test tính lũy đẳng

Chuỗi thao tác sau:

```text
install
install
```

với input không thay đổi MUST cho kết quả:

```text
second install = no changes
```

Đây MUST là một E2E regression test riêng.

---

# 57. Unit test cho CLI

Package CLI SHOULD kiểm thử:

```text
argument parsing
flag parsing
defaults
invalid combinations
exit code mapping
presenters
```

Unit test cho CLI SHOULD NOT trùng lặp các test domain cốt lõi.

---

# 58. Integration test cho CLI

Gọi các command theo cách lập trình hoặc thông qua một harness subprocess.

Kiểm thử:

```text
init
validate
catalog
profile
resolve
plan
build
install
diff
doctor
lock
adapter
```

---

# 59. Contract test cho JSON của CLI

Mọi command `--json` ổn định SHOULD có contract test.

Xác minh:

```text
valid JSON
schemaVersion
command
success
data
diagnostics
```

Không được có mã ANSI hoặc output tiến trình xuất hiện trong stdout.

---

# 60. Test stdout/stderr của CLI

Xác minh:

```text
stdout = requested result

stderr = diagnostics/progress/logging
```

Điều này thiết yếu cho tự động hóa.

---

# 61. Test exit code của CLI

Kiểm thử các exit code đã được ánh xạ:

```text
0 success
2 invalid CLI usage
3 configuration
4 validation
5 resolution
6 policy
7 lockfile
8 source
9 adapter
10 filesystem
```

Các mã chẩn đoán cung cấp chi tiết tinh hơn.

---

# 62. Test tương tác của CLI

Giao diện tương tác SHOULD có các test tập trung cho:

```text
default selection
cancel behavior
confirmation
non-interactive fallback
```

Không kiểm thử quá mức phần hiển thị trực quan trên terminal.

---

# 63. Test TTY

Hành vi SHOULD được kiểm thử cho:

```text
interactive TTY
non-TTY
CI
--json
--quiet
```

Spinner/prompt MUST NOT làm nhiễm bẩn output dành cho máy.

---

# 64. Test offline

Các command hỗ trợ:

```text
--offline
```

MUST có test đảm bảo không có truy cập mạng nào xảy ra.

Một test SHOULD thất bại nếu một luồng offline cố gắng truy cập mạng.

---

# 65. Bộ test bảo mật

Duy trì một bộ regression test bảo mật riêng.

Vị trí được khuyến nghị:

```text
tests/security/
```

Các trường hợp MUST bao gồm:

```text
path traversal

symlink escape

unknown overwrite

archive traversal

prototype pollution

malicious YAML

secret leakage

integrity mismatch

policy bypass

trust escalation

dependency confusion
```

---

# 66. Test path traversal

Input:

```text
../foo
../../foo
..\foo
C:\foo
/etc/foo
```

nên thất bại ở bất cứ nơi nào yêu cầu giới hạn đường dẫn.

---

# 67. Test symlink

Khi được CI/nền tảng hỗ trợ:

```text
target root
└── link → /outside
```

việc cố gắng ghi thông qua link MUST thất bại.

---

# 68. Test rò rỉ secret

Chèn các secret giả như:

```text
TEST_SECRET_123456
```

vào môi trường của process.

Xác minh chúng không xuất hiện trong:

```text
logs
diagnostics
JSON output
lockfile
generated artifacts
```

trừ khi có chủ đích tường minh.

---

# 69. Test dependency confusion

Ví dụ:

```text
first-party package ID:
foo
```

cùng với package từ xa:

```text
community/foo
```

MUST NOT gây ra việc tự động chuyển đổi source.

---

# 70. Test leo thang trust

Metadata của package cố gắng:

```yaml
trust:
  level: first-party
```

MUST NOT tự nâng quyền cho chính nó.

Trust hiệu lực đến từ cấu hình đáng tin cậy và bằng chứng.

---

# 71. Test manifest độc hại

Fixture SHOULD bao gồm:

```text
oversized strings
deep nesting
invalid Unicode
unexpected objects
unsafe YAML tags
prototype keys
```

---

# 72. Test giới hạn tài nguyên

Khi có các giới hạn, kiểm thử:

```text
max manifest size
max graph depth
max graph nodes
max archive files
max expanded archive size
```

Hành vi tại biên MUST có thể dự đoán được.

---

# 73. Test đa nền tảng

Lý tưởng nhất, CI SHOULD kiểm thử:

```text
Linux
Windows
macOS
```

Tối thiểu, Linux và Windows được khuyến nghị mạnh mẽ vì hành vi đường dẫn khác biệt đáng kể.

---

# 74. Ma trận runtime

Ma trận CI runtime được khuyến nghị:

```text
current Node LTS
next supported Node version
```

Tránh các ma trận quá rộng cho đến khi chính sách tương thích được xác định.

---

# 75. Test package manager

Nếu chỉ một package manager được hỗ trợ chính thức, CI SHOULD sử dụng nhất quán package manager đó.

Không thêm ma trận nhiều package manager khi không có yêu cầu sản phẩm.

---

# 76. Bộ test tính deterministic

Tạo các test deterministic tường minh cho:

```text
catalog ordering
resolved graph
lockfile
render plan
generated artifacts
CLI JSON output
```

Mẫu test là:

```text
run A
run B
compare bytes
```

---

# 77. Ngẫu nhiên hóa thứ tự input

Một test deterministic hữu ích là ngẫu nhiên hóa thứ tự phát hiện input.

Ví dụ:

```text
filesystem order A
filesystem order B
```

vẫn nên cho ra output chuẩn giống hệt nhau.

---

# 78. Độc lập với thời gian

Các artifact được sinh ra SHOULD NOT phụ thuộc vào thời gian hiện tại trừ khi được quy định tường minh.

Test SHOULD cố định hoặc thay đổi trạng thái đồng hồ và xác minh output giống hệt nhau.

---

# 79. Độc lập với máy

Khi có thể, xác minh output không chứa:

```text
absolute local paths
hostname
username
temporary directory
OS-specific separators
```

trừ khi được yêu cầu có chủ đích.

---

# 80. Golden fixture chuẩn

Duy trì các fixture chuẩn có thể tái sử dụng:

```text
fixtures/canonical/
├── empty/
├── simple-skill/
├── simple-agent/
├── full-plugin/
├── nested-presets/
├── profile-inheritance/
├── dependency-conflict/
├── policy-denied/
└── mixed-trust/
```

Mọi adapter SHOULD có thể tái sử dụng chúng.

---

# 81. Fixture dùng chung giữa các adapter

Cùng một fixture chuẩn SHOULD được render bởi nhiều adapter.

Ví dụ:

```text
full-plugin
├── Claude expected
├── Codex expected
└── Gemini expected
```

Điều này kiểm thử tính khả chuyển.

---

# 82. Cổng kiểm tra tính khả chuyển

Khi thêm một adapter mới, chạy toàn bộ bộ golden fixture chuẩn.

Nếu các fixture chuẩn cần sửa đổi riêng cho target, cần phải review kiến trúc.

---

# 83. Regression test kiến trúc

Một số test SHOULD bảo vệ tường minh các ranh giới kiến trúc.

Ví dụ:

```text
core package does not import CLI

resolver does not import adapters

resolver does not import network modules

canonical domain does not import target-specific code
```

Các test dependency tĩnh MAY thực thi các quy tắc này.

---

# 84. Test ranh giới package

Kiến trúc dependency SHOULD tuân theo hướng đã định.

Ví dụ:

```text
cli
  → application
  → core
```

Không cho phép:

```text
core
  → cli
```

Các công cụ như trình phân tích dependency graph MAY thực thi điều này.

---

# 85. Test không dùng mạng

Các package cốt lõi SHOULD có thể kiểm thử trong môi trường chặn mạng.

Điều này chứng minh:

```text
catalog
resolver
policy
lockfile
target rendering
```

không yêu cầu truy cập mạng.

---

# 86. Test không thực thi

Test bảo mật SHOULD xác minh rằng các script do package cung cấp không bao giờ được thực thi trong quá trình:

```text
catalog
validate
resolve
build
install
```

Sử dụng các sentinel script khiến test thất bại nếu bị thực thi.

---

# 87. Test hiệu năng

Kiểm thử hiệu năng SHOULD bắt đầu sau khi hành vi cốt lõi ổn định.

Các benchmark tiềm năng:

```text
catalog load
manifest parsing
large dependency graph
resolution
multi-target rendering
```

Test hiệu năng SHOULD không chặn các lần chạy unit test thông thường trừ khi các ngưỡng đã ổn định.

---

# 88. Fixture graph lớn

Duy trì một graph lớn tổng hợp.

Ví dụ:

```text
1,000 packages
5,000 components
10,000 dependency edges
```

Dùng cho:

```text
benchmark
stack safety
cycle handling
determinism
```

---

# 89. Stress test

Các kịch bản stress MAY bao gồm:

```text
very deep graph
very wide graph
many Profiles
many Presets
many target artifacts
```

Những test này SHOULD chạy tách biệt khỏi các test nhanh thông thường.

---

# 90. Fuzz testing

Các đối tượng fuzz trong tương lai:

```text
canonical ID parser
manifest parser
path normalizer
overlay merge
version parser
archive extraction
```

Các parser nhạy cảm về bảo mật xứng đáng được ưu tiên.

---

# 91. Mutation testing

Mutation testing MAY được đưa vào sau này cho các logic thuần quan trọng như:

```text
policy evaluation
trust rules
resolver conflicts
path security
```

Nó không bắt buộc cho MVP.

---

# 92. Độ bao phủ

Độ bao phủ mã nguồn hữu ích nhưng MUST NOT trở thành thước đo chất lượng chính.

Mục tiêu được khuyến nghị:

```text
core domain: high
resolver: very high
policy: very high
security utilities: very high
adapters: meaningful behavior coverage
CLI presentation: moderate
```

Các nhánh quan trọng có ý nghĩa hơn tỷ lệ phần trăm tổng thể.

---

# 93. Cổng độ bao phủ

Trước V1, cân nhắc thực thi khoảng:

```text
statements >= 80%
branches   >= 75%
```

với kỳ vọng cao hơn cho các module quan trọng về bảo mật.

Các ngưỡng chính xác SHOULD được tinh chỉnh sau khi bắt đầu implementation.

---

# 94. Quy tắc dữ liệu test

Fixture MUST NOT chứa:

```text
real credentials
real private repository tokens
personal secrets
```

Sử dụng các giá trị giả rõ ràng.

Ví dụ:

```text
test-token-not-secret
```

---

# 95. Quyền sở hữu fixture

Fixture SHOULD được phân loại theo trách nhiệm.

Tránh một fixture khổng lồ được dùng bởi mọi test.

Ưu tiên:

```text
small unit fixture
shared canonical fixture
specific E2E fixture
```

---

# 96. Tính ổn định của fixture

Golden fixture là một phần của bề mặt tương thích.

Thay đổi đối với chúng SHOULD được review cẩn thận như mã production.

---

# 97. Chiến lược mocking

Chỉ mock các ranh giới bên ngoài hoặc không ổn định.

Các ứng viên tốt để mock:

```text
HTTP
remote registries
clock
process environment
```

Tránh mock quá mức các module domain với nhau.

Ưu tiên sự phối hợp thực giữa các thành phần core trong integration test.

---

# 98. Chiến lược filesystem

Sử dụng các thư mục filesystem tạm thực thay vì mock API filesystem cho hầu hết integration test.

Điều này phát hiện được:

```text
path bugs
permissions
case behavior
atomic operations
```

---

# 99. Chiến lược mạng

Test mặc định MUST NOT phụ thuộc vào internet công cộng.

Sử dụng:

```text
local HTTP server
fixture Git server/repository
mock fetch implementation
```

để có CI deterministic.

---

# 100. Chiến lược đồng hồ

Inject hoặc trừu tượng hóa thời gian khi cần timestamp.

Test MUST NOT phụ thuộc vào thời gian thực tế (wall-clock).

---

# 101. Chiến lược ngẫu nhiên

Tránh tính ngẫu nhiên trong output production.

Nếu sử dụng việc sinh test ngẫu nhiên:

```text
seed MUST be logged
```

để cho phép tái hiện.

---

# 102. Test mô hình lỗi

Mọi chẩn đoán ổn định SHOULD có test cho:

```text
code
severity
message context
subject
suggestion where applicable
```

Test SHOULD chủ yếu khẳng định mã chẩn đoán thay vì toàn bộ văn bản dành cho con người.

---

# 103. Test thông điệp dành cho con người

Các thông điệp dễ đọc cho con người MAY sử dụng snapshot.

Các snapshot này SHOULD chấp nhận những thay đổi câu chữ có chủ đích mà không làm mất ổn định các test domain.

---

# 104. Tương thích chẩn đoán

Khi các mã chẩn đoán đã được tài liệu hóa là ổn định, CI SHOULD phát hiện việc vô tình thay đổi hoặc xóa mã.

---

# 105. Test JSON Schema

Output dành cho máy của CLI SHOULD có JSON schema hoặc trình xác thực runtime tương đương.

Test SHOULD xác thực mọi phản hồi của command theo schema output mong đợi.

---

# 106. Test tương thích ngược

Trước V1, SHOULD bổ sung test tương thích cho:

```text
manifest schemas
lockfiles
CLI JSON
adapter API
configuration
```

---

# 107. Test migration

Test migration MUST bao gồm:

```text
old fixture
→ migrate
→ current valid state
```

và:

```text
migration repeated
→ no additional changes
```

Migration SHOULD lũy đẳng khi có thể.

---

# 108. Ma trận tương thích phiên bản

Duy trì fixture cho các phiên bản được hỗ trợ.

Ví dụ:

```text
manifest/v1
manifest/v2

lockfile/v1

cli-output/v1
```

Các phiên bản không được hỗ trợ MUST thất bại một cách rõ ràng.

---

# 109. Các giai đoạn CI

Pipeline CI được khuyến nghị:

```text
Install
  ↓
Lint
  ↓
Typecheck
  ↓
Unit Tests
  ↓
Integration Tests
  ↓
Security Tests
  ↓
Build
  ↓
E2E
```

Golden test của adapter MAY chạy song song cùng integration test.

---

# 110. CI nhanh

Pull request SHOULD ưu tiên phản hồi nhanh.

Khuyến nghị:

```text
lint
typecheck
unit
core integration
affected adapter tests
```

Sau đó chạy các bộ test rộng hơn một cách riêng biệt.

---

# 111. CI đầy đủ

CI trên nhánh chính hoặc CI cho release SHOULD chạy:

```text
all unit tests
all integration tests
all adapter conformance tests
all golden fixtures
all security tests
all E2E tests
cross-platform matrix
```

---

# 112. Cổng release

Trước khi release:

```text
lint passes

typecheck passes

all tests pass

golden fixtures clean

no unexpected snapshots

security suite passes

determinism suite passes
```

---

# 113. Chọn test cho PR

Việc chọn test theo package bị ảnh hưởng MAY được đưa vào sau này.

Không tối ưu hóa độ phức tạp của CI quá sớm.

Toàn bộ test core SHOULD tiếp tục chạy đối với các thay đổi kiến trúc.

---

# 114. Test chập chờn (flaky)

Test chập chờn được coi là lỗi.

Không giải quyết tình trạng chập chờn bằng cách:

```text
retrying indefinitely
sleeping arbitrary durations
loosening assertions
```

Hãy sửa dependency không deterministic.

---

# 115. Cô lập test

Mọi test MUST tránh trạng thái có thể thay đổi dùng chung.

Thư mục tạm SHOULD là duy nhất cho mỗi test.

Biến môi trường SHOULD được khôi phục sau mỗi test.

---

# 116. Thực thi song song

Test SHOULD an toàn khi thực thi đồng thời.

Các test yêu cầu thực thi tuần tự MUST ghi rõ lý do.

---

# 117. Kỷ luật snapshot

Snapshot SHOULD được dùng chủ yếu cho:

```text
generated target files
CLI human output
render plans
```

Tránh snapshot các đối tượng domain khi các assertion tường minh rõ ràng hơn.

---

# 118. Chính sách regression bảo mật

Mọi lỗi bảo mật được phát hiện MUST có một regression test trước hoặc cùng với bản sửa.

Ví dụ:

```text
path traversal vulnerability
→ dedicated fixture
→ test permanently retained
```

---

# 119. Chính sách regression lỗi

Các lỗi đáng kể SHOULD có các test tái hiện tối thiểu.

Điều này ngăn các regression hành vi tái diễn.

---

# 120. Checklist thêm adapter

Một Target Adapter mới chưa hoàn thành cho đến khi:

```text
[ ] contract suite passes
[ ] capability metadata tested
[ ] canonical fixtures rendered
[ ] golden outputs reviewed
[ ] unsupported features tested
[ ] path safety tested
[ ] collision tests pass
[ ] deterministic output verified
```

---

# 121. Checklist thêm Source Adapter

Một Source Adapter mới chưa hoàn thành cho đến khi:

```text
[ ] contract suite passes
[ ] immutable revision behavior tested
[ ] provenance tested
[ ] integrity tested
[ ] network failures tested
[ ] malicious path handling tested
[ ] cache behavior tested
[ ] offline behavior tested where relevant
```

---

# 122. Checklist schema package mới

Mọi bổ sung schema MUST bao gồm:

```text
[ ] schema
[ ] valid fixture
[ ] invalid fixture
[ ] parser tests
[ ] diagnostics
[ ] compatibility review
```

---

# 123. Checklist command CLI mới

Mọi command CLI ổn định SHOULD bao gồm:

```text
[ ] command unit tests
[ ] success integration test
[ ] failure test
[ ] --json test
[ ] exit code test
[ ] no-TTY test where relevant
[ ] help example
```

---

# 124. Command chạy test

Các package script được khuyến nghị:

```bash
pnpm test

pnpm test:unit

pnpm test:integration

pnpm test:e2e

pnpm test:security

pnpm test:adapters

pnpm test:coverage
```

Tên chính xác có thể khác.

---

# 125. Chế độ watch

Phát triển local SHOULD hỗ trợ:

```bash
pnpm test --watch
```

hoặc tương đương.

Unit test nhanh SHOULD được tối ưu hóa cho workflow này.

---

# 126. Cấu trúc fixture E2E

Khuyến nghị:

```text
tests/e2e/fixtures/
└── frontend-project/
    ├── input/
    └── expected/
```

Test tạo một thư mục làm việc cô lập từ `input`.

Sau đó chạy các command CLI.

---

# 127. Kịch bản E2E cốt lõi

Kịch bản:

```text
Given
  frontend project

When
  validate
  resolve
  build Claude
  install Claude

Then
  generated output matches golden fixture
  lockfile is valid
  second install has no changes
```

---

# 128. Kịch bản E2E cho Policy

```text
Given
  community package
  policy denies community

When
  install

Then
  install fails
  no target files are mutated
```

---

# 129. Kịch bản E2E cho trust

```text
Given
  trusted-vendor package
  integrity mismatch

When
  resolve/build

Then
  trust becomes blocked
  policy prevents installation
```

---

# 130. Kịch bản E2E đa target

```text
Given
  one frontend Profile

When
  build Claude
  build Codex

Then
  resolver graph identity is the same
  target outputs differ appropriately
```

---

# 131. Kịch bản E2E cập nhật

```text
Given
  locked vendor package v1

When
  update preview finds v2

Then
  lockfile remains unchanged during dry run

When
  update applied

Then
  lockfile changes
  install remains separate
```

---

# 132. Kịch bản E2E offline

```text
Given
  valid cache + lockfile

When
  build --offline

Then
  no network access occurs
  build succeeds
```

Một trường hợp khác:

```text
missing locked source
→ build --offline fails
```

---

# 133. Khả năng quan sát của test

Test thất bại SHOULD cung cấp đủ ngữ cảnh để debug:

```text
fixture name
command
exit code
stdout
stderr
diagnostic codes
diff
```

Lỗi golden test SHOULD hiển thị diff file dễ đọc.

---

# 134. Đường dẫn tạm deterministic trong output

Test SHOULD chuẩn hóa các đường dẫn tạm trước khi snapshot.

Hành vi production SHOULD tránh để lộ đường dẫn tạm khi có thể.

---

# 135. Lưu giữ artifact CI

Khi thất bại, CI MAY lưu giữ:

```text
generated fixtures
CLI logs
diff output
coverage
```

Không bao giờ lưu giữ secret thật.

---

# 136. Tài liệu test

Các fixture phức tạp SHOULD chứa một README ngắn giải thích mục đích của chúng.

Tránh các cấu trúc fixture "ma thuật" không có tài liệu.

---

# 137. Chất lượng mã test

Mã test là hạ tầng production.

Nó SHOULD tuân theo các tiêu chuẩn chất lượng thông thường:

```text
clear names
minimal duplication
typed helpers
stable fixtures
explicit assertions
```

---

# 138. Bộ công cụ test dùng chung

Dự án SHOULD cung cấp:

```text
packages/test-kit/
```

hoặc tương đương.

Các helper tiềm năng:

```text
createTempProject()

loadFixture()

assertDiagnostic()

assertGoldenTree()

runCLI()

createTestCatalog()

createResolvedEnvironment()
```

---

# 139. Bộ công cụ test cho adapter

`adapter-kit` MAY cung cấp các tiện ích kiểm thử chuyên dụng:

```text
targetAdapterConformance()

sourceAdapterConformance()

assertSafeRenderPlan()
```

Những tiện ích này nên có thể tái sử dụng bởi các adapter trong tương lai.

---

# 140. Test builder

Các domain builder MAY đơn giản hóa fixture.

Ví dụ:

```ts
packageBuilder()
  .id("plugin:foo")
  .withSkill("skill:bar")
  .build()
```

Builder SHOULD không che giấu các ngữ nghĩa quan trọng.

---

# 141. Tránh mock quá mức

Không tốt:

```text
mock catalog
mock resolver
mock policy
mock adapter
```

rồi kiểm thử CLI thành công.

Tốt hơn:

```text
real application stack
+
temporary filesystem
+
fake remote boundary only
```

Integration test nên thực thi sự phối hợp nội bộ thực.

---

# 142. Bộ test kiến trúc

Tạo các test tường minh cho các dependency bị cấm.

Các quy tắc ví dụ:

```text
core MUST NOT import cli

resolver MUST NOT import target adapters

target adapter MUST NOT import source adapter

domain MUST NOT import filesystem apply
```

Các quy tắc này SHOULD phản ánh `architecture.md`.

---

# 143. Test chu trình dependency

Dependency tĩnh giữa các package MUST không có chu trình theo kiến trúc.

CI SHOULD phát hiện các chu trình dependency trong workspace.

---

# 144. Quyền sở hữu test

Mỗi chủ sở hữu package chịu trách nhiệm cho các test local của mình.

Các test kiến trúc xuyên suốt SHOULD được sở hữu tập trung.

---

# 145. Định nghĩa hoàn thành

Một tính năng chưa hoàn thành cho đến khi có các test phù hợp.

Định nghĩa hoàn thành (Definition of Done):

```text
[ ] unit behavior tested

[ ] invalid input tested

[ ] diagnostics tested

[ ] integration boundary tested

[ ] deterministic behavior verified

[ ] security impact reviewed

[ ] compatibility impact reviewed

[ ] E2E updated if user-visible workflow changed
```

---

# 146. Yêu cầu kiểm thử cho MVP

Trước MVP:

```text
canonical ID tests

schema tests

manifest parser tests

catalog tests

Profile/Preset tests

resolver tests

policy tests

lockfile tests

Claude adapter conformance

Claude golden fixtures

filesystem safety tests

CLI core tests

security regression suite

one full E2E project
```

---

# 147. Yêu cầu trước Codex

Trước khi thêm Target Adapter production thứ hai:

```text
adapter conformance framework

shared canonical fixtures

golden fixture tooling

architecture dependency tests

determinism suite
```

phải đã tồn tại.

---

# 148. Yêu cầu trước cộng đồng

Trước khi hỗ trợ rộng rãi nội dung cộng đồng:

```text
Source Adapter conformance tests

archive security tests

trust tests

integrity tests

dependency confusion tests

resource limit tests

policy bypass tests
```

MUST đã trưởng thành.

---

# 149. Yêu cầu trước V1

Trước V1:

```text
cross-platform CI

schema compatibility tests

lockfile compatibility tests

CLI JSON contract tests

migration tests

adapter API compatibility tests

security suite

determinism suite

release E2E suite
```

---

# 150. Cổng chất lượng

Các cổng merge được khuyến nghị:

```text
lint

typecheck

unit tests

integration tests

architecture tests
```

Với thay đổi adapter:

```text
adapter conformance
golden tests
```

Với thay đổi nhạy cảm về bảo mật:

```text
security regression suite
```

---

# 151. Các module quan trọng

Các module đòi hỏi độ tin cậy kiểm thử cao nhất:

```text
resolver

policy

trust

lockfile

path handling

filesystem apply

source normalization

adapter render planning
```

Chúng ảnh hưởng trực tiếp đến tính đúng đắn, khả năng tái lập hoặc bảo mật.

---

# 152. Những gì không nên kiểm thử quá mức

Tránh dành quá nhiều công sức cho snapshot test:

```text
colors

spinner frames

terminal spacing

internal private method sequence

framework implementation details
```

trừ khi chúng tạo thành một hợp đồng người dùng ổn định.

---

# 153. Triết lý kiểm thử

Chuỗi tin cậy mong muốn là:

```text
Schemas
  prove inputs are valid

Unit Tests
  prove isolated rules

Integration Tests
  prove modules collaborate

Contract Tests
  prove extensions remain compatible

Golden Tests
  prove target output

Security Tests
  prove boundaries

E2E Tests
  prove the product works
```

Không một tầng test đơn lẻ nào có thể thay thế các tầng khác.

---

# 154. Ma trận test tham chiếu

| Subsystem | Unit | Integration | Contract | Golden | Bảo mật | E2E |
|---|---:|---:|---:|---:|---:|---:|
| Canonical Domain | Cao | Thấp | — | — | Trung bình | — |
| Schemas | Cao | Trung bình | Cao | — | Trung bình | — |
| Catalog | Cao | Cao | — | — | Thấp | Trung bình |
| Resolver | Rất cao | Cao | — | — | Trung bình | Cao |
| Policy | Rất cao | Cao | — | — | Rất cao | Cao |
| Trust | Rất cao | Cao | — | — | Rất cao | Cao |
| Lockfile | Cao | Cao | Cao | Trung bình | Cao | Cao |
| Source Adapter | Trung bình | Cao | Rất cao | Trung bình | Rất cao | Trung bình |
| Target Adapter | Trung bình | Cao | Rất cao | Rất cao | Cao | Cao |
| Filesystem Apply | Cao | Rất cao | — | — | Rất cao | Rất cao |
| CLI | Trung bình | Cao | Cao | Trung bình | Trung bình | Rất cao |

---

# 155. Công cụ được khuyến nghị

Với stack TypeScript dự kiến:

```text
Vitest
```

phù hợp cho:

```text
unit
integration
snapshot
coverage
```

Công cụ bổ sung MAY bao gồm:

```text
fast-check
    property-based testing

dependency-cruiser / madge / knip
    architecture and dependency checks

temporary Git repositories
    Source Adapter integration

Node subprocess test harness
    CLI integration
```

Việc lựa chọn công cụ SHOULD luôn thứ yếu so với các hợp đồng kiểm thử.

---

# 156. Các tầng thực thi test

Workflow local được khuyến nghị:

```bash
pnpm test
```

nên chạy các test nhanh.

Trước khi push:

```bash
pnpm test:integration
```

CI:

```bash
pnpm test:ci
```

Release:

```bash
pnpm test:release
```

Tên script chính xác có thể được quyết định trong quá trình implementation.

---

# 157. Các nhóm test CI được khuyến nghị

```text
Group A — Static

lint
typecheck
architecture


Group B — Core

unit
resolver
policy
trust


Group C — Integration

catalog
lockfile
filesystem
CLI


Group D — Adapters

conformance
golden


Group E — Security

security regressions


Group F — E2E

critical product workflows
```

Cấu trúc này cho phép song song hóa CI sau này.

---

# 158. Phân loại lỗi

Lỗi test SHOULD làm rõ ràng loại của chúng.

Ví dụ:

```text
UNIT

CONTRACT

GOLDEN

SECURITY

E2E
```

Điều này cải thiện việc phân loại xử lý (triage) trong CI.

---

# 159. Quy tắc review golden output

Một thay đổi golden output SHOULD trả lời được:

```text
Why did target output change?

Was canonical behavior changed?

Was adapter behavior changed?

Is the change backward compatible?

Does the lockfile need to reflect anything?
```

Các thay đổi golden MUST NOT được chấp nhận một cách máy móc.

---

# 160. Quy tắc regression test

Mọi lỗi production có ý nghĩa SHOULD tạo ra:

```text
bug reproduction
+
regression test
+
fix
```

Regression test MUST thất bại trước bản sửa và vượt qua sau bản sửa.

---

# 161. Quy tắc regression bảo mật

Mọi lỗi bảo mật MUST có một regression test vĩnh viễn trừ khi không thể về mặt kỹ thuật.

Regression test bảo mật SHOULD được gắn tag hoặc nhóm lại để dễ thực thi.

---

# 162. Tag cho test

Metadata test trong tương lai MAY phân loại test:

```text
unit
integration
security
slow
e2e
adapter
```

Điều này giúp chọn test ở local và song song hóa CI.

---

# 163. Chính sách test chậm

Test chậm SHOULD NOT âm thầm lọt vào bộ unit test mặc định.

Chúng SHOULD được phân loại tường minh.

Ví dụ:

```text
large Git fixture
large dependency graph
cross-platform E2E
```

---

# 164. Xác thực release candidate

Một release candidate SHOULD vượt qua:

```text
full test matrix

cross-platform tests

fresh install E2E

upgrade E2E

frozen lockfile build

offline build

security regression suite

determinism check
```

---

# 165. Kiểm thử nâng cấp

Trước các release ổn định, kiểm thử:

```text
previous release
      ↓
upgrade CLI
      ↓
existing config
      ↓
existing lockfile
      ↓
validate/build/install
```

Điều này phát hiện các regression về tương thích.

---

# 166. Kiểm thử cài đặt mới

Đồng thời kiểm thử một môi trường sạch:

```text
no cache
no prior config
no lockfile
```

Sau đó:

```text
init
resolve
install
```

---

# 167. Kiểm thử tái lập

Cho trước:

```text
same repository
same lockfile
same adapter versions
```

hai môi trường sạch SHOULD tạo ra cùng một cây file được sinh ra.

Điều này SHOULD được xác minh trước V1.

---

# 168. Test tương thích target

Adapter MAY khai báo các phiên bản runtime được hỗ trợ.

Fixture SHOULD xác thực:

```text
supported runtime

old unsupported runtime

future unknown runtime
```

khi khả năng tương thích phiên bản runtime của target trở nên liên quan.

---

# 169. Regression test cho thay đổi trust

Việc cập nhật MUST được kiểm thử với các thay đổi như:

```text
publisher changed

repository changed

signature missing

new community dependency

revoked revision
```

Những thay đổi này MUST luôn hiển thị rõ.

---

# 170. Các bất biến của chiến lược kiểm thử

Những điều sau đây mang tính quy phạm.

## Bất biến 1 — Logic core không có test phụ thuộc mạng

Chức năng core thuần MUST có thể kiểm thử offline.

## Bất biến 2 — Adapter vượt qua các hợp đồng chung

Mọi adapter MUST vượt qua các conformance test.

## Bất biến 3 — Output được sinh ra được golden test

Các Target Adapter production MUST duy trì các golden fixture mang tính đại diện.

## Bất biến 4 — Tính deterministic được kiểm thử tường minh

Tính deterministic MUST NOT được giả định.

## Bất biến 5 — Ranh giới bảo mật có regression test

Các cơ chế kiểm soát bảo mật quan trọng MUST có test riêng.

## Bất biến 6 — E2E xác nhận các workflow sản phẩm thực

Vòng lặp sản phẩm chính MUST có độ bao phủ E2E.

## Bất biến 7 — Interface dành cho máy có contract test

CLI JSON, lockfile, schema và adapter API MUST được coi là các bề mặt tương thích.

## Bất biến 8 — Test mặc định độc lập với mạng

Các dependency vào mạng công cộng MUST NOT khiến CI thông thường trở nên thiếu tin cậy.

## Bất biến 9 — Test bảo toàn kiến trúc

Các ranh giới dependency SHOULD được thực thi tự động.

## Bất biến 10 — Test chập chờn là lỗi

Test không deterministic MUST được sửa, không được coi là bình thường.

---

# 171. Thứ tự implementation ban đầu

Implement hạ tầng kiểm thử theo thứ tự sau:

```text
1. Vitest baseline

2. shared fixture utilities

3. schema tests

4. canonical ID tests

5. repository scanner tests

6. catalog tests

7. resolver tests

8. policy tests

9. lockfile tests

10. adapter conformance kit

11. Claude golden fixtures

12. filesystem safety tests

13. CLI integration harness

14. E2E fixture

15. security regression suite

16. determinism suite
```

---

# 172. Các fixture đầu tiên được khuyến nghị

Tạo:

```text
tests/fixtures/
├── minimal-valid/
├── invalid-manifest/
├── frontend-profile/
├── dependency-cycle/
├── policy-denied/
├── mixed-trust/
├── path-traversal/
└── multi-target/
```

Chúng có thể hỗ trợ nhiều tầng test.

---

# 173. Định nghĩa E2E đầu tiên

E2E test đầu tiên SHOULD chứng minh:

```text
Given
  a valid first-party frontend Profile

When
  the project is resolved
  and rendered for Claude
  and installed

Then
  generated files equal expected output
  lockfile verifies
  no unknown files are modified
  second install produces no changes
```

Đây là test tự động quan trọng nhất của MVP.

---

# 174. Tiêu chí thành công của kiểm thử

Kiến trúc kiểm thử hoạt động tốt khi:

```text
new target
→ mostly adds adapter tests

new source
→ mostly adds Source Adapter tests

new CLI surface
→ does not require retesting domain semantics manually

new bug
→ can be reproduced with a small fixture

same locked environment
→ always produces the same output
```

---

# 175. Tóm tắt quyết định cuối cùng

Dự án áp dụng mô hình kiểm thử phân tầng:

```text
Unit
    → rules

Integration
    → collaboration

Contract
    → extensibility

Golden
    → representation

Security
    → boundaries

E2E
    → product behavior
```

Các lĩnh vực ưu tiên cao nhất là:

```text
Resolver correctness
Policy enforcement
Trust evaluation
Lockfile reproducibility
Adapter conformance
Filesystem safety
Deterministic output
```

Quy tắc trung tâm là:

> Nếu một hành vi là một phần của hợp đồng kiến trúc, bảo đảm khả năng tái lập hoặc ranh giới bảo mật, nó phải có thể được kiểm thử tự động.

---

# 176. Tài liệu liên quan

Tài liệu này nên được đọc cùng với:

```text
architecture.md

security-model.md
trust-model.md

manifest-spec.md
catalog-spec.md
resolution-spec.md
policy-spec.md
lockfile-spec.md
adapter-spec.md
cli-spec.md

versioning-spec.md
migration-spec.md
```

Trách nhiệm:

```text
architecture.md
    → defines boundaries

testing-strategy.md
    → proves those boundaries remain true

security-model.md
    → defines security controls

testing-strategy.md
    → regression-tests those controls

adapter-spec.md
    → defines adapter contracts

testing-strategy.md
    → defines adapter conformance

cli-spec.md
    → defines CLI contracts

testing-strategy.md
    → validates those contracts
```