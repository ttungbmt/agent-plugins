# Đặc tả Provisioning — Component dạng Server (MCP)

**Trạng thái:** Ghi chú thiết kế — đi trước hiện thực. Văn xuôi ở đây mô tả hành vi dự định, không phải hợp đồng.

## Tổng quan

Tài liệu này định nghĩa cách `agent-plugins` mô hình hoá, resolve, cấu hình và materialize những Component mà runtime **khởi chạy như một tiến trình** thay vì đọc như nội dung. Loại Component đầu tiên và duy nhất như vậy trong V1 là `mcp`.

Nó trả lời bốn câu hỏi mà các đặc tả hiện có còn để ngỏ:

```text
Định nghĩa MCP server sống ở đâu?
Project cấp cấu hình và secret cho nó bằng cách nào?
Chuyện gì xảy ra khi target không chạy được server?
Policy nhìn thấy một server trước khi nó khởi chạy bằng cách nào?
```

Luận điểm trung tâm của đặc tả này là MCP **không phải một loại thực thể mới**. Nó là một Component bình thường, chỉ khác ở *cách được materialize* và *cách được cấu hình*. Hai bổ sung mang khác biệt đó: facet `provisioning` trên Component, và mục `bindings` trong manifest của project.

Các hợp đồng liên quan:

- [Domain model](../../01-domain/.vi/domain-model.vi.md): Component (§5), Capability (§6), Dependency (§27), Target (§36).
- [Catalog](./catalog-spec.vi.md): định danh được tuyển chọn và implementation mapping.
- [Manifest](./manifest-spec.vi.md): ý định của bên sử dụng, override, chọn target.
- [Resolution](../../02-architecture/.vi/resolution-spec.vi.md): lựa chọn, closure, Component nhạy cảm về an toàn.
- [Policy](./policy-spec.vi.md): tính hợp lệ và kết quả cấp phép.
- [Adapter](./adapter-spec.vi.md): hợp đồng Source Adapter và Target Adapter.
- [Mô hình an toàn](../../04-security/.vi/security-model.vi.md): thực thi và xử lý secret.
- [ADR 0015](../../decisions/adr/0015-mcp-as-component.md), [ADR 0016](../../decisions/adr/0016-secret-by-reference.md), [ADR 0017](../../decisions/adr/0017-v1-mcp-scope.md).

---

# 1. Phạm vi

Đặc tả này bổ sung:

```text
Component.provisioning        một facet về cách materialize
Component.server              định nghĩa server chuẩn tắc
Package.spec.source.type:
  registry                    package mang định nghĩa, không mang nội dung
Cạnh yêu cầu trỏ tới
  Component                   bên cạnh cạnh trỏ tới Capability
Project.spec.bindings         cấu hình và secret reference theo từng project
Khai báo hỗ trợ của Target    do adapter khai, có fixture bảo chứng
```

Nó **không** bổ sung:

```text
kind: Integration
catalog/integrations/
một đồ thị resolution thứ hai
một noun CLI cho "integration"
```

Lý do được ghi ở [ADR 0015](../../decisions/adr/0015-mcp-as-component.md). Tóm tắt: lập luận mạnh nhất cho một entity `Integration` riêng — rằng nhiều server có thể đáp ứng cùng một nhu cầu nên resolver phải chọn giữa chúng — chính là thứ Capability, Capability Implementation và cardinality đang làm. Một entity song song sẽ nhân đôi luật nhập nhằng, Policy filter, đường giải thích và định dạng lock thay vì tái sử dụng chúng.

---

# 2. Hai trục vuông góc

Một Component mang hai phân loại độc lập.

`type` trả lời **đây là loại gì**:

```text
skill | agent | command | hook | rule | mcp | lsp | workflow
```

`provisioning` trả lời **target biến nó thành thật bằng cách nào**:

```text
content    tệp được chép vào managed state của target
server     định nghĩa khai báo để runtime khởi chạy thành tiến trình
```

