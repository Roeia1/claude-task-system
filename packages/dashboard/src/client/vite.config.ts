import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
const config = defineConfig({
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
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-xstate': ['xstate', '@xstate/react'],
          'vendor-radix': [
            '@radix-ui/react-collapsible',
            '@radix-ui/react-progress',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
        },
      },
    },
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

// Vite requires default export for config
export { config as default };
