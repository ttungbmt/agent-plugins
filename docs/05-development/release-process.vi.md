# Quy trình release

**Trạng thái:** Bản nháp
**Phiên bản:** 0.1.0
**Cập nhật lần cuối:** 2026-09-21

---

# 1. Mục đích

Tài liệu này định nghĩa quy trình release cho dự án Agent Plugins.

Quy trình release điều chỉnh cách các thay đổi di chuyển từ:

```text
development
    ↓
validation
    ↓
versioning
    ↓
release candidate
    ↓
publication
    ↓
verification
```

Quy trình áp dụng cho các artifact có thể release như:

- các package CLI;
- các thư viện core;
- các package adapter;
- các package schema;
- các manifest hoặc registry được publish;
- các archive release;
- các plugin hoặc SDK trong tương lai.

Các mục tiêu chính là:

```text
reproducibility
+
traceability
+
security
+
compatibility
+
safe rollback
```

---

# 2. Nguyên tắc release

Dự án tuân theo các nguyên tắc release sau:

1. **Main phải luôn ở trạng thái có thể release**
2. **Không release khi chưa vượt qua các cổng chất lượng**
3. **Thay đổi phiên bản phải tường minh**
4. **Breaking change yêu cầu hướng dẫn migration**
5. **Artifact release được build trong CI**
6. **Artifact đã publish là bất biến**
7. **Commit nguồn có thể truy vết từ mọi release**
8. **Tự động hóa release không được vượt qua các cơ chế kiểm soát bảo mật**
9. **Trạng thái release phải có thể tái lập**
10. **Adapter có thể được đánh phiên bản độc lập**
11. **Tương thích schema và lockfile là mối quan tâm của release**
12. **Rollback release phải được lên kế hoạch trước khi release**

---

# 3. Mô hình release

Mô hình được khuyến nghị:

```text
Feature Branch
      ↓
Pull Request
      ↓
main
      ↓
Release Preparation
      ↓
Release Candidate
      ↓
Stable Release
```

Dự án SHOULD tránh duy trì các nhánh release tồn tại lâu dài trừ khi sau này cần đến.

`main` SHOULD đại diện cho trạng thái có thể release tiếp theo.

---

# 4. Các kênh release

Dự án MAY hỗ trợ các kênh sau:

```text
dev
canary
beta
rc
stable
```

Phạm vi ban đầu được khuyến nghị:

```text
stable
rc
```

Các kênh khác SHOULD chỉ được đưa vào khi có nhu cầu rõ ràng.

---

# 5. Release ổn định

Release ổn định sử dụng các semantic version tiêu chuẩn:

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

Release ổn định cho biết phiên bản đã vượt qua mọi cổng release bắt buộc.

---

# 6. Release candidate

Release candidate SHOULD sử dụng:

```text
1.0.0-rc.1
1.0.0-rc.2
```

Release candidate dành cho:

```text
final compatibility validation
cross-platform testing
real-world usage
migration verification
```

Các release RC SHOULD được build thông qua cùng pipeline với release ổn định.

---

# 7. Release beta

Các release beta trong tương lai MAY sử dụng:

```text
1.2.0-beta.1
```

Beta cho biết bộ tính năng gần như hoàn chỉnh nhưng vẫn có thể thay đổi.

Release beta SHOULD NOT ngụ ý sự ổn định của API.

---

# 8. Release canary

Các bản build canary MAY cuối cùng được sinh ra từ `main`.

Ví dụ:

```text
1.3.0-canary.<commit>
```

Release canary hữu ích cho:

```text
adapter testing
integration testing
early validation
```

Chúng MUST NOT thay thế release candidate.

---

# 9. Semantic Versioning

Dự án SHOULD tuân theo Semantic Versioning.

```text
MAJOR.MINOR.PATCH
```

Cách diễn giải:

```text
MAJOR
    breaking compatibility change

MINOR
    backward-compatible feature

PATCH
    backward-compatible fix
```

Các quy tắc chi tiết thuộc về:

```text
versioning-spec.md
```

---

# 10. Các bề mặt được đánh phiên bản

Các bề mặt tương thích khác nhau có thể cần theo dõi phiên bản độc lập.

Ví dụ:

```text
CLI version

Core version

Manifest schema version

Lockfile version

Adapter API version

Individual adapter version

CLI JSON schema version

Registry API version
```

Các phiên bản này MUST NOT được giả định là tiến hóa cùng nhau.

---

# 11. Chiến lược đánh phiên bản package

Nếu repository trở thành một monorepo với nhiều package được publish, các package SHOULD sử dụng đánh phiên bản độc lập trừ khi sự ràng buộc chặt chẽ đòi hỏi phiên bản cố định.

Ví dụ:

```text
@agent-plugins/core            1.4.0
@agent-plugins/adapter-kit     1.2.0
@agent-plugins/adapter-claude  2.0.1
@agent-plugins/cli             1.6.0
```

Đánh phiên bản độc lập giảm các release không cần thiết.

---

# 12. Nhóm phiên bản cố định

Một số package MAY được đánh phiên bản cùng nhau.

Các ví dụ khả dĩ:

```text
core
catalog
resolver
policy
```

nếu các API công khai của chúng ràng buộc chặt chẽ với nhau.

Các nhóm cố định SHOULD được khai báo tường minh trong cấu hình release.

---

# 13. Đánh phiên bản adapter

Adapter SHOULD được đánh phiên bản độc lập.

Ví dụ:

```text
Claude Adapter  2.3.0
Codex Adapter   1.4.1
```

Một release adapter MUST ghi lại các thay đổi đối với:

```text
capability support
output structure
target compatibility
mapping behavior
```

---

# 14. Phiên bản Adapter API

Phiên bản implementation của adapter tách biệt với phiên bản Adapter API.

Ví dụ:

```yaml
version: 2.3.0
adapterApiVersion: 1
```

Việc thay đổi implementation của adapter MAY NOT đòi hỏi thay đổi phiên bản Adapter API.

Phá vỡ hợp đồng adapter thì CÓ đòi hỏi.

---

# 15. Đánh phiên bản schema

Schema SHOULD mang phiên bản tường minh của riêng chúng.

Ví dụ:

```text
manifest/v1
lockfile/v1
cli-output/v1
```

Thay đổi phiên bản schema MUST được review độc lập với semantic version của package.

---

# 16. Breaking change của schema

Một breaking change của schema MUST bao gồm:

```text
new schema version
migration strategy
compatibility statement
tests
documentation
```

