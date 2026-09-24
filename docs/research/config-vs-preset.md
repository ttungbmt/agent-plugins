# Research: phân biệt Config với Preset khi Config được khai báo trực tiếp

Câu hỏi: các công cụ tương tự tách file gốc (entry config) khỏi preset dùng chung như thế nào, và cho người dùng khai báo
thẳng trong file gốc ra sao mà không cần một file preset riêng? `ap` nên làm gì để Config khai báo trực tiếp (cùng hình
dạng `spec` với Preset) mà không bị nhầm với Preset?
Nguồn kiểm tra ngày 2026-09-24. Chỉ dùng nguồn sơ cấp: docs chính thức (eslint.org, typescriptlang.org, babeljs.io,
docs.renovatebot.com, biomejs.dev, docs.docker.com, nixos.org, code.claude.com), KEP của Kubernetes và source trên GitHub
(link ghim theo commit). Điều gì chưa kiểm chứng được thì ghi **(chưa kiểm chứng)**.

## Tóm tắt

- **File gốc cùng hình dạng với preset là chuẩn chung, không phải ngoại lệ.** Renovate gọi preset là "reusable bits of
  configuration" và repo config chỉ là config có thêm `extends`
  ([Renovate presets](https://docs.renovatebot.com/key-concepts/presets/)); `tsconfig.json` và base config là cùng một
  định dạng ([tsconfig `extends`](https://www.typescriptlang.org/tsconfig/#extends)); shareable config của ESLint là
  "a configuration object or array", đúng thứ nằm trong `eslint.config.js`
  ([ESLint configuration files](https://eslint.org/docs/latest/use/configure/configuration-files#use-a-shareable-configuration-package));
  trong Nix, `configuration.nix` cũng chỉ là một module như mọi module khác
  ([NixOS manual](https://github.com/NixOS/nixpkgs/blob/7110cd7e531493ac84c63866678f03f2e8bd1308/nixos/doc/manual/development/writing-modules.chapter.md?plain=1#L1-L8)).
- **Gần như mọi công cụ cho nội dung của chính file gốc thắng preset** — Renovate, TypeScript, ESLint `extends`, Babel
  `extends`, Biome. Ngoại lệ đáng chú ý: Nix (mọi module ngang hàng, phân xử bằng priority) và Docker Compose `include`
  (file include khai báo trùng tài nguyên → lỗi). `ap` đang theo số đông: khai báo trong Config mang `shadows: ['*']`.
- **Tín hiệu phân biệt file gốc/preset thường là ngữ cảnh nạp, không phải hình dạng.** Tên file (Renovate `renovate.json`
  vs `default.json`, Biome `root`), vị trí trong đồ thị nạp, và **kiểm tra ở runtime theo ngữ cảnh**: Babel báo lỗi
  "is not allowed in preset options" cho vài option
  ([source](https://github.com/babel/babel/blob/fd665901dece022a0eda2ae7adda03bc9baabd5e/packages/babel-core/src/config/validation/options.ts#L411-L413)).
  Chỉ Kustomize dùng hẳn một `kind` riêng (`Component`) và kiểm tra **hai chiều** ở runtime
  ([source](https://github.com/kubernetes-sigs/kustomize/blob/078ab6cf8e87a87a4dea4c81a8c3f4519e97dec5/api/internal/target/kusttarget.go#L521-L527)).
- **Preset inline (vô danh) có ở ESLint, Babel, Nix** nhưng luôn là phần tử cùng hạng với preset được tham chiếu (theo vị
  trí trong mảng, hoặc ngang hàng theo priority). Không công cụ nào dùng preset inline để thay cho "nội dung riêng của
  file gốc"; nội dung đó luôn nằm thẳng ở top-level.
- **Sự nhầm lẫn có ghi nhận** thường được xử lý bằng cách đặt tên/luật nạp chứ không tách cấu trúc: Renovate bỏ
  `renovate.json` làm tên file preset mặc định; Kustomize thêm `kind: Component` vì một component "can never work outside
  the `components:` field"; ESLint thừa nhận nhiều cơ chế ghép config song song (cascade + `extends`) "turned out to be a
  mess".
- **Khuyến nghị cho `ap`:** giữ nguyên cùng hình dạng `spec`, cho phép (và khuyến khích) khai báo thẳng trong Config; đặt
  tên khái niệm trong `CONTEXT.md` (sửa định nghĩa **Config** đang lỗi thời) và thêm **kiểm tra `kind` ở runtime hai
  chiều** kiểu Kustomize. Không làm Preset inline trong `spec.presets`, không thêm key riêng.

---

## 1. Hiện trạng trong `ap`

- `resolveConfig` đọc Config, nạp các Preset trong `spec.presets` bằng `collect`, rồi gộp khai báo riêng của Config với
  `presets: [null], shadows: ['*']` (`packages/cli/src/sync/resolve.ts`, dòng 67–95). `outranks` cho khai báo có
  `shadows` chứa `'*'` thắng mọi khai báo, còn khai báo có `presets` chứa `null` thì không bị ai thắng (dòng 347–351). Tức
  là: khai báo trong Config **luôn thắng, không bao giờ `preset-clash`** — giống quan hệ Preset con với cây `extends`
  (ADR 0004), chỉ khác là Config "kế thừa" **tất cả** Preset được chọn cùng lúc.
- Khác biệt duy nhất về hình dạng giữa hai schema là Config có `spec.presets`, Preset có `spec.extends` (so sánh key
  `spec.properties` của `config.schema.json` và `preset.schema.json`). Runtime đã chặn dùng lẫn hai key này (dòng 62–64 và
  432–436) — cùng kiểu với kiểm tra theo ngữ cảnh của Babel (mục 2.4).
- `kind` **không** được kiểm tra ở runtime: `load`/`loadLocal`/`loadRemote`/`loadDefaultPreset` parse YAML rồi dùng luôn
  (dòng 450–500). Hệ quả cụ thể: `packages/cli/presets/mcp-servers.yaml` (`kind: McpCatalog`) nằm cùng thư mục với
  Bundled preset, nên `presets: [mcp-servers]` chỉ bị chặn một cách tình cờ, vì file này không có `metadata.name`: lỗi
  báo ra là `default preset metadata.name "undefined" must match its file name "mcp-servers"`, không nói rằng đây là một
  `McpCatalog` (suy từ code, **chưa chạy thử**). Tương tự, trỏ `spec.presets` vào `agent-plugins.yaml` của repo khác (một Config) chỉ lỗi nếu file đó có
  `spec.presets` — lỗi báo là "a Preset inherits with `spec.extends`", không nói rằng đó là một Config.
- `CONTEXT.md` định nghĩa **Config** là "selects Presets and may declare extra marketplaces of its own" — lỗi thời: code
  cho Config khai báo mọi thứ Preset khai báo được (marketplaces, plugins, skills/agents/rules/workflows, mcpServers,
  hooks).
- Ví dụ `examples/ideaverse-os`: Config chỉ có `presets: [./.agent-plugins/preset.yaml]`, còn Preset đó `extends: base`
  và khai báo 2 marketplace + 2 plugin. Viết thẳng vào Config (`presets: [base]` + 4 khai báo) cho **cùng kết quả**: trước
  đây Preset con thắng `base`, sau khi chuyển thì Config thắng `base` — cùng chiều ưu tiên.

## 2. Khảo sát

### 2.1 Renovate — repo config và preset cùng định dạng, repo config đè lên trên

- Preset là "reusable bits of configuration, stored in JSON, JSON5 or JSONC format"; dùng bằng cách đưa vào mảng
  `extends` của Renovate config, và "a preset can even extend from _other_ presets"
  ([Renovate presets](https://docs.renovatebot.com/key-concepts/presets/)). Không có trường `kind`; hình dạng giống hệt.
- Thứ tự: giữa các preset, "the _last_ preset in the `"extends"` array "wins"" (cùng trang). Sau khi gộp hết preset,
  resolver gộp config gốc lên trên — comment trong code: "Now assign "regular" config on top"
  ([`lib/config/presets/index.ts` L304–L305](https://github.com/renovatebot/renovate/blob/0c956a8adc0a48de691fbb34808f4d40c7b021a4/lib/config/presets/index.ts#L304-L305)).
  Vậy nội dung của repo config luôn thắng preset. Option `mergeable` (vd `packageRules`) được nối thêm thay vì thay thế
  ([configuration options](https://docs.renovatebot.com/configuration-options/)).
- Các preset **không** ngang hàng theo nghĩa "xung đột là lỗi": xung đột giải bằng thứ tự, không bao giờ báo lỗi.
- Tín hiệu phân biệt là **tên file và vị trí**: file repo config là `renovate.json` (hoặc các vị trí được liệt kê), preset
  mặc định của một repo là `default.json`. Có vài luật chỉ áp dụng một phía: tham chiếu tương đối "only work inside
  presets. Renovate does not accept them in a repository's own `renovate.json`"; `ignorePresets` của repo config được ưu
  tiên hơn của preset
  ([config-presets.md L277–L278, L334–L335](https://github.com/renovatebot/renovate/blob/0c956a8adc0a48de691fbb34808f4d40c7b021a4/docs/usage/config-presets.md?plain=1#L277-L278)).
- **Nhầm lẫn có ghi nhận:** "We've deprecated using a `renovate.json` file for the default _preset_ file name in a
  repository. If you're using a `renovate.json` file to share your presets, rename it to `default.json`"
  ([Shareable Config Presets](https://docs.renovatebot.com/config-presets/#preset-file-naming)). Tức là Renovate tách
  hai vai trò bằng **tên file**, không phải bằng cấu trúc.
- Preset inline: không có — `extends` chỉ nhận chuỗi tham chiếu; khai báo "inline" chính là phần còn lại của repo config.

### 2.2 TypeScript `tsconfig.json` — kế thừa tuyến tính, file hiện tại thắng

- `extends` trỏ tới "another configuration file to inherit from"; "The configuration from the base file are loaded first,
  then overridden by those in the inheriting config file"; `files`/`include`/`exclude` bị thay nguyên; `references` là
  top-level property duy nhất không được kế thừa ([tsconfig `extends`](https://www.typescriptlang.org/tsconfig/#extends)).
- Từ TS 5.0, `extends` nhận mảng: "Writing this is kind of like extending `c` directly, where `c` extends `b`, and `b`
  extends `a`. If any fields "conflict", the latter entry wins"
  ([TS 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#supporting-multiple-configuration-files-in-extends)).
  Nhiều base được **tuyến tính hoá** thành một chuỗi — không có khái niệm ngang hàng.
- Không có `kind`; tín hiệu duy nhất là quy ước tên (`tsconfig.base.json`, package `@tsconfig/*`). Không có base inline.

### 2.3 ESLint flat config — mảng các object, object sau thắng

- `eslint.config.js` "should be placed in the root directory of your project and export an array of configuration
  objects"; khi nhiều object khớp một file, "the configuration objects are merged with later objects overriding previous
  objects when there is a conflict"
  ([Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files#cascading-configuration-objects)).
- Shareable config "is an npm package that exports a configuration object or array" (cùng trang) — **cùng hình dạng** với
  phần tử của file gốc. Không có `kind`; file gốc được nhận ra bằng tên `eslint.config.*` khi tìm ngược lên thư mục cha.
- `extends` (qua `defineConfig`, ESLint v9.22) nhận "a string that specifies the name of a configuration in a plugin, a
  configuration object, a configuration array" — tức là **preset inline** là hợp lệ. Trong code, các phần tử `extends`
  được đẩy vào mảng trước, rồi object chứa nó được đẩy **sau cùng**, nên key riêng của object thắng mọi thứ nó extends;
  `extends` lồng nhau bị cấm ("Nested 'extends' is not allowed.")
  ([`define-config.js` L404–L490](https://github.com/eslint/rewrite/blob/e05a2984a82000b6cabab699aa2b41745ea4074a/packages/config-helpers/src/define-config.js#L404-L490)).
  Preset inline và preset tham chiếu cùng hạng, thứ tự trong mảng quyết định.
- **Nhầm lẫn có ghi nhận:** bài blog về hệ config cũ viết rằng giữ cả cascade lẫn `extends` "turned out to be a mess that
  we would spend years trying to fix", và về `overrides`: "It's confusing even to us"
  ([ESLint's new config system, Part 1](https://eslint.org/blog/2022/08/new-config-system-part-1/)). Flat config ban đầu
  bỏ `extends`, sau đó thêm lại vì người dùng phải lo "whether a configuration you want to extend is an object or an
  array" — "one of the most common pain points reported by our users"
  ([Evolving flat config with extends](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/)).
  Bài học: có **hai cơ chế ghép song song** là nguồn nhầm lẫn chính.

### 2.4 Babel — cùng option, nhưng runtime biết mình đang nạp config hay preset

- Preset "can act as sharable set of Babel plugins and/or config options"; một preset là hàm trả về object options
  ([Presets](https://babeljs.io/docs/presets)). Config file (`babel.config.json`) dùng cùng các option đó.
- Thứ tự: "Plugins run before Presets. Plugin ordering is first to last. Preset ordering is reversed (last to first)"
  ([plugins.md L56–L64](https://github.com/babel/website/blob/fdf18f3d9a4ca3b715fed4e0f1290a5501bc09f8/docs/plugins.md?plain=1#L56-L64)).
  Plugin khai báo thẳng trong config chạy trước mọi plugin đến từ preset — nội dung của file gốc được ưu tiên. `extends`
  của Babel: "Config fields in the current config will be merged on top of the extended file's configuration"
  ([options.md L476–L479](https://github.com/babel/website/blob/fdf18f3d9a4ca3b715fed4e0f1290a5501bc09f8/docs/options.md?plain=1#L476-L479)).
  Plugin/preset trùng nhau được thay "based on the identity of the plugin/preset object/function itself combined with the
  name of the entry"
  ([configuration.md L211–L217](https://github.com/babel/website/blob/fdf18f3d9a4ca3b715fed4e0f1290a5501bc09f8/docs/configuration.md?plain=1#L211-L217)).
- **Preset inline:** `EntryTarget` có kiểu `string | {} | Function` — "An actual plugin/preset object or function"
  ([Options — EntryTarget](https://babeljs.io/docs/options#entrytarget)). Preset inline đứng chung mảng `presets`, cùng luật
  thứ tự đảo ngược với preset tham chiếu.
- **Tín hiệu phân biệt là kiểm tra theo ngữ cảnh nạp.** Không có `kind`; loader biết mình đang nạp gì (`type === "preset"`,
  `"configfile"`, `"extendsfile"`...) và chặn option sai chỗ: nhóm `NONPRESET_VALIDATORS` (`extends`, `ignore`, `only`,
  `targets`...) → "is not allowed in preset options"; `babelrc`/`babelrcRoots` → "is not allowed in .babelrc or
  "extends"ed files"
  ([validation/options.ts L43–L76, L411–L431](https://github.com/babel/babel/blob/fd665901dece022a0eda2ae7adda03bc9baabd5e/packages/babel-core/src/config/validation/options.ts#L411-L431)).
  Đây đúng là kiểu `ap` đang làm với `spec.extends`/`spec.presets`.

### 2.5 Biome — cờ `root` và `extends`

- `extends` là "A list of paths to other Biome configuration files. The order of paths to extend goes from least relevant
  to most relevant"; `root`: "When a configuration file is a “nested configuration”, it must set `"root": false`,
  otherwise an error is thrown" ([Configuration](https://biomejs.dev/reference/configuration/)).
- File được extend "are processed in the order they are listed, with settings in later files overriding earlier ones";
  "Files that you extend from cannot extend other files in turn"; một shared config có thể export `biome.json` từ npm
  package ([Big projects](https://biomejs.dev/guides/big-projects/)). File bị extend và file gốc cùng định dạng. Việc
  nội dung của chính `biome.json` thắng các file nó extend là suy từ "least relevant to most relevant" **(chưa kiểm chứng
  trong source)**.
- Tín hiệu là cờ `root` được kiểm tra ở runtime — nhưng cờ này phân biệt config gốc với config **lồng trong monorepo**,
  không phải với shared preset.

### 2.6 Kustomize — `kind: Component` riêng, kiểm tra hai chiều

- KEP 1802 đưa vào "a new kind of Kustomization that allows users to define reusable kustomizations". Lý do: overlay anh
  em "cannot modify their common parent due to resource ID conflicts", nên cần mô hình **composition** bên cạnh
  **inheritance** ([KEP-1802](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/1802-kustomize-components/README.md)).
  Tương tự phân biệt `extends` (kế thừa) / `presets` (chọn tổ hợp) của ADR 0004.
- Component "has basically the same capabilities as a normal kustomization" — **cùng hình dạng, cùng tên file**
  `kustomization.yaml`. Khác biệt là thời điểm áp dụng: component được "evaluated after the resources of the parent
  kustomization ... have been accumulated, and on top of them" (KEP). Trong code, component chạy sau resources và
  generators, trước transformers của file cha
  ([kusttarget.go L231–L236](https://github.com/kubernetes-sigs/kustomize/blob/078ab6cf8e87a87a4dea4c81a8c3f4519e97dec5/api/internal/target/kusttarget.go#L231-L236)).
- **Vì sao có `kind` riêng dù đã có field `components`:** KEP nêu hai lý do — kind alpha báo hiệu API chưa ổn định, và "A
  kustomization that patches resources that have not been defined in its `resources:` field can never work outside the
  `components:` field. So, the kind further expresses how it should be used." Luật: "a component cannot be added to the
  `resources:` list, and a resource/Kustomization cannot be added to the `components:` list" (KEP).
- Luật đó được **kiểm tra ở runtime cả hai chiều**: "expected kind 'Component' for path ..." và "expected kind !=
  'Component' for path ..."
  ([kusttarget.go L521–L527](https://github.com/kubernetes-sigs/kustomize/blob/078ab6cf8e87a87a4dea4c81a8c3f4519e97dec5/api/internal/target/kusttarget.go#L521-L527)).
  `kind` rỗng mặc định là `Kustomization`, kind khác hai giá trị trên bị báo lỗi
  ([kustomization.go L224–L231](https://github.com/kubernetes-sigs/kustomize/blob/078ab6cf8e87a87a4dea4c81a8c3f4519e97dec5/api/types/kustomization.go#L224-L231)).
- File gốc (overlay) khai báo thẳng patches/resources của mình; không có component inline (component luôn là thư mục).

### 2.7 Docker Compose `include` — tài nguyên được include ngang hàng với file gốc, trùng là lỗi

- Mỗi file trong `include` "loads as an individual Compose application model, with its own project directory", rồi "all
  resources are copied into the current Compose application model"
  ([Include](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/)).
- "Compose reports an error if any resource from `include` conflicts with resources from the included Compose file. This
  rule prevents unexpected conflicts with resources defined by the included compose file author." Muốn sửa model được
  include thì thêm override file vào chính mục `include` (`path: [third-party/compose.yaml, override.yaml]`) hoặc dùng
  `compose.override.yaml` toàn cục; docs thừa nhận nhược điểm "you need to maintain a dedicated override file per include"
  (cùng trang).
- Đây là thiết kế ngược với `ap`: file gốc **không** thắng mặc định; việc ghi đè phải đi qua một file riêng. Hệ quả được
  docs ghi nhận là số file tăng — đúng điều người dùng `ap` muốn tránh ở ví dụ ideaverse.

### 2.8 Nix module system (NixOS, Home Manager) — mọi module ngang hàng, phân xử bằng priority

- "One of the modules that constitute the configuration is `/etc/nixos/configuration.nix`" — file gốc chỉ là một module;
  `imports` "enumerates the paths to other NixOS modules"
  ([writing-modules.chapter.md](https://github.com/NixOS/nixpkgs/blob/7110cd7e531493ac84c63866678f03f2e8bd1308/nixos/doc/manual/development/writing-modules.chapter.md?plain=1#L1-L8)).
- Không module nào thắng nhờ vị trí. Định nghĩa mặc định có priority 100; `mkForce` = `mkOverride 50`, `mkDefault` =
  `mkOverride 1000`
  ([option-def.section.md L86–L101](https://github.com/NixOS/nixpkgs/blob/7110cd7e531493ac84c63866678f03f2e8bd1308/nixos/doc/manual/development/option-def.section.md?plain=1#L86-L101)).
  Hai định nghĩa cùng priority khác giá trị cho option không gộp được → "The option `...' has conflicting definition
  values"
  ([lib/options.nix L500–L520](https://github.com/NixOS/nixpkgs/blob/7110cd7e531493ac84c63866678f03f2e8bd1308/lib/options.nix#L500-L520)).
  Quy ước để "file gốc thắng" nằm ở phía module dùng chung: comment của `mkDefault` là "used in config sections of
  non-user modules to set a default"
  ([lib/modules.nix L1598–L1607](https://github.com/NixOS/nixpkgs/blob/7110cd7e531493ac84c63866678f03f2e8bd1308/lib/modules.nix#L1598-L1607)).
- **Module inline:** phần tử của `imports` có thể là attrset/hàm, được đặt key `"<parentKey>:anon-<n>"`
  ([lib/modules.nix L538](https://github.com/NixOS/nixpkgs/blob/7110cd7e531493ac84c63866678f03f2e8bd1308/lib/modules.nix#L538)).
  Module vô danh ngang hàng với module được import, như mọi module khác.
- Home Manager dùng cùng module system nên cùng luật **(chưa kiểm chứng riêng trong source Home Manager)**.

### 2.9 Claude Code settings — phân lớp theo vị trí file

- "When the same key appears in more than one place, Claude Code uses the value from the highest level that sets it"
  (managed > command line > `.claude/settings.local.json` > `.claude/settings.json` > `~/.claude/settings.json`); nhưng
  "Lists merge instead of overriding" cho các key dạng list như `permissions.allow`
  ([Settings](https://code.claude.com/docs/en/settings#settings-precedence)). Mọi lớp cùng định dạng; vị trí file quyết
  định thứ hạng; vài key bị bỏ qua ở một số lớp (vd `permissions.defaultMode: bypassPermissions` không có tác dụng từ
  project settings, cùng trang). Hữu ích như tiền lệ: cùng hình dạng + luật "key này không hợp lệ ở lớp này".

### 2.10 Không khảo sát sâu

Nx và Turborepo (`extends: ["//"]` trong package config) có mô hình gốc/lồng giống Biome hơn là gốc/preset; bỏ qua để giữ
độ sâu **(chưa kiểm chứng)**.

## 3. Bảng so sánh

| Công cụ | File gốc cùng hình dạng preset? | Tín hiệu phân biệt | File gốc thắng preset? | Preset với nhau | Preset inline? |
| --- | --- | --- | --- | --- | --- |
| Renovate | Có | Tên file (`renovate.json` vs `default.json`), vài luật một phía | Có (gộp "on top") | Sau thắng | Không |
| TypeScript | Có | Quy ước tên | Có | Tuyến tính, sau thắng | Không |
| ESLint flat | Có (object/mảng) | Tên `eslint.config.*` | Có (object chứa `extends` đứng sau) | Sau thắng | Có, cùng hạng theo vị trí |
| Babel | Có (cùng options) | Ngữ cảnh nạp + lỗi runtime cho option sai chỗ | Có (plugin trước preset; `extends` bị đè) | Đảo thứ tự, thay theo identity | Có, cùng hạng |
| Biome | Có | Cờ `root` (cho config lồng) | Có (suy ra, chưa kiểm chứng) | Sau thắng; không extend lồng | Không |
| Kustomize | Có (cùng file name, cùng field) | `kind: Component`, runtime check hai chiều | Component áp dụng lên trên resource của cha | Tuần tự | Không |
| Compose `include` | Có | Vị trí trong `include` | **Không** — trùng là lỗi, cần override file | Trùng là lỗi | Không |
| Nix modules | Có | Không có | **Không** — theo priority | Ngang hàng, trùng là lỗi | Có (`anon-N`), ngang hàng |
| `ap` hiện tại | Có (khác `presets`/`extends`) | Tên file + `$schema` + chặn `presets`/`extends` sai chỗ; `kind` không kiểm | Có (`shadows: ['*']`) | Ngang hàng, khác source → `preset-clash` | Không |

`ap` là tổ hợp hiếm: Preset với nhau **ngang hàng và báo xung đột** (như Compose/Nix), nhưng Config **thắng tất cả** (như
Renovate/ESLint/TS). Tổ hợp này chính là thứ Compose phải dùng thêm override file mới đạt được.

## Hàm ý cho `ap`

**A. Giữ cùng hình dạng, đặt tên khái niệm, sửa `CONTEXT.md`.**
Mọi công cụ khảo sát đều để file gốc cùng hình dạng với preset (bảng mục 3); không công cụ nào bắt nội dung riêng của
file gốc phải nằm trong một file preset khác. Việc cần làm là sửa định nghĩa **Config** (đang nói chỉ khai báo "extra
marketplaces") và đặt tên cho khai báo nằm thẳng trong `spec` của Config — ví dụ **Direct declaration**: "a declaration
written in the Config's own `spec`; it outranks every selected Preset and never causes a `preset-clash`" (tên cụ thể cần
chốt trong `CONTEXT.md` theo rule glossary). Mô tả ngữ nghĩa bằng ADR 0004: Config đối với các Preset được chọn giống như
Preset con đối với cây `extends` — thay cả entry, in thông báo nếu khác. Đó cũng là cách Renovate ("regular config on
top") và ESLint (object chứa `extends` đứng sau cùng) mô tả.
- Ưu: không đổi code/schema; ví dụ ideaverse bỏ được một file mà kết quả không đổi (mục 1).
- Nhược: bản thân tài liệu không ngăn được nhầm lẫn khi đọc file; cần B để có lỗi rõ ràng.

**B. Kiểm tra `kind` ở runtime, hai chiều (kiểu Kustomize).**
File được nạp qua `spec.presets`/`spec.extends` phải có `kind: Preset`; file gốc phải có `kind: Config`. Lỗi nói rõ vai
trò, vd `./x.yaml is a Config, not a Preset; a Config cannot be selected by another Config`. Kustomize thêm kind riêng chính
vì "the kind further expresses how it should be used" và kiểm tra cả hai chiều (mục 2.6); Babel cho thấy kiểm tra theo
ngữ cảnh nạp là đủ để giữ cùng hình dạng mà vẫn báo lỗi đúng chỗ (mục 2.4). Hiện `ap` đã có nửa kiểm tra (chặn
`presets`/`extends` sai chỗ); `kind` lấp nửa còn lại, và thay lỗi tình cờ của `presets: [mcp-servers]` bằng một lỗi nói
đúng rằng file đó là `McpCatalog` (mục 1).
- Ưu: rẻ (vài dòng trong `resolveConfig`/`collect`), lỗi sớm và đúng thuật ngữ; không đổi hình dạng.
- Nhược: file thiếu `kind` sẽ lỗi. Schema vốn đã `required: ["kind", ...]` và mọi Bundled preset/example hiện có đều có
  `kind`, nên rủi ro thấp; Remote preset của bên thứ ba có thể thiếu — nếu cần thì mặc định thiếu `kind` = Preset khi nạp
  qua tham chiếu (giống Kustomize mặc định `Kustomization`) và chỉ báo lỗi khi `kind` là giá trị khác.

**C. Preset inline vô danh trong `spec.presets` (kiểu ESLint/Babel/Nix) — không khuyến nghị.**
Ở cả ba công cụ, preset inline cùng hạng với preset tham chiếu (mục 2.3, 2.4, 2.8). Với `ap` nghĩa là inline Preset là
**ngang hàng** → trùng với Preset khác thì `preset-clash`, khác hẳn khai báo thẳng trong Config (luôn thắng). Người dùng sẽ
có hai chỗ trong cùng một file với hai luật ưu tiên khác nhau, đúng loại "hai cơ chế ghép song song" mà ESLint thừa nhận là
"a mess" (mục 2.3). Ngoài ra phải đặt id cho Preset vô danh (Nix dùng `anon-N`) để ghi vào Lock/notice.
Chỉ đáng cân nhắc nếu sau này có nhu cầu thật về "khai báo ngang hàng nhưng không muốn tách file".

**D. Key riêng cho khai báo của Config (vd `spec.own`, `spec.overrides`) — không khuyến nghị.**
Không công cụ nào khảo sát đặt nội dung riêng của file gốc dưới một key riêng; `overrides` của Babel/eslintrc là để áp
theo điều kiện file, không phải để phân biệt gốc/preset, và ESLint gọi `overrides` là khó hiểu (mục 2.3). Compose buộc
dùng override file riêng và docs tự nêu nhược điểm số file tăng (mục 2.7). Key riêng làm Config và Preset **khác** hình
dạng ở mọi nơi, nhân đôi schema, mà không mang thêm ngữ nghĩa nào vì luật "Config thắng" đã cố định.

**E. Quy ước file và tài liệu (bổ sung cho A).**
- Dòng `$schema` (`config.schema.json` vs `preset.schema.json`) đã cho editor phân biệt; giữ nó trong mọi template.
- Docs/`ap init` nói rõ khi nào nên tách Local preset: khi khối khai báo được dùng lại ở nhiều Config, hoặc khi muốn nó bị
  ghi đè/kiểm tra xung đột như một Preset. Nếu chỉ một Config dùng, khai báo thẳng trong Config.

**Khuyến nghị:** A + B (+ E). Giữ cùng hình dạng `spec` vì đây là chuẩn chung và luật "Config thắng mọi Preset" của `ap`
trùng với Renovate/ESLint/TS/Babel; biến sự khác biệt thành **tên trong `CONTEXT.md`** và **lỗi runtime theo `kind`** thay
vì tách cấu trúc. Sửa ví dụ `examples/ideaverse-os` thành `presets: [base]` + khai báo thẳng để làm mẫu. Không thêm Preset
inline hay key riêng vì cả hai tạo ra luật ưu tiên thứ hai trong cùng một file, đi ngược ADR 0004 (ngang hàng vs ghi đè
được giữ tách bạch có chủ ý).