Hai trục độc lập là có chủ đích. Hôm nay `skill`, `agent`, `command` là `content`; `mcp` là `server`. Một `lsp` trong tương lai cũng sẽ là `server`, và nó **phải** thừa hưởng mọi luật trong tài liệu này mà không cần sửa đổi. Đó là lý do `provisioning` là field riêng thay vì suy ra từ `type`.

`provisioning` mặc định là `content`. Component có `type: mcp` **phải** khai `provisioning: server`; tổ hợp `type: mcp, provisioning: content` là không hợp lệ và phải fail validation với `INVALID_PROVISIONING`.

Theo [ADR 0013](../../decisions/adr/0013-component-discovery-and-typing.md) D2, type của Component là thứ được discover chứ không viết tay. Source Adapter dùng `strategy: convention` xác định `type: mcp` và `provisioning: server` từ sự hiện diện của `.mcp.json` trong cây package.

---

# 3. Block `server`

Component có `provisioning: server` **phải** mang một block `server`. Block này **trung lập với target**: nó mô tả server đúng như publisher định nghĩa, không bao giờ theo cách một runtime cụ thể viết tệp cấu hình.

```yaml
server:
  transport:
    type: stdio                  # stdio | http
  command:                       # bắt buộc với transport stdio
    executable: npx
    args: ["-y", "@upstash/context7-mcp@1.0.14"]
  environment:
    required:
      - name: GITHUB_TOKEN
        secret: true
        description: Fine-grained PAT with repository read scope
    optional:
      - name: GITHUB_API_URL
        secret: false
  parameters:                    # các knob project được phép đặt
    database:
      type: string
      required: true
  requirements:
    executables: [node, npx]
  surface:
    tools: true
    resources: false
    prompts: false
```

Luật cho từng field:

- `transport.type` phải có mặt. V1 chỉ hiện thực `stdio`; `http` được schema chấp nhận và bị từ chối lúc materialize với `TRANSPORT_UNSUPPORTED`, để một adapter sau này thêm vào mà không phải migrate catalog.
- `command.executable` và `command.args` phải là tên executable và một mảng đối số. Chuỗi shell **không** được chấp nhận, theo [adapter-spec](./adapter-spec.vi.md) §5.
- `command.args` nên pin một phiên bản bất biến. `@latest` và specifier không pin chịu cùng lệnh cấm với git ref biến đổi trong [security-model](../../04-security/.vi/security-model.vi.md) §831.
- `environment.required` khai **chỉ tên**. Một giá trị, dù literal hay nội suy, không bao giờ được xuất hiện ở bất kỳ đâu trong catalog. Xem §7.
- `requirements.executables` liệt kê điều kiện tiên quyết trên máy. `ap doctor` kiểm tra chúng; resolution thì không, vì resolution phải độc lập với máy và deterministic.
- `surface` ghi nhận server phơi ra cái gì. Nó **không phải** Capability. Xem §3.1.

## 3.1 `surface` không phải `capabilities`

Giao thức MCP gọi tools, resources và prompts của một server là "capabilities". Đặc tả này cố ý không dùng lại từ đó: `Capability` là khái niệm trung tâm của domain model (§6), mang nghĩa một năng lực ngữ nghĩa độc lập với hiện thực. Hai nghĩa không liên quan gì nhau, và đặt cả hai cùng tên `capabilities` sẽ tạo ra một field mà ý nghĩa phụ thuộc vào độ sâu lồng nhau.

```text
surface      server phơi ra gì qua giao thức        (tools, resources, prompts)
Capability   môi trường agent làm được gì           (knowledge.library-docs)
```

`surface` là thông tin cho người đọc và được Policy tiêu thụ (một server phơi ra `prompts` thì chèn được chỉ thị, và **có thể** bị áp kết quả nghiêm hơn). Nó **không** được ảnh hưởng tới selection.

## 3.2 Chiều mapping Capability không đổi

Một Component dạng server được map tới Capability y hệt mọi Component khác: file Capability liệt kê implementation của nó.

```yaml
# catalog/capabilities/knowledge/library-docs.yaml
kind: Capability
metadata:
  id: knowledge.library-docs
spec:
  cardinality: one
  implementations:
    - package: context7-mcp
      component: context7
```

