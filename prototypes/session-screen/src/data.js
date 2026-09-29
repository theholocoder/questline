// PROTOTYPE, throwaway. Fake data only — nothing here is a real model.

export const project = { name: 'questline', path: '~/dev/questline' };

export const projects = [
  { name: 'questline', active: true },
  { name: 'dotfiles' },
  { name: 'shop-api' },
];

export const sessions = [
  { id: 's1', title: 'Dark mode toggle', stage: 'implement', branch: 'feat/dark-mode', base: 'main' },
  { id: 's2', title: 'Fix flaky login test', stage: 'review', branch: 'fix/flaky-login', base: 'main' },
  { id: 's3', title: 'Export Quests to CSV', stage: 'plan', branch: 'feat/csv-export', base: 'main' },
  { id: 's4', title: 'Hotfix: crash on empty repo', stage: 'complete', branch: 'fix/empty-repo', base: 'main', archived: true },
];

// Default Workflow (ADR 0002). Checkpoints inside Plan are derived from Quest Log state.
export const stages = [
  { id: 'plan', label: 'Plan', level: 1, checkpoints: ['Grilled', 'Spec written', 'Tickets cut'], modelProfile: 'Opus · deep' },
  { id: 'implement', label: 'Implement', level: 2, modelProfile: 'Sonnet · fast' },
  { id: 'review', label: 'Review', level: 3, modelProfile: 'Opus · deep' },
];

export const tags = {
  spec: { label: 'Main Quest', tone: 'accent' },
  ticket: { label: 'Objective', tone: 'neutral' },
  'ready-for-agent': { label: 'ready-for-agent', tone: 'ok' },
  'in-progress': { label: 'in-progress', tone: 'warn' },
  'needs-triage': { label: 'needs-triage', tone: 'muted' },
  'needs-info': { label: 'needs-info', tone: 'muted' },
  'review-finding': { label: 'review-finding', tone: 'danger' },
};

export const quests = [
  {
    id: 'Q-3f2a9c1', title: 'Dark mode toggle', status: 'open', tags: ['spec'], session: 's1',
    body: 'Users can switch between light and dark themes from Settings. Default follows the OS; dark is the fallback.\n\n**Out of scope:** per-Project themes.',
    comments: [{ who: 'agent', text: 'Spec written from grilling. 4 Objectives cut.' }],
  },
  { id: 'Q-a1b20e4', title: 'Theme tokens in :root', status: 'closed', tags: ['ticket'], parent: 'Q-3f2a9c1', session: 's1', body: 'Move every colour to CSS custom properties.' },
  { id: 'Q-b2c93f0', title: 'Settings toggle + persistence', status: 'open', tags: ['ticket', 'in-progress'], parent: 'Q-3f2a9c1', session: 's1', body: 'Add a three-way toggle (System / Light / Dark) to Settings, persisted in the Local store.', run: 'r3' },
  { id: 'Q-c3d4a17', title: 'Follow OS preference', status: 'open', tags: ['ticket', 'ready-for-agent'], parent: 'Q-3f2a9c1', session: 's1', blockedBy: ['Q-b2c93f0'], body: 'Listen to prefers-color-scheme when set to System.' },
  { id: 'Q-d5e6b28', title: 'Dark variants for diff view', status: 'open', tags: ['ticket', 'ready-for-agent'], parent: 'Q-3f2a9c1', session: 's1', body: 'Diff add/remove colours need dark variants with AA contrast.' },
  { id: 'Q-7e81c55', title: 'Fix flaky login test', status: 'open', tags: ['spec'], session: 's2', body: 'login.spec.ts fails ~1 in 20 runs on CI.' },
  { id: 'Q-8f90d61', title: 'Await session cookie before redirect', status: 'closed', tags: ['ticket'], parent: 'Q-7e81c55', session: 's2', body: '' },
  { id: 'Q-9a12e77', title: 'Missing test for expired token', status: 'open', tags: ['ticket', 'review-finding', 'ready-for-agent'], parent: 'Q-7e81c55', session: 's2', body: 'Accepted from Review.' },
  { id: 'Q-4b56f02', title: 'CSV export — which columns?', status: 'open', tags: ['needs-info'], session: 's3', body: 'Waiting on grilling.' },
  { id: 'Q-5c67a13', title: 'Quest ids in export filename?', status: 'open', tags: ['needs-triage'], session: 's3', body: '' },
  { id: 'Q-6d78b24', title: 'Scratch note from last week', status: 'open', tags: [], session: 's3', body: '' },
];

// Default Workflow columns, each bound to one tag (user-editable per Project).
export const columns = [
  { tag: 'spec', label: 'Main Quests' },
  { tag: 'needs-triage', label: 'Needs triage' },
  { tag: 'ready-for-agent', label: 'Ready' },
  { tag: 'in-progress', label: 'In progress' },
  { tag: null, label: 'No tag' },
];

