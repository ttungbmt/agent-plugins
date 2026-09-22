# Mô hình tin cậy

**Trạng thái:** Bản nháp  
**Phiên bản:** 0.1.0  
**Cập nhật lần cuối:** 2026-09-21

---

# 1. Mục đích

Tài liệu này định nghĩa mô hình tin cậy (trust model) cho nền tảng Agent Plugins.

Mô hình tin cậy xác định cách hệ thống đánh giá mức độ tin tưởng vào:

- các package source;
- các publisher;
- các provider;
- các repository;
- các revision của package;
- các adapter;
- các overlay;
- các artifact được sinh ra;
- các registry;
- nội dung do tổ chức kiểm soát.

Bản thân mô hình tin cậy không xác định một thứ gì đó có an toàn hay không.

Thay vào đó, nó cung cấp bằng chứng có cấu trúc có thể được sử dụng bởi:

```text
Policy
Security controls
Update logic
CLI diagnostics
User review
Organization governance
```

Nguyên tắc cốt lõi là:

> Tin cậy là tường minh, phụ thuộc ngữ cảnh, dựa trên bằng chứng, và không bao giờ tương đương với quyền.

---

# 2. Tin cậy và bảo mật

Tin cậy và bảo mật có liên quan nhưng khác biệt.

```text
Trust Model
    → How much confidence do we have in this entity?

Security Model
    → What risks exist and what controls protect the system?

Policy
    → What is allowed?
```

Ví dụ:

```text
Package:
  trusted vendor

Capability:
  shell execution

Policy:
  shell execution denied

Result:
  blocked
```

Một package đáng tin cậy không tự động nhận các quyền nguy hiểm.

---

# 3. Tin cậy và quyền

Những điều sau MUST được giữ tách biệt:

```text
trust
permission
capability
risk
```

Ví dụ:

```text
Trust:
  high

Risk:
  high

Permission:
  denied
```

Điều này hợp lệ.

Một ví dụ khác:

```text
Trust:
  low

Risk:
  low

Permission:
  allowed
```

cũng có thể hợp lệ tùy thuộc vào policy.

Tin cậy MUST NOT ánh xạ trực tiếp thành thực thi không bị giới hạn.

---

# 4. Các nguyên tắc cốt lõi

Mô hình tin cậy tuân theo các nguyên tắc sau:

1. **Tin cậy là tường minh**
2. **Tin cậy phụ thuộc ngữ cảnh**
3. **Tin cậy không phải là nhị phân**
4. **Tin cậy mặc định không có tính bắc cầu**
5. **Tin cậy không phải là vĩnh viễn**
6. **Tin cậy đòi hỏi provenance**
7. **Tin cậy có thể suy giảm**
8. **Tin cậy có thể bị policy ghi đè**
9. **Không xác định nghĩa là không xác định**
10. **Danh tính không phải là sự an toàn**
11. **Độ phổ biến không phải là tin cậy**
12. **Tính toàn vẹn không phải là tin cậy**
13. **Các quyết định tin cậy phải giải thích được**
14. **Metadata tin cậy phải deterministic**

---

# 5. Các đối tượng tin cậy

Tin cậy MAY được gán cho:

```text
Source
Publisher
Provider
Repository
Package
Revision
Adapter
Registry
Overlay
Organization
```

Tin cậy SHOULD NOT chỉ được gắn với tên package.

Tin cậy thuộc về một danh tính cụ thể và một ngữ cảnh provenance cụ thể.

---

# 6. Các chiều tin cậy

Không khuyến khích dùng một điểm tin cậy dạng số vô hướng duy nhất.

Thay vào đó, tin cậy SHOULD được mô hình hóa thông qua các chiều.

Các chiều được khuyến nghị:

```text
identity
provenance
integrity
ownership
review
maintenance
distribution
execution
```

Ví dụ:

```yaml
trust:
  identity: verified
  provenance: verified
  integrity: verified
  ownership: known
  review: curated
  maintenance: active
```

---

# 7. Phân loại tin cậy

Với V1, nền tảng SHOULD sử dụng một mô hình tin cậy phân loại nhỏ gọn.

Các mức được khuyến nghị:

```text
first-party
trusted-vendor
verified-community
community
unknown
```

Các giá trị này mô tả mức độ tin tưởng vào source, không phải quyền thực thi.

---

# 8. First-party

`first-party` có nghĩa là:

> Nội dung được tạo và duy trì dưới sự kiểm soát trực tiếp của dự án Agent Plugins hoặc của tổ chức đang kiểm soát.

Các đặc tính điển hình:

```text
known maintainers
controlled repository
controlled review process
controlled release process
known provenance
```

Ví dụ:

```yaml
trust:
  level: first-party
```

Nội dung first-party vẫn MUST vượt qua validation và policy thông thường.

---

# 9. Vendor đáng tin cậy

`trusted-vendor` có nghĩa là:

> Nội dung bên ngoài từ một upstream provider đã được tuyển chọn và phê duyệt một cách tường minh.

Các ví dụ điển hình:

```text
known reputable upstream repository
manually curated vendor import
approved by organization policy
```

Trạng thái vendor đáng tin cậy SHOULD yêu cầu cấu hình tường minh.

Nó MUST NOT được suy ra chỉ từ độ phổ biến.

---

# 10. Cộng đồng đã xác minh

`verified-community` có nghĩa là:

> Nội dung cộng đồng có danh tính publisher và provenance đã được xác minh, nhưng không do tổ chức trực tiếp kiểm soát.

Các đặc tính điển hình:

```text
publisher identity known
repository ownership verified
revision integrity verified
package metadata valid
```

Nó không ngụ ý việc review nội dung chi tiết.

---

# 11. Cộng đồng

`community` có nghĩa là:

> Nội dung của bên thứ ba có provenance xác định được nhưng không có các bảo đảm tin cậy nâng cao.

Ví dụ:

```text
public GitHub repository
known revision
valid manifest
unknown publisher review process
```

Nội dung cộng đồng SHOULD nhận các giá trị mặc định thận trọng.

---

# 12. Không xác định

`unknown` có nghĩa là:

> Hệ thống không có đủ bằng chứng để gán một phân loại tin cậy mạnh hơn.

Unknown MUST NOT được xem là tương đương với community.

Ví dụ:

```text
unverified downloaded archive
missing publisher identity
unresolved provenance
ambiguous repository origin
```

Unknown SHOULD nhìn chung bị từ chối bởi các policy tổ chức nghiêm ngặt.

---

# 13. Nội dung cục bộ

Nội dung cục bộ đòi hỏi cách xử lý riêng.

Một đường dẫn cục bộ không tự động đáng tin cậy.

Các phân loại khả thi:

```text
local-controlled
local-project
local-unknown
```

Với V1, nội dung cục bộ MAY tái sử dụng:

```text
first-party
community
unknown
```

tùy thuộc vào ngữ cảnh sở hữu.

