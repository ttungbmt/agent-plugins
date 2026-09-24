# Research: MCP servers for the bundled catalog (`packages/presets/mcp-servers.yaml`)

Goal: choose catalog entries for Jina, Firecrawl, Tavily, GitHub, Cloudflare, Atlassian (Jira + Confluence), GitLab and
Filesystem. Each entry must fit `McpCatalog` ([`mcp-catalog.schema.json`](../../packages/schemas/schemas/mcp-catalog.schema.json)
→ `preset.schema.json#/$defs/mcpServer`) and [ADR 0006](../adr/0006-mcp-servers-inline-plus-bundled-catalog.md).
Sources checked on 2026-09-24. Only primary sources are used: vendor repos and docs, the npm/PyPI/GHCR registries, the
`modelcontextprotocol/servers` repo and the Claude Code docs. GitHub links are pinned to the default-branch commit on
that date. Registry versions are the `latest` dist-tag on that date. Claude Code docs are the Markdown version,
[`code.claude.com/docs/en/mcp.md`](https://code.claude.com/docs/en/mcp.md), cited below as `CC-MCP`.

I also sent unauthenticated MCP `initialize` requests to each remote endpoint and read each endpoint's OAuth metadata
(`/.well-known/oauth-protected-resource`, then the authorization server's `/.well-known/oauth-authorization-server`).
These checks show whether an endpoint needs auth and whether it supports Dynamic Client Registration (DCR) or Client ID
Metadata Documents (CIMD). Without either one, Claude Code's OAuth needs a pre-registered client ID. Results are in the
table at the end of the Summary.

## Summary

- **Everything except Filesystem and Atlassian Data Center has an official remote (streamable HTTP) server.** Remote
  `type: http` entries need no Node/Python/Docker, no version pin and no `ap` release when the vendor ships a fix. So
  remote is the default choice below. A local stdio variant is listed only where remote cannot do the job.
- **Auth splits into two groups.**
  - *Header token, which works headless and in CI:* Jina, Firecrawl, Tavily and GitHub use
    `Authorization: Bearer ${VAR}`. The Cloudflare Code Mode server also accepts a Bearer API token.
  - *OAuth in the browser via `/mcp`:* Atlassian Cloud, GitLab, the Cloudflare domain servers, and optionally Tavily
    and Firecrawl.
  - The current `ap` schema cannot hold Claude Code's `oauth` object (`clientId`, `callbackPort`) or `headersHelper`,
    so an OAuth entry only works when the server supports DCR or CIMD.
- **GitHub remote OAuth does not work from a plain Claude Code entry.** `github.com/login/oauth` publishes no
  `registration_endpoint` and no CIMD support. GitHub's own Claude Code guide and the Claude Code docs both use a PAT in
  `Authorization`. The old `@modelcontextprotocol/server-github` is archived, and npm marks it "no longer supported".
- **Once an `Authorization` header is set, Claude Code does not fall back to OAuth.** An unset `${VAR}` is sent
  literally, with only a warning (`CC-MCP` "Unset variables without a default", and "If you configured
  `headers.Authorization` … reports the connection as failed instead of falling back to OAuth"). So each server must
  pick either a header entry or an OAuth entry. It cannot be both. Where both are useful, this note proposes two names.
- **Firecrawl: refresh the entry.** `firecrawl-mcp` is now `3.25.4` (published 2026-09-23; the catalog pins `3.25.3`).
  The vendor now documents the hosted server `https://mcp.firecrawl.dev/v2/mcp` with `Authorization: Bearer` as the
  API-key path, and `/v2/mcp-oauth` for browser sign-in. The proposal is to switch to hosted, with stdio `3.25.4` as the
  fallback.
- **Atlassian: the official Rovo MCP server is Cloud-only.** It runs at `https://mcp.atlassian.com/v2/mcp`, uses OAuth
  2.1 with DCR, and API tokens only after an admin enables them. Jira/Confluence **Server/Data Center** needs the
  community `sooperset/mcp-atlassian` (PyPI `mcp-atlassian` `0.23.1`) with `JIRA_PERSONAL_TOKEN`.
- **GitLab: the official server is built into GitLab.** It lives at `https://<host>/api/v4/mcp`, has been Beta and Free
  tier since 19.2, and supports OAuth only, with DCR (no PAT documented). Self-managed works by changing the host, which
  `${GITLAB_HOST:-gitlab.com}` can express. The old `@modelcontextprotocol/server-gitlab` is archived and deprecated. If
  you need a PAT instead, the maintained community option is `@zereight/mcp-gitlab` `2.1.66`.
- **Cloudflare:** `cloudflare-docs` is correct as is (no auth, `200` on `initialize`). The recommended broad server is
  **Code Mode** at `https://mcp.cloudflare.com/mcp`. It covers the whole Cloudflare API in about 1k tokens and includes a
  `docs` tool. The domain servers (bindings, builds, observability, browser, …) are OAuth-only (DCR + CIMD).
- **Filesystem:** `@modelcontextprotocol/server-filesystem` `2026.8.31` is a *reference* server ("educational examples
  … not production-ready"). Claude Code answers MCP `roots/list` with the launch dir plus `--add-dir` dirs, and the
  server lets roots replace its CLI dirs. So a fallback arg `${CLAUDE_PROJECT_DIR:-.}` is enough. Claude Code already
  has native file tools, so it's worth asking whether this entry is needed at all.

Endpoint probe results (2026-09-24, unauthenticated `initialize`):

| Endpoint | HTTP | Auth server | DCR | CIMD |
|---|---|---|---|---|
| `https://mcp.jina.ai/v1` | 200 | none (key optional) | – | – |
| `https://mcp.firecrawl.dev/v2/mcp` | 200 | none (keyless tier) | – | – |
| `https://mcp.firecrawl.dev/v2/mcp-oauth` | 401 | OAuth (`fco_…` tokens) | not checked | not checked |
| `https://mcp.tavily.com/mcp/` | 401 | `https://mcp.tavily.com/` | yes | yes |
| `https://api.githubcopilot.com/mcp/` | 401 | `https://github.com/login/oauth` | **no** | **no** |
| `https://docs.mcp.cloudflare.com/mcp` | 200 | none | – | – |
| `https://mcp.cloudflare.com/mcp` (+ `bindings`, `builds`, `observability`, `browser`, `radar`) | 401 | same host | yes | yes |
| `https://mcp.atlassian.com/v2/mcp` | 401 | `auth.atlassian.com/…` | yes | yes |
| `https://gitlab.com/api/v4/mcp` | 401 | `https://gitlab.com` | yes | no |

---

## 0. Claude Code semantics that shape the entries

- **Transports.** stdio (`command`/`args`/`env`) and remote `type: http` (`url`/`headers`). `sse` is deprecated. `ws`
  also exists but is not in the `ap` schema ([`CC-MCP` L147-156](https://code.claude.com/docs/en/mcp.md)).
- **Expansion.** `${VAR}` and `${VAR:-default}` are expanded in `command`, `args`, `env`, `url` and `headers`
  ([`CC-MCP` "Environment variable expansion in `.mcp.json`"](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json)).
  An unset variable with no default makes Claude Code print a warning, and the text is passed on literally.
- **Credential names read as empty in remote `url`/`headers`.** Examples are `ANTHROPIC_API_KEY`, cloud-provider
  keys, `NPM_TOKEN` and `HTTPS_PROXY` (`CC-MCP` "Credential variables that read as empty"). None of the names proposed
  here are in that set.
- **`CLAUDE_PROJECT_DIR`** is set in the *server's* environment. In `args` of a project, local or user entry it must be
  written `${CLAUDE_PROJECT_DIR:-.}` (`CC-MCP` L115-119).
- **Roots.** Claude Code answers `roots/list` with the launch dir and every `--add-dir`/`additionalDirectories` dir,
  and since v2.1.203 it sends `notifications/roots/list_changed` (`CC-MCP` L117).
- **OAuth.** Run `/mcp` or `claude mcp login <name>`. Tokens are stored per endpoint. Servers without DCR/CIMD need
  `--client-id`/`oauth.clientId` (`CC-MCP` "Use pre-configured OAuth credentials"), and the `ap` schema can't express
  that today.
- **`ap` secret check.** `packages/cli/src/sync/mcp.ts` rejects `env`/`headers` values whose *key* matches
  `/key|token|secret|password|auth|credential/i` unless the value contains `${`. `Authorization` matches, so every
  proposed header uses `${…}`. Non-secret headers such as `X-MCP-Toolsets` are fine as literals.

## 1. Jina

- **Official:** [`jina-ai/MCP`](https://github.com/jina-ai/MCP/blob/5d6eb191a75d8e67b6e01ce427f0cc5c05c800aa/README.md),
  "Jina AI Remote MCP Server", owned by Jina AI. It is remote-only, and Jina publishes no npm/PyPI stdio package. The
  npm `jina-mcp-tools` (`1.2.5`, [PsychArch/jina-mcp-tools](https://www.npmjs.com/package/jina-mcp-tools)) is
  **community** and is not proposed.
- **Transport:** streamable HTTP at `https://mcp.jina.ai/v1`. The README's Claude Code snippet is
  `claude mcp add -s user --transport http jina https://mcp.jina.ai/v1 --header "Authorization: Bearer ${JINA_API_KEY}"`
  ([README L10-30](https://github.com/jina-ai/MCP/blob/5d6eb191a75d8e67b6e01ce427f0cc5c05c800aa/README.md#L10-L30)).
  `mcp-remote` is only a proxy for clients without remote support.
- **Auth/secret:** `Authorization: Bearer ${JINA_API_KEY}`. The README marks the key "optional". `read_url` and
  `capture_screenshot_url` work without a key at lower rate limits. `search_*`, `sort_by_relevance`,
  `deduplicate_strings` and `extract_pdf` require one
  ([tools table](https://github.com/jina-ai/MCP/blob/5d6eb191a75d8e67b6e01ce427f0cc5c05c800aa/README.md#available-tools)).
  In my probe, `read_url` with no key and with an empty `Bearer ` both returned `HTTP 401: Unauthorized`, so treat the
  key as required.
- **Options:** server-side filtering through query params on the URL: `include_tools`, `exclude_tools`,
  `include_tags`, `exclude_tags` (tags `search`, `read`, `utility`, `rerank`) and `max_tokens`
  ([README "Tool Filtering"](https://github.com/jina-ai/MCP/blob/5d6eb191a75d8e67b6e01ce427f0cc5c05c800aa/README.md#tool-filtering-before-registering)).
  There are 12 tools in total.

```yaml
  jina:
    type: http
    url: https://mcp.jina.ai/v1
    headers:
      Authorization: Bearer ${JINA_API_KEY}
```

Rationale: remote is the only first-party transport, and the header matches the vendor's own Claude Code command. A
lean variant such as `https://mcp.jina.ai/v1?include_tags=search,read` is possible, but the catalog should ship the full
server and leave trimming to inline overrides.

## 2. Firecrawl (refresh of the existing entry)

- **Official:** [`firecrawl/firecrawl-mcp-server`](https://github.com/firecrawl/firecrawl-mcp-server/blob/ec093cd90e4794d88b41beb7be010b4796776fe7/README.md),
  npm [`firecrawl-mcp`](https://www.npmjs.com/package/firecrawl-mcp) `3.25.4` (2026-09-23). The catalog currently pins
  `3.25.3`.
- **Hosted remote** ([README L44-84](https://github.com/firecrawl/firecrawl-mcp-server/blob/ec093cd90e4794d88b41beb7be010b4796776fe7/README.md#L44-L84),
  [docs.firecrawl.dev/mcp-server](https://docs.firecrawl.dev/mcp-server.md),
  [keyless#add-an-api-key](https://docs.firecrawl.dev/mcp-server/keyless.md)):
  - `https://mcp.firecrawl.dev/v2/mcp` with no key is the keyless free tier. It exposes only `scrape`, `search` and
    `parse`, rate-limited.
  - The same URL with `Authorization: Bearer <FIRECRAWL_API_KEY>` unlocks the full set of about 26 tools. The docs say
    "Never put an API key in the server URL."
  - `https://mcp.firecrawl.dev/v2/mcp-oauth` is browser sign-in with no headers.
  - `https://mcp.firecrawl.dev/v2/mcp-search` is a fixed 8-tool search surface.
- **Local stdio:** `npx -y firecrawl-mcp` with `FIRECRAWL_API_KEY`. `FIRECRAWL_API_URL` points to a self-hosted
  Firecrawl, where the key is optional ([README L236-243](https://github.com/firecrawl/firecrawl-mcp-server/blob/ec093cd90e4794d88b41beb7be010b4796776fe7/README.md#L236-L243)).
  `FIRECRAWL_OAUTH_TOKEN` takes a static `fco_…` token (L248-251). `FIRECRAWL_NO_SEARCH_FEEDBACK=1` and
  `FIRECRAWL_NO_ENDPOINT_FEEDBACK=1` drop the feedback tools (L40). Local direct-file `firecrawl_parse` needs a
  self-hosted `FIRECRAWL_API_URL` (L657-661).

Recommended (hosted):

```yaml
  firecrawl:
    type: http
    url: https://mcp.firecrawl.dev/v2/mcp
    headers:
      Authorization: Bearer ${FIRECRAWL_API_KEY}
```

Fallback (keep stdio, only bump the pin):

```yaml
  firecrawl:
    command: npx
    args: [-y, firecrawl-mcp@3.25.4]
    env:
      FIRECRAWL_API_KEY: ${FIRECRAWL_API_KEY}
```

Rationale: both entries use the same `FIRECRAWL_API_KEY`. Hosted drops the Node dependency and the version pin, which
removes the "bump the pin, then remove + add-json" churn that ADR 0006 describes. Stdio is still needed for a self-hosted
Firecrawl (`FIRECRAWL_API_URL`) or local file parsing.

## 3. Tavily

- **Official:** [`tavily-ai/tavily-mcp`](https://github.com/tavily-ai/tavily-mcp/blob/1c1d54c2a619afe52544f775c8d82a56ac6d8bb5/README.md),
  npm [`tavily-mcp`](https://www.npmjs.com/package/tavily-mcp) `0.2.22` (2026-08-05).
- **Remote:** `https://mcp.tavily.com/mcp/` ([README L18-72](https://github.com/tavily-ai/tavily-mcp/blob/1c1d54c2a619afe52544f775c8d82a56ac6d8bb5/README.md#L18-L72),
  [docs.tavily.com/documentation/mcp](https://docs.tavily.com/documentation/mcp.md)). It accepts three kinds of auth:
  - `?tavilyApiKey=<key>` in the URL;
  - `Authorization: Bearer <key>`;
  - OAuth. My probe confirmed DCR and CIMD.

  An optional `DEFAULT_PARAMETERS` header takes a JSON object of search defaults.
- **Local stdio:** `npx -y tavily-mcp@<ver>` with `TAVILY_API_KEY`. Optional variables are `DEFAULT_PARAMETERS` and
  `TAVILY_HUMAN_ID`, which is forwarded as `X-Human-Id` ([README L158-229](https://github.com/tavily-ai/tavily-mcp/blob/1c1d54c2a619afe52544f775c8d82a56ac6d8bb5/README.md#L158-L229)).

```yaml
  tavily:
    type: http
    url: https://mcp.tavily.com/mcp/
    headers:
      Authorization: Bearer ${TAVILY_API_KEY}
```

Rationale: the header keeps the key out of the URL (and out of logs and `claude mcp list`), and it works headless. It
also uses the same variable name as the stdio server. If the user wants OAuth instead, drop `headers`. The stdio
equivalent is `command: npx`, `args: [-y, tavily-mcp@0.2.22]`, `env: {TAVILY_API_KEY: ${TAVILY_API_KEY}}`.

## 4. GitHub

- **Official:** [`github/github-mcp-server`](https://github.com/github/github-mcp-server/blob/85598ba6e1256f7ebf4867b95d63b833c4549264/README.md),
  latest release [`v1.12.2`](https://github.com/github/github-mcp-server/releases/tag/v1.12.2) (2026-09-16). The image
  is `ghcr.io/github/github-mcp-server:v1.12.2` (digest `sha256:508a0857ec76…`).
- **Deprecated:** `@modelcontextprotocol/server-github`. It is listed under "Archived" in
  [`modelcontextprotocol/servers` README L37-45](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/README.md#L37-L45),
  and npm `2025.4.8` is marked "Package no longer supported".
- **Remote:** `https://api.githubcopilot.com/mcp/`, with OAuth or `Authorization: Bearer <PAT>`
  ([README L36-75](https://github.com/github/github-mcp-server/blob/85598ba6e1256f7ebf4867b95d63b833c4549264/README.md#L36-L75)).
  - GitHub's Claude Code guide uses `{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer …"}}`
    ([install-claude.md L30-50](https://github.com/github/github-mcp-server/blob/85598ba6e1256f7ebf4867b95d63b833c4549264/docs/installation-guides/install-claude.md#L30-L50)).
    The Claude Code docs say the same: "GitHub's remote MCP server authenticates with a GitHub personal access token
    passed as a header" (`CC-MCP` L680-689).
  - The OAuth server `https://github.com/login/oauth` offers neither DCR nor CIMD (my probe), and GitHub notes that
    remote OAuth "requires … a registered GitHub App (or OAuth App)" (install-claude.md L138).
- **Remote options** ([remote-server.md](https://github.com/github/github-mcp-server/blob/85598ba6e1256f7ebf4867b95d63b833c4549264/docs/remote-server.md)):
  - Toolset paths `/x/<toolset>` and `/x/all`, plus a `/readonly` suffix.
  - Headers `X-MCP-Toolsets`, `X-MCP-Tools`, `X-MCP-Readonly`, `X-MCP-Lockdown` and `X-MCP-Insiders`.
  - GHE.com uses `https://copilot-api.<sub>.ghe.com/mcp`.
  - **GitHub Enterprise Server has no remote**, so it needs the local server with `GITHUB_HOST`
    ([README L149-173, L245-270](https://github.com/github/github-mcp-server/blob/85598ba6e1256f7ebf4867b95d63b833c4549264/README.md#L149-L173)).
- **Local:** `docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server`, or the release
  binary `github-mcp-server stdio`. Environment variables are `GITHUB_PERSONAL_ACCESS_TOKEN`, `GITHUB_HOST`,
  `GITHUB_TOOLSETS`, `GITHUB_TOOLS`, `GITHUB_READ_ONLY=1`, `GITHUB_LOCKDOWN_MODE=1` and `GITHUB_INSIDERS=true`
  ([README L426-569, L1645-1681](https://github.com/github/github-mcp-server/blob/85598ba6e1256f7ebf4867b95d63b833c4549264/README.md#L426-L569)).
  The local server also has a browser OAuth login (`GITHUB_OAUTH_CALLBACK_PORT`).

```yaml
  github:
    type: http
    url: https://api.githubcopilot.com/mcp/
    headers:
      Authorization: Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}
```

Rationale: this is the configuration that both GitHub and Anthropic document for Claude Code. It needs no Docker and no
pin. `GITHUB_PERSONAL_ACCESS_TOKEN` is the vendor's own variable name, so the same shell variable also serves the local
server. (GitHub's guides use `GITHUB_PAT` only as a `.env` convenience.) For GHES, write an inline entry with
`command: docker`,
`args: [run, -i, --rm, -e, GITHUB_PERSONAL_ACCESS_TOKEN, -e, GITHUB_HOST, ghcr.io/github/github-mcp-server:v1.12.2]`
and `env` for both variables. A read-only variant could ship as a second name, such as
`github-readonly` → `https://api.githubcopilot.com/mcp/readonly`.

## 5. Cloudflare

- **Official:** [`cloudflare/mcp-server-cloudflare`](https://github.com/cloudflare/mcp-server-cloudflare/blob/632916d3fcc862a7832d2fe5a49e700f017c109f/README.md)
  holds the domain servers. [`cloudflare/mcp`](https://github.com/cloudflare/mcp/blob/76b19f116e53b1d6ad1c8b2c07d0d2e91a37abf1/README.md)
  holds the recommended Code Mode server. All of them are remote only. Every server exposes streamable HTTP at `/mcp`.
  `/sse` is now just an alias, and legacy SSE `GET /sse` returns `410 Gone`
  ([README L7](https://github.com/cloudflare/mcp-server-cloudflare/blob/632916d3fcc862a7832d2fe5a49e700f017c109f/README.md#L7)).
- **Server list** ([README L11-29](https://github.com/cloudflare/mcp-server-cloudflare/blob/632916d3fcc862a7832d2fe5a49e700f017c109f/README.md#L11-L29)):
  - Code Mode `mcp.cloudflare.com` (recommended)
  - `docs`, `bindings`, `builds`, `observability`, `containers`, `browser` (Browser Run), `logs` (Logpush),
    `ai-gateway`, `autorag`, `auditlogs`, `dns-analytics`, `dex`, `casb`, `radar`, `blog`
  - `demo-day`, a demo that should not be catalogued
- **Code Mode auth:** OAuth (recommended), or a Cloudflare API token as `Bearer`. Tokens with Client IP Address
  Filtering are not supported. Account tokens need "Account Resources : Read". The server has a built-in `docs` tool.
  `?codemode=false` registers about 2,500 tools, around 244k tokens
  ([cloudflare/mcp README L14-77](https://github.com/cloudflare/mcp/blob/76b19f116e53b1d6ad1c8b2c07d0d2e91a37abf1/README.md#L14-L77)).
- **Domain servers:** every one I probed returned `401` with a DCR + CIMD OAuth server. `docs` returns `200` with no
  auth.

```yaml
  cloudflare-docs:            # unchanged
    type: http
    url: https://docs.mcp.cloudflare.com/mcp

  cloudflare:                 # Code Mode: whole Cloudflare API, OAuth via /mcp
    type: http
    url: https://mcp.cloudflare.com/mcp

  cloudflare-bindings:
    type: http
    url: https://bindings.mcp.cloudflare.com/mcp

  cloudflare-builds:
    type: http
    url: https://builds.mcp.cloudflare.com/mcp

  cloudflare-observability:
    type: http
    url: https://observability.mcp.cloudflare.com/mcp

  cloudflare-browser:
    type: http
    url: https://browser.mcp.cloudflare.com/mcp
```

Rationale: these are all first-party remote servers with DCR OAuth, so they need no secrets in the catalog.
`cloudflare` is a single entry that Cloudflare itself recommends for broad access. The four domain servers are the
developer-facing ones (Workers bindings, Builds, logs/observability, Browser Run). `radar`, `logs`, `ai-gateway`,
`autorag`, `auditlogs`, `dns-analytics`, `dex`, `casb`, `containers` and `blog` follow the same shape and can be added if
wanted. Code Mode can also take a token header (`Authorization: Bearer ${CLOUDFLARE_API_TOKEN}`), but that would be a
second entry name, because a header disables the OAuth fallback.

## 6. Atlassian (Jira + Confluence)

### Cloud: official Atlassian Rovo MCP server

- **Official:** [`atlassian/atlassian-mcp-server`](https://github.com/atlassian/atlassian-mcp-server/blob/eb9a5956a7ac6380c731c725a8382da53ad6d980/README.md),
  generally available. It is **Atlassian Cloud only**: the prerequisite is "An **Atlassian Cloud site**" (L254).
- **Endpoint:** `https://mcp.atlassian.com/v2/mcp` is recommended (L61, L289-295). The v1 `/v1/mcp` endpoints are still
  supported, and `https://mcp.atlassian.com/v1/sse` stopped being supported after 2026-06-30 (L300). The vendor's
  Claude Code command is `claude mcp add --transport http atlassian https://mcp.atlassian.com/v2/mcp`, followed by
  `/mcp` to authenticate (L115). The vendor's own plugin [`.mcp.json`](https://github.com/atlassian/atlassian-mcp-server/blob/eb9a5956a7ac6380c731c725a8382da53ad6d980/.mcp.json)
  is exactly `{"type":"http","url":"https://mcp.atlassian.com/v2/mcp"}`.
- **Auth:** OAuth 2.1 (my probe found DCR + CIMD). API tokens work *only if an org admin enables them*, in two forms
  (L309-318):
  - `Authorization: Basic <base64(email:api_token)>` for a personal token;
  - `Authorization: Bearer <api_key>` for a service account.

  Jira Service Management tools are API-token only, and Compass tools are OAuth only (L196-216).
- **Options:** tools are exposed through discovery by default. `?tools=all` returns a flat tool list for gateways
  (L225-240).

```yaml
  atlassian:
    type: http
    url: https://mcp.atlassian.com/v2/mcp
```

Rationale: this is the vendor's own plugin config. OAuth needs no admin toggle and no secret. A token variant would
have to be `Authorization: Basic ${ATLASSIAN_BASIC_AUTH}` with a **pre-encoded** base64 value, because Claude Code
expansion can't encode.

### Server / Data Center: community `sooperset/mcp-atlassian`

- **Community** (not Atlassian): [`sooperset/mcp-atlassian`](https://github.com/sooperset/mcp-atlassian/blob/0a5d2427144d72f5aade07d4fabd385421cec401/README.md),
  about 5.9k stars, last push 2026-09-19. It is on PyPI as [`mcp-atlassian`](https://pypi.org/project/mcp-atlassian/)
  `0.23.1` (2026-08-19). It supports Jira DC 8.14+ and Confluence DC 6.0+ ([README L100-106](https://github.com/sooperset/mcp-atlassian/blob/0a5d2427144d72f5aade07d4fabd385421cec401/README.md#L100-L106)).
- **Transport:** stdio via `uvx mcp-atlassian`. Docker and streamable-http are also available.
- **Env** ([`.env.example`](https://github.com/sooperset/mcp-atlassian/blob/0a5d2427144d72f5aade07d4fabd385421cec401/.env.example),
  [docs/authentication.mdx L35-58](https://github.com/sooperset/mcp-atlassian/blob/0a5d2427144d72f5aade07d4fabd385421cec401/docs/authentication.mdx#L35-L58)):
  - Cloud: `JIRA_URL` + `JIRA_USERNAME` + `JIRA_API_TOKEN`, and `CONFLUENCE_URL` (`…/wiki`) + `CONFLUENCE_USERNAME` +
    `CONFLUENCE_API_TOKEN`.
  - DC: `JIRA_URL` + `JIRA_PERSONAL_TOKEN`, and `CONFLUENCE_URL` + `CONFLUENCE_PERSONAL_TOKEN`.
  - Options: `READ_ONLY_MODE`, `TOOLSETS` (`default` is about 35 tools, unset or `all` is 98), `ENABLED_TOOLS`,
    `JIRA_PROJECTS_FILTER`, `CONFLUENCE_SPACES_FILTER`, `JIRA_SSL_VERIFY` and mTLS `*_CLIENT_CERT`.

```yaml
  atlassian-dc:
    command: uvx
    args: [mcp-atlassian@0.23.1]
    env:
      JIRA_URL: ${JIRA_URL}
      JIRA_PERSONAL_TOKEN: ${JIRA_PERSONAL_TOKEN}
      CONFLUENCE_URL: ${CONFLUENCE_URL:-}
      CONFLUENCE_PERSONAL_TOKEN: ${CONFLUENCE_PERSONAL_TOKEN:-}
```

Rationale: this is the only maintained way to reach Jira/Confluence DC. Confluence defaults to empty so that a
Jira-only user doesn't pass a literal `${CONFLUENCE_URL}` (see open questions). The instance URL cannot live in the
catalog, so it comes from the environment.

## 7. GitLab

- **Official:** the GitLab MCP server is built into GitLab itself
  ([doc/user/model_context_protocol/mcp_server.md @ 3e3225c9](https://gitlab.com/gitlab-org/gitlab/-/blob/3e3225c9b913b6225334257cb801c839ee61ac00/doc/user/model_context_protocol/mcp_server.md);
  rendered at [docs.gitlab.com/user/model_context_protocol/mcp_server/](https://docs.gitlab.com/user/model_context_protocol/mcp_server/)).
  It was an experiment in 18.3 and became Beta in 18.6. It moved to a separate setting and to the **Free** tier in
  19.2. It runs on GitLab.com, Self-Managed and Dedicated. An admin must allow MCP access on the top-level group
  (GitLab.com) or the instance (Self-Managed).
- **Deprecated:** `@modelcontextprotocol/server-gitlab` is archived in the servers repo, and npm `2025.4.25` is marked
  "no longer supported".
- **Transport:** HTTP at `https://<gitlab.example.com>/api/v4/mcp` is recommended. stdio through `npx mcp-remote` is the
  alternative. The Claude Code command is `claude mcp add -s user --transport http GitLab https://<host>/api/v4/mcp`,
  then `/mcp` to authorize in the browser.
- **Auth:** OAuth 2.0 with DCR only. The page documents no PAT or header auth.
- **Options (headers):**
  - `X-Gitlab-Mcp-Server-Tool-Name-Prefix`, added in 18.11.
  - `X-Gitlab-Enabled-Mcp-Server-Toolsets`, added in 19.5 behind feature flag `mcp_toolsets`, which is off by
    default. Toolsets are `core`, `merge_requests`, `work_items`, `repository` and `ci` by default, with `wikis`,
    `code_security` and `duo_agent_platform` as opt-in, or `all`.
  - `X-Gitlab-Enabled-Mcp-Server-Tools`.
- **Community PAT alternative:** [`zereight/gitlab-mcp`](https://github.com/zereight/gitlab-mcp/blob/fbb6510288148b55d9e26388c7d86d46984b3d68/README.md),
  npm [`@zereight/mcp-gitlab`](https://www.npmjs.com/package/@zereight/mcp-gitlab) `2.1.66` (2026-09-23). Its
  environment variables are `GITLAB_PERSONAL_ACCESS_TOKEN`, `GITLAB_API_URL` (e.g. `https://gitlab.com/api/v4`) and
  `GITLAB_PERMISSION_MODE=readonly|modify|full`. `GITLAB_READ_ONLY_MODE` is deprecated.

```yaml
  gitlab:
    type: http
    url: https://${GITLAB_HOST:-gitlab.com}/api/v4/mcp
```

Rationale: this is the official, first-party, zero-install option. The `${GITLAB_HOST:-gitlab.com}` default makes the
same entry work on self-managed instances (`GITLAB_HOST=gitlab.example.com`), because Claude Code expands `url`. OAuth
tokens are stored per endpoint, so different hosts don't collide. If the user needs a token (CI/headless), or runs a
GitLab older than 18.6 or has MCP disabled by an admin, the fallback is inline:
`command: npx`, `args: [-y, @zereight/mcp-gitlab@2.1.66]`,
`env: {GITLAB_PERSONAL_ACCESS_TOKEN: ${GITLAB_PERSONAL_ACCESS_TOKEN}, GITLAB_API_URL: ${GITLAB_API_URL:-https://gitlab.com/api/v4}}`.

## 8. Filesystem

- **Official reference server:** [`modelcontextprotocol/servers` `src/filesystem`](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/src/filesystem/README.md),
  npm [`@modelcontextprotocol/server-filesystem`](https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem)
  `2026.8.31`. It is maintained by the MCP steering group. The repo says these are "reference implementations … not
  production-ready solutions" ([servers README L3-9](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/README.md#L3-L9)).
- **Transport:** stdio only, via `npx` or Docker `mcp/filesystem`. With Docker, directories are mounted under
  `/projects`, and `,ro` makes them read-only
  ([filesystem README L212-270](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/src/filesystem/README.md#L212-L270)).
- **Allowed dirs** ([README L16-60](https://github.com/modelcontextprotocol/servers/blob/f46d9578190b476b3501923ea8977d899e8db2cb/src/filesystem/README.md#L16-L60)):
  - Positional args are the allowed dirs.
  - When the client supports MCP Roots, the roots *replace* the args. This is the recommended mode.
  - If there are no args and no roots, the server errors at init.
  - Claude Code supports roots (`CC-MCP` L117), so the sandbox follows the session's working dirs.
- **No secrets.** The only notable option is the npx-vs-Docker `ro` mount.

```yaml
  filesystem:
    command: npx
    args: [-y, '@modelcontextprotocol/server-filesystem@2026.8.31', '${CLAUDE_PROJECT_DIR:-.}']
```

Rationale: this is the first-party package, pinned. The last arg is only a fallback, since Claude Code's roots replace
it at init. `${CLAUDE_PROJECT_DIR:-.}` is the form `CC-MCP` L119 prescribes for project and user entries. The value
must be quoted in YAML, because it starts with `@` and `$`.

---

## Proposed `packages/presets/mcp-servers.yaml`

```yaml
# yaml-language-server: $schema=../schemas/schemas/mcp-catalog.schema.json

# Danh mục MCP: cấu hình MCP server mà Preset/Config bật bằng `<name>: true` trong `spec.mcpServers` (ADR 0006).
kind: McpCatalog

servers:
  # --- Web search / fetch -------------------------------------------------
  jina:
    type: http
    url: https://mcp.jina.ai/v1
    headers:
      Authorization: Bearer ${JINA_API_KEY}

  firecrawl:
    type: http
    url: https://mcp.firecrawl.dev/v2/mcp
    headers:
      Authorization: Bearer ${FIRECRAWL_API_KEY}

  tavily:
    type: http
    url: https://mcp.tavily.com/mcp/
    headers:
      Authorization: Bearer ${TAVILY_API_KEY}

  # --- Code hosting -------------------------------------------------------
  github:
    type: http
    url: https://api.githubcopilot.com/mcp/
    headers:
      Authorization: Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}

  gitlab: # OAuth (/mcp); self-managed: GITLAB_HOST=gitlab.example.com
    type: http
    url: https://${GITLAB_HOST:-gitlab.com}/api/v4/mcp

  # --- Cloudflare (all OAuth via /mcp except docs) ------------------------
  cloudflare-docs:
    type: http
    url: https://docs.mcp.cloudflare.com/mcp

  cloudflare:
    type: http
    url: https://mcp.cloudflare.com/mcp

  cloudflare-bindings:
    type: http
    url: https://bindings.mcp.cloudflare.com/mcp

  cloudflare-builds:
    type: http
    url: https://builds.mcp.cloudflare.com/mcp

  cloudflare-observability:
    type: http
    url: https://observability.mcp.cloudflare.com/mcp

  cloudflare-browser:
    type: http
    url: https://browser.mcp.cloudflare.com/mcp

  # --- Atlassian ----------------------------------------------------------
  atlassian: # Cloud only, OAuth (/mcp)
    type: http
    url: https://mcp.atlassian.com/v2/mcp

  atlassian-dc: # Jira/Confluence Server & Data Center, community sooperset/mcp-atlassian
    command: uvx
    args: [mcp-atlassian@0.23.1]
    env:
      JIRA_URL: ${JIRA_URL}
      JIRA_PERSONAL_TOKEN: ${JIRA_PERSONAL_TOKEN}
      CONFLUENCE_URL: ${CONFLUENCE_URL:-}
      CONFLUENCE_PERSONAL_TOKEN: ${CONFLUENCE_PERSONAL_TOKEN:-}

  # --- Local --------------------------------------------------------------
  filesystem:
    command: npx
    args: [-y, '@modelcontextprotocol/server-filesystem@2026.8.31', '${CLAUDE_PROJECT_DIR:-.}']
```

Pins to refresh later: `@modelcontextprotocol/server-filesystem@2026.8.31` and `mcp-atlassian@0.23.1`. If the stdio
fallbacks are chosen, also `firecrawl-mcp@3.25.4`, `tavily-mcp@0.2.22`, `ghcr.io/github/github-mcp-server:v1.12.2` and
`@zereight/mcp-gitlab@2.1.66`.

## Open questions

1. **Header token vs OAuth, per server.** A header disables Claude Code's OAuth fallback, so each catalog name must pick
   one. The proposal uses header tokens for Jina, Firecrawl, Tavily and GitHub (headless-friendly, same variable as the
   stdio servers) and OAuth for Atlassian, GitLab and Cloudflare. Should the catalog also ship OAuth twins, for example
   `tavily-oauth` or `firecrawl-oauth` (→ `/v2/mcp-oauth`)? Or should it ship token twins such as `cloudflare-token`
   (`Bearer ${CLOUDFLARE_API_TOKEN}`) and `atlassian-token` (`Basic ${ATLASSIAN_BASIC_AUTH}`, pre-encoded)?
2. **Firecrawl: hosted or stdio?** The recommendation is hosted `v2/mcp` + header. Keep stdio (`3.25.4`) if
   self-hosted Firecrawl or local file parsing matters.
3. **Schema gaps.** The `mcpServer` schema has no `oauth` (`clientId`, `callbackPort`, `authServerMetadataUrl`),
   `headersHelper`, `timeout`, `alwaysLoad` or `ws`. Adding `oauth` would allow GitHub remote OAuth with a
   user-registered GitHub App. Is that in scope?
4. **Self-hosted URLs.** GitLab uses `${GITLAB_HOST:-gitlab.com}` in `url`. Is expanding env vars in the URL
   acceptable for the catalog? ADR 0006 only talks about secrets. Should GitHub Enterprise Server (local Docker +
   `GITHUB_HOST`) get its own catalog name, or stay inline-only?
5. **Atlassian DC.** Should the catalog include a community server (`atlassian-dc`), given that everything else is
   first-party? This matters if the user's Jira is Data Center, e.g. an internal instance. Should it be Jira-only or
   Jira + Confluence? Does `uvx` (Python/uv) count as an acceptable runtime dependency next to `npx`?
6. **Cloudflare breadth.** Is Code Mode (`cloudflare`) plus `cloudflare-docs` enough? Code Mode already has a `docs`
   tool. Or should the catalog keep the four domain servers too, and add Radar, Logpush, AI Gateway and the others?
7. **Filesystem value.** Claude Code has native Read/Write/Edit/Glob/Grep. Is a catalog entry useful, for example for
   other agents or for sandboxing via Docker `ro` mounts, or should it be dropped?
8. **Read-only defaults.** Should the catalog default to safer variants, such as GitHub `/readonly` or
   `X-MCP-Readonly: true`, and `READ_ONLY_MODE=true` for `atlassian-dc`, with the write variants as separate names?
9. **Empty-default placeholders.** `ap` warns when a `${VAR}` is unset at sync. Is `${VAR:-}`, as used for the
   Confluence variables, the accepted way to mark "optional"?

## Unverified / could not confirm

- **Whether `mcp-atlassian` treats an empty `CONFLUENCE_URL` as "Confluence not configured"** rather than as an error.
  I did not read its config loader.
- **Whether Jina's keyless mode works at all.** From my network, `read_url` returned `401` both with and without a
  header, so I could not reproduce the README's "optional key" behaviour.
- **Whether `https://mcp.firecrawl.dev/v2/mcp` accepts a bad or literal `${FIRECRAWL_API_KEY}` Bearer.** It answered
  `initialize` with `200` for a garbage Bearer. I did not test whether tool calls then fail or fall back to keyless.
- **Whether `https://mcp.firecrawl.dev/v2/mcp-oauth` supports DCR/CIMD.** I did not fetch its authorization-server
  metadata.
- **The working directory Claude Code uses for stdio servers**, which decides what the `.` fallback means in the
  filesystem entry. The docs only guarantee `CLAUDE_PROJECT_DIR` in the server env and `roots/list`.
- **Whether GitLab's `X-Gitlab-Enabled-Mcp-Server-Toolsets` is enabled on gitlab.com.** It is behind feature flag
  `mcp_toolsets`, which is off by default.
- **The exact GitLab version on gitlab.com and the minimum Self-Managed version for Claude Code** (18.6 HTTP transport,
  2025-06-18 protocol support in 18.7). I did not check this against a live instance.

## Decisions (2026-09-24)

Answers to the open questions above, applied in `packages/presets/mcp-servers.yaml` and the `mcpServer` schema:

1. Ship twins for the other auth style: `firecrawl-oauth`, `tavily-oauth`, `cloudflare-token`, `atlassian-token`,
   `gitlab-token` (community `@zereight/mcp-gitlab`). No `github-oauth`: it needs a user-registered client ID, so it
   stays inline with the new `oauth` field.
2. Firecrawl goes hosted (`v2/mcp` + header).
3. The remote `mcpServer` schema now accepts `oauth` (`clientId`, `callbackPort`, `authServerMetadataUrl`, `scopes`) and
   `headersHelper`.
4. Self-hosted and online both supported: `gitlab` via `${GITLAB_HOST:-gitlab.com}`, `gitlab-token` via
   `GITLAB_API_URL`, `github-enterprise-cloud` (GHE.com), `github-enterprise-server` (Docker + `GITHUB_HOST`),
   `firecrawl-self-hosted` (stdio + `FIRECRAWL_API_URL`).
5. Atlassian Cloud (`atlassian`, `atlassian-token`) and Data Center, split per product (`jira-dc`, `confluence-dc`) so
   no entry needs an empty-default variable.
6. All Cloudflare servers except `demo-day`.
7. No `filesystem` entry.
8. No read-only defaults.
9. No `${VAR:-}` empty defaults; `${VAR:-value}` with a real default is still used for hosts.
10. The catalog is written in English, and every entry carries a required, catalog-only `description` (what the server
    is, who ships it, what it needs). `ap` drops it when loading the catalog, so it never reaches `.mcp.json` or the
    Lock. Schema: `mcpServerFields` holds the open shapes; `mcpServer` (inline configs) and catalog entries close them
    with `unevaluatedProperties: false`.

## Decisions for batches 2–4 (2026-09-24)

The append blocks of `mcp-servers-catalog-2.md`, `-3.md` and `-4.md` went into the catalog as proposed, with these
changes:

- **Nexus = Nexus Repository**, not Sonatype Guide: `nexus-repository` uses the community `@brianveltman/sonatype-mcp@1.4.0`
  through its (undocumented) `NEXUS_BASE_URL` / `NEXUS_USERNAME` / `NEXUS_PASSWORD` env vars
  ([`build/config/environment.js`](https://www.npmjs.com/package/@brianveltman/sonatype-mcp/v/1.4.0)), so the password
  never goes on the command line. `sonatype-guide` was dropped.
- **Postgres** keeps the name `postgres` (DBHub).
- **AWS** ships both `aws` (local SigV4 proxy) and `aws-oauth` (remote).
- **ClickHouse:** the bare name is the self-hosted stdio server; the hosted one is `clickhouse-cloud`.
- **Terraform:** `terraform-cloud` keeps its name, and `ENABLE_TF_OPERATIONS` stays at the vendor default (off).
- **Snyk:** both entries use `--profile=lite`; `snyk-token` sets `SNYK_API: ${SNYK_API:-https://api.snyk.io}`.
- Every other open question takes the notes' default.

## Decisions from the catalog review (2026-09-24)

- **Community servers** stay only where no official server covers the need (`gitlab-token`, `jira-dc`,
  `confluence-dc`, `nexus-repository`, `postgres`). `n8n-mcp` and `figma-framelink` were dropped because `n8n` and
  `figma` are official.
- **Optional entries** all stay: an entry costs nothing until a Preset or Config enables it.
- **Overlap with `claude-plugins-official`:** entries that expose the same MCP server as an official plugin end their
  `description` with "Also shipped as plugin `<plugin>@claude-plugins-official`." Plugins without an MCP server
  (e.g. `firecrawl`, skills only) get no note.
- **Telemetry** is opted out where the server allows it: `--no-usage-statistics` for `chrome-devtools*`,
  `?telemetry-enabled=false` for `apify*`.
- **Presets** stay as they are; no topic presets.
- **Guards:** `packages/cli/src/sync/mcp-catalog.test.ts` checks the catalog for duplicate names, against the schema,
  and through `checkMcp`. `pnpm mcp:outdated` (`scripts/mcp-outdated.mjs`) lists every pin next to the latest version
  on npm, PyPI, Docker Hub and GHCR; it only reports, and bumps stay manual.
- **Next batch:** Azure, Google Cloud, Context7, Playwright, Linear, Stripe, Slack and Grafana
  (`mcp-servers-catalog-5.md`).
