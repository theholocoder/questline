# Tickets run one at a time in the Session worktree, with one commit at Complete

In v1, the Implement loop runs a Session's Tickets one at a time, each in a fresh Run, all in the Session's own worktree. Nothing is committed during Implement. When the user confirms Review, the harness makes a single commit on the Session branch, with a title and message the user can edit. Running Tickets in parallel (one worktree per Ticket, merged back into the Session branch, as Pocock's `implement-spec` does) would need Questline to rebase and resolve conflicts between Tickets cut from the same base. That is too much machinery for v1. Parallel work is still possible one level up: Sessions in the same Project each have their own branch and worktree and run side by side.

## Considered Options

- **One worktree per Ticket, merged back**: rejected for v1. Merge order, rebases and conflict handling land in the harness, and the gain is limited to a single Session's Tickets.
- **Commit per Ticket**: rejected. The user wants one reviewed commit per Session. Each Ticket's review is instead scoped by a hidden git tree snapshot taken when the Ticket starts.

## Consequences

- One Ticket Run at a time per Session. A Ticket that fails twice halts the loop, because the next Ticket would start on top of its half-done changes.
- A Session has a base branch, chosen at creation. Keeping it up to date is the user's job; Questline never rebases.
- Adding parallel Tickets later means adding worktree, merge and conflict handling, and dropping the snapshot-based review scoping.