Quy tắc quan trọng là:

> Tính cục bộ không ngụ ý tin cậy.

---

# 14. Bằng chứng tin cậy

Các quyết định tin cậy SHOULD bắt nguồn từ bằng chứng có thể quan sát được.

Bằng chứng tiềm năng bao gồm:

```text
repository identity
publisher identity
organization ownership
cryptographic signature
immutable revision
integrity hash
manual approval
review history
source configuration
registry verification
```

Tin cậy MUST NOT được suy ra từ văn bản mô tả package.

---

# 15. Danh tính

Danh tính trả lời câu hỏi:

> Ai tuyên bố quyền sở hữu artifact này?

Ví dụ:

```text
GitHub organization
registry publisher
repository owner
organization namespace
```

Các trạng thái danh tính khả thi:

```text
verified
known
self-asserted
unknown
```

Danh tính đã được xác minh không ngụ ý nội dung an toàn.

---

# 16. Provenance

Provenance trả lời câu hỏi:

> Chính xác thì nội dung này đến từ đâu?

Ví dụ:

```yaml
provenance:
  sourceType: git
  repository: https://github.com/example/project
  revision: abc123
  path: packages/foo
```

Tin cậy SHOULD yêu cầu provenance đối với các package bên ngoài.

---

# 17. Tính toàn vẹn

Tính toàn vẹn trả lời câu hỏi:

> Nội dung này có giống hệt với nội dung được kỳ vọng không?

Ví dụ:

```yaml
integrity:
  algorithm: sha256
  digest: ...
```

Tính toàn vẹn bảo vệ chống lại việc giả mạo.

Nó không chứng minh rằng nội dung gốc là vô hại.

Do đó:

```text
integrity != trust
```

---

# 18. Tính xác thực

Tính xác thực trả lời câu hỏi:

> Có phải publisher được kỳ vọng đã tạo ra artifact này không?

Bằng chứng tiềm năng:

```text
signed Git tag
signed package
verified registry publisher
release signature
```

Tính xác thực SHOULD củng cố bằng chứng tin cậy.

---

# 19. Review

Review trả lời câu hỏi:

> Nội dung này đã được kiểm tra bởi một quy trình đáng tin cậy chưa?

Các mức review khả thi:

```text
none
automated
manual
curated
organization-approved
```

Trạng thái review MAY được đưa vào metadata tin cậy.

---

# 20. Quyền sở hữu

Quyền sở hữu mô tả việc kiểm soát source.

Ví dụ:

```yaml
ownership:
  type: organization
  identity: openai
```

Quyền sở hữu SHOULD phân biệt được với quyền tác giả của package.

---

# 21. Metadata tin cậy

Biểu diễn canonical được khuyến nghị:

```yaml
trust:
  level: trusted-vendor

  identity:
    status: verified

  provenance:
    status: verified

  integrity:
    status: verified

  review:
    status: curated
```

Schema chính xác thuộc về `source-spec.md` hoặc một trust schema trong tương lai.

---

# 22. Nguồn thông tin tin cậy

Thông tin tin cậy MAY đến từ:

```text
built-in defaults
organization configuration
workspace configuration
project configuration
registry metadata
manual approval
```

Tin cậy SHOULD NOT được tự gán bởi chính package đang được đánh giá.

Ví dụ về ngữ nghĩa bị cấm:

```yaml
trust:
  level: first-party
```

bên trong một package cộng đồng tùy ý.

Package có thể khai báo thông tin danh tính, nhưng phân loại tin cậy đến từ hệ thống sử dụng nó.

---

# 23. Thẩm quyền tin cậy

Thứ tự ưu tiên được khuyến nghị:

```text
organization policy
      ↓
workspace trust config
      ↓
project trust config
      ↓
registry evidence
      ↓
source default
```

Cấu hình có thẩm quyền cao hơn có thể giảm mức tin cậy.

Việc tăng mức tin cậy SHOULD yêu cầu thẩm quyền tường minh.

---

# 24. Nâng cấp tin cậy

Nâng cấp tin cậy có nghĩa là:

```text
community
→ trusted-vendor
```

Điều này SHOULD yêu cầu cấu hình tường minh hoặc thẩm quyền đã được xác minh.

Một package MUST NOT tự nâng cấp chính nó.

---

# 25. Hạ cấp tin cậy

Tin cậy MAY tự động bị hạ cấp khi bằng chứng thay đổi.

Ví dụ:

```text
verified repository
→ repository owner changed
```

hoặc:

```text
trusted revision
→ source changed
```

Kết quả tiềm năng:

```text
trusted-vendor
→ unknown
```

Việc hạ cấp tin cậy SHOULD được hiển thị nổi bật.

---

# 26. Tin cậy phụ thuộc vào revision

Tin cậy vào một repository không nhất thiết ngụ ý tin cậy vào mọi revision.

Ví dụ:

```text
repository = trusted-vendor
revision A = reviewed
revision B = new/unreviewed
```

Hệ thống MAY mô hình hóa:

```text
source trust
+
revision trust
```

một cách riêng biệt.

---

# 27. Tin cậy của package

Mức tin cậy hiệu lực của package SHOULD được suy ra từ nhiều tín hiệu.

Về mặt khái niệm:

```text
Source Trust
+
Publisher Trust
+
Revision Evidence
+
Integrity
+
Review
→
Effective Trust Context
```

Điều này KHÔNG cần phải là một công thức số.

---

# 28. Không có điểm tin cậy dạng số

V1 SHOULD NOT biểu diễn tin cậy dưới dạng:

```text
87/100
```

Lý do:

```text
false precision
hard-to-explain weighting
unstable interpretation
encourages unsafe threshold logic
```

Bằng chứng dạng phân loại được ưu tiên hơn.

---

# 29. Tin cậy hiệu lực

Hệ thống MAY cung cấp:

```text
declared trust
effective trust
```

Ví dụ:

```text
Configured:
  trusted-vendor

Effective:
  unknown

Reason:
  integrity verification failed
```

Lỗi bằng chứng nghiêm trọng SHOULD làm giảm mức tin cậy hiệu lực.

---

# 30. Ràng buộc tin cậy

Các trust level SHOULD tạo thành một thứ tự độc lập với capability để thuận tiện cho policy:

```text
first-party
    ↓
trusted-vendor
    ↓
verified-community
    ↓
community
    ↓
unknown
```

Thứ tự này chỉ biểu thị mức độ tin tưởng.

Nó MUST NOT tự động ánh xạ thành các cấp độ quyền.

---

# 31. Tương tác với Policy

Các Policy MAY tham chiếu đến tin cậy.

Ví dụ:

```yaml
allow:
  trust:
    - first-party
    - trusted-vendor
```

Hoặc:

```yaml
deny:
  when:
    trust: community
    capability: shell-execute
```

Do đó, tin cậy trở thành input của policy.

