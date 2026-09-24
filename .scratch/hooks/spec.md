---
title: Hỗ trợ Hook trong `ap sync`
labels: [ready-for-agent]
---

Thuật ngữ: [CONTEXT.md](../../CONTEXT.md) mục Hook và Sở hữu. Quyết định: [ADR 0007](../../docs/adr/0007-ap-writes-hooks-to-settings.md), dựa trên [ADR 0001](../../docs/adr/0001-delegate-settings-writes-to-claude-cli.md), [ADR 0003](../../docs/adr/0003-managed-entries-per-scope-state.md), [ADR 0004](../../docs/adr/0004-preset-extends-vs-config-presets.md), [ADR 0006](../../docs/adr/0006-mcp-servers-inline-plus-bundled-catalog.md). Nguồn: [docs/research/hooks.md](../../docs/research/hooks.md).

## Problem Statement

Claude Code chạy hook từ khoá `hooks` trong `settings.json` của từng Scope. Hook nhỏ và tự đủ (thông báo khi xong việc, format file sau khi sửa, chặn lệnh nguy hiểm) hiện chỉ cài được theo hai cách:
- sửa tay `settings.json`, nên không chia sẻ được giữa các repo và không gỡ được một cách an toàn;
- đóng hẳn thành một plugin, quá nặng cho một lệnh một dòng.

`claude` CLI không có lệnh nào để thêm hoặc gỡ hook, còn `/hooks` chỉ để xem. Người dùng `ap` đã khai báo được marketplace, plugin, skill, agent và MCP server trong `agent-plugins.yaml`, nhưng chưa khai báo được Hook. Họ cũng không có cách nào kế thừa hook qua Preset rồi ghi đè hoặc bỏ đi.

Hook là code tuỳ ý chạy với toàn quyền của người dùng. Nếu cho Preset từ xa thêm hook mà không có bước nào để người dùng nhìn thấy, người viết preset đó sẽ chạy được lệnh trên máy người dùng.

## Solution

Thêm `spec.hooks` vào Config và Preset. Đó là map theo tên, mỗi tên là một Khai báo hook:

```yaml
spec:
  hooks:
    format-on-edit:
      event: PostToolUse
      matcher: Edit|Write
      hooks:
        - { type: command, command: "jq -r .tool_input.file_path | xargs npx prettier --write" }
    notify: false        # bỏ Hook kế thừa từ Preset cha
```

`ap sync` tự ghi mỗi Khai báo hook thành **một nhóm matcher riêng** trong khoá `hooks` của `settings.json` ở Scope đích. Nó giữ nguyên mọi khoá khác và mọi Hook của người dùng. Lock/State ghi lại nhóm đã ghi, để lần sync sau sửa hoặc gỡ đúng nhóm đó. Tên của Khai báo hook chỉ tồn tại trong `ap`, không bao giờ xuất hiện trong settings.

Hook đến từ Preset từ xa mà mới thêm hoặc đổi nội dung thì được hiện đầy đủ và phải xác nhận. Chạy không tương tác thì cần `--yes`, nếu thiếu thì các hook đó bị bỏ qua và lệnh trả exit code khác 0.

## User Stories

