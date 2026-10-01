// @vitest-environment jsdom
import '../src/tokens.css';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button, Card, ParchmentCard } from '../src';
import type { ThemeMode } from '../src';

afterEach(cleanup);

/** The value the last matching rule declares; enough of the cascade for single-class component rules. */
function declared(element: Element, property: string): string {
  let value = '';
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule instanceof CSSStyleRule && element.matches(rule.selectorText)) {
        value = rule.style.getPropertyValue(property) || value;
      }
    }
  }
  return value.trim();
}

/**
 * jsdom computes custom properties per `data-theme` but neither substitutes `var()` nor expands
 * shorthands holding one, so read the declared token and resolve it on the element by hand.
 */
function resolved(element: Element, property: string): string {
  const value = declared(element, property);
  const token = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  return token ? getComputedStyle(element).getPropertyValue(token).trim() : value;
}

function renderIn(mode: ThemeMode, ui: ReactNode) {
  return render(<div data-theme={mode}>{ui}</div>);
}

const palettes = {
  light: {
    surface: '#fbf8ef',
    surface2: '#f6f1e4',
    border: '#e0d6bd',
    text: '#221d12',
    accent: '#27408b',
    accentInk: '#fbf8ef',
    danger: '#9b2c22',
    parchment: '#efe3c4',
    parchmentEdge: '#b8892b',
    parchmentInk: '#2b2410',
  },
  dark: {
    surface: '#181b28',
    surface2: '#1e2231',
    border: '#2d3246',
    text: '#e6e2d6',
    accent: '#8ea2ff',
    accentInk: '#0d1020',
    danger: '#e07a6a',
    parchment: '#1f2233',
    parchmentEdge: '#c79d45',
    parchmentInk: '#eadfbe',
  },
} as const;

describe.each(['light', 'dark'] as const)('in %s mode', (mode) => {
  const palette = palettes[mode];

  it('draws a default button on the raised surface', () => {
    renderIn(mode, <Button>Abandon</Button>);
    const button = screen.getByRole('button', { name: 'Abandon' });

    expect(button.getAttribute('type')).toBe('button');
    expect(resolved(button, 'background-color')).toBe(palette.surface2);
    expect(resolved(button, 'border-color')).toBe(palette.border);
    expect(resolved(button, 'color')).toBe(palette.text);
  });

  it('draws a primary button in the accent colour', () => {
    renderIn(mode, <Button variant="primary">Complete</Button>);
    const button = screen.getByRole('button', { name: 'Complete' });

    expect(resolved(button, 'background-color')).toBe(palette.accent);
    expect(resolved(button, 'color')).toBe(palette.accentInk);
  });

  it('draws a danger button with danger text', () => {
    renderIn(mode, <Button variant="danger">Delete</Button>);

    expect(resolved(screen.getByRole('button', { name: 'Delete' }), 'color')).toBe(palette.danger);
  });

  it('draws a card on the surface', () => {
    renderIn(mode, <Card data-testid="card">Body</Card>);
    const card = screen.getByTestId('card');

    expect(card.textContent).toBe('Body');
    expect(resolved(card, 'background-color')).toBe(palette.surface);
    expect(resolved(card, 'border-color')).toBe(palette.border);
  });

  it('draws a parchment card on parchment with a gold edge', () => {
    renderIn(mode, <ParchmentCard data-testid="parchment">Body</ParchmentCard>);
    const parchment = screen.getByTestId('parchment');

    expect(resolved(parchment, 'background-color')).toBe(palette.parchment);
    expect(resolved(parchment, 'border-color')).toBe(palette.parchmentEdge);
    expect(resolved(parchment, 'color')).toBe(palette.parchmentInk);
  });
});

describe('components', () => {
  it('fall back to the dark palette when no theme is set', () => {
    render(<Card data-testid="card">Body</Card>);

    expect(resolved(screen.getByTestId('card'), 'background-color')).toBe(palettes.dark.surface);
  });

  it('keep caller class names and attributes', () => {
    render(
      <Button className="extra" disabled>
        Go
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });

    expect(button.classList.contains('extra')).toBe(true);
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
