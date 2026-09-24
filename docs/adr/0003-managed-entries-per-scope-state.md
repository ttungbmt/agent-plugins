# `ap` chỉ quản lý Managed entry, trạng thái lưu theo scope

`ap sync` chỉ thêm/sửa/gỡ những Known marketplace entry do chính nó tạo, ghi nhận trong `agent-plugins.lock` (scope `project`, commit) hoặc State (`.agent-plugins/state.local.json` cho `local`, `~/.agent-plugins/state.json` cho `user`, không commit). Manual entry không bao giờ bị động tới; nếu trùng tên nhưng khác `source` thì báo lỗi, chỉ ghi đè khi có `--force`. Cách này cho phép gỡ entry đã bỏ khỏi Preset mà không xoá mất chỉnh sửa tay, và không commit trạng thái cá nhân.

Manual entry đã khớp đúng khai báo thì được nhận quản lý (ghi vào Lock/State, không sửa settings, báo một lần). Để nguyên nó như Manual entry thì mỗi lần sync lại phải báo "không quản lý" mãi, và bỏ khai báo sau này cũng không gỡ được; còn nhận nó thì không mất gì của người dùng vì nội dung đã giống hệt khai báo. Manual entry có thêm field chưa khai báo thì vẫn để nguyên, vì nhận quản lý sẽ gỡ các field đó.

Settings của scope `user` dùng chung giữa các repo nên sở hữu được đếm theo claim: State của mỗi Config ghi các tên nó đang khai báo. Một entry chỉ bị gỡ khi không còn Config nào claim nó; nếu còn, quyền sở hữu được giao cho Config đang claim. Hai Config khai báo cùng tên theo hai cách khác nhau là xung đột mà `--force` không vượt qua, vì nếu cho ghi đè thì mỗi lần sync ở repo này lại đảo ngược repo kia.

## Considered Options

- Sở hữu toàn bộ key `extraKnownMarketplaces` (ghi đè mỗi lần sync) — bị loại vì làm mất Manual entry.
- Không bao giờ nhận Manual entry, kể cả khi đã khớp khai báo — từng áp dụng, bị bỏ vì thông báo lặp mỗi lần sync và entry không bao giờ được gỡ khi bỏ khai báo.
- Chỉ thêm, không bao giờ gỡ — bị loại vì entry cũ tích tụ mãi.
- Một file lock chung cho mọi scope — bị loại vì trạng thái cá nhân sẽ bị commit.
