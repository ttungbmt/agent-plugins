# Thiết kế `ap sync` (v1)

Thuật ngữ: xem [CONTEXT.md](../../CONTEXT.md). Quyết định kiến trúc: [ADR 0001](../adr/0001-delegate-settings-writes-to-claude-cli.md), [0002](../adr/0002-config-kind-naming.md), [0003](../adr/0003-managed-entries-per-scope-state.md).

## Phạm vi

- Chỉ đồng bộ `marketplaces` → `extraKnownMarketplaces`.
- Để sau: `plugins` → `enabledPlugins`, sinh marketplace cục bộ `.agent-plugins/marketplace`, cú pháp `github:owner/repo/path@ref` cho preset.

### `plugins` (để sau, đã chốt luật)

- Dạng chuẩn: map `name@marketplace: bool`, khớp 1:1 với `enabledPlugins`. Dạng list `name@marketplace` là viết tắt cho toàn bộ `true`.
- Gộp như `marketplaces`: Preset cha trước, con sau, `spec.plugins` của Config gộp cuối; trùng khoá → giá trị sau thắng, nên `false` tắt được plugin Preset cha đã bật.
- Hậu tố `@marketplace` phải là tên một marketplace khai báo dạng map trong chuỗi gộp; không có → lỗi. Dạng rút gọn `owner/repo` chưa biết tên trước `add` nên không tham chiếu được.
- Bật plugin nguồn ngoài qua `enabledPlugins` ở scope `project` không cài cho người khác → `ap` gọi `claude plugin install <plugin>@<marketplace> --scope <scope>`, không chỉ ghi settings.

## Hành vi

### Đầu vào

- `agent-plugins.yaml` (`kind: Config`, schema `config.schema.json`). Thiếu file → lỗi, gợi ý `ap init`.
- `spec.presets` của Config (chọn Preset) và `spec.extends` của Preset (kế thừa, một tham chiếu hoặc list) — mỗi tham chiếu:
  - tên trần → Preset mặc định trong `packages/presets`, tìm theo tên file; `metadata.name` phải trùng tên file.
  - `./…`, `../…` → Preset cục bộ, tương đối với file chứa tham chiếu.
  - `https://…` → Preset từ xa; `sha256` nội dung ghim trong Lock, cache ở `.agent-plugins/cache/`; nội dung đổi → lỗi, `--update` để chấp nhận.
- Preset kế thừa bằng `spec.extends` (tuỳ độ sâu); Config chỉ dùng `spec.presets`. Dùng lẫn → lỗi kèm gợi ý. Phát hiện vòng lặp. Mỗi Preset chỉ nạp một lần, ở lần gặp đầu tiên; thứ tự: cha trước, con sau. Tham chiếu tương đối trong Preset từ xa phân giải theo URL của nó.
- `spec.marketplaces` của Config được gộp cuối.
- Dạng rút gọn `owner/repo` → `{ source: { source: github, repo } }`. Dạng map giữ nguyên mọi field.
- `path` tương đối của nguồn `directory`/`file` trong một Preset cục bộ được tính theo file Preset đó rồi quy về thư mục Config; trong Preset từ xa thì là lỗi.

### Luật trùng khai báo

- Preset thắng mọi Preset nằm trong cây `extends` của nó (theo đồ thị, kể cả khi Preset cha đã nạp qua nhánh khác): thay cả entry (source + field phụ), in thông báo nếu khác.
- Hai Preset ngang hàng (không Preset nào kế thừa Preset kia) cùng tên, cùng source → gộp, field phụ của Preset sau thắng; khác source → lỗi. Managed entry của tên đang lỗi được giữ nguyên.
- Config trùng tên (hoặc trùng source với khai báo rút gọn) với Preset → Config thắng, in thông báo nếu khác.

### Ghi settings

- `--scope project|local|user`, mặc định `project`.
- Thêm: `claude plugin marketplace add <source> --scope <scope>`; sau đó `ap` bổ sung field phụ (`autoUpdate`, `ref`…) và sửa `path` của nguồn `directory` về tương đối.
- Gỡ: `claude plugin marketplace remove <name> --scope <scope>`.
- Giới hạn v1: nguồn `settings` và `hostPattern` chưa hỗ trợ (action báo `failed`); `ref`/`path` của github chỉ được ghi vào settings sau `add`, bản cài tại máy vẫn là bản `add` tải về.

### Sở hữu