Ví dụ:

```text
manifest/v1
→
manifest/v2
```

CLI SHOULD cung cấp hỗ trợ migration khi phù hợp.

---

# 17. Changesets

Repository SHOULD sử dụng Changesets hoặc một cơ chế khai báo ý định release tường minh tương đương.

Mỗi thay đổi có ý nghĩa mà người dùng nhìn thấy SHOULD tạo một mục thay đổi.

Ví dụ:

```text
.changeset/
└── calm-wolves-resolve.md
```

Một changeset SHOULD mô tả:

```text
affected package
release level
user-visible change
```

---

# 18. Khi nào cần changeset

Changeset SHOULD được yêu cầu cho:

```text
new features

bug fixes affecting behavior

public API changes

CLI behavior changes

adapter output changes

schema changes

compatibility changes
```

Changeset MAY được bỏ qua cho:

```text
internal refactoring

tests only

documentation only

CI changes

non-user-visible cleanup
```

trừ khi những thay đổi đó ảnh hưởng đến artifact release.

---

# 19. Ví dụ changeset

```yaml
---
"@agent-plugins/resolver": minor
"@agent-plugins/cli": minor
---

Add resolution provenance and expose `resolve --why`.
```

Định dạng chính xác phụ thuộc vào công cụ release được chọn.

---

# 20. Breaking change

Breaking change MUST nêu rõ tường minh:

```text
what breaks
who is affected
migration path
replacement behavior
```

Một breaking change MUST NOT bị che giấu bên trong một release note tính năng chung chung.

---

# 21. Các danh mục release note

Các mục release note được khuyến nghị:

```text
Highlights

Added

Changed

Fixed

Deprecated

Removed

Security

Migration

Compatibility
```

Chỉ bao gồm các mục liên quan.

---

# 22. Release bảo mật

Các bản sửa bảo mật MAY đòi hỏi một quy trình release tăng tốc.

Tuy nhiên, release bảo mật MUST vẫn bảo toàn:

```text
artifact traceability
tests
versioning
integrity
```

Một số chi tiết công khai MAY được giữ lại cho đến khi người dùng có thời gian cập nhật.

---

# 23. Trách nhiệm release

Người thực hiện release SHOULD có quyền:

```text
trigger release workflow
approve publication
create Git tag
publish packages
create release entry
```

Quyền release SHOULD được giới hạn cho các maintainer.

---

# 24. Trách nhiệm của con người và tự động hóa

Phân chia được khuyến nghị:

```text
Human
    approves release intent

CI
    computes versions
    builds artifacts
    runs tests
    signs/proves artifacts
    publishes
    verifies release
```

Con người SHOULD NOT build thủ công các artifact production từ máy local.

---

# 25. Điều kiện tiên quyết của release

Trước khi chuẩn bị release:

```text
main is green

required PRs merged

required changesets present

migration documentation complete

security review complete where required

compatibility review complete
```

---

# 26. Chuẩn bị release

Việc chuẩn bị release SHOULD sinh ra:

```text
next versions

updated changelog

updated package manifests

updated compatibility metadata
```

Điều này MAY diễn ra thông qua một release PR tự động.

---

# 27. Release Pull Request

Workflow được khuyến nghị:

```text
changes merged to main
        ↓
release automation
        ↓
Release PR
```

Release PR bao gồm:

```text
version bumps
changelog updates
changeset consumption
generated release metadata
```

---

# 28. Review Release PR

Reviewer SHOULD xác minh:

```text
version bumps are correct

breaking changes are visible

migration notes exist

unexpected packages are not released

changelog accurately reflects changes
```

---

# 29. Luồng release candidate

Đối với các release quan trọng:

```text
Release PR
    ↓
merge
    ↓
RC build
    ↓
validation
    ↓
stable promotion
```

Ví dụ:

```text
1.0.0-rc.1
1.0.0-rc.2
1.0.0
```

---

# 30. Tổng quan cổng release

Release ổn định MUST vượt qua:

```text
Static checks

Unit tests

Integration tests

Contract tests

Adapter conformance

Golden tests

Security tests

Determinism tests

E2E tests

Cross-platform validation

Build verification
```

---

# 31. Cổng tĩnh

Bắt buộc:

```text
lint
typecheck
architecture dependency checks
```

Bất kỳ lỗi nào cũng chặn release.

---

# 32. Cổng unit test

Mọi unit test bắt buộc MUST vượt qua.

Các module quan trọng bao gồm:

```text
resolver
policy
trust
lockfile
path handling
```

---

# 33. Cổng integration

Các bộ integration test bắt buộc SHOULD bao gồm:

```text
catalog + resolver

resolver + policy

lockfile + resolver

adapter + render plan

filesystem apply

CLI + application
```

---

# 34. Cổng tuân thủ adapter

Mọi adapter production MUST vượt qua bộ conformance test của adapter.

Lỗi ở bất kỳ adapter ổn định nào sẽ chặn release khi adapter đó là một phần của release.

---

# 35. Cổng golden test

Thay đổi golden fixture MUST có chủ đích.

Tự động hóa release MUST thất bại nếu:

```text
expected generated output
!=
actual generated output
```

mà không có thay đổi fixture được commit.

---

# 36. Cổng bảo mật

Các test bảo mật bắt buộc SHOULD bao gồm:

```text
path traversal

unknown file overwrite

policy bypass

trust escalation

integrity mismatch

prototype pollution

secret leakage
```

Các lỗi nghiêm trọng chặn release.

---

# 37. Cổng tính deterministic

Pipeline release SHOULD xác minh rằng các bản build được chọn chạy hai lần và tạo ra các artifact giống hệt nhau.

Ví dụ:

```text
build A
build B
compare hashes
```

Sự khác biệt chặn release trừ khi được dự kiến và ghi lại tường minh.

---

# 38. Cổng E2E

Luồng sản phẩm bắt buộc:

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

Kết quả cuối cùng mong đợi:

```text
No changes.
```

---

# 39. Cổng đa target

Khi đã có nhiều adapter production, việc xác thực release SHOULD bao gồm:

```text
same resolved graph
→ Claude
→ Codex
```

và sau này là các target ổn định bổ sung.

---

# 40. Cổng đa nền tảng

Trước V1 ổn định, release SHOULD được xác thực trên:

```text
Linux
Windows
macOS
```

Tối thiểu, hành vi CLI core và xử lý filesystem MUST được kiểm thử trên các nền tảng được hỗ trợ.

---

