# ADR 0015 — MCP là Component có `provisioning: server`, không phải một kind riêng

- **Trạng thái:** Accepted
- **Ngày:** 2026-09-22
- **Liên quan:** [`provisioning-spec.md`](../../03-specs/provisioning-spec.md), [`domain-model.md`](../../01-domain/domain-model.md) §5, §6–§11, §13, §53, §79, [`resolution-spec.md`](../../02-architecture/resolution-spec.md) §120–§121, [ADR 0013](0013-component-discovery-and-typing.md) D2/D3/D5/D6
- **Kéo theo:** [ADR 0016](0016-secret-by-reference.md), [ADR 0017](0017-v1-mcp-scope.md)

## Bối cảnh

Câu hỏi khởi nguồn: MCP nên được mô hình hoá thế nào, khi mục tiêu là hỗ trợ nó như một khái niệm hạng nhất thay vì nhét vào `skills` hay `hooks`?

Đề xuất được cân nhắc là tách `Integration` thành một kind top-level song song với `Component`, với `catalog/integrations/`, `preset.spec.integrations`, `requires.integrations`, và nhóm lệnh `ap integration`. Lập luận: skill/agent là **nội dung cho agent**, còn MCP là **nhà cung cấp năng lực bên ngoài** — hai thứ khác bản chất.

Quan sát đó đúng. Kết luận rút ra từ nó thì không.

### Lập luận mạnh nhất cho `Integration` lại là lý do không cần `Integration`

Lý lẽ thuyết phục nhất trong đề xuất là viễn cảnh này:

```text
Agent requires: repository-access
Candidates: GitHub MCP | GitLab MCP | local-git tools
```

Đó là định nghĩa nguyên văn của `Capability` + `Capability Implementation` + `cardinality`, đã có ở `domain-model.md` §6–§11 và đã chạy ở `resolve.js:68-102`. Để đạt được viễn cảnh đó qua một kind riêng, `Integration` sẽ phải mọc thêm `provides.capabilities`, rồi luật chọn ứng viên, rồi luật xử lý nhập nhằng — tức là mọc lại Capability bên trong chính nó.

### Cái giá cụ thể của đồ thị thứ hai

Nếu `Integration` resolve bằng đường riêng, những thứ sau phải tồn tại hai bản:

| Cơ chế | Đang ở đâu | Phải nhân đôi |
|---|---|---|
| Luật nhập nhằng / cardinality | `resolve.js:76-90` | có |
| Policy filter | `pipeline.js:21-31`, `policy-spec.md` §64 | có |
| Dependency bắc cầu không được lách Policy | `resolution-spec.md` §121 | có |
| Đường giải thích (`ap explain`) | `domain-model.md` §79 | có |
| Mục trong lockfile | `lockfile-spec.md` | có |

`resolution-spec.md` §121 đáng chú ý nhất: luật "không đường phụ thuộc nào được lách Policy" hiện đúng cho MCP **miễn phí**, vì MCP là Component và cạnh phụ thuộc chỉ có một loại. Tách kind ra là phải viết lại và kiểm thử lại luật an toàn đó cho đồ thị thứ hai.

### MCP đã là Component trong tài liệu hiện hành

Không phải là thêm mới, mà là đổi cái đang có:

```text
domain-model.md §5     component types liệt kê `mcp`
domain-model.md §5     ví dụ định danh `mcp:github`
policy-spec.md §50     "hooks, MCP, commands, scripts" — Component chịu Policy
adapter-spec.md:241    "Selected MCP definition | Include validated server configuration"
policies/default.yaml  componentTypes.mcp: deny
```

Đổi sang kind riêng là sửa sáu tài liệu đang nhất quán để đạt được thứ mà năm trong sáu tài liệu đó đã mô tả.

### Nhưng có một khác biệt thật, và nó không nằm ở phân loại entity

MCP khác skill ở chỗ: skill là tệp được chép vào target; MCP là **tiến trình runtime khởi chạy**, cần transport, command, biến môi trường, điều kiện tiên quyết trên máy, và **cấu hình theo từng project**. Model hiện tại không có chỗ nào nói được "component này cần `GITHUB_TOKEN`" hay "materialize thành server config chứ không phải tệp".

