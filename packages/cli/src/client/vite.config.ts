import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  root: import.meta.dirname,
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Prevent multiple copies of React when dependencies (e.g., Storybook) have their own React versions
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3847',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3847',
        ws: true,
      },
    },
  },
});