Field `provides:` trên Component trỏ ngược về Capability **không** được bổ sung. Nó sẽ diễn đạt cùng một cạnh đồ thị ở hai nơi, và hai nơi sẽ lệch nhau.

Phần thưởng của chiều này là file Capability không bao giờ biết implementation của nó là một server. Khi ứng viên thứ hai xuất hiện — một skill, một MCP khác, một CLI cục bộ — nó được thêm vào `implementations` và không Preset nào phải đổi.

---

# 4. Package nguồn registry

Một định nghĩa MCP first-party không có nội dung để tải: artifact được runtime chạy từ một package registry, chứ không được `agent-plugins` vendor về. Vì vậy `Package.spec.source.type` có thêm một giá trị:

```yaml
kind: Package
metadata:
  id: context7-mcp
spec:
  publisher: upstash
  source:
    type: registry
    registry: npm
    package: "@upstash/context7-mcp"
    version: "1.0.14"
  targets: [claude-code]
  components:
    context7:
      type: mcp
      provisioning: server
      server:                    # xem §3
```

Luật:

- `source.type: registry` nghĩa là **không fetch và không sync**. `ap sync` phải bỏ qua các Package như vậy; không có cây làm việc, không có content digest, không có lượt discovery.
- `discovery.strategy` (ADR 0013 D1) phải vắng mặt. Component được khai inline, vì không có gì để discover. Đây là ngoại lệ duy nhất với "Component được discover, không viết tay", và nó chấp nhận được vì đúng lý do ADR 0013 D4 đưa ra: lệnh cấm nhắm vào *bản sao chép tay của dữ kiện upstream*. Ở đây không có inventory upstream nào để sao chép — định nghĩa chính là artifact có thẩm quyền.
- `version` phải là một phiên bản chính xác. Khoảng phiên bản và dist-tag phải bị từ chối.
- `ownership` theo [domain-model](../../01-domain/.vi/domain-model.vi.md) §53: `third-party` cho một server do người khác bảo trì, kể cả khi định nghĩa được curate ở đây. Curate một định nghĩa không chuyển giao trách nhiệm bảo trì.

Đường còn lại — một Package `git` upstream có ship `.mcp.json` — cũng tạo ra đúng hình dạng Component đó, nên cả hai nguồn hội tụ về một biểu diễn trước khi resolve. Đường đó được hoãn (§14) nhưng không đòi thay đổi model.

---

# 5. Cạnh yêu cầu

Composition được phép gọi tên một Capability hoặc một Component. Bên trong, cả hai trở thành một loại cạnh và một lượt resolution.

```text
RequirementEdge
├── kind: capability   ref: <capability id>
└── kind: component    ref: {package, component}
```

Trong YAML, hai loại nằm ở hai field tách biệt, nên người đọc không bao giờ phải đoán một định danh thuộc loại nào:

```yaml
kind: Preset
metadata:
  id: engineering/core
spec:
  capabilities:
    - engineering.testing.tdd
  components:
    - package: context7-mcp
      component: context7
```

Cạnh capability resolve qua `implementations` theo đúng luật cardinality và nhập nhằng hiện có. Cạnh component *chính là* selection của nó. Cả hai tạo ra Selected Implementation và nhập vào một closure, khử trùng lặp theo `{package, component}`.

## 5.1 Khi nào được pin một Component

Preset **nên** gọi tên một Capability. Nó **được phép** gọi tên một Component chỉ khi chưa có Capability nào cho nhu cầu đó.

Đây là chỗ nới lỏng có chủ đích với [domain-model](../../01-domain/.vi/domain-model.vi.md) §13, vốn nói Preset không nên chọn implementation của publisher. Nới lỏng này đổi lấy một tính chất thật: đường nâng cấp không phá vỡ. Một pin `context7` vẫn chạy đúng vào ngày `knowledge.library-docs` có implementation thứ hai; pin chỉ đơn giản trở thành cách diễn đạt kém biểu cảm hơn cho cùng một ý.

