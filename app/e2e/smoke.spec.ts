import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

function launch() {
  return electron.launch({
    // GitHub's Ubuntu runners forbid the unprivileged user namespaces Chromium's sandbox needs.
    args: [join(import.meta.dirname, '..'), ...(process.env['CI'] ? ['--no-sandbox'] : [])],
  });
}

test('launches on the empty Workbench shell', async () => {
  const app = await launch();

  try {
    const window = await app.firstWindow();

    await expect(window).toHaveTitle('Questline');
    await expect(window.getByRole('complementary', { name: 'Sidebar' })).toBeVisible();
    await expect(window.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(window.getByRole('main')).toContainText('No Session selected');
  } finally {
    await app.close();
  }
});

test('renders with the bundled fonts', async () => {
  const app = await launch();

  try {
    const window = await app.firstWindow();
    await expect(window.getByRole('heading', { name: 'Projects' })).toBeVisible();

    const loadedFonts = await window.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family);
    });
    expect(new Set(loadedFonts)).toEqual(new Set(['Cormorant Garamond Variable', 'Inter Variable']));
  } finally {
    await app.close();
  }
});
