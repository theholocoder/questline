import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['**/tests/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/out/**', '**/dist/**', '**/tests/fixtures/**'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