`ap validate --strict` phải báo `PIN_WITH_CAPABILITY_AVAILABLE` khi một Component được pin là implementation của một Capability đã tồn tại, kèm tên Capability đó. Đây là cảnh báo chứ không phải lỗi: pin vẫn đúng, chỉ kém khả năng thay thế.

## 5.2 Override ở mức project

`spec.overrides` có thêm block `components`, đối xứng với block `capabilities` đã có ([manifest-spec](./manifest-spec.vi.md) §31):

```yaml
overrides:
  capabilities:
    enable: [knowledge.library-docs]
    disable: []
  components:
    enable:
      - package: github-mcp
        component: github
    disable: []
```

Các luật hiện có được mang sang nguyên vẹn: enable và disable cùng một tham chiếu là `CONFLICTING_OVERRIDE`; disable một thứ mà yêu cầu khác phụ thuộc vào sẽ làm resolution fail thay vì tạo ra đồ thị không hợp lệ.

Đây là hình dạng của thao tác "bật MCP này, tắt MCP kia" ở mức project. Nó không dành riêng cho MCP, và nó nằm trong `overrides` thay vì một block top-level mới, vì đó đúng là ý nghĩa `overrides` vốn có.

---

# 6. Binding

Catalog khai một server **cần** gì. Project cấp nó **là** gì. Ranh giới đó là thứ giữ cho catalog chia sẻ được và manifest commit được.

```yaml
# agent-plugins.yaml
kind: Project
spec:
  role: software-engineer
  target: claude-code
  policy: default

  bindings:
    - package: github-mcp
      component: github
      environment:
        GITHUB_TOKEN:
          from: env
          name: GH_PAT_AGENT

    - package: postgres-mcp
      component: postgres
      parameters:
        database: mealops
      environment:
        DATABASE_URL:
          from: env
          name: DATABASE_URL
```

## 6.1 Binding khoá theo Component, không theo Capability

`overrides.implementations` khoá theo Capability ID vì nó trả lời *chọn implementation nào*. `bindings` khoá theo `{package, component}` vì nó trả lời *cấu hình chính cái này ra sao*.

Phân biệt này gánh trọng lượng thật. Cấu hình không sống sót qua phép thay thế: tham số của một server Postgres vô nghĩa với một server MySQL. Khoá binding theo Capability sẽ để một override implementation âm thầm mang cấu hình cũ sang một chương trình khác.

Dạng cấu trúc `{package, component}` theo [ADR 0013](../../decisions/adr/0013-component-discovery-and-typing.md) D5: `publisher/package#type:name` là dạng hiển thị và tham chiếu cho người, không phải dạng được viết ra. (`manifest-spec` §36 hiện đang dùng dạng hiển thị bên trong `overrides.implementations`; ví dụ đó có trước ADR 0013 và cần sửa — xem §17.)

## 6.2 Parameter

`parameters` phải khớp schema `server.parameters` mà Component khai. Một khoá lạ phải fail với `UNKNOWN_PARAMETER` thay vì được cho qua, để một lỗi gõ không âm thầm trở thành vô tác dụng.

Một parameter khai `required: true` mà không có binding phải làm resolution fail với `UNBOUND_REQUIREMENT`.

## 6.3 Binding là desired state

`bindings` thuộc về manifest, tức là tệp được commit. Nó chứa giá trị parameter và *tên tham chiếu* — không bao giờ chứa giá trị secret (§7) — nên commit nó là an toàn và đúng ý đồ. Hai người trong cùng một project nhận cùng một cấu hình server, và mỗi người tự cấp credential của mình.

---

# 7. Secret

Mục này là bắt buộc và không có ngoại lệ.

**Giá trị secret không bao giờ được xuất hiện trong catalog, manifest, lockfile hay bất kỳ artifact sinh ra nào.** Một secret chỉ được biểu diễn bằng một tham chiếu:

```yaml
environment:
  GITHUB_TOKEN:
    from: env
    name: GH_PAT_AGENT
```

