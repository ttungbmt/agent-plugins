# ADR 0017 — Nới quyết định "V1 không ship MCP" thành có điều kiện, dưới Policy

- **Trạng thái:** Accepted
- **Ngày:** 2026-09-22
- **Liên quan:** [`provisioning-spec.md`](../../03-specs/provisioning-spec.md) §9, §14, [`policy-spec.md`](../../03-specs/policy-spec.md) §50, §64, [`security-model.md`](../../04-security/security-model.md) §1904, `policies/default.yaml`, [ADR 0013](0013-component-discovery-and-typing.md) D3, [ADR 0015](0015-mcp-as-component.md), [ADR 0016](0016-secret-by-reference.md)

## Bối cảnh

`policies/default.yaml` hiện viết:

```yaml
  # Implements the "V1 ships no hooks/MCP" decision, so that
  # security-model.md:1904 ("V1 MUST NOT execute arbitrary package hooks")
  # needs no amendment.
  componentTypes:
    hook: deny
    mcp: deny
```

Quyết định đó đúng vào thời điểm đặt ra: chưa có cơ chế nào để kiểm tra một server trước khi nó chạy, chưa có cách xử lý secret, chưa có cách biết target có đỡ được server hay không. Deny là mặc định an toàn duy nhất khả dĩ.

Ba điều đã thay đổi kể từ đó.

**Thứ nhất, `mcp: deny` chưa bao giờ thực sự chặn gì.** [ADR 0013](0013-component-discovery-and-typing.md) D3 ghi nhận: trước ADR đó, `source.js:112-132` gán cứng `type: 'skill'` cho mọi Component được discover, nên mọi luật `componentTypes` ngoài `skill` đều không chạm tới được. Dòng `mcp: deny` là một cổng giả — nó trấn an mà không bảo vệ. Sau ADR 0013 D2 nó mới bắt đầu có hiệu lực thật.

**Thứ hai, ADR 0013 D3 buộc cổng thực thi phải phát hiện `.mcp.json` trên đĩa** khi dùng `strategy: convention`, vì không có khoá manifest nào để đọc. Tức là MCP đến từ package upstream **sẽ** được nhìn thấy, dù `agent-plugins` có chủ động hỗ trợ MCP hay không. Câu hỏi không còn là "có để MCP vào hệ thống không" mà là "khi nó vào thì có được kiểm tra không".

**Thứ ba, ba cơ chế còn thiếu giờ đã có thiết kế**: `provisioning` làm trục Policy riêng, secret-by-reference ([ADR 0016](0016-secret-by-reference.md)), và khai báo khả năng của target do adapter cung cấp kèm fixture ([ADR 0015](0015-mcp-as-component.md) D6).

Còn `security-model.md` §1904 — *"V1 MUST NOT execute arbitrary package hooks"* — vẫn đúng nguyên văn và ADR này không đụng vào. Một MCP đã được curate, chịu Policy, chạy bởi runtime chứ không bởi `agent-plugins`, thì không phải là "arbitrary package hook".

## Quyết định

### D1. `mcp` chuyển từ `deny` sang có điều kiện trong policy `default`

```yaml
componentTypes:
  mcp: prompt
  hook: deny          # không đổi
provisioning:
  server: prompt
secrets:
  requiresSecret: review
```

Ba điều kiện được đánh giá độc lập và lấy kết quả mạnh nhất không phải deny, theo `policy-spec.md` §64. Một MCP không cần secret ra `prompt`; một MCP đòi credential ra `review`.

### D2. `hook: deny` giữ nguyên

ADR này **không** nới cho hook. Hook chạy trong tiến trình của agent, do `agent-plugins` kích hoạt, không có ranh giới tiến trình và không có tầng gián tiếp cho secret. MCP là tiến trình riêng do runtime khởi chạy theo một cấu hình khai báo kiểm tra được. Hai trường hợp khác nhau và bằng chứng cho cái này không dùng cho cái kia.

### D3. Phạm vi V1: MCP first-party, chưa discover từ upstream

