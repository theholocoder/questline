// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Workbench } from '../../src/renderer/src/Workbench';

afterEach(cleanup);

describe('Workbench', () => {
  it('shows the sidebar with Projects and the bottom navigation', () => {
    render(<Workbench />);

    const sidebar = screen.getByRole('complementary', { name: 'Sidebar' });
    expect(within(sidebar).getByRole('heading', { name: 'Projects' })).toBeDefined();
    const nav = within(sidebar).getByRole('navigation');
    expect(within(nav).getByRole('button', { name: 'Quest Log' })).toBeDefined();
    expect(within(nav).getByRole('button', { name: 'Grimoire' })).toBeDefined();
    expect(within(nav).getByRole('button', { name: 'Settings' })).toBeDefined();
  });

  it('shows an empty Session header and Session pane', () => {
    render(<Workbench />);

    expect(screen.getByRole('banner')).toBeDefined();
    const sessionPane = screen.getByRole('main');
    expect(within(sessionPane).getByText('No Session selected')).toBeDefined();
  });
});