# 41. Ma trận tương thích runtime

CI SHOULD kiểm thử các phiên bản runtime được hỗ trợ.

Ví dụ:

```text
Node current LTS

Node next supported LTS
```

Ma trận được hỗ trợ MUST được tài liệu hóa.

---

# 42. Môi trường build

Artifact production MUST được build trong một môi trường CI sạch.

Bản build SHOULD NOT phụ thuộc vào:

```text
maintainer machine state

global packages

uncommitted files

local cache correctness

personal environment variables
```

---

# 43. Dependency được đóng băng

Bản build release SHOULD sử dụng lockfile của package manager ở chế độ frozen.

Ví dụ:

```bash
pnpm install --frozen-lockfile
```

Không được có việc resolve dependency ngầm định nào xảy ra trong quá trình release.

---

# 44. Lockfile của Agent Plugins

Khi phù hợp, các fixture nội bộ hoặc ví dụ release SHOULD cũng sử dụng hành vi frozen lockfile của Agent Plugins.

Điều này xác thực khả năng tái lập ở cả cấp package manager và cấp project.

---

# 45. Xác thực offline

Khi khả thi, việc xác thực release SHOULD chạy:

```bash
agent-plugins build --offline --frozen-lockfile
```

trên các fixture mang tính đại diện.

Điều này xác minh rằng việc render target không đòi hỏi truy cập mạng.

---

# 46. Build artifact

Artifact release MAY bao gồm:

```text
npm packages

CLI binaries

archives

checksums

SBOM

provenance attestations
```

Mô hình phân phối chính xác có thể thay đổi theo thời gian.

---

# 47. Tính toàn vẹn của artifact

Artifact đã publish SHOULD đi kèm checksum mạnh.

Khuyến nghị:

```text
SHA-256
```

Ví dụ:

```text
agent-plugins-1.0.0.tar.gz
agent-plugins-1.0.0.tar.gz.sha256
```

---

# 48. Provenance của artifact

Mọi artifact release SHOULD có thể truy vết tới:

```text
repository
commit
tag
workflow run
version
```

Provenance này SHOULD có thể được máy xác minh khi được hỗ trợ.

---

# 49. Provenance chuỗi cung ứng

Các release ổn định trong tương lai SHOULD cân nhắc publish:

```text
SLSA-style provenance

build attestations

SBOM
```

Điều này được khuyến nghị mạnh mẽ trước khi được áp dụng ở quy mô hệ sinh thái.

---

# 50. Ký artifact

Các release trong tương lai MAY ký:

```text
Git tags
release archives
package artifacts
```

Khóa ký MUST được quản lý tách biệt với thông tin xác thực thông thường của developer.

---

# 51. Git tag

Release ổn định SHOULD tạo annotated tag.

Ví dụ:

```text
v1.3.0
```

Tag riêng theo package MAY được dùng nếu các package được đánh phiên bản độc lập cần đến chúng.

Ví dụ:

```text
cli-v1.3.0
adapter-claude-v2.0.0
```

Repository SHOULD chọn một quy ước nhất quán.

---

# 52. Tính bất biến của tag

Các tag release đã publish MUST được coi là bất biến.

Không trỏ lại một tag release hiện có sang commit khác.

Nếu một release bị lỗi:

```text
publish a new version
```

thay vì thay đổi lịch sử.

---

# 53. Publish

Việc publish MUST chỉ diễn ra sau khi xác thực release thành công.

Việc publish SHOULD được thực hiện tự động từ CI đáng tin cậy.

---

# 54. Publish lên npm

Nếu sử dụng npm, các cơ chế kiểm soát được khuyến nghị bao gồm:

```text
scoped packages

2FA / trusted publishing

restricted publish permissions

provenance where supported
```

SHOULD tránh các npm token tồn tại lâu dài khi có sẵn cơ chế trusted publishing hiện đại.

---

# 55. Tag trên registry

Các registry kiểu npm MAY sử dụng các kênh:

```text
latest
next
beta
canary
```

Khuyến nghị:

```text
stable → latest

RC/beta → next
```

Canary SHOULD sử dụng một tag riêng.

---

# 56. Nâng cấp lên ổn định

Việc nâng cấp từ RC lên ổn định SHOULD NOT đòi hỏi thay đổi mã nguồn trừ khi có bản sửa được đưa vào.

Artifact ổn định SHOULD được build từ chính xác trạng thái nguồn đã được phê duyệt.

---

# 57. Release note

Mọi release ổn định SHOULD có release note.

Release note SHOULD nhấn mạnh:

```text
user-visible behavior

compatibility

migrations

security

adapter changes
```

Tránh liệt kê mọi refactor nội bộ.

---

# 58. Changelog

`CHANGELOG.md` SHOULD chứa lịch sử release lâu dài.

Cấu trúc được khuyến nghị:

```text
# Changelog

## 1.2.0

### Added
...

### Fixed
...
```

Changelog SHOULD được sinh ra hoặc hỗ trợ bởi các changeset có cấu trúc.

---

# 59. Release note và changelog

Sử dụng:

```text
CHANGELOG.md
    durable repository history

GitHub/registry release notes
    release announcement and summary
```

Hai loại này MAY dùng chung nội dung được sinh ra.

---

# 60. Ghi chú migration

Nếu người dùng phải thực hiện hành động, release MUST bao gồm một mục migration.

Ví dụ:

```text
Migration

`target.adapter` was renamed to `target.id`.

Run:

agent-plugins migrate
```

---

# 61. Vòng đời deprecation

Vòng đời được khuyến nghị:

```text
introduce replacement
      ↓
mark deprecated
      ↓
emit warning
      ↓
document migration
      ↓
remove in breaking release
```

Tránh loại bỏ ngay lập tức các hành vi ổn định đã được thiết lập.

---

# 62. Báo cáo tương thích

Các release major SHOULD tóm tắt các thay đổi về tương thích trên:

```text
CLI syntax

CLI JSON

manifest schemas

lockfiles

adapter APIs

configuration

target output
```

---

# 63. Xác minh release

Ngay sau khi publish, CI SHOULD xác minh các artifact đã release.

Ví dụ:

```text
install published CLI
      ↓
run --version
      ↓
run smoke test
      ↓
run minimal project build
```

---

# 64. Smoke test cài đặt package

Ví dụ:

```bash
npm install -g <released-package>

agent-plugins --version

agent-plugins validate
```

Việc kiểm thử MUST sử dụng artifact đã publish thay vì workspace local.

