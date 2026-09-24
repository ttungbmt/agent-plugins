---
title: Hỗ trợ Workflow trong `ap sync`
labels: [ready-for-agent]
---

Thuật ngữ: [CONTEXT.md](../../CONTEXT.md) mục Workflow và Sở hữu. Quyết định: [ADR 0005](../../docs/adr/0005-ap-installs-skills-itself.md), [ADR 0010](../../docs/adr/0010-workflow-flat-install-by-meta-name.md), dựa trên [ADR 0003](../../docs/adr/0003-managed-entries-per-scope-state.md), [ADR 0004](../../docs/adr/0004-preset-extends-vs-config-presets.md). Nguồn: [docs/research/workflows.md](../../docs/research/workflows.md).

## Problem Statement

Claude Code chạy workflow (script `.js` cho Workflow tool) từ `.claude/workflows/` (project) và `~/.claude/workflows/` (user). Plugin ship được workflow, nhưng nhiều nguồn chỉ công bố file `.js` rời, không đóng gói thành plugin. Ví dụ: `transilienceai/communitytools` có 13 script ở `.claude/workflows/`, `boshu2/agentops` phải tự viết lệnh `ao workflows link`. Người dùng phải copy tay, nên:
- không ghim được phiên bản;
- không biết file nào mình tự viết và file nào copy từ nguồn;
- không cập nhật hay gỡ được một cách an toàn;
- không thấy lỗi khi hai file có cùng `meta.name`, vì Claude Code lặng lẽ chọn một trong hai;
- dễ chép nhầm workflow của plugin, workflow này hỏng khi đứng riêng vì gọi agent có tiền tố tên plugin (`ecc:code-reviewer`).

Người dùng `ap` đã khai báo được skill, agent và (sắp tới) rule trong `agent-plugins.yaml`, nhưng chưa khai báo được workflow.

## Solution

Thêm `spec.workflows` vào Config và Preset, cùng dạng với `spec.agents`. `ap sync` sẽ:
- tải Nguồn workflow bằng `git`, ghim theo commit;
- đọc `meta.name` của từng file `.js` ở gốc workflows bằng `acorn`, chỉ nhận file có `meta` là literal;
- copy từng Workflow thành `.claude/workflows/<meta.name>.js` (scope `project`) hoặc `<claude config dir>/workflows/<meta.name>.js` (scope `user`), cài phẳng;
- ghi Managed workflow vào Lock/State, rồi từ đó cập nhật, gỡ, phát hiện sửa tay theo luật sở hữu của Agent. Chỗ khác là việc so khớp dựa trên `meta.name` chứ không dựa trên tên file;
- không cài workflow gắn với plugin, không ghi quyền `Workflow(<name>)`.

Ví dụ:

```yaml
spec:
  workflows:
    - source: transilienceai/communitytools
      path: .claude/workflows
      exclude: [safe-pr]              # theo meta.name
    - acme/workflows                  # gốc mặc định workflows/, cài tất cả
```

## User Stories

