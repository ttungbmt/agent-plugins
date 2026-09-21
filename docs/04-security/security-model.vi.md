# Mô hình bảo mật

**Trạng thái:** Bản nháp  
**Phiên bản:** 0.1.0  
**Cập nhật lần cuối:** 2026-09-21

---

# 1. Mục đích

Tài liệu này định nghĩa mô hình bảo mật cho nền tảng Agent Plugins.

Nền tảng quản lý các capability AI-agent có thể tái sử dụng, có nguồn gốc từ:

```text
first-party content
vendor repositories
community repositories
local project content
external registries
```

và chuyển đổi chúng thành các artifact đặc thù theo runtime cho các hệ thống như:

```text
Claude
Codex
Gemini
OpenCode
Hermes
future agent runtimes
```

Vì các package bên ngoài có thể chứa chỉ dẫn, hook, script, khai báo tool, hoặc cấu hình được sinh ra, hệ thống MUST xem việc nạp package (ingestion) và việc render target là các thao tác nhạy cảm về bảo mật.

Mục tiêu bảo mật chính là:

> Agent Plugins không bao giờ được biến việc khám phá package, resolution, hoặc rendering thành thực thi code ngầm định hoặc thay đổi filesystem không được kiểm soát.

---

# 2. Các nguyên tắc bảo mật

Mô hình bảo mật tuân theo các nguyên tắc sau:

1. **Mặc định không tin cậy**
2. **Không thực thi ngầm định**
3. **Ranh giới tin cậy tường minh**
4. **Đặc quyền tối thiểu**
5. **Policy trước khi thực thi**
6. **Toàn vẹn trước khi sử dụng**
7. **Build deterministic**
8. **Ranh giới filesystem an toàn**
9. **Provenance ở mọi nơi**
10. **Mặc định không lan truyền secret**
11. **Cô lập target**
12. **Fail closed khi có điểm mơ hồ nghiêm trọng**
13. **Hành vi nguy hiểm phải hiển thị cho con người**
14. **Phòng thủ nhiều lớp**

---

# 3. Threat model

Nền tảng có thể xử lý nội dung do bên thứ ba kiểm soát.

Các đối thủ tiềm năng bao gồm:

```text
malicious package author
compromised upstream repository
compromised dependency
malicious marketplace entry
supply-chain attacker
malicious local repository contributor
misconfigured project
compromised adapter
```

Hệ thống MUST giả định rằng metadata và nội dung package bên ngoài có thể độc hại.

---

# 4. Các tài sản cần bảo vệ

Các tài sản được bảo vệ chính bao gồm:

```text
user source code

project files

credentials

environment variables

API keys

SSH keys

tokens

runtime configuration

agent instructions

lockfiles

package integrity metadata

local filesystem

CI environment

developer workstation
```

Các tài sản thứ cấp bao gồm:

```text
repository integrity
generated artifact correctness
build reproducibility
package provenance
policy configuration
```

---

# 5. Ranh giới bảo mật

Các ranh giới tin cậy chính là:

```text
Internet
   │
   ▼
Source Adapter
   │
   ▼
Source Cache
   │
   ▼
Normalization
   │
   ▼
Canonical Model
   │
   ▼
Resolver
   │
   ▼
Policy Engine
   │
   ▼
Target Adapter
   │
   ▼
Render Plan
   │
   ▼
Filesystem Apply
   │
   ▼
Target Runtime
```

Mỗi bước chuyển tiếp MUST được xem là một ranh giới bảo mật riêng biệt.

---

# 6. Các vùng tin cậy

Các vùng tin cậy được khuyến nghị:

```text
Zone 0 — First Party
Zone 1 — Trusted Vendor
Zone 2 — Verified Community
Zone 3 — Community
Zone 4 — Untrusted / Unknown
Zone 5 — Local Project
```

Ví dụ về trust level:

```yaml
trust:
  first-party: highest
  trusted-vendor: high
  verified-community: medium
  community: low
  unknown: untrusted
```

Trust level MUST NOT tự động ngụ ý quyền thực thi.

---

# 7. Nội dung first-party

Nội dung first-party được tạo và duy trì bên trong repository chuẩn (canonical).

Nó MAY nhận trust level mặc định cao hơn.

Tuy nhiên, nội dung first-party vẫn MUST vượt qua:

```text
schema validation
path validation
policy evaluation
adapter validation
```

Trạng thái first-party MUST NOT bỏ qua các cơ chế kiểm soát bảo mật cốt lõi.

---

# 8. Nội dung vendor

Nội dung vendor bao gồm các package upstream được tuyển chọn, chẳng hạn như các repository skill hoặc agent bên ngoài.

Các package vendor MUST bảo toàn:

```text
original source
revision
integrity
license
import metadata
```

Ví dụ:

```yaml
provenance:
  type: git
  repository: https://github.com/example/project
  revision: abc123
  integrity: sha256-...
```

Các package vendor SHOULD được pin vào các revision bất biến.

---

# 9. Nội dung cộng đồng

Các package cộng đồng MUST được mặc định xem là không tin cậy.

Nội dung cộng đồng SHOULD NOT được phép:

```text
execute scripts during install
run shell commands during discovery
write outside managed target directories
read arbitrary local files
access credentials
modify project configuration
```

khi không có ủy quyền tường minh.

---

# 10. Mức tin cậy của source

Mỗi source được cấu hình SHOULD có một phân loại tin cậy tường minh.

Ví dụ:

```yaml
sources:
  community:
    adapter: git
    trust: community
```

Policy MAY giới hạn các source:

```yaml
allow:
  sources:
    - first-party
    - trusted-vendor
```

---

# 11. Bảo mật khi nạp source

Các Source Adapter MAY tương tác với các hệ thống từ xa.

Chúng MUST:

```text
validate URLs
validate protocols
pin revisions where possible
avoid arbitrary command execution
validate archive extraction paths
validate symbolic links
verify integrity when available
```

Chúng MUST NOT thực thi ngầm định các installation hook do repository cung cấp.

---

# 12. Các giao thức source được cho phép

Các implementation SHOULD cho phép tường minh các scheme được hỗ trợ.

Ví dụ:

```text
https
ssh
file
```

Các scheme nguy hiểm hoặc không được hỗ trợ MUST bị từ chối.

Ví dụ:

```text
javascript:
data:
custom executable protocols
```

---

# 13. Bảo mật Git

