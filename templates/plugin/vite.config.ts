import { defineConfig } from 'vite';

// Questline shares one copy of these with every Plugin through an import map.
const shared = ['react', 'react/jsx-runtime', 'react-dom', '@questline/plugin-api', '@questline/ui'];

export default defineConfig({
  build: {
    lib: {
      entry: { main: 'src/main.ts', renderer: 'src/renderer.tsx' },
      formats: ['es'],
    },
    rollupOptions: { external: shared },
  },
});