1. Là người dùng `ap`, tôi muốn khai báo một hook trong `agent-plugins.yaml`, để hook đó được ghi vào settings mà tôi không phải sửa tay JSON.
2. Là người dùng `ap`, tôi muốn đặt tên cho mỗi hook, để có thể nhắc tới, ghi đè hoặc bỏ nó ở nơi khác.
3. Là người dùng `ap`, tôi muốn viết handler đúng định dạng của Claude Code, để chép được ví dụ từ tài liệu mà không phải học thêm cú pháp.
4. Là người dùng `ap`, tôi muốn dùng được mọi loại handler (`command`, `http`, `mcp_tool`, `prompt`, `agent`) và mọi field của chúng, kể cả field mới mà `ap` chưa biết, để `ap` không bị chậm hơn Claude Code.
5. Là người dùng `ap`, tôi muốn `ap` báo lỗi khi handler thiếu `type` hoặc thiếu field bắt buộc của type đó, để thấy lỗi trước khi Claude Code lặng lẽ bỏ qua hook.
6. Là người dùng `ap`, tôi muốn chỉ bị cảnh báo khi dùng tên event mà `ap` không biết, để vẫn dùng được event mới của Claude Code.
7. Là người dùng `ap`, tôi muốn bỏ trống `matcher`, để hook áp cho mọi tool hoặc cho event không nhận matcher.
8. Là tác giả Preset, tôi muốn khai báo hook trong Preset, để mọi Config chọn Preset đó đều nhận được hook.
9. Là tác giả Preset con, tôi muốn ghi đè một hook của Preset cha bằng cách khai báo cùng tên, để đổi lệnh mà không phải sửa Preset cha.
10. Là tác giả Preset con, tôi muốn viết `tên: false` để bỏ một hook kế thừa, để không phải nhận hook mình không muốn.
11. Là người dùng `ap`, tôi muốn thấy thông báo khi một Preset ghi đè hook cùng tên của Preset khác, để biết hook nào đang thắng.
12. Là người dùng `ap`, tôi muốn gặp xung đột khi hai Preset ngang hàng khai báo cùng tên hook với nội dung khác nhau, để không bị âm thầm chọn một bên.
13. Là người dùng `ap`, tôi muốn `ap` báo lỗi khi giá trị của một hook là `true`, vì chưa có danh mục hook.
14. Là người dùng `ap`, tôi muốn sync được hook vào cả ba Scope `project`, `local` và `user`, vì cả ba đều có `settings.json`.
15. Là người dùng `ap`, tôi muốn `ap` giữ nguyên mọi khoá khác trong `settings.json`, để việc ghi hook không làm hỏng permissions, plugin hay marketplace.
16. Là người dùng `ap`, tôi muốn `ap` không bao giờ sửa hay gỡ Hook tôi tự viết, để hook cá nhân của tôi an toàn.
17. Là người dùng `ap`, tôi muốn mỗi hook của `ap` nằm trong một nhóm matcher riêng, để việc gỡ không bao giờ tách mất handler của tôi trong cùng nhóm.
18. Là người dùng `ap`, tôi muốn hook bị gỡ khỏi settings khi tôi bỏ nó khỏi khai báo, để không tích tụ hook cũ.
19. Là người dùng `ap`, tôi muốn hook được cập nhật ngay tại chỗ khi tôi sửa khai báo, để không sinh ra bản trùng.
20. Là người dùng `ap`, tôi muốn đổi tên một Khai báo hook mà settings chỉ còn đúng một nhóm, để việc đổi tên không để lại rác.
21. Là người dùng `ap`, tôi muốn một Hook tôi đã viết tay giống hệt khai báo được `ap` nhận quản lý và báo một lần, để không bị ghi trùng hay bị báo lặp mãi.
22. Là người dùng `ap`, tôi muốn Hook viết tay có field thừa so với khai báo vẫn được để nguyên, để `ap` không xoá field tôi thêm.
23. Là người dùng `ap`, tôi muốn gặp xung đột khi tôi đã sửa tay một hook do `ap` quản lý, để thay đổi của tôi không bị ghi đè âm thầm.
24. Là người dùng `ap`, tôi muốn `--force` ghi đè hook tôi đã sửa tay, để quay về đúng khai báo khi tôi chủ động muốn.
25. Là người dùng `ap`, tôi muốn `ap` thêm lại một hook do nó quản lý mà tôi đã xoá khỏi settings, để settings luôn khớp khai báo.
26. Là người dùng `ap`, tôi muốn khoá event và khoá `hooks` bị xoá khi không còn nhóm nào, để settings không còn mảng rỗng.
27. Là người dùng ở scope `user`, tôi muốn một hook chỉ bị gỡ khi không còn Config nào claim nó, để repo này không gỡ hook repo kia đang cần.
28. Là người dùng ở scope `user`, tôi muốn gặp xung đột khi hai Config khai báo cùng tên hook với nội dung khác nhau, để hai repo không đảo ngược nhau mỗi lần sync.
29. Là người dùng `ap`, tôi muốn thấy toàn bộ lệnh của hook đến từ Preset từ xa trước khi nó được ghi, để biết mình đang cho phép chạy code gì.
30. Là người dùng `ap`, tôi muốn chỉ phải xác nhận khi hook từ xa là mới hoặc đã đổi nội dung, để không bị hỏi lại mỗi lần sync.
31. Là người dùng `ap`, tôi muốn từ chối một hook từ xa mà phần còn lại vẫn sync, để một hook đáng ngờ không chặn cả lần đồng bộ.
32. Là người dùng CI, tôi muốn `--yes` chấp nhận trước mọi hook từ xa, để sync chạy được mà không có TTY.
33. Là người dùng CI, tôi muốn hook từ xa chưa được xác nhận bị bỏ qua với exit code khác 0 khi thiếu `--yes`, để pipeline không treo mà vẫn báo có vấn đề.
34. Là người dùng `ap`, tôi muốn hook trong Preset cục bộ hoặc Config của mình không phải xác nhận, vì đó là code chính tôi viết hoặc commit.
35. Là người dùng `ap`, tôi muốn `--dry-run` và `--check` liệt kê cả hook cần xác nhận mà không hỏi, để xem trước mà không bị chặn.
36. Là người dùng `ap`, tôi muốn thấy hook trong plan và tiến độ của `ap sync` như các loại khác, để biết `ap` sẽ và đã làm gì.
37. Là người dùng `ap`, tôi muốn được cảnh báo khi `disableAllHooks`, `allowManagedHooksOnly` hoặc `strictPluginOnlyCustomization` sẽ khiến hook của `ap` không chạy, để không mất công tìm vì sao hook im lặng.
38. Là người dùng `ap`, tôi muốn được cảnh báo khi một hook nhắm scope `user` mà dùng `${CLAUDE_PROJECT_DIR}` hoặc đường dẫn tương đối, vì hook đó sẽ chạy ở mọi project và lỗi ở những project không có file.
39. Là người dùng `ap`, tôi muốn `ap` báo lỗi khi `headers` của handler `http` chứa giá trị trông như secret mà không viết dạng `${VAR}`, để secret không lọt vào file bị commit.
40. Là người dùng `ap`, tôi muốn được cảnh báo khi `headers` dùng `${VAR}` không có trong `allowedEnvVars`, vì Claude Code sẽ không mở rộng biến đó.
41. Là người dùng `ap`, tôi muốn editor gợi ý và kiểm tra `spec.hooks` qua JSON schema, để viết khai báo đúng ngay từ đầu.
42. Là người dùng `ap`, tôi muốn thông báo "in sync" cuối lệnh nhắc tới cả hook, để biết hook cũng đã được kiểm tra.