Các Source Adapter dựa trên Git SHOULD:

- chỉ fetch các object cần thiết;
- resolve các tham chiếu tượng trưng (symbolic reference) thành các commit bất biến;
- ghi lại commit hash;
- tránh các repository hook;
- tránh tự động thực thi script của submodule;
- xác thực source của submodule nếu submodule được hỗ trợ.

Metadata Git MUST được xem là input không tin cậy.

---

# 14. Giải nén archive

Nếu package được phân phối dưới dạng archive, việc giải nén MUST ngăn chặn:

```text
../ traversal
absolute paths
symlink escape
hardlink escape
device files
unexpected executable placement
```

Mọi đường dẫn được giải nén MUST nằm trong thư mục gốc giải nén được chỉ định.

---

# 15. Bảo vệ chống path traversal

Mọi đường dẫn có nguồn gốc từ một package MUST được chuẩn hóa và xác thực.

Từ chối:

```text
../../secret
/etc/passwd
C:\Users\...
\\server\share
```

trừ khi được cho phép tường minh bởi một cơ chế cấu hình cục bộ đáng tin cậy.

Các đường dẫn package chuẩn MUST là đường dẫn tương đối.

---

# 16. Bảo mật symlink

Symlink MUST được xử lý cẩn thận.

Theo mặc định, các package có nguồn gốc bên ngoài SHOULD NOT được phép tạo symlink trong quá trình cài đặt.

Nếu symlink được hỗ trợ:

```text
resolved target MUST remain inside allowed root
```

Việc duyệt symlink ra ngoài các thư mục được quản lý MUST thất bại.

---

# 17. Ranh giới chuẩn hóa canonical

Nội dung source chỉ trở nên đủ tin cậy cho quá trình xử lý thông thường của hệ thống sau khi:

```text
fetch
↓
integrity verification
↓
schema validation
↓
normalization
```

Quá trình chuẩn hóa MUST NOT thực thi logic của package.

Chuẩn hóa là một phép biến đổi dữ liệu thuần túy.

---

# 18. An toàn của canonical model

Canonical domain model MUST duy trì tính khai báo.

Nó SHOULD chứa:

```text
metadata
instructions
dependencies
capabilities
configuration
```

Nó SHOULD NOT chứa code thực thi tùy ý như một phần ngữ nghĩa domain cốt lõi.

Hành vi thực thi MUST được phân loại tường minh.

---

# 19. Các Component có thể thực thi

Một số loại component cuối cùng có thể biểu diễn hành vi thực thi.

Ví dụ:

```text
hooks
scripts
commands
tool integrations
```

Các component như vậy MUST khai báo các đặc tính bảo mật của chúng.

Ví dụ:

```yaml
security:
  executable: true

  permissions:
    - filesystem:read
    - shell:execute
```

Mô hình quyền chính xác MAY thay đổi theo thời gian.

---

# 20. Không thực thi trong quá trình Resolution

Resolver MUST NOT:

```text
execute shell commands
execute package scripts
load arbitrary package code
invoke target runtime hooks
run generated agents
```

Resolution MUST vẫn là một phép tính dependency thuần túy.

---

# 21. Không thực thi trong quá trình lập catalog

Các thao tác catalog MUST NOT thực thi code của package.

Command sau:

```bash
agent-plugins catalog list
```

MUST an toàn khi chạy trên metadata không tin cậy.

---

# 22. Không thực thi trong quá trình validation

Validation MUST chỉ kiểm tra các cấu trúc khai báo.

Validation MUST NOT gọi các thành phần sau do package cung cấp:

```text
scripts
hooks
commands
agents
tools
```

---

# 23. Bảo mật khi rendering

Các Target Adapter MAY sinh ra các file mà sau này sẽ được các target runtime diễn giải.

Do đó, adapter MUST xác thực:

```text
output paths
filenames
metadata
target syntax
executable declarations
```

Adapter MUST NOT trực tiếp thực thi output đã render.

---

# 24. Độ tin cậy của adapter

Adapter là các component có đặc quyền.

Một Target Adapter độc hại có khả năng ghi các file tùy ý.

Do đó:

```text
Target Adapters SHOULD be first-party or explicitly trusted.
```

Các adapter cộng đồng SHOULD NOT được thực thi tự động.

---

# 25. Cô lập adapter

Về lâu dài, các adapter của bên thứ ba SHOULD chạy trong một môi trường thực thi bị giới hạn.

Các kỹ thuật khả thi:

```text
process isolation
restricted filesystem access
sandbox
capability-based API
WASM
```

Điều này không bắt buộc cho V1 nhưng SHOULD ảnh hưởng đến thiết kế API.

---

# 26. Quyền của adapter

Metadata adapter trong tương lai MAY khai báo:

```yaml
permissions:
  filesystem:
    read:
      - project
    write:
      - target-root

  network: false
```

Core SHOULD cuối cùng có khả năng thực thi (enforce) các quyền này.

---

# 27. Ranh giới target root

Các Target Adapter MUST tạo ra các đường dẫn tương đối so với một target root đã được cấu hình.

Ví dụ:

```text
targetRoot = .claude/
```

Các đường dẫn được sinh ra MUST nằm trong root này, trừ khi một cấu hình đáng tin cậy tường minh cho phép khác đi.

---

# 28. Quyền sở hữu filesystem

Hệ thống MUST theo dõi quyền sở hữu của các file được sinh ra.

Các file thuộc các nhóm:

```text
agent-plugins owned
user owned
unknown
```

Installer MUST NOT âm thầm ghi đè các file không xác định.

---

# 29. Dấu đánh dấu file được sinh ra

Các artifact được sinh ra SHOULD chứa metadata xác định nguồn gốc của chúng ở những nơi được hỗ trợ.

Ví dụ:

```text
Generated by agent-plugins
Source: skill:typescript
```

Ngoài ra, quyền sở hữu MAY được lưu trong một manifest.

---

# 30. Manifest artifact được quản lý

Hệ thống SHOULD duy trì một bản ghi về các file được quản lý.

Ví dụ:

```yaml
artifacts:
  - path: .claude/skills/typescript/SKILL.md
    source: skill:typescript
    integrity: sha256-...
```

Điều này cho phép dọn dẹp an toàn và phát hiện drift.

---

# 31. Bảo vệ file không xác định

Nếu một đường dẫn được sinh ra đã chứa sẵn một file không xác định:

