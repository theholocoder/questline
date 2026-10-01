import { describe, expect, it } from 'vitest';
import { createThemeController } from '../src/theme';

function fakeColorSchemeQuery(prefersLight: boolean) {
  const listeners = new Set<() => void>();
  return {
    matches: prefersLight,
    addEventListener: (_type: 'change', listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: () => void) => listeners.delete(listener),
    osChangesTo(light: boolean) {
      this.matches = light;
      listeners.forEach((listener) => listener());
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function setup(prefersLight: boolean) {
  const root = { dataset: {} as DOMStringMap };
  const query = fakeColorSchemeQuery(prefersLight);
  const theme = createThemeController(root, query);
  return { root, query, theme };
}

describe('theme', () => {
  it('follows a light OS by default', () => {
    const { root } = setup(true);

    expect(root.dataset.theme).toBe('light');
  });

  it('falls back to dark when the OS does not prefer light', () => {
    const { root } = setup(false);

    expect(root.dataset.theme).toBe('dark');
  });

  it('tracks OS changes while set to system', () => {
    const { root, query } = setup(false);

    query.osChangesTo(true);
    expect(root.dataset.theme).toBe('light');
    query.osChangesTo(false);
    expect(root.dataset.theme).toBe('dark');
  });

  it('can be forced to light or dark, ignoring the OS', () => {
    const { root, query, theme } = setup(false);

    theme.set('light');
    expect(root.dataset.theme).toBe('light');
    expect(theme.preference).toBe('light');
    query.osChangesTo(false);
    expect(root.dataset.theme).toBe('light');

    theme.set('dark');
    query.osChangesTo(true);
    expect(root.dataset.theme).toBe('dark');
  });

  it('follows the OS again once set back to system', () => {
    const { root, theme } = setup(true);

    theme.set('dark');
    theme.set('system');

    expect(root.dataset.theme).toBe('light');
    expect(theme.preference).toBe('system');
  });

  it('stops listening to the OS once disposed', () => {
    const { query, theme } = setup(true);

    theme.dispose();

    expect(query.listenerCount).toBe(0);
  });
});