---

# 32. Các trust policy nhận biết capability

Policy SHOULD hỗ trợ các tổ hợp.

Ví dụ:

```text
community package
+
documentation skill
→ allowed
```

nhưng:

```text
community package
+
runtime hook
→ denied
```

Cách này tốt hơn việc cấm toàn bộ nội dung cộng đồng trên phạm vi toàn cục.

---

# 33. Tin cậy và rủi ro

Tin cậy và rủi ro MUST luôn trực giao với nhau.

Ma trận ví dụ:

| Tin cậy | Rủi ro | Policy khả thi |
|---|---|---|
| First-party | Thấp | Cho phép |
| First-party | Cao | Review / hạn chế |
| Community | Thấp | Cho phép |
| Community | Cao | Từ chối |
| Unknown | Bất kỳ | Mặc định từ chối |

Bảng này chỉ mang tính minh họa.

Policy vẫn là nguồn có thẩm quyền.

---

# 34. Tin cậy và quyền

Các quyết định về quyền MAY phụ thuộc vào tin cậy.

Ví dụ:

```text
filesystem-read

first-party
    → may be allowed

community
    → review required

unknown
    → denied
```

Nhưng các quyền MUST được thực thi (enforce) một cách tường minh.

---

# 35. Tin cậy và adapter

Adapter là các component có đặc quyền cao.

Quy tắc tin cậy ban đầu được khuyến nghị:

```text
Only first-party or explicitly trusted adapters may execute.
```

Các phân loại tin cậy của adapter SHOULD nghiêm ngặt hơn các phân loại tin cậy của package.

---

# 36. Adapter của bên thứ ba

Trước khi adapter của bên thứ ba được hỗ trợ, hệ thống SHOULD yêu cầu:

```text
verified provenance
trusted publisher
integrity
explicit installation
explicit adapter trust
sandboxing or permission controls
```

Một package cộng đồng thông thường MUST NOT có khả năng đăng ký code adapter có thể thực thi.

---

# 37. Độ tin cậy của Source Adapter

Source adapter có thể truy xuất nội dung bên ngoài và do đó đòi hỏi mức tin cậy có đặc quyền.

Với V1:

```text
Source adapters = trusted application code
```

Tin cậy của package không ngụ ý tin cậy của Source Adapter.

---

# 38. Độ tin cậy của Target Adapter

Target adapter có thể sinh ra các thao tác filesystem.

Do đó:

```text
Target adapter compromise
→ potential filesystem compromise
```

Các yêu cầu tin cậy của chúng SHOULD ở mức cao.

---

# 39. Độ tin cậy của registry

Độ tin cậy của registry trả lời câu hỏi:

> Chúng ta tin tưởng metadata do registry này cung cấp đến mức nào?

Phân loại khả thi:

```text
official
trusted
community
unknown
```

Độ tin cậy của registry tách biệt với độ tin cậy của package.

---

# 40. Metadata của registry

Một registry đáng tin cậy MAY cung cấp:

```text
publisher identity
integrity
signatures
security advisories
provenance
```

Nhưng hệ thống SHOULD xác minh tính toàn vẹn một cách độc lập khi có thể.

---

# 41. Chuỗi tin cậy

Tin cậy MAY tạo thành chuỗi.

Ví dụ:

```text
Organization
    trusts
Official Registry
    verifies
Publisher
    publishes
Package
```

Tuy nhiên:

> Tin cậy MUST NOT tự động truyền qua mọi mối quan hệ.

Mỗi mắt xích SHOULD có ngữ nghĩa tường minh.

---

# 42. Tin cậy không bắc cầu

Ví dụ:

```text
Organization trusts Vendor A
Vendor A depends on Community Package B
```

Điều này MUST NOT ngụ ý:

```text
Organization trusts Package B
```

Tin cậy của dependency MUST được đánh giá một cách độc lập.

---

# 43. Tin cậy của dependency

Mỗi dependency đã được resolve SHOULD giữ lại metadata tin cậy của riêng nó.

Graph hiệu lực có thể chứa các trust level hỗn hợp:

```text
first-party
├── trusted-vendor
├── community
└── community
```

Policy đánh giá graph tương ứng.

---

# 44. Khả năng hiển thị dependency bắc cầu

Người dùng SHOULD có khả năng xác định các dependency bắc cầu có mức tin cậy thấp hơn.

Ví dụ:

```text
plugin:foo
  trusted-vendor

depends on:
  plugin:bar
    community
```

Điều này SHOULD xuất hiện trong diagnostic khi liên quan.

---

# 45. Mức tin cậy tối thiểu

Một project hoặc Profile MAY chỉ định mức tin cậy tối thiểu.

Ví dụ:

```yaml
minimumTrust: trusted-vendor
```

Đây là cách viết tắt cho hành vi policy.

Nó SHOULD NOT bỏ qua Policy Engine.

---

# 46. Yêu cầu tin cậy của Profile

Các Profile MAY định nghĩa các ràng buộc tin cậy kỳ vọng.

Ví dụ:

```text
enterprise-secure
```

có thể yêu cầu:

```text
first-party
or
trusted-vendor
```

trong khi:

```text
experimentation
```

có thể cho phép các package cộng đồng.

---

# 47. Tin cậy theo môi trường

Trust policy MAY khác nhau theo môi trường.

Ví dụ:

```text
development
    community allowed

production
    trusted-vendor minimum
```

Bản thân package vẫn giữ nguyên metadata tin cậy.

Chỉ policy thay đổi.

---

# 48. Tin cậy và overlay

Overlay sửa đổi ngữ nghĩa của package.

Do đó, provenance và quyền sở hữu của chúng MUST được theo dõi.

Ví dụ:

```text
Vendor package
    trust: trusted-vendor

Organization overlay
    trust: first-party
```

Package kết quả SHOULD bảo toàn cả hai nguồn gốc.

---

# 49. Tin cậy của overlay không thay thế tin cậy của base

Một overlay đáng tin cậy trên một base không đáng tin cậy không tự động tạo ra một package đáng tin cậy.

Ví dụ:

```text
Base:
  community

Overlay:
  first-party
```

Mức tin cậy hiệu lực SHOULD vẫn thể hiện dependency base thuộc cộng đồng.

---

# 50. Thành phần package hiệu lực

Một package được tổ hợp SHOULD thể hiện các phần đóng góp vào tin cậy:

```text
base source
overlay sources
dependencies
adapter
```

Tin cậy SHOULD không bị thu gọn thành một nhãn đơn lẻ gây hiểu nhầm khi thiếu ngữ cảnh.

---

# 51. Graph provenance tin cậy

Về mặt khái niệm:

```text
Community Source
       │
       ▼
Vendor Import
       │
       ▼
Organization Overlay
       │
       ▼
Resolved Component
       │
       ▼
Claude Adapter
```

Mỗi node có provenance và tin cậy riêng biệt.

