# Rule là từng file, cài vào Namespace của nguồn

Claude Code không cho plugin ship rules, nên `ap` tự cài Rule theo [ADR 0005](0005-ap-installs-skills-itself.md). Khác Skill/Agent, Rule không có tên: Claude Code chỉ biết đường dẫn của file trong thư mục rules. Vì vậy một Rule là **một file `.md`**, định danh bằng đường dẫn tương đối trong Nguồn rule (bỏ `.md`). Chọn một thư mục trong Khai báo rule nghĩa là chọn mọi Rule dưới nó. Mọi Rule của một nguồn được cài vào **Namespace** `.claude/rules/<ns>/…` (hoặc `<claude config dir>/rules/<ns>/…`), giữ nguyên cấu trúc thư mục của nguồn. `<ns>` mặc định là tên repo viết thường, đổi được bằng `as`. Chỉ nhận định dạng Rule của Claude Code.

## Considered Options

- Rule = thư mục nhóm (như Skill), khớp cách ECC chia `common/`, `web/`: bị loại vì các nguồn phẳng như awesome-claude-code-toolkit hay awesome-copilot được chọn theo từng file. Chọn theo tiền tố thư mục vẫn cho phép viết `rules: [common, web]`.
- Rule là file hoặc thư mục: bị loại vì có hai loại định danh, và một file có thể bị chọn hai lần.
- Cài phẳng vào `.claude/rules/` không Namespace: bị loại vì các nguồn trùng tên file (`coding-style.md`, `security.md`…), và làm phẳng thì hỏng link `../common/x.md` của ECC.
- Chuyển đổi `*.instructions.md` của Copilot (`applyTo` → `paths`): để sau. Đây sẽ là lần đầu `ap` sửa nội dung khi cài, nên hash và việc nhận quản lý khi trùng nội dung đều phải đổi theo. Copy nguyên vẹn thì `applyTo` bị Claude Code bỏ qua và file luôn được nạp.

## Consequences

- `ap` chỉ quét các Namespace đang được khai báo hoặc có trong Lock/State. File của người dùng ngay dưới `.claude/rules/` hay trong thư mục khác không bao giờ bị đụng tới. Trong Namespace, luật sở hữu áp theo từng file như Agent.
- Hai nguồn khác nhau cùng một Namespace gây `namespace-clash`. Đổi `as` là chuyển nhà: cài ở Namespace mới, gỡ Managed rule ở Namespace cũ.
- Thư mục Namespace là symlink được coi là Manual entry, và `ap` không ghi xuyên qua nó. Symlink còn có lý do riêng để không dùng: Claude Code chỉ nạp project rule symlink ra ngoài repo khi rule đó không có `paths`.
- Gốc rules trong nguồn là `path`, hoặc `rules/` nếu thiếu `path`. `ap` không tự dò `.claude/rules/` hay gốc repo, và bỏ qua `README.md`. Phụ thuộc giữa các nhóm (ECC `web` → `common`) không được suy ra; người dùng hoặc Preset tự liệt kê.
- Gặp file có `applyTo` hoặc đuôi `.instructions.md` thì `ap` cảnh báo. Muốn hỗ trợ sau này thì thêm một trường (vd. `format`) vào Khai báo rule mà không phá vỡ gì.
