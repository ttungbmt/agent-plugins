---
title: Chuyển oclif sang explicit command map
labels: [done]
blocked_by: []
---

Spec: [../spec.md](../spec.md) (mục Command map). ADR 0008.

## Việc cần làm
- `src/commands/index.ts` export `COMMANDS = { init, sync }`.
- `oclif.commands = { strategy: "explicit", target: "./dist/commands/index.js", identifier: "COMMANDS" }`.
- Test: `COMMANDS` khớp đúng các file trong `src/commands/` (trừ `index.ts`).

## Acceptance
- `pnpm ap --help`, `pnpm ap sync --help`, `pnpm ap init --help` như trước.
- Thêm một file command giả mà không đăng ký thì test đỏ.
