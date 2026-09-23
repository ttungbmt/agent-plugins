# Agent Plugins

## Prior Art & Acknowledgements

`agent-plugins` exists because these ecosystems already solve parts of the problem
well — and because assembling them by hand is what made a resolver necessary.
They are both the inspiration for this project and the reference publishers its
catalog is modelled against.

| Ecosystem | What it is | What `agent-plugins` takes from it |
| --- | --- | --- |
| [Superpowers](https://github.com/obra/superpowers) | An agentic skills framework and development methodology for Claude Code, by Jesse Vincent | Skills as enforced process rather than documentation — brainstorming, TDD, systematic debugging |
| [Everything Claude Code (ECC)](https://github.com/affaan-m/everything-claude-code) | A broad agent harness: agents, skills, commands, rules and hooks across several runtimes | Multi-runtime packaging, and the scale at which a catalog still has to stay navigable |
| [Matt Pocock Skills](https://github.com/mattpocock/skills) | "Skills for Real Engineers", published straight from a working `.agents` directory | Separating user-invoked orchestration from model-invoked discipline; stack-specific skills |
| [Anthropic Skills](https://github.com/anthropics/skills) | Anthropic's public Agent Skills repository and format specification | The `SKILL.md` format as the common denominator every adapter renders to |
| [wshobson/agents](https://github.com/wshobson/agents) | A multi-harness plugin marketplace: one Markdown source rendered into harness-native artifacts for Claude Code, Codex, Cursor, OpenCode, Copilot and Pi | Evidence that a single source of truth can target many runtimes without lowest-common-denominator output — the adapter model |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | Production-grade engineering lifecycle skills for AI coding agents, each with explicit verification gates | Verification gates as part of a skill's contract, and a lifecycle-shaped way to name capabilities |

The overlap between them — three credible TDD skills, several code-review agents —
is exactly what [capability resolution](docs/02-architecture/resolution-spec.md)
is designed to arbitrate.

All of the above remain the work of their authors, under their own licenses.
`agent-plugins` resolves and installs from upstream sources; it does not vendor,
fork, or re-license their content.