Khác biệt đó là về **cách materialize** và **cách cấu hình**, không phải về **nó là loại thực thể gì**.

## Quyết định

### D1. Không thêm `kind: Integration`

`mcp` giữ nguyên là Component type. Không có `catalog/integrations/`, không có `kind: Integration`, không có đồ thị resolution thứ hai, không có nhóm lệnh `ap integration`.

### D2. Component mang facet `provisioning`

```text
content    tệp được chép vào managed state của target   (mặc định)
server     định nghĩa khai báo để runtime khởi chạy
```

`provisioning` là trục độc lập với `type`, chứ không suy ra từ `type`. Lý do: `lsp` trong tương lai cũng là `server` và phải kế thừa **toàn bộ** luật của ADR này cùng [`provisioning-spec.md`](../../03-specs/provisioning-spec.md) mà không cần sửa gì — kể cả cổng Policy. Suy từ `type` thì mỗi loại server mới lại là một lần sửa luật.

`type: mcp` bắt buộc đi với `provisioning: server`; tổ hợp khác fail với `INVALID_PROVISIONING`.

### D3. Cạnh yêu cầu trỏ tới Capability **hoặc** Component, trong một pass

Bên trong resolver là một loại cạnh `RequirementEdge{kind, ref}` và một hàng đợi. Trong YAML giữ hai field tách biệt (`capabilities:` và `components:`) để người đọc không phải đoán `context7` là capability hay component.

Đây là mô hình virtual package của Debian: `Depends:` nhận cả tên gói thật lẫn tên gói ảo trong cùng một namespace, và `Provides:` là thứ nối hai bên. Nó tồn tại ba thập kỷ đúng cho tình huống "GitHub | GitLab | local-git".

**Preset được phép pin Component** khi chưa có Capability tương ứng — nới lỏng có chủ đích với `domain-model.md` §13 ("a Preset should generally not select publisher implementations"). Đổi lại là một tính chất thật: đường nâng cấp không phá vỡ. Pin `context7` hôm nay vẫn chạy đúng vào ngày `knowledge.library-docs` có ứng viên thứ hai; nó chỉ trở thành cách diễn đạt kém biểu cảm hơn.

Lan can: `ap validate --strict` báo `PIN_WITH_CAPABILITY_AVAILABLE` khi pin một Component đã có Capability bao phủ. Là cảnh báo, không phải lỗi — pin vẫn đúng, chỉ kém thay thế.

### D4. Chiều mapping Capability không đổi

File Capability liệt kê `implementations`. **Không** thêm `provides.capabilities` vào Component: cùng một cạnh đồ thị khai ở hai nơi thì hai nơi sẽ lệch.

Phần thưởng: file Capability không bao giờ biết implementation của nó là server. Ngày một skill trở thành hiện thực tốt hơn cho `knowledge.library-docs`, Preset không đổi một dòng.

### D5. `surface`, không phải `capabilities`

Giao thức MCP gọi tools/resources/prompts của server là "capabilities". Tài liệu này không dùng lại từ đó. `Capability` là khái niệm trung tâm của domain (§6) với nghĩa hoàn toàn khác, và đặt cả hai cùng tên sẽ tạo ra một field mà ý nghĩa phụ thuộc vào độ sâu lồng nhau:

```yaml
spec:
  capabilities: {tools: true}          # server phơi ra gì
  provides:
    capabilities: [repository-access]  # ngữ nghĩa — khái niệm khác hẳn
```

Server phơi ra gì gọi là `surface`. Nó là dữ liệu cho người đọc và cho Policy (server có `prompts` thì chèn được chỉ thị vào ngữ cảnh agent), và **không** ảnh hưởng tới selection.

### D6. Khả năng của Target do adapter khai trong code, không phải YAML viết tay

`adapter-spec.md` §7: *"Runtime support does not imply adapter support. Every advertised mapping requires fixtures for the declared runtime range."*

Một `targets/claude-code.yaml` viết tay khẳng định `provisioning: [server]` là khẳng định không kiểm chứng được. Một `export const supports = {...}` trong adapter thì đối chiếu được với chính fixture của adapter đó và không lệch khỏi code hiện thực nó. Quyết định này cũng nhất quán với [ADR 0013](0013-component-discovery-and-typing.md) D6 (`Target` là tên entity, `runtimes/` không tồn tại) và không đẻ thêm thư mục catalog viết tay nào.

