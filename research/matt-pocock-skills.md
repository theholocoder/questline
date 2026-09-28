# Matt Pocock's skills: inventory, workflow, tool coupling, license

Research for [questline#4](https://github.com/theholocoder/questline/issues/4) (child of map #1).

**Source pinned:** [`mattpocock/skills`](https://github.com/mattpocock/skills) at commit
[`c55ee46`](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7)
(2026-09-18), plugin version **1.2.3**. All repo links below point at that commit.
Matt's own description of the workflow is the repo's [`README.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md) and the
[`ask-matt`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md) router skill ("the router that maps every
user-reachable skill and how they relate", [`CLAUDE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/CLAUDE.md)); per-skill human docs live
in `docs/<bucket>/<skill>.md` and publish at `https://aihero.dev/skills-<name>`.

## TL;DR

- **License: MIT** ([`LICENSE`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/LICENSE), `"license": "MIT"` in [`plugin.json`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.claude-plugin/plugin.json)). Questline may bundle, modify and redistribute; the only obligation is to keep the copyright + permission notice ("Copyright (c) 2026 Matt Pocock") in copies. The README actively invites forking: "Hack around with them. Make them your own."
- **25 promoted skills** ship in the plugin (18 engineering, 7 productivity), plus 4 `misc/` and 9 `in-progress/` skills that are not promoted.
- **Main flow:** `setup-matt-pocock-skills` (once) → `grill-with-docs` → [`prototype` detour] → `to-spec` → `to-tickets` → `implement` (drives `tdd`, ends with `code-review`) → commit. On-ramps: `triage`, `diagnosing-bugs`, `wayfinder` (merges back at `to-spec`).
- **Tracker coupling is by prose indirection, not code.** Skills say "publish to the issue tracker" / "fetch the relevant ticket"; the meaning comes from `docs/agents/issue-tracker.md`, reached via an `## Agent skills` block in `AGENTS.md`/`CLAUDE.md`. Setup ships GitHub (`gh`), GitLab (`glab`) and local-markdown (`.scratch/`) templates and an **"Other" = freeform prose** option. So yes: pointing the skills at a custom Quest Log tool only needs a Questline-authored `issue-tracker.md` describing that tool's operations. One leak: `code-review` names the literal path `docs/agents/issue-tracker.md`.
- **Skill-to-skill coupling** is "Call the Skill tool with \"<name>\"", and only model-invoked skills may be called that way. `grill-with-docs` and `grill-me` are one-line wrappers around that.
- **Other tool assumptions:** subagents (`code-review`, `research`, `grilling`, `codebase-design`, `improve-codebase-architecture`, `wayfinder`), `git`, shell, filesystem, a browser opener (`xdg-open`/`open`), OS temp dir, and Claude-Code-style commands `/clear`, `/compact` in the router's advice.

## 1. Skill inventory

Invocation is the one axis the repo uses ([`.agents/invocation.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md)):
**user-invoked** = `disable-model-invocation: true` in frontmatter (plus `policy.allow_implicit_invocation: false` in `agents/openai.yaml` for Codex), reachable only by the human typing it; **model-invoked** = reachable by model or user. "A user-invoked skill may invoke model-invoked skills, but it can never reach another user-invoked skill."

Promoted set = exactly the `skills` array of [`.claude-plugin/plugin.json`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.claude-plugin/plugin.json) (25 entries). Bucket rules: [`CLAUDE.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/CLAUDE.md).

### Engineering (promoted)

| Skill | Invocation | Inputs | Output artifacts | External tools / deps |
|---|---|---|---|---|
| [`setup-matt-pocock-skills`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/SKILL.md) | user | the repo (`git remote -v`, existing `AGENTS.md`/`CLAUDE.md`, `CONTEXT.md`, `docs/adr/`, `.scratch/`), user answers | `## Agent skills` block in `CLAUDE.md` or `AGENTS.md`; `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `docs/agents/triage-labels.md` (last only if `triage` installed) | filesystem, git; seeds from templates in its folder |
| [`ask-matt`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md) (+ `PHASE-BOUNDARIES.md`) | user | user's situation | advice only (routing) | none; mentions `/clear`, `/compact`, subagents |
| [`grill-with-docs`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/grill-with-docs/SKILL.md) | user | conversation / idea | `CONTEXT.md` updates, ADRs in `docs/adr/` (via `domain-modeling`) | body is one line: "Call the Skill tool twice, for \"grilling\" and \"domain-modeling\"." |
| [`to-spec`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-spec/SKILL.md) | user | current conversation + codebase; no interview (only confirms test seams) | one spec issue on the tracker (template: Problem, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes), labelled `ready-for-agent` | issue tracker (hard dep), triage labels |
| [`to-tickets`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/to-tickets/SKILL.md) | user | plan/spec/conversation, optionally a spec path or issue ref | N tracer-bullet tickets with blocking edges: local files `.scratch/<feature>/issues/NN-<slug>.md`, or tracker issues with native blocking/sub-issue links, labelled `ready-for-agent`; quizzes user on breakdown first | issue tracker (hard dep), triage labels |
| [`implement`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/implement/SKILL.md) | user | spec or tickets | code + tests, commit on current branch | uses `/tdd` and `/code-review`; typechecker, test runner, git. (Note: refers to them as `/tdd` `/code-review` prose, not Skill-tool calls.) |
| [`code-review`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/code-review/SKILL.md) | model | a fixed point (commit/branch/tag); spec from commit refs, arg, or `docs/`/`specs/`/`.scratch/` | report with `## Standards` and `## Spec` sections (not written to a file) | `git diff/log/rev-parse`; **two parallel subagents**; tracker read; names literal `docs/agents/issue-tracker.md` |
| [`tdd`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd/SKILL.md) (+ `tests.md`, `mocking.md`) | model | behaviour to build; seams confirmed with user | tests + implementation, red→green slices | test runner; reads `CONTEXT.md`; may call `codebase-design` |
| [`triage`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/triage/SKILL.md) (+ `AGENT-BRIEF.md`, `OUT-OF-SCOPE.md`) | user | issues / external PRs on tracker | labels (category + state role), agent-brief or needs-info comments, closes, `.out-of-scope/*.md` entries | issue tracker + label mapping (hard dep); may call `grilling` + `domain-modeling` |
| [`wayfinder`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wayfinder/SKILL.md) | user | loose idea (chart) or a map ref (work) | map issue `wayfinder:map` + child decision tickets (`wayfinder:research/prototype/grilling/task`), blocking edges, resolution comments, closes, map edits; `research/<name>` branches | tracker "Wayfinding operations" section; subagents running `research`; `grilling`, `domain-modeling`, `prototype` |
| [`improve-codebase-architecture`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/improve-codebase-architecture/SKILL.md) (+ `HTML-REPORT.md`) | user | codebase, `git log` | HTML report in OS temp dir (Tailwind + Mermaid via CDN), opened with `xdg-open`/`open`/`start`; then `CONTEXT.md`/ADR edits | subagent to explore; `codebase-design`, `grilling`, `domain-modeling` |
| [`prototype`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/prototype/SKILL.md) (+ `LOGIC.md`, `UI.md`) | model | a design question | single HTML file (logic) or multi-variant UI route; committed to a throwaway `prototype/<name>` branch, pointer on issue | filesystem, git, project task runner |
| [`research`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/research/SKILL.md) | model | a question | one cited Markdown file in the repo | **background agent**; web / primary sources |
| [`diagnosing-bugs`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/diagnosing-bugs/SKILL.md) (+ `scripts/hitl-loop.template.sh`) | model | a bug report | feedback loop, fix, regression test | shell, `git bisect`, optionally Playwright/curl |
| [`domain-modeling`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/domain-modeling/SKILL.md) (+ `CONTEXT-FORMAT.md`, `ADR-FORMAT.md`) | model | conversation | `CONTEXT.md` (glossary only), `docs/adr/NNNN-*.md`; multi-context via `CONTEXT-MAP.md` | filesystem |
| [`codebase-design`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/codebase-design/SKILL.md) (+ `DEEPENING.md`, `DESIGN-IT-TWICE.md`) | model | a module design question | vocabulary/reference; design-it-twice uses parallel subagents | subagents |
| [`resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/resolving-merge-conflicts/SKILL.md) | model | in-progress merge/rebase | resolved commit | git, project checks |
| [`wizard`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/wizard/SKILL.md) (+ `template.sh`) | model | a manual procedure | bash script writing `.env`, `gh secret`/`gh variable` | bash, `gh` |

### Productivity (promoted)

| Skill | Invocation | Output | Notes |
|---|---|---|---|
| [`grilling`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/grilling/SKILL.md) | model | shared understanding (conversation only) | The interview primitive: rounds over a decision-tree **frontier**, numbered `❓ Q1` questions each with a `➡️` recommendation; facts are looked up by subagents, decisions go to the user. Used by grill-me, grill-with-docs, triage, wayfinder, improve-codebase-architecture. |
| [`grill-me`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/grill-me/SKILL.md) | user | none (stateless) | One line: "Call the Skill tool with \"grilling\"." |
| [`handoff`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/handoff/SKILL.md) | user | handoff Markdown in OS temp dir, with "suggested skills" | |
| [`teach`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/teach/SKILL.md) | user | stateful teaching workspace in cwd | |
| [`to-questionnaire`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/to-questionnaire/SKILL.md) | user | Markdown questionnaire | |
| [`wait-what`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/wait-what/SKILL.md) | user | re-pitch of last message | uses `CONTEXT.md` vocabulary |
| [`writing-for-agents`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/productivity/writing-for-agents/SKILL.md) | model | reference for writing skills / AGENTS.md | |

### Not promoted (not in plugin)

- `misc/` ([README](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/misc/README.md)): `git-guardrails-claude-code` (Claude Code hooks), `migrate-to-shoehorn`, `scaffold-exercises`, `setup-pre-commit`.
- `in-progress/` ([README](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/in-progress/README.md), "can change or disappear without warning"): `loop-me`, `writing-beats`, `writing-fragments`, `writing-shape`, `claude-handoff` (uses `claude --bg`), `setup-ts-deep-modules`, **`implement-spec`** (whole spec on one branch: task-graph frontier, background implementer subagents each in its own **git worktree**, a merger subagent, draft PR, then `/code-review`), `pr`, `retro` (stub).
- `deprecated/` is empty; retired skills are deleted. Renames to know about ([CHANGELOG](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/CHANGELOG.md)): `to-prd` → `to-spec`; `to-plan` + `to-issues` → `to-tickets`; `ubiquitous-language` → `domain-modeling`; `design-an-interface` → `codebase-design`; `qa` → `triage`/`to-tickets`.

## 2. Canonical workflow order

From [`ask-matt`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/SKILL.md) and the "Where it fits" rule in [`.agents/writing-docs.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/writing-docs.md) ("a chain step (`grill-with-docs → to-spec → to-tickets → implement → code-review`)"):

0. **Precondition:** `/setup-matt-pocock-skills`, once per repo.
1. **`/grill-with-docs`**: sharpen the idea (writes `CONTEXT.md`, ADRs). `/grill-me` if no working directory.
2. **Branch: runnable answer needed?** `/handoff` out → `/prototype` → `/handoff` back.
3. **Branch: multi-session build?**
   - Yes: **`/to-spec`** → **`/to-tickets`** → **`/implement`** per ticket, `/clear` between tickets.
   - No: **`/implement`** in the same context.
4. `/implement` drives **`/tdd`** then closes with **`/code-review`** (Standards + Spec), then commits.

**Context hygiene:** keep steps 1–3 in one unbroken context window (no compact/clear until after `/to-tickets`); each `/implement` starts fresh from its ticket. Limit is the ~150k-token "smart zone". Phase boundaries are resolved via the Continue / `/clear` / `/handoff` / subagent / `/compact` tree in [`PHASE-BOUNDARIES.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/ask-matt/PHASE-BOUNDARIES.md).

**On-ramps** that merge onto the main flow:
- `/triage` for incoming issues you didn't create → agent-ready issues → `/implement`. Do not triage `/to-tickets` output.
- `/diagnosing-bugs` for hard bugs; post-mortem may hand to `/improve-codebase-architecture`.
- `/wayfinder` for efforts too big for one session: produces decisions, not deliverables; when the map clears, merge at `/to-spec`.

**Upkeep / standalone:** `/improve-codebase-architecture` (every few days; feeds `/grill-with-docs`), `/research` (feeds `/grill-with-docs`), `/to-questionnaire`, `/wizard`, `/wait-what`, `/teach`, `/resolving-merge-conflicts`.

**Implication for Questline Stages:** the natural Stage list is `setup` (project-level, once) → `grill-with-docs` → (`prototype`, optional) → `to-spec` → `to-tickets` → `implement` (with `tdd` inside) → `code-review`. `research` fits before grilling as an optional Stage. `to-spec`/`to-tickets` are skipped for single-session work, so Stage gating must allow that branch.

## 3. How skills couple to tools

### 3.1 Skill → skill

Operative dependencies are written as "Call the Skill tool with \"<name>\"" (one skill per call; "Call the Skill tool twice, for X and Y" for two). Deep cross-folder file links are forbidden; shared reference docs live inside the owning skill. A user-invoked skill can never be the target, so preconditions like setup are phrased as "tell the user to run `/setup-matt-pocock-skills`" ([`.agents/invocation.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/invocation.md)). Exceptions: `implement` still says "Use /tdd" and "use /code-review" in prose rather than a Skill-tool call.

Consequence for Questline: the Engine must expose a tool literally named/understood as **the Skill tool** that loads a skill by name, and must honour the user-invoked/model-invoked flag (hide user-invoked skills from the model's skill list and from Skill-tool calls). Stage transitions in Questline would be the harness equivalent of the user typing a user-invoked skill.

### 3.2 Issue tracker (the indirection)

- **Pointer chain:** setup writes an `## Agent skills` block into `CLAUDE.md` (preferred if present) or `AGENTS.md`, with one-liners pointing at `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md` ([setup SKILL.md](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/SKILL.md)). Since `AGENTS.md`/`CLAUDE.md` is auto-loaded, skills just say "The issue tracker and triage label vocabulary should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`." The 1.1.0 CHANGELOG ([#472](https://github.com/mattpocock/skills/pull/472)) confirms this is the intended design: skills "never name a path — they resolve the tracker through the `### Issue tracker` block".
- **Abstract verbs** the tracker doc must define: "publish to the issue tracker", "fetch the relevant ticket", create/read/list/comment/label/close, and for wayfinder a **"Wayfinding operations"** section (map, child ticket, blocking, frontier query, claim, resolve). See the three templates: [GitHub](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/issue-tracker-github.md) (`gh`, `gh api` for sub-issues and `issues/<n>/dependencies/blocked_by`), [GitLab](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md) (`glab`, `/blocked_by` quick action), [local](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md) (`.scratch/<feature>/spec.md`, `issues/NN-<slug>.md`, `Status:`/`Blocked by:` lines).
- **Custom trackers are supported by design:** setup's Section A offers "**Other** (Jira, Linear, etc.): ask the user to describe the workflow in one paragraph; the skill will record it as freeform prose", and "For \"other\" issue trackers, write `docs/agents/issue-tracker.md` from scratch". [`.out-of-scope/mainstream-issue-trackers-only.md`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.out-of-scope/mainstream-issue-trackers-only.md) names `other/custom` as the escape hatch for anything not first-class. `ask-matt`: "Custom issue trackers also work."
- **Hard vs soft dependency** ([ADR 0001](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md)): hard = `to-spec`, `to-tickets`, `triage` (plus `wayfinder`, `code-review` in practice); soft = `tdd`, `diagnosing-bugs`, `improve-codebase-architecture` (only read `CONTEXT.md`/ADRs, degrade gracefully).
- **Leaks in the indirection:** `code-review` says "If `docs/agents/issue-tracker.md` is missing, tell the user to run `/setup-matt-pocock-skills`" and fetches spec "via the workflow in `docs/agents/issue-tracker.md`"; it also searches `.scratch/` for specs. `to-tickets` hard-codes the local-file layout `.scratch/<feature-slug>/issues/` for the local case. `wayfinder` defaults to local markdown if no tracker is provided. Triage labels and `wayfinder:*` labels are assumed to exist as label strings.

**Answer: can it point at a custom tool?** Yes. Write a Questline-owned `docs/agents/issue-tracker.md` (or inject equivalent text into context) whose conventions say, e.g., "Create an issue: call the `quest_log.create` tool…", covering every verb above including a Wayfinding operations section and a mapping for triage-role labels. No SKILL.md edits are strictly required; the adapted copy should still fix the `code-review` literal path and the `implement` prose references if Questline wants to rely purely on injected context rather than on files in the user's repo. Note the CONTEXT.md split: Questline's Quest Log holds agent-facing items, while the user-facing tracker stays GitHub/GitLab, so Questline will need to decide which verbs route where (e.g. `to-tickets` → Quest Log, `to-spec` → possibly the user tracker).

### 3.3 Other tool assumptions

| Assumption | Where |
|---|---|
| **Subagents** (spawn, parallel, background) | `code-review` (2 parallel), `research` (background agent), `grilling` (fact-finding), `improve-codebase-architecture`, `codebase-design` design-it-twice, `wayfinder` (research subagents), `implement-spec` (worktree subagents). 1.2.3 dropped Claude-Code-specific tool/agent-type names from these to stay harness-neutral. |
| **Skill tool** | every composite skill (see 3.1) |
| **`AGENTS.md`/`CLAUDE.md` auto-loading** | the whole tracker indirection |
| **git** | `code-review` (`diff`, `log`, `rev-parse`), `implement` (commit), `prototype`/`research`-via-wayfinder (throwaway branches), `diagnosing-bugs` (`bisect`), `resolving-merge-conflicts`, `improve-codebase-architecture` (`log`) |
| **`gh` / `glab`** | only via the tracker doc templates; directly in `wizard` (`gh secret`/`gh variable`) |
| **Filesystem conventions** | `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/`, `docs/agents/*.md`, `.scratch/`, `.out-of-scope/` |
| **OS temp dir + opener** | `handoff`, `improve-codebase-architecture` (`$TMPDIR`, `xdg-open`/`open`/`start`), CDN Tailwind/Mermaid |
| **Harness slash commands** | `/clear`, `/compact` in `ask-matt` advice |
| **Codex metadata** | every skill has `agents/openai.yaml` (display name, short description, implicit-invocation policy) |

## 4. License and distribution

- [`LICENSE`](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/LICENSE): **MIT**, "Copyright (c) 2026 Matt Pocock". Grants use, copy, modify, merge, publish, distribute, sublicense, sell; condition: include the copyright and permission notice in all copies or substantial portions. No warranty.
- Distribution models Matt supports ([README](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/README.md), [install-block](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/.agents/install-block.md)): the Claude Code plugin (`mattpocock-skills`, managed, read-only, auto-updating, sha-pinned in the official marketplace) vs skills.sh (`npx skills@latest add mattpocock/skills`, editable copies you own). He frames forking as a first-class route.
- **For Questline:** bundling a pinned, adapted copy is permitted. Ship the LICENSE text with the bundled skills (e.g. `LICENSE` inside the bundled skills folder) and record the upstream commit pinned. Avoid presenting the adapted copy as Matt's official plugin (the name `mattpocock-skills` and "Matt Pocock" branding are not licensed as trademarks by MIT; attribution is fine, endorsement is not).

## 5. Local install vs upstream

`/home/lazybobcat/.claude/skills/*` are symlinks into `~/.agents/skills/` (skills.sh-style install). All 25 promoted skills present locally are **byte-identical** to upstream `c55ee46` (`diff -r`). Three local symlinks are **dangling** leftovers of renamed skills: `to-issues`, `to-prd`, `ubiquitous-language`. No `in-progress/` or `misc/` skills are installed.
