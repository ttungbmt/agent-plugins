---
title: Hỗ trợ Rule trong `ap sync`
labels: [ready-for-agent]
---

Thuật ngữ: [CONTEXT.md](../../CONTEXT.md) mục Rule. Quyết định: [ADR 0005](../../docs/adr/0005-ap-installs-skills-itself.md), [ADR 0006](../../docs/adr/0006-rule-per-file-in-namespace.md). Nguồn: [docs/research/rules.md](../../docs/research/rules.md).

## Problem Statement

Claude Code nạp rules từ `.claude/rules/` (project) và `~/.claude/rules/` (user), nhưng plugin không ship được rules. Các bộ rule cộng đồng như ECC (`affaan-m/ECC`, 22 nhóm và 121 file) hay awesome-claude-code-toolkit (15 file) chỉ hướng dẫn người dùng tự copy tay. Copy tay thì:
- không ghim được phiên bản;
- không biết file nào mình tự viết và file nào copy từ nguồn;
- không cập nhật hay gỡ được một cách an toàn;
- dễ đè nhau, vì các bộ trùng tên file (`coding-style.md`, `security.md`…);
- dễ làm hỏng link `../common/x.md` của ECC khi cài phẳng.

Người dùng `ap` đã khai báo được skills và agents trong `agent-plugins.yaml`, nhưng không khai báo được rules. Khoá `rules:` trong preset `agent-plugins` đang để trống.

## Solution

Thêm `spec.rules` vào Config và Preset, cùng dạng với `spec.skills` và `spec.agents`. `ap sync` sẽ:
- tải Nguồn rule bằng `git`, ghim theo commit;
- copy từng Rule (một file `.md`) vào Namespace của nguồn, tức `.claude/rules/<ns>/…` (scope `project`) hoặc `<claude config dir>/rules/<ns>/…` (scope `user`), giữ nguyên cấu trúc thư mục;
- ghi Managed rule vào Lock/State, và từ đó cập nhật, gỡ, phát hiện sửa tay theo đúng luật sở hữu của Skill/Agent.

Ví dụ:

```yaml
spec:
  rules:
    - source: affaan-m/ECC
      rules: [common, typescript, web]   # thư mục = mọi Rule dưới nó
    - source: rohitg00/awesome-claude-code-toolkit
      rules: [security, testing]         # file = một Rule
      as: toolkit                        # Namespace, mặc định là tên repo viết thường
```

## User Stories