---

# 52. Thay đổi tin cậy

Hệ thống SHOULD phát hiện các thay đổi liên quan đến tin cậy trong quá trình cập nhật.

Ví dụ:

```text
source changed
publisher changed
repository transferred
signature missing
integrity algorithm changed
new transitive dependency
```

Các thay đổi này SHOULD được hiển thị tách biệt với các diff nội dung thông thường.

---

# 53. Review tin cậy khi cập nhật

Ví dụ:

```text
TRUST CHANGE

plugin:foo

Previous:
  trusted-vendor

Candidate:
  community

Reason:
  source repository changed
```

Điều này SHOULD chặn theo mặc định dưới policy nghiêm ngặt.

---

# 54. Thay đổi publisher

Nếu quyền sở hữu package thay đổi:

```text
publisher A
→ publisher B
```

tin cậy hiện có MUST NOT tự động được chuyển giao.

Điều này nên được xem là một sự kiện ranh giới tin cậy.

---

# 55. Chuyển nhượng repository

Các nền tảng Git hosting có thể cho phép chuyển nhượng repository.

Một URL repository vẫn resolve được sau khi chuyển nhượng không đảm bảo quyền sở hữu giống hệt.

Source adapter SHOULD ghi lại định danh chủ sở hữu ổn định khi có thể.

---

# 56. Đổi tên package

Việc đổi tên package MUST NOT được xem là danh tính tương đương khi không có metadata tường minh.

Ví dụ:

```text
foo
→ foo-next
```

Hệ thống SHOULD không tự động kế thừa tin cậy.

---

# 57. Tin cậy của namespace

Các namespace MAY có metadata tin cậy.

Ví dụ:

```text
vendor:mattpocock/*
```

có thể là trusted-vendor.

Nhưng các quy tắc namespace SHOULD luôn tường minh.

Wildcard SHOULD được kiểm soát cẩn thận.

---

# 58. So khớp tin cậy

Cấu hình tin cậy MAY hỗ trợ so khớp:

```text
source
publisher
namespace
repository
package
revision
```

Các quy tắc cụ thể SHOULD ghi đè các quy tắc rộng.

---

# 59. Thứ tự ưu tiên của quy tắc tin cậy

Thứ tự độ cụ thể được khuyến nghị:

```text
revision
    ↓
package
    ↓
repository
    ↓
publisher
    ↓
namespace
    ↓
source
    ↓
default
```

Các quy tắc tin cậy cụ thể hơn ghi đè các quy tắc ít cụ thể hơn.

---

# 60. Ví dụ về quy tắc tin cậy

```yaml
trust:
  defaults:
    community: community

  publishers:
    mattpocock:
      level: trusted-vendor

  packages:
    vendor:experimental-package:
      level: community
```

Quy tắc dành riêng cho package ghi đè tin cậy ở cấp publisher.

---

# 61. Quyền sở hữu cấu hình tin cậy

Cấu hình tin cậy SHOULD thường được quản lý bởi:

```text
organization
team
project owner
```

thay vì bởi các tác giả package được import.

---

# 62. Override của người dùng

Các developer cá nhân MAY được phép hạ mức tin cậy.

Ví dụ:

```text
trusted-vendor
→ community
```

Việc tăng mức tin cậy vượt quá giới hạn của tổ chức SHOULD nhìn chung bị cấm.

---

# 63. Mức trần tin cậy

Cấu hình tổ chức MAY định nghĩa mức tin cậy tối đa có thể gán.

Ví dụ:

```text
Project cannot elevate community package above verified-community.
```

Điều này ngăn cấu hình cục bộ bỏ qua cơ chế quản trị.

---

# 64. Mức sàn tin cậy

Các tổ chức MAY cũng áp đặt mức tin cậy tối thiểu cho một số môi trường nhất định.

Ví dụ:

```text
production:
  minimumTrust: trusted-vendor
```

Một lần nữa, điều này được hiện thực thông qua policy.

---

# 65. Tin cậy và lockfile

Lockfile SHOULD ghi nhận bằng chứng liên quan đến tin cậy, không chỉ phân loại.

Ví dụ:

```yaml
packages:
  foo:
    source: ...
    revision: abc123

    trust:
      level: trusted-vendor
      provenanceVerified: true
      integrityVerified: true
```

Việc bản thân phân loại tin cậy cuối cùng có thuộc về lockfile hay không SHOULD được quyết định cẩn thận.

---

# 66. Tin cậy động và tin cậy được lock

Có hai nhóm:

```text
artifact evidence
policy evaluation
```

Bằng chứng về artifact có thể được lock:

```text
source
revision
hash
signature
publisher
```

Trust policy có thể thay đổi một cách độc lập.

Do đó, lockfile SHOULD ưu tiên ghi lại bằng chứng thay vì chỉ một nhãn tin cậy được suy ra.

---

# 67. Đánh giá lại

Tin cậy SHOULD được tính toán lại khi:

```text
policy changes
source metadata changes
publisher identity changes
integrity fails
registry evidence changes
```

Nội dung package đã lock có thể giữ nguyên trong khi mức tin cậy hiệu lực thay đổi.

---

# 68. Tin cậy khi offline

Các bản build offline MUST có khả năng đánh giá tin cậy bằng bằng chứng đã lock/cục bộ.

Chúng SHOULD NOT yêu cầu liên hệ registry chỉ để xác định tin cậy.

Metadata tin cậy từ xa MAY được làm mới riêng.

---

# 69. Thu hồi

Tin cậy MAY cần bị thu hồi.

Ví dụ:

```text
compromised publisher
malicious revision
compromised signing key
registry incident
```

Một hệ thống tin cậy trong tương lai MAY hỗ trợ các bản ghi thu hồi.

---

# 70. Thu hồi cục bộ

V1 SHOULD cho phép policy cục bộ ngay lập tức từ chối:

```text
publisher
package
revision
source
```

mà không cần chờ các bản cập nhật từ registry từ xa.

---

# 71. Hết hạn tin cậy

Một số bằng chứng tin cậy MAY hết hạn.

Ví dụ:

```text
manual approval
temporary exception
publisher verification
```

Mô hình SHOULD hỗ trợ metadata hết hạn trong tương lai.

Ví dụ:

```yaml
trust:
  expiresAt: 2027-01-01
```

V1 MAY bỏ qua việc thực thi (enforce).

---

# 72. Phê duyệt thủ công

Việc phê duyệt thủ công SHOULD tường minh.

Ví dụ:

```yaml
trustOverrides:
  plugin:foo:
    level: trusted-vendor
    reason: "Reviewed internally"
```

Metadata được khuyến nghị:

```text
who
when
reason
scope
```

---

# 73. Phạm vi phê duyệt

Việc phê duyệt SHOULD chỉ định phạm vi:

```text
all revisions
specific revision
version range
repository
package
```

Phê duyệt cho một revision cụ thể là an toàn nhất.

