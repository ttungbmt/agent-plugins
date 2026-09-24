---
title: Decide whether marketplaces can go through `scopeMove`
labels: [done]
blocked_by: [03, 04]
---

Spec: [../spec.md](../spec.md) (Marketplace stays outside `scopeMove` for now). ADR 0011.

## Question

With plugins and MCP servers on `scopeMove`, what is left in `sync()` for User-scoped marketplaces: `lifted`,
`planUserScoped`, `moving`, `userRemovals`, `userSteps` and the `forget`-instead-of-`remove` rule. Can it fit
`MovableKind` with one small addition (for example, `run` receiving whether the key is moving), without adding the
plugin gating (`inUse`, Manual plugin entries) to the interface?

## Outcome

- If yes: write a follow-up ticket that routes marketplaces through `scopeMove`, with the same acceptance as 03.
- If no: record why in the spec's Out of scope section and close this ticket.

## Decision

No. Marketplaces share only the step order with `scopeMove`; the reasons are recorded in the spec's Out of scope section.
The duplicated removal gate for the targeted Scope and `user` became one `gatedRemovals` helper in `sync()`.
