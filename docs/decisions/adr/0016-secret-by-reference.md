# ADR 0016 — Secret chỉ tồn tại dưới dạng reference; adapter không bao giờ resolve giá trị

- **Trạng thái:** Accepted
- **Ngày:** 2026-09-22
- **Liên quan:** [`provisioning-spec.md`](../../03-specs/provisioning-spec.md) §6–§7, [`security-model.md`](../../04-security/security-model.md), [`manifest-spec.md`](../../03-specs/manifest-spec.md) §31, §36, [`adapter-spec.md`](../../03-specs/adapter-spec.md) §7, [ADR 0015](0015-mcp-as-component.md) D2, [ADR 0013](0013-component-discovery-and-typing.md) D5

## Bối cảnh

MCP là loại Component đầu tiên cần **credential**. GitHub MCP cần token; Postgres MCP cần connection string. Model hiện tại chưa có chỗ nào để khai chuyện đó, nên cũng chưa có luật nào về việc credential được phép nằm ở đâu.

Ba tệp trong luồng đều là tệp **được commit**:

```text
catalog/packages/*.yaml     chia sẻ giữa mọi project
agent-plugins.yaml          nằm trong repo người dùng
agent-plugins.lock          nằm trong repo người dùng, portable
```

Và artifact sinh ra — `.mcp.json` trong plugin artifact — cũng nằm dưới thư mục project.

Nghĩa là nếu không đặt luật trước, `ap sync` sẽ là một đường rò credential vào git, và nó sẽ rò một cách im lặng vì mọi thứ vẫn chạy đúng.

Có một chi tiết làm chuyện này khả thi thay vì phải đánh đổi: Claude Code hỗ trợ `${VAR}` trong `.mcp.json`. Tức là **có sẵn một tầng gián tiếp ở phía target** — adapter không cần biết giá trị để sinh ra cấu hình chạy được.

## Quyết định

### D1. Catalog khai **tên**, không khai giá trị

```yaml
server:
  environment:
    required:
      - name: GITHUB_TOKEN
        secret: true
        description: Fine-grained PAT with repository read scope
```

Catalog nói component cần gì. Nó không bao giờ nói giá trị là gì, kể cả dưới dạng nội suy.

### D2. Project binding trỏ tới nguồn, không chứa giá trị

```yaml
bindings:
  - package: github-mcp
    component: github
    environment:
      GITHUB_TOKEN:
        from: env
        name: GH_PAT_AGENT
```

V1 chỉ nhận `from: env`. `from: file` và `from: command` hoãn lại; `command` là vector thực thi và cần Policy riêng trước khi được xét.

Binding khoá theo `{package, component}` chứ không theo Capability ID — cấu hình không sống sót qua phép thay thế implementation, nên khoá theo Capability sẽ mang config của Postgres sang một chương trình khác một cách im lặng. Dạng cấu trúc theo [ADR 0013](0013-component-discovery-and-typing.md) D5.

### D3. Adapter materialize **reference**, không materialize **giá trị**

Đây là quyết định trung tâm.

Target Adapter **MUST NOT** đọc biến môi trường được trỏ tới, và **MUST NOT** ghi giá trị của nó ra bất kỳ đâu. Nó dịch reference sang cú pháp gián tiếp của target:

```json
{ "env": { "GITHUB_TOKEN": "${GH_PAT_AGENT}" } }
```

Hệ quả kiểm chứng được: adapter chạy trong một môi trường **không hề có** `GH_PAT_AGENT` vẫn phải sinh ra đúng artifact đó. Đây là một bất biến kiểm thử được, không phải một lời khuyên — fixture của adapter chạy với môi trường rỗng.

### D4. Không có fallback plaintext

Target không diễn đạt được gián tiếp thì materialization **fail** với `SECRET_MATERIALIZATION_UNSUPPORTED`.

