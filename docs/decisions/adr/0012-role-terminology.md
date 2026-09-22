# ADR 0012 — `Profile` đổi tên thành `Role`

- **Trạng thái:** Accepted
- **Ngày:** 2026-09-22
- **Liên quan:** [`terminology.md`](../../01-domain/terminology.md) §10, [`domain-model.md`](../../01-domain/domain-model.md) §15, [`manifest-spec.md`](../../03-specs/manifest-spec.md), [ADR 0011](0011-publisher-terminology.md)

## Bối cảnh

Entity mô tả **bộ Capability nền cho một vai trò làm việc** đang mang tên `Profile`.

Định nghĩa của chính nó đã dùng từ "role" để giải thích:

```text
terminology.md §10   A Profile is a reusable role or working context composed from Presets.
domain-model.md §15  A Profile represents a reusable role or working context.
terminology.md §83   Use ... Preset for composition, Profile for role, Project for repository needs ...
```

Khi một tài liệu phải nói "X nghĩa là Y" ở ba chỗ khác nhau, tên đúng là Y. Từ "role" xuất hiện khoảng 130 lần trong `docs/` với đúng nghĩa đó, còn `Profile` chỉ là lớp vỏ.

Thêm vào đó, "profile" đã quá tải trong ngành và mọi nghĩa phổ biến đều **không** phải nghĩa ở đây:

| Nghĩa phổ biến | Ví dụ |
|---|---|
| tập cấu hình/credential có tên | AWS profile, shell profile, Maven profile |
| hồ sơ người dùng | user profile |
| đo hiệu năng | CPU profile, profiler |

Nghĩa "tập credential có tên" đặc biệt nguy hiểm vì nó đủ gần để gây hiểu nhầm trong một công cụ có `agent-plugins.yaml`, `policies/` và lockfile.

Đây là đợt đổi tên thứ hai trong cùng nhịp với [ADR 0011](0011-publisher-terminology.md), theo cùng một phép thử: đọc một dòng manifest lên, người đọc có đoán đúng nghĩa không?

```yaml
spec:
  profile: software-engineer   # tập credential? hồ sơ? cấu hình build?
  role: software-engineer      # vai trò làm việc
```

## Quyết định

### D1. Entity đổi tên thành `Role`
- `kind: Profile` → `kind: Role`; thư mục `profiles/` → `roles/`.
- `packages/schemas/schemas/profile.schema.json` → `role.schema.json`, `$id` và `title` đổi theo.
- Trường manifest `spec.profile` → `spec.role`.
- Mã chẩn đoán `UNKNOWN_PROFILE` → `UNKNOWN_ROLE`.
- `KINDS` trong `packages/schemas/index.js` và `SOURCES` trong `packages/cli/src/lib/catalog.js` đổi theo.

### D2. Ngữ nghĩa không đổi
`Role` giữ nguyên mọi thứ `Profile` đã có: nó là một baseline tái sử dụng được, **chỉ** vươn tới Capability thông qua Preset, và không bao giờ tự chọn implementation. Đây thuần tuý là đổi tên.

### D3. Từ "role" trong văn xuôi giờ khớp với tên entity
Trước đây `docs/` dùng "role" làm cách giải thích `Profile`. Sau ADR này, hai thứ trùng nhau, nên các câu định nghĩa được viết gọn lại thay vì lặp (`"A Role is a reusable role"`).

Ở những chỗ "role" mang nghĩa đời thường chứ không phải entity — ví dụ "the role of the resolver" — ngữ cảnh đã đủ phân biệt, không cần từ khác.

## Hệ quả

**Tích cực**
- `role: software-engineer` đọc lên đúng nghĩa ngay, không cần tra tài liệu.
- Bỏ được vòng định nghĩa `Profile → role → Profile` ở ba tài liệu.
- Tránh va chạm với nghĩa "named credential/config set" của "profile".

**Tiêu cực / chấp nhận**
- Đợt đổi tên thứ hai liên tiếp. Chấp nhận vì cả hai cùng diễn ra trước V1 và trước khi có người dùng nào; để dành sang sau sẽ đắt hơn nhiều.
- `manifest-spec.md` là tài liệu chịu ảnh hưởng nặng nhất (89 lần nhắc), vì `spec.profile` là trường ở mức manifest.
- Commit trước `a43af9a` dùng thuật ngữ cũ.

**Tài liệu cần cập nhật theo ADR này**
- `manifest-spec.md`: `spec.profile` → `spec.role`.
- `terminology.md` §10, §83; `domain-model.md` §15; `capability-model.md`; `cli-spec.md`; `architecture.md`; `repository-structure.md`; `source-of-truth.md`; `resolution-spec.md`; `lockfile-spec.md`; `use-cases.md`; `requirements.md`; `goals.md`; `non-goals.md`; `trust-model.md`; `testing-strategy.md`; `roadmap.md`; `todo.md` — kèm bản `.vi/`.
- Tài liệu đã archive (`cli-spec-v0.1.md`, `cheatsheet.md`) giữ nguyên làm lịch sử.

## Các phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Giữ `Profile` | Định nghĩa của nó phải mượn từ "role" ở ba chỗ; và "profile" mang sẵn ba nghĩa phổ biến khác, trong đó "named credential set" đủ gần để gây hiểu nhầm |
| `Persona` | Gợi ý tính cách/giọng điệu của agent, không phải tập Capability nền. Sẽ mời gọi người ta nhét prompt và tone vào entity này |
| `Preset` mở rộng, bỏ hẳn entity | Preset là khối composition không biết tới người dùng; `domain-model.md` §15 ghi rõ preset không đại diện cho một người hay một vai trò. Gộp lại sẽ mất một tầng có thật |