**Adapter materialize tham chiếu, không materialize giá trị.** Target Adapter **không được** đọc biến môi trường được trỏ tới và **không được** ghi giá trị của nó ra bất kỳ đâu. Nó dịch tham chiếu sang cú pháp gián tiếp của chính target. Với Claude Code, `.mcp.json` hỗ trợ nội suy `${VAR}`, nên kết quả render là:

```json
{ "env": { "GITHUB_TOKEN": "${GH_PAT_AGENT}" } }
```

**Không có fallback plaintext.** Nếu target không diễn đạt được cơ chế gián tiếp, materialization phải fail với `SECRET_MATERIALIZATION_UNSUPPORTED`. Ghi giá trị đã resolve thay thế là bị cấm, kể cả khi người dùng yêu cầu, vì artifact sinh ra là một tệp project bình thường và sẽ được commit.

Hệ quả đáng nói thẳng: `ap sync` không bao giờ là đường để một credential đi vào version control.

V1 chỉ chấp nhận `from: env`. `from: file` và `from: command` được hoãn (§14); riêng `command` là một vector thực thi và cần cách xử lý Policy riêng trước khi được xem xét.

`ap doctor` kiểm tra biến được tham chiếu có được set trong môi trường hiện tại không, và `requirements.executables` có trên `PATH` không. Nó báo sự hiện diện, không bao giờ in giá trị.

---

# 8. Resolution

Resolution không có pha mới và không có đồ thị thứ hai.

```text
Role / Project
   ↓
Preset expansion
   ↓
RequirementEdge[]                 cạnh capability và cạnh component, một hàng đợi
   ↓
cạnh capability -> chọn implementation (cardinality, luật nhập nhằng không đổi)
cạnh component  -> chính là selection
   ↓
Selected closure                  nhập lại, khử trùng lặp theo {package, component}
   ↓
Mở rộng dependency
   ↓
Policy filter
   ↓
Kiểm tra hỗ trợ của Target
   ↓
Kiểm tra binding
   ↓
Lock
```

## 8.1 Phụ thuộc server bắc cầu không cần luật mới

Một Component có thể yêu cầu một Component dạng server qua cạnh dependency thông thường:

```yaml
components:
  browser-testing:
    requires:
      components:
        - package: playwright-mcp
          component: playwright
```

Vì đây là cạnh dependency thông thường, [resolution-spec](../../02-architecture/.vi/resolution-spec.vi.md) §120–§121 đã điều chỉnh nó: Component nhạy cảm về an toàn hiển thị với Policy dù được chọn trực tiếp hay kéo vào bắc cầu, và không đường phụ thuộc nào được lách Policy. Tái dùng loại cạnh nghĩa là bảo đảm đó được kế thừa chứ không phải hiện thực lại — và các test hiện có của nó tiếp tục bao phủ.

## 8.2 Kiểm tra binding

Sau khi Policy và kiểm tra hỗ trợ target đi qua, resolution xác minh với mọi Component `provisioning: server` được chọn rằng mỗi mục `environment.required` và mỗi parameter bắt buộc đều có binding. Thiếu binding thì fail ở thời điểm lập kế hoạch:

```text
UNBOUND_REQUIREMENT
  component: github-mcp / github
  requires:  environment GITHUB_TOKEN (secret)
  required by: project -> software-engineer -> engineering/core -> engineering.review
  fix:       thêm binding vào agent-plugins.yaml, hoặc tắt yêu cầu này
```

Plan time chứ không phải runtime, đó mới là điểm mấu chốt. Một credential thiếu không được phép trở thành một server khởi động lên rồi chết giữa phiên làm việc.

---

# 9. Policy

Không cần cơ chế Policy mới. [policy-spec](./policy-spec.vi.md) §64 đã đánh giá nhiều điều kiện và lấy kết quả mạnh nhất không phải deny. Component dạng server đóng góp thêm điều kiện:

```yaml
kind: Policy
spec:
  componentTypes:
    mcp: prompt
  provisioning:
    server: prompt
  secrets:
    requiresSecret: review
```

