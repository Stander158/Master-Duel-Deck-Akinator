// `defineConfig` comes from vitest so the `test` block is typed; it is a
// superset of Vite's own config type.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base keeps the build portable: it works from a GitHub Pages
// project subpath, a custom domain root, or a plain static file server.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
