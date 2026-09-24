# Plugin khai báo `scope: user` luôn được sync lên Scope `user`

Một số plugin, như `claude-code-setup` hay `commit-commands`, là tiện ích cá nhân mà người dùng muốn có ở mọi repo, kể cả repo không dùng `ap`. [ADR 0011](0011-user-scoped-marketplace.md) đã loại việc đưa *cả* plugin của một marketplace lên `user`, vì bật plugin nào là quyết định riêng của từng repo. ADR này không đảo quyết định đó mà thu hẹp nó: người khai báo chọn rõ từng plugin một.

Plugin declaration nhận thêm dạng map `name@marketplace: { enabled: true, scope: user }`, gọi là **User-scoped plugin**. Dạng boolean giữ nguyên. Dạng map chỉ nhận `enabled` và `scope`; `scope` chỉ nhận `user`; trường khác là `ConfigError`. Dù Sync nhắm Scope nào, `ap` luôn cài, bật và gỡ plugin đó ở Scope `user`.

Ràng buộc:

- Chỉ nhận `enabled: true`. Tắt plugin ở `user` nghĩa là tắt ở mọi repo không tự bật lại, dễ gây bất ngờ, nên `enabled: false` kèm `scope: user` là `ConfigError`.
- Marketplace của plugin phải là User-scoped marketplace, để settings `user` tự đứng được mà không phụ thuộc vào việc repo nào đã sync trước. Shorthand declaration không thể là User-scoped marketplace, nên plugin trỏ vào nó cũng bị báo lỗi.

Luật sở hữu giữ nguyên như [ADR 0003](0003-managed-entries-per-scope-state.md) và ADR 0011. Plugin entry là Managed entry được đếm theo claim trong `~/.agent-plugins/state.json`, khóa theo (đường dẫn Config, Scope đang sync), và chỉ bị gỡ khi không còn Config nào claim. `scope` là một phần của khai báo: khai báo giống hệt nhau thì gộp, hai Preset ngang hàng bất đồng là preset clash, Config ghi đè Preset kèm notice. Lock không ghi entry này.

## Considered Options

- Không thêm gì, dùng `ap sync --scope user` với một Config riêng: vẫn dùng được, nhưng phải quản lý hai Config và bỏ plugin khỏi Preset dùng chung.
- Khóa riêng trong spec (`spec.userPlugins`): bị loại vì cùng lý do ADR 0011 loại `spec.userMarketplaces`.
- Hậu tố trong key (`name@marketplace#user`): bị loại vì dễ nhầm với ký hiệu `@`.
- Cho phép cả `enabled: false` ở `user`: hoãn lại; có thể mở rộng sau mà không phá cú pháp.
- Không ràng buộc marketplace, dựa vào việc Installed marketplace dùng chung cả máy: bị loại vì settings `user` sẽ trỏ tới một marketplace mà Scope đó không biết.

## Consequences

- Một lần sync `project` hoặc `local` có thể cài plugin vào `~/.claude/settings.json`. `--dry-run` gắn nhãn `(user)` cho các action đó, và `--check` tính entry lệch ở `user` là drift.
- Action plugin ở `user` chạy sau action marketplace ở `user`. Nếu marketplace thất bại, plugin báo `not ready`.
- Repo muốn opt-out thì khai báo lại `name@marketplace: false` (không có `scope`) trong Config: claim ở `user` của Config đó bị bỏ, `false` được ghi vào project settings, và Claude Code ưu tiên project hơn user.
- Thêm hoặc bỏ `scope: user` trên một plugin đang Managed ở Scope kia sẽ cài hoặc bật ở Scope mới trước rồi mới gỡ ở Scope cũ. Nếu Scope cũ là `user` mà Config khác còn claim thì chỉ bỏ claim, không gỡ.
- Khi Sync đã nhắm `user`, `scope: user` không có tác dụng.