1. Là người dùng `ap`, tôi muốn khai báo một Nguồn rule bằng chuỗi `owner/repo` trong `spec.rules`, để cài mọi Rule của nguồn đó mà không phải copy tay.
2. Là người dùng, tôi muốn chọn một nhóm Rule bằng tên thư mục (vd. `web`), để cài mọi Rule dưới thư mục đó mà không phải liệt kê từng file.
3. Là người dùng, tôi muốn chọn một Rule lẻ bằng đường dẫn không có đuôi (vd. `security` hoặc `web/coding-style`), để chỉ lấy đúng thứ mình cần từ một nguồn phẳng.
4. Là người dùng, tôi muốn loại trừ Rule hoặc thư mục bằng `exclude`, để cài gần hết một nguồn mà bỏ đi vài thứ.
5. Là người dùng, tôi muốn chỉ định `path` khi rules không nằm ở `rules/`, để dùng được nguồn có layout khác (vd. `claude/rules`).
6. Là người dùng, tôi muốn `ap` báo lỗi rõ ràng khi nguồn không có `rules/` và tôi chưa khai báo `path`, để `ap` không cài nhầm `CHANGELOG.md` hay `CONTRIBUTING.md` thành rule luôn được nạp.
7. Là người dùng, tôi muốn `README.md` ở mọi cấp bị bỏ qua, để nó không trở thành rule luôn được nạp.
8. Là người dùng, tôi muốn `ap` không bao giờ tự dò `.claude/rules/` của nguồn, để không cài nhầm rules nội bộ của repo nguồn.
9. Là người dùng, tôi muốn Rule của mỗi nguồn nằm trong Namespace riêng, để hai bộ rule trùng tên file không đè nhau.
10. Là người dùng, tôi muốn cấu trúc thư mục của nguồn được giữ nguyên trong Namespace, để link tương đối như `../common/x.md` vẫn đúng.
11. Là người dùng, tôi muốn Namespace mặc định là tên repo viết thường (`affaan-m/ECC` → `ecc`), để khỏi phải nghĩ tên và trùng với cách ECC tự khuyên.
12. Là người dùng, tôi muốn đặt `as` để đổi Namespace, để tách hai khai báo cùng repo khác `path`, hoặc đặt tên ngắn hơn.
13. Là người dùng, tôi muốn đổi `as` thì `ap` cài sang Namespace mới và gỡ Managed rule ở Namespace cũ, để không còn bản thừa.
14. Là người dùng, tôi muốn thấy conflict `namespace-clash` khi hai nguồn khác nhau cùng Namespace, kèm gợi ý đặt `as`, để biết cách sửa.
15. Là người dùng, tôi muốn các file tôi tự viết ngay dưới `.claude/rules/` hoặc trong thư mục ngoài Namespace không bao giờ bị `ap` đụng tới.
16. Là người dùng, tôi muốn file tôi tự thêm vào một Namespace, không trùng đường dẫn Rule nào, được để nguyên và không bị báo lỗi.
17. Là người dùng, tôi muốn file có sẵn trùng đường dẫn và trùng nội dung với Rule cần cài được `ap` nhận quản lý (báo một lần), để lần đầu dùng `ap` trên rules đã copy tay diễn ra suôn sẻ.
18. Là người dùng, tôi muốn file có sẵn trùng đường dẫn nhưng khác nội dung gây `manual-entry`, và `--force` thì thay, để không mất sửa đổi của mình mà không hay biết.
19. Là người dùng, tôi muốn Managed rule bị sửa tay gây `modified-rule`, cả khi cần cập nhật lẫn khi cần gỡ, và `--force` thì ghi đè hoặc gỡ.
20. Là người dùng, tôi muốn Rule không còn được khai báo bị gỡ, và Namespace rỗng bị xoá, để `.claude/rules/` sạch.
21. Là người dùng, tôi muốn thư mục Namespace là symlink (do tôi tự `ln -s`) được coi là Manual entry và `ap` không ghi xuyên qua nó, để bản checkout của tôi không bị sửa; `--force` chỉ gỡ link rồi cài thư mục thật.
22. Là người dùng, tôi muốn file Rule là symlink trong một Namespace thật được để nguyên như Manual entry.
23. Là người dùng, tôi muốn chọn một đường dẫn không tồn tại trong nguồn gây `missing-rule`, còn loại trừ đường dẫn không tồn tại chỉ in thông báo.
24. Là người dùng, tôi muốn Nguồn rule được ghim commit trong Lock/State và chỉ lấy commit mới khi `--update`, để đồng đội cài đúng bản như tôi.
25. Là người dùng, tôi muốn Nguồn rule ghim riêng với Nguồn skill/agent kể cả khi cùng repo, nhưng chỉ tải một lần khi cùng source và commit.
26. Là người dùng, tôi muốn `ap` chỉ tải lại nguồn khi cần (như Skill), để sync nhanh và chạy được offline khi không có gì thay đổi.
27. Là người dùng, tôi muốn `--dry-run` và `--check` tính Rule từ Danh mục nguồn mà không tải gì, để dùng được trong CI.
28. Là người dùng, tôi muốn sync in "N rule luôn được nạp" cho mỗi nguồn (đếm các Rule không có `paths`), để biết mình đang tốn bao nhiêu context.
29. Là người dùng, tôi muốn được cảnh báo khi Rule có `applyTo` trong frontmatter hoặc đuôi `.instructions.md`, để biết file đó là định dạng Copilot và sẽ luôn được nạp.
30. Là người dùng, tôi muốn scope `local` bỏ qua rules kèm thông báo, như Skill/Agent.
31. Là người dùng, tôi muốn rules ở scope `user` chia sẻ được giữa các repo theo cơ chế claims (ADR 0003), để repo này không gỡ Rule mà repo khác đang cần.
32. Là tác giả Preset, tôi muốn khai báo `spec.rules` trong Preset và để Preset con hoặc Config ghi đè hay thu hẹp, để đóng gói bộ rule dùng chung.
33. Là tác giả Preset, tôi muốn hai Preset ngang hàng chọn khác nhau trên cùng nguồn được lấy hợp, còn khác `ref` hay khác `as` thì báo `preset-clash`.
34. Là người dùng preset `agent-plugins`, tôi muốn nhận sẵn ECC `common`, `typescript`, `web`.
35. Là người dùng, tôi muốn schema JSON của Config/Preset gợi ý và kiểm tra `spec.rules` trong editor.
36. Là người dùng, tôi muốn báo cáo `--json` có action và conflict của Rule cùng khuôn với Skill/Agent, để tự động hoá.
37. Là người dùng, tôi muốn thấy tiến trình sync của Rule trong listr giống Skill/Agent.
38. Là người dùng, tôi muốn commit `.claude/rules/<ns>/` để đồng đội clone là có; `ap` không đụng `.gitignore`.

