# ADR 0014 — `apiVersion` chốt ở `agent-plugins.dev/v1alpha1`

- **Trạng thái:** Accepted
- **Ngày:** 2026-09-22
- **Liên quan:** [`manifest-spec.md`](../../03-specs/manifest-spec.md) §5, §112, §114, [`catalog-spec.md`](../../03-specs/catalog-spec.md) §5, [`release-process.md`](../../05-development/release-process.md) §16, §86, §156, [ADR 0011](0011-publisher-terminology.md)
- **Đóng lại:** câu hỏi treo cuối cùng của ADR 0011

## Bối cảnh

`common.schema.json` chấp nhận hai giá trị `apiVersion` và tự ghi rằng chuyện này là tạm:

> *"`agent-plugins.dev/v1alpha1` is the value every spec document uses; `agent-plugins/v1` is what the CLI currently emits and every catalog file carries. Both are accepted until the divergence is settled by ADR; `ap validate --strict` reports the legacy value."*

Đo lại thì phân bố hoàn toàn một chiều:

| Chuỗi | Số dòng | Xuất hiện ở đâu |
|---|---|---|
| `agent-plugins.dev/v1alpha1` | 126 | **chỉ tài liệu** (+ mô tả schema, README) |
| `agent-plugins/v1` | 30 | **toàn bộ dữ liệu trên đĩa và code**: 11 tệp catalog/preset/role/policy, 14 fixture, `common.schema.json`, `sync.js:107` |

Hai tập không giao nhau ở bất kỳ tệp dữ liệu nào.

### Điểm mấu chốt: `v1` là tên dành cho đích đến

`manifest-spec.md:2325-2338` §112 định nghĩa vòng đời:

```text
v1alpha1 → v1beta1 → v1
```

kèm *"Alpha versions may change."* và *"Stable versions should use migration strategy for breaking changes."* Trong bảng đó, **`v1` là cột mốc ổn định tương lai**, không phải giá trị hiện tại. `manifest-spec.md` không nhắc `agent-plugins/v1` ở bất kỳ đâu.

`release-process.md:2850` gọi tên chính xác tình trạng này:

> *"Experimental features SHOULD NOT silently become stable."*

Và `release-process.md:1617-1645` §86 đặt "manifest schema stable" làm điều kiện cổng V1.0 — điều kiện chưa đạt. CLI đang phát ra cái tên hứa hẹn sự ổn định mà dự án chưa hề cam kết.

### Hai phát biểu sai trong repo

`common.schema.json:7` và `packages/cli/README.md:193` đều nói `--strict` báo giá trị legacy. **Không có dòng code nào xử lý `apiVersion`.** `--strict` chỉ nâng warning sẵn có thành error (`commands/validate.js:58-59`), và `lib/validate.js` phát ra đúng ba mã warning, không mã nào liên quan version. Một manifest mang giá trị nào trong hai giá trị cũng validate giống hệt nhau, kể cả dưới `--strict`.

`UNSUPPORTED_API_VERSION` được đặc tả ở `manifest-spec.md:2364-2383` §114 — *"it must fail clearly"*, *"Do not attempt best-effort parsing"* — và không tồn tại trong `packages/`.

## Quyết định

### D1. Giá trị duy nhất là `agent-plugins.dev/v1alpha1`

- Enum trong `common.schema.json` thu về một giá trị. `agent-plugins/v1` bị loại.
- Mọi tệp dữ liệu đã ship và mọi fixture đổi sang `agent-plugins.dev/v1alpha1`.
- `sync.js:107` phát ra giá trị mới khi ghi lockfile.

Chọn theo bảng vòng đời của chính dự án thay vì ghi đè nó. Dạng có domain (`agent-plugins.dev/`) cũng theo đúng quy ước Kubernetes mà toàn bộ hình dạng manifest đang mô phỏng (`apps/v1`, `networking.k8s.io/v1`).

### D2. Không cần migration

Theo đúng tiền lệ [ADR 0011](0011-publisher-terminology.md): `ap` chưa có trên máy người dùng nào. Một catalog mang giá trị cũ sẽ fail bằng một chẩn đoán rõ ràng (D3), không được dịch ngầm.

Đây là lý do việc này phải làm **bây giờ**. Sau khi có người dùng đầu tiên, nó trở thành breaking change kèm migration theo `release-process.md:342-352` §16.

### D3. `UNSUPPORTED_API_VERSION` được hiện thực

Một `apiVersion` không nhận diện được sinh mã `UNSUPPORTED_API_VERSION` thay vì `INVALID_MANIFEST` chung chung, theo `manifest-spec.md:2364-2383`.

- Với sáu kind của catalog: lỗi `enum` tại `/apiVersion` được map sang mã này.
- Với manifest dự án (`agent-plugins.yaml`), vốn **không có schema nào cả** — `catalog.js` chỉ kiểm `kind === 'Project'` — `loadManifest` kiểm tra tường minh.

### D4. Hai phát biểu sai bị xoá

Mô tả trong `common.schema.json` và `packages/cli/README.md:193` không còn hứa một cơ chế không tồn tại. README cũng đang trích `sync.js:73` trong khi dòng thật là `:107`.

## Còn treo

`versioning-spec.md` vẫn chưa được viết (`todo.md:117`, `roadmap.md:2619` xếp #8 trong "Immediate Next Documents"), và `todo.md:245-249` còn hai mục P0 chưa tick: *"Define schema versioning convention"* và *"Define compatibility strategy"*. ADR này chốt **giá trị hiện tại**, không chốt luật chuyển version. Bước `v1alpha1 → v1beta1` cần tài liệu đó trước.

Manifest dự án vẫn không có `project.schema.json`; ngoài `kind` và `apiVersion` nó hoàn toàn không được validate. Đó là một khoảng trống riêng.

## Hệ quả

**Tích cực**
- Một giá trị duy nhất, trùng khớp giữa tài liệu, schema và dữ liệu.
- Không còn cái tên `v1` hứa hẹn ổn định trước cổng V1.0.
- `UNSUPPORTED_API_VERSION` tồn tại thật, và phần mô tả schema không còn mô tả thứ không có.

**Tiêu cực / chấp nhận**
- Chuỗi dài hơn trong mọi tệp YAML.
- Đổi 25+ tệp dữ liệu. Cơ học, và rẻ nhất ở thời điểm này.
- Đến cổng V1.0 sẽ phải đổi lần nữa sang `v1`. Đó là điều bảng vòng đời vốn đã dự liệu, không phải chi phí phát sinh.

**Tài liệu cần cập nhật theo ADR này**
- `catalog-spec.md` §5 và `manifest-spec.md` §5 đã dùng `v1alpha1`, nên không đổi. Bất kỳ ví dụ nào còn `agent-plugins/v1` thì sửa.
- `packages/cli/README.md`: bỏ đoạn nói `--strict` cờ giá trị legacy.

## Các phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Chốt `agent-plugins/v1`, sửa 126 dòng tài liệu | Mâu thuẫn với bảng vòng đời của chính dự án, và vi phạm `release-process.md:2850`: nhận cái tên ổn định trước khi đạt cổng ổn định |
| Giữ cả hai, hiện thực cảnh báo `--strict` như mô tả đã hứa | Hai cách viết cho một thứ là nợ vĩnh viễn. Mô tả hứa sai thì sửa bằng cách bỏ sự chia rẽ, không phải bằng cách hợp thức hoá nó |
| Bỏ `apiVersion` khỏi manifest | `catalog-spec.md:220` yêu cầu mọi manifest khai báo version schema, và `§101` Forward Compatibility dựa vào nó để consumer biết validate theo luật nào |
