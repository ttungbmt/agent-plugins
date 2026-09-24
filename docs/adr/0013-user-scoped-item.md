# Skill, Agent, Rule, Workflow khai báo `scope: user` luôn được sync lên Scope `user`

Một số Skill, như `find-skills` của `vercel-labs/skills` trong Preset `base`, là tiện ích cá nhân mà người dùng muốn có ở mọi repo, nên chúng thuộc về `~/.claude` chứ không phải bản copy trong `.claude/skills/` của từng project. [ADR 0011](0011-user-scoped-marketplace.md) và [ADR 0012](0012-user-scoped-plugin.md) đã giải bài toán này cho marketplace và plugin; ADR này áp dụng cùng ý tưởng cho các item `ap` tự cài ([ADR 0005](0005-ap-installs-skills-itself.md)).

Entry dạng map của Skill, Agent, Rule và Workflow declaration nhận thêm `scope: user`, gọi là **User-scoped item**:

```yaml
spec:
  skills:
    - source: vercel-labs/skills
      scope: user
```

Dù Sync nhắm Scope nào, `ap` luôn cài, cập nhật và gỡ mọi item mà entry đó chọn ở Scope `user`. Cả bốn kind dùng chung một luật vì chúng dùng chung `ItemHandler`, dạng khai báo và cơ chế claim. Với Sync `local`, đây là cách duy nhất để có item cá nhân mà không commit, vì Scope `local` không có thư mục item.

Ràng buộc:

- `scope` đặt trên entry nguồn, không theo từng item. Muốn tách thì viết hai entry cùng source. `scope` chỉ nhận `user`.
- Source phải là `github` hoặc `git`. Source `directory` kèm `scope: user` là `ConfigError`, vì đường dẫn tương đối theo từng repo và không có commit để pin, nên nội dung ở `user` sẽ phụ thuộc vào repo sync sau cùng.
- Entry dạng map chỉ nhận `source`, `<kind>s` hoặc `exclude`, `path` và `scope`; khóa khác là `ConfigError`. Trước đây khóa lạ bị bỏ qua im lặng, nên gõ nhầm `scope` sẽ lặng lẽ cài vào `project`.

Pin commit và Source catalog nằm trong `~/.agent-plugins/state.json` của Scope `user`, dùng chung cho mọi Config; Lock không ghi. Một thư mục `~/.claude/skills/<name>` chỉ có một nội dung, nên pin phải thuộc về Scope `user` chứ không phải repo. Luật sở hữu giữ nguyên như [ADR 0003](0003-managed-entries-per-scope-state.md): item là Managed entry được đếm theo claim, khóa theo (đường dẫn Config, Scope đang sync), và chỉ bị gỡ khi không còn Config nào claim. `scope` là một phần của khai báo: hai Preset ngang hàng bất đồng `scope` là preset clash, Config ghi đè Preset (hoặc Preset con ghi đè cha) kèm notice.

## Considered Options

- `scope` theo từng item (`skills: [{ name, scope }]`): bị loại vì phá dạng "một entry là một selection"; hai entry cùng source đã đủ để tách.
- Chỉ cho `scope: user` với dạng select, cấm "tất cả" và `exclude`: bị loại vì người khai báo đã chọn rõ `scope: user`, và pin commit giữ cho item mới của source chỉ xuất hiện khi `--update`.
- Chỉ hỗ trợ Skill: bị loại vì parser, store và claim đã generic theo kind; làm riêng cho Skill mới là trường hợp đặc biệt.
- Ghi pin vào Lock của repo: bị loại vì hai repo pin hai commit khác nhau cho cùng một thư mục ở `user` sẽ giằng co mỗi lần sync.
- Cho phép cài cùng item ở cả `project` và `user`: bị loại vì thứ tự ưu tiên khác nhau theo kind. Với Skill trùng tên, bản ở `user` thắng nên bản `project` bị che mất ([skills](https://code.claude.com/docs/en/skills.md)); với Agent thì ngược lại, bản ở `project` thắng ([sub-agents](https://code.claude.com/docs/en/sub-agents.md)). Một luật chung cho cả bốn kind không thể dựa vào việc che.
- Cho phép source `directory`: bị loại, xem ràng buộc ở trên. Item cá nhân từ thư mục local vẫn dùng được qua `ap sync --scope user` với Config riêng.

## Consequences

- Một lần sync `project` hoặc `local` có thể sửa `~/.claude/skills`, `agents`, `rules` và `workflows`. `--dry-run` gắn nhãn `(user)` cho các action đó, và `--check` tính item lệch ở `user` là drift.
- Người clone repo nhận commit mà State `user` của máy mình đang pin (hoặc commit mới nhất ở lần đầu), không phải commit tác giả repo đã thấy.
- `--update` trong một Sync `project` hoặc `local` cũng bump pin ở `user`, nên đổi nội dung item cho mọi repo trên máy.
- Không có cách opt-out bằng cách che như plugin `false` ở ADR 0012, vì với Skill bản `user` luôn thắng. Repo muốn opt-out thì Config ghi đè bằng entry cùng source không có `scope`: item đó về Scope đang sync và claim ở `user` của Config này bị bỏ.
- Chuyển entry giữa hai Scope sẽ cài ở Scope mới trước rồi mới gỡ ở Scope cũ. Nếu Scope cũ là `user` mà Config khác còn claim thì chỉ bỏ claim, không gỡ.
- Fetch thất bại cho một source ở `user` chỉ ảnh hưởng item của source đó, không chặn phần còn lại của Sync.
- Khi Sync đã nhắm `user`, `scope: user` không có tác dụng.