- `componentTypes` và `provisioning` là hai cổng độc lập; một Component phải qua **cả hai**. `provisioning.server` tồn tại để một `lsp` tương lai bị chặn ngay khi xuất hiện thay vì sau một sự cố.
- `secrets.requiresSecret` áp dụng khi Component khai bất kỳ mục `environment.required` nào đánh dấu `secret: true`. Trao một credential cho tiến trình của bên thứ ba là quyết định khác với việc chạy tiến trình đó.
- Một server có `surface.prompts` bằng true **có thể** bị áp kết quả nghiêm hơn, vì nó chèn được chỉ thị vào ngữ cảnh của agent.

Hai dữ kiện từ [ADR 0013](../../decisions/adr/0013-component-discovery-and-typing.md) D3 phải luôn được nhớ. Thứ nhất, trước ADR đó mọi Component được discover đều bị gán nhãn `skill`, nên `mcp: deny` chưa bao giờ chặn được gì — nó là một luật không chạm tới được, không phải một luật được thực thi. Thứ hai, dưới `strategy: convention`, cổng thực thi phải phát hiện `.mcp.json` **trên đĩa**, vì không có khoá manifest nào để đọc. Thiếu điều đó, một package ship server mà không khai báo sẽ đi qua mà không bị xem xét.

---

# 10. Hỗ trợ của Target

Khả năng chạy server của một target do **adapter** của nó khai, trong code, ngay cạnh các fixture chứng minh điều đó:

```js
export const supports = {
  componentTypes: ['skill', 'agent', 'command', 'mcp'],
  provisioning: ['content', 'server'],
  transports: ['stdio'],
  features: { secretExpansion: true },
}
```

Đây không phải một descriptor YAML viết tay, vì đúng lý do [adapter-spec](./adapter-spec.vi.md) §7 nêu: *runtime hỗ trợ không có nghĩa là adapter hỗ trợ, và mọi mapping được quảng cáo đều cần fixture cho khoảng phiên bản runtime đã khai*. Một tệp YAML khẳng định `provisioning: [server]` là khẳng định không test nào kiểm tra được. Một khai báo do adapter export thì đối chiếu được với chính fixture của adapter đó, và không thể lệch khỏi code hiện thực nó.

Nó cũng nhất quán với [ADR 0013](../../decisions/adr/0013-component-discovery-and-typing.md) D6: `Target` là tên entity, `runtimes/` không tồn tại, và ở đây không có thư mục catalog viết tay nào được sinh thêm.

Resolution fail khi closure được chọn vượt quá những gì target khai, kèm đường yêu cầu đầy đủ theo Explainability Invariant ([domain-model](../../01-domain/.vi/domain-model.vi.md) §79):

```text
TARGET_CANNOT_MATERIALIZE
  required by: project -> software-engineer -> engineering/core -> engineering.review
  selected:    github-mcp / github   (type: mcp, provisioning: server)
  target:      codex
  reason:      adapter không khai hỗ trợ provisioning "server"
  fix:         tắt capability này cho target đó, hoặc chọn một implementation
               dạng content
```

`ap target show claude-code` phơi bày khai báo đó để người dùng thấy giới hạn trước khi va vào nó.

---

# 11. Materialization

Block `server` chuẩn tắc được Target Adapter render. Catalog **không** được chứa cấu hình theo hình dạng của target; một khoá `claude:` hay `mcpServers:` trong tệp catalog là không hợp lệ.

Với Claude Code, renderer ghi `.mcp.json` **bên trong plugin artifact được sinh ra**. [adapter-spec](./adapter-spec.vi.md) §7 đã liệt kê `.mcp.json` trong layout plugin, nên chiến lược materialization của V1 (ADR 0010: một local marketplace sinh ra theo từng project) cần thêm một renderer, không cần chiến lược mới.

Luật render:

- Chỉ phát ra closure được chọn. Một server có mặt trong package upstream nhưng không được chọn thì không được render.
- Dịch tham chiếu môi trường sang cú pháp `${VAR}`; không bao giờ resolve chúng (§7).
- Fail với `TRANSPORT_UNSUPPORTED` cho transport mà adapter chưa hiện thực.
- Discovery, dry-run và lập kế hoạch không được khởi chạy server. Materialization ghi cấu hình; runtime quyết định khi nào khởi chạy.