---

# 74. Tin cậy tạm thời

Một override tin cậy tạm thời MAY hữu ích cho việc đánh giá.

Nó MUST NOT âm thầm trở thành vĩnh viễn.

Ý tưởng ví dụ:

```text
trusted until:
  date
or
  specific update
```

---

# 75. Khả năng kiểm toán tin cậy

Các quyết định tin cậy SHOULD có thể kiểm toán được.

Hệ thống SHOULD trả lời được:

```text
Why is this trusted?

Who approved it?

Which evidence supports it?

Which policy allowed it?

Has trust changed?
```

---

# 76. Kiểm tra tin cậy qua CLI

CLI trong tương lai:

```bash
agent-plugins inspect plugin:foo --trust
```

Output tiềm năng:

```text
Trust: trusted-vendor

Evidence:
  ✓ Publisher verified
  ✓ Source approved
  ✓ Immutable revision
  ✓ Integrity verified
  ✓ Curated import

Policy:
  organization/default
```

---

# 77. Giải thích tin cậy

CLI SHOULD cung cấp phần giải thích mà máy có thể đọc được.

Ví dụ:

```json
{
  "level": "trusted-vendor",
  "evidence": [
    "publisher-verified",
    "source-approved",
    "integrity-verified"
  ]
}
```

---

# 78. Cảnh báo tin cậy

Cảnh báo SHOULD xuất hiện khi mức tin cậy yếu hơn kỳ vọng.

Ví dụ:

```text
WARNING TRUST_TRANSITIVE_DEPENDENCY

plugin:foo is trusted-vendor but depends on:

  plugin:bar
  trust: community
```

---

# 79. UX cho tin cậy không xác định

CLI SHOULD phân biệt rõ ràng:

```text
unknown
```

với:

```text
untrusted
```

Unknown nghĩa là không đủ bằng chứng.

Untrusted MAY nghĩa là một phân loại tiêu cực tường minh hoặc sự từ chối.

---

# 80. Không tin cậy tường minh

Mô hình trong tương lai MAY bao gồm:

```text
blocked
revoked
malicious
```

Đây không phải là các trust level thông thường.

Chúng là các trạng thái từ chối.

Ví dụ:

```text
revoked
```

MUST ghi đè bằng chứng tin cậy tích cực.

---

# 81. Trạng thái tin cậy và trust level

Mô hình được khuyến nghị:

```text
Trust State:
  active
  unknown
  revoked
  blocked

Trust Level:
  first-party
  trusted-vendor
  verified-community
  community
```

Điều này tránh làm quá tải hệ thống phân cấp tin cậy.

---

# 82. Bằng chứng tin cậy tiêu cực

Bằng chứng tiêu cực tiềm năng:

```text
integrity mismatch
revoked key
repository ownership change
malware report
manual deny
security advisory
```

Bằng chứng tiêu cực nghiêm trọng SHOULD chi phối các tín hiệu tin cậy tích cực.

---

# 83. Xung đột tin cậy

Ví dụ:

```text
Publisher:
  trusted-vendor

Revision:
  revoked
```

Kết quả hiệu lực MUST là:

```text
blocked
```

Bằng chứng tiêu cực cụ thể ghi đè tin cậy rộng.

---

# 84. Thuật toán Resolution tin cậy

Về mặt khái niệm:

```text
collect evidence
      ↓
apply explicit blocks/revocations
      ↓
apply specific trust rules
      ↓
apply broader trust rules
      ↓
validate evidence requirements
      ↓
derive effective trust
      ↓
pass to Policy
```

Quy trình này MUST deterministic.

---

# 85. Yêu cầu tin cậy theo từng mức

Các yêu cầu khả thi:

## first-party

```text
controlled source
known ownership
known provenance
```

## trusted-vendor

```text
approved upstream
verified provenance
immutable revision
integrity
```

## verified-community

```text
verified identity
verified provenance
integrity
```

## community

```text
known source
known revision
```

## unknown

```text
requirements not satisfied
```

Các yêu cầu chính xác SHOULD có thể cấu hình được.

---

# 86. Trust profile

Các tổ chức MAY định nghĩa các trust profile có tên.

Ví dụ:

```text
strict
balanced
experimental
```

Những profile này SHOULD được mở rộng thành Policy và cấu hình tin cậy.

---

# 87. Trust profile nghiêm ngặt

Các quy tắc khái niệm ví dụ:

```text
first-party
trusted-vendor

allowed

verified-community
review required

community
denied

unknown
denied
```

---

# 88. Trust profile cân bằng

Ví dụ:

```text
first-party
trusted-vendor
verified-community
allowed

community
allowed for low-risk capabilities

unknown
denied
```

---

# 89. Trust profile thử nghiệm

Ví dụ:

```text
community allowed

unknown requires explicit approval

dangerous capabilities still restricted
```

Các trust profile MUST NOT ghi đè các bất biến bảo mật quan trọng.

---

# 90. Tin cậy và Profile

Các Profile của Agent Plugins như:

```text
frontend
backend
second-brain
```

SHOULD NOT hard-code ngữ nghĩa tin cậy, trừ khi Profile đó hướng đến bảo mật một cách cụ thể.

Tin cậy chủ yếu thuộc về Policy/cấu hình.

---

# 91. Tin cậy và Preset

Các Preset chọn capability/package.

Chúng SHOULD NOT tự động cấp tin cậy.

Ví dụ:

```text
preset:frontend-quality
```

có thể chọn một package vendor, nhưng package đó vẫn phải chịu sự đánh giá tin cậy.

---

# 92. Tin cậy và việc chọn Provider

Khi nhiều provider cùng hiện thực một capability, tin cậy MAY ảnh hưởng đến việc lựa chọn.

Ví dụ:

```text
capability: code-review
```

các provider:

```text
first-party/reviewer
trusted-vendor/reviewer
community/reviewer
```

Resolver MAY sử dụng tin cậy như một ràng buộc lựa chọn deterministic.

---

# 93. Tin cậy không phải là xếp hạng chất lượng

Một provider có mức tin cậy cao hơn không nhất thiết có nghĩa là:

```text
better quality
better prompts
more capable
```

Tin cậy mô tả mức độ tin tưởng và quản trị.

Chất lượng SHOULD được mô hình hóa riêng biệt.

---

# 94. Policy lựa chọn Provider

Việc lựa chọn provider có thể tuân theo:

```text
compatibility
policy
trust requirements
explicit preference
priority
```

Tin cậy SHOULD không âm thầm ghi đè một lựa chọn user/provider tường minh, trừ khi Policy yêu cầu.

---

# 95. Tin cậy và tìm kiếm

Tìm kiếm catalog MAY hiển thị tin cậy.

Ví dụ:

```text
NAME                  TRUST
frontend-quality      first-party
ecc                    trusted-vendor
foo-reviewer           community
```