---

# 65. Smoke test release CLI

Tối thiểu, xác minh:

```text
--version

--help

validate

resolve

build
```

trên một fixture đã biết.

---

# 66. Smoke test release adapter

Việc publish adapter SHOULD xác minh:

```text
adapter loads

metadata valid

capabilities valid

representative fixture renders
```

---

# 67. Release thất bại

Nếu việc publish thất bại một phần:

```text
STOP
```

Không tiếp tục một cách mù quáng.

Xác định:

```text
what published successfully

what failed

whether artifacts are immutable

whether a new version is required
```

---

# 68. Publish một phần

Nếu các artifact bất biến đã được publish, không ghi đè chúng.

Publish các phiên bản khắc phục.

Ví dụ:

```text
1.2.0 broken
→
1.2.1 fixed
```

---

# 69. Triết lý rollback

Các package registry thường không hỗ trợ rollback thực sự một cách an toàn.

Do đó, cơ chế rollback chính là:

```text
forward fix
```

thay vì thay thế một artifact đã publish.

---

# 70. Phản ứng với release lỗi

Luồng được khuyến nghị:

```text
detect issue
    ↓
stop promotion
    ↓
mark release affected
    ↓
identify impacted users
    ↓
prepare patch
    ↓
run accelerated full gate
    ↓
publish patch
```

---

# 71. Deprecate package

Nếu một phiên bản package npm đã publish bị hỏng nghiêm trọng, nó MAY được đánh dấu deprecated kèm hướng dẫn.

Thông điệp ví dụ:

```text
This version contains a critical resolver bug.
Upgrade to 1.2.1.
```

---

# 72. Release cho sự cố bảo mật

Đối với các bản sửa bảo mật nghiêm trọng:

```text
private fix
    ↓
security tests
    ↓
maintainer approval
    ↓
publish patch
    ↓
advisory
```

Chi tiết SHOULD được điều phối theo quy trình công bố bảo mật của dự án.

---

# 73. Dấu vết kiểm toán release

Dự án SHOULD lưu giữ:

```text
release PR

approvals

workflow run

source commit

tag

artifact hashes

published package metadata
```

Điều này cung cấp một dấu vết kiểm toán.

---

# 74. Phê duyệt release

Chỉ các maintainer đáng tin cậy SHOULD có thể phê duyệt release ổn định.

Workflow CI SHOULD sử dụng môi trường được bảo vệ khi có sẵn.

---

# 75. Secret

Thông tin xác thực release MUST NOT khả dụng cho các workflow PR thông thường từ những contributor không đáng tin cậy.

Secret dùng để publish SHOULD chỉ được lộ ra bên trong các job release được bảo vệ.

---

# 76. Pull request từ fork

Các PR từ fork không đáng tin cậy MUST NOT nhận được:

```text
registry tokens

signing keys

production credentials
```

CI nên chạy test mà không có thông tin xác thực đặc quyền.

---

# 77. Trusted publishing

Khi được hỗ trợ, trusted publishing dựa trên OIDC SHOULD được ưu tiên hơn các token lưu trữ lâu dài.

Điều này giảm mức độ phơi nhiễm thông tin xác thực.

---

# 78. Bảo vệ nhánh

`main` SHOULD yêu cầu:

```text
pull request

required CI checks

review

no direct force push
```

Tag release SHOULD được bảo vệ khi khả năng của nền tảng cho phép.

---

# 79. Các kiểm tra bắt buộc

Các kiểm tra bắt buộc được khuyến nghị:

```text
lint

typecheck

unit

integration

architecture

security
```

Các kiểm tra bổ sung chỉ dành cho release:

```text
E2E

cross-platform

adapter conformance

determinism

published artifact smoke
```

---

# 80. Release cập nhật dependency

Các release chỉ cập nhật dependency SHOULD vẫn vượt qua các cổng thông thường.

Nâng cấp dependency vì lý do bảo mật MAY được release dưới dạng PATCH khi hành vi công khai vẫn tương thích.

---

# 81. Thay đổi ánh xạ của adapter

Một thay đổi đối với output của target MAY là:

```text
PATCH
```

cho các bản sửa lỗi,

```text
MINOR
```

cho các ánh xạ mới tương thích ngược,

hoặc:

```text
MAJOR
```

nếu tính tương thích của output được sinh ra bị phá vỡ có chủ đích.

---

# 82. Thay đổi runtime của target

Các runtime target bên ngoài có thể thay đổi độc lập.

Các bản cập nhật adapter phản hồi những thay đổi đó SHOULD ghi lại:

```text
target runtime version

old behavior

new behavior

compatibility limitations
```

---

# 83. Release adapter khẩn cấp

Adapter MAY cần chu kỳ release nhanh hơn core.

Việc đánh phiên bản adapter độc lập SHOULD cho phép:

```text
Claude runtime changes
→ release Claude adapter only
```

mà không cần release resolver/core một cách không cần thiết.

---

# 84. Nhịp độ release

Dự án SHOULD ưu tiên release theo nhu cầu thay vì lịch release thường xuyên tùy ý trong giai đoạn phát triển ban đầu.

Nhịp độ khả dĩ trong tương lai:

```text
patch
    as needed

minor
    grouped regularly

major
    intentionally planned
```

---

# 85. Release trước 1.0

Trước V1.0, dự án có thể tiến hóa nhanh hơn.

Tuy nhiên:

```text
documented schemas
stable CLI machine interfaces
lockfile formats
```

SHOULD vẫn tránh những phá vỡ không cần thiết.

Trước 1.0 không có nghĩa là tính tương thích không quan trọng.

---

# 86. Cổng V1.0

Trước V1.0:

```text
canonical domain stable

manifest schema stable

resolver semantics stable

policy semantics stable

trust model stable

lockfile stable

Adapter API stable

CLI core stable

CLI JSON versioned

migration strategy exists

security review complete

cross-platform validation complete
```

---

# 87. Cổng release major

Mọi release major SHOULD bao gồm:

```text
migration guide

breaking change summary

compatibility matrix

upgrade tests

rollback guidance
```

---

# 88. Test nâng cấp

Kiểm thử:

```text
previous stable version
      ↓
existing project
      ↓
new CLI version
      ↓
validate
      ↓
migrate if needed
      ↓
build/install
```

Điều này SHOULD được tự động hóa cho các lộ trình nâng cấp được hỗ trợ.

---

# 89. Test cài đặt mới

Việc xác thực release MUST cũng kiểm thử:

```text
clean environment
      ↓
install released package
      ↓
init
      ↓
resolve
      ↓
build
```

Chỉ riêng test nâng cấp là không đủ.

---

# 90. Xác thực migration

Khi một release bao gồm migration:

```text
old fixture
→ migrate
→ validate
→ build
```

MUST thành công.

Migration SHOULD lũy đẳng khi được quy định.

---

# 91. Metadata release

Một release SHOULD ghi lại:

```text
version

Git commit

build timestamp

runtime requirements

schema versions

Adapter API version
```

Timestamp của bản build SHOULD NOT ảnh hưởng đến tính deterministic của output chức năng.

---

# 92. Yêu cầu phiên bản runtime

Metadata của package SHOULD khai báo chính xác các phiên bản runtime được hỗ trợ.

Ví dụ:

```json
{
  "engines": {
    "node": ">=24"
  }
}
```

Mức hỗ trợ chính xác phụ thuộc vào chính sách của dự án.

---

# 93. Đặt tên artifact release

Tên artifact SHOULD deterministic.

Ví dụ:

```text
agent-plugins-v1.2.0-linux-x64.tar.gz
agent-plugins-v1.2.0-windows-x64.zip
```

nếu các binary độc lập được đưa vào.

---

# 94. File checksum

Các archive release trong tương lai SHOULD cung cấp:

```text
SHA256SUMS
```

Ví dụ:

```text
<digest>  agent-plugins-v1.2.0-linux-x64.tar.gz
```

---

# 95. SBOM

Trước khi phân phối rộng rãi hơn, dự án SHOULD sinh ra một Software Bill of Materials.

Tiêu chuẩn được khuyến nghị MAY bao gồm:

```text
CycloneDX
SPDX
```

Việc lựa chọn công cụ tùy thuộc vào implementation.

---

# 96. Chứng thực provenance

CI SHOULD cuối cùng sinh ra provenance có thể xác minh, kết nối:

```text
source commit
→ CI workflow
→ release artifact
```

Điều này tăng cường bảo mật chuỗi cung ứng.

---

# 97. Bản build release có thể tái lập

Khi khả thi, dự án SHOULD hướng tới:

```text
same source
+
same toolchain
+
same dependencies
→
same release artifact
```

Khả năng tái lập chính xác ở cấp byte MAY được đưa vào dần dần.

---

# 98. Ghim toolchain

Workflow release SHOULD ghim hoặc định nghĩa rõ ràng:

```text
Node version

package manager version

build tooling

release tooling
```

Việc sử dụng `mise` hoặc công cụ tương đương cho phát triển SHOULD đồng bộ với CI khi khả thi.

---

# 99. Cập nhật công cụ release

Thay đổi đối với công cụ release SHOULD được review cẩn thận.

Ví dụ:

```text
Changesets configuration

publish workflow

registry authentication

artifact signing
```

Những thay đổi này ảnh hưởng đến bảo mật chuỗi cung ứng.

---

# 100. File workflow release

Tự động hóa release SHOULD nằm trong hệ thống quản lý mã nguồn.

Ví dụ:

```text
.github/
└── workflows/
    ├── ci.yml
    ├── release.yml
    └── release-verify.yml
```

Nền tảng chính xác tùy thuộc vào implementation.

---

# 101. Tách biệt workflow release

Khuyến nghị:

```text
ci.yml
    validation

release.yml
    version + publish

release-verify.yml
    post-publish verification
```

Điều này giữ cho trách nhiệm được rõ ràng.

---

# 102. Input release thủ công

Workflow release thủ công SHOULD giảm thiểu input tự do từ người dùng.

Ưu tiên việc chọn:

```text
release channel
approved commit
```

hơn là gõ thủ công phiên bản package.

Việc tính toán phiên bản SHOULD đến từ changeset/quy tắc đánh phiên bản.

---

# 103. Chạy thử (dry run)

Công cụ release SHOULD hỗ trợ chế độ dry-run khi có thể.

Dry run SHOULD hiển thị:

```text
packages to release
versions
tags
registry destinations
release notes
```

mà không publish bất cứ thứ gì.

---

# 104. Kế hoạch release

Trước khi publish, hệ thống SHOULD có khả năng tạo ra một kế hoạch release.

Ví dụ:

```text
Release Plan

@agent-plugins/core
  1.4.0 → 1.5.0

@agent-plugins/cli
  1.7.2 → 1.8.0

@agent-plugins/adapter-claude
  unchanged
```

Kế hoạch này SHOULD được review tự động hoặc thủ công.

---

# 105. Xác thực kế hoạch release

Việc lập kế hoạch release SHOULD phát hiện:

```text
missing changesets

invalid dependency ranges

package version conflicts

unpublished dependent requirements

breaking compatibility
```

---

# 106. Dependency nội bộ

Khi package A phụ thuộc vào package B và B thay đổi, công cụ release MUST xác định liệu A có cần cập nhật phiên bản hay không.

Điều này SHOULD được xử lý nhất quán bởi công cụ release cho monorepo.

---

# 107. Workspace protocol

Dependency giữa các package nội bộ SHOULD sử dụng cơ chế workspace được package manager hỗ trợ.

Trước khi publish, các manifest package kết quả MUST chứa các khoảng dependency hợp lệ tương thích với registry.

---

# 108. Package private

Các package không dành cho release công khai SHOULD được đánh dấu phù hợp.

Tự động hóa release MUST NOT vô tình publish các package nội bộ private.

---

# 109. Allowlist publish

Repository SHOULD định nghĩa tường minh các package có thể publish.

Tránh:

```text
publish every package under packages/
```

như một quy tắc ngầm định.

---

# 110. Kênh release theo từng package

Adapter MAY sử dụng các kênh RC hoặc beta một cách độc lập.

Ví dụ:

```text
@agent-plugins/adapter-hermes@0.5.0-beta.1
```

trong khi CLI vẫn ổn định.

---

# 111. Release tương thích CLI

Bất kỳ breaking change nào đối với cú pháp command CLI ổn định đều yêu cầu một release MAJOR sau V1.

Ví dụ:

```text
agent-plugins build
→ removed
```

là breaking.

---

# 112. Tương thích JSON của CLI

Breaking change đối với:

```text
cli-output/v1
```

SHOULD dẫn đến một phiên bản output schema mới.

Semantic version của package CLI SHOULD phản ánh mức ảnh hưởng về tương thích.

---

# 113. Tương thích chẩn đoán