## Implementation Decisions

- **Đọc khai báo (resolver):** `spec.hooks` của Config và của Preset được đọc theo cùng cách với `spec.mcpServers`.
  - Giá trị phải là map. Mỗi giá trị là `false` hoặc một object gồm `event` (chuỗi, bắt buộc), `matcher` (chuỗi, tuỳ chọn) và `hooks` (mảng handler, ít nhất một phần tử).
  - `true` là lỗi cấu hình kèm lời nhắc rằng chưa có danh mục hook. Khoá lạ ở cấp nhóm cũng là lỗi.
  - Mỗi handler cần `type` thuộc một trong `command`, `http`, `mcp_tool`, `prompt`, `agent`, cùng field bắt buộc của type đó theo [research §1](../../docs/research/hooks.md). Ngoài ra handler là object mờ: mọi field khác được giữ nguyên văn.
  - Tên event nằm ngoài danh sách 33 event đã biết chỉ sinh notice, không phải lỗi.
- **Gộp:** theo ADR 0004, cùng luật với MCP server. Preset con thắng Preset cha theo cả khối, Config thắng mọi Preset. Hai Preset ngang hàng cùng tên mà khác nội dung là `preset-clash`, và Managed entry của tên đó được giữ nguyên. Ghi đè thì có notice. Sau khi gộp, `false` xoá tên đó.
- **Khai báo hook đã phân giải** gồm tên, nhóm đã chuẩn hoá (event, matcher, handlers), origin và cờ "đến từ Preset từ xa". Cờ này tính theo Preset định nghĩa bản thắng sau cùng; resolver đã biết Preset nào là từ xa qua tiền tố `https://`.
- **Chuẩn hoá để so sánh:**
  - so bằng giá trị sâu, không so thứ tự khoá;
  - `matcher` rỗng, `"*"` hoặc vắng mặt đều coi là một;
  - khi ghi ra settings thì giữ đúng như người dùng viết.
- **Module hook mới**, song song với module MCP, gồm các hàm thuần:
  - chuẩn hoá và so sánh nhóm;
  - kiểm tra handler, gồm luật secret cho `headers` dùng lại luật của MCP, và cảnh báo `${VAR}` ngoài `allowedEnvVars`;
  - lập kế hoạch từ ba đầu vào: khai báo, các nhóm đang có trong settings của Scope, và Managed hook trong Lock/State. Kết quả là actions `add | update | remove`, conflicts, adopted và forgotten.
