# How plugin-based desktop apps structure their plugins

Research for [#3](https://github.com/theholocoder/questline/issues/3) (child of map #1). It surveys prior art so the Questline Plugin architecture decision can be made with the facts in hand. It does not make that decision.

Researched 2026-09-29 against official docs and source code. Systems covered:

- **VS Code**: an Electron app with a runtime-installed extension API.
- **Obsidian**: an Electron app whose plugins run in the renderer.
- **Eclipse Theia**: an IDE framework with compile-time DI extensions plus VS Code-compatible runtime plugins.
- **Backstage (new frontend system)**: a React app assembled entirely from an extension tree.
- **Grafana**: React plugins that share a host React instance, with `usePlugin*` hooks over named extension points.
- **Joplin, Logseq, Raycast**: supporting examples of process, iframe and worker isolation.

Terms follow `CONTEXT.md`: Plugin, Stage, Skill, Engine.

---

## 1. Main-process code vs renderer UI

| System | Where plugin "logic" runs | Where plugin UI runs | Bridge |
|---|---|---|---|
| VS Code | A separate **extension host** process. In the Electron build it is started from main as an Electron `UtilityProcess` ([extensionHostStarter.ts](https://github.com/microsoft/vscode/blob/main/src/vs/platform/extensions/electron-main/extensionHostStarter.ts)). The host can be local Node, a web WebWorker, or remote Node ([Extension Host](https://code.visualstudio.com/api/advanced-topics/extension-host)) | Extensions cannot touch the workbench DOM. The extension host is designed to prevent extensions from "Modifying the UI" (same doc). UI is either declarative (contribution points) or a **webview** iframe | RPC between the extension host and the workbench. Webviews use `postMessage` / `acquireVsCodeApi()` ([Webview guide](https://code.visualstudio.com/api/extension-guides/webview)) |
| Obsidian | The renderer. `main.js` runs in the app window, and desktop plugins may use Node/Electron APIs. The manifest flag `isDesktopOnly` exists "because it uses NodeJS or Electron APIs" ([Manifest](https://docs.obsidian.md/Reference/Manifest)) | Same renderer, with direct DOM access (`ItemView.contentEl`) | None. Everything is in-process |
| Theia (extensions) | The `package.json` field `theiaExtensions` declares separate `frontend`, `backend` and `electronMain` entry modules. Each exports an InversifyJS `ContainerModule` ([Authoring extensions](https://theia-ide.org/docs/authoring_extensions/)) | The frontend module, running in the browser/renderer | JSON-RPC services between frontend and backend (Theia's own mechanism) |
| Theia (plugins) | A VS Code-compatible plugin host. Theia plugins "can directly contribute to the frontend while VS Code extensions are restricted to the backend" ([Extensions overview](https://theia-ide.org/docs/extensions/)) | Frontend | RPC |
| Grafana | Backend plugins run as a **subprocess** over gRPC (HashiCorp go-plugin) ([Backend plugins](https://grafana.com/developers/plugin-tools/key-concepts/backend-plugins/)) | The frontend `module.js` is loaded into the host page by SystemJS | gRPC via the Grafana server |
| Joplin | Each plugin script runs in its own hidden BrowserWindow (desktop) so that "if a plugin freezes or crashes, it doesn't bring down the app" ([plugin spec](https://github.com/laurent22/joplin/blob/dev/readme/dev/spec/plugins.md)) | Webview panels | An IPC proxy that serialises API calls. Callbacks are replaced by string event IDs |
| Raycast | One Node child process for all extensions, with **each extension in its own worker thread** ([blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)) | Native UI. A custom React reconciler emits a JSON render tree and JSON Patch diffs | JSON-RPC over file-descriptor streams |

**Pattern.** A plugin package usually declares *several entry points by target*: Theia's `frontend` / `backend` / `electronMain`, and VS Code's single `main` plus `browser` for web. The host then loads each entry into the matching process. The more isolated designs (VS Code, Joplin, Raycast) keep plugin logic out of the UI process and send UI changes across a serialised boundary. Obsidian and Theia extensions load plugin code straight into the UI process instead, trading safety for full access.

## 2. UI contribution points and slots

The systems use three distinct styles:

1. **Declarative manifest contributions (VS Code).** Contributions are declared in `package.json` under `contributes` ([Contribution Points](https://code.visualstudio.com/api/references/contribution-points)). Examples are `commands`, `menus`, `keybindings`, `configuration`, `views` and `viewsContainers`, and newer ones include `chatAgents` and `chatInstructions`. `viewsContainers` targets fixed locations (`activitybar`, `panel`). `views` go into `explorer`, `scm`, `debug`, `test` or a custom container. Visibility is controlled by `when` clauses over context keys, which extensions can set with the `setContext` command ([when clauses](https://code.visualstudio.com/api/references/when-clause-contexts)). Because the host knows contributions before it runs any code, activation is lazy: since 1.74, contributed commands and views activate their extension implicitly ([Activation events](https://code.visualstudio.com/api/references/activation-events)).
2. **Imperative registration at load time.**
   - *Obsidian*: `Plugin.onload()` calls `addCommand`, `addRibbonIcon`, `addStatusBarItem`, `addSettingTab`, `registerView`, `registerEditorExtension` and similar methods. Every registration is torn down automatically on unload ([Plugin API](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)). A view is placed with `workspace.getLeftLeaf()` / `getRightLeaf()` / `getLeaf()` and then `setViewState()` ([Views](https://docs.obsidian.md/Plugins/User+interface/Views)).
   - *Theia*: contribution interfaces (`CommandContribution`, `MenuContribution`, `FrontendApplicationContribution`, …) are bound in DI and collected via `bindContributionProvider` ([Services & contributions](https://theia-ide.org/docs/services_and_contributions/)). Widgets go into named shell areas: `'main' | 'top' | 'left' | 'right' | 'bottom' | 'secondaryWindow'` ([application-shell.ts](https://github.com/eclipse-theia/theia/blob/master/packages/core/src/browser/shell/application-shell.ts)).
3. **Named, typed slots with a data flow (Backstage, Grafana, Logseq).**
   - *Backstage*: every extension has an `id` and an `attachTo: { id, input }` pointing at a parent extension's named **input**. The app is a tree of these, and data between them is typed through "extension data references" ([Extensions](https://backstage.io/docs/frontend-system/architecture/extensions)). The app shell itself (`app/root`, `app/layout`, nav, routes) is made of built-in extensions ([App](https://backstage.io/docs/frontend-system/architecture/app)).
   - *Grafana*: **extension point IDs** are versioned strings such as `grafana/dashboard/panel/menu/v1` or `<plugin-id>/<feature>/v1`, so plugins can define their own points. Plugins register into them with `addComponent`, `addLink`, `addFunction` and `exposeComponent` ([UI extensions](https://grafana.com/developers/plugin-tools/reference/ui-extensions-reference/ui-extensions)).
   - *Logseq*: `provideUI({ key, slot | path, template })` injects UI into host-defined slots ([LSPlugin.ts](https://github.com/logseq/logseq/blob/master/libs/src/LSPlugin.ts)).

## 3. Exposing a React hooks API to plugins

- **Grafana** is the closest match to "useXXX for plugins". The host renders slots with `usePluginComponents({ extensionPointId })`, `usePluginLinks({ extensionPointId, context })`, `usePluginFunctions(...)` and `usePluginComponent(id)`, all from `@grafana/runtime`. These return `{ components, isLoading }` ([UI extensions](https://grafana.com/developers/plugin-tools/reference/ui-extensions-reference/ui-extensions)). Plugins get `@grafana/ui` components as well. **Sharing React:** plugins externalise `react`, `@grafana/ui`, `@grafana/runtime` and similar packages, and SystemJS resolves them against the host's import map. The result is that "Grafana shares a single React instance with all loaded plugins", and plugins inherit the host's package versions at runtime ([NPM dependencies](https://grafana.com/developers/plugin-tools/key-concepts/npm-dependencies)). That makes host upgrades breaking for plugins, and Grafana publishes migration notes such as its React 19 post.
- **Backstage** uses a typed service locator plus a hook. `createApiRef<T>({ id })` defines a contract, and `ApiBlueprint.make({ params: { api, deps, factory } })` provides an implementation ([Creating APIs](https://backstage.io/docs/frontend-system/utility-apis/creating)). Components call `useApi(ref)`, which throws if the API is missing, or `useApiHolder().get(ref)` for optional APIs ([Consuming APIs](https://github.com/backstage/backstage/blob/master/docs/frontend-system/utility-apis/03-consuming.md)). Core services such as config, storage and discovery use the same mechanism as plugin services. Backstage plugins are compile-time npm dependencies of the app, so React is shared by the bundler.
- **Obsidian** has no host React. The React guide has each plugin bundle its own `react`/`react-dom`, call `createRoot(this.contentEl)` inside an `ItemView`, and build its own `AppContext` + `useApp()` hook ([Use React](https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin)). The result is one React copy per plugin and no shared components.
- **Theia** provides `ReactWidget`, a Lumino widget that owns a `createRoot(this.node)` and calls an abstract `render()` ([react-widget.tsx](https://github.com/eclipse-theia/theia/blob/master/packages/core/src/browser/widgets/react-widget.tsx)). Services come from DI injection, not hooks.
- **VS Code** has no React API. Webview UIs are standalone pages that talk to the extension only through `postMessage`.
- **Raycast** lets plugins write React against host components (`@raycast/api`), but rendering happens out of process through a custom reconciler ([blog](https://www.raycast.com/blog/how-raycast-api-extensions-work)). This shows a hooks/JSX API can coexist with process isolation, at the cost of a fixed component vocabulary.

## 4. Built-in features implemented as plugins

- **VS Code** ships more than 100 built-in extensions in the repo's [`extensions/`](https://github.com/microsoft/vscode/tree/main/extensions) folder, including git, markdown and TypeScript language features. They use the same manifest and API as third-party extensions. The core workbench (editor, layout) is *not* an extension. It uses internal registries.
- **Theia** says it is "fully built using Theia extensions in a modular way" ([Extensions overview](https://theia-ide.org/docs/extensions/)). Everything is a DI module.
- **Backstage** builds the app root, layout, nav, routing and core utility APIs as built-in extensions in the same tree as plugin extensions ([App](https://backstage.io/docs/frontend-system/architecture/app)).
- **Obsidian** has "core plugins" (Backlinks, Canvas, Daily notes, Graph, Search, Sync, Templates, …) that can be toggled in settings ([Core plugins](https://obsidian.md/help/Plugins/Core+plugins)). The docs do **not** say whether they use the public API.

## 5. Override and precedence rules

- **VS Code** ([`dedupExtensions`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/extensionsUtil.ts)) resolves extensions by identifier (`publisher.name`) in the order *system → user → workspace → development*:
  - A user extension replaces a built-in one **only if its semver is strictly greater**. Otherwise it is skipped with a warning, and the replacement inherits `isBuiltin`.
  - Workspace extensions overwrite anything.
  - An extension under development always wins.
  - Overriding is **whole-extension**. There is no per-contribution override.
- **Backstage**: "For each frontend app instance there can only be a single extension for any given ID." A new extension with the same kind, namespace and name, or one made with `ext.override(...)`, "will take precedence" when installed next to the original ([Extension overrides](https://backstage.io/docs/frontend-system/architecture/extension-overrides)). Overrides are installed via `plugin.withOverrides(...)`. On top of that, `app-config.yaml` `app.extensions` can enable or disable any extension, re-`attachTo` it elsewhere, or pass `config`, all without code ([Configuring extensions](https://backstage.io/docs/frontend-system/building-apps/configuring-extensions)). Frontend modules can take an `if` predicate (feature flags or permissions). Overriding is **per-extension** (fine-grained).
- **Theia**: `rebind(ServiceSymbol).to(MyImpl)` replaces any DI-bound service, either by subclassing the default or with a fresh implementation ([Services & contributions](https://theia-ide.org/docs/services_and_contributions/)). This is the most powerful model, and it gives no stability guarantees.
- **Grafana**: slots are additive. Many plugins contribute to one extension point, and consumers can cap each plugin with `limitPerPlugin`. Replacement is not the model.
- **Obsidian**: no override mechanism. A community plugin can only monkey-patch, or the user disables the core plugin.

## 6. Isolation and security of local plugins

Every mainstream system surveyed gives installed plugins **full user-level privileges** and relies on *consent* rather than a sandbox:

- **VS Code**: "The extension host has the same permissions as VS Code itself" ([Extension runtime security](https://code.visualstudio.com/docs/configure/extensions/extension-runtime-security)). Workspace Trust / Restricted Mode only *disables* extensions that declare `capabilities.untrustedWorkspaces: false | 'limited'` for untrusted folders ([Workspace Trust](https://code.visualstudio.com/api/extension-guides/workspace-trust)). Marketplace scanning in a "clean room VM" happens before publishing, not at runtime. Process isolation protects UI responsiveness and stability, not security.
- **Obsidian**: runs in Restricted Mode by default. The docs say "Obsidian cannot reliably restrict plugins to specific permissions", and warn that plugins can access files and the network and can install programs ([Plugin security](https://obsidian.md/help/Extending+Obsidian/Plugin+security)). Local folders under `.obsidian/plugins/<id>/` (`manifest.json`, `main.js`, `styles.css`) are loaded once the user turns on community plugins and toggles each plugin ([Build a plugin](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)).
- **Stronger isolation exists but costs API surface**:
  - Joplin: a BrowserWindow per plugin plus an IPC proxy.
  - Logseq: a Postmate iframe sandbox, or shadow DOM, for plugin UI ([LSPlugin.caller.ts](https://github.com/logseq/logseq/blob/master/libs/src/LSPlugin.caller.ts)).
  - Raycast: a worker thread per extension, killed if greedy.
  - VS Code webviews: iframes with CSP and `localResourceRoots`.
  - Grafana backend plugins: subprocesses.
- **Electron's own checklist** for third-party code: enable `contextIsolation` and `sandbox`, never enable `nodeIntegration` for untrusted content, validate IPC `sender`, and never expose raw `ipcRenderer` ([Electron security](https://www.electronjs.org/docs/latest/tutorial/security)). `utilityProcess` is Electron's supported way to run Node services outside main, with `MessagePort`s. It also has an option aimed at "third-party or otherwise untrusted code" (macOS TCC disclaim) ([utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process)).

## 7. Plugin-owned storage

- **VS Code** passes storage in `ExtensionContext` at activation ([Common capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities)):
  - `workspaceState` and `globalState`: key/value stores.
  - `storageUri` and `globalStorageUri`: private directories per workspace and global.
  - `secrets`: an encrypted store that is not synced.

  All are scoped to the extension by the host.
- **Obsidian**: `loadData()` / `saveData()` persist a single `data.json` in the plugin's folder, and `onExternalSettingsChange()` fires when that file changes on disk ([Plugin API](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)).
- **Backstage**: `StorageApi` (`storageApiRef`, id `core.storage`) offers `forBucket(name)` for namespaced buckets, `set`, `remove`, a synchronous `snapshot(key)` and a reactive `observe$(key)` ([StorageApi.ts](https://github.com/backstage/backstage/blob/master/packages/frontend-plugin-api/src/apis/definitions/StorageApi.ts)). Because storage is itself a utility API, an app can swap the backend.
- **Raycast**: `LocalStorage` is per-extension and encrypted, and "Extensions can not access the storage of other extensions". It is meant for small data. Large data goes through Node file APIs ([Storage](https://developers.raycast.com/api-reference/storage)).
- **Logseq**: `logseq.FileStorage` plus `useSettingsSchema(...)`, which gives declarative settings with host-rendered UI ([LSPlugin.ts](https://github.com/logseq/logseq/blob/master/libs/src/LSPlugin.ts)).

Common shape: the host hands each plugin a **pre-scoped** handle for key/value data, a private directory and secrets, keyed by plugin ID. Settings are often declared as a schema so the host can render the settings UI.

---

## Patterns worth stealing

These are facts and trade-offs, not a decision.

1. **Per-target entry points in one package** (Theia's `frontend` / `backend` / `electronMain`). This maps directly onto an Electron main or utility process for Engines and tools, and the renderer for UI. *Trade-off:* two module graphs per plugin and a typed RPC contract between them.
2. **Stable IDs everywhere, with override-by-ID** (Backstage). Every Stage, Skill, prompt, tool, Engine and UI region gets an ID of the form `kind:plugin/name`, and "same ID wins by precedence" gives fine-grained replacement of built-ins. VS Code's precedence is whole-plugin and semver-gated, which is coarser. *Trade-off:* the precedence order must be explicit, for example built-in < user < project < dev, and conflicts between two non-built-in plugins need a rule or an error.
3. **Declarative manifest plus lazy code** (VS Code `contributes` + activation events). The host can draw the shell, the XP Bar Stages and menus before running plugin code. *Trade-off:* a schema to maintain, and dynamic contributions still need an imperative path.
4. **Versioned, string-named slots consumed with hooks** (Grafana's `grafana/<feature>/<location>/v1` + `usePluginComponents`, Backstage `attachTo` inputs). This is the most direct precedent for a `useXXX` React API with sidebar and main-content regions. *Trade-off:* slots are additive by default, so replacement needs a separate "single-occupant" slot kind or ID override.
5. **A typed service locator with a hook** (Backstage `createApiRef` / `useApi` / `ApiBlueprint` with `deps`). Core services (storage, config, Engine access) and plugin services share one mechanism, and apps can swap implementations. *Trade-off:* it is DI by another name, and resolution order and cycles need handling.
6. **Host-provided singleton React and UI kit** (Grafana's SystemJS import map). Plugins externalise `react` and the shared component library, which avoids duplicate-React hook bugs. *Trade-off:* plugins are pinned to the host's React version, so host upgrades break them (acceptable while v1's API is unstable). The Obsidian alternative, where each plugin bundles its own React, isolates versions but gives no shared components or context.
7. **Honest security posture.** VS Code and Obsidian both concede that in-process plugins cannot be sandboxed, and rely on explicit enable/trust toggles. Real isolation (Joplin windows, Logseq iframes, Raycast workers) means a serialised API with no shared React tree. A middle path in Electron: keep the renderer at `contextIsolation` + `sandbox` and run plugin backend code in `utilityProcess`es behind a narrow API. *Trade-off:* renderer UI code would still be trusted in-process code.
8. **Pre-scoped storage handles** (VS Code `ExtensionContext`, Backstage `forBucket`, Raycast per-extension `LocalStorage`). Separate key/value data, files and secrets per plugin ID, plus a settings schema the host renders.
9. **Unload hygiene** (Obsidian's `register*` methods auto-dispose, VS Code's `Disposable`s, Theia's `toDispose`). This lets local-folder plugins hot-reload during development.
