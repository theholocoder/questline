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

**Agent Memory**:
Persistent notes the agent keeps about a Project across Sessions, which the user can view and edit.
_Avoid_: Context, knowledge base
_UI label_: Grimoire

**Plugin**:
A package that extends or replaces any part of Questline: Stages, prompts, skills, tools, Engines, or UI regions. Core behavior ships as built-in Plugins too.
_Avoid_: Extension, addon, module

**Engine**:
The pluggable agent backend that runs the model and its tool loop for a Session.
_Avoid_: Provider, runtime, backend

**Run**:
One Engine context inside a Session: the unit that gets compacted and whose context usage is gauged. A Stage has one or more Runs; a subagent is a child Run of the Run that spawned it. Clearing a Run ends it and starts a fresh Run in the same Stage; the ended Run stays readable.
_Avoid_: Chat, conversation, thread

**Model Profile**:
A named model configuration (provider, model, parameters) that the user defines in the app. Each Stage is assigned one, and a child Run may name a different one; one Model Profile is the default.
_Avoid_: Model, preset

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