Xếp hạng tìm kiếm SHOULD NOT âm thầm đẩy các package lên chỉ vì tin cậy.

---

# 96. Tin cậy và discovery

Discovery có thể tìm thấy nội dung không đáng tin cậy.

Điều này có thể chấp nhận được.

Điểm phân biệt quan trọng:

```text
discoverable
!=
installable
```

Tin cậy và Policy quyết định liệu nội dung được phát hiện có được đưa vào môi trường hiệu lực hay không.

---

# 97. Tin cậy và cài đặt

Trước khi cài đặt:

```text
Resolved Graph
      ↓
Trust Evaluation
      ↓
Policy Evaluation
      ↓
Adapter Validation
      ↓
Install
```

Thứ tự chính xác của việc hiện thực tin cậy/policy có thể được tích hợp, nhưng cả hai quyết định phải diễn ra trước khi thay đổi.

---

# 98. Tin cậy và build

Build SHOULD thất bại khi Policy yêu cầu bằng chứng tin cậy không thể được thiết lập.

Ví dụ:

```text
trusted-vendor required

package integrity:
  unknown
```

Kết quả:

```text
fail
```

---

# 99. Tin cậy và CI

CI SHOULD sử dụng các bảo đảm tin cậy mạnh hơn.

Khuyến nghị:

```text
immutable lockfile
integrity verification
strict Policy
no new trust approvals
```

CI SHOULD NOT phê duyệt tương tác đối với tin cậy không xác định.

---

# 100. Thay đổi tin cậy trong pull request

Các thay đổi lockfile/config nhạy cảm về tin cậy SHOULD dễ nhận thấy trong quá trình code review.

Ví dụ:

```text
new source
new publisher
trust elevation
new community dependency
revision change
```

---

# 101. Diff tin cậy

CLI trong tương lai:

```bash
agent-plugins diff --trust
```

Output tiềm năng:

```text
+ community:foo

~ vendor:bar
  trusted-vendor → community

! publisher changed
```

---

# 102. Cổng tin cậy khi cập nhật

Một bản cập nhật MAY tiến hành tự động chỉ khi các đặc tính tin cậy của nó vẫn tương thích với Policy.

Ví dụ:

```text
trusted-vendor
→ trusted-vendor
```

có thể tiến hành.

Nhưng:

```text
trusted-vendor
→ community
```

SHOULD yêu cầu review tường minh hoặc thất bại.

---

# 103. Cổng dependency mới

Một bản cập nhật package đáng tin cậy mà đưa vào một dependency cộng đồng mới SHOULD được xem là một thay đổi tin cậy.

Ví dụ:

```text
plugin:A
trusted-vendor

new dependency:
plugin:B
community
```

Điều này MUST được hiển thị.

---

# 104. Tin cậy và signature

Signature cung cấp bằng chứng về tính xác thực.

Chúng SHOULD NOT ánh xạ trực tiếp thành trust level.

Ví dụ:

```text
signed by unknown publisher
```

vẫn không tương đương với trusted-vendor.

---

# 105. Trust root

Các tổ chức MAY định nghĩa các trust root.

Ví dụ:

```text
approved GitHub organizations
approved registry publishers
approved signing keys
```

Trust root SHOULD là cấu hình tường minh.

---

# 106. Nhiều trust root

Các hệ sinh thái khác nhau có thể sử dụng các root khác nhau:

```text
GitHub organization ownership
registry publisher ID
signature key
internal repository namespace
```

Canonical trust model SHOULD chuẩn hóa bằng chứng của chúng.

---

# 107. Trust anchor

Một trust anchor là bằng chứng được chấp nhận mà không cần ủy quyền thêm.

Ví dụ:

```text
organization-owned signing key
internal Git server
first-party repository
```

Trust anchor MUST được cấu hình, không do package kiểm soát.

---

# 108. Ủy quyền tin cậy

Các implementation trong tương lai MAY hỗ trợ ủy quyền (delegation).

Ví dụ:

```text
Organization
trusts
Vendor
to publish
namespace: vendor/*
```

Việc ủy quyền MUST có phạm vi.

Ủy quyền không giới hạn SHOULD được tránh.

---

# 109. Phạm vi ủy quyền

Phạm vi khả thi:

```text
namespace
repository
package
capability
time period
```

Ủy quyền tin cậy MUST NOT tự động bao gồm các dependency của bên thứ ba.

---

# 110. Ưu tiên thu hồi tin cậy

Thu hồi MUST được ưu tiên hơn ủy quyền.

Ví dụ:

```text
Vendor trusted
Package revision revoked
```

Kết quả:

```text
revision blocked
```

---

# 111. Ứng phó khi bị xâm phạm

Khi một trust anchor bị xâm phạm:

```text
revoke trust anchor
      ↓
re-evaluate packages
      ↓
identify affected lockfiles
      ↓
block updates/builds if necessary
```

---

# 112. Lưu trữ tin cậy

Các quyết định tin cậy MAY được lưu tại:

```text
organization policy
workspace config
project config
local user config
```

Repository chuẩn SHOULD phân biệt rõ ràng các khai báo tin cậy lâu dài với các lựa chọn CLI tạm thời.

---

# 113. Không có cache tin cậy ẩn

Hệ thống SHOULD NOT âm thầm ghi nhớ các quyết định tin cậy tương tác bên ngoài cấu hình hiển thị.

Ví dụ:

```text
"Trust this package forever?"
```

phải dẫn đến một bản ghi tin cậy được lưu trữ tường minh nếu được chấp nhận.

---

# 114. Nhắc xác nhận tin cậy

Các lời nhắc xác nhận tin cậy tương tác SHOULD hiếm khi xảy ra.

Ưu tiên:

```text
Policy/configuration
```

thay vì nhắc lặp đi lặp lại.

Khi cần nhắc, hãy hiển thị:

```text
entity
source
publisher
revision
risk
requested trust change
```

---

# 115. UX nâng mức tin cậy

Không bao giờ diễn đạt:

```text
This package is safe. Trust it?
```

Ưu tiên:

```text
This package currently has community trust.

Source:
...

Revision:
...

Elevate to trusted-vendor for this revision?
```

Điều này bảo toàn ngữ nghĩa chính xác.

---

# 116. UX khi tin cậy hết hạn

Nếu bằng chứng tin cậy hết hạn, CLI SHOULD giải thích lý do cần đánh giá lại.

Ví dụ:

```text
Manual approval expired.

Package:
  plugin:foo

Approved revision:
  abc123

Current revision:
  def456
```

---

# 117. Mô hình dữ liệu tin cậy

Cấu trúc khái niệm:

```ts
interface TrustContext {
  subject: TrustSubject

  state:
    | "active"
    | "unknown"
    | "blocked"
    | "revoked"

  level?:
    | "first-party"
    | "trusted-vendor"
    | "verified-community"
    | "community"

  evidence: TrustEvidence[]

  reasons: TrustReason[]
}
```

