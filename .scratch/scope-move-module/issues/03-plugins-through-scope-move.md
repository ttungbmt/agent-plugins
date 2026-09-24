---
title: Route plugins through `scopeMove`
labels: [ready-for-agent]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md). ADR 0012.

## Work

- A Plugin `MovableKind` adapter (`plan` wraps `planPlugins` with `force` and `pluginHeld`; `run` calls
  `registry.installPlugin`/`enablePlugin`/`disablePlugin`/`uninstallPlugin`/`unsetPlugin`).
- The marketplace-readiness check (`failedMarketplaces`, `checked.pending`, `missingMarketplaceConflict`) and the run-time
  adoption notice stay in the adapter's `run`, closed over from `sync()`.
- In `sync()`, remove `liftedPlugins`, `userPluginPlan`, `targetConflicts`/`userConflicts`, `targetPluginActions`,
  `userPluginSteps`, `failedPlugins`, `claimsOfPlugins` and `movingBack`, and read them from the `scopeMove` result.
  `ownedPlugins`/`ownedUserPlugins` (used by marketplace removals) come from `saved()`, or from a small accessor if
  `saved()` is too late.
- Before removing anything, check that `sync-plugins.test.ts` and `sync-user-scoped.test.ts` cover the order and the
  failure pinning listed in the spec, and add characterization tests where they don't.

## Acceptance

- `sync-plugins.test.ts` and `sync-user-scoped.test.ts` pass unchanged, apart from any characterization tests added
  above.
- The plugin step order in the report is identical for every existing test.
- Test and typecheck pass.