export const runs = [
  { id: 'r1', stage: 'plan', title: 'Plan', status: 'done', tokens: 142_000, window: 200_000, compacted: 1 },
  { id: 'r1p', stage: 'plan', title: 'Prototype: toggle placement', parent: 'r1', status: 'done', tokens: 38_000, window: 200_000 },
  { id: 'r2', stage: 'implement', title: 'Objective Q-a1b20e4', status: 'done', tokens: 61_000, window: 200_000 },
  { id: 'r3', stage: 'implement', title: 'Objective Q-b2c93f0', status: 'running', tokens: 118_400, window: 200_000 },
  { id: 'r3r', stage: 'implement', title: 'code-review', parent: 'r3', status: 'queued', tokens: 0, window: 200_000 },
];

// Transcript of the active Run (r3).
export const transcript = [
  { kind: 'system', text: 'Run started for Objective Q-b2c93f0 · Settings toggle + persistence' },
  { kind: 'agent', text: "I'll read the Settings screen and the Local store repository before changing anything." },
  { kind: 'tool', name: 'read_file', arg: 'src/renderer/settings/SettingsView.tsx', result: '212 lines' },
  { kind: 'tool', name: 'read_file', arg: 'src/main/store/local/settings-repo.ts', result: '88 lines' },
  { kind: 'tool', name: 'quest_log.update', arg: 'Q-b2c93f0 +in-progress', result: 'ok' },
  { kind: 'agent', text: 'The Local store already has a `settings` KV table. I will add a `theme` key with values `system | light | dark` and a three-way segmented toggle.' },
  { kind: 'tool', name: 'edit_file', arg: 'src/main/store/local/settings-repo.ts', result: '+14 −2' },
  { kind: 'tool', name: 'edit_file', arg: 'src/renderer/settings/SettingsView.tsx', result: '+41 −6' },
  { kind: 'tool', name: 'shell', arg: 'pnpm test settings', result: '12 passed, 1 failed', failed: true },
  { kind: 'agent', text: 'One test assumed the old boolean `darkMode` key. Updating it to the new enum.' },
  { kind: 'tool', name: 'edit_file', arg: 'src/main/store/local/settings-repo.test.ts', result: '+6 −6' },
  { kind: 'approval', text: 'Run a command that needs approval', command: 'pnpm add -D @testing-library/user-event', reason: 'Network access (Implement approval profile)' },
];

export const planTranscript = [
  { kind: 'system', text: 'Run started · Plan · Skill /grill-with-docs' },
  { kind: 'agent', text: 'Where should the toggle live: Settings only, or also a quick switch in the title bar?' },
  { kind: 'user', text: 'Settings only for v1.' },
  { kind: 'ask', text: 'Should "System" be the default for new installs?', options: ['Yes, follow the OS', 'No, default to dark'] },
];

export const reviewFiles = [
  {
    path: 'src/main/store/local/settings-repo.ts', add: 14, del: 2,
    hunks: [
      { h: '@@ -18,9 +18,21 @@ export class SettingsRepo {', lines: [
        [' ', '  async get(key: string) {'],
        [' ', '    return this.db.selectFrom("settings").where("key", "=", key)'],
        ['-', '  async getDarkMode(): Promise<boolean> {'],
        ['+', '  async getTheme(): Promise<Theme> {'],
        ['+', '    const row = await this.get("theme");'],
        ['+', '    return isTheme(row?.value) ? row.value : "system";'],
        [' ', '  }'],
      ] },
    ],
  },
  {
    path: 'src/renderer/settings/SettingsView.tsx', add: 41, del: 6,
    hunks: [
      { h: '@@ -40,6 +40,18 @@ export function SettingsView() {', lines: [
        [' ', '  return ('],
        [' ', '    <Section title="Appearance">'],
        ['+', '      <Segmented'],
        ['+', '        value={theme}'],
        ['+', '        options={["system", "light", "dark"]}'],
        ['+', '        onChange={setTheme}'],
        ['+', '      />'],
        [' ', '    </Section>'],
      ] },
    ],
  },
  { path: 'src/main/store/local/settings-repo.test.ts', add: 6, del: 6, hunks: [] },
];

export const reviewFindings = [
  { id: 'f1', file: 'src/main/store/local/settings-repo.ts', line: 23, severity: 'major', text: 'No migration for users who already stored `darkMode = true`; they silently fall back to System.' },
  { id: 'f2', file: 'src/renderer/settings/SettingsView.tsx', line: 44, severity: 'minor', text: 'Segmented control has no accessible label.' },
];

export const grimoire = [
  'Tests use vitest; run `pnpm test <filter>`.',
  'Local store is SQLite via Kysely; migrations live next to each repo.',
  'Never import from src/main in src/renderer.',
];