## Implementation Decisions

**Ticket 0: refactor, không đổi hành vi.**
- Đổi code nối dây theo vị trí của loại item (item thứ nhất là skills, thứ hai là agents; `skillSources`/`agentSources`; `skillClaims`/`agentClaims`) thành map theo `ItemKind` ở tầng sync và store.
- Định dạng Lock/State trên đĩa giữ nguyên các khoá tách riêng. Map chỉ tồn tại trong bộ nhớ, và việc đọc/ghi quy đổi qua lại.
- Mọi test hiện có phải qua mà không sửa.

**Loại item `rule`.**
- `ItemKind` thêm `'rule'`, cùng một `ItemHandler` mới cho rules. Định danh của Rule là đường dẫn tương đối trong gốc rules của nguồn, bỏ `.md`, phân cách bằng `/`. Mỗi đoạn phải khớp quy tắc tên item hiện có.
- Định danh trên đĩa, dùng cho Lock/State và việc so với Bản cài, là `<ns>/<đường dẫn>`. Managed rule ghi `name` là định danh trên đĩa, cộng `source`, `sha256` (hash byte của file) và `origin`. Danh mục nguồn ghi đường dẫn **không** kèm Namespace, vì Namespace là thuộc tính của khai báo chứ không phải của nguồn.
- Khoá mới trong Lock/State: `rules`, `ruleSources`, và `ruleClaims` (scope `user`). Conflict reason mới: `missing-rule`, `modified-rule`, `namespace-clash`. Cập nhật union type, report schema và `docs/design/ap-sync.md`.

**Khai báo.**
- `spec.rules` là list: chuỗi (một Nguồn rule, cài tất cả), hoặc map `{ source, path?, as?, rules | exclude }`.
- Luật: không được có cả `rules` lẫn `exclude`, mỗi cái cần ít nhất một mục. Mục chọn/loại trừ là đường dẫn: trỏ file là một Rule, trỏ thư mục là tiền tố.
- Parse nguồn dùng lại parser hiện có (chỉ `github`, `git`, `directory`). `path` theo luật hiện có: tương đối, không ra khỏi nguồn, là một phần định danh nguồn với `github`/`git`.
- Gộp khai báo theo luật hiện có của Skill. Tập chọn và tập loại trừ gộp trên đường dẫn; tiền tố thư mục được mở rộng thành Rule sau khi có Danh mục nguồn. `as` được so khi gộp: khác `as` giữa hai Preset ngang hàng là `preset-clash`, còn Preset con hoặc Config thì thay luôn.

**Namespace.**
- Mặc định: `github` lấy `repo`; `git` lấy tên cuối URL bỏ `.git`; `directory` lấy tên thư mục. Tất cả viết thường. `path` không ảnh hưởng.
- `as` phải là một đoạn đường dẫn hợp lệ (quy tắc tên item, không có `/`).
- Hai nguồn đã gộp khác nhau mà cùng Namespace thì cả hai gây `namespace-clash`: không cài và không gỡ gì của chúng, giữ nguyên Managed rule.

**Tìm Rule trong nguồn.**
- Gốc rules: `path` nếu có; nếu không thì `rules/`; nếu không có `rules/` thì báo lỗi nguồn và gợi ý khai báo `path`. Không dò `.claude/rules/` hay gốc repo.
- Lấy mọi `*.md` đệ quy, bỏ `README.md` (không phân biệt hoa thường) ở mọi cấp và bỏ `.git`.
- Chỉ đọc frontmatter để đếm Rule không có `paths` và để cảnh báo `applyTo` hoặc `.instructions.md`. Nội dung được copy nguyên vẹn.