```text
FAIL
```

trừ khi người dùng ủy quyền ghi đè một cách tường minh.

Hành vi mặc định MUST NOT là ghi đè.

---

# 32. Xóa an toàn

Hệ thống MAY chỉ xóa file khi:

```text
the file is known to be agent-plugins managed
AND
the desired state no longer contains it
```

Các file không xác định MUST NOT bị xóa.

---

# 33. Apply nguyên tử

Việc thay đổi filesystem SHOULD mang tính giao dịch (transactional) khi có thể.

Luồng được khuyến nghị:

```text
render
↓
stage
↓
validate
↓
compare
↓
apply
```

Một lần cài đặt thất bại SHOULD tránh để lại trạng thái dở dang.

---

# 34. Xử lý secret

Nội dung package MUST NOT tự động được cấp quyền truy cập vào:

```text
environment variables
credential stores
API keys
SSH keys
cloud credentials
```

Bản thân hệ thống SHOULD giảm thiểu việc đọc secret.

---

# 35. Che giấu secret

Diagnostic và log MUST che giấu (redact) các giá trị trông giống secret đã biết.

Ví dụ:

```text
API tokens
authorization headers
passwords
private keys
```

Không output có cấu trúc nào SHOULD chứa giá trị secret, trừ khi được yêu cầu tường minh và được hỗ trợ một cách an toàn.

---

# 36. Biến môi trường

CLI MAY đọc các biến cấu hình của chính nó, chẳng hạn như:

```text
AGENT_PLUGINS_*
```

Nó MUST NOT serialize các biến môi trường không liên quan vào các target artifact được sinh ra.

---

# 37. Secret trong cấu hình

Cấu hình project SHOULD NOT chứa secret ở dạng plaintext.

Thay vào đó, cấu hình SHOULD tham chiếu đến các cơ chế secret bên ngoài khi cần thiết.

Ví dụ:

```yaml
tokenEnv: GITHUB_TOKEN
```

thay vì:

```yaml
token: ghp_secretvalue
```

---

# 38. Ghi log

Việc ghi log MUST tránh in ra:

```text
credentials
raw authorization headers
private keys
full secret-bearing URLs
```

Chế độ debug MUST tuân theo cùng các yêu cầu bảo mật.

---

# 39. Tính toàn vẹn

Các package có nguồn gốc bên ngoài SHOULD được xác minh tính toàn vẹn.

Digest được khuyến nghị:

```text
SHA-256
```

Ví dụ:

```yaml
integrity: sha256-abc...
```

Tính toàn vẹn MUST được ghi lại trong lockfile khi áp dụng được.

---

# 40. Phạm vi toàn vẹn

Tính toàn vẹn MAY bao gồm:

```text
source archive
normalized package
individual artifacts
```

V1 SHOULD tối thiểu hỗ trợ tính toàn vẹn cho nội dung source bất biến đã được fetch.

---

# 41. Lỗi toàn vẹn

Nếu tính toàn vẹn khác với lockfile:

```text
ERROR SOURCE_INTEGRITY_MISMATCH
```

Hệ thống MUST fail closed.

Nó MUST NOT âm thầm tạo lại hash.

---

# 42. Tham chiếu bất biến

Các tham chiếu bên ngoài được ưu tiên:

```text
Git commit SHA
content hash
immutable release artifact
```

Không khuyến khích dùng cho lockfile:

```text
main
latest
master
HEAD
```

Các tham chiếu trôi nổi (floating) SHOULD được resolve thành các định danh bất biến trước khi lock.

---

# 43. Bảo mật lockfile

Lockfile là một artifact nhạy cảm về bảo mật.

Nó ghi lại:

```text
versions
revisions
integrity
source origins
adapter versions
```

Các thay đổi lockfile bất ngờ SHOULD có thể được review.

---

# 44. Xác minh lockfile

CI SHOULD chạy:

```bash
agent-plugins lock verify
```

Việc xác minh SHOULD bao gồm:

```text
schema
source revisions
integrity
configuration compatibility
adapter versions
```

---

# 45. Vai trò bảo mật của Policy

Policy là lớp thực thi (enforcement) khai báo chính.

Ví dụ:

```yaml
deny:
  trust:
    - community

  capabilities:
    - shell-execute

  sources:
    - unknown
```

Việc đánh giá Policy MUST diễn ra trước khi render target.

---

# 46. Policy không thể bị bỏ qua

Các Target Adapter MUST NOT khôi phục các package hoặc capability đã bị Policy từ chối.

Các Source Adapter MUST NOT đánh dấu nội dung là đáng tin cậy vượt quá trust policy đã được cấu hình.

Các command tiện ích của CLI MUST NOT bỏ qua Policy.

---

# 47. Phân loại rủi ro của Capability

Các Capability SHOULD cuối cùng bao gồm metadata về rủi ro bảo mật.

Ví dụ:

```yaml
capability:
  id: shell-execution

  risk:
    level: high
```

Các lớp được đề xuất:

```text
informational
low
medium
high
critical
```

Phân loại rủi ro MAY ảnh hưởng đến policy.

---

# 48. Các Capability nhạy cảm được đề xuất

Hệ thống SHOULD nhận diện các capability như:

```text
filesystem-read
filesystem-write
shell-execute
network-access
secret-access
git-write
process-spawn
browser-control
external-api
runtime-hook
```

Chúng biểu diễn ngữ nghĩa bảo mật thay vì các tính năng đặc thù theo target.

---

# 49. Mô hình quyền

Một mô hình quyền canonical trong tương lai SHOULD dựa trên capability.

Ví dụ:

```yaml
permissions:
  filesystem:
    read:
      - project

    write:
      - generated-root

  network:
    allow:
      - api.github.com

  process:
    spawn: false
```

V1 MAY chỉ mô hình hóa các quyền mà không thực thi (enforce) tất cả chúng.

---

# 50. Quyền mặc định

Mặc định nên mang tính hạn chế:

```text
network: denied
shell execution: denied
secret access: denied
arbitrary filesystem write: denied
```

Việc thực thi target/runtime tường minh sau này có thể mở rộng các quyền này.

---

# 51. Hook

Hook vốn dĩ nhạy cảm về bảo mật.

Một hook MAY được thực thi tự động do các sự kiện lifecycle.

Do đó, hook SHOULD yêu cầu:

```text
explicit declaration
policy approval
target support
clear diagnostics
```

