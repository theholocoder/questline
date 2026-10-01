/**
 * Keeps domain terms and UI labels apart (CONTEXT.md): UI labels live only in the string catalog,
 * and the catalog never shows a domain term that has a UI label.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

export interface GlossaryTerm {
  term: string;
  label?: string;
  /** The label replaces the term only in some places (e.g. "Level, on the XP Bar only"), so the term may still be shown. */
  restricted?: boolean;
}

export const catalogFile = 'packages/ui/src/strings.ts';

export function parseGlossary(markdown: string): GlossaryTerm[] {
  const terms: GlossaryTerm[] = [];
  for (const line of markdown.split('\n')) {
    const term = /^\*\*(.+)\*\*:$/.exec(line)?.[1];
    if (term) terms.push({ term });

    const label = /^_UI label_: ([^,]+)(,.*)?$/.exec(line);
    const current = terms.at(-1);
    if (label?.[1] && current) {
      current.label = label[1].trim();
      current.restricted = label[2] !== undefined;
    }
  }
  return terms;
}

export function termKey(term: string): string {
  return term
    .split(' ')
    .map((word, i) => (i === 0 ? word.toLowerCase() : word))
    .join('');
}

/** Every string in a nested catalog, keyed by its dotted path. */
export function catalogEntries(catalog: object, prefix = ''): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]): [string, string][] => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') return [[path, value]];
    return value && typeof value === 'object' ? catalogEntries(value as object, path) : [];
  });
}

export function findDomainTermsShown(entries: [string, string][], glossary: GlossaryTerm[]): string[] {
  const hidden = glossary.filter(({ label, restricted }) => label && !restricted);
  return entries.flatMap(([path, text]) => {
    const shown = hidden.find(({ term }) => new RegExp(`\\b${term}(s|es)?\\b`).test(text));
    return shown ? [`${path}: "${text}" shows the domain term "${shown.term}"`] : [];
  });
}

/** Splits `useQuestLog` into "use Quest Log" so labels match identifiers word by word. */
function identifierWords(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

function labelIn(text: string, labels: string[], ignoreCase: boolean): string | undefined {
  return [...labels]
    .sort((a, b) => b.length - a.length)
    .find((label) => new RegExp(`\\b${label}s?\\b`, ignoreCase ? 'i' : '').test(text));
}

/** UI labels written in a source file: in strings, JSX text or identifiers, never in comments. */
export function findLabelLeaks(file: string, source: string, labels: string[]): string[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const leaks: string[] = [];

  const visit = (node: ts.Node) => {
    let text: string | undefined;
    let label: string | undefined;
    if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node) || ts.isJsxText(node)) {
      text = node.text.trim();
      label = labelIn(text, labels, false);
    } else if (ts.isIdentifier(node)) {
      text = node.text;
      label = labelIn(identifierWords(text), labels, true);
    }
    if (text && label) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      leaks.push(`${file}:${line} "${text}" uses the UI label "${label}"`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return leaks;
}

const sourceRoots = ['app/src', 'packages', 'plugins', 'templates'];
const skippedDirs = new Set(['node_modules', 'out', 'dist', 'tests', 'e2e']);

/** Source files, relative to the repo root, that may not hold UI labels: all but the catalog and tests. */
export function sourceFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (!skippedDirs.has(entry)) walk(path);
      } else if (/\.tsx?$/.test(entry) && !entry.endsWith('.d.ts')) {
        files.push(relative(root, path));
      }
    }
  };
  sourceRoots.forEach((dir) => walk(join(root, dir)));
  return files.filter((file) => file !== catalogFile).sort();
}
