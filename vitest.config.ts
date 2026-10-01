import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['**/tests/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/out/**', '**/dist/**', '**/tests/fixtures/**'],
    // Stylesheets are injected so component tests can check which theme tokens a component resolves.
    css: { include: [/.+/], modules: { classNameStrategy: 'non-scoped' } },
  },
});