---

# 12. Lockfile

Với mỗi Component dạng server được chọn, Project Lockfile ghi:

```text
{package, component}
type, provisioning
digest của block server đã resolve
loại transport
tên tham chiếu của binding        (chỉ tên, không bao giờ là giá trị)
giá trị parameter
kết quả policy
đường yêu cầu
```

Digest làm cho một định nghĩa server thay đổi hiện ra trong `ap diff` như một thay đổi upstream thay vì một thay đổi vô hình. Tên tham chiếu là một phần của desired state: một project đổi `GITHUB_TOKEN` từ `GH_PAT_AGENT` sang biến khác là đã đổi cấu hình, và lock phải thể hiện điều đó.

Giá trị — của secret, và của bất cứ thứ gì đọc từ môi trường — không được ghi vào lockfile, vì lockfile được commit và portable.

---

# 13. CLI

Không thêm noun `integration`. Khái niệm đó không tồn tại trong domain này, nên một nhóm lệnh cho nó sẽ hứa hẹn một entity mà `ap explain` không giải thích được.

Nhóm `component` — hiện vắng mặt trong [cli-spec](./cli-spec.vi.md) §3, và hữu ích độc lập với MCP — cung cấp bề mặt đó:

```bash
ap component list --type mcp
ap component show context7-mcp#mcp:context7
ap component enable github-mcp#mcp:github  # ghi vào overrides.components.enable
ap component disable github-mcp#mcp:github
ap doctor github-mcp#mcp:github            # biến đã set chưa? executable có trên PATH chưa?
ap target show claude-code                 # khai báo hỗ trợ
```

Đối số dùng dạng hiển thị của [ADR 0013](../../decisions/adr/0013-component-discovery-and-typing.md) D5, không phải dạng cấu trúc được viết trong YAML; tiền tố publisher được phép lược bỏ khi id package còn phân biệt được.

`ap mcp` **có thể** tồn tại như alias cho `ap component list --type mcp`. Một alias là view trên domain, không phải domain thứ hai.

Không có lệnh `ap bind` trong V1. Sửa tay `agent-plugins.yaml` là đủ và `ap doctor` nói chính xác thiếu gì; một lệnh ghi manifest là bề mặt phải kiểm thử mà chưa ai cần.

---

# 14. Phạm vi V1

Trong phạm vi:

```text
source.type: registry
facet provisioning, block server, surface
cạnh yêu cầu component trong Preset và overrides
bindings với from: env
materialize secret bằng tham chiếu và hai chế độ fail của nó
renderer .mcp.json cho Claude Code
trục policy: provisioning, secrets.requiresSecret
nhóm CLI component và target
```

Hoãn, nhưng model đã đỡ sẵn:

```text
discover MCP upstream từ Package git có .mcp.json
from: file và from: command
transport: http
capability nhiều ứng viên kiểu github | gitlab | local-git
ap bind
```

Bật MCP là sửa chính quyết định "V1 ships no hooks/MCP" mà `policies/default.yaml` mã hoá và [security-model](../../04-security/.vi/security-model.vi.md) §1904 neo vào. Sửa đổi đó là [ADR 0017](../../decisions/adr/0017-v1-mcp-scope.md), không phải một dòng YAML.

---

# 15. Mã chẩn đoán

| Mã | Phát sinh khi |
|---|---|
| `INVALID_PROVISIONING` | `type: mcp` mà không có `provisioning: server`, hoặc giá trị provisioning lạ |
| `PIN_WITH_CAPABILITY_AVAILABLE` | một Component được pin đã có Capability bao phủ (cảnh báo `--strict`) |
| `UNBOUND_REQUIREMENT` | một tham chiếu môi trường hoặc parameter bắt buộc không có binding |
| `UNKNOWN_PARAMETER` | binding đặt một parameter mà Component không khai |
| `CONFLICTING_OVERRIDE` | cùng một Component vừa được enable vừa bị disable |
| `TARGET_CANNOT_MATERIALIZE` | closure được chọn vượt quá hỗ trợ mà adapter khai |
| `SECRET_MATERIALIZATION_UNSUPPORTED` | cần tham chiếu secret nhưng target không diễn đạt được gián tiếp |
| `TRANSPORT_UNSUPPORTED` | adapter chưa hiện thực transport được khai |

