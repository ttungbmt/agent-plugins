# Đặc tả Adapter

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.

## Tổng quan

Tài liệu này định nghĩa các hợp đồng (contract) Source Adapter và Target Adapter cho `agent-plugins`.

Source Adapter chuẩn hóa các dữ kiện upstream thành inventory Provider, Package và Component. Target Adapter chuyển đổi trạng thái Resolution và Lock đã được validate thành runtime state được quản lý.

Đây là một hợp đồng triển khai V1 được đề xuất, không phải tài liệu về một SDK đã tồn tại. MUST, SHOULD và MAY biểu thị hành vi bắt buộc, được khuyến nghị và tùy chọn. V1 yêu cầu một target, `claude-code`; các runtime khác là phần mở rộng trong tương lai.

Các hợp đồng liên quan:

- [Kiến trúc](../../02-architecture/.vi/architecture.vi.md): ranh giới giữa các subsystem.
- [Nguồn sự thật](../../02-architecture/.vi/source-of-truth.vi.md): trạng thái có thẩm quyền (authoritative) và được dẫn xuất (derived).
- [Resolution](../../02-architecture/.vi/resolution-spec.vi.md): lựa chọn và dependency closure.
- [Catalog](./catalog-spec.vi.md): các định danh được tuyển chọn (curated) và implementation mapping.
- [Manifest](./manifest-spec.vi.md): ý định (intent) của bên sử dụng và việc chọn target.
- [Lockfile](./lockfile-spec.vi.md): các tham chiếu bất biến (immutable) và dual lock.
- [Policy](./policy-spec.vi.md): kết quả về tính đủ điều kiện (eligibility) và ủy quyền (authorization).

## 1. Ranh giới hệ thống

```text
Upstream / first-party source
          |
     Source Adapter
          |
Normalized inventory + curated Catalog + catalog.lock
          |
Profile + Presets + Project + Policy
          |
       Resolver
          |
Resolution + agent-plugins.lock
          |
     Target Adapter
          |
Managed runtime state
```

| Mối quan tâm | Bên sở hữu |
|---|---|
| Thu thập và chuẩn hóa cấu trúc upstream | Source Adapter và dịch vụ thu thập (acquisition) dùng chung |
| Ý nghĩa Capability, mapping, mức ưu tiên | Catalog được tuyển chọn |
| Mở rộng Profile/Preset; chọn implementation | Resolver |
| Đánh giá độ tin cậy (trust) và quyền (permission) | Policy engine |
| Ghim (pin) các input phân phối | workflow `catalog.lock` |
| Cố định các lựa chọn của project | workflow `agent-plugins.lock` |
| Render, kiểm tra, lập kế hoạch, áp dụng các thay đổi runtime | Target Adapter |
| Điều phối ủy quyền, lock và khôi phục | Dịch vụ application/sync |

Adapter MUST NOT chọn implementation thay thế, định nghĩa lại ngữ nghĩa Capability, gán mức ưu tiên hoặc làm suy yếu Policy. Chúng báo cáo các dữ kiện và giới hạn cho subsystem sở hữu tương ứng.

Consumer manifest không thể cung cấp các adapter script tùy ý. Việc nạp động adapter của bên thứ ba nằm ngoài phạm vi V1.

## 2. Định danh và khả năng tương thích của adapter

Mọi adapter MUST khai báo một ID ổn định, phiên bản implementation, phiên bản contract, và các định dạng source được hỗ trợ hoặc phạm vi tương thích runtime. Target descriptor cũng khai báo các loại Component, mức độ chi tiết kích hoạt (activation granularity), các chế độ cài đặt và các giới hạn kiểm tra (inspection).

Thay đổi phiên bản adapter không làm thay đổi định danh chuẩn (canonical) của Package hoặc Component. Các thay đổi ảnh hưởng tới discovery hoặc rendering MUST làm vô hiệu các kết quả cache liên quan. Các phiên bản contract không được hỗ trợ sẽ thất bại trước khi có thay đổi (mutation).

