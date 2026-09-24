---
title: "Add a User-scoped MCP server example; finish docs"
labels: [ready-for-agent]
blocked_by: [02, 03, 04]
---

# 05: Add a User-scoped MCP server example; finish docs

Spec: [../spec.md](../spec.md), decision 12. ADR 0014.

- [ ] A sample under `examples/` declares one catalog and one inline server with `scope: user`.
- [ ] `docs/design/ap-sync.md` "User-scoped MCP server" matches what shipped (Vietnamese).
- [ ] No Bundled preset changes.
- [ ] `pnpm -C packages/cli test` and `pnpm -C packages/cli typecheck` pass.