**Cài, liệt kê, gỡ.**
- Cài: tạo thư mục cha rồi copy từng file vào `<rules dir>/<ns>/<đường dẫn>.md`.
- Gỡ: xoá file, xoá thư mục cha rỗng tới hết Namespace, và xoá Namespace nếu rỗng.
- Liệt kê chỉ quét các Namespace đang được khai báo hoặc có trong Lock/State.
- Namespace là symlink: báo `manual-entry` cho mọi Rule cần cài vào đó, không ghi xuyên qua. `--force` gỡ link rồi cài.
- Thư mục rules của scope: `<cwd>/.claude/rules` (`project`), `<claude config dir>/rules` (`user`, theo `CLAUDE_CONFIG_DIR` như Skill), `null` với `local` (bỏ qua, in thông báo).
- Kế hoạch (install, update, adopt, `modified-rule`, `manual-entry`, remove, forget), điều kiện tải lại, `--dry-run`/`--check` và claims ở scope `user` đều đi theo đường của Skill/Agent. Chỗ khác duy nhất là định danh có Namespace.
- Nguồn rule dùng chung fetcher và cơ chế "cùng source + commit tải một lần" với Skill/Agent. Rule chạy sau marketplace/plugin, độc lập với Skill/Agent.

**Schema, preset, tài liệu.**
- `preset.schema.json` và `config.schema.json` thêm `rules` (định nghĩa khai báo có `as`).
- Preset `agent-plugins` điền `{ source: affaan-m/ECC, rules: [common, typescript, web] }`.
- `docs/design/ap-sync.md` thêm mục Rule theo khuôn mục Agent: liệt kê chỗ khác, conflict mới, khoá Lock/State.
- `ap init` không đổi, vì nó không sinh skills/agents.

## Testing Decisions

- Test hành vi quan sát được qua seam cao nhất: gọi `sync()` với cây thư mục giả, nguồn giả (`fetchSkillSource` trả về thư mục theo commit, như `fakeSources` trong `sync-agents.test.ts`) và `fakeClaude`, rồi kiểm tra file trên đĩa, Lock/State và `SyncReport` (actions, conflicts). Không test hàm nội bộ như dò file hay hash.
- File test mới `sync-rules.test.ts`, lấy `sync-skills.test.ts` và `sync-agents.test.ts` làm mẫu. Tối thiểu phải phủ:
  - Cài chuỗi trần.
  - Chọn thư mục, chọn file lẻ, loại trừ.
  - Namespace mặc định và `as`, đổi `as` (chuyển nhà).
  - `namespace-clash`.
  - Nguồn thiếu `rules/`, có và không có `path`; bỏ qua `README.md` và `.claude/rules/`.
  - Adopt, `manual-entry`, `modified-rule`, `--force`.
  - File tự viết ngoài và trong Namespace không bị đụng tới.
  - Namespace symlink; gỡ và xoá Namespace rỗng.
  - `missing-rule`; `--update` và ghim commit.
  - `--dry-run`/`--check` không tải gì.
  - Scope `local` bị bỏ qua; claims ở scope `user` giữa hai Config.
  - Thông báo số Rule luôn được nạp và cảnh báo `applyTo`.
- `resolve.test.ts`: parse `spec.rules` (dạng hợp lệ và lỗi), gộp Preset con/ngang hàng, `preset-clash` do khác `as`.
- Ticket refactor: không thêm test; `sync-skills.test.ts`, `sync-agents.test.ts`, `sync.test.ts` và `plan.test.ts` phải qua nguyên vẹn.

## Out of Scope

- Chuyển đổi định dạng Copilot `*.instructions.md` (`applyTo` → `paths`). Sau này có thể thêm bằng một trường như `format`.
- Xuất rules sang Cursor (`.mdc`), Copilot, Codex hay Windsurf.
- Suy ra hoặc tự cài Rule phụ thuộc (ECC `web` → `common`) và cảnh báo link hỏng.
- Rules ở scope `local`; thêm dòng vào `.gitignore`.
- Rules đóng gói trong plugin (Claude Code không hỗ trợ).
- Kiểm tra cú pháp glob trong `paths`.
- `ap init` hỏi hoặc sinh rules.

## Further Notes

- Chưa xác minh được từ tài liệu Claude Code: thư mục rules của scope `user` có theo `CLAUDE_CONFIG_DIR` không (spec giả định có, như Skill); thứ tự nạp file trong cùng thư mục; glob `paths` ở scope user so với gốc nào. Không điều nào ảnh hưởng tới cách `ap` cài.
- `docs/research/rules.md` đang viết bằng tiếng Anh, còn tài liệu còn lại của repo bằng tiếng Việt. Cân nhắc dịch khi làm ticket docs.