Source cache key bao gồm định danh source bất biến, thư mục con của package, phiên bản adapter, phiên bản contract và các tùy chọn đã chuẩn hóa. Target artifact key bao gồm các content digest đã khóa, Component closure được chọn, các phép biến đổi (transformation), phiên bản adapter và các tùy chọn rendering. Bao gồm cả phiên bản runtime khi nó làm thay đổi output được sinh ra.

Metadata thực thi thuộc về inventory, artifact, plan và receipt cục bộ được dẫn xuất. Không thêm các tùy chọn adapter cục bộ theo máy vào Project intent mang tính ngữ nghĩa. Mọi phần mở rộng schema của lockfile đều tuân theo hợp đồng lockfile.

## 3. Hợp đồng Source Adapter

Các signature sau mô tả trách nhiệm; chúng không phải là các kiểu SDK được export cuối cùng.

```ts
interface SourceAdapter {
  descriptor: SourceAdapterDescriptor;
  discover(
    source: SourceDescriptor,
    context: SourceContext
  ): Promise<DiscoveryResult>;
}
```

`SourceContext` cung cấp các dịch vụ thu thập, quyền truy cập cache/scratch có giới hạn, credential handle, cơ chế hủy (cancellation) và chế độ vận hành.

- **Discovery/update:** các ref có thể thay đổi (mutable) có thể được kiểm tra, nhưng output ghi lại định danh bất biến chính xác đã được resolve.
- **Tái tạo theo lock (locked reproduction):** lấy đúng source đã khóa. Thiếu nội dung hoặc sai lệch integrity sẽ thất bại; không bao giờ thay thế bằng đầu nhánh (branch tip) hoặc phiên bản mới hơn.

### 3.1 Output được chuẩn hóa

| Nhóm field | Ý nghĩa bắt buộc |
|---|---|
| Định danh source | Locator, ref được yêu cầu nếu có, ref bất biến đã resolve, thư mục con của package |
| Nguồn gốc (provenance) | Định danh/phiên bản adapter và nguồn gốc của mỗi record được trích xuất |
| Package | Định danh Package chuẩn và metadata được trích xuất |
| Component | ID ổn định, loại (kind), entrypoint, các dependency được khai báo, tài nguyên hỗ trợ |
| Dữ kiện tương thích | Các ràng buộc upstream và các giới hạn parsing/rendering đã biết |
| Integrity | Thuật toán và đối tượng được định nghĩa chính xác cho mọi digest hiện có |
| Diagnostics | Các lỗi có cấu trúc, cảnh báo và mức độ đầy đủ của inventory |

Discovery có thể trích xuất metadata của Provider nhưng MUST NOT ghi đè độ tin cậy hoặc quyền sở hữu đã được tuyển chọn. Các phần mở rộng riêng theo source có thể giữ lại metadata không xác định; chúng không được âm thầm trở thành cấu hình có thể thực thi.

Một lần quét chưa đầy đủ không phải là một inventory rỗng có thẩm quyền và MUST NOT kích hoạt việc gỡ bỏ các Component đã được khám phá trước đó.

### 3.2 Tách biệt transport và định dạng

Ưu tiên cơ chế thu thập Git/filesystem dùng chung với các trình đọc định dạng (format reader) có thể tái sử dụng như `claude-marketplace` và `agent-skills`. Các reader riêng cho Provider chỉ hợp lý khi có khác biệt về cấu trúc mà reader tổng quát không thể biểu đạt.

Một repository có thể cung cấp nhiều Package. Thư mục con của Package là một phần của định danh source. Các mục marketplace là tham chiếu cần kiểm tra, không phải bằng chứng rằng nội dung được tham chiếu đã được tải xuống hoặc đáng tin cậy. Các tham chiếu đệ quy yêu cầu duyệt có giới hạn, phát hiện chu trình và provenance riêng biệt.

Khi nhiều reader cùng khớp, hãy dùng cấu hình tường minh hoặc báo cáo sự mơ hồ. Không bao giờ chọn dựa trên thứ tự duyệt filesystem.

### 3.3 Chuẩn hóa Component

Giữ nguyên các ID chuẩn như:

```text
superpowers/superpowers#skill:test-driven-development
```

