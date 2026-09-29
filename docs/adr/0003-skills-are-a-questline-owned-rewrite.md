# Skills are a Questline-owned rewrite, and repo Skills are ignored

The built-in Workflow Plugin ships its own rewrite of Pocock's Skills instead of vendoring or patching `mattpocock/skills`. The rewritten prose names Questline tools directly (Quest Log tools, `ask`, `complete_stage`) and is not kept in sync with upstream; a `NOTICE.md` credits the inspiration and carries the MIT notice. Skills a Project's repo carries (`.claude/skills`, `.agents/skills`) are never loaded: Questline is a harness for one workflow, not a generic agent, and only Plugins add or override Skills.

## Considered Options

- **Vendored fork, edited in place**: rejected. It keeps upstream updates cheap, but it keeps upstream's tracker indirection and harness assumptions (`gh`, `docs/agents/*.md`, `.scratch/`, markdown question rounds) that Questline replaces anyway.
- **Pristine upstream plus patch files**: rejected. Patches over prose break on every rewording.
- **Loading repo Skills, opt-in per Project**: rejected for v1. Repo Skills could dilute or subvert the Workflow's Stages and gates, and they cost tokens the per-Stage Skill sets are meant to control.

## Consequences

- Upstream improvements are not pulled in; porting one is a manual rewrite.
- Skill ids are namespaced by the built-in Workflow Plugin, not by Matt Pocock's name, so the adapted Skills are never presented as the official plugin.
- The Engine must not auto-load user-level or repo-level Skills; only the Skills the harness passes for the current Stage reach a Run.
