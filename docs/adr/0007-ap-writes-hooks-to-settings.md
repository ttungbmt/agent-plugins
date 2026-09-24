# Hook: `ap` tự ghi khoá `hooks` trong settings

`spec.hooks` là map theo tên chỉ tồn tại trong `ap`; mỗi tên là một nhóm matcher (`event`, `matcher`, `hooks`) và các handler được ghi nguyên văn. `ap` tự đọc và ghi khoá `hooks` trong `settings.json` của Scope, vì `claude` CLI không có lệnh nào ghi hook (không có `claude hooks`, `/hooks` chỉ để xem, tài liệu bảo sửa thẳng JSON — xem [research](../research/hooks.md)). Đây là ngoại lệ bắt buộc của [ADR 0001](0001-delegate-settings-writes-to-claude-cli.md), cùng loại với [ADR 0005](0005-ap-installs-skills-itself.md).

Chỉ nhận hook tự đủ: lệnh inline, lệnh tải qua trình quản lý gói, hoặc đường dẫn tới file đã có trong repo. Hook cần kèm script thì đóng thành plugin và khai báo qua `spec.plugins` — đóng gói script là việc của plugin (`${CLAUDE_PLUGIN_ROOT}`).

Hook là code tuỳ ý chạy với quyền người dùng, kể cả không qua hộp thoại tin cậy ở chế độ `-p`. Vì vậy hook đến từ Preset từ xa phải được xác nhận khi mới thêm hoặc đổi nội dung; chạy không tương tác thì cần `--yes`. Cùng lý do với việc [ADR 0006](0006-mcp-servers-inline-plus-bundled-catalog.md) không tự duyệt `.mcp.json`.

## Considered Options

- Sinh một plugin cục bộ chứa `hooks/hooks.json` rồi cài bằng `claude plugin install` — giữ được ADR 0001 nhưng phải tự sinh marketplace và plugin, cần `/reload-plugins`, và bản trong plugin không được gộp trùng với bản trong settings.
- Không có `spec.hooks`, chỉ dùng plugin — bị loại vì hook nhỏ tự đủ (thông báo, format) phải đóng cả một plugin.
- Chép nguyên định dạng `hooks` của Claude Code, không đặt tên — bị loại vì `extends` không ghi đè được và `false` không bỏ được từng hook.
- `ap` copy cả file script (thêm một loại item có Nguồn và Bản cài) — để sau, khi thật sự cần.
- Cấm hook trong Preset từ xa — bị loại vì quá chặt; xác nhận khi nội dung đổi là đủ vì Preset từ xa đã ghim theo nội dung.

## Consequences

- `ap sync` ghi thẳng `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`; phải giữ nguyên mọi khoá khác và mọi hook không do `ap` quản lý.
- Claude Code tự nạp lại settings khi file đổi, nên không có bước cài.
- `ap` có bước xác nhận tương tác đầu tiên; `--dry-run`/`--check` không hỏi.
- Hook không có định danh trong settings, nên `ap` nhận ra Bản cài hook của mình bằng nội dung: mỗi Khai báo hook là một nhóm matcher riêng, Lock/State lưu tên → nguyên nhóm đã chuẩn hoá (như `ManagedMcp` của ADR 0006). Không gắn khoá lạ kiểu `x-ap` vào settings, vì tài liệu không bảo đảm và schema SchemaStore từ chối. Nhóm bị sửa tay (không còn nhóm nào khớp) là xung đột theo [ADR 0003](0003-managed-entries-per-scope-state.md), chỉ ghi đè khi có `--force`.
- Chưa có danh mục hook: giá trị `true` là lỗi, để dành cho sau này.
- `disableAllHooks`, `allowManagedHooksOnly` hoặc `strictPluginOnlyCustomization: ["hooks"]` đang bật → vẫn ghi, cảnh báo trong plan.
- Luật secret của ADR 0006 áp cho `headers` của handler `http`: giá trị giống secret mà không phải `${…}` → lỗi; `${VAR}` không có trong `allowedEnvVars` của handler → cảnh báo, vì Claude Code sẽ không mở rộng nó.
- Khai báo hook dùng `${CLAUDE_PROJECT_DIR}` hoặc đường dẫn tương đối mà nhắm scope `user` → cảnh báo (hook chạy ở mọi project, thiếu file thì lỗi nhưng không chặn); không chặn vì có người cố ý dùng.
- Không so trùng với hook trong plugin đang bật: Claude Code không gộp trùng giữa hai nơi, nhưng lệnh trong plugin dùng `${CLAUDE_PLUGIN_ROOT}` nên hiếm khi trùng chữ.
- Xác nhận áp dụng cho Khai báo hook có nguồn gốc (Preset định nghĩa nó sau cùng khi ghi đè) là Preset từ xa và nội dung chưa có trong Lock/State. Không có TTY và thiếu `--yes` → bỏ qua các hook đó, cảnh báo, exit code khác 0; phần còn lại vẫn sync.
