# ADR 0011 — `Provider` đổi tên thành `Publisher`, khai tử từ "provider"

- **Trạng thái:** Accepted
- **Ngày:** 2026-09-22
- **Liên quan:** [`catalog-spec.md`](../../03-specs/catalog-spec.md) §13–24, [`terminology.md`](../../01-domain/terminology.md) §2, [`domain-model.md`](../../01-domain/domain-model.md) §3, [ADR 0010](0010-claude-code-materialization.md) D7
- **Supersedes:** `catalog-spec.md` §13–17 (Provider Manifest, Provider Ownership, Provider Trust Baseline, Provider Source), §18 (Provider Discovery)

## Bối cảnh

Entity cấp cao mô tả **ai xuất bản nội dung** đang mang tên `Provider` (`catalog/providers/mattpocock.yaml`, `kind: Provider`).

Trong gần như mọi hệ sinh thái phần mềm, "provider" nghĩa là **backend/driver**: Terraform provider, OAuth provider, cloud provider. Dùng nó cho *nhà xuất bản* làm thuật ngữ trượt một phép thử đơn giản — đọc `provider: superpowers`, người đọc không biết "provider" đang chỉ cái gì:

```text
provider = Superpowers?       (nhà xuất bản)
provider = GitHub?            (nơi lưu trữ)
provider = git?               (giao thức truy cập)
provider = local filesystem?  (cách truy cập khác)
```

Đây là lần thứ tư khái niệm này được đặt tên trong repo:

| Thế hệ | Tên entity | Trạng thái |
|---|---|---|
| 1 | `VendorSource` + `RegistryIndex`, ref theo đường dẫn, chưa có Capability | Đã xóa tại `a42711e` (`git show a42711e^:docs/specs.md`) |
| 2 | `Source`, `catalog/sources/`, lệnh `ap source add` | Còn trên đĩa nhưng đã gắn nhãn Archived: `cli-spec-v0.1.md`, `cheatsheet.md` |
| 3 | `Provider`, `catalog/providers/` | Hiện tại — ADR này thay thế |
| 4 | `Publisher`, `catalog/publishers/` | ADR này |

Một đề xuất được cân nhắc là quay lại `Source` làm tên entity, đồng thời **định nghĩa lại** `provider` thành backend truy cập (`github`, `git`, `local`), với `catalog/providers/github.yaml`. Đề xuất đó được chấp nhận một phần.

Thời điểm thuận lợi: 12 commit, một entry catalog thật, chưa V1.

## Quyết định

### D1. Entity đổi tên thành `Publisher`
- `kind: Provider` → `kind: Publisher`; `catalog/providers/` → `catalog/publishers/`.
- `Package.spec.provider` → `Package.spec.publisher`.
- `common.schema.json` `providerId` → `publisherId`.
- Mã chẩn đoán: `UNKNOWN_PROVIDER` → `UNKNOWN_PUBLISHER`, `UNUSED_PROVIDER` → `UNUSED_PUBLISHER`.

`Publisher` được chọn vì nó không va chạm với bất kỳ nghĩa nào đang sống trong repo, và vì nó nói đúng điều cần nói: bên xuất bản nội dung.

### D2. Từ "provider" bị khai tử, không được định nghĩa lại
Định nghĩa lại chính từ vừa bị tuyên bố là mơ hồ sẽ để lại một thuật ngữ mà người đọc phải tra xem nó được viết ở thời kỳ nào — trong ADR, trong commit message, và trong mọi bản dịch `.vi/`. Chi phí khảo cổ đó là vĩnh viễn.

Vì vậy từ "provider" không xuất hiện ở bất kỳ nghĩa nào trong dự án. Tài liệu đã archive (`cli-spec-v0.1.md`, `cheatsheet.md`) được giữ nguyên làm lịch sử.

### D3. `Source` không được chọn làm tên entity
Từ "source" đã mang ba nghĩa đang sống:

| Nơi dùng | Nghĩa |
|---|---|
| `Package.spec.source` | toạ độ fetch: `{type, url, ref}` |
| "Source Adapter" (`terminology.md` §28) | thành phần discovery upstream, đối xứng "Target Adapter" |
| `source-of-truth.md` | nguồn sự thật của kiến trúc |

Đặt entity tên `Source` sẽ thêm nghĩa thứ tư, và làm `src/adapters/source/github/` trở thành một *provider adapter mang tên source* — đúng kiểu mơ hồ mà ADR này tồn tại để diệt. Chọn `Publisher` giữ nguyên cả ba nghĩa trên; đặc biệt cặp "Source Adapter" / "Target Adapter" không phải đụng tới.

### D4. Cách truy cập là một enum, không phải entity
`Package.spec.source.type` đã mã hoá "truy cập bằng cách nào" từ trước (`git`; về sau có thể thêm `local`, `http`). Nâng nó thành entity cấp cao với file yaml riêng (`catalog/providers/github.yaml`) là thêm một tầng chưa có consumer nào đọc.

- Không tạo `catalog/providers/`, không tạo entity nào cho backend truy cập.
- Implementation của từng backend nằm trong code (`packages/cli/src/lib/source.js` hôm nay; `packages/cli/src/adapters/fetch/` khi có backend thứ hai).
- `Package.spec.source` **không đổi** — nó đã đúng và đã ghim SHA.

### D5. Toạ độ fetch ở lại trên Package, không lên Publisher
Đề xuất đặt `repository` + `ref` ngay trên entity xuất bản bị bác bỏ:

- **Một Publisher ship từ nhiều repo.** Anthropic xuất bản nhiều hệ sinh thái. Một khối `repository:` cho mỗi entity buộc phải tách một entity cho mỗi repo, và lúc đó entity đã tụt xuống thành *toạ độ fetch* — tức trùng khít `Package.spec.source`, phá đúng cái phân biệt mà đổi tên này tạo ra. Đó cũng là cách thế hệ 2 sập.
- **Trust phải ổn định.** `trust`/`ownership` gắn với bên xuất bản, không gắn với URL. `catalog-spec.md:463` đã ghi: *"Ownership must not be inferred solely from source location."* URL đổi được bất cứ lúc nào; danh tính thì không.
- **ADR 0010 D7 đã chốt chuyện ghim.** Pin theo commit SHA, và `source: "github"` đã được đo và loại vì clone qua SSH fail. `security-model.md:831-835` cấm `main`/`latest`/`HEAD`. Kéo pin lên tầng Publisher sẽ mở lại cả hai vấn đề đó.

### D6. `Publisher.spec` chỉ chứa danh tính và trust
Schema hiện tại: `homepage`, `repository` (chỉ là link tham khảo), `trust`. Không field nào bắt buộc, vì chưa field nào được resolver đọc — giữ đúng nguyên tắc "schema chỉ khai báo cái thật sự được đọc".

- `spec.ownership` (`first-party` / `third-party`) **chưa** vào schema, cho tới khi có một policy gate thật sự đọc nó. `ownership` và `trust` là hai khái niệm khác nhau (`domain-model.md` §3) và sẽ được thêm cùng lúc với gate tiêu thụ chúng.
- `spec.source` và `spec.discovery` **không phải** field của Publisher (D5). `catalog-spec.md` §13–18 mô tả chúng là bắt buộc — phần đó bị ADR này thay thế.
- `spec.repository` là link tham khảo, không định nghĩa danh tính fetch, đúng tinh thần `catalog-spec.md:553`.

## Hệ quả

**Tích cực**
- `publisher: mattpocock` và `source.type: git` đọc lên là hai câu khác nhau, không còn chồng nghĩa.
- Từ "provider" biến mất, nên không có thuật ngữ nào phụ thuộc thời kỳ viết.
- Cặp "Source Adapter" / "Target Adapter" giữ nguyên.
- Giữ nguyên ADR 0010 D7 và `security-model.md:831-835`.

