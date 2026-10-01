// @vitest-environment jsdom
import { strings } from '@questline/ui';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Workbench } from '../../src/renderer/src/Workbench';

afterEach(cleanup);

describe('Workbench', () => {
  it('shows the sidebar with Projects and the bottom navigation', () => {
    render(<Workbench />);

    const sidebar = screen.getByRole('complementary', { name: strings.workbench.sidebar });
    expect(within(sidebar).getByRole('heading', { name: strings.workbench.projects })).toBeDefined();
    const nav = within(sidebar).getByRole('navigation');
    expect(within(nav).getByRole('button', { name: strings.labels.tracker })).toBeDefined();
    expect(within(nav).getByRole('button', { name: strings.labels.agentMemory })).toBeDefined();
    expect(within(nav).getByRole('button', { name: strings.workbench.settings })).toBeDefined();
  });

  it('shows an empty Session header and Session pane', () => {
    render(<Workbench />);

    expect(screen.getByRole('banner')).toBeDefined();
    const sessionPane = screen.getByRole('main');
    expect(within(sessionPane).getByText(strings.workbench.noSession)).toBeDefined();
  });
});