- **Luật lập kế hoạch**, theo ADR 0003:
  - Một Managed hook được coi là "đang có" khi settings có một nhóm dưới cùng event khớp đúng nội dung đã ghi trong Lock/State.
  - Khai báo đổi nội dung: `update`, tức thay nhóm cũ bằng nhóm mới tại đúng vị trí.
  - Khai báo bị bỏ: `remove`, trừ khi ở scope `user` còn Config khác claim đúng nội dung đó, khi ấy bàn giao.
  - Tên mới: nếu có nhóm Manual khớp đúng thì nhận quản lý, không thì `add` vào cuối mảng của event.
  - Managed hook không còn khớp nhóm nào:
    - Nếu event đó có một nhóm Manual cùng matcher, coi là bị sửa tay: conflict `modified-hook`. `--force` thay nhóm đó bằng khai báo.
    - Nếu không có nhóm như vậy, coi là đã bị xoá: `add` lại.
  - Scope `user` đếm claim giữa các Config. Cùng tên mà khác nội dung là `shared-clash`, và `--force` không vượt qua.
- **Ghi settings:** `ap` đọc `settings.json` của Scope, sửa riêng khoá `hooks`, rồi ghi lại bằng helper JSON sẵn có. Mọi khoá khác và mọi nhóm không phải Managed giữ nguyên. Mảng event rỗng thì xoá khoá event; `hooks` rỗng thì xoá khoá `hooks`. Không gọi `claude` (ADR 0007). Mọi action hook của một Scope gộp thành một lần ghi file, rồi mới cập nhật Lock/State.
- **Lock/State:** thêm `hooks` (Managed hook: tên, nhóm đã chuẩn hoá, origin) và `hookClaims` cho scope `user`. Cấu trúc và luật bàn giao giống hệt `mcpServers` và `mcpClaims`.
- **Xác nhận hook từ xa:**
  - `sync()` nhận thêm tuỳ chọn `yes` và một dependency hỏi xác nhận. Dependency này nhận danh sách hook cần duyệt (tên, origin, nhóm đầy đủ) và trả về tập được chấp nhận.
  - Hook cần duyệt là action `add` hoặc `update` của Khai báo hook đến từ Preset từ xa có nội dung chưa có trong Lock/State. Nhận quản lý một Manual khớp đúng thì không cần duyệt.
  - Có `yes` thì chấp nhận tất cả. Không có `yes` và không có dependency (không TTY) thì từ chối tất cả.
  - Hook bị từ chối thành conflict `unconfirmed-hook`, nên `inSync` là false và CLI trả exit 1. Phần còn lại vẫn được áp dụng.
  - `dry-run`/`check` không hỏi. Hook cần duyệt vẫn hiện trong actions dạng `planned` kèm notice.
  - CLI thêm cờ `--yes`. Khi stdin/stderr là TTY thì CLI truyền một lời nhắc tương tác in đầy đủ JSON của từng nhóm. Đây là lời nhắc tương tác đầu tiên của `ap`, nên phải chạy trước mọi thao tác ghi và không chen vào giữa hiển thị tiến độ.
- **Cảnh báo (notice), không chặn:**
  - `disableAllHooks: true` trong settings của bất kỳ Scope nào đọc được; `allowManagedHooksOnly` hoặc `strictPluginOnlyCustomization` chứa `hooks` trong managed settings nếu đọc được. Chỉ báo khi có ít nhất một Khai báo hook.
  - Scope `user` mà handler chứa `${CLAUDE_PROJECT_DIR}`/`$CLAUDE_PROJECT_DIR`, hoặc `command` bắt đầu bằng `./` hay `../`.
  - Event lạ; `${VAR}` ngoài `allowedEnvVars`.
- **Báo cáo:** `SyncAction.target` thêm `'hook'`, `name` là tên Khai báo hook. `Conflict.reason` thêm `modified-hook` và `unconfirmed-hook`. Mô tả cờ `--force` và câu "in sync" nhắc tới hook.
- **Schema:** `preset.schema.json` và `config.schema.json` thêm `hooks`. Handler dùng `additionalProperties: true`, `event` là chuỗi có gợi ý các giá trị đã biết (không phải enum đóng), `true` không hợp lệ.
- **Tài liệu:** thêm phần Hook vào `docs/design/ap-sync.md`. Nói rõ ba điều: Preset con chỉ ghi đè hoặc bỏ được Hook có tên do `ap` quản lý, không chặn được hook từ Scope khác hay từ plugin; hook cần script thì đóng thành plugin; và luật xác nhận hook từ xa.

