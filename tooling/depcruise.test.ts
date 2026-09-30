import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const fixture = join(import.meta.dirname, 'depcruise-fixture');
const config = join(root, '.dependency-cruiser.cjs');
const bin = join(root, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruiser.mjs');

interface CruiseResult {
  modules: { source: string; dependencies: { module: string; resolved: string }[] }[];
  summary: { violations: { from: string; to: string; rule: { name: string } }[] };
}

function cruise(cwd: string, dirs: string[], outputType: 'err' | 'json') {
  const args = [bin, ...dirs, '--config', config, '--output-type', outputType];
  return spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
}

function cruiseFixture(outputType: 'err' | 'json') {
  return cruise(fixture, ['app', 'packages', 'plugins'], outputType);
}

describe('package boundaries', () => {
  it('fails lint on a deliberate violation', () => {
    expect(cruiseFixture('err').status).not.toBe(0);
  });

  it('reports each boundary break and allows the registry', () => {
    const result = JSON.parse(cruiseFixture('json').stdout) as CruiseResult;
    const violations = result.summary.violations.map(({ rule, from, to }) =>
      `${rule.name}: ${from} -> ${to.replace(/^.*\/node_modules\//, '')}`,
    );

    expect(violations.sort()).toEqual(
      [
        'app-imports-plugin-outside-registry: app/src/main/index.ts -> plugins/engine-pi/src/index.ts',
        'package-imports-app-or-plugin: packages/ui/src/index.ts -> plugins/engine-pi/src/index.ts',
        'plugin-imports-app: plugins/core/src/index.ts -> app/src/main/index.ts',
        'plugin-imports-electron: plugins/core/src/index.ts -> electron',
        'plugin-imports-other-plugin: plugins/core/src/index.ts -> plugins/engine-pi/src/index.ts',
        'plugin-imports-private-package: plugins/core/src/index.ts -> packages/secret/src/index.ts',
        'not-to-unresolvable: plugins/core/src/index.ts -> electron',
        'undeclared-dependency: plugins/core/src/index.ts -> vitest/dist/index.d.ts',
      ].sort(),
    );
  });

  // The rules match source paths, so they only bite if workspace package names resolve to them.
  it('resolves built-in Plugins imported by name to their source folders', () => {
    const result = JSON.parse(cruise(root, ['app/src/plugins'], 'json').stdout) as CruiseResult;
    const registry = result.modules.find((module) => module.source === 'app/src/plugins/registry.ts');

    expect(registry?.dependencies.map(({ module, resolved }) => `${module} -> ${resolved}`).sort()).toEqual([
      '@questline/plugin-api -> packages/plugin-api/src/index.ts',
      '@questline/plugin-core -> plugins/core/src/index.ts',
      '@questline/plugin-engine-pi -> plugins/engine-pi/src/index.ts',
      '@questline/plugin-pocock -> plugins/pocock/src/index.ts',
    ]);
  });
});
