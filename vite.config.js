import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: false,
    // Proxifie les appels API vers le serveur Express (high scores) en dev.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