## Testing Decisions

- Test hành vi quan sát được qua seam cao nhất. Gọi `sync()` với cây thư mục giả và `fakeClaude`, rồi kiểm tra ba thứ: khoá `hooks` trong `settings.json` của Scope trên đĩa, Lock/State, và `SyncReport` (actions, conflicts, notices). Không test riêng hàm chuẩn hoá hay lập kế hoạch.
- File test mới `sync-hooks.test.ts`, lấy `sync-mcp.test.ts` làm mẫu cho `setup`, `run`, `lock` và matcher action. Tối thiểu phải phủ:
  - Thêm hook ở `project`, `local` và `user`; giữ nguyên các khoá settings khác và Hook của người dùng, kể cả Hook cùng event và cùng matcher.
  - Sửa khai báo (update tại chỗ), bỏ khai báo (remove, dọn event và `hooks` rỗng), đổi tên.
  - Nhận quản lý Manual khớp đúng; Manual có field thừa thì để nguyên.
  - Sửa tay nhóm Managed thì ra `modified-hook`, và `--force` thay nhóm đó; xoá tay nhóm Managed thì được thêm lại.
  - Gộp qua `extends`, `false`, ghi đè có notice; `preset-clash` giữ Managed hook.
  - Claims ở scope `user` giữa hai Config: bàn giao và `shared-clash`.
  - Xác nhận hook từ xa:
    - đồng ý, từ chối một phần, `yes`, không TTY → `unconfirmed-hook` và `inSync` false;
    - lần sync thứ hai với nội dung không đổi thì không hỏi lại;
    - đổi nội dung thì hỏi lại;
    - hook cục bộ không hỏi.
  - `--dry-run`/`--check` không ghi file và không hỏi.
  - Cảnh báo `disableAllHooks`, `${CLAUDE_PROJECT_DIR}` ở scope `user`, event lạ.
  - Handler giữ nguyên field lạ khi ghi.
- `resolve.test.ts`: `spec.hooks` hợp lệ và các dạng lỗi (không phải map, `true`, thiếu `event`/`hooks`/`type`/field bắt buộc, khoá nhóm lạ, secret trong `headers`), cờ "đến từ Preset từ xa", gộp giữa Preset con và Preset ngang hàng.
- `commands.test.ts`: chỉ kiểm tra cờ `--yes` được truyền xuống và exit 1 khi có `unconfirmed-hook`, nếu test hiện có đủ để làm điều đó mà không cần TTY thật.
- Các test sync hiện có (`sync.test.ts`, `sync-mcp.test.ts`, `sync-plugins.test.ts`, `sync-skills.test.ts`, `sync-agents.test.ts`, `plan.test.ts`) phải qua nguyên vẹn.

## Out of Scope

- Danh mục hook đi kèm `ap` (giá trị `true`).
- Copy file script cho hook, tức một loại item mới có Nguồn và Bản cài. Hook cần script thì đóng thành plugin.
- Tự sinh plugin cục bộ để chứa hook.
- Gắn khoá định danh (`x-ap`…) vào settings.
- Phát hiện hook trùng với hook trong plugin đang bật.
- Tắt hoặc chặn hook đến từ Scope khác, từ plugin, hoặc từ frontmatter của Skill/Agent.
- Ghi managed settings.
- Hook trong frontmatter của Skill và Agent: chúng đã đi theo Bản cài skill và Bản cài agent.

## Further Notes

- Claude Code tự nạp lại `settings.json` khi file đổi, nên không có bước cài hay khởi động lại.
- Claude Code gộp trùng các handler giống hệt nhau giữa các file settings, nên một hook trùng với Hook của người dùng ở Scope khác chỉ chạy một lần. Theo research, việc gộp trùng giữa settings và plugin không xảy ra.
- `claude doctor` (chỉ đọc) báo event và type không hợp lệ theo từng file, có ích khi kiểm thử tay.
- Working tree đang có thay đổi chưa commit trong `preset.schema.json` và code MCP từ một phiên khác. Khi làm phần schema cần gộp cẩn thận với các thay đổi đó.
- Chưa kiểm chứng được: khoá gộp trùng chính xác của Claude Code (`args`, `shell`, `if`), và khoá lạ trong handler còn được chấp nhận lâu dài hay không. Thiết kế này không dựa vào cả hai điều đó.
