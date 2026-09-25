# External plugin được sinh từ một danh sách pin sẵn

Repo này đồng thời là Marketplace `agent-plugins`, một kho plugin cá nhân chứ không phải tính năng của `ap`. Plugin
trong đó chia làm ba nhóm: Internal plugin (`plugins/internal/`), External plugin (`plugins/external/`) và Custom
plugin (`plugins/custom/`).

Mọi External plugin được khai báo trong một file duy nhất là `plugins/external.yaml`. Mỗi mục có `repo`, `ref` (commit
upstream đang pin), `track` (`branch`, mặc định, hoặc `tag`) và `skills` (tùy chọn). `scripts/external-plugins.mjs`
đọc file này và:

- với mục có `skills` (Vendored plugin): copy nguyên các thư mục đó từ upstream tại `ref` vào
  `plugins/external/<name>/`, giữ tên thư mục upstream, và sinh `.claude-plugin/plugin.json`;
- với mục không có `skills` (Referenced plugin): không copy gì;
- sinh lại các entry External plugin trong `.claude-plugin/marketplace.json`. Entry Internal plugin và Custom plugin vẫn
  viết tay và được giữ nguyên.

Script có ba lệnh: `pnpm plugins:update` kéo `ref` lên bản mới nhất theo `track` rồi chạy `sync`;
`pnpm plugins:sync` copy và sinh lại theo `ref` đang pin; `pnpm plugins:check` không ghi gì, chỉ exit khác 0 khi nội
dung trên đĩa hoặc `marketplace.json` lệch với danh sách.

## Luật trùng từng byte

Nội dung External plugin phải trùng từng byte với upstream tại `ref`. Thêm manifest hay chọn một tập con skill không
tính là sửa. Hễ sửa một file của upstream, plugin phải chuyển sang `plugins/custom/`. Nhờ luật này, `sync` và `update`
luôn được phép copy đè mà không mất gì, và `plugins:check` bắt được việc lỡ tay sửa.

## Chạy tay trước, GitHub Actions sau

Hiện tại người dùng tự chạy `pnpm plugins:update` khi muốn, review diff rồi commit. Nội dung skill chạy như prompt
trên máy người dùng, nên cập nhật upstream là một rủi ro chuỗi cung ứng: mọi thay đổi phải qua review. Sau này có thể
thêm workflow `schedule` gọi cùng các lệnh đó (chạy `check`, và `update` mở PR vào `dev`), không cần đổi script.

## Considered Options

- Entry trong `marketplace.json` trỏ thẳng repo upstream với `strict: false` và chọn skill bằng trường `skills` — bị
  loại: nội dung không nằm trong repo nên không review được bằng diff, và việc chọn tập con qua `strict: false` chưa
  được kiểm chứng.
- Git submodule tại `plugins/external/<name>` — bị loại: marketplace cài qua GitHub có thể không kéo submodule, và
  submodule không chọn được tập con skill.
- Cho `ap` tự bọc Skill source thành plugin — bị loại: đây là nhu cầu của kho cá nhân, không phải của người dùng `ap`
  (ADR 0001, 0005 vẫn nguyên).
- Mỗi plugin một file `upstream.json` — bị loại: Referenced plugin không có thư mục để chứa file đó.
- Sửa `marketplace.json` bằng tay — bị loại: mỗi lần cập nhật lại phải sửa `sha` bằng tay.

## Consequences

- Không được sửa tay `plugins/external/**` hay các entry External plugin trong `marketplace.json`; sửa
  `plugins/external.yaml` rồi chạy `pnpm plugins:sync`.
- Tên skill trong plugin theo tên thư mục upstream, ví dụ `vercel:composition-patterns`.
- Một Config dùng External plugin qua Marketplace declaration `ttungbmt/agent-plugins` chỉ thấy thay đổi sau khi `dev`
  merge vào `master`, vì Claude Code đọc nhánh mặc định.
