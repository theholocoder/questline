import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

function stylesheets(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return ['node_modules', 'out', 'dist'].includes(entry) ? [] : stylesheets(path);
    return entry.endsWith('.css') ? [path] : [];
  });
}

describe('the theme', () => {
  it('has no animation', () => {
    const animated = ['app/src', 'packages', 'plugins', 'templates']
      .flatMap((dir) => stylesheets(join(root, dir)))
      .filter((file) => {
        const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        return /\b(transition|animation)[\w-]*\s*:|@keyframes/.test(css);
      })
      .map((file) => relative(root, file));

    expect(animated).toEqual([]);
  });
});
