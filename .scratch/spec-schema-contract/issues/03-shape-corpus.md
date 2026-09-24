---
title: Shape corpus that runs the same documents through ajv and the parser
labels: [done]
blocked_by: [02]
---

Spec: [../spec.md](../spec.md) (Solution 3).

## Work

- In `spec-schema.test.ts`, for every `examples/*/agent-plugins.yaml` and every Preset in `packages/cli/presets/`
  (not `mcp-servers.yaml`, which has its own schema), validate against the matching schema with `Ajv2020`, and resolve
  it with `resolveConfig` offline (`makeTree`, a stub `fetch`, the default presets dir).
- Skip a document that uses a known-gap key for the ajv half only, and name the gap in the skip reason, so the
  corpus doesn't grow its own exception list.
- Add a small set of invalid fixtures that both must reject, one per shared shape: a non-list `skills`, an item entry
  with an unknown field, a plugin value that isn't `true`/`false`/`{ enabled, scope }`, and an MCP server with a
  non-`user` scope.

## Acceptance

- Every sample Config and default Preset is accepted by both, except where a known gap applies.
- Every invalid fixture is rejected by both.
- Adding a field to an item entry in the parser without the schema (or the reverse) makes at least one fixture
  disagree. Check this by hand once while writing the test.
- Test and typecheck pass.
