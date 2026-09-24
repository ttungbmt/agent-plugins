# Feature workflow

Larger features move through research in `docs/research/<topic>.md`, a spec at `.scratch/<feature>/spec.md`, and
tickets at `.scratch/<feature>/issues/NN-<slug>.md` (frontmatter `labels` and `blocked_by`, plus acceptance criteria).

Before starting a ticket, read the spec, ADRs and `CONTEXT.md` sections it links, and work blockers first. When a
ticket ships, set its `labels` to `[done]`.