---

# 118. Mô hình bằng chứng tin cậy

Về mặt khái niệm:

```ts
interface TrustEvidence {
  type:
    | "publisher"
    | "repository"
    | "integrity"
    | "signature"
    | "manual-review"
    | "organization-ownership"

  status:
    | "verified"
    | "unverified"
    | "failed"

  source: string
}
```

Implementation chính xác có thể khác.

---

# 119. Lý do tin cậy

Việc đánh giá tin cậy SHOULD tạo ra các lý do.

Ví dụ:

```ts
interface TrustReason {
  code: string
  message: string
}
```

Các mã tiềm năng:

```text
TRUST_SOURCE_FIRST_PARTY
TRUST_PUBLISHER_VERIFIED
TRUST_MANUAL_APPROVAL
TRUST_INTEGRITY_FAILED
TRUST_PUBLISHER_CHANGED
TRUST_REVISION_UNREVIEWED
```

---

# 120. Diagnostic tin cậy

Các diagnostic được khuyến nghị:

```text
TRUST_UNKNOWN

TRUST_LEVEL_TOO_LOW

TRUST_DOWNGRADE

TRUST_PUBLISHER_CHANGED

TRUST_SOURCE_CHANGED

TRUST_REVISION_UNVERIFIED

TRUST_TRANSITIVE_DEPENDENCY

TRUST_REVOKED

TRUST_OVERRIDE_DENIED
```

---

# 121. Ví dụ diagnostic tin cậy

```text
ERROR TRUST_LEVEL_TOO_LOW

Package:
  community:foo

Effective trust:
  community

Required:
  trusted-vendor

Policy:
  organization/production

Suggestion:
  Use an approved provider or request an explicit trust review.
```

---

# 122. Tính deterministic của tin cậy

Với cùng:

```text
trust configuration
evidence
source metadata
revision
policy
```

quyết định tin cậy hiệu lực MUST giống hệt nhau.

Việc đánh giá tin cậy MUST NOT phụ thuộc vào:

```text
search popularity
download counts
runtime randomness
local current time
```

ngoại trừ ngữ nghĩa hết hạn tường minh.

---

# 123. Độ phổ biến

Các chỉ số như:

```text
GitHub stars
downloads
forks
```

MAY được hiển thị như metadata mang tính thông tin.

Chúng MUST NOT tự động cấp tin cậy.

---

# 124. Danh tiếng

Các hệ thống danh tiếng trong tương lai MAY hỗ trợ việc review của con người.

Chúng SHOULD được giữ tách biệt khỏi phân loại tin cậy có thẩm quyền, trừ khi được cấu hình tường minh.

---

# 125. Tin cậy dựa trên AI

Phân tích AI MAY cuối cùng xác định được hành vi đáng ngờ của package.

Output của AI MUST NOT là cơ sở duy nhất để nâng mức tin cậy.

Nó MAY đóng góp:

```text
warning
review recommendation
risk signal
```

nhưng không âm thầm cấp trạng thái đáng tin cậy.

---

# 126. Tin cậy và khuyến cáo bảo mật

Các khuyến cáo bảo mật MAY làm giảm mức tin cậy hiệu lực hoặc chặn các revision cụ thể.

Ví dụ:

```text
trusted-vendor package
+
known malicious revision
→ blocked
```

Bằng chứng tiêu cực cụ thể ghi đè tin cậy chung.

---

# 127. Lịch sử tin cậy

Các implementation trong tương lai SHOULD bảo toàn lịch sử tin cậy.

Ví dụ:

```text
2026-08-01 community
2026-08-10 verified-community
2026-09-01 trusted-vendor
2026-09-20 revoked
```

Hữu ích cho kiểm toán và ứng phó sự cố.

---

# 128. Workflow review tin cậy

Một workflow hoàn thiện MAY là:

```text
Discover
   ↓
Verify provenance
   ↓
Inspect package
   ↓
Review permissions
   ↓
Review source
   ↓
Assign trust
   ↓
Apply Policy
```

Việc gán tin cậy SHOULD có thể kiểm toán được.

---

# 129. Onboarding vendor

Để phân loại một source là `trusted-vendor`, việc review được khuyến nghị bao gồm:

```text
verify repository identity
verify publisher identity
review maintenance history
review package scope
review executable behavior
define allowed namespaces
pin source
enable integrity
```

---

# 130. Thăng hạng cộng đồng

Thăng hạng:

```text
community
→ verified-community
```

SHOULD yêu cầu bằng chứng danh tính/provenance mạnh hơn.

Thăng hạng:

```text
verified-community
→ trusted-vendor
```

SHOULD yêu cầu sự tuyển chọn tường minh từ tổ chức.

---

# 131. Ranh giới tin cậy cho dự án ban đầu

Đối với implementation ban đầu của Agent Plugins:

```text
first-party
    → trusted by default

vendor
    → explicitly curated

community
    → untrusted by default

adapters
    → first-party only
```

Điều này giữ cho V1 đơn giản và an toàn.

---

# 132. Phạm vi tin cậy của V1

V1 SHOULD hỗ trợ:

```text
trust levels
source-level trust
package-level override
revision provenance
integrity evidence
Policy integration
trust diagnostics
trust downgrade detection
```

V1 SHOULD NOT yêu cầu:

```text
public PKI
complex reputation
distributed trust
automated trust scoring
community voting
```

---

# 133. Tin cậy mặc định của V1

Các giá trị mặc định được khuyến nghị:

```text
canonical first-party
    → first-party

explicit vendor source
    → trusted-vendor

known external source
    → community

unresolved source
    → unknown
```

Không nội dung bên ngoài nào SHOULD mặc định là trusted-vendor khi không có cấu hình tường minh.

---

# 134. Các yêu cầu trước khi mở cho cộng đồng

Trước khi hỗ trợ rộng rãi package cộng đồng:

```text
provenance
integrity
trust classification
trust diagnostics
Policy integration
transitive trust visibility
source namespace protection
```

MUST sẵn sàng.

---

# 135. Các yêu cầu trước khi có adapter bên thứ ba

Trước khi hỗ trợ adapter cộng đồng:

```text
adapter trust
publisher verification
integrity
permissions
sandboxing
revocation
```

SHOULD tồn tại.

---

# 136. Các bất biến tin cậy cốt lõi

Những điều sau đây mang tính quy chuẩn.

## Bất biến 1 — Tin cậy không phải là quyền

Các thực thể đáng tin cậy vẫn phải chịu sự chi phối của Policy.

## Bất biến 2 — Tin cậy không thể tự nâng cấp

Package MUST NOT tự gán mức tin cậy hiệu lực của chính mình.

## Bất biến 3 — Tin cậy nhận biết provenance

Các quyết định tin cậy bên ngoài MUST giữ lại định danh source.

## Bất biến 4 — Tin cậy nhận biết revision

