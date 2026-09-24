# Research: `base.yaml` có phải một Bundled preset nền hợp lý không

Nguồn kiểm tra ngày 2026-09-24. Marketplace `anthropics/claude-plugins-official` được clone ở commit
[`6bfd4e0`](https://github.com/anthropics/claude-plugins-official/tree/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69)
(`main`, commit ngày 2026-09-23); Skill source `vercel-labs/skills` ở commit
[`7407f38`](https://github.com/vercel-labs/skills/tree/7407f3893ad4dceab546ac002c3ef806e4000c73) — trùng commit mà
`agent-plugins.lock` đang ghim (`agent-plugins.lock:41-44`). Trong các link bên dưới, `O/` là
`https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/`, `V/` là
`https://github.com/vercel-labs/skills/blob/7407f3893ad4dceab546ac002c3ef806e4000c73/`. Tài liệu Claude Code là bản
Markdown ở `code.claude.com/docs/en/*.md` (`hooks`, `plugins-reference`, `discover-plugins`, `settings`,
`settings-reference`, `skills`, `commands`); `claude` cài trên máy là **v2.1.281**. Không chạy Sync nào khi làm
research này; `packages/presets/base.yaml` có thay đổi chưa commit và không bị sửa.

## Câu hỏi

1. Mỗi plugin trong marketplace chính thức mang theo gì (skill, agent, command, hook và event, MCP server, LSP server),
   cần gì (binary, runtime, xác thực), và nó độc lập với stack hay gắn với một stack? 8 plugin trong `base.yaml` và
   Skill source `vercel-labs/skills` có hợp làm nền cho mọi project/user không? Có plugin độc lập stack nào đáng đưa vào
   mà đang thiếu?
2. Chồng chéo và xung đột: hook do các plugin mang theo trùng event, trigger của skill/command trùng nhau, chức năng
   trùng với built-in (`/simplify`, `/init`, `/code-review`…), chi phí của hook chạy ở mọi lần gọi tool, và mục gắn
   stack (`typescript-lsp`) có gây hại trong project không phải TS không?
3. Thứ tự có ý nghĩa không — trong Claude Code (hook, settings, `enabledPlugins`) và trong `ap` (cách gộp `plugins`
   qua Inheritance/Preset selection, thứ tự `claude plugin install`)? Nếu chỉ là hình thức, nên đặt quy ước sắp xếp
   nào?

## Tóm tắt kết luận

- **Thứ tự trong `base.yaml` không có tác dụng lúc chạy.** `enabledPlugins` là object tra theo khoá
  `plugin@marketplace`, độ ưu tiên tính theo Scope chứ không theo vị trí; mọi hook khớp event chạy song song; quyết
  định `PreToolUse` gộp theo `deny` > `defer` > `ask` > `allow`; skill trùng tên được phân xử theo nơi đặt, và skill
  của plugin luôn có namespace riêng. Trong `ap`, thứ tự YAML chỉ quyết định thứ tự chạy tuần tự các lệnh
  `claude plugin install/enable` (ảnh hưởng tới output tiến độ và việc plugin nào đã xong trước khi một lệnh lỗi).
  Settings thật trên máy thậm chí không giữ thứ tự YAML. Sắp xếp lại chỉ để dễ đọc.
- **Hai chỗ thứ tự CÓ ý nghĩa, nhưng nằm ngoài `base.yaml`:** (a) hai LSP server cùng khai một đuôi file thì server
  "đăng ký trước" thắng — tài liệu không nói thứ tự đăng ký lấy từ đâu; (b) trong `ap`, hai Preset ngang hàng
  (Preset selection) khai cùng một Plugin declaration với giá trị khác nhau thì Preset đứng sau trong `spec.presets`
  thắng một cách im lặng, khác với marketplace/MCP server (báo `preset-clash`).
- **Nền nhẹ, độc lập stack, nên giữ:** `claude-md-management`, `claude-code-setup`, `skill-creator`. Không có hook,
  không có MCP server, chỉ tốn context cho phần mô tả skill/command.
- **Nặng hoặc gây nhiễu nếu bật cho mọi project:** `security-guidance` (5 event, cần Python ≥ 3.10, tự `pip install`
  lúc `SessionStart`, gọi LLM — mặc định Opus 4.7 — sau **mỗi** lượt `Stop`/`SubagentStop` và gửi diff lên endpoint
  model) và `hookify` (chạy `python3` ở mọi `PreToolUse`/`PostToolUse`/`UserPromptSubmit`/`Stop`, kể cả khi project
  không có luật nào, và luật chỉ đọc từ `.claude/` của thư mục hiện tại nên không có luật "toàn cục").
- **Gắn stack hoặc trùng built-in:** `typescript-lsp` cần `typescript-language-server` trên `PATH` và phủ cả `.js`;
  `code-simplifier` là agent `model: opus` có quy ước JS/React viết cứng trong prompt, trùng với bundled skill
  `/simplify` và agent `code-simplifier` của `pr-review-toolkit`.
- **`commit-commands`** rẻ (chỉ có command) nhưng `/commit-push-pr` mặc định "tạo branch nếu đang ở main" và mở PR bằng
  `gh`, không khớp quy trình `dev` → `master` của repo này; giá trị thêm so với việc bảo Claude commit trực tiếp là
  nhỏ.
- **`vercel-labs/skills` không phải bộ sưu tập Skill** mà là repo của CLI `npx skills`; nó chỉ có một Skill,
  `find-skills`, với trigger rất rộng ("how do I do X") và dặn Claude chạy `npx skills add … -g -y` — tức cài Skill ngoài
  `ap`, sinh Manual entry và lệch khỏi khai báo.
- **Ứng viên độc lập stack đáng cân nhắc thêm:** `context7` (MCP server HTTP, API key tuỳ chọn; Preset
  `agent-plugins` đã bật nó). Các plugin workflow (`pr-review-toolkit`, `feature-dev`, `code-review`) độc lập stack
  nhưng có chủ kiến và trùng một phần với `/code-review` built-in, nên hợp làm Preset opt-in hơn là nền.

## Phát hiện theo plugin

### Marketplace nhìn chung

- `.claude-plugin/marketplace.json` có **311 mục**: 52 mục nguồn nằm ngay trong repo (`./plugins/*` và
  `./external_plugins/*`), 259 mục trỏ ra repo ngoài và được ghim SHA
  ([O/.claude-plugin/marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/.claude-plugin/marketplace.json)).
  Theo `category`: development 123, productivity 66, database 39, monitoring 22, security 18, deployment 9, design 8,
  và nhóm nhỏ khác. Các mục ngoài phần lớn là tích hợp của nhà cung cấp cụ thể (Airtable, Adobe, Firebase, Netlify,
  Qdrant…) nên theo định nghĩa là gắn stack/dịch vụ; research này **không** mở từng mục ngoài.
- Marketplace này có auto-update bật mặc định
  ([discover-plugins](https://code.claude.com/docs/en/discover-plugins), dòng "`claude-plugins-official`, most other
  official Anthropic marketplaces … have auto-update enabled by default"). Nội dung plugin trong nền vì vậy thay đổi
  theo `main` của Anthropic, không theo Lock.
- 11 plugin LSP (`clangd-lsp`, `csharp-lsp`, `gopls-lsp`, `jdtls-lsp`, `kotlin-lsp`, `lua-lsp`, `php-lsp`, `pyright-lsp`,
  `ruby-lsp`, `rust-analyzer-lsp`, `swift-lsp`, `typescript-lsp`) không có file nào ngoài `README.md`/`LICENSE`: cấu
  hình `lspServers` nằm trong chính mục marketplace, với `strict: false`.

### 8 plugin trong `base.yaml`

| Plugin | Mang theo | Hook (event) | Yêu cầu | Stack |
| --- | --- | --- | --- | --- |
| `claude-code-setup` | skill `claude-automation-recommender` (289 dòng + 5 file reference) | — | không | độc lập |
| `claude-md-management` | skill `claude-md-improver`, command `/revise-claude-md` | — | không | độc lập |
| `commit-commands` | command `/commit`, `/commit-push-pr`, `/clean_gone` | — | `git`; `gh` + đăng nhập cho `/commit-push-pr` | độc lập |
| `security-guidance` | chỉ hook (Python, ~8 100 dòng) | `SessionStart`, `UserPromptSubmit`, `PostToolUse` ×2 matcher, `Stop`, `SubagentStop` | Python ≥ 3.10 (3.x để chạy phần regex), mạng để `pip install claude_agent_sdk`, đường gọi API hoạt động | độc lập (luật thiên về web) |
| `code-simplifier` | agent `code-simplifier` (`model: opus`) | — | không | trên danh nghĩa độc lập, prompt thiên JS/TS/React |
| `hookify` | 4 command, 1 agent, skill `writing-hookify-rules` | `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop` (không matcher) | `python3` | độc lập |
| `skill-creator` | skill `skill-creator` (485 dòng), 3 agent con, script Python | — | Python 3 + PyYAML, `claude` CLI cho eval | độc lập |
| `typescript-lsp` | LSP server `typescript` | — | `typescript-language-server` + `typescript` trên `PATH` | **TS/JS** |

**`claude-code-setup`** — một skill chỉ đọc (`tools: Read, Glob, Grep, Bash`) phân tích codebase rồi gợi ý 1–2 tự
động hoá cho mỗi loại (MCP server, skill, hook, subagent, command)
([O/plugins/claude-code-setup/README.md#L7-L15](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/claude-code-setup/README.md#L7-L15),
[SKILL.md#L1-L5](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/claude-code-setup/skills/claude-automation-recommender/SKILL.md#L1-L5)).
Rẻ, vô hại; giá trị cao nhất lúc mới thiết lập một project. Trùng một phần với `/init` khi đặt
`CLAUDE_CODE_NEW_INIT=1` ("an interactive flow that also walks through skills, hooks…",
[commands](https://code.claude.com/docs/en/commands)).

**`claude-md-management`** — skill `claude-md-improver` (kiểm tra CLAUDE.md so với codebase) và command
`/revise-claude-md` (ghi bài học của phiên vào CLAUDE.md, `allowed-tools: Read, Edit, Glob`)
([README#L9-L13](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/claude-md-management/README.md#L9-L13),
[commands/revise-claude-md.md#L1-L4](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/claude-md-management/commands/revise-claude-md.md#L1-L4)).
Bổ sung chứ không thay `/init` (tạo CLAUDE.md lần đầu) và `/memory` (sửa tay)
([commands](https://code.claude.com/docs/en/commands)). Không hook, không yêu cầu gì.

**`commit-commands`** — ba command thuần prompt. `/commit` chỉ cho phép `git add/status/commit`;
`/commit-push-pr` "Create a new branch if on main", push rồi `gh pr create`
([commands/commit-push-pr.md#L2](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/commit-commands/commands/commit-push-pr.md#L2),
[#L16](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/commit-commands/commands/commit-push-pr.md#L16)).
Prompt không nói gì về quy ước message; nó dựa vào `git log --oneline -10` và CLAUDE.md. Không có built-in `/commit`
trong [commands](https://code.claude.com/docs/en/commands), nên không trùng tên. Ghi chú nhỏ: `allowed-tools` liệt kê
`Bash(git checkout --branch:*)`, trong khi `git checkout` tạo branch bằng `-b` — tức lệnh tạo branch nhiều khả năng
vẫn hỏi quyền (chưa kiểm chứng bằng chạy thử).

**`security-guidance`** — ba lớp: cảnh báo regex khi `Edit`/`Write`, review diff bằng LLM khi hết lượt, và reviewer
dạng agent (Agent SDK) khi `git commit`/`push`
([README#L3-L9](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/security-guidance/README.md#L3-L9)).
Chi tiết đáng chú ý cho một nền toàn cục:

- Hook ở `SessionStart` (timeout 180 s), `UserPromptSubmit`, `PostToolUse` với matcher `Edit|Write|MultiEdit|NotebookEdit`
  và `Bash` (7 handler, lọc bằng `if` cho `git commit`/`git push`/`gt …`, `asyncRewake`), `Stop` và `SubagentStop`
  (`asyncRewake`)
  ([hooks/hooks.json](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/security-guidance/hooks/hooks.json)).
- Mỗi `UserPromptSubmit` chạy `git stash create` để lấy SHA mốc
  ([security_reminder_hook.py#L26](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/security-guidance/hooks/security_reminder_hook.py#L26)).
- `SessionStart` tạo venv ở `~/.claude/security/agent-sdk-venv` và `pip install` Agent SDK nếu chưa import được
  ([ensure_agent_sdk.py#L2-L14](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/security-guidance/hooks/ensure_agent_sdk.py#L2-L14));
  Agent SDK cần Python ≥ 3.10, macOS mặc định 3.9.6 thì phần LLM "silently no-ops"
  ([sg-python.sh#L65-L70](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/security-guidance/hooks/sg-python.sh#L65-L70)).
- Model mặc định `claude-opus-4-7` cho cả review diff và reviewer commit; mỗi lần review gửi đường dẫn, hunk diff và nội
  dung file liên quan lên endpoint model; có biến tắt từng lớp (`SECURITY_GUIDANCE_DISABLE`, `ENABLE_STOP_REVIEW=0`,
  …)
  ([README#L19-L60](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/security-guidance/README.md#L19-L60),
  [#L85-L94](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/security-guidance/README.md#L85-L94)).
  `ap` hiện không quản khoá `env` của settings, nên không cấu hình được các biến này qua Preset.
- Plugin còn phát telemetry qua pipeline metric của plugin (comment trong
  [ensure_agent_sdk.py](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/security-guidance/hooks/ensure_agent_sdk.py)).

**`code-simplifier`** — một agent duy nhất, `model: opus`
([agents/code-simplifier.md#L1-L5](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-simplifier/agents/code-simplifier.md#L1-L5)).
Prompt viết cứng "project standards" kiểu JS/TS: ES modules, `function` thay arrow function, kiểu trả về tường minh,
"React component patterns with explicit Props types"
([#L13-L20](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-simplifier/agents/code-simplifier.md#L13-L20)),
và tự nhận "operate autonomously and proactively"
([#L53](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/code-simplifier/agents/code-simplifier.md#L53)).
Không có hook nên "proactive" chỉ nghĩa là Claude có thể tự giao việc cho nó dựa vào mô tả — tốn một subagent Opus
mỗi lần.

**`hookify`** — cho phép viết luật dạng `.claude/hookify.<tên>.local.md` (regex + `warn`/`block`) thay vì sửa
`hooks.json`
([README#L16-L35](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/hookify/README.md#L16-L35)).
Bốn hook đều **không có matcher**, mỗi cái `python3 …`, timeout 10 s
([hooks/hooks.json](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/hookify/hooks/hooks.json)).
Luật được glob từ `.claude/hookify.*.local.md` tương đối với thư mục hiện tại
([core/config_loader.py#L209-L211](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/hookify/core/config_loader.py#L209-L211)),
tức không có luật cấp user, và mọi lỗi đều cho qua (`exit 0`)
([hooks/pretooluse.py#L60-L62](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/hookify/hooks/pretooluse.py#L60-L62)).
Hệ quả: bật ở Scope `user` thì mọi project, kể cả project không có luật nào, trả một lần khởi động Python trước và sau
mỗi lần gọi tool. `ap` đã có `spec.hooks` (ADR 0007) cho cùng nhu cầu "luật chặn/cảnh báo đơn giản".

**`skill-creator`** — skill tạo/sửa/đo skill, kèm agent grader/analyzer/comparator và script Python chạy eval bằng
`claude -p`
([scripts/run_eval.py#L71](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/skill-creator/skills/skill-creator/scripts/run_eval.py#L71),
[scripts/quick_validate.py#L9](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/skill-creator/skills/skill-creator/scripts/quick_validate.py#L9)
cần PyYAML). Tài liệu chính thức giới thiệu đúng plugin này để chạy eval
([skills#run-evals-with-skill-creator](https://code.claude.com/docs/en/skills)). Không hook.

**`typescript-lsp`** — chỉ là cấu hình LSP: `typescript-language-server --stdio` cho `.ts .tsx .js .jsx .mts .cts .mjs
.cjs`
([marketplace.json#L3908](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/.claude-plugin/marketplace.json#L3908)).
Binary phải tự cài: "LSP plugins configure how Claude Code connects to a language server, but they don't include the
server itself. If you see `Executable not found in $PATH` in the `/plugin` Errors tab, install the required binary"
([plugins-reference#lsp-servers](https://code.claude.com/docs/en/plugins-reference#lsp-servers)). LSP server chỉ khởi
động sau khi workspace được tin cậy và không chạy trong cloud session
([plugins-reference](https://code.claude.com/docs/en/plugins-reference),
[discover-plugins#code-intelligence](https://code.claude.com/docs/en/discover-plugins#code-intelligence)); mặc định đẩy
diagnostics vào context sau mỗi lần sửa (`diagnostics`, default `true`).

### `vercel-labs/skills`

Repo này là mã nguồn của CLI `npx skills` ("The CLI for the open agent skills ecosystem",
[V/README.md](https://github.com/vercel-labs/skills/blob/7407f3893ad4dceab546ac002c3ef806e4000c73/README.md)); thư mục
`skills/` chỉ có **một** Skill, `find-skills`. `ap` tìm `skills/*/SKILL.md` nên chỉ cài đúng Skill đó
(`packages/cli/src/sync/skills.ts:61-72`, `agent-plugins.lock:41-44`).

- Mô tả kích hoạt rất rộng: dùng khi người dùng hỏi "how do I do X", "can you do X", "wants to search for tools,
  templates, or workflows"
  ([V/skills/find-skills/SKILL.md#L3](https://github.com/vercel-labs/skills/blob/7407f3893ad4dceab546ac002c3ef806e4000c73/skills/find-skills/SKILL.md#L3),
  [#L12-L19](https://github.com/vercel-labs/skills/blob/7407f3893ad4dceab546ac002c3ef806e4000c73/skills/find-skills/SKILL.md#L12-L19)).
- Nó dặn Claude cài hộ bằng `npx skills add <owner/repo@skill> -g -y` (cấp user, bỏ xác nhận)
  ([#L97-L103](https://github.com/vercel-labs/skills/blob/7407f3893ad4dceab546ac002c3ef806e4000c73/skills/find-skills/SKILL.md#L97-L103)).
  Skill cài theo đường này không qua `ap`: `ap` coi nó là Manual entry, không có trong Lock/State, và Config không còn
  mô tả đủ trạng thái — đi ngược mục đích khai báo của `ap`. Cần `node`/`npx` và mạng.
- Nó độc lập stack, nhưng không phải là "nền" theo nghĩa nội dung; nó là công cụ khám phá.

### Các plugin còn lại trong repo (tóm tắt)

| Plugin | Thành phần | Hook | Yêu cầu / ghi chú | Stack |
| --- | --- | --- | --- | --- |
| `agent-sdk-dev` | 1 command, 2 agent | — | — | Agent SDK (TS/Py) |
| `claude-security` | 8 agent, 1 skill, 1 workflow | `UserPromptExpansion` (chỉ menu của nó), `PostToolUse`/`PostToolUseFailure` (lọc `if` script của nó) | Python | độc lập, opt-in |
| `code-modernization` | 10 command, 8 agent, 6 workflow | — | — | code legacy |
| `code-review` | command `/code-review:code-review` | — | `gh` | độc lập; trùng tên với bundled `/code-review` |
| `cwc-makers` | 1 command, 2 skill | — | phần cứng Cardputer | chuyên biệt |
| `example-plugin` | mẫu, có MCP server giả | — | — | không dùng thật |
| `explanatory-output-style` / `learning-output-style` | chỉ hook | `SessionStart` (chèn chỉ dẫn vào context) | — | độc lập, đổi giọng trả lời |
| `feature-dev` | 1 command, 3 agent | — | — | độc lập, có chủ kiến |
| `frontend-design` | 1 skill | — | — | frontend |
| `math-olympiad` | 1 skill | — | LaTeX cho PDF | chuyên biệt |
| `mcp-server-dev` | 3 skill | — | — | phát triển MCP |
| `mcp-tunnels` | 1 command | — | Docker | chuyên biệt |
| `playground` | 1 skill | — | — | độc lập |
| `plugin-dev` | 1 command, 3 agent, 7 skill | — | — | phát triển plugin |
| `pr-review-toolkit` | 1 command, 6 agent (có `code-simplifier` riêng) | — | — | độc lập |
| `project-artifact` | 1 skill | — | claude.ai artifact | độc lập |
| `ralph-loop` | 3 command | `Stop` | — | độc lập, opt-in theo phiên |
| `receipts`, `session-report` | 1 skill mỗi cái | — | `node` | độc lập, đọc transcript cục bộ |
| 11 plugin `*-lsp` | LSP server | — | binary ngôn ngữ tương ứng | theo ngôn ngữ |
| `context7` | MCP server HTTP `mcp.context7.com` | — | mạng; `CONTEXT7_API_KEY` tuỳ chọn | độc lập |
| `github`, `gitlab`, `linear`, `asana` | MCP server HTTP | — | OAuth/token của dịch vụ | theo dịch vụ |
| `firebase`, `playwright`, `serena`, `terraform`, `laravel-boost` | MCP server stdio (`npx`, `uvx`, `docker`, `php`) | — | runtime tương ứng | theo stack |
| `discord`, `telegram`, `imessage`, `fakechat` | MCP server (channel) + skill | — | `bun`, token bot | kênh chat |

Nguồn bảng: cây thư mục `plugins/` và `external_plugins/`, các `hooks/hooks.json` và `.mcp.json` tại commit đã ghim
(ví dụ
[O/external_plugins/context7/.mcp.json](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/external_plugins/context7/.mcp.json),
[O/plugins/claude-security/hooks/hooks.json](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins/claude-security/hooks/hooks.json)).

**Ứng viên độc lập stack đang thiếu:** chỉ `context7` đủ mạnh — không hook, một MCP server HTTP, API key là tuỳ chọn,
và Preset `agent-plugins` đã bật nó (`packages/presets/agent-plugins.yaml:17`). Đổi lại nó gửi truy vấn ra dịch vụ bên
thứ ba và thêm tool vào context. `session-report` rẻ nhưng là tiện ích thỉnh thoảng mới dùng. `pr-review-toolkit`,
`feature-dev`, `code-review` hợp làm một Preset "review/workflow" opt-in.

## Chồng chéo và xung đột

**Hook trùng event.** `security-guidance` và `hookify` cùng móc `UserPromptSubmit`, `PostToolUse` và `Stop`.
`PreToolUse` chỉ có `hookify`. Theo tài liệu, "All matching hooks run in parallel. If you define the same handler in
more than one settings file, it runs once. A plugin's or skill's copy of the same handler stays separate"
([hooks#hook-handler-fields](https://code.claude.com/docs/en/hooks#hook-handler-fields)); hook của plugin "merge with
your user and project hooks" ([hooks#hook-locations](https://code.claude.com/docs/en/hooks#hook-locations)). Nên hai
plugin không chặn nhau và không phụ thuộc thứ tự; nếu nhiều hook `PreToolUse` trả quyết định khác nhau thì "precedence is
`deny` > `defer` > `ask` > `allow`"
([hooks#pretooluse-decision-control](https://code.claude.com/docs/en/hooks#pretooluse-decision-control)); nhiều
`additionalContext` cho cùng event thì Claude nhận tất cả
([hooks#add-context-for-claude](https://code.claude.com/docs/en/hooks#add-context-for-claude)). Xung đột thật là về
**chi phí**, không phải hành vi:

| Thời điểm | `hookify` | `security-guidance` |
| --- | --- | --- |
| Mở phiên | — | `SessionStart`: dò Python, có thể tạo venv + `pip install` (≤ 180 s) |
| Mỗi prompt | `python3` | Python + `git stash create` |
| Trước mỗi tool | `python3` | — |
| Sau mỗi tool | `python3` | Python sau mỗi `Edit`/`Write`; `git commit`/`push` → reviewer agent chạy nền |
| Hết lượt / subagent xong | `python3` (`Stop`) | review diff bằng LLM chạy nền, có thể "rewake" Claude (`Stop`, `SubagentStop`) |

Với `PostToolUse`, tài liệu lưu ý nó "fires concurrently when Claude makes parallel tool calls"
([hooks#posttoolbatch](https://code.claude.com/docs/en/hooks)), nên một batch tool song song sinh bấy nhiêu tiến trình
Python cho mỗi plugin. Thời gian khởi động Python cụ thể chưa đo.

**Trùng chức năng với built-in và với plugin khác.**

- `code-simplifier` ↔ bundled skill `/simplify` ("Four review agents run in parallel, covering reuse …, simplification,
  efficiency…", [commands](https://code.claude.com/docs/en/commands)) ↔ agent `pr-review-toolkit:code-simplifier`. Agent
  của plugin có tên theo namespace (`my-plugin:code-reviewer`,
  [plugins-reference](https://code.claude.com/docs/en/plugins-reference)), nên không đè nhau, nhưng Claude có ba lựa
  chọn gần như cùng mô tả.
- `claude-md-management` ↔ `/init`, `/memory`: bổ sung, không trùng (xem trên).
- `claude-code-setup` ↔ `/init` với `CLAUDE_CODE_NEW_INIT=1`: trùng một phần.
- `skill-creator` ↔ `plugin-dev` (skill `skill-development`, có file `skill-creator-original.md`) ↔ skill
  `skill-creator` đồng bộ từ tài khoản claude.ai (chạy dưới tên `/anthropic-skills:<name>`,
  [skills#resolve-skills-that-share-a-name](https://code.claude.com/docs/en/skills)). Trong phiên làm research này,
  danh sách skill hiện cả `anthropic-skills:skill-creator` lẫn skill của plugin — tức người dùng đã có một bản
  skill-creator từ claude.ai (quan sát tại chỗ, không phải tài liệu). Skill của plugin luôn có namespace nên cả hai
  cùng nạp; chi phí là mô tả trùng trong context và Claude phải chọn.
- `commit-commands` ↔ không có built-in `/commit`; nhưng `/commit-push-pr` va với quy trình git có chủ kiến của từng
  repo (repo này: branch cắt từ `dev`, PR vào `dev`, `.claude/rules/git.md`).
- `code-review` (không có trong nền) ↔ bundled `/code-review` và alias `/review`: plugin chạy dưới tên
  `/code-review:code-review`, không đè built-in.
- `find-skills` ↔ `claude-code-setup` (cả hai gợi ý mở rộng) và ↔ chính `ap` (cài Skill ngoài khai báo).

**Mục gắn stack.** `typescript-lsp` trong project không có TS/JS: nếu thiếu binary thì `/plugin` báo lỗi
`Executable not found in $PATH` ([plugins-reference](https://code.claude.com/docs/en/plugins-reference), bảng lỗi) —
nhiễu, không chặn. Nếu có binary thì server phục vụ file theo đuôi; việc nó có khởi động ngay khi mở phiên hay chỉ khi
chạm file `.ts/.js` thì **chưa kiểm chứng**. Vì phủ cả `.js/.mjs/.cjs`, nó cũng hoạt động ở project không phải TS
nhưng có script JS (như `workflows/*.js` của repo này). Hại thật sẽ xuất hiện khi một Preset stack khác cũng khai LSP
cho cùng đuôi (xem phần thứ tự). Tương tự, prompt của `code-simplifier` sẽ đẩy quy ước JS/React vào project Python/Go.

## Thứ tự

### Trong Claude Code

- **`enabledPlugins`** là "object mapping `plugin-name@marketplace-name` to a Boolean"
  ([settings-reference#enabledplugins](https://code.claude.com/docs/en/settings-reference#enabledplugins)). Giá trị
  được chọn theo Scope ("Project settings take precedence over user settings…"), không theo vị trí khoá; thứ tự ưu
  tiên chung là managed > dòng lệnh > local > project > user
  ([settings#settings-precedence](https://code.claude.com/docs/en/settings#settings-precedence)). Tài liệu không nói
  thứ tự khoá trong object có ý nghĩa gì.
- **Hook:** chạy song song, gộp quyết định theo độ ưu tiên cố định (trích ở trên). Không có khái niệm "plugin trước
  chạy trước".
- **Skill/command trùng tên:** phân xử theo nơi đặt (enterprise > personal > project; skill thắng file
  `.claude/commands/`), skill của plugin luôn có namespace
  ([skills#resolve-skills-that-share-a-name](https://code.claude.com/docs/en/skills)). Không theo thứ tự bật plugin.
- **Ngoại lệ — LSP:** "when more than one enabled LSP server declares the same file extension …, the first server
  registered handles files with that extension and the others never start. The `/plugin` interface shows a warning
  naming the plugin whose server is active"
  ([plugins-reference#lsp-servers](https://code.claude.com/docs/en/plugins-reference#lsp-servers)). Tài liệu không nói
  "đăng ký trước" dựa vào đâu (thứ tự khoá `enabledPlugins`, thứ tự cài, hay tên) — **chưa kiểm chứng**. Base chỉ có
  một LSP nên không bị ảnh hưởng.
- Bằng chứng thực tế: `.claude/settings.json` của repo này có `enabledPlugins` theo thứ tự `claude-md-management`,
  `typescript-lsp`, `mattpocock-skills`, `context7`, `claude-code-setup` (`.claude/settings.json:2-8`), khác hẳn thứ
  tự trong Preset `agent-plugins` (`packages/presets/agent-plugins.yaml:16-21`) và trong Lock
  (`agent-plugins.lock:23-35`). Settings trên máy vốn không giữ thứ tự khai báo.

### Trong `ap`

- `readPlugins` đọc map bằng `Object.entries` trên kết quả `yaml.parse`, nên giữ thứ tự khoá YAML
  (`packages/cli/src/sync/resolve.ts:444-455`). Không có chỗ nào sắp xếp Plugin declaration (không có `sort` trong
  `resolve.ts`, `plan-plugins.ts`, `registry.ts`, `store.ts`).
- Gộp: Preset được nạp cha trước, con sau, theo thứ tự `spec.presets`; `spec.plugins` của Config gộp cuối
  (`resolve.ts:81`, `resolve.ts:327`). `mergePlugins` là một `Map` "ghi sau thắng" theo id (`resolve.ts:177-181`),
  đúng như thiết kế "trùng khoá → giá trị sau thắng, nên `false` tắt được plugin Preset cha đã bật"
  (`docs/design/ap-sync.md:67`). Vì `Map.set` trên khoá đã có giữ nguyên vị trí cũ, thứ tự cuối cùng là thứ tự lần
  đầu một plugin xuất hiện.
- `planPlugins` duyệt khai báo theo đúng thứ tự đó (`plan-plugins.ts:25-64`), và các bước được chạy **tuần tự**
  (`index.ts:279-297`), theo thứ tự nhóm cố định: thêm marketplace → action plugin → gỡ marketplace
  (`docs/design/ap-sync.md:82`). Một lệnh lỗi không chặn các lệnh sau. Mỗi lệnh `claude plugin install/enable` ghi một
  khoá riêng; `ap` tự ghi `false`/xoá khoá bằng spread object (`registry.ts:164-168`).
- **Chỗ thứ tự có tác dụng ngữ nghĩa:** hai Preset ngang hàng trong `spec.presets` khai cùng plugin với giá trị khác
  nhau → Preset đứng sau thắng, không báo gì. Điều này khác marketplace (khác source → `preset-clash`,
  `resolve.ts:120-135`) và MCP server (khác cấu hình → `preset-clash`, `docs/design/ap-sync.md:134`), dù
  `ap-sync.md:67` viết "Gộp như `marketplaces`". ADR 0004 nói độ ưu tiên "tính theo đồ thị kế thừa, không theo thứ tự
  nạp" (`docs/adr/0004-preset-extends-vs-config-presets.md:13`) — với plugin ngang hàng thì thực tế lại theo thứ tự
  nạp. Đây là vấn đề của Preset selection, không phải của `base.yaml`.

**Kết luận:** đổi thứ tự trong `base.yaml` không đổi hành vi Claude Code và không đổi kết quả Sync; nó chỉ đổi thứ tự
dòng tiến độ và thứ tự chạy lệnh cài. Thuần tuý là chuyện dễ đọc.

**Quy ước đề xuất** (cho `plugins`, và dùng lại cho `skills`/`mcpServers`): nhóm theo vai trò, mỗi nhóm một dòng
comment; trong nhóm xếp theo alphabet; plugin mang hook ghi rõ event trong comment để chi phí nhìn thấy được; mục gắn
stack đứng cuối (hoặc tốt hơn, nằm ở Preset stack). Ví dụ:

```yaml
plugins:
  # Claude Code setup & memory
  claude-code-setup@claude-plugins-official: true
  claude-md-management@claude-plugins-official: true
  skill-creator@claude-plugins-official: true

  # Git workflow
  commit-commands@claude-plugins-official: true

  # Hooks — run on every session (events listed)
  security-guidance@claude-plugins-official: true # SessionStart, UserPromptSubmit, PostToolUse, Stop, SubagentStop

  # Stack-specific — prefer a stack Preset
  typescript-lsp@claude-plugins-official: true
```

Alphabet thuần cũng được và dễ giữ hơn khi danh sách dài; nhóm theo vai trò thì truyền đạt ý định tốt hơn.

## Đề xuất cho `base.yaml`

Đây là đầu vào cho quyết định sau; không sửa `base.yaml`.

| Mục | Đề xuất | Lý do | Đánh đổi |
| --- | --- | --- | --- |
| `claude-md-management` | **Giữ** | Không hook, không yêu cầu, hữu ích ở mọi repo có CLAUDE.md | Thêm mô tả skill/command vào context |
| `claude-code-setup` | **Giữ** | Chỉ đọc, rẻ, độc lập stack | Giá trị chủ yếu lúc mới setup; trùng một phần `/init` mới |
| `skill-creator` | **Giữ** (hoặc chuyển sang Preset "authoring") | Được tài liệu chính thức giới thiệu; không hook | Trùng với bản `anthropic-skills:skill-creator` nếu người dùng đồng bộ từ claude.ai; cần Python/PyYAML để chạy eval |
| `commit-commands` | Giữ **hoặc** bỏ — cân nhắc | Rẻ, chỉ command | `/commit-push-pr` giả định branch từ `main` + `gh`; repo có quy ước git riêng thì dễ đi lệch |
| `security-guidance` | **Chuyển sang Preset opt-in** (vd. `security`) | 5 event, Python ≥ 3.10, `pip install` lúc mở phiên, gọi LLM Opus mỗi lượt, gửi diff ra endpoint model | Mất lớp cảnh báo bảo mật mặc định; giữ lại thì nên kèm hướng dẫn `SECURITY_REVIEW_MODEL`/`ENABLE_STOP_REVIEW=0` (ngoài khả năng của `ap` hiện tại) |
| `hookify` | **Bỏ khỏi nền** (Preset opt-in nếu cần) | 4 hook không matcher chạy Python ở mọi tool/prompt/stop, kể cả khi không có luật; luật chỉ theo project; `spec.hooks` của `ap` đã phủ nhu cầu | Mất `/hookify` sinh luật từ hội thoại |
| `code-simplifier` | **Bỏ** hoặc chuyển sang Preset TS/web | Trùng `/simplify` built-in và `pr-review-toolkit`; prompt thiên JS/React; agent Opus có thể bị tự gọi | Mất một agent dọn code chạy riêng |
| `typescript-lsp` | **Chuyển sang Preset stack** (vd. `typescript`) | Cần binary ngoài; lỗi nhiễu nếu thiếu; phủ `.js`; LSP cùng đuôi thì "đăng ký trước thắng" | Project TS phải chọn thêm Preset stack; Preset `agent-plugins` đã tự khai nó nên repo này không mất gì |
| `vercel-labs/skills` (`find-skills`) | **Bỏ khỏi nền** | Chỉ một Skill; trigger quá rộng; dặn cài Skill bằng `npx skills add -g -y` ngoài `ap` | Mất gợi ý khám phá Skill; ai muốn thì tự khai trong Config |
| `context7` | **Cân nhắc thêm** | Độc lập stack, không hook, MCP server HTTP, key tuỳ chọn | Gọi dịch vụ bên thứ ba; thêm tool vào context |

Hai ghi chú phụ:

- Preset `agent-plugins` khai lại `claude-code-setup`, `typescript-lsp`, `claude-md-management` cùng giá trị `true` như
  `base` (`packages/presets/agent-plugins.yaml:16-21`). Không hại (con thắng cha, cùng giá trị) nhưng thừa; nếu
  `typescript-lsp` rời `base` thì dòng của nó trong `agent-plugins` mới thật sự cần.
- Để đo chi phí context thay vì đoán, `claude plugin details <name>` in "an estimate of how many tokens it adds to each
  session" ([plugins-reference#plugin-details](https://code.claude.com/docs/en/plugins-reference)). Chưa chạy lệnh này
  cho 8 plugin.

## Chưa kiểm chứng

- LSP server có khởi động ngay khi mở phiên hay chỉ khi chạm file đúng đuôi; và "the first server registered" được xác
  định bởi thứ tự nào.
- Thời gian thực tế mỗi lần khởi động Python của `hookify`/`security-guidance` và chi phí token của review `Stop`.
- Chi phí context (token) của từng plugin (`claude plugin details`).
- `Bash(git checkout --branch:*)` trong `commit-push-pr.md` có khiến lệnh tạo branch phải hỏi quyền hay không.
- Nội dung 259 mục marketplace trỏ ra repo ngoài (chỉ đọc mô tả trong `marketplace.json`).
- Hành vi `find-skills` khi Claude chạy `npx skills add -g` đối với thư mục `~/.claude/skills` so với
  `~/.agents/skills` (CLI hỗ trợ cả hai theo `src/agents.ts`, chưa lần tới cùng).

## Nguồn

- Marketplace: [O/.claude-plugin/marketplace.json](https://github.com/anthropics/claude-plugins-official/blob/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/.claude-plugin/marketplace.json);
  plugin: [O/plugins/](https://github.com/anthropics/claude-plugins-official/tree/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/plugins),
  [O/external_plugins/](https://github.com/anthropics/claude-plugins-official/tree/6bfd4e0c6d3da6050984fa5ed8281d915fa7ed69/external_plugins).
- Skill source: [V/skills/find-skills/SKILL.md](https://github.com/vercel-labs/skills/blob/7407f3893ad4dceab546ac002c3ef806e4000c73/skills/find-skills/SKILL.md),
  [V/README.md](https://github.com/vercel-labs/skills/blob/7407f3893ad4dceab546ac002c3ef806e4000c73/README.md).
- Claude Code docs: [hooks](https://code.claude.com/docs/en/hooks),
  [plugins-reference](https://code.claude.com/docs/en/plugins-reference),
  [discover-plugins](https://code.claude.com/docs/en/discover-plugins),
  [settings](https://code.claude.com/docs/en/settings),
  [settings-reference](https://code.claude.com/docs/en/settings-reference),
  [skills](https://code.claude.com/docs/en/skills), [commands](https://code.claude.com/docs/en/commands).
- Repo này: `packages/cli/src/sync/resolve.ts`, `plan-plugins.ts`, `index.ts`, `registry.ts`, `skills.ts`;
  `docs/design/ap-sync.md`; `docs/adr/0004-preset-extends-vs-config-presets.md`, `0007-ap-writes-hooks-to-settings.md`;
  `packages/presets/base.yaml`, `packages/presets/agent-plugins.yaml`; `agent-plugins.lock`; `.claude/settings.json`.