### D7. CLI không có noun `integration`

`Integration` không phải entity trong domain này, nên một nhóm lệnh cho nó sẽ hứa hẹn một khái niệm mà `ap explain` không giải thích được. Thay vào đó bổ sung nhóm `component` — thứ `cli-spec.md` §3 đang **thiếu sẵn** dù đã có `package`, `capability`, `preset` — với `--type mcp`. `ap mcp` được phép tồn tại như alias: alias là *view* trên domain, không phải domain thứ hai.

## Hệ quả

**Tích cực**
- Một resolver, một luật nhập nhằng, một Policy filter, một định dạng lock. MCP không sinh code path nào.
- `resolution-spec.md` §121 tiếp tục đúng cho MCP mà không phải viết lại.
- GitHub↔GitLab↔local-git thay thế được ngay khi có entry catalog thứ hai, không cần đổi model.
- Sáu tài liệu đang gọi MCP là Component không phải sửa lại.
- `provisioning` chặn sẵn `lsp` và mọi dạng server tương lai.

**Tiêu cực / chấp nhận**
- Preset được phép pin Component là nới lỏng §13. Chấp nhận vì có lan can `--strict` và vì đường nâng cấp không phá vỡ; nếu bỏ hẳn khả năng pin thì mỗi MCP đều phải bịa ra một Capability ID kể cả khi chỉ có đúng một ứng viên.
- `source.type: registry` cho phép Component viết tay trong Package, là ngoại lệ duy nhất với "Component được discover, không viết tay" ([ADR 0013](0013-component-discovery-and-typing.md) D4). Chấp nhận được vì điều cấm nhắm vào **bản sao chép tay của dữ kiện upstream**; ở đây không có inventory upstream nào để sao chép — định nghĩa chính là artifact có thẩm quyền.
- Một người quen MCP từ runtime khác sẽ hỏi "sao không có `ap mcp install`". Câu trả lời nằm ở ADR này, và alias `ap mcp list` đỡ phần lớn.

**Tài liệu cần cập nhật theo ADR này**
- `domain-model.md` §5 (facet `provisioning`), §72, §89 (thêm `Binding`, `RequirementEdge`, `Provisioning`).
- `terminology.md`: ba từ trên, và phân biệt `surface` với `Capability`.
- `catalog-spec.md`: `source.type: registry`, block `server`, Component inline như ngoại lệ có ghi nhận.
- `manifest-spec.md` §31 (`overrides.components`, `spec.bindings`), §36 (sửa ví dụ về dạng định danh cấu trúc theo ADR 0013 D5).
- `policy-spec.md`: trục `provisioning`.
- `adapter-spec.md`: `supports`, renderer `.mcp.json`.
- `resolution-spec.md`: cạnh component, `TARGET_CANNOT_MATERIALIZE`.
- `cli-spec.md`: nhóm `component` và `target`.

Kèm bản `.vi/`.

## Các phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| `Integration` là kind top-level (đề xuất gốc) | Nhân đôi năm cơ chế đã có; để đạt được khả năng thay thế GitHub↔GitLab thì phải mọc lại Capability bên trong; và phải viết lại luật bắc cầu của `resolution-spec.md` §121 cho đồ thị thứ hai |
| Chỉ Capability, cấm pin Component | Mỗi MCP phải bịa một Capability ID kể cả khi chỉ có một ứng viên. Trả giá hôm nay cho khả năng thay thế có thể không bao giờ cần, và UX `ap add context7` biến mất |
| MCP là một loại `Package`, không phải Component | Package là đơn vị cài đặt, Component là đơn vị chức năng. Một package upstream ship `.mcp.json` **cùng với** skill sẽ không mô hình hoá được |
| Để MCP cho người dùng tự cấu hình ngoài `agent-plugins` | Mâu thuẫn với mục tiêu: một agent cần MCP thì phụ thuộc đó phải resolve được và phải chịu Policy. Cấu hình bên ngoài là đúng thứ `resolution-spec.md` §121 cấm |
