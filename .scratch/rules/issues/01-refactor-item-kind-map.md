---
title: Refactor nối dây Skill/Agent theo vị trí thành map theo `ItemKind`
labels: [done]
blocked_by: []
---

Spec: [../spec.md](../spec.md) (mục Ticket 0). Không đổi hành vi.

## Việc cần làm
- `sync/index.ts`: bỏ `items[0]`/`items[1]`, `itemClaims[0]!`/`[1]!`, `skills!`/`agents!` (quanh dòng 334–383); dùng `Record<ItemKind, …>`.
- `sync/store.ts`: `Owned`/`Sharing` trong bộ nhớ giữ `items`, `itemSources`, `itemClaims` dạng map theo `ItemKind`; `read`/`write` quy đổi qua lại các khoá trên đĩa (`skills`, `skillSources`, `skillClaims`, `agents`, …). Định dạng Lock/State trên đĩa **giữ nguyên**.
- `sync/resolve.ts`: vòng `[['skill', …], ['agent', …]]` (dòng ~322) và `own_` lấy danh sách kind từ một chỗ duy nhất, để thêm `'rule'` chỉ là thêm một mục.
- Thêm một kind mới phải chỉ cần: mở rộng union `ItemKind`, đăng ký `ItemHandler`, khai báo tên khoá trên đĩa.

## Acceptance
- Không sửa test nào: `sync-skills.test.ts`, `sync-agents.test.ts`, `sync.test.ts`, `plan.test.ts`, `resolve.test.ts` xanh.
- `pnpm -C packages/cli typecheck` xanh.
- Lock của repo này (`agent-plugins.lock`) sau `pnpm ap sync` không đổi byte nào.
