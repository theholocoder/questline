export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeMode = 'light' | 'dark';

export interface ThemeController {
  readonly preference: ThemePreference;
  set(preference: ThemePreference): void;
  dispose(): void;
}

interface ThemeRoot {
  dataset: DOMStringMap;
}

interface ColorSchemeQuery {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/**
 * Sets `data-theme` on the root, which tokens.css keys its palettes on. "system" follows the OS
 * and falls back to dark whenever the OS does not ask for light.
 */
export function createThemeController(
  root: ThemeRoot = document.documentElement,
  prefersLight: ColorSchemeQuery = window.matchMedia('(prefers-color-scheme: light)'),
): ThemeController {
  let preference: ThemePreference = 'system';
  const apply = () => {
    const mode: ThemeMode = preference === 'system' ? (prefersLight.matches ? 'light' : 'dark') : preference;
    root.dataset.theme = mode;
  };

  prefersLight.addEventListener('change', apply);
  apply();

  return {
    get preference() {
      return preference;
    },
    set(next) {
      preference = next;
      apply();
    },
    dispose() {
      prefersLight.removeEventListener('change', apply);
    },
  };
}
