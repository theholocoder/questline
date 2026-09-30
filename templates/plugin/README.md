# Questline Plugin template

Copy this folder to start a Plugin.

1. Set `id`, `name` and `description` in `plugin.json`.
2. `pnpm install`, then `pnpm build` to write the main and renderer halves to `dist/`.
3. Copy the folder (with `plugin.json` and `dist/`) to `<userData>/plugins/<id>/`.

`react`, `react-dom`, `@questline/plugin-api` and `@questline/ui` are provided by Questline at runtime and stay external in the build.
