import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

// Workspace packages ship TypeScript sources, so they are bundled rather than externalized.
const workspacePackages = [
  '@questline/plugin-api',
  '@questline/ui',
  '@questline/plugin-core',
  '@questline/plugin-engine-pi',
  '@questline/plugin-pocock',
];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
  },
  renderer: {
    plugins: [react()],
  },
});
