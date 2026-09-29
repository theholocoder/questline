# pi spike

Throwaway spike for [pi spike: prove the Engine assumptions](https://github.com/theholocoder/questline/issues/14) (map: [Questline v1: from idea to PRD](https://github.com/theholocoder/questline/issues/1)).

```sh
npm i && npm run spike
```

Embeds `@earendil-works/pi-coding-agent` 0.99.0 in a plain Node script (Node 25.2.1). It runs without an API key: pi-ai's faux provider scripts the model responses, and every check runs real pi code (tools, Skills, compaction, queues). Result on 2026-09-29: **22/22 checks pass** (`results.json`).

## How each assumption is met

| # | Assumption | pi mechanism |
|---|---|---|
| 1 | Custom system prompt + only harness Skills | `DefaultResourceLoader({ systemPrompt, noSkills, noContextFiles, noPromptTemplates, noThemes, skillsOverride: () => loadSkillsFromDir(bundledDir) })` plus a Questline-owned `agentDir`. User Skills (`~/.pi/agent/skills`), repo Skills (`.claude/`, `.agents/`, `.pi/skills`) and `AGENTS.md` are not loaded. |
| 1 | User-invoked Skills | `disable-model-invocation: true` frontmatter hides the Skill from the system prompt. `/skill:<name>` still expands it, and another Skill can reach it by reading its `SKILL.md`. |
| 2 | Blocking `ask` tool | A `customTools` entry whose `execute()` awaits a host promise. The Run blocks until the host answers, and the tool's `AbortSignal` rejects it on abort. |
| 3 | Host executor (sandbox seam) | `noTools: "builtin"` plus `customTools` built with `create{Bash,Read,Write,Edit}ToolDefinition(cwd, { operations })`. All tool I/O goes through host-supplied `BashOperations` / `ReadOperations` / `WriteOperations` / `EditOperations`. The spike's jail rejects paths outside the worktree. |
| 4 | Context usage + compaction | `session.getContextUsage()` → `{ tokens, contextWindow, percent }`. Auto-compaction fires (`compaction_start` / `compaction_end`) with `settings.compaction.{enabled,reserveTokens,keepRecentTokens}`, and `session.compact(instructions)` compacts on demand. |
| 5 | Events, abort, steer | `session.subscribe()` emits `agent_start`, `turn_start`, `message_start/update/end`, `tool_execution_start/update/end`, `turn_end`, `agent_end`, `agent_settled`, `compaction_start/end`. `abort()` leaves an assistant message with `stopReason: "aborted"`. `steer(text)` returns `"queued"` and is delivered after the current tool calls. |

## Gaps and notes

- **Providers go through pi's `ModelRuntime`.** A provider needs configured auth before `prompt()` runs. Questline creates its own runtime (`ModelRuntime.create({ authPath: <Questline dir> })`), injects keys with `setRuntimeApiKey`, and can register providers through an inline extension factory (`api.registerProvider(provider)`).
- **The context gauge must handle `tokens: null`.** pi reports `null` right after compaction, until the next model response.
- **The jail must let Runs read the bundled Skills dir (read only),** because Skills reference each other by `SKILL.md` path and that dir lives outside the worktree.
- **The host executor is a seam, not a sandbox.** The bash jail only checks `cwd`. A command can still touch anything the user can. Real isolation is the job of the sandbox tickets.
- **`grep`, `find`, `ls` and `powershell`** also take `operations` (same pattern). The spike did not exercise them.
- **Not exercised against a real provider.** Real-provider usage accounting and context-overflow recovery are unverified, because the faux model does not enforce its window (hence `percent` > 100 in the run). This is low risk, because pi's built-in providers own that code.
- The spike used `SessionManager.inMemory()`, so pi writes no session files. That fits "transcript lives in SQLite".