Các hook thực thi không xác định SHOULD thất bại hoặc bị vô hiệu hóa.

---

# 52. Tính minh bạch của hook

Việc lập kế hoạch của CLI SHOULD hiển thị hook một cách rõ ràng.

Ví dụ:

```text
Executable behavior detected:

hook:session-start
  source: vendor/example
  action: shell command
```

Hành vi nguy hiểm MUST NOT bị chôn vùi chỉ trong output chi tiết (verbose).

---

# 53. Command

Các agent command có thể chứa chỉ dẫn khuyến khích việc thực thi tool.

Bản thân nền tảng SHOULD xem các định nghĩa command là dữ liệu.

Nó MUST NOT thực thi chúng trong quá trình:

```text
catalog
resolve
build
install
```

Việc thực thi thuộc về target runtime.

---

# 54. Prompt injection

Nội dung chỉ dẫn bên ngoài có thể chứa các prompt độc hại.

Agent Plugins không thể ngăn chặn hoàn toàn prompt injection ở runtime.

Tuy nhiên, nó SHOULD giảm thiểu rủi ro bằng cách bảo toàn các ranh giới.

Các package bên ngoài MUST NOT được phép âm thầm thay đổi các canonical component không liên quan.

---

# 55. Provenance của chỉ dẫn

Các chỉ dẫn được sinh ra SHOULD giữ lại provenance khi khả thi.

Điều này cho phép người dùng trả lời:

```text
Where did this instruction come from?
```

Ví dụ:

```text
agent:reviewer
source: vendor/ecc
revision: abc123
```

---

# 56. Bảo mật semantic overlay

Overlay có thể chủ ý sửa đổi nội dung được import.

Việc áp dụng overlay MUST tường minh và deterministic.

Một package upstream MUST NOT có khả năng định nghĩa một overlay sửa đổi package khác, trừ khi được canonical model cho phép.

---

# 57. Ranh giới overlay

Các tham chiếu target của overlay MUST được xác thực.

Ví dụ:

```yaml
target: plugin:example
```

Một overlay MUST NOT sử dụng filesystem traversal để nhắm tới các file tùy ý.

---

# 58. Các mối đe dọa supply chain

Nền tảng MUST xem xét:

```text
upstream repository compromise
maintainer account compromise
dependency takeover
malicious release
tag retargeting
registry compromise
DNS compromise
```

Các biện pháp giảm thiểu bao gồm:

```text
immutable revisions
integrity hashes
provenance
policy
manual review
trusted sources
```

---

# 59. Dependency confusion

Các canonical package ID MUST được resolve trong các source namespace được cấu hình tường minh.

Resolver MUST NOT tự động truy vấn các registry từ xa tùy ý khi thiếu một dependency cục bộ.

Điều này ngăn chặn dependency confusion.

---

# 60. Namespace của source

Các source SHOULD có định danh tường minh.

Ví dụ:

```text
first-party:typescript
vendor:mattpocock/typescript
community:foo/typescript
```

Ngay cả khi tồn tại các alias canonical, provenance MUST vẫn phân biệt được.

---

# 61. Thứ tự ưu tiên source

Thứ tự ưu tiên source MUST tường minh.

Hệ thống MUST NOT ngầm định ưu tiên một package từ xa hơn một package cục bộ hoặc first-party có cùng ID.

Các xung đột SHOULD thất bại, trừ khi policy/cấu hình giải quyết chúng một cách tường minh.

---

# 62. Typosquatting

Các hệ sinh thái package cộng đồng có thể chứa các tên tương tự nhau.

CLI SHOULD hiển thị:

```text
provider
source
trust level
```

trong quá trình chọn package.

Nó SHOULD tránh âm thầm chọn package chỉ dựa trên tìm kiếm mờ (fuzzy search).

---

# 63. Bảo mật khi cập nhật

Cập nhật là một rủi ro supply chain lớn.

`update` MUST:

```text
discover candidate
verify provenance
fetch
verify integrity
normalize
validate
resolve
apply policy
show change
update lockfile
```

Nó MUST NOT tự động cài đặt các runtime artifact trừ khi được yêu cầu tường minh.

---

# 64. Xem trước bản cập nhật

Người dùng SHOULD thấy:

```text
version changes
revision changes
source changes
capability changes
permission changes
executable behavior changes
```

trước các bản cập nhật quan trọng.

---

# 65. Diff cập nhật nhạy cảm về bảo mật

Một bản cập nhật SHOULD được làm nổi bật nếu nó thêm:

```text
hooks
shell execution
new network access
new source
new permissions
new executable components
```

Những điều này SHOULD được xem là các thay đổi liên quan đến bảo mật.

---

# 66. Phát hiện hạ cấp tin cậy

Hệ thống SHOULD phát hiện khi một bản cập nhật thay đổi các đặc tính tin cậy.

Ví dụ:

```text
trusted-vendor
→ unknown source
```

Điều này SHOULD thất bại theo mặc định.

---

# 67. Supply chain của adapter

Các phiên bản adapter SHOULD được pin.

Các thay đổi của target adapter có thể làm thay đổi đáng kể cấu hình runtime được sinh ra.

Lockfile SHOULD ghi lại các phiên bản adapter.

---

# 68. Review nâng cấp adapter

Các bản nâng cấp adapter SHOULD có thể được review độc lập với các bản cập nhật package.

Ví dụ:

```text
Claude adapter:
1.2.0 → 2.0.0
```

Một bản nâng cấp adapter lớn (major) SHOULD kích hoạt việc xem trước quá trình sinh lại.

---

# 69. Bảo mật CLI

CLI MUST:

```text
validate all user paths
avoid shell interpolation
avoid command injection
separate arguments from command strings
avoid eval
avoid dynamic arbitrary imports from untrusted sources
```

---

# 70. Shell command

Nếu implementation có lúc cần gọi các system command:

```text
arguments MUST be passed as argument arrays
```

Tránh:

```text
exec("git clone " + userInput)
```

Ưu tiên các API subprocess có cấu trúc.

---

# 71. Configuration injection

Các giá trị cấu hình MUST NOT được chèn một cách mù quáng vào shell command, script được sinh ra, hoặc cấu hình có thể thực thi.

Adapter MUST escape hoặc xác thực cú pháp target một cách phù hợp.

---

# 72. File tạm

Các thư mục tạm SHOULD:

```text
use secure random names
have restrictive permissions where appropriate
be cleaned after use
```

Nội dung nhạy cảm SHOULD không tồn tại lâu trong các vị trí tạm một cách không cần thiết.

---

# 73. Bảo mật cache

Source cache MUST NOT được xem là đáng tin cậy chỉ vì nó đã tồn tại sẵn ở máy cục bộ.

Các mục cache SHOULD được liên kết với:

```text
source
revision
integrity
```

Các mục cache bị hỏng MUST thất bại khi xác minh tính toàn vẹn.

---

# 74. Cache poisoning

Các cache key SHOULD bao gồm các định danh bất biến hoặc hash mạnh.

Tránh định danh cache chỉ dựa trên:

```text
package name
branch name
```

---

# 75. Chế độ offline

Chế độ offline SHOULD tăng cường khả năng tái tạo (reproducibility).

```bash
agent-plugins build --offline
```

phải ngăn chặn truy cập mạng.

Nếu nội dung đã lock không khả dụng:

```text
fail
```

thay vì fetch.

---

# 76. Bảo mật CI

CI SHOULD sử dụng:

```text
frozen lockfile
offline mode where possible
strict validation
policy enforcement
integrity verification
```

Khuyến nghị:

```bash
agent-plugins validate --strict

agent-plugins lock verify

agent-plugins build \
  --frozen-lockfile \
  --offline
```

---

# 77. Secret trong CI

Các secret của CI MUST NOT bị lộ cho nội dung package trong quá trình catalog, resolution, hoặc rendering.

Các source adapter MAY cần credential để fetch các repository riêng tư.

Các credential này SHOULD chỉ được giới hạn trong phạm vi thao tác fetch.

---

# 78. Phạm vi credential

Credential của source SHOULD tuân theo nguyên tắc đặc quyền tối thiểu.

Ví dụ, GitHub token SHOULD có:

```text
read-only repository access
```

thay vì các đặc quyền rộng ở cấp tổ chức.

---

# 79. Source riêng tư

Metadata của source riêng tư SHOULD không bị vô tình xuất ra các log công khai.

Repository MAY được hiển thị theo tên, nhưng các credential được nhúng MUST bị loại bỏ.

Ví dụ:

```text
https://token@github.com/org/repo
```

phải được làm sạch (sanitize) trước khi ghi log.

---

# 80. Độ tin cậy của project cục bộ

Nội dung repository cục bộ MAY độc hại.

Chạy Agent Plugins trong một project được clone không tin cậy SHOULD NOT tự động:

```text
execute scripts
load arbitrary JavaScript configuration
execute custom adapters
run hooks
```

Cấu hình SHOULD tốt nhất là vẫn mang tính khai báo.

---

# 81. Cấu hình là dữ liệu

Cấu hình project SHOULD sử dụng các định dạng khai báo như:

```text
YAML
JSON
TOML
```

thay vì dạng có thể thực thi:

```text
JavaScript
TypeScript
Python
```

cho đường dẫn cấu hình mặc định.

Điều này giảm đáng kể việc thực thi code tùy ý thông qua cấu hình.

---

# 82. Bảo mật đối với tác giả plugin

Tác giả package SHOULD khai báo:

```text
required capabilities
security-sensitive behaviors
external resources
runtime requirements
```

Các quyền không được khai báo SHOULD không được mặc định giả định.

---

# 83. Trách nhiệm của target runtime

Agent Plugins kiểm soát việc quản lý package và sinh artifact.

Nó không kiểm soát hoàn toàn mô hình bảo mật của runtime sử dụng các artifact đó.

Do đó:

```text
Agent Plugins security
+
Target runtime security
```

cùng nhau quyết định rủi ro runtime cuối cùng.

---

# 84. Suy giảm Capability

Khi một Target Adapter không thể biểu diễn an toàn một capability nhạy cảm về bảo mật:

```text
fail
```

được ưu tiên hơn việc âm thầm bỏ qua.

Ví dụ:

```text
hook requiring shell execution
```

không được lặng lẽ trở thành một prompt không bị giới hạn.

---

# 85. Các điều kiện fail-closed

Hệ thống SHOULD fail closed đối với:

```text
integrity mismatch
unknown critical schema
path traversal
artifact collision
policy rejection
unsafe executable capability
trust downgrade
ambiguous source identity
unsupported security-sensitive mapping
```

---

# 86. Các điều kiện fail-open

Hành vi fail-open MAY chỉ được chấp nhận đối với các vấn đề hiển thị không quan trọng.

Ví dụ:

```text
missing optional package description
```

Ngữ nghĩa bảo mật MUST NOT fail open.

---

# 87. Diagnostic

Các diagnostic liên quan đến bảo mật SHOULD có các mã chuyên biệt.

Các ví dụ được khuyến nghị:

```text
SEC_PATH_TRAVERSAL

SEC_INTEGRITY_MISMATCH

SEC_UNTRUSTED_SOURCE

SEC_EXECUTABLE_COMPONENT

SEC_PERMISSION_ESCALATION

SEC_UNKNOWN_FILE_COLLISION

SEC_SECRET_EXPOSURE

SEC_ADAPTER_UNTRUSTED

SEC_TRUST_DOWNGRADE

SEC_SOURCE_NAMESPACE_COLLISION
```

---

# 88. Mức độ nghiêm trọng của diagnostic bảo mật

Các mức độ nghiêm trọng được khuyến nghị:

```text
info
warning
error
critical
```

Các diagnostic ở mức critical SHOULD chặn ngay lập tức việc thay đổi.

---

# 89. Output review bảo mật

Command trong tương lai:

```bash
agent-plugins inspect --security
```

có thể hiển thị:

```text
Sources
Trust levels
Executable components
Permissions
Hooks
Network requirements
Integrity status
```

Điều này MAY sau này trở thành:

```bash
agent-plugins security audit
```

---

# 90. Command kiểm toán bảo mật

Giao diện tiềm năng trong tương lai:

```text
agent-plugins security audit
```

Nó MAY kiểm tra:

```text
package trust
integrity
dangerous capabilities
adapter permissions
source changes
lockfile anomalies
generated executable artifacts
```

Đây là phần sau MVP.

---

# 91. Bảo mật về license

Metadata license chủ yếu là dữ liệu pháp lý/tuân thủ nhưng có thể ảnh hưởng đến policy của tổ chức.