Giữ nguyên các entrypoint, các file hỗ trợ bắt buộc, yêu cầu về bit thực thi (executable bit), các tham chiếu tương đối, các dependency được khai báo, thông báo giấy phép (license notice) và metadata riêng theo source. Một thư mục skill không chỉ gồm `SKILL.md` của nó.

Các ID trùng lặp và các đường dẫn được chuẩn hóa về cùng một định danh sẽ thất bại khi validate. Xung đột chữ hoa/chữ thường phải được phát hiện trên các filesystem đích được hỗ trợ. Một file upstream bị đổi tên không tự động là một lần di chuyển (migration) định danh chuẩn.

Discovery MUST NOT suy ra các Capability mapping có thẩm quyền từ tên file hoặc văn bản mô tả. Các mapping được gợi ý cần một workflow tuyển chọn riêng. Việc parsing không bao giờ thực thi các setup script, hook, server hoặc lifecycle script của package manager từ upstream.

### 3.4 An toàn và khả năng tái tạo của source

Resolve các entrypoint bên dưới thư mục gốc source đã được xác minh. Từ chối các mục archive có đường dẫn tuyệt đối, việc duyệt ra ngoài thư mục gốc đó và việc chuẩn hóa mơ hồ. V1 từ chối symbolic link trong các payload được materialize; các upstream cần link phải có một phép biến đổi tường minh đã được xác minh trước khi có thể tuyên bố hỗ trợ.

Với source dạng filesystem, hãy tạo một snapshot ổn định trước khi hash và parse. Chỉ một đường dẫn có thể thay đổi thì không thể tái tạo được. Package native sử dụng định danh phân phối và bằng chứng nội dung được định nghĩa bởi hợp đồng lockfile.

Nếu overlay được hỗ trợ, hãy giữ nguyên snapshot gốc và ghi lại định danh overlay cùng content digest kết quả. Một chỉnh sửa vendor không được ghi lại không phải là một source đã khóa. Hợp đồng này không giới thiệu định dạng overlay manifest mới.

## 4. Target compatibility descriptor

Resolver sử dụng các descriptor đã chuẩn hóa, không bao giờ sử dụng các implementation Target Adapter cụ thể. Khả năng tương thích được đánh giá theo từng Component và dependency closure, không chỉ dựa trên phần mở rộng file.

| Kết quả | Ý nghĩa | Hành vi lựa chọn |
|---|---|---|
| Supported | Hành vi bắt buộc có thể được bảo toàn | Đủ điều kiện, tùy thuộc Policy |
| Conditional | Thiếu một điều kiện tiên quyết hoặc phê duyệt được nêu tên | Không đủ điều kiện cho đến khi được đáp ứng |
| Unsupported | Hành vi bắt buộc không thể được biểu diễn | Từ chối ứng viên |

Các điều kiện bao gồm phiên bản runtime, hệ điều hành, khả năng sẵn có của executable, hỗ trợ hook event, tham chiếu credential, phạm vi cài đặt và mức độ chi tiết kích hoạt.

Chuyển đổi mất mát thông tin (lossy) MUST NOT quảng bá là hỗ trợ đầy đủ. Các yêu cầu tùy chọn chỉ có thể bị bỏ qua bởi Resolver theo các quy tắc về yêu cầu tùy chọn của nó. Adapter không thể bỏ một Component đã được chọn rồi báo cáo thành công.

Hành vi runtime không xác định là một lỗi tương thích chứ không phải một giả định về sự hỗ trợ.

## 5. Hợp đồng Target Adapter

```ts
interface TargetAdapter {
  descriptor: TargetAdapterDescriptor;
  inspect(context: TargetContext): Promise<ActualState>;
  plan(
    desired: ValidatedTargetState,
    actual: ActualState,
    context: PlanningContext
  ): Promise<MaterializationPlan>;
  apply(
    plan: MaterializationPlan,
    context: ApplyContext
  ): Promise<MaterializationResult>;
}
```

`ValidatedTargetState` cung cấp target, scope, Resolution/Project Lock đã được validate, các source snapshot đã xác minh, dependency closure được chọn và các quyết định Policy. Bản xem trước (preview) có thể dùng một lock dự kiến; apply yêu cầu cùng các input digest đã được validate.