Việc xóa hoặc tái sử dụng về mặt ngữ nghĩa các mã chẩn đoán ổn định SHOULD được coi là một thay đổi về tương thích.

Các mã chẩn đoán mới thông thường có thể được thêm vào một cách tương thích ngược.

---

# 114. Tương thích lockfile

Trình đọc lockfile SHOULD định nghĩa tường minh các phiên bản được hỗ trợ.

Một release không thể đọc phiên bản lockfile từng được hỗ trợ có thể là breaking.

---

# 115. Tương thích adapter

Một release adapter SHOULD khai báo khả năng tương thích với:

```text
Adapter API version

core version range

target runtime versions
```

khi áp dụng.

---

# 116. Release note cho adapter

Release note của adapter SHOULD ưu tiên:

```text
new capabilities

changed mappings

new unsupported cases

target runtime compatibility

generated-file changes
```

---

# 117. Checklist phê duyệt release

Trước khi publish bản ổn định:

```text
[ ] Release plan reviewed

[ ] Versions correct

[ ] Changelog reviewed

[ ] Breaking changes documented

[ ] Migration documented

[ ] CI green

[ ] Security suite green

[ ] Adapter conformance green

[ ] Determinism green

[ ] E2E green

[ ] Cross-platform green

[ ] Release credentials protected

[ ] Target commit confirmed
```

---

# 118. Checklist sau release

Sau khi publish:

```text
[ ] Tags created

[ ] Packages visible

[ ] Checksums verified

[ ] Release notes published

[ ] Published CLI installs

[ ] CLI version correct

[ ] Smoke tests pass

[ ] Representative adapter build passes

[ ] Documentation links valid

[ ] Release announcement prepared if needed
```

---

# 119. Giám sát sau release

Maintainer SHOULD giám sát:

```text
installation failures

runtime compatibility issues

adapter rendering regressions

migration failures

security reports
```

ngay sau các release quan trọng.

---

# 120. Hotfix release

Luồng hotfix:

```text
reproduce issue
    ↓
add regression test
    ↓
minimal fix
    ↓
required release gates
    ↓
PATCH release
```

Tránh gộp các tính năng không liên quan vào hotfix.

---

# 121. Bản vá bảo mật khẩn cấp

Hotfix bảo mật MAY bỏ qua lịch trình thông thường nhưng MUST NOT bỏ qua việc xác minh bảo mật thiết yếu.

Bắt buộc:

```text
reproduction
regression test
fix
security review
release build
post-release verification
```

---

# 122. Sửa tiến (roll forward)

Chiến lược khôi phục mặc định là:

```text
bad 1.2.0
    ↓
fix
    ↓
1.2.1
```

Artifact đã publish MUST NOT bị thay thế một cách âm thầm.

---

# 123. Yank / Deprecate

Việc xóa ở cấp registry SHOULD hiếm khi xảy ra.

Ưu tiên deprecate package khi người dùng có thể đã phụ thuộc vào phiên bản đó.

Việc xóa thực sự MAY phù hợp cho các trường hợp rò rỉ thông tin xác thực hoặc tình huống pháp lý/bảo mật nghiêm trọng.

---

# 124. Lưu giữ release

Các release ổn định và metadata của chúng SHOULD luôn khả dụng lâu dài.

Artifact canary MAY sử dụng chính sách lưu giữ ngắn hơn.

---

# 125. Đánh phiên bản tài liệu

Trước V1, tài liệu MAY theo dõi `main`.

Sau khi các API ổn định xuất hiện, dự án SHOULD cân nhắc tài liệu có phiên bản cho các phiên bản major.

---

# 126. Ví dụ và fixture

Thay đổi release MUST cập nhật các ví dụ khi hành vi thay đổi.

Các ví dụ tài liệu bị hỏng được coi là lỗi release.

---

# 127. Tham chiếu phiên bản trong README

Tránh hard-code các số phiên bản hay thay đổi ở nhiều vị trí.

Khi có thể, các ví dụ nên giữ độc lập với phiên bản.

---

# 128. Tự động hóa release note

Tự động hóa MAY suy ra release note từ Changesets và metadata của commit.

Vẫn cần con người review đối với các release major và migration.

---

# 129. Workflow của contributor

Contributor thông thường SHOULD NOT cần thông tin xác thực registry.

Workflow của họ kết thúc tại:

```text
PR
+
changeset
```

Maintainer và CI xử lý việc publish.

---

# 130. Workflow của maintainer

Khuyến nghị:

```text
review release PR
      ↓
merge
      ↓
CI produces RC/stable artifacts
      ↓
approve protected publication environment
      ↓
verify release
```

---

# 131. Quy trình release cho V0.x

Trong giai đoạn phát triển ban đầu, một quy trình gọn nhẹ là chấp nhận được:

```text
Changesets
+
CI
+
automated npm publish
+
GitHub release
```

Không xây dựng một nền tảng release phức tạp quá sớm.

---

# 132. Công cụ được khuyến nghị cho V0.x

Stack ban đầu:

```text
Changesets

GitHub Actions

pnpm

npm trusted publishing if available
```

Tùy chọn sau này:

```text
Sigstore
SBOM
provenance attestations
```

---

# 133. Luồng release V0.x

Luồng được khuyến nghị:

```text
PR
 ↓
Changeset
 ↓
Merge main
 ↓
Automated Release PR
 ↓
Review Release PR
 ↓
Merge
 ↓
CI publish
 ↓
Git tag + release notes
 ↓
Post-publish smoke test
```

Đây là quy trình mặc định được khuyến nghị cho dự án.

---

# 134. Luồng release ổn định trong tương lai

Khi dự án trưởng thành:

```text
Development
    ↓
Release PR
    ↓
RC
    ↓
Cross-platform validation
    ↓
Migration validation
    ↓
Security approval
    ↓
Stable promotion
    ↓
Attestation + SBOM
    ↓
Post-release verification
```

---

# 135. Kiến trúc release

Luồng release MUST luôn tách biệt với kiến trúc runtime.

```text
Source Repository
      ↓
CI
      ↓
Test / Validate
      ↓
Build
      ↓
Sign / Attest
      ↓
Registry / Release Host
```

Các package runtime không được cần đến thông tin xác thực release.

---

# 136. Ranh giới bảo mật

Hạ tầng release là một ranh giới trust đặc quyền.

Việc thông tin xác thực release bị xâm phạm có thể làm tổn hại:

```text
CLI

adapters

libraries

users downstream
```

