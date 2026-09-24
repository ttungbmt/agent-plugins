# Workflow cài phẳng theo `meta.name`, không cài workflow gắn với plugin

Plugin ship được workflow, nên `spec.workflows` chỉ lấp chỗ trống cho nguồn chứa file `.js` rời; phần cài đặt theo [ADR 0005](0005-ap-installs-skills-itself.md). Claude Code nhận workflow theo `meta.name` chứ không theo tên file, và không tìm trong thư mục con. Vì vậy một Workflow là **một file `.js`** có `export const meta` là object literal với `name` dạng chuỗi, đọc bằng parser JS (`acorn`). `ap` cài nó **phẳng** thành `.claude/workflows/<meta.name>.js` (hoặc `<claude config dir>/workflows/<meta.name>.js`), không Namespace. Gốc workflows trong nguồn là `path`, hoặc `workflows/` nếu thiếu `path`. Nghiên cứu: [docs/research/workflows.md](../research/workflows.md).

## Considered Options

- Không thêm `spec.workflows`, chỉ dựa vào plugin: bị loại vì các nguồn như `.claude/workflows/*.js` của một repo không đóng gói thành plugin.
- Định danh bằng tên file: bị loại vì Claude Code bỏ qua tên file, và nguồn thật có tên file khác `meta.name` (`extract-rules.js` chứa `modernize-extract-rules`).
- Đọc `meta.name` bằng regex: bị loại vì có nguồn minify cả script thành một dòng hoặc đặt comment trước `meta`.
- Giữ tên file của nguồn khi cài: bị loại vì hai nguồn cùng có `review.js` sẽ đè nhau, và tên file không nói lên định danh.
- Namespace theo thư mục như Rule ([ADR 0009](0009-rule-per-file-in-namespace.md)): bị loại vì Claude Code không tìm workflow trong thư mục con.
- Đổi tên bằng `as:`: để sau. Đây sẽ là lần đầu `ap` sửa nội dung file khi cài (phải viết lại `meta.name`), nên hash và việc nhận quản lý đều phải đổi theo.
- Chép workflow ra khỏi plugin: bị loại vì workflow của plugin gọi agent có tiền tố tên plugin (`ecc:code-reviewer`) nên chạy không được khi đứng riêng, còn khi plugin được bật thì plugin đã có sẵn workflow đó.

## Consequences

- Script có `agentType` dạng `<plugin>:<agent>` là gắn với plugin. Nó vẫn có trong Source catalog nhưng không được cài: chọn đích danh thì là xung đột, nằm trong "tất cả" thì bị bỏ qua kèm thông báo. `agentType` không tiền tố hoặc `workflow('<name>')` trỏ tới tên không có ở Scope và không được khai báo thì chỉ cảnh báo, không tự cài. Agent có sẵn của Claude Code không tính là thiếu.
- Vì không có Namespace, `ap` đọc `meta.name` của **mọi** file `*.js` trong thư mục workflows đích, kể cả Manual entry. Việc nhận quản lý dựa trên `meta.name`, không dựa trên tên file: cùng tên và cùng nội dung thì nhận quản lý; cùng tên nhưng khác nội dung là xung đột; hai Manual entry trùng tên chỉ được cảnh báo (Claude Code tự chọn một trong hai mà không báo gì). Trùng tên giữa các nguồn trong khai báo theo luật trùng khai báo như Skill/Agent.
- `meta.name` có ký tự không dùng được trong tên file thì file đó không phải Workflow. Chưa hỗ trợ `.mjs`, `<dir>/workflow.js`, thư mục helper hay workflow nhiều file.
- Scope `local` không có thư mục workflows, nên bỏ qua kèm thông báo. Symlink là Manual entry.
- `ap` không bao giờ ghi `Workflow(<name>)` vào `permissions.allow`; người dùng tự duyệt, như với MCP server trong `.mcp.json`. `ap` vẫn cài khi workflow đang bị tắt, nhưng cảnh báo nếu settings hoặc biến môi trường cho thấy điều đó (`disableWorkflows`, `enableWorkflows: false`, `CLAUDE_CODE_DISABLE_WORKFLOWS`).