V1 hiện thực nhánh `source.type: registry` — các định nghĩa MCP được curate trong repo này. Nhánh discover `.mcp.json` từ Package git bị hoãn, **nhưng cổng phát hiện của ADR 0013 D3 vẫn phải làm**: một package upstream ship server mà không khai báo thì phải bị Policy nhìn thấy, chứ không phải lọt qua vì tính năng chưa bật.

Nói cách khác: hoãn **hỗ trợ**, không hoãn **phát hiện**.

### D4. `provisioning: server` là trục Policy độc lập với `componentTypes`

Component phải qua **cả hai** cổng. Trục này tồn tại để `lsp` và mọi dạng server tương lai bị chặn ngay khi xuất hiện, thay vì sau một sự cố.

### D5. Mặc định vẫn là chặn khi không rõ

Target không khai `provisioning: server` → fail. Transport chưa hiện thực → fail. Thiếu binding → fail ở plan time. Không diễn đạt được gián tiếp cho secret → fail. Không đường nào trong số này có fallback "cứ chạy thử".

## Hệ quả

**Tích cực**
- Ca dùng thật mở ra: một agent phụ thuộc GitHub MCP là quan hệ resolve được và giải thích được, thay vì cấu hình thủ công bên ngoài mà `resolution-spec.md` §121 cấm.
- `mcp: deny` từ chỗ là cổng giả trở thành lựa chọn thật — một tổ chức muốn deny giờ deny được thật sự.
- Cổng phát hiện `.mcp.json` đóng lại lỗ mà ADR 0013 D3 đã chỉ ra, ngay cả khi tính năng upstream chưa bật.

**Tiêu cực / chấp nhận**
- Bề mặt an toàn rộng ra: `agent-plugins` giờ sinh ra cấu hình khiến runtime khởi chạy tiến trình. Bù lại là ba cổng (`componentTypes`, `provisioning`, `secrets`) cộng với khai báo target kèm fixture, và `agent-plugins` **không bao giờ** tự khởi chạy server — discovery và dry-run không được phép chạm tới.
- Policy `default` không còn là "khai báo thuần tuý". Ai cần vậy thì đặt `provisioning.server: deny`; ADR này giữ cho lựa chọn đó diễn đạt được trong một dòng.
- Sau [ADR 0013](0013-component-discovery-and-typing.md) D2, nâng cấp có thể làm lộ ra MCP trong package mà Policy trước đây không thấy, khiến một `sync` đang xanh chuyển thành cần `prompt`. Đó là fail đúng, cùng loại với ghi nhận của ADR 0013.

**Tài liệu cần cập nhật theo ADR này**
- `policies/default.yaml` và `tests/fixtures/base/policies/default.yaml`.
- `security-model.md`: ghi rõ §1904 nói về hook; MCP đã được curate không thuộc phạm vi đó.
- `policy-spec.md`: trục `provisioning`, `secrets`, và ví dụ đánh giá nhiều điều kiện cho MCP.
- `non-goals.md`, `roadmap.md`: phạm vi MCP trong V1.
- `catalog-spec.md`: cổng phát hiện `.mcp.json` dưới `strategy: convention`.

Kèm bản `.vi/`.

## Các phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Giữ `mcp: deny`, hoãn sang V2 | Không thực sự hoãn được: ADR 0013 D3 khiến MCP upstream vẫn xuất hiện trong cây package. Hoãn chỉ có nghĩa là nó xuất hiện mà không có cổng nào được thiết kế cho nó |
| `mcp: allow` | Bỏ qua sự khác biệt giữa một server chỉ đọc docs và một server cầm credential ghi. `policy-spec.md` §64 đã có sẵn khả năng phân biệt đó |
| Nới cả `hook` trong cùng đợt | Hook không có ranh giới tiến trình và không có tầng gián tiếp cho secret. Bằng chứng cho MCP không áp dụng được cho hook |
| Chỉ cho phép MCP first-party, deny mọi thứ khác | Nghe an toàn nhưng gắn quyết định vào quyền sở hữu thay vì vào hành vi. Một MCP first-party đòi `DATABASE_URL` đáng được xem xét hơn một MCP third-party chỉ đọc docs công khai |
