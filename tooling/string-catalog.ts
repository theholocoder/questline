/**
 * Keeps domain terms and UI labels apart (CONTEXT.md): UI labels live only in the string catalog,
 * and the catalog never shows a domain term that has a UI label.
 */
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
    const shown = hidden.find(({ term }) => new RegExp(`\\b${term}(s|es)?\\b`, 'i').test(text));
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

/** UI labels written in a source file: anywhere in a stylesheet or Markdown; in strings, JSX text, identifiers or comments of code. */
export function findLabelLeaks(file: string, source: string, labels: string[]): string[] {
  if (!/\.tsx?$/.test(file)) {
    return source.split('\n').flatMap((line, i) => {
      const label = labelIn(line, labels, false);
      return label ? [`${file}:${i + 1} "${line.trim()}" uses the UI label "${label}"`] : [];
    });
  }

  const sourceFile = parse(file, source);
  const found: { pos: number; text: string; label: string }[] = [];
  const comments = new Map<number, string>();

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
    if (text && label) found.push({ pos: node.getStart(sourceFile), text, label });

    for (const range of ts.getLeadingCommentRanges(source, node.getFullStart()) ?? []) {
      comments.set(range.pos, source.slice(range.pos, range.end));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  visit(sourceFile.endOfFileToken);

  for (const [pos, comment] of comments) {
    const label = labelIn(comment, labels, false);
    if (label) found.push({ pos, text: comment, label });
  }
  return found
    .sort((a, b) => a.pos - b.pos)
    .map(({ pos, text, label }) => `${file}:${lineOf(sourceFile, pos)} "${text}" uses the UI label "${label}"`);
}

const onScreenAttributes = new Set(['aria-label', 'title', 'placeholder', 'alt']);

/** On-screen text written straight into JSX rather than read from the string catalog. */
export function findHardCodedText(file: string, source: string): string[] {
  const sourceFile = parse(file, source);
  const found: string[] = [];

  const visit = (node: ts.Node) => {
    let text: string | undefined;
    if (ts.isJsxText(node)) {
      text = node.text.trim();
    } else if (
      ts.isJsxAttribute(node) &&
      onScreenAttributes.has(node.name.getText(sourceFile)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      text = node.initializer.text;
    }
    if (text && /\p{L}/u.test(text)) {
      found.push(
        `${file}:${lineOf(sourceFile, node.getStart(sourceFile))} "${text}" is on-screen text outside the catalog`,
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function parse(file: string, source: string): ts.SourceFile {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
}

function lineOf(sourceFile: ts.SourceFile, pos: number): number {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}
