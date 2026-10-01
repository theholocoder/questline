import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const sourceRoots = ['app/src', 'packages', 'plugins', 'templates'];
const skippedDirs = new Set(['node_modules', 'out', 'dist', 'tests', 'e2e']);

/** Shipped source files under every workspace root, relative to the repo root; tests and build output excluded. */
export function sourceFiles(root: string, pattern: RegExp): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (!skippedDirs.has(entry)) walk(path);
      } else if (pattern.test(entry) && !entry.endsWith('.d.ts')) {
        files.push(relative(root, path));
      }
    }
  };
  sourceRoots.forEach((dir) => walk(join(root, dir)));
  return files.sort();
}
