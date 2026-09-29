# Storage is split into independently swappable stores

v1 keeps everything in one local SQLite file (`<userData>/questline.db`, `node:sqlite`). Even so, the storage seam is several **stores**, not one database. Core defines async repository interfaces, implemented with Kysely, and groups them into three stores: **Local** (always SQLite: secrets, settings, Model Profiles, Projects, Sessions, Runs and transcripts, usage stats, Plugin KV), **Quest Log**, and **Agent Memory**. The user must be able to move some parts of the app, first the Quest Log and Agent Memory for team sharing, to a remote Postgres at any point while the rest stays local. So each store has its own connection and its own migrations, and a store is resolved per Project (`stores.questLog(projectId)`).

## Considered Options

- **One database behind one seam**: rejected. Swapping the backend would be all-or-nothing, and Sessions, Runs and transcripts are tied to local worktrees, so they make no sense on a shared server.
- **Drizzle**: rejected. Its schema is dialect-specific, so Postgres would need a second schema. Kysely runs the same queries on SQLite and Postgres.

## Consequences

- No foreign keys, joins or transactions cross a store boundary, even though all three stores share one file in v1. Cross-store references are bare ids (a Quest's Session id may point to a Session on another user's machine).
- Switching a store's backend starts it empty. There is no copy and no sync.
- Postgres-portable schema only: text ids (UUIDv7; Quests use UUIDv4, shown as `Q-<7 hex>` and resolved by a unique prefix of at least 4 chars within the Project), epoch-ms integers, JSON stored as text, and no SQLite-only features.
- Plugins get no tables, only rows in the core Plugin KV table.
