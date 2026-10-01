/**
 * The one English catalog of on-screen strings. Keys are domain terms; values are what the user sees.
 * UI labels (CONTEXT.md) appear nowhere else in the code, and no string here shows a domain term that
 * has a UI label. Both rules are checked by tooling/tests/string-catalog.test.ts.
 */
export const strings = {
  appName: 'Questline',
  /** The themed names of domain terms, from the glossary. */
  labels: {
    stage: 'Level',
    tracker: 'Quest Log',
    issue: 'Quest',
    spec: 'Main Quest',
    ticket: 'Objective',
    agentMemory: 'Grimoire',
    approvalProfile: 'Permissions',
  },
  workbench: {
    sidebar: 'Sidebar',
    projects: 'Projects',
    noProjects: 'No Projects yet',
    settings: 'Settings',
    noSession: 'No Session selected',
  },
} as const;