Các package bên ngoài SHOULD ghi lại thông tin license khi biết được.

Policy MAY cuối cùng giới hạn:

```text
unknown licenses
forbidden licenses
```

---

# 92. Các yêu cầu về provenance

Mỗi package bên ngoài SHOULD trả lời được:

```text
Who published it?

Where did it come from?

Which exact revision?

Was it modified?

Which overlays were applied?
```

Hệ thống MUST bảo toàn đủ thông tin để tái dựng chuỗi này.

---

# 93. Chuỗi provenance

Ví dụ:

```text
GitHub repository
      ↓
commit abc123
      ↓
vendor import
      ↓
overlay organization/security
      ↓
canonical package
      ↓
resolved graph
      ↓
Claude adapter
      ↓
.claude/agents/reviewer.md
```

Chuỗi này SHOULD luôn có thể kiểm tra được.

---

# 94. Provenance của artifact được sinh ra

Một artifact được sinh ra SHOULD có thể truy vết ngược về:

```text
canonical component
package
provider
source
revision
adapter
```

Điều này cho phép điều tra sự cố.

---

# 95. Ứng phó sự cố bảo mật

Nếu phát hiện một package là độc hại:

Hệ thống SHOULD cho phép:

```text
identify affected projects
identify locked revisions
identify generated artifacts
disable source
deny package via policy
regenerate safe state
```

Hạ tầng thu hồi từ xa MAY được bổ sung sau.

---

# 96. Denylist

Một dịch vụ bảo mật trong tương lai MAY hỗ trợ denylist cho package hoặc revision.

Ví dụ:

```yaml
deny:
  revisions:
    - source: vendor/foo
      revision: compromised-sha
```

Policy cục bộ MUST vẫn sử dụng được mà không cần các dịch vụ từ xa.

---

# 97. Metadata khuyến cáo bảo mật

Các registry trong tương lai MAY công bố:

```text
security advisories
affected versions
severity
recommended fixed versions
```

Công cụ cập nhật MAY hiển thị chúng.

Nó MUST NOT âm thầm nâng cấp mà không tuân theo update policy.

---

# 98. Signature của package

Các phiên bản tương lai MAY hỗ trợ cryptographic signature.

Mô hình khả thi:

```text
publisher key
      ↓
package signature
      ↓
verification
```

Signature bổ sung cho, nhưng không thay thế:

```text
integrity
provenance
policy
review
```

---

# 99. Mô hình publisher đáng tin cậy

Một registry trong tương lai MAY phân biệt:

```text
verified publisher
trusted vendor
community publisher
unknown
```

Danh tính đã được xác minh MUST NOT ngụ ý rằng một package là an toàn.

Nó chỉ củng cố provenance.

---

# 100. Sandboxing

Nếu Agent Plugins cuối cùng thực thi code của bên thứ ba, việc thực thi MUST diễn ra trong một sandbox.

Các ranh giới khả thi:

```text
filesystem
network
process
environment
secrets
CPU
memory
time
```

Thực thi tùy ý trên host MUST NOT trở thành mặc định.

---

# 101. Runtime hook và sandboxing

Runtime hook có khả năng là nguồn rủi ro thực thi cao nhất.

Nếu nền tảng sau này hỗ trợ tự thực thi hook, kiến trúc bảo mật tối thiểu SHOULD bao gồm:

```text
permission declaration
user approval
policy evaluation
sandboxing
resource limits
audit trail
```

V1 MUST NOT thực thi các package hook tùy ý.

---

# 102. Bảo mật mạng

Các Source Adapter SHOULD sử dụng các phương thức truyền tải an toàn.

Ưu tiên:

```text
HTTPS
SSH
```

Các giao thức plaintext SHOULD bị từ chối, trừ khi được cho phép tường minh cho phát triển cục bộ.

---

# 103. SSRF

Nếu có thể cấu hình các URL từ xa, các implementation được host MUST xem xét SSRF.

Các biện pháp giảm thiểu tiềm năng:

```text
protocol allowlist
private IP restrictions
DNS validation
redirect validation
network sandbox
```

Điều này đặc biệt liên quan đến các dịch vụ cloud trong tương lai.

---

# 104. Redirect

Các HTTP Source Adapter SHOULD giới hạn chuỗi redirect và xác thực lại tính bảo mật của đích đến sau khi redirect.

Một redirect từ URL công khai đáng tin cậy đến hạ tầng nội bộ MUST NOT tự động kế thừa độ tin cậy.

---

# 105. Giới hạn tài nguyên

Các package bên ngoài MAY cố gắng gây từ chối dịch vụ (denial-of-service) thông qua:

```text
huge files
huge archives
deep directory trees
cyclic structures
large manifests
dependency explosions
```

Các implementation SHOULD áp đặt các giới hạn hợp lý.

---

# 106. Giới hạn dependency graph

Resolver SHOULD phòng vệ trước các graph bệnh lý (pathological).

Các giới hạn khả thi:

```text
maximum depth
maximum nodes
maximum edges
```

Các giới hạn SHOULD có thể cấu hình nhưng có giá trị mặc định an toàn.

---

# 107. Giới hạn archive

Các Source Adapter SHOULD bảo vệ chống lại decompression bomb.

Các kiểm tra khả thi:

```text
compressed size
expanded size
file count
path depth
```

---

# 108. Giới hạn manifest

Các parser manifest SHOULD giới hạn các giá trị bất hợp lý về:

```text
document size
nesting depth
string length
array size
```

khi các thư viện parser hỗ trợ các cơ chế kiểm soát như vậy.

---

# 109. Từ chối dịch vụ

Kiểm thử bảo mật SHOULD bao gồm:

```text
deep dependency graph
cyclic graph
huge manifest
many files
pathological YAML
large archive
```

---

# 110. Bảo mật YAML

Nếu YAML được sử dụng:

```text
unsafe custom tags MUST be disabled
```

Parser MUST chỉ nạp dữ liệu.

Nó MUST NOT khởi tạo các object tùy ý hoặc thực thi constructor.

---

# 111. Bảo mật JSON

Các parser JSON MUST tránh hành vi prototype không an toàn.

Việc merge object MUST phòng vệ trước các key gây prototype pollution như:

```text
__proto__
constructor
prototype
```

đặc biệt là trong các thao tác overlay.

---

# 112. Bảo mật khi merge overlay

Các thao tác merge MUST sử dụng ngữ nghĩa merge object an toàn.

