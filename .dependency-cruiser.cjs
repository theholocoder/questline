/**
 * Package boundaries (ADR 0001): built-in Plugins may only use the public Plugin API,
 * so the API is proven sufficient for a colleague's Plugin.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'plugin-imports-app',
      comment: 'Plugins reach the app only through @questline/plugin-api.',
      severity: 'error',
      from: { path: '^(plugins|templates)/' },
      to: { path: '^app/' },
    },
    {
      name: 'plugin-imports-other-plugin',
      comment: "A Plugin never imports another Plugin's internals.",
      severity: 'error',
      from: { path: '^(plugins/[^/]+|templates/[^/]+)/' },
      to: { path: '^(plugins|templates)/', pathNot: '^$1/' },
    },
    {
      name: 'plugin-imports-private-package',
      comment: 'Of the workspace packages, Plugins may only use @questline/plugin-api and @questline/ui.',
      severity: 'error',
      from: { path: '^(plugins|templates)/' },
      to: { path: '^packages/', pathNot: '^packages/(plugin-api|ui)/' },
    },
    {
      name: 'plugin-imports-electron',
      comment: 'Plugins never touch Electron directly; the app owns it.',
      severity: 'error',
      from: { path: '^(plugins|templates)/' },
      to: { path: '(^|/node_modules/)electron(/|$)' },
    },
    {
      name: 'package-imports-app-or-plugin',
      comment: 'Shared packages sit below the app and the Plugins.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^(app|plugins|templates)/' },
    },
    {
      name: 'app-imports-plugin-outside-registry',
      comment: 'The app reaches built-in Plugins through one registry module.',
      severity: 'error',
      from: { path: '^app/', pathNot: '^app/src/plugins/registry\\.ts$' },
      to: { path: '^(plugins|templates)/' },
    },
    {
      name: 'undeclared-dependency',
      comment: "A module may only import npm packages declared in its own package.json.",
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^(app|packages/[^/]+|plugins/[^/]+|templates/[^/]+)/(out|dist)/' },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.d.ts'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