**Tiêu cực / chấp nhận**
- Khoảng 1000 lần xuất hiện của "provider" trong `docs/`, một nửa nằm ở các bản `.vi/`. Việc quét là cơ học nhưng lớn.
- Commit trước `501a3bf` dùng thuật ngữ cũ. Bảng thế hệ ở trên là bản đồ tra cứu cho người đọc lịch sử.
- `ap` chưa có mặt trên máy người dùng nào nên không cần migration; khi đã có, một catalog mang `kind: Provider` sẽ fail bằng lỗi schema chứ không được tự động dịch.

**Tài liệu cần cập nhật theo ADR này**
- `catalog-spec.md` §13–24: viết lại Publisher Manifest theo schema đã ship; bỏ `spec.ownership`, `spec.source`, `spec.discovery`; sửa §24 "Package Source" vốn còn mô tả đường dẫn tương đối so với provider source thay vì `{type, url, ref}` tuyệt đối.
- `terminology.md` §2, §83: viết lại mục thành `Publisher`, kèm ghi chú khai tử từ "provider". Giữ nguyên §28 "Source Adapter".
- `domain-model.md` §3, §75; `capability-model.md`; `policy-spec.md`; `lockfile-spec.md`; `resolution-spec.md`; `architecture.md`; `repository-structure.md`; `source-of-truth.md`; `use-cases.md`; `requirements.md`; `goals.md`; `vision.md`; `problem.md`; `non-goals.md`; `trust-model.md`; `roadmap.md`; `todo.md`; `README.md` — quét cơ học, kèm bản `.vi/`.

**Việc còn treo, không thuộc ADR này**
- `agent-plugins.dev/v1alpha1` vs `agent-plugins/v1`: `common.schema.json` ghi là *"accepted until the divergence is settled by ADR"*. Cần một ADR riêng với migration riêng. **Vẫn treo.**
- ~~`Component` có nên thành entity cấp cao của catalog không~~ — **đã đóng, [ADR 0013](0013-component-discovery-and-typing.md) D4: không.** Mục này trích dẫn sai: `todo.md` §10 **không** đề xuất thư mục `catalog/components/`, nó đề xuất `components` như một index trong bộ nhớ của đối tượng `Catalog`. Thư mục viết tay thì bị `catalog-spec.md:1053` và `:3331` cấm — chỗ sau gọi thẳng là anti-pattern. Cái thật sự còn treo là *định danh* Component, và ADR 0013 D5 xử lý.
- ~~`runtimes/` vs `Target`~~ — **đã đóng, [ADR 0013](0013-component-discovery-and-typing.md) D6: `Target`.** Không phải xung đột thật: `terminology.md:1407-1421` §78 đã định nghĩa Runtime là *"represented through a Target"*. `runtimes/` chỉ tồn tại ở hai dòng trong `cheatsheet.md` đã archive và ở chính dòng này.

## Các phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Giữ `Provider`, chỉ ghi rõ nghĩa trong `terminology.md` | Một định nghĩa trong tài liệu không cứu được một cái tên đi ngược quy ước ngành. Người đọc `provider: superpowers` trong catalog không mở terminology ra tra |
| `Source` làm entity, `provider` thành backend truy cập | Thêm nghĩa thứ tư cho "source", biến "Source Adapter" thành từ mơ hồ, và tái chế đúng cái từ vừa bị loại (D2, D3) |
| `Vendor` | Thế hệ 1 đã dùng (`VendorSource`) và đã bỏ; trong Go/PHP "vendor" là thư mục dependency đã vendored, nên mang sẵn nghĩa khác |
| `Origin` | Trong git, `origin` là tên remote mặc định — va chạm ngay trong domain có git |
| `catalog/providers/{github,git,local}.yaml` cho backend truy cập | Thêm một tầng entity chưa có consumer; `source.type` đã làm đúng việc đó bằng một enum (D4) |
