import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const fixture = join(import.meta.dirname, 'depcruise-fixture');
const config = join(import.meta.dirname, '..', '.dependency-cruiser.cjs');
const bin = join(import.meta.dirname, '..', 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruiser.mjs');

function cruiseFixture(outputType: 'err' | 'json') {
  const args = [bin, 'app', 'packages', 'plugins', '--config', config, '--output-type', outputType];
  return spawnSync(process.execPath, args, { cwd: fixture, encoding: 'utf8' });
}

describe('package boundaries', () => {
  it('fails lint on a deliberate violation', () => {
    expect(cruiseFixture('err').status).not.toBe(0);
  });

  it('reports each boundary break and allows the registry', () => {
    const result = JSON.parse(cruiseFixture('json').stdout) as {
      summary: { violations: { from: string; to: string; rule: { name: string } }[] };
    };
    const violations = result.summary.violations.map(({ rule, from, to }) => `${rule.name}: ${from} -> ${to}`);

    expect(violations.sort()).toEqual(
      [
        'app-imports-plugin-outside-registry: app/src/main/index.ts -> plugins/engine-pi/src/index.ts',
        'package-imports-app-or-plugin: packages/ui/src/index.ts -> plugins/engine-pi/src/index.ts',
        'plugin-imports-app: plugins/core/src/index.ts -> app/src/main/index.ts',
        'plugin-imports-electron: plugins/core/src/index.ts -> electron',
        'plugin-imports-other-plugin: plugins/core/src/index.ts -> plugins/engine-pi/src/index.ts',
        'plugin-imports-private-package: plugins/core/src/index.ts -> packages/secret/src/index.ts',
        'not-to-unresolvable: plugins/core/src/index.ts -> electron',
      ].sort(),
    );
  });
});
