import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

test('launches on the empty Workbench shell', async () => {
  const app = await electron.launch({
    // GitHub's Ubuntu runners forbid the unprivileged user namespaces Chromium's sandbox needs.
    args: [join(import.meta.dirname, '..'), ...(process.env['CI'] ? ['--no-sandbox'] : [])],
  });

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
