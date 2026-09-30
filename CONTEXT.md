# Questline

A desktop AI harness for developers who follow Matt Pocock's skills workflow. It drives coding agents through each stage of a feature, from grilling to code review, using TTRPG wording and styling.

## Language

Terms below are the domain language, used in code, prompts, and docs. A term's _UI label_, when it has one, is the themed name shown on screen only; never use a UI label outside the UI.

**Project**:
One code folder on disk that Questline manages. Listed in the sidebar.
_Avoid_: Repo, workspace

**Session**:
One unit of work inside a Project, usually a single feature or fix, carried through the workflow stages.
_Avoid_: Conversation, thread, chat

**Complete**:
The successful end of a Session, confirmed by the user from Review: its changes become one commit on the Session branch, and the Session is archived.
_Avoid_: Finish, done, merge

**Abandon**:
Ending a Session from any Stage without Completing it: its open Quests are closed as abandoned, and the Session is archived.
_Avoid_: Cancel, discard, close

**Archived Session**:
A Session that has been Completed or Abandoned: read-only, with no worktree left, its branch kept. Only an Archived Session can be deleted; deleting it removes its Runs, Findings and Quests for good, but never its Agent Memory or usage stats.
_Avoid_: Closed session, finished session, history

**Stage**:
One step of the Workflow a Session goes through, for example Plan, Implement, or Review.
_Avoid_: Phase, status
_UI label_: Level, on the XP Bar only

**Workflow**:
An ordered set of Stages and the gates between them, contributed by a Plugin. Each Session follows one Workflow, picked when the Session is created and fixed from then on; a default one is preselected, and the user can pick another (for example a hotfix or retro Workflow a colleague added).
_Avoid_: Pipeline, process, flow

**Project setup**:
The one-time step when a Project is added to Questline, recording the per-Project choices the Skills rely on.
_Avoid_: Onboarding, init

**XP Bar**:
The per-Session display of Stages, where each completed Stage is a level gained. The harness gates moving from one Stage to the next.
_Avoid_: Stepper, progress bar

**Quest Log**:
The harness-internal board of Quests, one per Project and filterable by Session, that the agent uses to orchestrate work and the user uses to follow it. It knows nothing about any Workflow: a Workflow gives Quests meaning through tags. It is separate from the Project's user-facing issue tracker (GitHub or GitLab), which Questline does not replace.
_Avoid_: Kanban, board, backlog

**Quest**:
One item in the Quest Log: a unit of work the agent orchestrates and the user follows. It is either open or closed, and its tags place it in a column. A Quest can have child Quests and can be blocked by other Quests in the same Project.
_Avoid_: Ticket, issue, task, card

**Spec**:
The Quest that holds a Session's task context, written during the Plan Stage and marked as a Spec by the default Workflow's tags; the Session's tickets are its child Quests. Every Session that leaves Plan has exactly one Spec and at least one ticket.
_Avoid_: PRD, plan, epic
_UI label_: Main Quest

**Ticket**:
A child Quest of a Session's Spec: one slice of the feature, cut during Plan and worked in its own Run during Implement. A Ticket can be taken once every Quest blocking it is closed.
_Avoid_: Task, issue, card
_UI label_: Objective

**Finding**:
One problem raised about a Session's changes during Review, by the agent or the user, optionally pinned to a place in the diff. The user accepts it, which turns it into a new Ticket, or dismisses it. A Finding is not a Quest until it is accepted.
_Avoid_: Comment, issue, remark

**Agent Memory**:
The general principles the agent keeps about a Project across Sessions, as titled entries: how to work in this Project, not facts about any one task. Every Run sees the titles and reads an entry's content on demand. The agent adds entries as it works, and the user manages them in the Grimoire.
_Avoid_: Context, knowledge base, notes
_UI label_: Grimoire

**Memory Entry**:
One item of Agent Memory: a short title and its content, stating one principle. It belongs to the Project, not to the Session it was written in. Entries the agent writes may wait for the user's review before any Run can see them.
_Avoid_: Note, fact, memory

**Plugin**:
A package that extends or replaces any part of Questline: Stages, prompts, skills, tools, Engines, or UI regions. Core behavior ships as built-in Plugins too.
_Avoid_: Extension, addon, module

**Engine**:
The pluggable agent backend that runs the model and its tool loop for a Session.
_Avoid_: Runtime, backend; "provider" (that is a Provider, the model API an Engine calls)

**Run**:
One Engine context inside a Session: the unit that gets compacted and whose context usage is gauged. A Stage has one or more Runs; a subagent is a child Run of the Run that spawned it. Clearing a Run ends it and starts a fresh Run in the same Stage; the ended Run stays readable.
_Avoid_: Chat, conversation, thread

**Model Profile**:
A named model configuration (Provider, model, parameters) that the user defines in the app. Each Stage is assigned one, and a child Run may name a different one; one Model Profile is the default.
_Avoid_: Model, preset

**Provider**:
A model API that a Model Profile points at: either built into the Engine, or added by the user (for example a gateway) with its address and models. Authenticated only through environment variables; Questline never stores a secret.
_Avoid_: Vendor, endpoint, backend

**Executor**:
Where a Run's shell commands execute: directly on the host, or inside a sandbox. Contributed by a Plugin; each Project uses one.
_Avoid_: Runtime, container, backend

**Approval Profile**:
What a Stage's Runs may read, write, run and reach without asking the user. Declared by the Workflow Plugin per Stage; a child Run inherits its parent's.
_Avoid_: Permissions, policy, mode
_UI label_: Permissions

**Skill**:
A packaged set of agent instructions for one workflow step (for example `/grill-with-docs`), bundled by a Plugin and overridable by another Plugin. Each Stage makes a chosen set of Skills available; a Skill outside that set cannot be used in the Stage.
_Avoid_: Command, prompt
