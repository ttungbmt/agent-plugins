# Research: MCP catalog entries for Nexus (Sonatype), ClickHouse, Parallel and Browser Use

Goal: propose `McpCatalog` entries for "Nexus", ClickHouse, Parallel and Browser Use that follow
[ADR 0006](../adr/0006-mcp-servers-inline-plus-bundled-catalog.md), the `mcpServer` schema and the conventions decided in
[`mcp-servers-catalog.md` → "Decisions (2026-09-24)"](mcp-servers-catalog.md#decisions-2026-09-24). Sources checked on
**2026-09-24**. Only primary sources are used: vendor docs, vendor GitHub repos pinned to the default-branch commit on that
date, PyPI/npm/GHCR, the official MCP Registry (`registry.modelcontextprotocol.io`) and the Claude Code docs
([`code.claude.com/docs/en/mcp.md`](https://code.claude.com/docs/en/mcp.md), cited as `CC-MCP`).

As in the first note, I sent an unauthenticated MCP `initialize` to every remote endpoint and read
`/.well-known/oauth-protected-resource[/<path>]` and the authorization server's `/.well-known/oauth-authorization-server`
to check DCR (`registration_endpoint`) and CIMD (`client_id_metadata_document_supported`). For the two stdio packages I
also ran `initialize` (and `tools/list` for Browser Use) locally with the pinned version.

## Summary

- **"Nexus" is ambiguous. My best reading is Sonatype.** Sonatype's only official MCP server is the hosted
  **Sonatype Guide** server (`https://mcp.guide.sonatype.com/mcp`). It answers dependency-intelligence questions
  (versions, CVEs, licenses, recommended upgrades). It does **not** talk to a Nexus Repository instance. **Nexus
  Repository (self-hosted or cloud) and IQ Server have no official MCP server**: their 2026 release notes don't mention
  MCP. The only Nexus Repository MCP is a stale community package. The other plausible "Nexus" is **Cisco Nexus
  Dashboard**, which has had a built-in, self-hosted MCP server since 4.3.1. **The user should confirm which one they
  meant.**
- **Sonatype Guide supports only a token.** It needs `Authorization: Bearer <Guide personal token>`. I found no OAuth
  metadata, so there is no `-oauth` twin.
- **ClickHouse has two official servers.**
  - **Remote, ClickHouse Cloud only:** `https://mcp.clickhouse.cloud/mcp`. It uses OAuth with DCR, is read-only, and
    must be enabled per service.
  - **Local stdio, any ClickHouse:** `mcp-clickhouse` `0.7.0` on PyPI (released 2026-09-21). It connects with
    `CLICKHOUSE_HOST`, `CLICKHOUSE_USER` and `CLICKHOUSE_PASSWORD`, and is read-only unless
    `CLICKHOUSE_ALLOW_WRITE_ACCESS=true`.
  - ClickHouse also ships a **ClickStack** (observability) MCP, offered as an optional extra below.
- **Parallel has two servers, both hosted and first-party.**
  - **Search MCP** is free and keyless at `https://search.parallel.ai/mcp`. A Bearer API key on the same URL unlocks
    higher limits. `/mcp-oauth` is the OAuth variant. The old `https://search-mcp.parallel.ai/mcp` now returns `401`.
  - **Task MCP** (`https://task-mcp.parallel.ai/mcp`) is billable. The vendor's Claude Code setup uses OAuth, and it
    also accepts a Bearer API key. Both OAuth servers support DCR.
- **Browser Use has two official servers.**
  - **Cloud:** `https://api.browser-use.com/v3/mcp` with the header `x-browser-use-api-key` (not `Authorization`).
  - **Local stdio:** `uvx --from 'browser-use[cli]==0.13.10' browser-use --mcp`. It runs a local Chromium. It only needs
    an LLM key for its agent and extract tools.
  - The cloud host also advertises OAuth with DCR, but the vendor doesn't document it, and it triggers only on tool
    calls. So I propose no `-oauth` twin.

Endpoint probe results (2026-09-24, unauthenticated `initialize`):

| Endpoint | HTTP | Auth server | DCR | CIMD |
|---|---|---|---|---|
| `https://mcp.guide.sonatype.com/mcp` | 401 (`Bearer error="invalid_request"`) | none (`/.well-known/*` → 404 "does not support OAuth metadata discovery") | – | – |
| `https://mcp.seaworthy.sonatype.com/mcp` (registry v1.0.1) | DNS fails | – | – | – |
| `https://mcp.clickhouse.cloud/mcp` | 401 | `https://mcp.clickhouse.cloud` | yes | no |
| `https://mcp.clickhouse.cloud/clickstack` | 401 | `https://mcp.clickhouse.cloud` | yes | no |
| `https://search.parallel.ai/mcp` | **200** (anonymous) | none on this path | – | – |
| `https://search.parallel.ai/mcp-oauth` | 401 | `https://platform.parallel.ai` | yes | no |
| `https://search-mcp.parallel.ai/mcp` (old URL) | 401 `Unauthorized` (plain text, no metadata) | – | – | – |
| `https://task-mcp.parallel.ai/mcp` | 401 ("Missing x-api-key or Authorization header") | `https://platform.parallel.ai` | yes | no |
| `https://api.browser-use.com/v3/mcp` | **200** on `initialize` and `tools/list`; `tools/call` → 401 | `https://api.browser-use.com` (resource advertised as `…/mcp`, not `…/v3/mcp`) | yes | no |
| `https://api.browser-use.com/mcp` (older "web-automation" server) | 200 on `initialize`; `tools/call` → 401 | same | yes | no |

Local stdio checks (2026-09-24):

| Command | Result |
|---|---|
| `uvx --python 3.12 mcp-clickhouse@0.7.0` against the public playground (`sql-clickhouse.clickhouse.com`, user `demo`) | `initialize` OK, `serverInfo` `mcp-clickhouse 0.7.0` |
| `uvx --from 'browser-use[cli]==0.13.10' browser-use --mcp` with **no** LLM key | `initialize` OK, `serverInfo` `browser-use 0.13.10`, 16 tools |

---

## 0. Claude Code semantics that matter here (beyond the first note)

- An `Authorization` header turns off Claude Code's OAuth fallback. That's why the catalog uses bare/`-oauth`/`-token`
  names ([first note §0](mcp-servers-catalog.md#0-claude-code-semantics-that-shape-the-entries)).
- **Credential variables that read as empty** apply only to a remote server's `url` and `headers`. The affected names
  are `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, cloud-provider keys, `HTTPS_PROXY`, `NPM_TOKEN` and similar
  ([`CC-MCP` L649-661](https://code.claude.com/docs/en/mcp.md)). None of the header variables proposed here are in that
  set. The Browser Use local entry passes `OPENAI_API_KEY` through stdio `env`, and that rule does not apply to `env`.
- **Unset `${VAR}` with no default** loads the server with the literal `${VAR}` text and a warning (`CC-MCP` L294,
  L645-647). For optional settings, the entries below leave the variable out instead of using `${VAR:-}`, as the
  decisions require.
- **The `ap` secret check** (`/key|token|secret|password|auth|credential/i` on `env`/`headers` keys) matches
  `Authorization`, `x-browser-use-api-key`, `X-Nd-Apikey`, `CLICKHOUSE_PASSWORD` and `OPENAI_API_KEY`. Every one of
  these values below is a `${…}` reference. `CLICKHOUSE_USER`, `CLICKHOUSE_HOST`, `CLICKHOUSE_SECURE` and
  `X-Nd-Username` don't match the check.

## 1. "Nexus"

### 1a. What exists under the name

| Candidate | Official? | MCP server | Notes |
|---|---|---|---|
| **Sonatype Guide** (Sonatype's dependency intelligence) | **Official** (Sonatype) | Remote `https://mcp.guide.sonatype.com/mcp` | Sonatype markets this as "the Sonatype MCP Server". It does not connect to your Nexus. |
| **Sonatype Nexus Repository** 3.x (self-hosted or cloud) | – | **None official** | [2026 Nexus Repository release notes](https://help.sonatype.com/en/nexus-repository-2026-release-notes.html) run up to 3.96.3 (2026-09-22) and never mention MCP. |
| **Sonatype IQ Server / Lifecycle / Firewall** | – | **None official** | [2026 IQ Server release notes](https://help.sonatype.com/en/sonatype-iq-server-2026-release-notes.html) only link to the Guide MCP pages. |
| `@brianveltman/sonatype-mcp` (Nexus Repository Manager) | **Community** (individual) | stdio, npm `1.4.0` | Last npm publish was 2025-07-12, repo push 2026-02-14, 8 stars. It takes credentials as CLI args (`--nexus-password …`) ([README L28-70](https://github.com/brianveltman/sonatype-mcp/blob/902058a57c6bc87584ef10b970b52241de2afb93/README.md#L28-L70)). **Not proposed.** |
| **Cisco Nexus Dashboard** 4.3.1+ | **Official** (Cisco) | Built-in HTTPS at `https://<ND_IP>/api/v1/mcp` | Self-hosted appliance. Read-only (GET APIs only). Auth is the headers `X-Nd-Apikey` + `X-Nd-Username`, and the ND CA must be trusted ([Cisco doc](https://www.cisco.com/c/en/us/td/docs/dcn/nd/4x/articles-431/working-with-mcp-server.html)). |

Others I set aside: `ai.bluenexus/universal-mcp` shows up in the MCP Registry for "nexus", but it is an unrelated
product.

### 1b. Sonatype Guide MCP (proposed)

- **Official:** [`sonatype/dependency-management-mcp-server`](https://github.com/sonatype/dependency-management-mcp-server/blob/6ce32d101ad69c5eeaffa427db214b2fba5c60ab/README.md).
  The repo contains only a README, because the server is remote-only. It is in the MCP Registry as
  `com.sonatype/dependency-management-mcp-server` `1.0.2`, with remote `https://mcp.guide.sonatype.com/mcp`. Sonatype
  help calls it "Sonatype MCP Server", part of **Sonatype Guide**
  ([Configuring MCP Servers](https://help.sonatype.com/en/configuring-mcp-server.html), updated 2026-05-05;
  [Sonatype MCP Server overview](https://help.sonatype.com/en/automate-with-sonatype-guide.html)).
- **Deprecated:** registry version `1.0.1` pointed at `https://mcp.seaworthy.sonatype.com/mcp`, and that host no longer
  resolves.
- **Transport:** streamable HTTP only. `mcp-remote` is documented only for stdio-only IDEs
  ([README L18-27](https://github.com/sonatype/dependency-management-mcp-server/blob/6ce32d101ad69c5eeaffa427db214b2fba5c60ab/README.md#L18-L27)).
- **Auth:** a personal API token from `https://guide.sonatype.com/settings/tokens`, sent as `Authorization: Bearer`. The
  vendor's Claude Code command is
  `claude mcp add --transport http --scope user sonatype-mcp https://mcp.guide.sonatype.com/mcp --header "Authorization: Bearer <your-token>"`
  ([README L46-54](https://github.com/sonatype/dependency-management-mcp-server/blob/6ce32d101ad69c5eeaffa427db214b2fba5c60ab/README.md#L46-L54),
  [L179-187](https://github.com/sonatype/dependency-management-mcp-server/blob/6ce32d101ad69c5eeaffa427db214b2fba5c60ab/README.md#L179-L187)).
  The vendor's own env var name, used in the Codex setup, is **`SONATYPE_GUIDE_MCP_TOKEN`**
  ([README L164-177](https://github.com/sonatype/dependency-management-mcp-server/blob/6ce32d101ad69c5eeaffa427db214b2fba5c60ab/README.md#L164-L177)).
  My probe found no OAuth: `401` with `Bearer error="invalid_request"`, and every `/.well-known/*` path answers `404`
  "does not support OAuth metadata discovery".
- **Tools:** `getComponentVersion`, `getLatestComponentVersion` and `getRecommendedComponentVersions`
  ([README L334-340](https://github.com/sonatype/dependency-management-mcp-server/blob/6ce32d101ad69c5eeaffa427db214b2fba5c60ab/README.md#L334-L340)).
  The server "does not access your repositories, scan your codebase, read local files"
  ([overview](https://help.sonatype.com/en/automate-with-sonatype-guide.html)).
- **Self-hosted:** none. Guide is SaaS, and I found no on-prem Guide MCP.

```yaml
  sonatype-guide:
    description: >-
      Sonatype's official hosted Guide server for open-source component versions, vulnerabilities, licenses and
      upgrade recommendations (not Nexus Repository); needs SONATYPE_GUIDE_MCP_TOKEN, a Sonatype Guide personal token.
    type: http
    url: https://mcp.guide.sonatype.com/mcp
    headers:
      Authorization: Bearer ${SONATYPE_GUIDE_MCP_TOKEN}
```

Rationale: this is the only official Sonatype MCP, and the entry is the vendor's own Claude Code command with the vendor's
own variable name. It supports only a token, so there are no twins. The name says `guide` rather than `nexus` so nobody
expects it to reach a Nexus Repository instance. If Sonatype ships a Nexus Repository MCP later, it can take
`sonatype-nexus`.

### 1c. Only if "Nexus" means Cisco Nexus Dashboard (not in the append block)

```yaml
  cisco-nexus-dashboard:
    description: >-
      Cisco's official read-only server built into Nexus Dashboard 4.3.1+ (self-hosted); needs ND_HOST, ND_USERNAME and
      ND_API_KEY, and the Nexus Dashboard CA trusted by Node (NODE_EXTRA_CA_CERTS).
    type: http
    url: https://${ND_HOST}/api/v1/mcp
    headers:
      X-Nd-Apikey: ${ND_API_KEY}
      X-Nd-Username: ${ND_USERNAME}
```

Rationale: it is built into the product, so it is self-hosted only and no cloud variant exists. The variable names
`ND_HOST`, `ND_USERNAME` and `ND_API_KEY` are my own, because Cisco's snippet uses literal placeholders. Cisco's sample
uses `"rejectUnauthorized": false`, which Claude Code has no equivalent for, so the CA must be trusted instead.

## 2. ClickHouse

### 2a. What exists

- **Remote, ClickHouse Cloud:** `https://mcp.clickhouse.cloud/mcp`, fully managed. "All access … is authenticated via
  OAuth 2.0." Every tool is read-only (`readOnlyHint: true`), with 13 tools across query/schema, orgs, services,
  backups, ClickPipes and billing. It must be enabled **per service** in the Cloud console (Connect → MCP). The Claude
  Code command is `claude mcp add --transport http clickhouse-cloud https://mcp.clickhouse.cloud/mcp`
  ([Remote MCP in Cloud](https://clickhouse.com/docs/products/cloud/features/ai-ml/remote-mcp),
  [Enable and connect](https://clickhouse.com/docs/use-cases/AI/MCP/remote_mcp)). My probe found DCR
  (`registration_endpoint: https://mcp.clickhouse.cloud/register`) and no CIMD. The docs describe no API-key auth, so
  there is no `-token` twin.
- **Local stdio, any ClickHouse (OSS, BYOC or Cloud via user/password):**
  [`ClickHouse/mcp-clickhouse`](https://github.com/ClickHouse/mcp-clickhouse/blob/80128445639794fa161179608c4862e9829a65fd/README.md),
  PyPI [`mcp-clickhouse`](https://pypi.org/project/mcp-clickhouse/) **`0.7.0`** (2026-09-21, Python ≥3.10). The image
  `ghcr.io/clickhouse/mcp-clickhouse:0.7.0` exists. The MCP Registry lists it as `io.github.ClickHouse/mcp-clickhouse`
  `0.7.0`. The entry point is `mcp-clickhouse = mcp_clickhouse.main:main` (`pyproject.toml` at the same commit). The
  vendor launch command is `uv run --with mcp-clickhouse --python 3.12 mcp-clickhouse`, and it recommends Python 3.12
  ([README L290-330](https://github.com/ClickHouse/mcp-clickhouse/blob/80128445639794fa161179608c4862e9829a65fd/README.md#L290-L330)).
  - **Required env** ([README L736-746](https://github.com/ClickHouse/mcp-clickhouse/blob/80128445639794fa161179608c4862e9829a65fd/README.md#L736-L746)):
    `CLICKHOUSE_HOST`, `CLICKHOUSE_USER`, and `CLICKHOUSE_PASSWORD` (unless using mTLS; Cloud does not support X.509
    users, L835).
  - **Useful optional env** (L747-L842):
    - `CLICKHOUSE_SECURE` (default `true`; set `false` for plain HTTP, e.g. local Docker on 8123);
    - `CLICKHOUSE_PORT` (defaults to 8443 or 8123 from `SECURE`; it must be the HTTP port, not native 9000/9440);
    - `CLICKHOUSE_VERIFY`, `CLICKHOUSE_ROLE`, `CLICKHOUSE_DATABASE`, `CLICKHOUSE_CA_CERT`, `CLICKHOUSE_CLIENT_CERT*`,
      `CLICKHOUSE_TLS_MODE`, `CLICKHOUSE_PROXY_PATH`, `CLICKHOUSE_CONNECT_TIMEOUT` and
      `CLICKHOUSE_SEND_RECEIVE_TIMEOUT`;
    - `CLICKHOUSE_MCP_QUERY_TIMEOUT` (default 30 s).
  - **Write gates:** read-only by default (`readonly=1`). `CLICKHOUSE_ALLOW_WRITE_ACCESS=true` enables DDL/DML, and
    destructive statements also need `CLICKHOUSE_ALLOW_DROP=true`
    ([README L420-449](https://github.com/ClickHouse/mcp-clickhouse/blob/80128445639794fa161179608c4862e9829a65fd/README.md#L420-L449)).
    This is the vendor's default, not a catalog choice.
  - **chDB (embedded engine):** `CHDB_ENABLED=true` (plus the `chdb` extra), `CLICKHOUSE_ENABLED=false` and
    `CHDB_DATA_PATH` ([README L960+](https://github.com/ClickHouse/mcp-clickhouse/blob/80128445639794fa161179608c4862e9829a65fd/README.md#L960)).
  - Transport env `CLICKHOUSE_MCP_SERVER_TRANSPORT` defaults to `stdio`. `http` mode has its own auth
    (`CLICKHOUSE_MCP_AUTH_TOKEN` or FastMCP OIDC), which only matters if you host the server yourself (L162-L285,
    L844).
- **ClickStack (observability, optional extra)** ([ClickStack MCP](https://clickhouse.com/docs/clickstack/mcp)):
  - Cloud: `https://mcp.clickhouse.cloud/clickstack`, OAuth. My probe showed DCR with scope `clickstack:access`.
  - Self-hosted OSS/BYOC: `<CLICKSTACK_URL>/api/mcp` with `Authorization: Bearer <Personal API Access Key>`. HyperDX v1
    is not supported.

### 2b. Proposed entries

```yaml
  clickhouse:
    description: >-
      ClickHouse's official hosted read-only server for ClickHouse Cloud (query, schema, services, backups, billing);
      OAuth sign-in, and the MCP must be enabled per service in the Cloud console.
    type: http
    url: https://mcp.clickhouse.cloud/mcp

  clickhouse-self-hosted:
    description: >-
      ClickHouse's official local server for any ClickHouse over its HTTP interface (self-hosted or Cloud);
      needs uv, CLICKHOUSE_HOST, CLICKHOUSE_USER and CLICKHOUSE_PASSWORD, plus CLICKHOUSE_SECURE=false for plain HTTP.
      Read-only unless CLICKHOUSE_ALLOW_WRITE_ACCESS=true is declared inline.
    command: uvx
    args: [--python, '3.12', mcp-clickhouse@0.7.0]
    env:
      CLICKHOUSE_HOST: ${CLICKHOUSE_HOST}
      CLICKHOUSE_USER: ${CLICKHOUSE_USER}
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD}
      CLICKHOUSE_SECURE: ${CLICKHOUSE_SECURE:-true}
```

Rationale:

- **`clickhouse`** is the vendor's zero-install Cloud path. It is OAuth with DCR and needs no secrets. The vendor names
  it `clickhouse-cloud` in its own command, but the catalog convention is "bare name = the online service".
- **`clickhouse-self-hosted`** is the only official way to reach a self-managed server, and it also works for Cloud
  with a DB user.
  - `CLICKHOUSE_SECURE` gets a real default (`true`, the vendor default), so local plain-HTTP users can override it.
  - `CLICKHOUSE_PORT` is left out, because the server derives it from `SECURE`, and a fixed default would break that.
  - The `--python 3.12` pin mirrors the vendor command. I verified that `initialize` works with this exact command.

Optional ClickStack pair:

```yaml
  clickstack:
    description: ClickHouse's official hosted ClickStack observability server (logs, traces, metrics, dashboards) on ClickHouse Cloud; OAuth sign-in.
    type: http
    url: https://mcp.clickhouse.cloud/clickstack

  clickstack-self-hosted:
    description: >-
      ClickHouse's official ClickStack server built into a self-hosted ClickStack/HyperDX v2 frontend; needs CLICKSTACK_URL
      (e.g. http://localhost:8080) and CLICKSTACK_API_KEY, a Personal API Access Key.
    type: http
    url: ${CLICKSTACK_URL}/api/mcp
    headers:
      Authorization: Bearer ${CLICKSTACK_API_KEY}
```

## 3. Parallel

### 3a. Search MCP

- **Official:** [`parallel-web/search-mcp`](https://github.com/parallel-web/search-mcp/blob/1f99b9c1a0363d93e5208718bceee850b5cc4e45/README.md),
  "Free web search and page fetching for agents. Hosted MCP, no API key required". It is remote-only, and the repo
  holds plugin/extension manifests. Docs: [docs.parallel.ai/integrations/mcp/search-mcp](https://docs.parallel.ai/integrations/mcp/search-mcp.md).
- **Endpoints** ([docs L138-143](https://docs.parallel.ai/integrations/mcp/search-mcp.md)):
  - `https://search.parallel.ai/mcp` is the default. It is anonymous at free-tier limits, and `Authorization: Bearer
    <PARALLEL_API_KEY>` unlocks higher limits. "OAuth is not advertised on this endpoint."
  - `https://search.parallel.ai/mcp-oauth` "Requires authentication: Bearer API key OR the OAuth flow. Anonymous
    requests return `401`." My probe: auth server `https://platform.parallel.ai`, DCR yes (plus device-code grant),
    no CIMD, scope `key:read`.
- **Vendor Claude Code command:** `claude mcp add --transport http --scope project parallel-search https://search.parallel.ai/mcp`
  ([README L37-45](https://github.com/parallel-web/search-mcp/blob/1f99b9c1a0363d93e5208718bceee850b5cc4e45/README.md#L37-L45)).
  The docs use the name `"Parallel-Search-MCP"` (docs L241).
- **Deprecated:** `https://search-mcp.parallel.ai/mcp`, which the MCP Registry entry `ai.parallel/search-mcp` `1.0.0`
  still lists. It now returns a plain `401 Unauthorized` without OAuth metadata. The README's troubleshooting section
  names only `search.parallel.ai` (L144-149).
- **Tools:** `web_search` and `web_fetch`, with output capped at about 25k characters per call (docs L15).
- **Options, authenticated connections only:** URL query params (`?mode=fast&advanced_settings.location=gb&…`) or the
  header `x-parallel-search-config: {json}`. Anonymous requests ignore them. Invalid values fail the handshake with
  `400` (docs L94-134).
- **Env var name:** the vendor uses `PARALLEL_API_KEY` throughout (docs L264-267, L291).

### 3b. Task MCP

- **Official:** [`parallel-web/task-mcp`](https://github.com/parallel-web/task-mcp/blob/bc0daf6b76cf0e403c0c3aeac15ff67452adf018/README.md),
  which is a Cloudflare Worker proxy to the hosted service. Docs: [docs.parallel.ai/integrations/mcp/task-mcp](https://docs.parallel.ai/integrations/mcp/task-mcp.md).
  Creating tasks is **billable**.
- **Endpoint:** `https://task-mcp.parallel.ai/mcp`. The vendor's Claude Code command is
  `claude mcp add --transport http --scope project parallel-task https://task-mcp.parallel.ai/mcp`, then "complete the
  Parallel sign-in in your browser"
  ([README L17-25](https://github.com/parallel-web/task-mcp/blob/bc0daf6b76cf0e403c0c3aeac15ff67452adf018/README.md#L17-L25)).
  For clients without OAuth, the vendor says to use a Parallel API key as a Bearer token (README L58; docs L54, L95).
  My probe: `401` "Missing x-api-key or Authorization header". OAuth server `platform.parallel.ai` with DCR, no CIMD.
- **Tools:** `createDeepResearch`, `createTaskGroup`, `getStatus` and `getResultMarkdown` (README L62-69).

### 3c. Proposed entries

```yaml
  parallel-search:
    description: Parallel's official hosted server for web search and page fetching; free and anonymous at lower rate limits, no key.
    type: http
    url: https://search.parallel.ai/mcp

  parallel-search-token:
    description: Parallel's official hosted search server with an API key for higher rate limits and search settings; needs PARALLEL_API_KEY.
    type: http
    url: https://search.parallel.ai/mcp
    headers:
      Authorization: Bearer ${PARALLEL_API_KEY}

  parallel-search-oauth:
    description: Parallel's official hosted search server with browser sign-in to a Parallel account instead of an API key.
    type: http
    url: https://search.parallel.ai/mcp-oauth

  parallel-task:
    description: Parallel's official hosted server for billable deep research and data enrichment tasks; OAuth sign-in to a Parallel account.
    type: http
    url: https://task-mcp.parallel.ai/mcp

  parallel-task-token:
    description: Parallel's official hosted deep research and enrichment server with an API key instead of sign-in; needs PARALLEL_API_KEY.
    type: http
    url: https://task-mcp.parallel.ai/mcp
    headers:
      Authorization: Bearer ${PARALLEL_API_KEY}
```

Rationale:

- **Bare names follow the vendor's recommended style:** keyless for Search (its README says "Don't add an API key") and
  OAuth for Task (its Claude Code snippet).
- **Search has three auth modes, and each gets a name.** A header would kill the OAuth fallback, and the keyless `/mcp`
  never offers OAuth, so the modes can't share an entry.
- `PARALLEL_API_KEY` is the vendor's variable name.

## 4. Browser Use

### 4a. Cloud MCP

- **Official:** Browser Use Cloud ([docs: MCP Server](https://docs.browser-use.com/cloud/guides/mcp-server.md)). The
  endpoint is `https://api.browser-use.com/v3/mcp`. The vendor's Claude Code command is
  `claude mcp add -t http -H "x-browser-use-api-key: YOUR_API_KEY" browser-use https://api.browser-use.com/v3/mcp`.
  The key comes from `cloud.browser-use.com/settings`.
- **Auth:** the header `x-browser-use-api-key`, which is **not** `Authorization: Bearer`. The docs' agent notes say "Cloud
  authentication uses X-Browser-Use-API-Key, without a Bearer prefix". The vendor's env var name is
  `BROWSER_USE_API_KEY` ([Cloud quickstart](https://docs.browser-use.com/cloud/quickstart.md)).
- **Probe:**
  - `initialize` and `tools/list` return `200` without a key. `tools/call` returns `401` with
    `WWW-Authenticate: Bearer realm="MCP v3 Server", resource_metadata_uri="…/.well-known/oauth-protected-resource"`.
    The parameter name is non-standard; RFC 9728 uses `resource_metadata`.
  - The host advertises OAuth for resource `https://api.browser-use.com/mcp` (DCR yes, no CIMD), but the vendor doesn't
    document OAuth for MCP.
  - Because the `x-browser-use-api-key` header is not `Authorization`, it may **not** disable Claude Code's OAuth
    fallback. With a valid key there's no 401, so the fallback doesn't matter.
- **Tools:** `run_session`, `get_session`, `send_task`, `stop_session`, `get_session_messages`, `list_sessions` and
  `list_browser_profiles`. These run hosted agents on cloud browsers and are billed per use.
- **Older endpoint:** `https://api.browser-use.com/mcp` still answers as `browser-use-web-automation 1.0.0`, with tools
  `browser_task`, `monitor_task`, `list_skills`, `execute_skill` and others. The current docs only document `/v3/mcp`,
  so I treat `/mcp` as legacy.

### 4b. Local stdio MCP

- **Official:** [`browser-use/browser-use`](https://github.com/browser-use/browser-use/tree/d8110c5ff87ccba887aaa726cdb780f2f84bef8d/browser_use/mcp)
  (`browser_use/mcp/server.py`). PyPI [`browser-use`](https://pypi.org/project/browser-use/) **`0.13.10`**
  (2026-09-04, Python ≥3.11,<4.0). The MCP Registry lists it as `com.browser-use/browser-use`, but still at `0.13.5`.
- **Command:** `uvx --from 'browser-use[cli]' browser-use --mcp`. The vendor's Claude Code command is
  `claude mcp add browser-use -- uvx --from 'browser-use[cli]' browser-use --mcp`
  ([docs: local MCP Server](https://docs.browser-use.com/open-source/customize/integrations/mcp-server.md)). At the
  pinned commit the `cli` extra is empty (`pyproject.toml` `cli = []`), but the docs still require it.
- **Env** (docs "Environment Variables"; [`config.py`](https://github.com/browser-use/browser-use/blob/d8110c5ff87ccba887aaa726cdb780f2f84bef8d/browser_use/config.py#L205-L245)):
  - `OPENAI_API_KEY`, which the docs mark "required";
  - `BROWSER_USE_HEADLESS` (`false` shows the window);
  - `BROWSER_USE_DISABLE_SECURITY`, `BROWSER_USE_CONFIG_DIR` and `BROWSER_USE_LLM_MODEL`;
  - `MODEL_PROVIDER=bedrock` with `MODEL`/`REGION` for Bedrock.
  - The docs also list `ANTHROPIC_API_KEY` "as an alternative", but the MCP server's agent path builds only `ChatOpenAI`
    or `ChatAWSBedrock`
    ([server.py L651-715](https://github.com/browser-use/browser-use/blob/d8110c5ff87ccba887aaa726cdb780f2f84bef8d/browser_use/mcp/server.py#L651-L715)).
- **The LLM key is only needed by two tools.** `retry_with_browser_use_agent` returns
  "Error: OPENAI_API_KEY not set" without it (L681-683), and so does `browser_extract_content` (L997-1000). My run with
  no key started fine and listed 16 tools, including `browser_navigate`, `browser_click`, `browser_type`,
  `browser_get_state`, `browser_screenshot` and `browser_get_html`. Chromium runs on the local machine.

### 4c. Proposed entries

```yaml
  browser-use:
    description: Browser Use's official hosted server that runs browser agents on Browser Use Cloud browsers (billed per use); needs BROWSER_USE_API_KEY.
    type: http
    url: https://api.browser-use.com/v3/mcp
    headers:
      x-browser-use-api-key: ${BROWSER_USE_API_KEY}

  browser-use-local:
    description: >-
      Browser Use's official open-source local server that drives a local Chromium; runs with uvx. OPENAI_API_KEY is
      used only by its agent and extract tools; navigation, clicking and screenshots work without it.
    command: uvx
    args: [--from, 'browser-use[cli]==0.13.10', browser-use, --mcp]
    env:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
```

Rationale:

- **`browser-use`** is the vendor's Claude Code command with the vendor's variable name. There's no `-oauth` twin,
  because OAuth is undocumented and only triggered on tool calls.
- **`browser-use-local`** is the "self-hosted" counterpart. It is not a hosted service, which is why the suffix is
  `-local` rather than `-self-hosted`. It is pinned to `0.13.10`, and I checked it with `initialize` and `tools/list`.
  `OPENAI_API_KEY` is kept because the vendor documents it as required and there's no empty default. If the variable is
  unset, `ap` and `/mcp` warn and only the two LLM tools fail.

---

## Consolidated YAML to APPEND to `packages/presets/mcp-servers.yaml`

None of these names clash with the current catalog (`jina`, `firecrawl*`, `tavily*`, `github*`, `gitlab*`,
`cloudflare*`, `atlassian*`, `jira-dc` and `confluence-dc`). The Cisco entry (§1c) is left out until the user confirms
what "Nexus" means. The two `clickstack*` entries are marked optional.

```yaml
  # --- Dependency intelligence ---------------------------------------------------
  # "Nexus": Sonatype has no official Nexus Repository MCP; this is Sonatype Guide (hosted, token only).
  sonatype-guide:
    description: >-
      Sonatype's official hosted Guide server for open-source component versions, vulnerabilities, licenses and
      upgrade recommendations (not Nexus Repository); needs SONATYPE_GUIDE_MCP_TOKEN, a Sonatype Guide personal token.
    type: http
    url: https://mcp.guide.sonatype.com/mcp
    headers:
      Authorization: Bearer ${SONATYPE_GUIDE_MCP_TOKEN}

  # --- ClickHouse ----------------------------------------------------------------
  clickhouse:
    description: >-
      ClickHouse's official hosted read-only server for ClickHouse Cloud (query, schema, services, backups, billing);
      OAuth sign-in, and the MCP must be enabled per service in the Cloud console.
    type: http
    url: https://mcp.clickhouse.cloud/mcp

  # Plain-HTTP servers (e.g. local Docker on 8123): CLICKHOUSE_SECURE=false.
  clickhouse-self-hosted:
    description: >-
      ClickHouse's official local server for any ClickHouse over its HTTP interface (self-hosted or Cloud);
      needs uv, CLICKHOUSE_HOST, CLICKHOUSE_USER and CLICKHOUSE_PASSWORD, plus CLICKHOUSE_SECURE=false for plain HTTP.
      Read-only unless CLICKHOUSE_ALLOW_WRITE_ACCESS=true is declared inline.
    command: uvx
    args: [--python, '3.12', mcp-clickhouse@0.7.0]
    env:
      CLICKHOUSE_HOST: ${CLICKHOUSE_HOST}
      CLICKHOUSE_USER: ${CLICKHOUSE_USER}
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD}
      CLICKHOUSE_SECURE: ${CLICKHOUSE_SECURE:-true}

  # Optional: ClickStack observability.
  clickstack:
    description: ClickHouse's official hosted ClickStack observability server (logs, traces, metrics, dashboards) on ClickHouse Cloud; OAuth sign-in.
    type: http
    url: https://mcp.clickhouse.cloud/clickstack

  clickstack-self-hosted:
    description: >-
      ClickHouse's official ClickStack server built into a self-hosted ClickStack/HyperDX v2 frontend; needs CLICKSTACK_URL
      (e.g. http://localhost:8080) and CLICKSTACK_API_KEY, a Personal API Access Key.
    type: http
    url: ${CLICKSTACK_URL}/api/mcp
    headers:
      Authorization: Bearer ${CLICKSTACK_API_KEY}

  # --- Parallel --------------------------------------------------------------------
  parallel-search:
    description: Parallel's official hosted server for web search and page fetching; free and anonymous at lower rate limits, no key.
    type: http
    url: https://search.parallel.ai/mcp

  parallel-search-token:
    description: Parallel's official hosted search server with an API key for higher rate limits and search settings; needs PARALLEL_API_KEY.
    type: http
    url: https://search.parallel.ai/mcp
    headers:
      Authorization: Bearer ${PARALLEL_API_KEY}

  parallel-search-oauth:
    description: Parallel's official hosted search server with browser sign-in to a Parallel account instead of an API key.
    type: http
    url: https://search.parallel.ai/mcp-oauth

  parallel-task:
    description: Parallel's official hosted server for billable deep research and data enrichment tasks; OAuth sign-in to a Parallel account.
    type: http
    url: https://task-mcp.parallel.ai/mcp

  parallel-task-token:
    description: Parallel's official hosted deep research and enrichment server with an API key instead of sign-in; needs PARALLEL_API_KEY.
    type: http
    url: https://task-mcp.parallel.ai/mcp
    headers:
      Authorization: Bearer ${PARALLEL_API_KEY}

  # --- Browser automation ------------------------------------------------------------
  browser-use:
    description: Browser Use's official hosted server that runs browser agents on Browser Use Cloud browsers (billed per use); needs BROWSER_USE_API_KEY.
    type: http
    url: https://api.browser-use.com/v3/mcp
    headers:
      x-browser-use-api-key: ${BROWSER_USE_API_KEY}

  browser-use-local:
    description: >-
      Browser Use's official open-source local server that drives a local Chromium; runs with uvx. OPENAI_API_KEY is
      used only by its agent and extract tools; navigation, clicking and screenshots work without it.
    command: uvx
    args: [--from, 'browser-use[cli]==0.13.10', browser-use, --mcp]
    env:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
```

Pins to refresh later: `mcp-clickhouse@0.7.0` and `browser-use[cli]==0.13.10`.

## Open questions

1. **What did "Nexus" mean?**
   - Sonatype Guide (dependency intelligence, proposed as `sonatype-guide`)?
   - Sonatype Nexus Repository itself? No official MCP exists. The only option is the stale community
     `@brianveltman/sonatype-mcp`, which takes passwords as CLI args, and I don't recommend it.
   - Cisco Nexus Dashboard (§1c)?
   - Should the Sonatype entry be named `sonatype` or `nexus` instead of `sonatype-guide`?
2. **ClickHouse naming.** Is `clickhouse` = Cloud remote plus `clickhouse-self-hosted` = stdio right? The stdio server
   also works against ClickHouse Cloud with a DB user. The alternative is `clickhouse` = stdio (the universal one) and
   `clickhouse-cloud` = remote, which matches the vendor's own command name.
3. **ClickHouse write access.** The vendor server is read-only by default. The "no read-only defaults" decision was
   about not *adding* read-only variants, so I kept the vendor default. Should the catalog set
   `CLICKHOUSE_ALLOW_WRITE_ACCESS: 'true'` instead? Is a chDB entry (`clickhouse-chdb`) wanted?
4. **ClickStack.** Should the two `clickstack*` entries go in? They are observability rather than database access. The
   names `CLICKSTACK_URL` and `CLICKSTACK_API_KEY` are my own.
5. **Parallel Search: three names.** Is it worth shipping `parallel-search-token` and `parallel-search-oauth`, or just
   keyless `parallel-search` plus `parallel-task`/`parallel-task-token`?
6. **Browser Use naming and OAuth.** Should the local entry use `-local` or `-self-hosted`? Should an experimental
   `browser-use-oauth` be added? The host has DCR metadata, but it is undocumented, and the resource URL differs from
   `/v3/mcp`.
7. **`uvx` runtime.** Two new entries need `uv`, like `jira-dc` and `confluence-dc` already do. `mcp-clickhouse` also
   pins Python 3.12 via `--python`, which `uvx` downloads if it's missing.

## Unverified / could not confirm

- **Whether Claude Code passes its own process environment to stdio servers**, beyond the declared `env`. If it does,
  optional settings like `CLICKHOUSE_PORT`, `BROWSER_USE_HEADLESS` or `CLICKHOUSE_ALLOW_WRITE_ACCESS` work from the shell.
  `CC-MCP` doesn't say so. If it doesn't, they have to be declared inline.
- **Whether Claude Code runs OAuth for Browser Use Cloud** when `x-browser-use-api-key` is missing or invalid. The 401
  comes only on `tools/call`, uses the non-standard `resource_metadata_uri` parameter, and names a different resource
  (`/mcp`).
- **Whether Sonatype Guide tokens work for tool calls.** I have no token, so I only verified that the endpoint returns
  `401` without one. I also didn't check Guide's pricing or free-tier limits.
- **ClickHouse Cloud remote MCP status (beta or GA) and any API-key auth option.** The docs I read mention only OAuth
  and give no status label.
- **Whether `mcp.clickhouse.cloud` issues tokens for Claude Code's DCR client** without per-service enablement. I didn't
  sign in.
- **Parallel Task/Search OAuth end-to-end** (DCR metadata only), and whether the old `search-mcp.parallel.ai` accepts a
  Bearer key. I only saw the `401`.
- **ClickStack self-hosted endpoint behaviour.** I did not probe it; I have no instance.
- **Cisco Nexus Dashboard:** whether Claude Code connects when the ND CA is supplied through `NODE_EXTRA_CA_CERTS`, and
  whether "Transport: HTTPS" in Cisco's doc means streamable HTTP. I did not test this.
- **Browser Use local tools that need a real browser session.** I only ran `initialize` and `tools/list`. The first run
  may download Chromium.