1. Là người dùng `ap`, tôi muốn khai báo một Nguồn workflow bằng chuỗi `owner/repo` trong `spec.workflows`, để cài mọi Workflow của nguồn đó mà không phải copy tay.
2. Là người dùng, tôi muốn chọn Workflow theo `meta.name` (tên tôi gõ sau `/`), không theo tên file, để khai báo khớp với thứ tôi thấy trong Claude Code.
3. Là người dùng, tôi muốn loại trừ Workflow bằng `exclude`, để cài gần hết một nguồn mà bỏ đi vài cái.
4. Là người dùng, tôi muốn chỉ định `path` khi workflow không nằm ở `workflows/` (vd. `.claude/workflows`), để dùng được nguồn có layout khác.
5. Là người dùng, tôi muốn `ap` báo lỗi rõ ràng khi nguồn không có `workflows/` và tôi chưa khai báo `path`, thay vì tự dò `.claude/workflows/` là workflow nội bộ của repo nguồn.
6. Là người dùng, tôi muốn `README.md`, `*.test.*`, file `_*`, thư mục con (`lib/`) và file không có `meta` literal bị bỏ qua, để chỉ script thật được cài.
7. Là người dùng, tôi muốn Workflow được cài thành `<meta.name>.js`, để hai nguồn cùng có `review.js` nhưng khác `meta.name` không đè nhau, và nhìn tên file là biết lệnh.
8. Là người dùng, tôi muốn file có `meta.name` không dùng được làm tên file bị bỏ qua (không phải Workflow), để `ap` không ghi ra đường dẫn lạ.
9. Là người dùng, tôi muốn chọn đích danh một workflow gắn với plugin (có `agentType: '<plugin>:<agent>'`) gây conflict `plugin-workflow` kèm gợi ý khai báo plugin, còn khi cài tất cả thì nó bị bỏ qua kèm thông báo.
10. Là người dùng, tôi muốn được cảnh báo khi Workflow gọi `agentType` không tiền tố hoặc `workflow('<name>')` không có ở Scope và không được khai báo, để biết nó có thể hỏng lúc chạy. Agent có sẵn (`general-purpose`, `Explore`, `Plan`, …) không tính là thiếu.
11. Là người dùng, tôi muốn file tôi tự viết trong `.claude/workflows/` không bao giờ bị `ap` sửa hay gỡ.
12. Là người dùng, tôi muốn file có sẵn cùng `meta.name` và cùng nội dung với Workflow cần cài được `ap` nhận quản lý (báo một lần), kể cả khi tên file khác. File giữ tên cũ tới lần `ap` ghi nó tiếp theo (cập nhật hoặc `--force`), khi đó thành `<meta.name>.js`; gỡ thì gỡ đúng file đó.
13. Là người dùng, tôi muốn file có sẵn cùng `meta.name` nhưng khác nội dung gây `manual-entry`, và `--force` thì thay, để không mất sửa đổi của mình mà không hay biết.
14. Là người dùng, tôi muốn Managed workflow bị sửa tay gây `modified-workflow`, cả khi cần cập nhật lẫn khi cần gỡ, và `--force` thì ghi đè hoặc gỡ.
15. Là người dùng, tôi muốn được cảnh báo khi hai file tôi tự thêm có cùng `meta.name`, vì Claude Code chỉ chạy được một cái.
16. Là người dùng, tôi muốn file workflow là symlink được coi là Manual entry.
17. Là người dùng, tôi muốn Workflow không còn được khai báo bị gỡ.
18. Là người dùng, tôi muốn chọn một tên không có trong nguồn gây `missing-workflow`, còn loại trừ tên không có chỉ in thông báo.
19. Là người dùng, tôi muốn Nguồn workflow được ghim commit trong Lock/State và chỉ lấy commit mới khi `--update`; ghim riêng với các loại khác nhưng cùng source và commit chỉ tải một lần.
20. Là người dùng, tôi muốn `--dry-run` và `--check` tính Workflow từ Danh mục nguồn mà không tải gì.
21. Là người dùng, tôi muốn scope `local` bỏ qua workflows kèm thông báo.
22. Là người dùng, tôi muốn workflows ở scope `user` chia sẻ được giữa các repo theo cơ chế claims.
23. Là người dùng, tôi muốn `ap` không bao giờ ghi `Workflow(<name>)` vào `permissions.allow`, để workflow từ Preset từ xa không chạy mà không hỏi tôi.
24. Là người dùng, tôi muốn được cảnh báo khi settings (`disableWorkflows: true`, `enableWorkflows: false`) hoặc `CLAUDE_CODE_DISABLE_WORKFLOWS` làm workflow đã cài không chạy được.
25. Là tác giả Preset, tôi muốn khai báo `spec.workflows` trong Preset và để Preset con hoặc Config ghi đè hay thu hẹp; hai Preset ngang hàng khác `ref` thì báo `preset-clash`.
26. Là người dùng, tôi muốn schema JSON gợi ý và kiểm tra `spec.workflows`, và báo cáo `--json` cùng tiến trình listr có Workflow cùng khuôn với Agent.

## Implementation Decisions

**Phụ thuộc: ticket refactor của rules.** [`.scratch/rules/issues/01-refactor-item-kind-map.md`](../rules/issues/01-refactor-item-kind-map.md) gom phần nối dây theo vị trí thành map theo `ItemKind`. Workflow dùng chung ticket đó, không làm lại.

**Loại item `workflow`.**
- `ItemKind` thêm `'workflow'`, cùng một `ItemHandler` mới ở `sync/workflows.ts`. Định danh là `meta.name`, phải khớp `ITEM_NAME`; không khớp thì file không phải Workflow.
- Managed workflow ghi `name`, `source`, `sha256` (hash byte của file) và `origin`, giống Agent.
- Khoá mới trong Lock/State: `workflows`, `workflowSources`, `workflowClaims` (scope `user`).
- Conflict reason mới: `missing-workflow`, `modified-workflow`, `plugin-workflow`.

**Đọc `meta`.**
- Thêm dependency `acorn` vào `packages/cli`; ADR 0008 bundle nó vào `ap.tgz`. Parse module (`ecmaVersion: 'latest'`, `sourceType: 'module'`, `allowAwaitOutsideFunction: true`).
- Tìm `ExportNamedDeclaration` → `const meta = ObjectExpression`, trong đó `name` là chuỗi. Có spread, giá trị tính toán hoặc parse lỗi thì không phải Workflow; lỗi parse chỉ ghi vào log debug.
- Tìm literal phụ thuộc: property `agentType: '<chuỗi>'` và lời gọi `workflow('<chuỗi>', …)`. Chuỗi có `:` thì workflow gắn với plugin. Tên tạo lúc chạy thì bỏ qua.
- Gom các hàm này vào một module thuần (`sync/workflow-meta.ts`) nhận `string`.

