import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages needs /FitSync/, Vercel needs /
  // Set VITE_BASE env var per deployment; defaults to / (Vercel)
  base: process.env.VITE_BASE || '/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  publicDir: 'public',
});
