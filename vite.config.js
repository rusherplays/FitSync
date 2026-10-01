import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves from /FitSync/ (repo name)
  base: '/FitSync/',
  build: {
    outDir: 'dist',
    // Don't inline small assets — keep them as files
    assetsInlineLimit: 0,
  },
  publicDir: 'public',
});
