---
title: Route MCP servers through `scopeMove`
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md). ADR 0006, ADR 0014. Can run in parallel with 03, but both edit `sync()`, so merge one
before starting the other.

## Work

- An MCP server `MovableKind` adapter (`plan` wraps `planMcp` with `force` and `mcpHeld`; `run` calls
  `registry.removeMcp`/`addMcp`).
- The notice for a server another Config still claims at `user` moves into the adapter (or a `scopeMove` hook for
  `forgotten`), keeping its wording.
- In `sync()`, remove `liftedMcp`, `userMcpPlan`, `targetMcpConflicts`/`userMcpConflicts`, `userMcpSteps`, `failedMcp`,
  `claimsOfMcp` and `movingBackMcp`. `mcpNotices` and `mcpSettled` stay in `sync()`, fed from the result.
- Pass the user side's previous `mcpClaims` as `claims`.

## Acceptance

- `sync-mcp.test.ts` and `sync-user-scoped.test.ts` pass unchanged, apart from any characterization tests added first.
- Test and typecheck pass.
