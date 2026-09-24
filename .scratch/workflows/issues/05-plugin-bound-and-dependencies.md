---
title: Workflow gắn với plugin (`plugin-workflow`) và cảnh báo phụ thuộc thiếu
labels: [ready-for-agent]
blocked_by: [03]
---

Spec: [../spec.md](../spec.md) (mục Tìm Workflow, Cảnh báo sau khi lập kế hoạch). User story 9, 10. ADR 0010.

## Việc cần làm
- Danh mục nguồn đánh dấu Workflow gắn với plugin (`isPluginBound`), để bỏ qua khi cài tất cả mà không cần tải lại.
- Chọn đích danh → conflict `plugin-workflow`, detail gợi ý khai báo plugin chứa nó. Có trong "tất cả" → bỏ qua kèm thông báo.
- Sau khi lập kế hoạch, với mỗi Workflow sẽ có mặt ở Scope: `agentType` không tiền tố không nằm trong (Agent đã phân giải ∪ Bản cài agent ∪ agent có sẵn của Claude Code) → cảnh báo; `workflow('<x>')` không nằm trong (Workflow đã phân giải ∪ Bản cài workflow) → cảnh báo. Không tự cài gì.
- Danh sách agent có sẵn là một hằng số (`general-purpose`, `Explore`, `Plan`, `statusline-setup`, `claude-code-guide`), có comment dẫn nguồn.
- Thêm `plugin-workflow` vào union conflict reason và report schema.

## Acceptance
- Test: nguồn có `a.js` (`agentType: 'ecc:x'`) và `b.js` → cài tất cả chỉ có `b.js` kèm thông báo; chọn `a` → `plugin-workflow`.
- Test: `agentType: 'code-reviewer'` cảnh báo khi thiếu, hết cảnh báo khi `spec.agents` cài `code-reviewer`; `general-purpose` không cảnh báo; `workflow('missing')` cảnh báo.