**Khai báo.**
- `spec.workflows` là list: chuỗi (một Nguồn workflow, cài tất cả), hoặc map `{ source, path?, workflows | exclude }`. Không có `as`.
- Luật giống `spec.agents`: không được có cả `workflows` lẫn `exclude`, và mỗi list có ít nhất một mục. Parse nguồn và `path` dùng lại parser hiện có. Gộp khai báo theo luật hiện có của Skill/Agent.

**Tìm Workflow trong nguồn.**
- Gốc: `path` nếu có; nếu không thì `workflows/`; nếu không có `workflows/` thì báo lỗi nguồn, gợi ý khai báo `path`. Không dò `.claude/workflows/` hay gốc repo.
- Chỉ xét file `*.js` nằm ngay trong gốc. Bỏ `*.test.*`, tên bắt đầu bằng `_`, và file không có `meta` hợp lệ. Hai file trong cùng một nguồn trùng `meta.name` thì báo lỗi nguồn.
- Danh mục nguồn giữ cả workflow gắn với plugin, đánh dấu để khi "cài tất cả" thì bỏ qua được mà không phải tải lại.

**Cài, liệt kê, gỡ.**
- Thư mục: `<cwd>/.claude/workflows` (`project`), `<claude config dir>/workflows` (`user`), `null` với `local`.
- `list`: đọc mọi `*.js` (file và symlink) ngay trong thư mục và trả `meta.name`. File không có `meta` hợp lệ không phải Bản cài workflow. Cần thêm tên file thật vào `InstalledItem` (trường tuỳ chọn), vì tên file có thể khác `<name>.js`.
- `install`: ghi `<name>.js`; nếu đang nhận quản lý một file có tên khác thì gỡ file đó.
- `remove`: xoá mọi file do `ap` quản lý mang `meta.name` đó.
- Kế hoạch (install, update, adopt, `modified-workflow`, `manual-entry`, remove, forget), điều kiện tải lại, `--dry-run`/`--check` và claims đều đi theo đường của Agent.
- Hai Manual entry trùng `meta.name` thì chỉ cảnh báo.

**Cảnh báo sau khi lập kế hoạch.**
- Phụ thuộc thiếu (story 10): so với các Agent và Workflow đã phân giải cùng Scope, Bản cài agent và workflow đang có, và danh sách agent có sẵn của Claude Code (hằng số trong code).
- Workflow bị tắt (story 24): đọc `disableWorkflows` và `enableWorkflows` từ các file settings mà `ap` đã đọc được, cùng biến môi trường. Chỉ cảnh báo khi có ít nhất một Workflow được khai báo. Không đoán gói Pro.

**Schema, tài liệu.**
- `preset.schema.json`, `config.schema.json`: thêm `workflows`.
- `docs/design/ap-sync.md`: thêm mục Workflow theo khuôn mục Agent.
- Preset `agent-plugins` không đổi, vì chưa có nguồn workflow rời nào đáng đưa vào (`hmcuongit/cuonghm-ai-workflow-lab/workflows` là hướng dẫn Markdown).
- `ap init` không đổi.

## Testing Decisions

- Test hành vi qua seam cao nhất, như rules: gọi `sync()` với cây thư mục giả, nguồn giả và `fakeClaude`, rồi kiểm tra file, Lock/State và `SyncReport`. File mới `sync-workflows.test.ts`, mẫu theo `sync-agents.test.ts`.
- `workflow-meta.test.ts` test module thuần đọc `meta` với các mẫu trong nghiên cứu:
  - file minify một dòng;
  - comment trước `meta`;
  - `meta` không literal hoặc có spread;
  - `name` không phải chuỗi;
  - `agentType` có và không tiền tố;
  - `workflow('x')`;
  - file có `import()` hoặc lỗi cú pháp.

  Đây là chỗ duy nhất test ở tầng dưới, vì phần parse có nhiều nhánh và không phụ thuộc hệ thống file.
- `resolve.test.ts`: parse `spec.workflows` (dạng hợp lệ và lỗi); gộp Preset con/ngang hàng.

## Out of Scope

- Đổi tên bằng `as:` (phải viết lại `meta.name`).
- `.mjs`, `<dir>/workflow.js`, helper và thư mục `lib/`, workflow nhiều file.
- Tự cài Agent hoặc Workflow phụ thuộc.
- Chép workflow ra khỏi plugin.
- Ghi quyền `Workflow(<name>)`.
- Workflow ở scope `local`, và `.claude/workflows/` ở thư mục cha trong monorepo.
- Kiểm tra script chạy được (sandbox, `import()`).

## Further Notes

- Story 12: adopt chỉ ghi Lock/State, không đụng đĩa, nên file khác tên giữ tên cũ; `install`/`remove` tìm Bản cài theo `meta.name` (ưu tiên `<name>.js`). Không cần lưu tên file trong Managed workflow.
- Các hành vi quan sát được (thư mục con và `.mjs` không được tìm thấy, trùng tên được chọn lặng lẽ) lấy từ thí nghiệm trên Claude Code 2.1.281, tài liệu không ghi. Nên kiểm tra lại khi Claude Code đổi phiên bản.