Prototype pollution MUST được ngăn chặn.

Các trường như:

```text
__proto__
prototype
constructor
```

SHOULD bị từ chối khi không phù hợp.

---

# 113. Template injection

Các target adapter sử dụng template MUST xem nội dung canonical là dữ liệu.

Tránh các template engine không an toàn cho phép thực thi code tùy ý.

Template SHOULD NOT đánh giá các biểu thức do package cung cấp.

---

# 114. Filename injection

Tên và ID của package MUST NOT trở thành tên file khi chưa được chuẩn hóa.

Ví dụ canonical ID:

```text
../../evil
```

không bao giờ được tạo ra một đường dẫn filesystem.

Ngữ pháp ID SHOULD ngăn chặn các giá trị như vậy trước khi adapter render.

---

# 115. Phân biệt chữ hoa chữ thường

Hệ thống SHOULD phát hiện các xung đột gây ra bởi các filesystem không phân biệt chữ hoa chữ thường.

Ví dụ:

```text
Reviewer.md
reviewer.md
```

có thể xung đột trên Windows/macOS.

Việc phát hiện xung đột SHOULD xem xét hành vi filesystem của target.

---

# 116. Tên file dành riêng

Adapter SHOULD bảo vệ chống lại các tên file dành riêng của nền tảng.

Ví dụ trên Windows bao gồm:

```text
CON
PRN
AUX
NUL
COM1
LPT1
```

Các bản build đa nền tảng SHOULD xác thực những tên này khi liên quan.

---

# 117. Quyền của file

Các file được sinh ra SHOULD sử dụng quyền thận trọng.

Bit thực thi MUST NOT được đặt trừ khi được yêu cầu tường minh.

Các file chứa secret, nếu có lúc được hỗ trợ, SHOULD nhận quyền chặt chẽ hơn.

---

# 118. Quyền của source cache

Các thư mục cache SHOULD là riêng tư cho người dùng khi có thể.

Cache dùng chung đòi hỏi review bảo mật tường minh.

---

# 119. Xử lý credential tạm thời

Credential được dùng để fetch từ xa SHOULD chỉ tồn tại trong thời gian cần thiết.

Chúng SHOULD NOT được sao chép vào:

```text
lockfiles
cache metadata
generated artifacts
logs
diagnostics
```

---

# 120. Bảo mật và khả năng giải thích

Người dùng SHOULD có khả năng hiểu các quyết định bảo mật.

Ví dụ:

```text
plugin:foo was blocked

Reason:
  source trust = community

Policy:
  organization-security

Rule:
  deny community sources with shell-execute capability
```

Việc thực thi bảo mật SHOULD không gây cảm giác tùy tiện.

---

# 121. Bảo mật và tính deterministic

Các quyết định bảo mật MUST deterministic.

Với cùng:

```text
configuration
policy
catalog
lockfile
source metadata
```

kết quả policy/bảo mật SHOULD giống hệt nhau.

---

# 122. Cấu hình bảo mật

Các cơ chế kiểm soát bảo mật SHOULD có thể được cấu hình thông qua Policy thay vì các CLI flag rải rác.

Tránh:

```bash
--allow-dangerous-hooks
--allow-random-source
--ignore-integrity
```

như các flag thông thường.

Ý định bảo mật lâu dài thuộc về cấu hình policy.

---

# 123. Override khẩn cấp

Các override khẩn cấp hiếm hoi MAY tồn tại.

Chúng MUST:

```text
explicit
high visibility
non-default
auditable
```

Ý tưởng ví dụ:

```bash
agent-plugins install \
  --override-policy SEC_XYZ
```

Điều này SHOULD NOT tồn tại trong các phiên bản đầu, trừ khi xuất hiện một use case mạnh.

---

# 124. Chiến lược kiểm thử bảo mật

Các bài kiểm thử bảo mật SHOULD bao gồm:

```text
path traversal

symlink escape

archive traversal

integrity mismatch

package collision

unknown file overwrite

policy bypass attempt

source trust downgrade

prototype pollution

malicious YAML

dangerous filenames

dependency explosion
```

---

# 125. Fuzzing

Các implementation trong tương lai SHOULD cân nhắc fuzzing:

```text
manifest parser
canonical reference parser
overlay merge logic
path normalization
archive handling
```

---

# 126. Phân tích tĩnh

Repository SHOULD sử dụng các kiểm tra bảo mật tự động khi khả thi.

Các công cụ tiềm năng:

```text
dependency vulnerability scanning
secret scanning
static analysis
license scanning
```

Công cụ cụ thể phụ thuộc vào implementation.

---

# 127. Vệ sinh dependency

Các runtime dependency SHOULD được giảm thiểu.

Các module đặc biệt nhạy cảm bao gồm:

```text
archive extraction
Git wrappers
template engines
YAML parsers
filesystem utilities
process execution
```

Các dependency trong những lĩnh vực này cần được review kỹ hơn.

---

# 128. Pin dependency

Các dependency của project SHOULD sử dụng lockfile có thể tái tạo.

CI SHOULD xác minh tính toàn vẹn của lockfile của package manager.

Điều này tách biệt với lockfile domain của Agent Plugins.

---

# 129. Bảo mật build

Các bản build phát hành SHOULD có thể tái tạo khi khả thi.

Các pipeline phát hành SHOULD giới hạn những ai có thể publish CLI và adapter chính thức.

---

# 130. Ký bản phát hành

Các bản phát hành trong tương lai MAY bao gồm:

```text
artifact signatures
provenance attestations
SBOM
```

Những điều này được khuyến nghị trước khi phân phối ở quy mô hệ sinh thái.

---

# 131. Ma trận trách nhiệm bảo mật

```text
Source Adapter
    → secure retrieval and normalization

Catalog
    → safe indexing

Resolver
    → pure deterministic dependency selection

Policy
    → security enforcement

Lockfile
    → integrity and reproducibility

Target Adapter
    → safe target representation

Filesystem Layer
    → safe mutation

CLI
    → safe orchestration and transparent UX

Target Runtime
    → execution-time enforcement
```

---

# 132. Các bất biến bảo mật

Những điều sau đây mang tính quy chuẩn.

## Bất biến 1 — Không thực thi ngầm định

Việc fetch, lập catalog, resolve, validate, build, hoặc cài đặt MUST NOT thực thi code tùy ý do package cung cấp.