Context cung cấp định danh project, thư mục gốc chuẩn, runtime descriptor, receipt trước đó và cấu hình target tường minh. Scope mặc định của V1 là project hiện tại. Không cho phép cài đặt global ngầm định.

### 5.1 Inspect

Inspection chỉ đọc (read-only). Trả về các đăng ký (registration) quan sát được, trạng thái bật (enablement), bằng chứng nội dung, các mục cấu hình được sở hữu, phiên bản runtime và các giới hạn quan sát.

Phân loại trạng thái liên quan thành managed, unmanaged, conflicted hoặc unknown. Một tên hiển thị trùng khớp không phải là bằng chứng sở hữu. Việc thiếu receipt, runtime state không thể truy cập và các lỗi parsing phải được hiển thị. Trạng thái unknown MUST NOT bị coi là không tồn tại rồi bị ghi đè.

Đăng ký, khả năng sẵn có trong một session mới và tình trạng thực thi là các quan sát riêng biệt. Nêu rõ những gì có thể được xác lập mà không cần thực thi nội dung đã cài đặt.

### 5.2 Plan

Việc lập kế hoạch là deterministic với các input và quan sát đã validate giống hệt nhau. Nó MUST NOT cài đặt plugin, sửa đổi cấu hình, thực thi nội dung upstream, thay đổi lock hoặc truy cập mạng. Việc thu thập diễn ra trước khi lập kế hoạch; thiếu nội dung đã xác minh sẽ tạo ra một diagnostic.

Mỗi thao tác (operation) ghi lại:

- ID thao tác ổn định, hành động, target, scope và đích/đăng ký.
- Provenance của Package và Component cùng lý do thay đổi.
- Trạng thái trước dự kiến và trạng thái mong muốn, kèm các digest áp dụng.
- Các phụ thuộc vào những thao tác trước đó.
- Kết quả Policy, các tác động nhạy cảm về thực thi và các giới hạn rollback.

Các hành động bao gồm create, update, remove, enable, disable và preserve. Việc gỡ bỏ yêu cầu bằng chứng sở hữu. Các dependency dùng chung được giữ lại cho đến khi không còn Component được chọn nào cần chúng.

Plan bao gồm input digest, fingerprint của actual state, phiên bản adapter, các thao tác có thứ tự và diagnostics. Hash của plan loại trừ timestamp và các đường dẫn scratch riêng theo host. Các đích cục bộ theo máy được validate riêng.

`ap diff` và dry-run sử dụng plan này. Đây là các tích hợp CLI dự kiến, không phải tuyên bố về các command đã được triển khai. Trạng thái đã hội tụ (converged) không tạo ra thay đổi nào.

### 5.3 Apply

Apply chỉ thực thi một plan đã được validate với scope và input fingerprint khớp nhau. Lấy một project/target lock, kiểm tra lại trạng thái bị ảnh hưởng và từ chối các plan đã lỗi thời (stale) trước khi thay đổi. Các đăng ký runtime dùng chung còn yêu cầu thêm tuần tự hóa hoặc phát hiện xung đột ở scope dùng chung của chúng.

Ứng dụng phải đáp ứng các kết quả review/prompt của Policy trước khi các thao tác bị ảnh hưởng chạy. Adapter không thể tự tạo ra sự phê duyệt. Thực thi không tương tác sẽ thất bại khi thiếu ủy quyền bắt buộc.

Dùng mảng đối số (argument array) cho subprocess, không dùng chuỗi shell được xây dựng từ metadata không đáng tin cậy. Giới hạn timeout, cancellation, output và số lần thử lại.

## 6. Cài đặt Package so với kích hoạt Component

Tập Component được quản lý đang hoạt động MUST bằng implementation closure được chọn, bao gồm cả các dependency được resolve tường minh. Việc tải xuống một Package không cho phép kích hoạt mọi Component mà nó chứa.

```text
Package A: TDD, debugging, planning
Package B: TDD

Selected:   A/debugging + A/planning + B/TDD
Suppressed: A/TDD
```

Dùng cơ chế lọc Component native hoặc một projection được sinh ra đã xác minh chỉ chứa closure được cho phép. Nếu không thể làm cả hai, hãy thất bại với `COMPONENT_ACTIVATION_UNSUPPORTED`.