Một repository đáng tin cậy không tự động ngụ ý mọi revision đều đáng tin cậy.

## Bất biến 5 — Tin cậy không tự động có tính bắc cầu

Các dependency được đánh giá một cách độc lập.

## Bất biến 6 — Tính toàn vẹn không phải là tin cậy

Một hash hợp lệ chứng minh tính nhất quán, không phải sự an toàn.

## Bất biến 7 — Danh tính không phải là tin cậy

Quyền tác giả đã được xác minh không chứng minh hành vi an toàn.

## Bất biến 8 — Bằng chứng tiêu cực chiếm ưu thế

Thu hồi và lỗi toàn vẹn ghi đè tin cậy tích cực.

## Bất biến 9 — Không xác định vẫn là không xác định

Bằng chứng bị thiếu MUST NOT được diễn giải theo hướng tích cực.

## Bất biến 10 — Các quyết định tin cậy giải thích được

Mức tin cậy hiệu lực MUST truy vết được về bằng chứng và quy tắc.

---

# 137. Luồng tin cậy tham chiếu

```text
External Package
      │
      ▼
Source Identity
      │
      ▼
Publisher Identity
      │
      ▼
Provenance
      │
      ▼
Integrity
      │
      ▼
Trust Rules
      │
      ▼
Effective Trust Context
      │
      ▼
Policy Engine
      │
      ▼
Allow / Deny / Review
```

---

# 138. Luồng dependency tham chiếu

```text
plugin:A
trust: trusted-vendor
      │
      ├── plugin:B
      │   trust: trusted-vendor
      │
      └── plugin:C
          trust: community
```

Mức tin cậy của môi trường hiệu lực không đơn giản là:

```text
trusted-vendor
```

Dependency có mức tin cậy thấp hơn MUST luôn hiển thị.

---

# 139. Ví dụ quyết định tin cậy

Input:

```text
Package:
  vendor:foo

Source:
  approved vendor repository

Revision:
  abc123

Integrity:
  verified

Publisher:
  verified

Review:
  curated
```

Kết quả:

```text
Trust state:
  active

Trust level:
  trusted-vendor
```

Sau đó Policy quyết định liệu các capability của package có được cho phép hay không.

---

# 140. Ví dụ lỗi tin cậy

Input:

```text
Package:
  vendor:foo

Expected revision:
  abc123

Actual content:
  integrity mismatch
```

Kết quả:

```text
Trust state:
  blocked
```

Phân loại trusted-vendor trước đó MUST NOT ghi đè lỗi toàn vẹn.

---

# 141. Mối quan hệ kiến trúc

Luồng hoàn chỉnh trở thành:

```text
Source Adapter
      ↓
Provenance + Evidence
      ↓
Trust Evaluation
      ↓
Canonical Catalog
      ↓
Resolver
      ↓
Resolved Graph
      ↓
Policy
      ↓
Allowed Graph
      ↓
Target Adapter
```

Implementation MAY đánh giá tin cậy trong quá trình nạp catalog và xác thực lại sau resolution.

Thuộc tính quan trọng là:

> Policy luôn nhận được đủ ngữ cảnh tin cậy cho mọi thực thể được chọn.

---

# 142. Mối quan hệ với Security Model

`security-model.md` định nghĩa:

```text
threats
attack surfaces
security boundaries
controls
```

`trust-model.md` định nghĩa:

```text
trust subjects
trust levels
evidence
trust derivation
trust changes
```

Kết hợp lại:

```text
Trust
+
Risk
+
Policy
=
Security decision
```

---

# 143. Mối quan hệ với Source Spec

`source-spec.md` SHOULD định nghĩa cách thu thập bằng chứng về source:

```text
repository
revision
publisher
integrity
signature
```

`trust-model.md` định nghĩa cách bằng chứng đó đóng góp vào tin cậy.

---

# 144. Mối quan hệ với Policy Spec

`policy-spec.md` định nghĩa các quyết định như:

```text
allow
deny
require
```

dựa trên ngữ cảnh tin cậy.

Ví dụ:

```text
trust <= community
AND
capability = shell-execute
→ deny
```

Bản thân Trust Model MUST NOT thực hiện việc ủy quyền (authorization) cuối cùng.

---

# 145. Mối quan hệ với Lockfile

`lockfile-spec.md` SHOULD bảo toàn bằng chứng bất biến liên quan đến tin cậy.

Ví dụ:

```text
source
publisher
revision
integrity
signature identity
```

Khi đó, việc đánh giá tin cậy MAY được tái tạo mà không cần tin vào metadata từ xa có thể thay đổi.

---

# 146. Mối quan hệ với Update Spec

`update-spec.md` MUST phát hiện:

```text
trust downgrade
publisher change
source change
new transitive trust
integrity changes
```

Các bản cập nhật làm thay đổi tin cậy SHOULD được review ở mức cao hơn.

---

# 147. Mối quan hệ với Adapter Spec

Bản thân adapter có các yêu cầu tin cậy.

Với V1:

```text
Adapters
=
trusted application components
```

Các adapter cộng đồng trong tương lai đòi hỏi các cơ chế cô lập và tin cậy mạnh hơn.

---

# 148. Vị trí đề xuất trong repository

Khuyến nghị:

```text
docs/
├── architecture/
│   ├── architecture.md
│   ├── security-model.md
│   └── trust-model.md
```

hoặc, nếu cấu trúc hiện tại phẳng hơn:

```text
docs/
├── security-model.md
├── trust-model.md
```

`trust-model.md` nằm cạnh `security-model.md`, không nằm dưới các chi tiết implementation của adapter/source.

---

# 149. Thứ tự ưu tiên implementation ban đầu

Hiện thực tin cậy theo thứ tự sau:

```text
1. Provenance

2. Source identity

3. Integrity

4. Basic trust levels

5. Trust configuration

6. Trust diagnostics

7. Policy integration

8. Dependency trust visibility

9. Update trust diff

10. Revocation
```

Tránh xây dựng sớm các hệ thống danh tiếng publisher phức tạp.

---

# 150. Tóm tắt quyết định cuối cùng

Trust model của Agent Plugins áp dụng:

```text
Trust
    = structured confidence based on evidence

Trust
    != permission

Trust
    != integrity

Trust
    != identity

Trust
    != popularity
```

Hệ thống phân cấp tin cậy ban đầu là:

```text
first-party
    ↓
trusted-vendor
    ↓
verified-community
    ↓
community
    ↓
unknown
```

cùng với các trạng thái chặn riêng biệt như:

```text
blocked
revoked
```

Quy tắc thiết kế mạnh nhất là:

> Tin cậy cung cấp thông tin cho Policy; tin cậy không bao giờ thay thế Policy.

Điều này giữ cho mức độ tin tưởng vào source, rủi ro runtime, và việc ủy quyền là các mối quan tâm kiến trúc độc lập.