# The app is built from trusted, in-process Plugins

Questline is a small core plus Plugins, and the built-in ones (the default Workflow included) may only use the public Plugin API, enforced by package boundary and lint, so the API is proven sufficient for a colleague's Plugin. Plugins are trusted: a Plugin's main half runs inside Electron main and its renderer half in the renderer, with full privileges and a consent prompt on first load of a user Plugin, rather than in an isolated extension host.

## Considered Options

- **Extension host in a `utilityProcess` (VS Code)**: rejected. The Engine (pi) runs in-process in main and calls Plugin tool handlers directly; a host process would put a serialised RPC hop on every tool call and make Engine Plugins impractical. The audience is the author and a few colleagues loading local folders, so isolation buys little.
- **Worker/iframe sandbox**: rejected for the same reasons, plus it would forbid sharing one React and UI kit with the renderer.

## Consequences

- A user Plugin can do anything the app can; the consent prompt is the only gate. No sandbox is claimed.
- Revisiting this (for example for a marketplace) means introducing a serialised API boundary, which the per-Plugin RPC and read hooks are shaped to allow.