- Chỉ động vào Managed entry (ghi trong Lock/State).
- Managed entry không còn được khai báo → gỡ.
- Managed entry bị xoá tay khỏi settings → thêm lại.
- Manual entry trùng tên, khác source hoặc khác field phụ đã khai báo → lỗi; `--force` để ghi đè (entry thành Managed).
- Manual entry trùng source với khai báo rút gọn → coi như đã khớp, không nhận quyền sở hữu.
- Managed entry phải khớp đúng khai báo: field phụ bị bỏ khỏi khai báo cũng được gỡ khỏi settings.
- Dạng rút gọn chưa biết tên trước `add`: khớp theo source đã chuẩn hoá với Lock/State. Sau `add`, nếu tên trả về trùng một Manual entry khác source → khôi phục entry cũ, báo xung đột.
- Lock `agent-plugins.lock` (scope `project`, commit, YAML): Managed entry (`name`, `source`, preset khai báo) + `sha256` các Preset từ xa. State: `.agent-plugins/state.local.json` (`local`, gitignore), `~/.agent-plugins/state.json` (`user`, chia theo đường dẫn Config để repo khác không gỡ nhầm).
- Managed entry đã biến khỏi settings và không còn được khai báo → chỉ xoá khỏi Lock/State.

### Chế độ và lỗi

- `--dry-run`: in kế hoạch, exit ≠ 0 chỉ khi có xung đột. `--check`: exit ≠ 0 nếu lệch. Cả hai không cần CLI `claude` và không ghi gì xuống đĩa (kể cả cache).
- Lock chỉ được tạo khi có nội dung.
- Apply: chạy hết, báo lỗi tổng hợp, exit ≠ 0 nếu có lỗi. Lock/State chỉ ghi entry thành công.

## Module

| Phụ thuộc | Loại | Test |
|---|---|---|
| phân giải, diff, luật sở hữu | in-process | gọi thẳng |
| YAML, settings, Lock/State | filesystem cục bộ | thư mục tạm |
| CLI `claude` | external | port `exec` + fake |
| tải Preset từ xa | external | port `fetch` + fake |

### Interface ngoài

```ts
// packages/cli/src/sync/index.ts
export type Scope = 'project' | 'local' | 'user'
export type SyncMode = 'apply' | 'dry-run' | 'check'

export function sync(
  opts: { cwd: string; scope: Scope; mode: SyncMode; force?: boolean; update?: boolean },
  deps: { exec: Exec; fetch: Fetch; homedir: string; defaultPresetsDir: string },
): Promise<SyncReport>

export type SyncReport = {
  actions: Array<{
    kind: 'add' | 'remove' | 'readd' | 'patch'
    name: string | null
    source: MarketplaceSource | null // null với remove
    status: 'planned' | 'done' | 'failed'
    error?: string
  }>
  conflicts: Array<{ name: string; reason: 'manual-entry' | 'preset-clash'; detail: string }>
  notices: string[]
  inSync: boolean
}
```

Lệnh oclif `ap sync` là adapter mỏng: parse flag → `sync()` với `exec`/`fetch` thật → in báo cáo → exit code (≠ 0 khi có `failed`, có `conflicts`, hoặc `check` mà `!inSync`).

Bề mặt test chính: `sync()` trên thư mục tạm, `exec` giả mô phỏng `claude` bằng cách ghi `settings.json`.

### Seam nội bộ

```ts
resolveConfig(configPath: string, ctx: { fetch; pins; update; cacheDir; writeCache?; defaultPresetsDir })
  : Promise<{ declarations: MarketplaceDeclaration[]; pins: PresetPins; conflicts: Conflict[]; notices: string[] }>

planSync(desired: MarketplaceDeclaration[], actual: KnownEntry[], managed: ManagedEntry[], opts: { force: boolean; blocked?: string[] })
  : { actions: PlannedAction[]; conflicts: Conflict[]; forgotten: string[] }

createRegistry({ exec, cwd, homedir }): {
  list(scope: Scope): Promise<KnownEntry[]>
  put(decl, scope, { mayReplace }): Promise<{ name: string }> // add + patch; khôi phục + ConflictError khi đè Manual entry
  patch(decl, name: string, scope: Scope): Promise<void>
  remove(name: string, scope: Scope): Promise<void>
}
```

Đọc/ghi Lock/State là hàm nội bộ của `sync`, không tách module (chỉ một bên gọi).