## Bất biến 2 — Không ghi filesystem tùy ý

Mọi thao tác ghi được sinh ra MUST nằm bên trong các target root đã được phê duyệt.

## Bất biến 3 — Không ghi đè file không xác định

Các file không xác định do người dùng sở hữu MUST NOT bị âm thầm ghi đè.

## Bất biến 4 — Thực thi tính toàn vẹn

Nội dung bên ngoài đã được pin MUST thất bại nếu việc xác minh tính toàn vẹn thất bại.

## Bất biến 5 — Bảo toàn provenance

Nội dung bên ngoài MUST bảo toàn định danh source và revision.

## Bất biến 6 — Thẩm quyền của Policy

Security Policy MUST được đánh giá trước khi rendering hoặc cài đặt.

## Bất biến 7 — Cô lập adapter

Adapter MUST NOT bỏ qua các ranh giới filesystem hoặc policy.

## Bất biến 8 — Cô lập secret

Nội dung package MUST NOT tự động giành được quyền truy cập vào secret.

## Bất biến 9 — Hành vi thực thi tường minh

Các capability có thể thực thi MUST hiển thị rõ và có thể phân loại được.

## Bất biến 10 — Fail closed

Sự mơ hồ nghiêm trọng về bảo mật MUST chặn thao tác.

---

# 133. Các yêu cầu bảo mật cho MVP

Trước khi phát hành MVP, những điều sau MUST tồn tại:

```text
path traversal protection

canonical ID validation

safe YAML parsing

no package execution

safe render paths

unknown file protection

policy engine

source provenance

lockfile integrity support

secret-safe logging

adapter validation

collision detection
```

---

# 134. Các yêu cầu trước khi mở cho cộng đồng

Trước khi các source cộng đồng được bật rộng rãi:

```text
source trust classification

integrity verification

vendor/community distinction

security-sensitive capability metadata

policy enforcement

update security diff

source namespace collision handling

security documentation
```

---

# 135. Các yêu cầu trước khi có registry

Trước khi tồn tại một registry công khai:

```text
publisher identity

package integrity

namespace ownership

trust metadata

license metadata

security advisories

malicious package response process
```

---

# 136. Các yêu cầu trước khi có adapter bên thứ ba

Trước khi các adapter bên thứ ba tùy ý có thể chạy:

```text
adapter trust model

permission model

sandbox strategy

adapter signing/provenance

filesystem enforcement

network enforcement
```

Cho đến lúc đó:

> Adapter SHOULD được xem là code ứng dụng đáng tin cậy.

---

# 137. Lộ trình bảo mật

Thứ tự implementation được khuyến nghị:

```text
1. Safe canonical IDs

2. Path validation

3. Declarative configuration

4. Safe schema parsing

5. No execution guarantees

6. Provenance model

7. Integrity model

8. Policy enforcement

9. Safe render planning

10. File ownership tracking

11. Source trust classification

12. Security-sensitive capabilities

13. Update security diff

14. Community trust model

15. Adapter sandboxing
```

---

# 138. Ma trận mối đe dọa - cơ chế kiểm soát

| Mối đe dọa | Cơ chế kiểm soát chính |
|---|---|
| Path traversal | Xác thực đường dẫn |
| Install script độc hại | Không thực thi ngầm định |
| Giả mạo upstream | Revision bất biến + tính toàn vẹn |
| Ghi đè file không xác định | Theo dõi quyền sở hữu |
| Dependency confusion | Source namespace tường minh |
| Hook độc hại | Phân loại capability + policy |
| Rò rỉ secret | Cô lập secret + che giấu |
| Lạm dụng adapter | Adapter đáng tin cậy + sandbox trong tương lai |
| Cache poisoning | Cache được khóa theo tính toàn vẹn |
| Hạ cấp tin cậy | Metadata tin cậy + policy |
| Prompt injection | Provenance + cô lập + runtime policy |
| Prototype pollution | Logic merge an toàn |
| Archive bomb | Giới hạn tài nguyên |
| Bùng nổ dependency | Giới hạn của resolver |

---

# 139. Các mặc định bảo mật được khuyến nghị

Cấu hình mặc định SHOULD xấp xỉ:

```yaml
security:
  allowNetworkDuringBuild: false

  executePackageCode: false

  unknownFileOverwrite: deny

  integrity:
    requiredForExternalSources: true

  trust:
    allowed:
      - first-party
      - trusted-vendor

  executableCapabilities:
    default: deny
```

Cú pháp chính xác thuộc về `configuration-spec.md` và `policy-spec.md`.

---

# 140. Tư thế bảo mật

Tư thế bảo mật dự kiến là:

```text
Discover broadly
Trust selectively
Resolve deterministically
Verify integrity
Enforce policy
Render safely
Mutate minimally
Execute elsewhere
```

Agent Plugins nên hoạt động chủ yếu như một:

> hệ thống package, resolution, và rendering mang tính khai báo

thay vì một framework thực thi.

Ranh giới này giảm đáng kể bề mặt tấn công.

---

# 141. Các đặc tả liên quan

Tài liệu này nên được đọc cùng với:

```text
architecture.md
source-of-truth.md

manifest-spec.md
catalog-spec.md
resolution-spec.md
policy-spec.md
lockfile-spec.md
adapter-spec.md
cli-spec.md
source-spec.md
update-spec.md
overlay-spec.md
configuration-spec.md
```

Các trách nhiệm bảo mật:

```text
source-spec
    → secure ingestion

manifest-spec
    → safe declarative package structure

resolution-spec
    → pure dependency selection

policy-spec
    → declarative authorization

lockfile-spec
    → integrity + reproducibility

adapter-spec
    → safe boundary translation

overlay-spec
    → controlled semantic modification

update-spec
    → secure dependency evolution

cli-spec
    → safe orchestration

security-model
    → system-wide threat and control model
```

---

# 142. Tóm tắt quyết định cuối cùng

Kiến trúc bảo mật dựa trên năm ranh giới nền tảng:

```text
External content is untrusted.

Packages are data, not executable installers.

Resolution is pure.

Policy controls permission.

Filesystem mutation occurs only through validated plans.
```

Bất biến quan trọng nhất là:

```text
download ≠ trust
trust ≠ execute
resolve ≠ install
install ≠ execute
```

Duy trì các sự phân tách này là nền tảng của mô hình bảo mật Agent Plugins.