Không có cờ để ghi đè, kể cả khi người dùng yêu cầu. Lý do: artifact sinh ra là tệp project bình thường và sẽ được commit. Một cờ `--allow-plaintext-secrets` sẽ được bật đúng một lần lúc vội và sau đó không ai nhớ nó đang bật.

### D5. Lockfile ghi tên reference, không ghi giá trị

Lock ghi `GH_PAT_AGENT` như một phần của desired state — đổi biến là đổi cấu hình và `ap diff` phải thấy. Giá trị thì không bao giờ vào lock.

### D6. Thiếu binding thì fail ở plan time

`ap resolve` fail với `UNBOUND_REQUIREMENT` khi một `environment.required` hoặc parameter bắt buộc không có binding. `ap doctor` đi thêm một bước: kiểm tra biến có được set thật trong môi trường hiện tại và `requirements.executables` có trên `PATH` không — và **báo có/không, không bao giờ in giá trị**.

Fail lúc lập kế hoạch, không phải lúc chạy. Một credential thiếu không được phép trở thành một server khởi động lên rồi chết giữa phiên làm việc.

## Hệ quả

**Tích cực**
- `agent-plugins.yaml` và `.mcp.json` sinh ra đều commit được một cách an toàn và có chủ đích. Hai người trong cùng project dùng chung cấu hình server, mỗi người tự cấp credential.
- `ap sync` không bao giờ là đường credential vào git — theo thiết kế, không phải theo kỷ luật cá nhân.
- D3 kiểm thử được bằng một fixture chạy với môi trường rỗng.
- Luật viết một lần cho `provisioning: server`, nên `lsp` và mọi dạng server sau này thừa hưởng nguyên vẹn ([ADR 0015](0015-mcp-as-component.md) D2).

**Tiêu cực / chấp nhận**
- Target nào không có cơ chế gián tiếp thì không dùng được MCP cần secret qua `agent-plugins`, cho tới khi adapter của nó có cách khác. Đây là fail đúng, không phải hạn chế cần gỡ.
- `from: env` duy nhất trong V1 nghĩa là người dùng phải tự lo biến môi trường (`direnv`, shell profile, secret manager). Chấp nhận: bù lại `agent-plugins` không trở thành một secret manager hạng hai.
- `ap doctor` không thể phân biệt "biến được set đúng" với "biến được set sai giá trị". Nó kiểm tra sự hiện diện. Xác thực credential là việc của server.

**Tài liệu cần cập nhật theo ADR này**
- `security-model.md`: mục xử lý secret cho `provisioning: server`; bất biến D3.
- `manifest-spec.md` §31: `spec.bindings`.
- `adapter-spec.md` §7: cấm resolve secret; `SECRET_MATERIALIZATION_UNSUPPORTED`.
- `policy-spec.md`: trục `secrets.requiresSecret`.
- `testing-strategy.md`: fixture adapter chạy với môi trường rỗng.

Kèm bản `.vi/`.

## Các phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Adapter đọc env rồi ghi giá trị vào `.mcp.json` | Artifact sinh ra nằm trong project và sẽ được commit. Đây chính là chế độ hỏng cần chặn |
| Ghi giá trị nhưng thêm `.mcp.json` vào `.gitignore` | Dựa vào một tệp khác ở một repo khác được cấu hình đúng. Và nó mâu thuẫn với ADR 0010: artifact materialize là trạng thái project quản lý được, không phải rác tạm |
| `agent-plugins` tự giữ secret store riêng | Mở ra mã hoá, xoay khoá, sao lưu, đồng bộ nhiều máy — một sản phẩm khác. Biến môi trường đã là mẫu số chung của mọi secret manager sẵn có |
| Cho phép literal, chỉ cảnh báo | Cảnh báo bị bỏ qua. Một credential đã lọt vào git thì phải xoay khoá, không phải xoá commit |
| Chỉ hoãn: V1 không hỗ trợ MCP cần secret | GitHub MCP là ca dùng đầu tiên. Hoãn nghĩa là tính năng chính không dùng được, trong khi cơ chế gián tiếp của target đã có sẵn |