Do đó, hạ tầng release MUST được áp dụng các cơ chế kiểm soát nghiêm ngặt hơn CI thông thường.

---

# 137. Review bởi hai người

Đối với các release ổn định đã trưởng thành, các release quan trọng MAY yêu cầu review bởi hai người.

Được khuyến nghị đặc biệt cho:

```text
major releases

security-sensitive changes

release workflow changes

signing changes
```

Không bắt buộc cho các release patch V0.x giai đoạn đầu.

---

# 138. Môi trường được bảo vệ

Việc publish bản ổn định SHOULD sử dụng một môi trường CI được bảo vệ.

Các tính năng MAY bao gồm:

```text
maintainer approval

restricted secrets

deployment history

audit log
```

---

# 139. Thay đổi workflow release

Bất kỳ PR nào sửa đổi:

```text
release.yml

registry authentication

package publication

signing

provenance
```

SHOULD được review ở mức cao hơn.

---

# 140. Secret release

Khi không thể loại bỏ thông tin xác thực, chúng MUST:

```text
short-lived where possible

least privilege

stored in CI secret management

rotated periodically
```

Chúng MUST NOT xuất hiện trong log.

---

# 141. Khả năng tái lập release

Mọi phiên bản đã publish SHOULD có thể tái lập từ Git tag của nó bằng công cụ đã được tài liệu hóa.

Tối thiểu:

```text
checkout tag

install frozen dependencies

run build
```

phải tạo lại được các artifact tương đương về mặt logic.

---

# 142. Command kiểm toán release

Công cụ trong tương lai MAY cung cấp:

```bash
agent-plugins release verify
```

cho maintainer.

Nó có thể xác minh:

```text
tag
version
checksums
published packages
provenance
```

Đây không phải là một phần của CLI thông thường dành cho người dùng cuối.

---

# 143. Công cụ release nội bộ

Công cụ dành riêng cho release SHOULD nằm ngoài kiến trúc command thông thường dành cho người dùng cuối.

Tránh làm lẫn tạp:

```text
agent-plugins
```

bằng các command release chỉ dành cho maintainer trừ khi có lý do chính đáng.

Script trong repository thường được ưu tiên hơn.

---

# 144. Script được khuyến nghị

Các script repository khả dĩ:

```bash
pnpm release:check

pnpm release:version

pnpm release:build

pnpm release:publish

pnpm release:verify
```

Các command chính xác có thể được implement thông qua Changesets và CI.

---

# 145. Script chạy thử release

Khuyến nghị:

```bash
pnpm release:check
```

nên thực hiện:

```text
changeset validation

version plan

compatibility checks

full required tests

package build
```

mà không publish.

---

# 146. Publish từ local

Việc publish production từ máy của developer SHOULD không được khuyến khích.

Một lần publish thủ công từ local SHOULD yêu cầu quy trình khẩn cấp và sự cho phép của maintainer.

---

# 147. Các dạng thất bại của release

Quy trình SHOULD xử lý tường minh:

```text
test failure

build failure

registry failure

partial publication

tag failure

release-note failure

post-publish verification failure
```

Không phải mọi thất bại đều cần cùng một biện pháp khắc phục.

---

# 148. Thất bại trước khi publish

Nếu thất bại xảy ra trước khi bất kỳ artifact nào được publish:

```text
fix
→ rerun
```

Không cần thay đổi phiên bản release nào trừ khi phiên bản đó đã bị lộ ra bên ngoài.

---

# 149. Thất bại sau khi publish

Nếu các package bất biến đã được publish:

```text
do not replace

diagnose

release patch
```

---

# 150. Smoke test thất bại sau khi publish

Nếu smoke test thất bại:

```text
mark release affected

stop further channel promotion

create regression issue

prepare hotfix
```

---

# 151. Chỉ số release

Các chỉ số release hữu ích MAY bao gồm:

```text
release frequency

failed release rate

hotfix frequency

time from merge to release

rollback/forward-fix frequency
```

Các chỉ số SHOULD giúp cải thiện độ tin cậy, không khuyến khích số lượng release.

---

# 152. Chất lượng release

Dự án SHOULD tối ưu hóa cho:

```text
predictable releases
>
frequent releases
```

đặc biệt là trong khi các hợp đồng core đang dần ổn định.

---

# 153. Ngân sách breaking change

Các breaking change lớn SHOULD được gom nhóm khi có thể.

Tránh các release breaking nhỏ lặp đi lặp lại gây mệt mỏi vì migration.

---

# 154. Truyền thông về release

Các thay đổi lớn SHOULD truyền đạt rõ ràng:

```text
why change was made

what users need to do

what remains compatible

what is removed
```

---

# 155. Cảnh báo deprecation

Cảnh báo SHOULD xác định:

```text
deprecated feature

replacement

planned removal version if known
```

Ví dụ:

```text
`render` is deprecated.
Use `build`.

Planned removal: v2.
```

---

# 156. Định nghĩa hợp đồng ổn định

Sau V1, các hợp đồng ổn định bao gồm ít nhất:

```text
canonical manifest schema

core resolution semantics

lockfile compatibility

Adapter API

CLI stable commands

CLI JSON schema

diagnostic code meanings
```

Thay đổi đối với các bề mặt này yêu cầu phân tích tác động release.

---

# 157. Hợp đồng thử nghiệm

Các tính năng thử nghiệm MAY thay đổi mà không có đầy đủ bảo đảm của phiên bản major.

Chúng MUST được đánh dấu rõ ràng.

Các tính năng thử nghiệm SHOULD NOT âm thầm trở thành ổn định.

---

# 158. Trạng thái thử nghiệm của adapter

Adapter mới MAY ban đầu được đánh dấu là thử nghiệm.

Ví dụ:

```yaml
status: experimental
```

Việc nâng lên ổn định SHOULD yêu cầu:

```text
conformance passing

golden coverage

real-world validation

compatibility documentation
```

---

# 159. Các mức độ ổn định của adapter

Các trạng thái khả dĩ trong tương lai:

```text
experimental

beta

stable

deprecated
```

Điều này khác biệt với trust level.

---

# 160. Vòng đời deprecation của package

Một package đã publish MAY chuyển trạng thái:

```text
stable
→ deprecated
→ unsupported
```

Deprecation MUST bao gồm hướng dẫn migration khi có phương án thay thế.

---

# 161. Checklist release — Patch

Release patch:

```text
[ ] Regression reproduced

[ ] Fix tested

[ ] No breaking changes

[ ] Required CI passes

[ ] Changelog updated

[ ] Publication verified
```

