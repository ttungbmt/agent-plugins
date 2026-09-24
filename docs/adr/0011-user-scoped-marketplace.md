# Marketplace khai báo `scope: user` luôn được sync lên Scope `user`

Một số marketplace, như `claude-plugins-official`, được gần như mọi repo dùng, nên người dùng muốn chúng nằm trong `~/.claude` chứ không lặp lại trong settings của từng project. Vì vậy Marketplace declaration dạng map nhận thêm `scope: user`, gọi là **User-scoped marketplace**. Dù Sync nhắm Scope nào, `ap` luôn thêm, sửa và gỡ entry đó ở Scope `user`. Plugin declaration dùng marketplace này vẫn nằm ở Scope đang sync. Với `claude` 2.1.281, cài plugin ở `project` từ một marketplace chỉ khai báo ở `user` vẫn thành công, vì bản cài marketplace dùng chung cả máy theo tên.

Luật sở hữu giữ nguyên như [ADR 0003](0003-managed-entries-per-scope-state.md). Entry là Managed entry được đếm theo claim trong `~/.agent-plugins/state.json`, và chỉ bị gỡ khi không còn Config nào claim nó. Nhờ vậy, một repo bỏ khai báo không làm mất marketplace mà repo khác đang dùng. Claim được lưu theo khóa (đường dẫn Config, Scope đang sync), để một lần sync `project` và một lần sync `--scope user` của cùng Config không ghi đè claim của nhau. Lock không ghi entry này: khai báo trong Preset hoặc Config đã là bản ghi được commit.

## Considered Options

- Chạy `ap sync --scope user` riêng: vẫn dùng được, nhưng lệnh này đưa cả Config lên `user` (plugins, skills, MCP servers…), không riêng marketplace.
- Chỉ thêm, không bao giờ gỡ ở `user`: bị loại vì cùng lý do ADR 0003 đã loại cách này, entry cũ sẽ tích tụ mãi.
- Khóa riêng trong spec (`spec.userMarketplaces`): bị loại vì thêm một khái niệm song song với `marketplaces` mà chỉ khác Scope đích.
- Hỗ trợ trong dạng shorthand (`owner/repo@user`): bị loại vì dễ nhầm với ký hiệu `@ref`.
- Đưa cả plugin của marketplace đó lên `user`: bị loại vì bật plugin nào là quyết định riêng của từng repo, còn marketplace chỉ là nguồn. [ADR 0012](0012-user-scoped-plugin.md) sau đó cho phép đưa từng plugin lên `user` khi người khai báo chọn rõ.
- Ghi entry vào Lock: bị loại vì sẽ trộn trạng thái của Scope `user` vào file được commit.

## Consequences

- Một lần sync `project` hoặc `local` có thể sửa `~/.claude/settings.json`. `--dry-run` gắn nhãn `(user)` cho các action đó, và `--check` tính entry lệch ở `user` là drift.
- Action marketplace ở `user` chạy trước mọi action plugin. Nếu chúng thất bại, plugin phụ thuộc báo `not ready`.
- `checkMarketplaces` coi một User-scoped marketplace là đã được khai báo cho plugin ở Scope đang sync.
- Chuyển entry giữa `project` và `user` sẽ thêm ở Scope mới trước rồi mới gỡ ở Scope cũ. Kiểm tra `cross-scope` không coi hai bản của cùng một khai báo là xung đột. Khi gỡ ở Scope cũ, `ap` tự xoá khoá trong `extraKnownMarketplaces` thay vì gọi `claude plugin marketplace remove`, vì lệnh đó xoá luôn các plugin `*@<tên>` của Scope đó, trong khi các plugin này vẫn đang được khai báo.
- Gỡ entry khỏi `user` trong lúc Scope `user` còn plugin `*@<tên>` là xung đột `manual-entry`; `--force` vẫn gỡ được.
- Người clone repo phải chạy `ap sync` thì marketplace mới có ở `user`. Settings của project không chứa gì để `claude` tự tìm ra nó.
- Dạng map giờ chỉ nhận `source`, `autoUpdate` và `scope`. Trường khác bị báo lỗi thay vì bị chép nguyên vào settings.
