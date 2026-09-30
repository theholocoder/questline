# Questline

Desktop AI harness that drives coding agents through each Stage of a feature. See `CONTEXT.md` for the domain language and `docs/adr/` for decisions.

## Develop

Requires Node 24 (`.node-version`) and pnpm 10.

```sh
pnpm install
pnpm dev        # open the app
pnpm lint       # eslint + dependency-cruiser package boundaries
pnpm typecheck
pnpm test       # vitest
pnpm build
pnpm e2e        # Playwright smoke test against the built app (run `pnpm build` first)
```

## Layout

- `app/`: the Electron app (main + renderer). Built-in Plugins are reached only through `app/src/plugins/registry.ts`.
- `packages/plugin-api`, `packages/ui`: the public Plugin API and shared UI kit.
- `plugins/core`, `plugins/engine-pi`, `plugins/pocock`: built-in Plugins, using only the public packages.
- `templates/plugin`: the Plugin template, built in CI so API breaks fail the build.
