import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sourceFiles } from '../source-files';

const root = join(import.meta.dirname, '..', '..');

describe('the theme', () => {
  it('has no animation', () => {
    const animated = sourceFiles(root, /\.css$/).filter((file) => {
      const css = readFileSync(join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      return /\b(transition|animation)[\w-]*\s*:|@keyframes/.test(css);
    });

    expect(animated).toEqual([]);
  });
});