---

# 162. Checklist release — Minor

Release minor:

```text
[ ] Features documented

[ ] Backward compatibility reviewed

[ ] Required migration notes added

[ ] Adapter output diffs reviewed

[ ] E2E passes

[ ] Release notes reviewed
```

---

# 163. Checklist release — Major

Release major:

```text
[ ] Breaking changes enumerated

[ ] Migration guide complete

[ ] Compatibility matrix updated

[ ] Upgrade tests pass

[ ] RC validated

[ ] Security review complete

[ ] Documentation updated

[ ] Maintainer approval obtained
```

---

# 164. Checklist release — Bảo mật

Release bảo mật:

```text
[ ] Vulnerability reproduced

[ ] Regression test added

[ ] Fix reviewed

[ ] Disclosure plan reviewed

[ ] Affected versions identified

[ ] Patch release ready

[ ] Security advisory prepared
```

---

# 165. Các bất biến của release

Những điều sau đây mang tính quy phạm.

## Bất biến 1 — Artifact được build bởi CI

Artifact production MUST được build bởi tự động hóa đáng tin cậy.

## Bất biến 2 — Release bất biến

Artifact release đã publish MUST NOT bị sửa đổi tại chỗ.

## Bất biến 3 — Release có thể truy vết

Mọi release MUST ánh xạ tới một commit nguồn cụ thể.

## Bất biến 4 — Ý định phiên bản là tường minh

Các thay đổi người dùng nhìn thấy MUST tham gia vào việc lập kế hoạch phiên bản.

## Bất biến 5 — Cổng chất lượng không thể bị vượt qua một cách âm thầm

Việc publish bản ổn định yêu cầu các cổng bắt buộc phải vượt qua.

## Bất biến 6 — Breaking change yêu cầu hướng dẫn migration

Các breaking change ổn định MUST được tài liệu hóa.

## Bất biến 7 — Thông tin xác thực release luôn được cô lập

Các PR không đáng tin cậy MUST NOT nhận được thông tin xác thực để publish.

## Bất biến 8 — Artifact đã publish được xác minh

Việc xác minh smoke sau khi publish là bắt buộc.

## Bất biến 9 — Bản sửa bảo mật có regression test

Mọi release sửa một lỗi bảo mật SHOULD giữ lại một regression test.

## Bất biến 10 — Sửa tiến thay vì sửa đổi

Một release bất biến bị lỗi được khắc phục bằng một phiên bản mới.

---

# 166. Implementation ban đầu được khuyến nghị

Cho các release đầu tiên của dự án, implement:

```text
pnpm workspace

Changesets

GitHub Actions

npm publication

GitHub Releases

post-publish smoke test
```

Pipeline ban đầu:

```text
PR
→ changeset
→ main
→ release PR
→ merge
→ publish
→ verify
```

Điều này mang lại đủ sự chặt chẽ mà không thiết kế quá mức.

---

# 167. Các cải tiến được khuyến nghị trong tương lai

Sau này bổ sung:

```text
RC promotion

signed tags

SBOM

provenance attestation

trusted publishing

cross-platform binaries

release verification tooling

security advisory automation
```

---

# 168. Mối quan hệ với Versioning

`versioning-spec.md` định nghĩa:

```text
what version changes mean
```

`release-process.md` định nghĩa:

```text
how those versions are prepared, validated, and published
```

---

# 169. Mối quan hệ với kiểm thử

`testing-strategy.md` định nghĩa:

```text
what must be tested
```

`release-process.md` định nghĩa:

```text
which test suites block release
```

---

# 170. Mối quan hệ với Migration

`migration-spec.md` định nghĩa:

```text
how incompatible state is transformed
```

`release-process.md` yêu cầu migration phải được xác thực và tài liệu hóa trước các release liên quan.

---

# 171. Mối quan hệ với bảo mật

`security-model.md` định nghĩa các rủi ro về chuỗi cung ứng và thông tin xác thực.

Quy trình release thực thi các cơ chế kiểm soát như:

```text
protected publishing

immutable artifacts

provenance

integrity

least-privilege credentials
```

---

# 172. Mối quan hệ với trust

Các package và adapter chính thức đã publish là một phần của trust root của dự án.

Do đó, hạ tầng release SHOULD được áp dụng các cơ chế kiểm soát trust vận hành cao nhất trong dự án.

---

# 173. Mối quan hệ với adapter

Release adapter có thể diễn ra độc lập với release core.

Công cụ release MUST hỗ trợ điều này mà không buộc các package không liên quan phải publish.

---

# 174. Mối quan hệ với CLI

Release CLI MUST bảo toàn những gì đã được tài liệu hóa về:

```text
command compatibility

exit codes

JSON output contracts

diagnostic semantics
```

theo các bảo đảm về độ ổn định của chúng.

---

# 175. Các file repository được khuyến nghị

Về lâu dài:

```text
.changeset/
├── config.json
└── *.md

.github/
└── workflows/
    ├── ci.yml
    ├── release.yml
    └── release-verify.yml

CHANGELOG.md
CONTRIBUTING.md
SECURITY.md

docs/
├── release-process.md
├── versioning-spec.md
└── migration-spec.md
```

---

# 176. Luồng release tham chiếu

```text
Contributor
    │
    ▼
Feature PR
    │
    ├── code
    ├── tests
    ├── docs
    └── changeset
    │
    ▼
main
    │
    ▼
Release Automation
    │
    ▼
Release PR
    │
    ▼
Maintainer Review
    │
    ▼
Merge
    │
    ▼
Trusted CI
    │
    ├── lint
    ├── typecheck
    ├── tests
    ├── security
    ├── conformance
    ├── E2E
    └── build
    │
    ▼
Publish
    │
    ├── registry
    ├── Git tag
    ├── release notes
    └── checksums/provenance
    │
    ▼
Post-Release Verification
```

---

# 177. Tóm tắt quyết định cuối cùng

Chiến lược release được khuyến nghị là:

```text
Changesets
+
Semantic Versioning
+
Release PR
+
Trusted CI publication
+
Post-publication verification
```

Quy trình release nên luôn:

```text
explicit
deterministic
reviewable
reproducible
auditable
```

Quy tắc quan trọng nhất là:

> Một release không đơn thuần là việc tăng phiên bản; nó là một phép biến đổi đã được xác minh từ một commit nguồn đã được review thành các artifact bất biến, có thể truy vết.