Một lần cài đặt native đầy đủ chỉ hợp lệ khi toàn bộ bề mặt được kích hoạt tự động của nó nằm trong closure đã validate và được Policy cho phép. Các hook và server ẩn cũng được tính là kích hoạt, ngay cả khi skill được chọn không bao giờ gọi chúng một cách tường minh.

Projection là một artifact được dẫn xuất. Giữ nguyên các tài nguyên bắt buộc, liên kết dependency, các thông báo áp dụng và metadata hành vi. Việc viết lại namespace/đường dẫn yêu cầu các phép biến đổi được định nghĩa và độ bao phủ bằng fixture. Viết lại instruction tùy ý, làm phẳng prompt hoặc chuyển một agent thành skill không phải là sự thích ứng minh bạch.

Tài nguyên hỗ trợ không cần trở thành các implementation ngữ nghĩa độc lập, nhưng tài nguyên có thể thực thi vẫn cần được kiểm tra và đánh giá bởi Policy.

Báo cáo các plugin thủ công chồng lấn dưới dạng chồng lấn unmanaged. Không gỡ bỏ chúng hoặc tuyên bố độc quyền trên toàn bộ runtime. Tính độc quyền áp dụng cho managed state; sự chồng lấn ngăn cản một đảm bảo bắt buộc sẽ chặn apply.

## 7. Mapping Claude Code V1

