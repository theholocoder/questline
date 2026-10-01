// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon } from '../src';

afterEach(cleanup);

describe('Icon', () => {
  it('draws a decorative Phosphor duotone glyph', () => {
    const { container } = render(<Icon name="agentMemory" />);
    const svg = container.querySelector('svg');

    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    // Phosphor's duotone weight paints a translucent fill layer under the outline.
    expect(svg?.querySelector('[opacity="0.2"]')).not.toBeNull();
  });

  it('is announced when given a label', () => {
    render(<Icon name="settings" label="Settings" />);

    expect(screen.getByRole('img', { name: 'Settings' })).toBeDefined();
  });
});
