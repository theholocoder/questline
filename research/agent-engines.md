# Which agent Engines can Questline drive?

Research for [#2](https://github.com/theholocoder/questline/issues/2) (map [#1](https://github.com/theholocoder/questline/issues/1)). Checked 2026-09-29 against official docs, published npm packages and upstream source. Versions inspected: `@anthropic-ai/claude-agent-sdk` 0.3.284, `@openai/codex-sdk` / `@openai/codex` 0.158.0, `@opencode-ai/sdk` / `opencode-ai` 1.18.33, `@earendil-works/pi-ai` / `pi-coding-agent` 0.87.1, `ai` (Vercel AI SDK) 7.0.122.

This file reports facts only. The choice of Engine is left to the strategy decision (#5).

## TL;DR

- **Four of the five candidates embed well in an Electron main process.** Claude Agent SDK, Codex, and opencode each spawn a native per-platform binary (linux/win32 x64+arm64 builds are published). pi and the Vercel AI SDK run in-process in Node.
- **Every candidate lets Questline inject its own tools.** Claude uses in-process SDK MCP servers. Codex uses MCP config plus experimental `dynamicTools`. opencode uses custom tools, plugins and MCP. pi uses `customTools` and extensions. The AI SDK uses plain `tool()` definitions and an MCP client.
- **Token and context-window reporting:** Claude (`getContextUsage()`, `modelUsage[].contextWindow`), Codex app-server (`thread/tokenUsage/updated` with `modelContextWindow`), opencode (per-message `tokens` plus model `limit.context`) and pi (`getContextUsage()`, model `contextWindow`) all report both. The Codex TS SDK reports tokens but no window. The AI SDK reports tokens only, so the window comes from your own model table.
- **Built-in compaction:** Claude, Codex, opencode and pi all have it. The AI SDK has none; you build it with `prepareStep`.
- **Subscriptions:** Anthropic **forbids** third-party apps from offering claude.ai (Pro/Max) login, including apps built on the Agent SDK. API key, Bedrock, Vertex or Foundry is the supported path. A narrow carve-out covers users signing in to the *unmodified Claude Code binary* themselves. OpenAI's docs recommend API keys for programmatic use, but the Codex app-server natively supports ChatGPT login, and opencode and pi ship ChatGPT Plus/Pro login. OpenAI tolerates this publicly, but no ToS clause grants it.
- **Licenses:** Codex, the AI SDK and the Codex SDK are Apache-2.0. opencode and pi are MIT. The Claude Agent SDK and Claude Code are proprietary, under Anthropic's Commercial Terms.

## Comparison table

| | Claude Agent SDK (Claude Code) | OpenAI Codex (SDK / app-server) | opencode | pi (pi-ai + pi-coding-agent) | Vercel AI SDK 7 |
|---|---|---|---|---|---|
| **Models / providers** | Claude only, via Anthropic API, Bedrock, Claude Platform on AWS, Vertex (Agent Platform), Foundry, or an LLM gateway (`ANTHROPIC_BASE_URL`) [C3] | OpenAI by default. Custom `model_providers` (Responses wire API, some Chat Completions), Azure, Bedrock, local `--oss` via Ollama or LM Studio [X4][X3] | 75+ providers via AI SDK + Models.dev, plus local models (Ollama, LM Studio, llama.cpp) [O1] | Many providers (Anthropic, OpenAI, Google, Bedrock, Vertex, xAI, Groq, OpenRouter, Copilot, Mistral…) plus custom OpenAI-compatible endpoints [P1] | Any AI SDK provider (dozens, first- and community-party) [V1] |
| **Embedding shape** | npm lib that spawns the bundled `claude` native binary (per-platform optionalDeps incl. `win32-x64/arm64`, `linux-x64/arm64`). `pathToClaudeCodeExecutable`, `spawnClaudeCodeProcess` [C2][pkg] | TS SDK spawns the `codex` binary (`codex exec` JSONL). The richer path is `codex app-server` over stdio JSON-RPC 2.0 [X1][X2] | `createOpencode()` spawns `opencode serve` (HTTP on 127.0.0.1:4096); the client talks REST + SSE [O2] | **In-process** `createAgentSession()` in Node ≥ 22.19. Also RPC/JSON subprocess modes [P2] | **In-process** library (`ToolLoopAgent`, `streamText`) [V1] |
| **Custom tools** | `tool()` + `createSdkMcpServer()` run **in-process** in the host. External MCP (stdio/http/sse) via `mcpServers` [C2] | MCP servers via config / `mcpServer/*`. Host-executed `dynamicTools` on `thread/start` (experimental) [X2][X5] | `.opencode/tools/*.ts` with `tool()` from `@opencode-ai/plugin`, plugins (hooks such as `tool.execute.before`), MCP via `mcp` config [O3][O4] | `customTools` option and extensions via `ResourceLoader` (including inline extension factories) [P2] | Native `tool()`. MCP client (`@ai-sdk/mcp`) [V1] |
| **System prompt** | `systemPrompt`: custom string, or preset `claude_code` + `append` [C2] | `baseInstructions`, `developerInstructions` on `thread/start`. AGENTS.md [X5] | Agents with `prompt`, `instructions` files, `system` per prompt call [O2][O4] | Replace or append system prompt (SDK example 03) [P2] | `instructions` / `system` — you own the whole prompt [V1] |
| **Skills (SKILL.md)** | Filesystem only (`.claude/skills`, or a **plugin loaded by local path** via `plugins`). `skills` option filters. No programmatic registration [C4] | `.agents/skills` (repo/user/admin/system), `skills/list` [X6][X2] | `.opencode/skills`, `.claude/skills`, `.agents/skills` (project + global), `skill` tool [O5] | Skills via `ResourceLoader` / discovery (SDK example 04) [P2] | No native Skills. `HarnessAgent` surfaces skills only through a wrapped harness [V3] |
| **Streaming events** | Async iterator of `SDKMessage` (assistant, user, result, `stream_event` partials with `includePartialMessages`, `compact_boundary`, status…) [pkg] | TS SDK: `thread.started`, `turn.*`, `item.started/updated/completed`. App-server: `item/agentMessage/delta`, `turn/plan/updated`, `turn/diff/updated`, etc. [pkg][X2] | SSE `event.subscribe()`: `message.part.updated`, `session.idle`, `session.compacted`, `permission.updated`… [pkg] | `session.subscribe()`: `message_update` (text deltas), tool execution, compaction, retry, `agent_end`, `agent_settled` [P2] | `fullStream` parts, step callbacks [V1] |
| **Token usage** | `result.usage`, per-model `modelUsage` (input/output/cache/thinking, `costUSD`), `total_cost_usd` [pkg] | TS SDK `turn.completed.usage` (input, cached, cache-write, output, reasoning). App-server `total` + `last` breakdown [pkg][X5] | Per assistant message `tokens {input, output, reasoning, cache{read,write}}` + `cost` [pkg] | Per message `usage` incl. cost [P1] | `usage` per step, `totalUsage` [V1] |
| **Context-window reporting** | Yes: `ModelUsage.contextWindow`, `query.getContextUsage()` → `totalTokens`, `maxTokens`, `percentage`, per-category breakdown [pkg] | App-server yes: `thread/tokenUsage/updated.tokenUsage.modelContextWindow`. TS SDK: no [X5][pkg] | Indirect: model `limit.context` from provider/model list; compute from last message tokens [pkg] | Yes: `session.getContextUsage()`, model `contextWindow` [P3][P1] | No. Keep your own model→window table [V1] |
| **Built-in compaction** | Yes: auto + manual `/compact`, `compact_boundary` message with `pre_tokens`/`post_tokens`, `PreCompact`/`PostCompact` hooks, `autoCompactThreshold` [pkg][C2] | Yes: auto (`model_auto_compact_token_limit`), manual `thread/compact/start`, `contextCompaction` item [X2][X7] | Yes: `compaction.auto` (default true), `prune`, `reserved`. `session.compacted` event [O4][pkg] | Yes: auto when `contextTokens > contextWindow - reserveTokens` (16384), `keepRecentTokens` 20000, `/compact`, extension hooks [P4] | No. DIY via `prepareStep` + `pruneMessages` (cookbook) [V2] |
| **Subscription login** | Technically yes (claude.ai OAuth), but **not permitted for third-party apps** (see below) [C1][C5] | App-server `account/login/start` supports `chatgpt`, `chatgptDeviceCode`, `chatgptAuthTokens`, `apiKey`, Bedrock [X5] | ChatGPT Plus/Pro, GitHub Copilot, GitLab Duo. **Claude Pro/Max removed in 1.3.0** [O1] | OAuth for Anthropic Pro/Max, ChatGPT Plus/Pro (Codex), Copilot, OpenRouter [P1] | No. API keys per provider |
| **API key** | Yes (Console key, Bedrock/Vertex/Foundry creds) | Yes | Yes | Yes | Yes |
| **Windows + Linux** | Yes (native binaries for both) [pkg] | Yes (native binaries for both) [pkg] | Yes (native binaries for both) [pkg] | Yes (pure Node; has a `windows.md` doc) [P2] | Yes (pure JS) |
| **License** | Proprietary: "© Anthropic PBC. All rights reserved", Commercial ToS [pkg][C1] | Apache-2.0 [pkg][X8] | MIT [O6] | MIT [P2] | Apache-2.0 [pkg] |

`[pkg]` means verified in the published npm package (`.d.ts` types / `package.json`) at the versions listed above.

## Per-Engine notes

### Claude Agent SDK / Claude Code headless

- The Agent SDK is "a library that runs the Claude Code binary" [C1]. `query()` returns an async generator. Alternatively, run `claude -p --output-format json|stream-json` as a subprocess [C1].
- **Tools:** the `tool()` + `createSdkMcpServer()` pair runs tool handlers in the host process, a natural fit for the Quest Log and Agent Memory tools living in the Electron main process [C2].
- **Skills:** filesystem only. Questline's bundled Skills could ship as a Claude Code plugin directory loaded through `plugins`, or be written into `.claude/skills`. The SDK "does not have a programmatic API for registering skills" [C4]. By default the SDK also loads the user's `~/.claude` and project `.claude/` settings, skills and CLAUDE.md. `settingSources: []` isolates it [C4].
- **Context reporting** is the richest of all candidates. `getContextUsage({detail:'summary'|'full'})` returns category breakdown, `maxTokens` and `percentage`. There is also `getUsage()`-style `/usage` data that includes claude.ai plan rate-limit windows, but only for subscription sessions [pkg].
- **Branding:** the product may not be called "Claude Code" or mimic it. "Powered by Claude" is allowed [C1].

### OpenAI Codex (CLI / SDK / app-server)

- **`@openai/codex-sdk` (TS)** wraps `codex exec` and streams simple `ThreadEvent`s. Its usage has token counts but no context window [pkg]. The Python SDK already drives the app-server [X1].
- **`codex app-server`** is the protocol the Codex IDE/desktop clients use: JSON-RPC 2.0 over stdio (websocket experimental). It has threads, turns, items, `turn/steer`, `turn/interrupt`, approvals, `thread/fork`, `thread/compact/start`, and `thread/tokenUsage/updated` with `modelContextWindow` [X2][X5]. The docs call it experimental for production workloads [X2]. `dynamicTools` is gated behind the `experimentalApi` opt-in [X5].
- **Providers:** config-level `model_providers` with `base_url` / `wire_api`, built-in `openai`, `ollama`, `lmstudio`, plus Azure and Bedrock examples. Tuned for OpenAI models [X4].

### opencode

- **Client/server architecture:** the SDK either spawns `opencode serve` or connects to a running one [O2]. Events arrive over SSE. The TUI is just another client.
- **Most provider-agnostic of the "full harness" options** (AI SDK + Models.dev underneath) [O1].
- **Skills compatibility is broad:** it reads `.claude/skills` and `.agents/skills` as well as its own folders [O5].
- **Custom tools are files or plugins on disk**, loaded by the opencode server process, so they are not closures in the Electron process. Host-side tools need MCP or a plugin that calls back to Questline [O3].

### pi (earendil-works/pi, formerly badlogic/pi-mono)

- `pi-ai` is a unified multi-provider LLM API with per-model `contextWindow`, cost tracking and OAuth credential storage (pluggable `CredentialStore`) [P1]. `pi-coding-agent` adds the agent: sessions (branching JSONL), tools, skills, extensions, compaction. Its SDK runs **in-process** [P2].
- It is the only candidate that is both in-process **and** has built-in compaction, context usage and skills.
- Requires Node ≥ 22.19 [P2]. Check the Node version bundled by the chosen Electron release.
- The repo auto-closes issues and PRs from new contributors [P2], which matters if Questline needs upstream fixes.

### Vercel AI SDK 7

- A loop library, not a harness: `ToolLoopAgent`, `stopWhen`, `prepareStep`, `usage`/`totalUsage`, MCP client [V1]. Compaction, context-window tracking, file/shell tools, sessions and skills are all Questline's to build [V2].
- **New in v7 (2026-06-25): `HarnessAgent`**, a single API over harness adapters: Claude Code, Codex, Pi, OpenCode, Cline, Cursor, Copilot, Amp, Goose, Mastra and others [V3][V4]. The Claude Code and Codex adapters run a bridge inside a network sandbox (`@ai-sdk/sandbox-vercel` is the documented option), whereas Pi runs in the host process [V3]. That makes it a candidate *shape* for Questline's own `Engine` interface, but the bridge-backed adapters don't fit a local desktop app as documented.

## Subscription login vs API key — ToS facts

### Anthropic (Claude Pro/Max)

- Agent SDK overview: *"Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Use the API key authentication methods … instead."* [C1]
- Legal and compliance: *"Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens."* The same page says advertised Pro/Max limits "assume ordinary, individual usage of Claude Code and the Agent SDK" [C5].
- **Carve-out:** the same page says this does not *"prevent an end user from signing in to the unmodified Claude Code binary with their own Claude subscription"*. Products may run Claude Code if the binary is unmodified and its built-in auth methods are not removed [C5]. Whether a desktop app that spawns the user's own logged-in `claude` binary falls under this carve-out or under the Agent SDK prohibition is **ambiguous**. Get written confirmation from Anthropic before relying on it.
- opencode removed its Claude Pro/Max plugins in 1.3.0, stating *"Anthropic explicitly prohibits this"* [O1]. pi still ships Anthropic OAuth [P1]. Using it in Questline would fall under the prohibition above.

### OpenAI (ChatGPT Plus/Pro)

- Codex auth docs: *"Use API key authentication for programmatic Codex CLI workflows, such as CI/CD jobs."* Access tokens are for "trusted scripts, schedulers, and private CI runners" [X9].
- The app-server protocol has first-class `chatgpt` / `chatgptDeviceCode` login types, where the user signs in through OpenAI's own flow, as well as `chatgptAuthTokens`, where the host supplies the tokens [X5]. opencode docs recommend ChatGPT Plus/Pro login [O1], and pi supports it [P1].
- OpenAI staff have publicly welcomed third-party harnesses (opencode, pi) on ChatGPT plans, per secondary reporting [S1]. **No OpenAI ToS clause found that explicitly grants or forbids it.** Treat this as tolerated, not contracted.

### Others

- GitHub Copilot and GitLab Duo subscriptions are supported by opencode [O1]. Copilot is also supported by pi [P1]. The providers' terms for third-party use were not checked here.

## Open questions for the Engine decision (#5)

1. Is Claude subscription use required? If yes, the only possibly compliant route is spawning the user's own unmodified `claude` binary, which needs Anthropic confirmation. Otherwise the answer is API keys only.
2. Does Questline accept a native sidecar binary per platform (Claude, Codex, opencode), or does it prefer in-process (pi, AI SDK)? Electron packaging must unpack binaries from the asar archive.
3. Codex app-server `dynamicTools` is experimental. If Codex matters, plan to inject tools over MCP instead.

## Sources

- [C1] Agent SDK overview — https://code.claude.com/docs/en/agent-sdk/overview
- [C2] Agent SDK TypeScript reference — https://code.claude.com/docs/en/agent-sdk/typescript
- [C3] Claude Code enterprise deployment / third-party providers — https://code.claude.com/docs/en/third-party-integrations
- [C4] Use Claude Code features in the SDK — https://code.claude.com/docs/en/agent-sdk/claude-code-features
- [C5] Claude Code legal and compliance — https://code.claude.com/docs/en/legal-and-compliance
- [X1] Codex SDK — https://learn.chatgpt.com/docs/codex-sdk
- [X2] Codex App Server — https://learn.chatgpt.com/docs/app-server
- [X3] Codex source, `model_auto_compact_token_limit` / `model_context_window` — https://github.com/openai/codex/tree/main/codex-rs
- [X4] Codex advanced config (model providers, OSS mode) — https://learn.chatgpt.com/docs/config-file/config-advanced.md
- [X5] App-server protocol types (`ThreadStartParams`, `ThreadTokenUsage`, `LoginAccountParams`, `DynamicToolSpec`) — https://github.com/openai/codex/tree/main/codex-rs/app-server-protocol/schema/typescript/v2
- [X6] Codex build skills — https://learn.chatgpt.com/docs/build-skills.md
- [X7] Codex `context_window.rs` — https://github.com/openai/codex/blob/main/codex-rs/core/src/session/context_window.rs
- [X8] Codex LICENSE — https://github.com/openai/codex/blob/main/LICENSE
- [X9] Codex authentication — https://learn.chatgpt.com/docs/auth
- [O1] opencode providers — https://opencode.ai/docs/providers/
- [O2] opencode SDK — https://opencode.ai/docs/sdk/
- [O3] opencode custom tools — https://opencode.ai/docs/custom-tools/
- [O4] opencode config (compaction, instructions, MCP) — https://opencode.ai/docs/config/ ; plugins — https://opencode.ai/docs/plugins/
- [O5] opencode skills — https://opencode.ai/docs/skills/
- [O6] opencode repo (MIT) — https://github.com/anomalyco/opencode
- [P1] pi-ai README — https://github.com/earendil-works/pi/blob/main/packages/ai/README.md
- [P2] pi coding-agent README + SDK docs — https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md , https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md
- [P3] pi `AgentSession.getContextUsage()` — https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/agent-session.ts
- [P4] pi compaction reference — https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md
- [V1] AI SDK agents overview — https://ai-sdk.dev/docs/agents/overview ; text generation — https://ai-sdk.dev/docs/ai-sdk-core/generating-text
- [V2] AI SDK cookbook: compact agent context — https://ai-sdk.dev/v7/cookbook/guides/agent-context-compaction
- [V3] AI SDK HarnessAgent — https://ai-sdk.dev/docs/ai-sdk-harnesses/harness-agent ; adapters — https://ai-sdk.dev/docs/ai-sdk-harnesses/harness-adapters
- [V4] AI SDK 7 announcement — https://vercel.com/blog/ai-sdk-7
- [S1] Secondary: "ChatGPT Plus: $200 of tokens for $20" (reports OpenAI statements on third-party harnesses) — https://manifest.build/blog/chatgpt-plus-tokens-third-party-harnesses/
