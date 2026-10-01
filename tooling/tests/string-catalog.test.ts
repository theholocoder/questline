import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { strings } from '../../packages/ui/src/strings';
import {
  catalogEntries,
  findDomainTermsShown,
  findLabelLeaks,
  parseGlossary,
  sourceFiles,
  termKey,
} from '../string-catalog';

const root = join(import.meta.dirname, '..', '..');
const glossary = parseGlossary(readFileSync(join(root, 'CONTEXT.md'), 'utf8'));

describe('parseGlossary', () => {
  it('reads each term, its UI label and whether the label is restricted', () => {
    const terms = parseGlossary(
      [
        '**Project**:',
        'One code folder.',
        '_Avoid_: Repo',
        '',
        '**Agent Memory**:',
        'Principles.',
        '_UI label_: Grimoire',
        '',
        '**Stage**:',
        'One step.',
        '_UI label_: Level, on the XP Bar only',
      ].join('\n'),
    );

    expect(terms).toEqual([
      { term: 'Project' },
      { term: 'Agent Memory', label: 'Grimoire', restricted: false },
      { term: 'Stage', label: 'Level', restricted: true },
    ]);
  });
});

describe('termKey', () => {
  it('turns a domain term into a camelCase catalog key', () => {
    expect(termKey('Agent Memory')).toBe('agentMemory');
    expect(termKey('Spec')).toBe('spec');
  });
});

describe('findDomainTermsShown', () => {
  it('flags a catalog string naming a term that has a UI label', () => {
    const terms = [
      { term: 'Ticket', label: 'Objective', restricted: false },
      { term: 'Stage', label: 'Level', restricted: true },
    ];

    expect(
      findDomainTermsShown(
        [
          ['a', 'Close Tickets'],
          ['b', 'Stage details'],
          ['c', 'ticketing is fine in lower case'],
        ],
        terms,
      ),
    ).toEqual(['a: "Close Tickets" shows the domain term "Ticket"']);
  });
});

describe('findLabelLeaks', () => {
  const labels = ['Quest', 'Quest Log', 'Grimoire'];

  it('flags UI labels in strings, JSX text and identifiers', () => {
    const source = [
      "const title = 'Open the Grimoire';",
      'const tab = `Quest Log`;',
      'function useQuestLog() {}',
      'const view = <p>One Quest</p>;',
    ].join('\n');

    expect(findLabelLeaks('x.tsx', source, labels)).toEqual([
      'x.tsx:1 "Open the Grimoire" uses the UI label "Grimoire"',
      'x.tsx:2 "Quest Log" uses the UI label "Quest Log"',
      'x.tsx:3 "useQuestLog" uses the UI label "Quest Log"',
      'x.tsx:4 "One Quest" uses the UI label "Quest"',
    ]);
  });

  it('ignores comments and words that only contain a label', () => {
    const source = ['// The Quest Log reads the Tracker.', "const name = 'Questline';", 'const questline = 1;'].join(
      '\n',
    );

    expect(findLabelLeaks('x.ts', source, labels)).toEqual([]);
  });
});

describe('the string catalog', () => {
  it('holds every UI label from the glossary under its domain term', () => {
    const expected = Object.fromEntries(glossary.flatMap(({ term, label }) => (label ? [[termKey(term), label]] : [])));

    expect(strings.labels).toEqual(expected);
  });

  it('never shows a domain term that has a UI label', () => {
    expect(findDomainTermsShown(catalogEntries(strings), glossary)).toEqual([]);
  });

  it('is the only source of UI labels', () => {
    const labels = glossary.flatMap(({ label }) => (label ? [label] : []));
    const leaks = sourceFiles(root).flatMap((file) =>
      findLabelLeaks(file, readFileSync(join(root, file), 'utf8'), labels),
    );

    expect(leaks).toEqual([]);
  });
});