Nền tảng tích hợp native sử dụng các plugin artifact. Manifest nằm tại `.claude-plugin/plugin.json`; nội dung nằm ngoài thư mục metadata đó. Các layout bao gồm `skills/<name>/SKILL.md`, `agents/`, `commands/`, `hooks/hooks.json` và `.mcp.json`. Cài đặt native chấp nhận định danh có định danh marketplace và scope tường minh. Xem [tài liệu tham khảo plugin của Claude Code](https://code.claude.com/docs/en/plugins-reference).

Một marketplace cục bộ có thể tham chiếu các plugin source bằng đường dẫn tương đối thông qua `.claude-plugin/marketplace.json`. Các registry được sinh ra là artifact phân phối, không phải một Catalog thứ hai. Xem [tài liệu marketplace của Claude Code](https://code.claude.com/docs/en/plugin-marketplaces).

Sau đây là các yêu cầu `agent-plugins` được đề xuất, không phải tuyên bố về các công tắc (toggle) native theo từng Component:

| Input chuẩn | Output hoặc quyết định của adapter |
|---|---|
| Skill được chọn | Giữ nguyên thư mục, entrypoint và các tài nguyên bắt buộc |
| Agent được chọn | Giữ nguyên metadata và instruction agent được hỗ trợ |
| Command được chọn | Giữ nguyên entrypoint và ngữ nghĩa gọi (invocation) được hỗ trợ |
| Hook được chọn | Chỉ bao gồm các mục và tài nguyên được chọn đã validate |
| Định nghĩa MCP được chọn | Bao gồm cấu hình server đã validate với các tham chiếu secret |
| Rule/instruction chưa có mapping plugin được chứng minh | Từ chối trừ khi tồn tại một mapping được kiểm thử riêng |
| Tính năng native chưa biết hoặc trong tương lai | Unsupported cho đến khi được triển khai và kiểm thử tường minh |

Hỗ trợ của runtime không hàm ý hỗ trợ của adapter. Mọi mapping được quảng bá đều yêu cầu fixture cho phạm vi runtime đã khai báo. Hook và server yêu cầu đánh giá Policy trước khi cài đặt/kích hoạt. Discovery và dry-run không bao giờ khởi chạy chúng.

### 7.1 Chiến lược materialization

Chiến lược V1 được đề xuất sử dụng một marketplace cục bộ được sinh ra chứa các plugin artifact bất biến, được định địa chỉ theo nội dung (content-addressed). Mỗi projection của Package chứa closure được chọn của nó. Một runtime bridge đã được kiểm thử theo phiên bản thực hiện cài đặt native; adapter không chỉnh sửa các cơ sở dữ liệu cache runtime không được tài liệu hóa.

1. Đọc các snapshot đã khóa được xác minh và closure được chọn.
2. Render vào vùng staging và validate toàn bộ bề mặt kích hoạt.
3. Gán các tên runtime logic ổn định từ định danh Package chuẩn, với cơ chế phát hiện xung đột deterministic.
4. Sinh marketplace và các plugin source bất biến dưới một thư mục gốc thuộc sở hữu của ứng dụng.
5. Đăng ký/cài đặt thông qua giao diện native đã kiểm thử với scope project tường minh.
6. Xác minh đăng ký, trạng thái bật và bằng chứng nội dung đã cài đặt.
7. Commit receipt thành công thông qua sync coordinator.

Theo dõi thế hệ nội dung (content generation) tách biệt với tên logic ổn định để các bản cập nhật không âm thầm đổi tên các lời gọi. Các byte đã cài đặt MUST khớp với artifact đã lập kế hoạch ngay cả khi một phiên bản cũ hơn đã được cache. Việc làm mới (refresh) không được thay thế bằng nội dung chưa khóa. Nếu giao diện native không thể thiết lập bất biến này, phiên bản/chế độ runtime đó là unsupported.

Bridge phải tài liệu hóa và kiểm thử chính xác các lời gọi registration/install/update/remove, phạm vi runtime được hỗ trợ, tác động của scope và bằng chứng inspection trước khi phát hành. Chỉ một marketplace được render là chưa đáp ứng cổng chấp nhận (acceptance gate) này.

### 7.2 Tên và tham chiếu

Các ID chuẩn giữ nguyên trong trạng thái Catalog và Lock. Ghi lại tên runtime riêng trong receipt cùng với các ID Package/Component gốc.

Việc đổi tên một plugin có thể ảnh hưởng tới command, tham chiếu agent, tham chiếu server và các đường dẫn tài nguyên nhúng. Giữ nguyên tên khi có thể. Nếu việc xử lý xung đột đòi hỏi đổi tên, hãy validate tất cả tham chiếu bị ảnh hưởng hoặc thất bại. Không âm thầm thêm hậu tố rồi giả định hành vi tương đương.

### 7.3 Bundle và Preset

Các bundle cộng đồng có thể cung cấp thông tin cho việc tuyển chọn. Chúng không được giả định là các API cài đặt native. Ở đây, Preset kết hợp các Capability, và Resolver xác định Component và Package. Adapter nhận các lựa chọn đã khóa thay vì thực thi các giá trị `installCommand` tự do của bundle.

Không giả định tồn tại command native `/plugin bundle`. Đăng ký marketplace, khả năng sẵn có của package, cài đặt, bật và nạp runtime vẫn là các bước riêng biệt.

## 8. Quyền sở hữu managed state

Receipt cục bộ được đề xuất là `.agent-plugins/state/<target>.json` bên dưới consumer project. Đây là trạng thái cục bộ theo máy được dẫn xuất, không phải là thứ thay thế cho `agent-plugins.lock`, và không nên được commit như trạng thái mong muốn có tính di động.

Receipt ghi lại phiên bản schema, định danh owner/project, target/scope, digest của Project Lock đã áp dụng, phiên bản adapter, các đăng ký runtime, artifact chính xác, các file/khóa cấu hình được sở hữu kèm giá trị hoặc digest được áp dụng lần cuối, mapping từ canonical sang runtime, định danh transaction và kết quả xác minh.

Với cấu hình dùng chung, hãy dùng phép so sánh ba chiều: giá trị managed trước đó, giá trị quan sát hiện tại và giá trị mong muốn. Giữ nguyên các khóa không liên quan. Các thay đổi của người dùng đối với giá trị đã được quản lý trước đó tạo ra diagnostic về drift thay vì bị ghi đè âm thầm.

Việc thiếu receipt cho phép tái dựng chỉ đọc từ lock và metadata artifact có thể xác minh; nó không cho phép xóa nội dung có tên tương tự. Khôi phục hoặc tiếp nhận (adoption) tường minh phải xác lập quyền sở hữu. Các tuyên bố trong receipt phải được đối chiếu với đích/nội dung thực tế trước khi thay đổi.

Việc gỡ bỏ chỉ ảnh hưởng tới các đăng ký, khóa cấu hình được sở hữu và các artifact được sinh ra đã xác minh. Không bao giờ gỡ bỏ repository upstream, skill do người dùng tạo hoặc cache dùng chung toàn cục như một tác dụng phụ của việc gỡ cài đặt. Thu gom rác (garbage collection) cache là một thao tác riêng dựa trên khả năng tiếp cận (reachability).

Credential MUST NOT đi vào các artifact di động, receipt, log hoặc lockfile. Resolve các tham chiếu secret tại ranh giới runtime phù hợp.

## 9. Transaction và khôi phục

Các thao tác ghi filesystem và các command runtime native không tạo thành một transaction nguyên tử (atomic) duy nhất. Sync coordinator MUST sử dụng các bản ghi khôi phục bền vững (durable) và không được hứa hẹn rollback nguyên tử ở nơi nó không thể cung cấp.

```text
validate inputs and authorization
  -> acquire lock and recheck observations
  -> stage immutable artifacts
  -> persist pending journal and prior-state evidence
  -> execute ordered runtime changes
  -> verify required managed state
  -> atomically replace Project Lock, if changed
  -> atomically replace receipt
  -> mark journal complete
```

Bản ghi journal bao gồm digest của lock cũ/đề xuất, owned state bị ảnh hưởng, các thao tác đã hoàn thành và các yêu cầu khôi phục. Journal, receipt và artifact được sinh ra nằm bên dưới các thư mục gốc được sở hữu đã validate; kiểm tra lại đường dẫn để chống thoát ra qua symlink/reparse-point trước khi thay đổi.

Trước khi thay thế lock, lỗi sẽ giữ nguyên Project Lock trước đó. Chỉ thử bù trừ (compensation) cho các thao tác được sở hữu có trạng thái quan sát vẫn khớp với tác động dự kiến. Nếu rollback chưa hoàn tất, giữ lại journal, báo cáo lỗi một phần và chặn các lần sync không liên quan cho đến khi khôi phục.

Một sự gián đoạn sau khi thay thế lock nhưng trước khi hoàn tất receipt có thể được phân biệt thông qua pending journal. Quá trình khôi phục kiểm tra lại các tác động và chỉ hoàn tất receipt cho trạng thái mong muốn đã xác minh; nếu không, báo cáo/sửa chữa quá trình chuyển đổi chưa hoàn tất. Chỉ riêng lock digest không phải là bằng chứng runtime thành công.

Timeout nghĩa là kết quả không xác định, không phải bằng chứng rằng thao tác không làm gì cả. Kiểm tra lại trước khi thử lại. Cancellation đi theo cùng lộ trình khôi phục như lỗi.

Không xác minh được trạng thái bắt buộc là lỗi. Các phần bỏ qua tùy chọn được Resolver phê duyệt vẫn hiển thị dưới dạng Resolution suy giảm (degraded); apply không thể bỏ qua thêm các Component đã được chọn. Báo cáo riêng các yêu cầu reload/restart và không bao giờ tuyên bố một session hiện có đã reload khi không có bằng chứng.

## 10. Diagnostics

Mọi diagnostic bao gồm mã ổn định, mức độ nghiêm trọng (severity), giai đoạn (stage), adapter, định danh source/target, Package/Component bị ảnh hưởng, lý do và hành động tiếp theo. Bao gồm provenance của dependency và che giấu (redact) output nhạy cảm của subprocess.

| Mã | Ý nghĩa |
|---|---|
| `ADAPTER_CONTRACT_UNSUPPORTED` | Không thể diễn giải contract của adapter hoặc receipt |
| `SOURCE_REF_UNAVAILABLE` | Không thể thu thập đúng source |
| `SOURCE_INTEGRITY_MISMATCH` | Các byte của source khác với integrity đã ghi lại |
| `SOURCE_DISCOVERY_INCOMPLETE` | Inventory không có thẩm quyền |
| `SOURCE_PATH_UNSAFE` | Thoát đường dẫn hoặc link không được hỗ trợ |
| `COMPONENT_ID_COLLISION` | Định danh đã chuẩn hóa bị trùng lặp |
| `TARGET_RUNTIME_UNSUPPORTED` | Runtime nằm ngoài phạm vi hỗ trợ đã kiểm thử |
| `COMPONENT_ACTIVATION_UNSUPPORTED` | Không thể kích hoạt đúng closure được chọn |
| `TARGET_NAMESPACE_COLLISION` | Tên runtime hoặc đường dẫn bị xung đột |
| `UNMANAGED_STATE_CONFLICT` | Thay đổi được đề xuất xung đột với trạng thái do người dùng sở hữu |
| `MANAGED_STATE_DRIFT` | Nội dung managed khác với bằng chứng được áp dụng lần cuối |
| `PLAN_STALE` | Input hoặc actual state bị ảnh hưởng đã thay đổi |
| `TARGET_VERIFICATION_FAILED` | Không thể xác lập trạng thái cài đặt bắt buộc |
| `APPLY_PARTIAL_FAILURE` | Một số thao tác đã có hiệu lực trước khi lỗi |
| `RECOVERY_REQUIRED` | Transaction đang chờ cần được đối soát (reconciliation) |

Tái sử dụng các diagnostic hiện có của Catalog, Resolver, Lockfile và Policy cho các lỗi thuộc về chúng. Không ngụy trang một sự từ chối của Policy thành một định dạng không được hỗ trợ.

## 11. Hợp đồng chấp nhận và kiểm thử

Sử dụng các source fixture được thu thập và các golden target artifact cho kiểm thử deterministic. Tách riêng các kiểm thử tương thích runtime thực tế; chỉ riêng việc fixture thành công không chứng minh rằng cài đặt hoạt động.

| Kịch bản | Kết quả bắt buộc |
|---|---|
| Cùng input với danh sách thư mục bị sắp xếp lại | Cùng inventory và digest |
| Nhánh có thể thay đổi di chuyển trong quá trình tái tạo theo lock | Commit đã khóa hoặc thất bại tường minh |
| Source sai định dạng, ID trùng lặp, thoát đường dẫn | Không có inventory một phần có thẩm quyền |
| Skill chứa tham chiếu và script | Tài nguyên bắt buộc được giữ nguyên mà không thực thi |
| Package có skill được chọn và skill bị loại bỏ | Chỉ dependency closure được chọn hoạt động |
| Hook/server không được chọn trong Package | Được loại trừ an toàn hoặc materialization bị từ chối |
| Metadata được chọn không thể biểu diễn | Lỗi tương thích; không chuyển đổi âm thầm |
| Việc viết lại namespace ảnh hưởng tới tham chiếu chéo | Viết lại đã xác minh hoặc thất bại tường minh |
| Plan/diff/dry-run | Không thay đổi runtime/config/lock hoặc thực thi upstream |
| Lần sync thứ hai trên trạng thái đã hội tụ | Không có thao tác thay đổi nào |
| Plugin thủ công/cấu hình không liên quan | Được giữ nguyên; chồng lấn được hiển thị |
| Nội dung managed thay đổi sau khi lập kế hoạch | Lỗi stale-plan/drift trước khi ghi đè |
| Cài đặt bị timeout sau khi đã có hiệu lực | Inspection trước khi thử lại |
| Gián đoạn tại ranh giới journal/lock/receipt | Trạng thái có thể khôi phục; không báo thành công sai |
| Native cache chứa projection cũ | Cập nhật được chứng minh tới các byte mong muốn hoặc thất bại |
| Phiên bản không được hỗ trợ/thiếu điều kiện tiên quyết | Lỗi có thể hành động trước khi thay đổi |
| Cấu hình chứa secret | Không rò rỉ vào artifact di động hoặc diagnostics |

V1 chỉ hoàn thành khi một project đã khóa có thể được materialize trên phạm vi phiên bản Claude Code đã khai báo, việc kích hoạt chính xác các Component được quản lý đã được xác minh, unmanaged state được giữ nguyên, sync lặp lại hội tụ, và việc khôi phục sau gián đoạn đã được thực hiện thử. Các target trong tương lai phải đáp ứng cùng các hợp đồng trước khi được quảng bá.