---

# 16. Ví dụ đầy đủ

Một project cần tài liệu thư viện cập nhật và truy cập GitHub.

```yaml
# catalog/packages/context7-mcp.yaml
kind: Package
metadata: { id: context7-mcp, name: Context7 MCP }
spec:
  publisher: upstash
  ownership: third-party
  source:
    type: registry
    registry: npm
    package: "@upstash/context7-mcp"
    version: "1.0.14"
  targets: [claude-code]
  components:
    context7:
      type: mcp
      provisioning: server
      server:
        transport: { type: stdio }
        command:
          executable: npx
          args: ["-y", "@upstash/context7-mcp@1.0.14"]
        requirements:
          executables: [node, npx]
        surface: { tools: true, resources: false, prompts: false }
```

```yaml
# catalog/capabilities/knowledge/library-docs.yaml
kind: Capability
metadata: { id: knowledge.library-docs }
spec:
  cardinality: one
  implementations:
    - package: context7-mcp
      component: context7
```

```yaml
# presets/knowledge/docs.yaml
kind: Preset
metadata: { id: knowledge/docs }
spec:
  capabilities: [knowledge.library-docs]
```

```yaml
# agent-plugins.yaml
kind: Project
spec:
  role: software-engineer
  target: claude-code
  policy: default
  presets: [knowledge/docs]
  overrides:
    components:
      enable:
        - package: github-mcp
          component: github
  bindings:
    - package: github-mcp
      component: github
      environment:
        GITHUB_TOKEN: { from: env, name: GH_PAT_AGENT }
```

Resolution chọn `context7` qua một Capability và `github` qua một cạnh component, nhập chúng vào một closure, đánh giá cả hai dưới Policy (`mcp: prompt`; riêng `github` thêm `secrets.requiresSecret: review`), xác nhận adapter Claude Code khai `provisioning: server` và `secretExpansion`, xác nhận `GH_PAT_AGENT` đã có binding, rồi render một `.mcp.json` chứa hai server — mục GitHub mang `"${GH_PAT_AGENT}"`, không bao giờ mang token.

Không có gì trong `knowledge/docs` ghi lại rằng implementation của nó là một server. Ngày một *skill* tài liệu trở thành hiện thực tốt hơn cho `knowledge.library-docs`, Preset không đổi.

---

# 17. Tài liệu cần cập nhật

- [`domain-model.md`](../../01-domain/.vi/domain-model.vi.md): §5 thêm `provisioning`; §72 quan hệ; §89 vocabulary thêm `Binding`, `RequirementEdge`, `Provisioning`.
- [`terminology.md`](../../01-domain/.vi/terminology.vi.md): ba từ trên, và phân biệt `surface` với `Capability`.
- [`catalog-spec.md`](./catalog-spec.vi.md): `source.type: registry`; block `server`; Component inline như ngoại lệ có ghi nhận của discovery.
- [`manifest-spec.md`](./manifest-spec.vi.md): §31 thêm `overrides.components` và `spec.bindings`; §36 sửa ví dụ sang dạng định danh cấu trúc theo ADR 0013 D5.
- [`policy-spec.md`](./policy-spec.vi.md): trục `provisioning` và `secrets`.
- [`adapter-spec.md`](./adapter-spec.vi.md): khai báo `supports`; renderer `.mcp.json`; lệnh cấm materialize secret.
- [`resolution-spec.md`](../../02-architecture/.vi/resolution-spec.vi.md): cạnh yêu cầu component; kiểm tra binding; `TARGET_CANNOT_MATERIALIZE`.
- [`cli-spec.md`](./cli-spec.vi.md): nhóm `component` và `target`.
- [`security-model.md`](../../04-security/.vi/security-model.vi.md): §1904 được ADR 0017 sửa phạm vi.

Mỗi tài liệu kèm bản `.vi/` tương ứng.
